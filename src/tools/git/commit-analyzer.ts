/**
 * Commit analyzer using LLM for intelligent commit message generation
 * Integrates with git diff parsing and handles LLM interaction
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { CommitAnalysis, LLMResponse, ChangeType, ChangeCategory } from '../llm/types';
import { COMMIT_ANALYSIS_PROMPT, MULTI_CHANGE_PROMPT, FALLBACK_COMMIT_TEMPLATE, generateCacheKey } from '../llm/prompt-templates';
import { parseDiff, getStagedDiff, type ParsedDiff } from './diff-parser';
import { commitCache } from '../cache/commit-cache';
import { LLMTimeoutError, InvalidResponseError, NoChangesError, GitError } from '../errors/commit-errors';

// Initialize Google AI
// AI provider will be injected through environment configuration
import { env } from '../../config/env';
const ai = env.aiProvider;

// Constants
const TIMEOUT_MS = 2000;
const MAX_RETRIES = 2;

/**
 * Check cache for existing commit analysis
 */
async function checkCommitCache(diffs: ParsedDiff[]): Promise<{ message: string; analysis: CommitAnalysis } | null> {
  const cacheKey = generateCacheKey(
    diffs.map(d => d.filePath),
    diffs.map(d => `${d.additions.join('\n')}\n${d.deletions.join('\n')}`).join('\n')
  );

  const cached = commitCache.get(cacheKey);
  if (!cached) return null;

  return {
    message: cached.commitMessage,
    analysis: {
      files: diffs.map(d => d.filePath),
      summary: cached.details ?? '',
      impactedAreas: cached.scope ? [cached.scope].filter(Boolean) : [],
      changeTypes: [{ type: cached.type, scope: cached.scope, description: cached.commitMessage }],
      breakingChanges: cached.breaking,
    },
  };
}

/**
 * Create commit analysis from LLM response
 */
function createAnalysisFromLLMResponse(response: LLMResponse, files: string[]): CommitAnalysis {
  return {
    files,
    summary: response.details ?? '',
    impactedAreas: response.scope ? [response.scope].filter(Boolean) : [],
    changeTypes: [{
      type: response.type,
      scope: response.scope,
      description: response.commitMessage,
    }],
    breakingChanges: response.breaking,
  };
}

/**
 * Generate commit message for diffs using LLM
 */
async function generateCommitMessage(diffs: ParsedDiff[]): Promise<{ message: string; analysis: CommitAnalysis }> {
  const fileAnalysis = await processDiffsConcurrently(diffs);
  
  const llmResponse = await withTimeout(
    withRetries(
      () => getLLMResponse(MULTI_CHANGE_PROMPT.replace(
        '{changes}',
        JSON.stringify(fileAnalysis, null, 2)
      )),
      MAX_RETRIES
    ),
    TIMEOUT_MS
  );

  return {
    message: llmResponse.commitMessage,
    analysis: createAnalysisFromLLMResponse(llmResponse, diffs.map(d => d.filePath)),
  };
}

/**
 * Analyze changes and generate a commit message using LLM
 * @param rootDir Repository root directory
 * @returns Generated commit message and analysis
 */
/**
 * Process multiple file diffs concurrently
 */
/**
 * Process file diffs in parallel with batching to avoid rate limits
 */
