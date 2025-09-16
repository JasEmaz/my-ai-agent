/**
 * Tests for git diff parser
 */

import { parseDiff, getStagedDiff } from '../tools/git/diff-parser';
import { simpleGit } from 'simple-git';

jest.mock('simple-git');

describe('Diff Parser', () => {
  const mockGit = {
    diff: jest.fn(),
    diffSummary: jest.fn(),
  };

  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue(mockGit);
  });

  describe('parseDiff', () => {
    it('should parse git diff output correctly', async () => {
      const mockDiff = `diff --git a/src/file1.ts b/src/file1.ts
index abc123..def456 100644
++ b/src/file1.ts
@@ -1,3 +1,4 @@
import { newDep } from 'new-dep';
 const oldCode = true;
-const removeThis = false;
 console.log('test');`;

      const result = await parseDiff(mockDiff);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        filePath: 'src/file1.ts',
        additions: ['import { newDep } from \'new-dep\';'],
        deletions: ['const removeThis = false;'],
        changeType: 'modified',
      });
    });
    it('should handle empty diff', async () => {
      const result = await parseDiff('');
      expect(result).toHaveLength(0);
    });

    it('should exclude specified files', async () => {
      const mockDiff = `diff --git a/package-lock.json b/package-lock.json
index abc123..def456 100644
--- a/package-lock.json
+++ b/package-lock.json`;

      const result = await parseDiff(mockDiff, {
        excludePatterns: ['package-lock.json'],
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('getStagedDiff', () => {
    it('should get staged changes from git', async () => {
      const mockDiff = 'mock diff content';
      mockGit.diff.mockResolvedValue(mockDiff);

      const result = await getStagedDiff('/test/dir');

      expect(mockGit.diff).toHaveBeenCalledWith(['--cached']);
      expect(result).toHaveLength(0); // Empty because mock diff doesn't match diff format
    });

    it('should handle git errors gracefully', async () => {
      mockGit.diff.mockRejectedValue(new Error('Git error'));

      await expect(getStagedDiff('/test/dir')).rejects.toThrow('Git error');
    });
  });
});