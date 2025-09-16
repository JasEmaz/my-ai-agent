Prompt 0 — Alignment check
"Goal: Develop and apply a structured, AI-enhanced development workflow to a real feature in your codebase—from planning to implementation and refactor.

Context: AI CodeReviewAgent capabilities include:
- inspecting git diffs via getFileChangesInDirectoryTool,
- generating commit messages via generateCommitMessageTool,
- writing review files via writeReviewToMarkdownTool,
- planning, reasoning, and calling tools to act.

Task: Compare the Goal with the CodeReviewAgent capabilities and determine alignment.
Return a single JSON object:
{
  "aligned": boolean,
  "mapping": {
    "Choose Feature": [array of matching capabilities],
    "Plan with AI": [...],
    "Create Project Rule File": [...],
    "Implement with Context Anchors": [...],
    "Refactor and Review": [...],
    "Commit and Share": [...]
  },
  "notes": "short rationales for any mismatches"
}
Only return the JSON."


Prompt 1 — Choose a Feature
"Repository root: {rootDir} (replace with your repo path, e.g., ../my-agent)

Task: Inspect the repository and propose 3 candidate features that are meaningful but manageable. For each candidate include:
- title
- one-sentence impact/value
- estimated effort (Low/Medium/High + rough hours)
- files likely to change (paths)
- minimal acceptance criteria (3 bullets)

Rank by impact/effort and select the recommended feature.

Return only JSON:
{ \"candidates\": [ {title, impact, effort, files, acceptanceCriteria}... ], \"selectedFeature\": {title, rationale, files, acceptanceCriteria} }"


Prompt 2 — Plan with AI (folder structure, signatures, security/perf)
"Selected feature: {selectedFeature.title} (use selectedFeature from previous step)
Repository root: {rootDir}

Task: Produce a detailed implementation plan containing:
1) folderStructure — a short tree of files to add/modify
2) signatures — array of function/class names + full TypeScript signatures + one-line purpose
3) interfaces/models — TypeScript interface definitions needed
4) security — list of security checks (auth, input validation, secrets handling) with one-sentence implementation notes
5) performance — list of performance/caching considerations with short remedies
6) tests — minimal test plan with 3 concrete test cases (inputs + expected outputs)

Return only JSON:
{
  \"folderStructure\": \"...\",
  \"signatures\": [{\"name\":\"\",\"signature\":\"\",\"purpose\":\"\"}, ...],
  \"interfaces\": [\"interface definitions as strings\"],
  \"security\": [...],
  \"performance\": [...],
  \"tests\": [...]
}"


Prompt 3 — Create Project Rule File
"Based on the plan, generate a project rule file named 'project.rules.yaml' containing 3–5 high-level rules the AI should follow when modifying the codebase. Each rule must include:
- rule id
- short description
- one-line example or enforcement note

Return only the file output prefixed by a single header line:
--- project.rules.yaml ---
<YAML content>
Do not add any other text."


Prompt 4 — Implement initial feature (use in-editor anchors)
"Implement the minimal, working feature using in-editor anchors. Use this exact format for every file you create or modify:

@file: {rootDir}/path/to/file.ext
@code:
<full file contents here>

Requirements:
- TypeScript with explicit types
- include a 2-line header comment describing purpose
- include input validation and brief JSDoc comments
- keep functions small and testable

At the end return a JSON summary:
{ \"filesCreated\": [...], \"filesModified\": [...], \"runCommands\": [\"command to run tests or start app\"] }

Only return the anchored file blocks followed by the JSON summary."



Prompt 5 — Add unit tests (use anchors)
"Add unit tests for the new feature. Use the project's test framework (Jest or existing). For each test file use the @file/@code anchor format.

Include at least:
- 1 happy-path test
- 1 edge-case test
- 1 error-handling test

Return anchored test files and a JSON:
{ \"testFiles\": [...], \"testCommands\": [\"npm test\" or equivalent] }
Only return the anchored blocks and JSON."



Prompt 6 — Run git diff and propose fixes (use tool)
"Action sequence:
1) Call getFileChangesInDirectoryTool with input: { \"rootDir\": \"{rootDir}\" } and include its JSON output under key 'diffs'.
2) Analyze diffs file-by-file and list any obvious bugs, missing validations, or style issues.
3) For each issue propose a minimal fix and provide the updated file contents using @file/@code anchors.

Return structure:
{
  \"diffs\": <tool output JSON>,
  \"issues\": [{\"file\":\"\",\"summary\":\"\",\"severity\":\"\" , \"suggestedFix\":\"short summary\"}],
  \"fixes\": [ anchored @file/@code blocks for each changed file ]
}
Only return this JSON and anchored blocks."



Prompt 7 — Refactor for readability & performance
"Refactor the implemented code for readability, modularity, and performance. Produce:
1) a unified git-style patch (diff format hunks) showing changes
2) resulting full file contents for each changed file using @file/@code anchors
3) a short JSON summary: { \"filesRefactored\": [...], \"rationale\": \"...\" }

Return only the patch, anchored file blocks, and the JSON summary."


Prompt 8 — Get diffs before & after refactor (use tool)
"1) Run getFileChangesInDirectoryTool with { \"rootDir\": \"{rootDir}\" } and capture output as diffBefore.
2) Assume refactor applied. Run getFileChangesInDirectoryTool again and capture diffAfter.
3) Return only JSON:
{
  \"toolInvocations\": [
    {\"call\":\"getFileChangesInDirectoryTool\",\"input\":{\"rootDir\":\"{rootDir}\"},\"output\": diffBefore},
    {\"call\":\"getFileChangesInDirectoryTool\",\"input\":{\"rootDir\":\"{rootDir}\"},\"output\": diffAfter}
  ],
  \"summary\": {\"filesChanged\": N, \"linesAdded\": X, \"linesRemoved\": Y}
}
Show exact tool input objects used. Only return JSON."


Prompt 9 — Simulate a senior code review (produce review.md)
"Act as a senior engineer performing a formal code review of the final changes. For each changed file produce:
- 1-line file summary
- 3-5 review comments: { severity: Critical|Major|Minor, location: 'function or line range', comment: '...', suggestedFix: 'code snippet or command' }
Conclude with overall verdict (Approve/Request changes) and a checklist of items to address.

Return the review as Markdown only (suitable to save directly into review.md). No extra text."



Prompt 10 — Generate commit message & save review (call tools)
"1) Call generateCommitMessageTool with input: { \"rootDir\": \"{rootDir}\" } and capture the suggested commit message.
2) Use the Markdown from the previous prompt as reviewContent and call writeReviewToMarkdownTool with input:
{ \"filePath\": \"{rootDir}/review.md\", \"reviewContent\": \"<paste the Markdown review here>\" }

Return only JSON:
{
  \"generateCommitMessageTool_call\": {\"input\": {\"rootDir\":\"{rootDir}\"}, \"output\": \"...\"},
  \"writeReviewToMarkdownTool_call\": {\"input\": {\"filePath\":\"{rootDir}/review.md\",\"reviewContent\":\"<truncated Markdown>\"}, \"output\": \"...\"}
}
Show exact inputs used for each tool. Only return JSON."

