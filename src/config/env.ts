/**
 * Environment configuration and providers
 */

interface AIProvider {
  generateCommitMessage: (prompt: string) => Promise<string>;
}

// Temporary mock implementation
class MockAIProvider implements AIProvider {
  async generateCommitMessage(prompt: string): Promise<string> {
    // For now, return a simple response
    // This will be replaced with actual AI integration
    return JSON.stringify({
      type: 'feat',
      scope: 'commit',
      commitMessage: 'feat(commit): add commit message generation',
      breaking: false,
      details: 'Added initial commit message generation capability'
    });
  }
}

interface Environment {
  aiProvider: AIProvider;
}

export const env: Environment = {
  aiProvider: new MockAIProvider(),
};