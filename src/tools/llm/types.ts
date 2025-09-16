/**
 * Type definitions for AI-powered commit message generation
 * Follows Conventional Commits specification and provides type safety
 */

/** Supported change types following Conventional Commits */
export type ChangeType = 'feat' | 'fix' | 'refactor' | 'docs' | 'test' | 'chore' | 'style' | 'perf';

/** Represents a categorized code change */
export interface ChangeCategory {
  /** Type of change following Conventional Commits */
  type: ChangeType;
  /** Optional scope for the change (e.g., 'auth', 'ui') */
  scope?: string;
  /** Detailed description of the change */
  description: string;
}

/** Analysis of commit changes by the LLM */
export interface CommitAnalysis {
  /** List of modified files */
  files: string[];
  /** Brief summary of changes */
  summary: string;
  /** Areas of codebase impacted */
  impactedAreas: string[];
  /** Categorized changes */
  changeTypes: ChangeCategory[];
  /** Whether changes include breaking changes */
  breakingChanges: boolean;
}

/** LLM response format for commit message generation */
export interface LLMResponse {
  /** Generated commit message */
  commitMessage: string;
  /** Primary type of change */
  type: ChangeType;
  /** Optional scope of the change */
  scope?: string;
  /** Whether this is a breaking change */
  breaking: boolean;
  /** Optional detailed explanation */
  details?: string;
}

/** Error types for commit message generation */
export enum CommitGenError {
  TIMEOUT = 'TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  NO_CHANGES = 'NO_CHANGES',
  LLM_ERROR = 'LLM_ERROR',
}