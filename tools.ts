import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";
import { writeFile } from "fs/promises";
import { analyzeCommit } from "./src/tools/git/commit-analyzer";

const excludeFiles = ["dist", "bun.lock"];

// ---------- 1. File Changes Tool ----------
const fileChange = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

async function getFileChangesInDirectory({ rootDir }: FileChange) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary();
  const diffs: { file: string; diff: string }[] = [];

  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return diffs;
}

export const getFileChangesInDirectoryTool = tool({
  description: "Gets the code changes made in given directory",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});

// ---------- 2. AI-Powered Commit Message Generator ----------
// Uses LLM to analyze changes and generate meaningful commit messages
const commitInput = z.object({
  rootDir: z.string().min(1).describe("The root directory with staged changes"),
});

type CommitInput = z.infer<typeof commitInput>;

async function generateCommitMessage({ rootDir }: CommitInput) {
  try {
    const { message } = await analyzeCommit(rootDir);
    return message;
  } catch (error) {
    throw new Error(`Failed to generate commit message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const generateCommitMessageTool = tool({
  description: "Generates a commit message suggestion from staged changes",
  inputSchema: commitInput,
  execute: generateCommitMessage,
});
// ---------- 3. Write Review to Markdown File ----------
const reviewInput = z.object({
  filePath: z.string().min(1).describe("Path to save the review markdown"),
  reviewContent: z.string().min(1).describe("Content of the code review"),
});

type ReviewInput = z.infer<typeof reviewInput>;

async function writeReviewToMarkdown({ filePath, reviewContent }: ReviewInput) {
  try {
    // Basic path validation to prevent directory traversal
    if (filePath.includes('..')) {
      throw new Error('Invalid file path: directory traversal not allowed');
    }
    
    await writeFile(filePath, reviewContent, "utf-8");
    return `✅ Review written to ${filePath}`;
  } catch (error) {
    throw new Error(`Failed to write review file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
export const writeReviewToMarkdownTool = tool({
  description: "Writes the code review to a markdown file",
  inputSchema: reviewInput,
  execute: writeReviewToMarkdown,
});
