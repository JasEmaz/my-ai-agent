// Import necessary functions and types from external libraries
//import { stepCountIs, streamText } from "ai"; // Import step count control and streaming text function from 'ai' library
//import { google } from "@ai-sdk/google"; // Import Google model selector from '@ai-sdk/google'
// Import the system prompt from a local file
//import { SYSTEM_PROMPT } from "./prompt"; // Import system prompt constant from local 'prompt' file
// Import custom tools for code review from local files
//import { getFileChangesInDirectoryTool, generateCommitMessageTool, writeReviewToMarkdownTool} from "./tools"; // Import custom code review tools

// Define an asynchronous function for the code review agent
/**
 * Asynchronously streams AI-generated code review feedback to the console using the Google Gemini model.
 *
 * @param prompt - The user-provided prompt describing the code or review request.
 * @remarks
 * - Uses the `streamText` function to interact with the AI model.
 * - Includes a system prompt for context and a tool for retrieving file changes in the directory.
 * - Limits the AI interaction to 10 steps using `stepCountIs(10)`.
 * - Outputs the streamed text chunks directly to the console via `process.stdout.write`.
 *
 * @example
 * ```typescript
 * await codeReviewAgent("Review the changes in my latest commit.");
 * ```
 */
//const codeReviewAgent = async (prompt: string) => {
    // Create a streaming text result using the AI model and provided prompt
   // const result = streamText({
     //   model: google("models/gemini-2.5-flash"), // Specify the Google Gemini model
       // prompt, // The user prompt for code review
        //system: SYSTEM_PROMPT, // System prompt for context
        //tools: {
          //  getFileChangesInDirectoryTool: getFileChangesInDirectoryTool, // Tool to get file changes
        //},
        //stopWhen: stepCountIs(10), // Stop after 10 steps
    //});

    // Stream the AI-generated text output to the console
    //for await (const chunk of result.textStream) {
      //  process.stdout.write(chunk); // Output each chunk to the console
    //}
//};

// Call the code review agent with a specific prompt to review code changes in a directory
//await codeReviewAgent(
  //  "Review the code changes in '../my-agent' directory, make your reviews and suggestions file by file", // Prompt for code review
//);

import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompt";
import {
  getFileChangesInDirectoryTool,
  generateCommitMessageTool,
  writeReviewToMarkdownTool,
} from "./tools";

const codeReviewAgent = async (prompt: string) => {
  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    system: SYSTEM_PROMPT,
    tools: {
      getFileChangesInDirectoryTool,
      generateCommitMessageTool,
      writeReviewToMarkdownTool,
    },
    stopWhen: stepCountIs(10),
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
};

// 📝 Example usage
await codeReviewAgent(
  "Review the code changes in '../my-agent' directory. For each file, make suggestions. Then generate a commit message and save the full review into 'review.md'."
);

