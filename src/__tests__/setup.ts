/**
 * Jest setup file
 * Configures the test environment and global mocks
 */

import { env } from '../config/env';

// Mock the AI provider
jest.mock('../config/env', () => ({
  env: {
    aiProvider: {
      generateCommitMessage: jest.fn(),
    },
  },
}));

// Mock simple-git
jest.mock('simple-git', () => ({
  simpleGit: jest.fn(),
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup default mock implementations
  (env.aiProvider.generateCommitMessage as jest.Mock).mockResolvedValue(
    JSON.stringify({
      type: 'feat',
      scope: 'test',
      commitMessage: 'feat(test): add test feature',
      breaking: false,
      details: 'Test commit message',
    })
  );
});