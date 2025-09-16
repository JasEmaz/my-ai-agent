/**
 * Custom error classes for commit message generation
 */

export class CommitGenBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LLMTimeoutError extends CommitGenBaseError {
  constructor(timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms`);
  }
}

export class InvalidResponseError extends CommitGenBaseError {
  constructor(details: string) {
    super(`Invalid LLM response: ${details}`);
  }
}

export class NoChangesError extends CommitGenBaseError {
  constructor() {
    super('No changes staged for commit');
  }
}

export class GitError extends CommitGenBaseError {
  constructor(command: string, error: string) {
    super(`Git command '${command}' failed: ${error}`);
  }
}