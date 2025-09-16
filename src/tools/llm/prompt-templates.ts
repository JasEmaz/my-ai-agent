/**
 * LLM prompt templates for commit message generation
 * Designed to generate conventional commit messages with proper context
 */

import type { ChangeType } from './types';

/** Base prompt for commit analysis */
export const COMMIT_ANALYSIS_PROMPT = `Analyze the following git changes and generate a conventional commit message.
Focus on the main purpose of the changes and categorize them appropriately.

Changes:
{diff}

Modified files:
{files}

Generate a commit message following these rules:
1. Use conventional commit format: type(scope): description
2. Keep the first line under 72 characters
3. Use present tense ("add" not "added")
4. Be descriptive but concise
5. Include scope if changes are isolated to specific area
6. Mark breaking changes with BREAKING CHANGE: prefix

Response must be valid JSON matching this structure:
{
  "type": "feat|fix|refactor|docs|test|chore|style|perf",
  "scope": "optional area affected",
  "commitMessage": "full commit message",
  "breaking": boolean,
  "details": "optional detailed explanation"
}`;

/** Template for handling multiple distinct changes */
export const MULTI_CHANGE_PROMPT = `Analyze multiple changes and generate a commit message that covers all changes:

{changes}

Group related changes and generate a commit message that:
1. Uses the most significant change type
2. Lists other changes in the body
3. Separates different changes with blank lines
4. Marks any breaking changes`;

/** Fallback template for simple commit messages */
export const FALLBACK_COMMIT_TEMPLATE = (files: string[], type: ChangeType = 'chore'): string => 
  `${type}: update ${files.join(', ')}`;

/** Cache key generator for similar changes */
export const generateCacheKey = (files: string[], diff: string): string => {
  const fileHash = files.sort().join('|');
  const diffPreview = diff.slice(0, 100).replace(/\s+/g, ' ');
  return `${fileHash}:${diffPreview}`;
};