async function processDiffsConcurrently(diffs: ParsedDiff[]): Promise<CommitAnalysis> {
  // Process diffs in batches of 3 to avoid overwhelming the LLM service
  const BATCH_SIZE = 3;
  const results: Array<{
    file: string;
    type: ChangeType;
    scope?: string;
    description: string;
    breaking: boolean;
  }> = [];

  for (let i = 0; i < diffs.length; i += BATCH_SIZE) {
    const batch = diffs.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async diff => {
      const prompt = COMMIT_ANALYSIS_PROMPT
        .replace('{diff}', formatDiffForPrompt([diff]))
        .replace('{files}', diff.filePath);

      const response = await withTimeout(
        withRetries(() => getLLMResponse(prompt), MAX_RETRIES),
        TIMEOUT_MS
      );

      return {
        file: diff.filePath,
        type: response.type,
        scope: response.scope,
        description: response.commitMessage,
        breaking: response.breaking,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add a small delay between batches if there are more to process
    if (i + BATCH_SIZE < diffs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return consolidateAnalysis(results);
}

/**
 * Consolidate multiple file analyses into a single commit analysis
 */
function consolidateAnalysis(fileAnalyses: Array<{ file: string; type: ChangeType; scope?: string; description: string; breaking: boolean }>): CommitAnalysis {
  const analysis: CommitAnalysis = {
    files: fileAnalyses.map(a => a.file),
    summary: '',
    impactedAreas: [...new Set(fileAnalyses.map(a => a.scope).filter((scope): scope is string => scope !== undefined))],
    changeTypes: [],
    breakingChanges: fileAnalyses.some(a => a.breaking),
  };

  // Group by type and scope
  const changes = new Map<string, ChangeCategory>();
  for (const { type, scope, description } of fileAnalyses) {
    const key = `${type}:${scope || ''}`;
    if (!changes.has(key)) {
      changes.set(key, { type, scope, description });
    }
  }
  analysis.changeTypes = Array.from(changes.values());

  return analysis;
}

export async function analyzeCommit(rootDir: string): Promise<{ message: string; analysis: CommitAnalysis }> {
  try {
    // Get and parse staged changes
    const diffs = await getStagedDiff(rootDir);
    if (diffs.length === 0) {
      throw new NoChangesError();
    }

    // Check cache first
    const cached = await checkCommitCache(diffs);
    if (cached) {
      return cached;
    }

    // Generate new commit message
    const result = await generateCommitMessage(diffs);

    // Update cache
    const cacheKey = generateCacheKey(
      diffs.map(d => d.filePath),
      diffs.map(d => `${d.additions.join('\n')}\n${d.deletions.join('\n')}`).join('\n')
    );
    
    // Cache the result, handling type safety
    const changeType = result.analysis.changeTypes[0];
    commitCache.set(cacheKey, {
      type: changeType?.type ?? 'chore',
      commitMessage: result.message,
      breaking: result.analysis.breakingChanges,
      details: result.analysis.summary,
      scope: changeType?.scope
    });

    return result;


  } catch (error) {
    if (error instanceof NoChangesError) {
      return {
        message: error.message,
        analysis: createEmptyAnalysis(),
      };
    }

    if (error instanceof LLMTimeoutError || error instanceof InvalidResponseError) {
      console.warn(`LLM error: ${error.message}, falling back to simple commit message`);
      const files = (await getStagedDiff(rootDir)).map(d => d.filePath);
      const type = inferChangeType(files);
      return {
        message: FALLBACK_COMMIT_TEMPLATE(files, type),
        analysis: createEmptyAnalysis(files),
      };
    }

    if (error instanceof GitError) {
      throw error; // Let caller handle git errors
    }

    console.error('Unexpected error analyzing commit:', error);
    throw error;
  }
}

/**
 * Get response from LLM with proper error handling
 */
/**
 * Validate LLM response has required fields
 */
function validateLLMResponse(response: unknown): asserts response is LLMResponse {
  if (!response || typeof response !== 'object') {
    throw new InvalidResponseError('Response must be an object');
  }

  const { type, commitMessage } = response as Partial<LLMResponse>;
  
  if (!type || !commitMessage) {
    throw new InvalidResponseError('Missing required fields: type or commitMessage');
  }

  if (!['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'style', 'perf'].includes(type)) {
    throw new InvalidResponseError(`Invalid change type: ${type}`);
  }
}

/**
 * Get response from LLM with proper error handling and validation
 */
async function getLLMResponse(prompt: string): Promise<LLMResponse> {
  try {
    const result = await ai.generateCommitMessage(prompt);
    const parsed = JSON.parse(result) as LLMResponse;

    // Validate required fields
    if (!parsed.type || !parsed.commitMessage) {
      throw new InvalidResponseError('Missing required fields: type or commitMessage');
    }

    return parsed;
  } catch (error) {
    if (error instanceof InvalidResponseError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new InvalidResponseError('Invalid JSON response from LLM');
    }
    throw new LLMTimeoutError(TIMEOUT_MS);
  }
}

/**
 * Format diff information for LLM prompt
 */
function formatDiffForPrompt(diffs: Awaited<ReturnType<typeof parseDiff>>): string {
  return diffs.map(diff => `
File: ${diff.filePath}
Type: ${diff.changeType}
${diff.additions.length > 0 ? '\nAdditions:\n' + diff.additions.join('\n') : ''}
${diff.deletions.length > 0 ? '\nDeletions:\n' + diff.deletions.join('\n') : ''}
async function getLLMResponse(prompt: string): Promise<LLMResponse> {
  try {
    const result = await ai.generateCommitMessage(prompt);
    const parsed = JSON.parse(result) as LLMResponse;

    // Validate response using the dedicated validation function
    validateLLMResponse(parsed);

    return parsed;
  } catch (error) {
    if (error instanceof InvalidResponseError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new InvalidResponseError('Invalid JSON response from LLM');
    }
    // Only throw timeout error if it's actually a timeout
    if (error instanceof Error && error.message.includes('Timeout')) {
      throw new LLMTimeoutError(TIMEOUT_MS);
    }
    throw error;
  }
}    changeTypes: [],
    breakingChanges: false,
  };
}

/**
 * Wrap promise with timeout
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Retry a promise with exponential backoff
 */
async function withRetries<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  attempt = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempt >= maxRetries) throw error;
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    return withRetries(fn, maxRetries, attempt + 1);
  }
}