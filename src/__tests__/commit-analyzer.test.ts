/**
 * Tests for commit analyzer
 */

import { analyzeCommit } from '../tools/git/commit-analyzer';
import { env } from '../config/env';
import { simpleGit } from 'simple-git';

jest.mock('simple-git');
jest.mock('../config/env');

describe('Commit Analyzer', () => {
  const mockGit = {
    diff: jest.fn(),
    diffSummary: jest.fn(),
  };

  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue(mockGit);
  });

  it('should generate commit message for feature changes', async () => {
    // Mock git diff
    mockGit.diff.mockResolvedValue(`diff --git a/src/feature.ts b/src/feature.ts
+export function newFeature() {
+  return 'new feature';
+}`);
    mockGit.diffSummary.mockResolvedValue({
      files: [{ file: 'src/feature.ts' }],
    });

    // Mock AI response
    (env.aiProvider.generateCommitMessage as jest.Mock).mockResolvedValue(
      JSON.stringify({
        type: 'feat',
        scope: 'feature',
        commitMessage: 'feat(feature): add new feature implementation',
        breaking: false,
        details: 'Added newFeature function',
      })
    );

    const result = await analyzeCommit('/test/dir');

    expect(result.message).toBe('feat(feature): add new feature implementation');
    expect(result.analysis.changeTypes[0]?.type).toBe('feat');
    expect(result.analysis.breakingChanges).toBe(false);
  });

  it('should handle breaking changes', async () => {
    // Mock git diff with breaking change
    mockGit.diff.mockResolvedValue(`diff --git a/src/api.ts b/src/api.ts
-export function oldApi(param: string): string {
+export function newApi(param: number): number {
   return param;
 }`);
    mockGit.diffSummary.mockResolvedValue({
      files: [{ file: 'src/api.ts' }],
    });

    // Mock AI response for breaking change
    (env.aiProvider.generateCommitMessage as jest.Mock).mockResolvedValue(
      JSON.stringify({
        type: 'feat',
        scope: 'api',
        commitMessage: 'BREAKING CHANGE: feat(api): modify parameter type',
        breaking: true,
        details: 'Changed parameter type from string to number',
      })
    );

    const result = await analyzeCommit('/test/dir');

    expect(result.message).toContain('BREAKING CHANGE');
    expect(result.analysis.breakingChanges).toBe(true);
  });

  it('should fallback gracefully on AI error', async () => {
    // Mock git diff
    mockGit.diff.mockResolvedValue(`diff --git a/src/file.ts b/src/file.ts
+console.log('test');`);
    mockGit.diffSummary.mockResolvedValue({
      files: [{ file: 'src/file.ts' }],
    });

    // Mock AI error
    (env.aiProvider.generateCommitMessage as jest.Mock).mockRejectedValue(
      new Error('AI service unavailable')
    );

    const result = await analyzeCommit('/test/dir');

    expect(result.message).toMatch(/^(feat|fix|chore)/); // Should use fallback format
    expect(result.analysis.files).toContain('src/file.ts');
  });

  it('should handle no changes', async () => {
    mockGit.diff.mockResolvedValue('');
    mockGit.diffSummary.mockResolvedValue({ files: [] });

    const result = await analyzeCommit('/test/dir');

    expect(result.message).toBe('No changes staged for commit');
    expect(result.analysis.files).toHaveLength(0);
  });
});