/**
 * End-to-end tests for commit message generation
 */

import type { Tool } from 'ai';
import { generateCommitMessageTool } from '../../tools';
import { env } from '../config/env';
import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

jest.mock('simple-git');
jest.mock('../config/env');

describe('Commit Message Generation E2E', () => {
  const tool = generateCommitMessageTool as Tool;
  let tempDir: string;
  const mockGit = {
    diff: jest.fn(),
    diffSummary: jest.fn(),
  };

  beforeEach(async () => {
    // Create temporary directory for test repository
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-commit-test-'));
    (simpleGit as jest.Mock).mockReturnValue(mockGit);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should generate commit message through the entire pipeline', async () => {
    // Setup mock git state
    mockGit.diff.mockResolvedValue(`diff --git a/src/feature.ts b/src/feature.ts
+export interface NewFeature {
+  name: string;
+  enabled: boolean;
+}
+
+export function createFeature(name: string): NewFeature {
+  return { name, enabled: true };
+}`);

    mockGit.diffSummary.mockResolvedValue({
      files: [{ file: 'src/feature.ts' }],
    });

    // Mock AI response
    (env.aiProvider.generateCommitMessage as jest.Mock).mockResolvedValue(
      JSON.stringify({
        type: 'feat',
        scope: 'feature',
        commitMessage: 'feat(feature): add new feature interface and factory',
        breaking: false,
        details: 'Added NewFeature interface and createFeature factory function',
      })
    );

    // Execute the tool
    const result = await generateCommitMessageTool.execute({ 
      input: { rootDir: tempDir },
      context: {},
    });

    // Verify complete pipeline
    expect(mockGit.diff).toHaveBeenCalledWith(['--cached']);
    expect(env.aiProvider.generateCommitMessage).toHaveBeenCalled();
    expect(result).toBe('feat(feature): add new feature interface and factory');
  });

  it('should handle the complete error recovery path', async () => {
    // Setup mock git state with problematic changes
    mockGit.diff.mockResolvedValue(`diff --git a/src/problematic.ts b/src/problematic.ts
+console.log('debug');
+throw new Error('oops');`);

    mockGit.diffSummary.mockResolvedValue({
      files: [{ file: 'src/problematic.ts' }],
    });

    // Mock AI failure
    (env.aiProvider.generateCommitMessage as jest.Mock).mockRejectedValue(
      new Error('AI service error')
    );

    // Execute the tool
    const result = await generateCommitMessageTool.execute({ 
      input: { rootDir: tempDir },
      context: {},
    });

    // Verify fallback behavior
    expect(result).toMatch(/^(feat|fix|chore)/);
    expect(result).toContain('src/problematic.ts');
  });

  it('should respect conventional commits format throughout the pipeline', async () => {
    // Setup mock git state with multiple changes
    mockGit.diff.mockResolvedValue(`diff --git a/src/api.ts b/src/api.ts
-function oldApi() {}
+function newApi() {}
diff --git a/README.md b/README.md
+Updated API documentation`);

    mockGit.diffSummary.mockResolvedValue({
      files: [
        { file: 'src/api.ts' },
        { file: 'README.md' },
      ],
    });

    // Mock AI response with multiple changes
    (env.aiProvider.generateCommitMessage as jest.Mock).mockResolvedValue(
      JSON.stringify({
        type: 'feat',
        scope: 'api',
        commitMessage: 'feat(api): implement new API\n\ndocs: update README with API changes',
        breaking: false,
        details: 'Multiple changes across API implementation and documentation',
      })
    );

    // Execute the tool
    const result = await generateCommitMessageTool.execute({ 
      input: { rootDir: tempDir },
      context: {},
    });

    // Verify conventional commits format
    expect(result).toMatch(/^feat\(api\):/);
    expect(result).toContain('\n\ndocs:');
  });
});