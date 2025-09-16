# Release: 2025-09-16

Summary:

- Clarified cache behavior in `src/tools/cache/commit-cache.ts`: updated header to reflect LFU eviction by `hitCount`.
- Switched to Bun's test runner: removed Jest/ts-jest dev dependencies and updated `package.json` to use `bun test`.
- Added modular LLM-driven commit message generation tooling under `src/tools/git/commit-analyzer.ts` and related modules (diff parser, llm types, prompt templates).
- Added tests and initial test scaffolding under `src/__tests__` (designed for Bun test runner compatibility).
- Added `tools.ts` utilities for `getFileChangesInDirectoryTool`, `generateCommitMessageTool`, and `writeReviewToMarkdownTool`.

Notes:

- If your CI uses Jest, update CI to use Bun or adjust test configs accordingly.
- The cache currently uses LFU eviction; if you'd prefer LRU, see `src/tools/cache/commit-cache.ts` and update the eviction logic.

How to run tests locally:

```bash
# Ensure Bun is installed (tested with Bun v1.2.22)
bun --version
bun test
```

Contact:

- **Author**: JasEmaz
- **Repo**: [my-ai-agent](https://github.com/JasEmaz/my-ai-agent)
