/**
 * Git diff parsing utilities
 * Processes and sanitizes git diffs for LLM analysis
 */

import { simpleGit } from 'simple-git';

/** Represents a parsed git diff */
interface ParsedDiff {
  /** Original file path */
  filePath: string;
  /** Lines added */
  additions: string[];
  /** Lines removed */
  deletions: string[];
  /** Type of change (modified, added, deleted) */
  changeType: 'modified' | 'added' | 'deleted';
}

/** Options for diff parsing */
interface DiffParseOptions {
  /** Maximum lines to include per file */
  maxLinesPerFile?: number;
  /** Whether to include context lines */
  includeContext?: boolean;
  /** Files to exclude */
  excludePatterns?: string[];
}

const DEFAULT_OPTIONS: DiffParseOptions = {
  maxLinesPerFile: 50,
  includeContext: true,
  excludePatterns: ['package-lock.json', 'yarn.lock', '*.log'],
};

/**
 * Parse and sanitize git diff output
 * @param diff Raw git diff string
 * @param options Parsing options
 * @returns Parsed and sanitized diff
 */
export async function parseDiff(diff: string, options: DiffParseOptions = {}): Promise<ParsedDiff[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parsedDiffs: ParsedDiff[] = [];
  
  // Split diff into file chunks
  const fileChunks = diff.split('diff --git');
  
  for (const chunk of fileChunks) {
    if (!chunk.trim()) continue;
    
    const lines = chunk.split('\n');
    const filePath = lines[0].match(/a\/(.+) b\//)?.[1] ?? '';
    
    if (!filePath || shouldExcludeFile(filePath, opts.excludePatterns)) continue;
    
    const { additions, deletions } = parseChunk(lines, opts.maxLinesPerFile);
    
    parsedDiffs.push({
      filePath,
      additions,
      deletions,
      changeType: determineChangeType(additions, deletions),
    });
  }
  
  return parsedDiffs;
}

/**
 * Get diff for staged changes
 * @param rootDir Repository root directory
 * @returns Parsed diff of staged changes
 */
export async function getStagedDiff(rootDir: string): Promise<ParsedDiff[]> {
  try {
    const git = simpleGit(rootDir);
    const stagedDiff = await git.diff(['--cached']);
    return parseDiff(stagedDiff);
  } catch (error) {
    throw new Error(`Failed to get staged diff: ${error.message}`);
  }
}
import { minimatch } from 'minimatch';

function shouldExcludeFile(filePath: string, patterns: string[] = []): boolean {
  return patterns.some(pattern => minimatch(filePath, pattern));
}    return regex.test(filePath);
  });
}

/**
 * Parse a diff chunk into additions and deletions
 */
function parseChunk(lines: string[], maxLines?: number): { additions: string[]; deletions: string[] } {
  const additions: string[] = [];
  const deletions: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (additions.length < (maxLines ?? Infinity)) {
        additions.push(sanitizeLine(line.slice(1)));
      }
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      if (deletions.length < (maxLines ?? Infinity)) {
        deletions.push(sanitizeLine(line.slice(1)));
      }
    }
  }
  
  return { additions, deletions };
}

/**
 * Determine type of change based on additions and deletions
 */
function determineChangeType(additions: string[], deletions: string[]): ParsedDiff['changeType'] {
  if (additions.length > 0 && deletions.length === 0) return 'added';
  if (additions.length === 0 && deletions.length > 0) return 'deleted';
  return 'modified';
}

/**
 * Sanitize a diff line by removing sensitive information
 */
function sanitizeLine(line: string): string {
  return line
    // Remove potential API keys, tokens
    .replace(/(['"])?[a-zA-Z0-9]{32,}(['"])?/g, '[REDACTED]')
    // Remove potential passwords
    .replace(/password(['"]?\s*[:=]\s*['"]?)[^'")\s]+/gi, 'password$1[REDACTED]')
    // Remove potential email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Trim whitespace
    .trim();
}