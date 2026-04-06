/**
 * Agent pipeline configuration for Bottleneck.
 *
 * Architecture: System prompts are identity-only (1-2 sentences).
 * ALL instructions live in task descriptions — each task is a complete,
 * self-contained script with exact bash commands and verification steps.
 */

import { OpenMultiAgent } from 'open-multi-agent'
import type { AgentConfig, OrchestratorEvent, Task } from 'open-multi-agent'

// ---------------------------------------------------------------------------
// Project paths
// ---------------------------------------------------------------------------

export const PROJECT_DIR = process.cwd()
export const SPEC_FILE = `${PROJECT_DIR}/docs/spec.md`
export const TECH_REF_FILE = `${PROJECT_DIR}/docs/tech-reference.md`
export const ISSUES_FILE = `${PROJECT_DIR}/docs/issues.json`

// ---------------------------------------------------------------------------
// LLM config
// ---------------------------------------------------------------------------

export const LLM = {
  model: 'sushi-coder:latest',
  provider: 'openai' as const,
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
}

// ---------------------------------------------------------------------------
// Agent definitions — identity-only system prompts
// ---------------------------------------------------------------------------

export const pm: AgentConfig = {
  name: 'pm',
  ...LLM,
  systemPrompt: 'You are a product manager. You write technical specs and create detailed GitHub issues for a development team.',
  tools: ['bash', 'file_write', 'file_read'],
  maxTurns: 12,
  temperature: 0.3,
}

export const spike: AgentConfig = {
  name: 'spike',
  ...LLM,
  systemPrompt: 'You are a technical researcher. You investigate npm packages and write implementation reference documents with exact code snippets.',
  tools: ['bash', 'file_read', 'file_write'],
  maxTurns: 12,
  temperature: 0.2,
}

export const dev: AgentConfig = {
  name: 'dev',
  ...LLM,
  systemPrompt: 'You are a TypeScript developer. You read reference docs and write code that compiles. You use git branches and GitHub PRs for every change.',
  tools: ['bash', 'file_read', 'file_write', 'file_edit'],
  maxTurns: 10,
  temperature: 0.1,
}

export const qa: AgentConfig = {
  name: 'qa',
  ...LLM,
  systemPrompt: 'You are a QA engineer. You write and run automated tests using vitest, then report results on GitHub issues.',
  tools: ['bash', 'file_read', 'file_write', 'grep'],
  maxTurns: 12,
  temperature: 0.2,
}

export const devops: AgentConfig = {
  name: 'devops',
  ...LLM,
  systemPrompt: 'You are a DevOps engineer. You create Dockerfiles and deployment documentation.',
  tools: ['bash', 'file_write', 'file_read'],
  maxTurns: 10,
  temperature: 0.2,
}

// ---------------------------------------------------------------------------
// All agents
// ---------------------------------------------------------------------------

export const allAgents = [pm, spike, dev, qa, devops]

// ---------------------------------------------------------------------------
// Task descriptions — complete, self-contained scripts
// ---------------------------------------------------------------------------

const PM_TASK = `You will write a technical spec and create GitHub issues for a Slack bot called Bottleneck.

PRODUCT BRIEF:
Build a Slack bot called Bottleneck. Users manage personal todo queues via a /bottleneck slash command with subcommands: add, list, done. Users can also view other users' queues. Stack: TypeScript, @slack/bolt (Socket Mode), better-sqlite3, drizzle-orm. Deploy to Railway.

STEP 1: Write the spec file.
Use the file_write tool to create ${SPEC_FILE} with this content:

# Bottleneck Technical Spec

## Overview
Bottleneck is a Slack bot that manages personal todo queues. Users interact via the /bottleneck slash command with subcommands. All responses are ephemeral (only visible to the user who ran the command).

## Slash Command
The bot registers ONE slash command: /bottleneck
Subcommands are parsed from the text argument.

### /bottleneck add <task text>
- Adds a new task to the calling user's queue
- Task is appended at the end (position = highest current position + 1)
- Bot responds with ephemeral confirmation: "Added: <task text> (position N)"
- Error if text is empty: "Please provide a task. Usage: /bottleneck add <task>"

### /bottleneck list
- Shows the calling user's tasks, ordered by position
- Format: numbered list "1. Task text\\n2. Task text"
- Empty queue: "Your queue is empty."
- Response is ephemeral

### /bottleneck list <@user>
- Shows another user's tasks (Slack user mention format: <@U12345> or <@U12345|name>)
- Same numbered list format
- Empty queue: "<@U12345> has no tasks."
- Response is ephemeral

### /bottleneck done <number>
- Removes the task at that position number from the calling user's queue
- Remaining tasks are renumbered sequentially (no gaps)
- Response: "Completed: <task text>"
- Error if number is invalid or out of range: "No task at position N"
- Response is ephemeral

## Data Model
\`\`\`sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
\`\`\`

## Technical Stack
- @slack/bolt with Socket Mode
- better-sqlite3 for SQLite
- drizzle-orm for type-safe queries
- Environment variables: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN, DATABASE_PATH

## File Structure
- src/db/schema.ts — Drizzle table definition
- src/db/index.ts — Database connection and initialization
- src/app.ts — Bolt app setup, /bottleneck command handler
- src/index.ts — Entry point

STEP 2: Create GitHub issues.
Run each of these bash commands one at a time. After each one, check the output for the issue URL to confirm it was created.

bash: gh issue create --title "Story: DB schema and connection" --body "## Description
A developer needs a working database layer before implementing any commands.

## Acceptance Criteria
- [ ] SQLite database file is created at the path specified by DATABASE_PATH env var
- [ ] Fallback path is ./data/bottleneck.db if DATABASE_PATH is not set
- [ ] tasks table is created on startup with columns: id, user_id, text, position, created_at, completed_at
- [ ] Drizzle ORM is configured and exports a usable db instance
- [ ] Schema uses sqliteTable from drizzle-orm/sqlite-core
- [ ] Connection uses default import from better-sqlite3 (import Database from 'better-sqlite3')
- [ ] Database file and parent directory are created automatically if they don't exist

## Technical Notes
- Files: src/db/schema.ts, src/db/index.ts
- Must use drizzle-orm, NOT raw SQL queries for application code
- Table creation can use raw SQL via sqlite.exec()" --label "story,pm"

bash: gh issue create --title "Story: /bottleneck add command" --body "## Description
As a Slack user, I can type '/bottleneck add Buy groceries' and have 'Buy groceries' added to the bottom of my personal task queue. The bot confirms with an ephemeral message.

## Acceptance Criteria
- [ ] /bottleneck add <text> creates a task for the calling user (identified by command.user_id)
- [ ] Task position is set to max(existing positions for this user) + 1
- [ ] First task for a new user gets position 1
- [ ] Ephemeral response: 'Added: <text> (position N)'
- [ ] Empty text (just '/bottleneck add' with nothing after) returns ephemeral error: 'Please provide a task. Usage: /bottleneck add <task>'
- [ ] Whitespace-only text is treated as empty
- [ ] Response uses respond() with response_type: 'ephemeral', NOT say()

## Technical Notes
- File: src/app.ts
- Single command registration: app.command('/bottleneck', handler)
- Parse subcommand: split command.text on whitespace, first word is subcommand, rest joined is args
- Env vars for App config: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN (socketMode: true)" --label "story,pm"

bash: gh issue create --title "Story: /bottleneck list command" --body "## Description
As a Slack user, I can see my own tasks or another user's tasks in numbered order.

## Acceptance Criteria
- [ ] /bottleneck list shows calling user's tasks ordered by position ascending
- [ ] Format: numbered list ('1. Buy groceries\\n2. Call dentist')
- [ ] Empty own queue: 'Your queue is empty.'
- [ ] /bottleneck list <@U12345> shows that user's tasks in the same format
- [ ] /bottleneck list <@U12345|username> also works (Slack sometimes includes display name)
- [ ] Parse user mention with regex: /<@([A-Z0-9]+)(?:\\|[^>]*)?>/
- [ ] Empty other user queue: '<@U12345> has no tasks.'
- [ ] All responses are ephemeral (respond with response_type: 'ephemeral')

## Technical Notes
- File: src/app.ts (add 'list' case to existing switch statement)
- Query: SELECT from tasks WHERE user_id = ? ORDER BY position ASC
- If args is empty, list own tasks. If args matches @mention pattern, list that user's tasks." --label "story,pm"

bash: gh issue create --title "Story: /bottleneck done command" --body "## Description
As a Slack user, I can mark a task as complete by its position number. My remaining tasks renumber automatically so there are no gaps.

## Acceptance Criteria
- [ ] /bottleneck done <N> deletes the task at position N for the calling user
- [ ] Remaining tasks with position > N get their position decremented by 1 (no gaps)
- [ ] Response: 'Completed: <task text>' (shows the text of the deleted task)
- [ ] Non-numeric input: 'Please provide a task number. Usage: /bottleneck done <number>'
- [ ] No task at that position: 'No task at position N'
- [ ] Position 0 or negative number: 'No task at position N'
- [ ] Renumbering works correctly when deleting from the middle (e.g., delete position 2 of 4, positions become 1,2,3)
- [ ] All responses are ephemeral

## Technical Notes
- File: src/app.ts (add 'done' case to existing switch statement)
- Steps: find task, delete it, UPDATE tasks SET position = position - 1 WHERE user_id = ? AND position > ?
- Use and() from drizzle-orm for compound WHERE clauses" --label "story,pm"

bash: gh issue create --title "Story: Deployment configuration" --body "## Description
A new developer needs to be able to set up the Slack app, run locally, and deploy to Railway.

## Acceptance Criteria
- [ ] Dockerfile builds successfully with 'docker build .'
- [ ] Dockerfile uses node:20-alpine for both build and runtime stages
- [ ] .env.example lists all required env vars with comments explaining where to find each value
- [ ] DEPLOY.md has step-by-step Slack app creation instructions
- [ ] DEPLOY.md has local development setup instructions
- [ ] DEPLOY.md has Railway deployment instructions including persistent volume for SQLite
- [ ] /data directory is created in Docker image for SQLite volume mount
- [ ] DATABASE_PATH env var is set to /data/bottleneck.db in Dockerfile

## Technical Notes
- Files: Dockerfile, .env.example, DEPLOY.md" --label "story,pm"

STEP 3: Save issue numbers.
bash: gh issue list --json number,title --label story | tee ${ISSUES_FILE}

STEP 4: Verify all issues exist with correct labels.
bash: gh issue list --label story --json number,title,labels

You are DONE when step 4 shows all 5 issues with "story" and "pm" labels.`


const SPIKE_TASK = `You will research npm packages and write an implementation reference for the developer.

STEP 1: Read the spec.
bash: cat ${SPEC_FILE}

STEP 2: Read the story issues.
bash: cat ${ISSUES_FILE}
Then read each issue to understand what needs to be built:
bash: gh issue view <number>
(Do this for each issue number in the JSON file.)

STEP 3: Research each package version.
Run these commands one at a time:
bash: npm info @slack/bolt version
bash: npm info better-sqlite3 version
bash: npm info drizzle-orm version
bash: npm info @types/better-sqlite3 version

Write down the version numbers from the output.

STEP 4: Write the tech reference.
Use the file_write tool to create ${TECH_REF_FILE} with this structure. Fill in the version numbers you got from step 3:

# Tech Reference for Bottleneck

## Package Versions
Add these to package.json dependencies:
- "@slack/bolt": "^<version from step 3>"
- "better-sqlite3": "^<version from step 3>"
- "drizzle-orm": "^<version from step 3>"

Add these to package.json devDependencies:
- "@types/better-sqlite3": "^<version from step 3>"

---

## File: src/db/schema.ts
Purpose: Drizzle ORM table definition for the tasks table.

Imports:
\`\`\`ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
\`\`\`

Export:
\`\`\`ts
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  text: text('text').notNull(),
  position: integer('position').notNull(),
  created_at: text('created_at').default(sql\`CURRENT_TIMESTAMP\`),
  completed_at: text('completed_at'),
});
\`\`\`

DO NOT:
- Do not use defineTable (doesn't exist in drizzle-orm)
- Do not use column.text() syntax (wrong API)
- Do not create a users table (not in the spec)
- Do not rename columns from the spec (use user_id, text, position exactly)

---

## File: src/db/index.ts
Purpose: Create SQLite connection and initialize the database.

Imports:
\`\`\`ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
\`\`\`

CRITICAL: better-sqlite3 uses a DEFAULT export.
Write: import Database from 'better-sqlite3'
DO NOT write: import { Database } from 'better-sqlite3'
DO NOT write: import { open } from 'better-sqlite3'

Pattern:
\`\`\`ts
const sqlite = new Database(process.env.DATABASE_PATH || './data/bottleneck.db');
sqlite.exec(\`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
)\`);
export const db = drizzle(sqlite);
\`\`\`

---

## File: src/app.ts
Purpose: Bolt.js app with /bottleneck command handler.

Imports:
\`\`\`ts
import { App } from '@slack/bolt';
import { eq, and, asc, gt, sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { tasks } from './db/schema.js';
\`\`\`

App setup — env var names MUST match .env.example exactly:
\`\`\`ts
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});
\`\`\`

Command handler pattern:
\`\`\`ts
app.command('/bottleneck', async ({ command, ack, respond }) => {
  await ack();
  const [subcommand, ...rest] = command.text.trim().split(/\\s+/);
  const args = rest.join(' ');
  switch (subcommand) {
    case 'add': { /* ... */ break; }
    case 'list': { /* ... */ break; }
    case 'done': { /* ... */ break; }
    default: { await respond({ text: 'Unknown command. Try: add, list, done', response_type: 'ephemeral' }); }
  }
});
\`\`\`

Ephemeral response pattern — use this for ALL responses:
\`\`\`ts
await respond({ text: 'message here', response_type: 'ephemeral' });
\`\`\`

DO NOT:
- Do not use say() — always use respond() with response_type: 'ephemeral'
- Do not use command.user.id — use command.user_id
- Do not register separate commands like app.command('/bottleneck add') — Bolt doesn't support spaces
- Do not use SLACK_TOKEN — use SLACK_BOT_TOKEN (match .env.example)

---

## File: src/index.ts
Purpose: Entry point that starts the Bolt app.

\`\`\`ts
import app from './app.js';

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Bottleneck is running!');
})();
\`\`\`

Note: src/app.ts should use \`export default app;\`

STEP 5: Comment on each story issue with the relevant file blueprint.
Read the issue numbers from ${ISSUES_FILE}. For each issue, post a comment with ONLY the sections relevant to that story.

For the DB story issue:
bash: gh issue comment <db-issue-number> --body "## Spike: Technical Blueprint

See docs/tech-reference.md for full details.

Key files: src/db/schema.ts, src/db/index.ts
Key imports: sqliteTable from drizzle-orm/sqlite-core, Database (default) from better-sqlite3, drizzle from drizzle-orm/better-sqlite3
Critical: Use DEFAULT import for better-sqlite3, not named import."

For command story issues (add, list, done):
bash: gh issue comment <number> --body "## Spike: Technical Blueprint

See docs/tech-reference.md for full details.

Key file: src/app.ts
Pattern: app.command('/bottleneck', handler) with switch on subcommand
All responses: respond({ text, response_type: 'ephemeral' })
User ID: command.user_id (not command.user.id)"

For the deployment story issue:
bash: gh issue comment <number> --body "## Spike: Technical Blueprint

Env vars: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN, DATABASE_PATH
Runtime: node:20-alpine
Build: npx tsc to compile TypeScript to dist/"

STEP 6: Add spike label to each issue.
For each issue number from ${ISSUES_FILE}:
bash: gh issue edit <number> --add-label spike

STEP 7: Verify.
bash: gh issue list --label spike --json number,title

You are DONE when all 5 story issues appear with the spike label.`


const DEV_DB_TASK = `You will implement the database layer for Bottleneck.

STEP 1: Read the tech reference for the DB files.
bash: cat ${TECH_REF_FILE}
Focus on the "File: src/db/schema.ts" and "File: src/db/index.ts" sections.

STEP 2: Read the DB story issue.
bash: cat ${ISSUES_FILE}
Find the issue with title containing "DB schema". Note the issue number.
bash: gh issue view <that-number>

STEP 3: Create a feature branch.
bash: cd ${PROJECT_DIR} && git checkout main && git pull origin main && git checkout -b feat/db-schema

STEP 4: Install dependencies.
First read the current package.json:
bash: cat ${PROJECT_DIR}/package.json

Use file_read to get the full content. Then use file_write to write an updated version that KEEPS all existing entries (especially "scripts" and "open-multi-agent") and ADDS these:
- In dependencies: "@slack/bolt", "better-sqlite3", "drizzle-orm" (use versions from tech reference)
- In devDependencies: "@types/better-sqlite3", "@types/node"

Then install:
bash: cd ${PROJECT_DIR} && npm install

STEP 5: Create src/db/schema.ts
Use file_write to create ${PROJECT_DIR}/src/db/schema.ts.
Copy the EXACT code from the tech reference "File: src/db/schema.ts" section. Do not modify it.

STEP 6: Create src/db/index.ts
Use file_write to create ${PROJECT_DIR}/src/db/index.ts.
Copy the EXACT code from the tech reference "File: src/db/index.ts" section. Do not modify it.

STEP 7: Create tsconfig.json if needed.
Use file_read to check if ${PROJECT_DIR}/tsconfig.json exists. If not, create it with file_write:
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}

STEP 8: Compile check.
bash: cd ${PROJECT_DIR} && npx tsc --noEmit

If there are TypeScript errors, read the error message, fix the file using file_edit, and run tsc again. You have 3 attempts.

STEP 9: Commit and push.
bash: cd ${PROJECT_DIR} && git add -A && git commit -m "feat: add database schema and connection layer"
bash: cd ${PROJECT_DIR} && git push -u origin feat/db-schema

STEP 10: Create a PR.
bash: gh pr create --title "Story: DB schema and connection" --body "Closes #<issue-number-from-step-2>" --base main

STEP 11: Comment on the issue.
bash: gh issue comment <issue-number> --body "## Dev: Implementation Complete

Files created:
- src/db/schema.ts — Drizzle table definition with tasks table
- src/db/index.ts — SQLite connection using better-sqlite3, table init

Compile status: PASS (or FAIL with error details)"

STEP 12: Add dev label and merge PR.
bash: gh issue edit <issue-number> --add-label dev
bash: gh pr merge --squash --delete-branch
bash: cd ${PROJECT_DIR} && git checkout main && git pull

STEP 13: Verify.
bash: gh issue view <issue-number> --json labels
bash: gh pr list --state merged --json number,title

You are DONE when the PR is merged and the issue has the "dev" label.`


const DEV_ADD_TASK = `You will implement the /bottleneck add subcommand.

STEP 1: Read the tech reference.
bash: cat ${TECH_REF_FILE}
Focus on the "File: src/app.ts" section.

STEP 2: Read the add command story issue.
bash: cat ${ISSUES_FILE}
Find the issue with title containing "add command". Note the issue number.
bash: gh issue view <that-number>

STEP 3: Create a feature branch.
bash: cd ${PROJECT_DIR} && git checkout main && git pull origin main && git checkout -b feat/add-command

STEP 4: Create src/app.ts with the app setup and add subcommand handler.
Use file_write to create ${PROJECT_DIR}/src/app.ts. Include:
- All imports from the tech reference "File: src/app.ts" section (App from @slack/bolt, eq/and/asc/gt/sql from drizzle-orm, db from ./db/index.js, tasks from ./db/schema.js)
- App config exactly as shown in tech reference (SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, socketMode: true, SLACK_APP_TOKEN)
- app.command('/bottleneck', handler) with the subcommand parsing pattern from the tech reference
- 'add' case in the switch: validate args not empty, get max position for user, insert task, ephemeral response
- 'default' case: unknown command ephemeral error
- export default app

STEP 5: Create src/index.ts.
Use file_write to create ${PROJECT_DIR}/src/index.ts. Copy from tech reference "File: src/index.ts" section.

STEP 6: Compile check.
bash: cd ${PROJECT_DIR} && npx tsc --noEmit
Fix errors if any (up to 3 attempts using file_edit).

STEP 7: Commit, push, create PR.
bash: cd ${PROJECT_DIR} && git add -A && git commit -m "feat: add /bottleneck add command and app setup"
bash: cd ${PROJECT_DIR} && git push -u origin feat/add-command
bash: gh pr create --title "Story: /bottleneck add command" --body "Closes #<issue-number>" --base main

STEP 8: Comment on issue and add label.
bash: gh issue comment <issue-number> --body "## Dev: Implementation Complete

Implemented /bottleneck add subcommand in src/app.ts:
- Parses subcommand from command.text
- Validates non-empty task text
- Inserts task with position = max + 1
- Ephemeral response with confirmation
- Created src/index.ts entry point

Compile status: PASS (or FAIL with details)"
bash: gh issue edit <issue-number> --add-label dev

STEP 9: Merge and return to main.
bash: gh pr merge --squash --delete-branch
bash: cd ${PROJECT_DIR} && git checkout main && git pull

You are DONE when the PR is merged and issue has the "dev" label.`


const DEV_LIST_TASK = `You will add the /bottleneck list subcommand to the existing app.

STEP 1: Read the tech reference and list story issue.
bash: cat ${TECH_REF_FILE}
bash: cat ${ISSUES_FILE}
Find the issue with title containing "list command". Note the number.
bash: gh issue view <that-number>

STEP 2: Read the current src/app.ts to see what's already there.
Use file_read to read ${PROJECT_DIR}/src/app.ts.

STEP 3: Create a branch.
bash: cd ${PROJECT_DIR} && git checkout main && git pull origin main && git checkout -b feat/list-command

STEP 4: Add the 'list' case to the switch statement in src/app.ts.
Use file_edit to add the case. The list handler should:
- If args is empty or only whitespace: list the calling user's tasks (command.user_id)
- If args matches /<@([A-Z0-9]+)(?:\\|[^>]*)?>/: extract the user ID and list their tasks
- Query: db.select().from(tasks).where(eq(tasks.user_id, userId)).orderBy(asc(tasks.position))
- Format as numbered list: taskList.map((t, i) => \`\${i + 1}. \${t.text}\`).join('\\n')
- Own empty queue: respond 'Your queue is empty.'
- Other user empty queue: respond '<@userId> has no tasks.'
- All responses use respond({ text, response_type: 'ephemeral' })

STEP 5: Compile, commit, push, PR, comment, label, merge.
bash: cd ${PROJECT_DIR} && npx tsc --noEmit
(Fix errors if any, up to 3 attempts)
bash: cd ${PROJECT_DIR} && git add -A && git commit -m "feat: add /bottleneck list command"
bash: cd ${PROJECT_DIR} && git push -u origin feat/list-command
bash: gh pr create --title "Story: /bottleneck list command" --body "Closes #<issue-number>" --base main
bash: gh issue comment <issue-number> --body "## Dev: Implementation Complete

Added list subcommand to src/app.ts:
- Lists own tasks ordered by position
- Supports @user mention to view other queues
- Handles empty queues for both self and other users
- All responses ephemeral

Compile status: PASS (or FAIL with details)"
bash: gh issue edit <issue-number> --add-label dev
bash: gh pr merge --squash --delete-branch
bash: cd ${PROJECT_DIR} && git checkout main && git pull

You are DONE when the PR is merged and issue has the "dev" label.`


const DEV_DONE_TASK = `You will add the /bottleneck done subcommand to the existing app.

STEP 1: Read the tech reference and done story issue.
bash: cat ${TECH_REF_FILE}
bash: cat ${ISSUES_FILE}
Find the issue with title containing "done command". Note the number.
bash: gh issue view <that-number>

STEP 2: Read the current src/app.ts.
Use file_read to read ${PROJECT_DIR}/src/app.ts.

STEP 3: Create a branch.
bash: cd ${PROJECT_DIR} && git checkout main && git pull origin main && git checkout -b feat/done-command

STEP 4: Add the 'done' case to the switch statement in src/app.ts.
Use file_edit to add the case. The done handler should:
- Parse position from args: const position = parseInt(args, 10)
- If isNaN(position) or position < 1: respond 'Please provide a task number. Usage: /bottleneck done <number>'
- Find the task: db.select().from(tasks).where(and(eq(tasks.user_id, command.user_id), eq(tasks.position, position)))
- If not found (empty result): respond 'No task at position N'
- Delete: db.delete(tasks).where(and(eq(tasks.user_id, command.user_id), eq(tasks.position, position)))
- Renumber: db.update(tasks).set({ position: sql\`position - 1\` }).where(and(eq(tasks.user_id, command.user_id), gt(tasks.position, position)))
- Respond: 'Completed: <task text>'
- All responses use respond({ text, response_type: 'ephemeral' })

STEP 5: Compile, commit, push, PR, comment, label, merge.
bash: cd ${PROJECT_DIR} && npx tsc --noEmit
(Fix errors if any, up to 3 attempts)
bash: cd ${PROJECT_DIR} && git add -A && git commit -m "feat: add /bottleneck done command"
bash: cd ${PROJECT_DIR} && git push -u origin feat/done-command
bash: gh pr create --title "Story: /bottleneck done command" --body "Closes #<issue-number>" --base main
bash: gh issue comment <issue-number> --body "## Dev: Implementation Complete

Added done subcommand to src/app.ts:
- Parses position number from args
- Validates input (NaN, < 1, not found)
- Deletes task and renumbers remaining tasks
- All responses ephemeral

Compile status: PASS (or FAIL with details)"
bash: gh issue edit <issue-number> --add-label dev
bash: gh pr merge --squash --delete-branch
bash: cd ${PROJECT_DIR} && git checkout main && git pull

You are DONE when the PR is merged and issue has the "dev" label.`


const QA_TASK = `You will write tests for the Bottleneck bot and report results on GitHub issues.

STEP 1: Read the story issues to get acceptance criteria.
bash: cat ${ISSUES_FILE}
For each issue number in the JSON:
bash: gh issue view <number>
Write down the acceptance criteria from each issue — these are your test plan.

STEP 2: Read the actual source files to understand what's exported.
Use file_read to read each of these files:
- ${PROJECT_DIR}/src/db/schema.ts
- ${PROJECT_DIR}/src/db/index.ts
- ${PROJECT_DIR}/src/app.ts
- ${PROJECT_DIR}/src/index.ts

Note the ACTUAL export names and import paths. Do NOT guess — use what you read.

STEP 3: Add vitest to devDependencies.
First read the current package.json:
bash: cat ${PROJECT_DIR}/package.json
Use file_read then file_write to add "vitest" to devDependencies WITHOUT removing any existing entries.
bash: cd ${PROJECT_DIR} && npm install

STEP 4: Write DB layer tests.
Use file_write to create ${PROJECT_DIR}/tests/db.test.ts.
Import db and tasks from the ACTUAL paths you found in step 2.
Write tests that cover the DB-related acceptance criteria:
- Insert a task with db.insert(tasks).values({...}) and verify it exists with db.select()
- Insert multiple tasks for the same user and verify positions
- Delete a task and verify it's removed
- Test with a fresh in-memory database if possible, or use a test-specific file path

STEP 5: Run the tests.
bash: cd ${PROJECT_DIR} && npx vitest run 2>&1

Capture the full output — you'll need it for the issue comments.

STEP 6: Report results on each story issue.
For each story issue, comment with which ACs pass and which fail.

For the DB story:
bash: gh issue comment <db-issue-number> --body "## QA: Test Results

- [x] or [ ] AC description — PASS or FAIL: error message
(one line per AC from the issue)

Test file: tests/db.test.ts
Full output: (paste relevant test output)"

For command stories (add, list, done):
bash: gh issue comment <number> --body "## QA: Test Results

Note: Command handler testing requires Slack API mocking which is out of scope.
DB operations underlying these commands are covered in tests/db.test.ts.

- [x] or [ ] AC description — covered by DB tests or not testable without Slack"

STEP 7: Add qa label to each story issue.
For each issue number:
bash: gh issue edit <number> --add-label qa

STEP 8: Verify.
bash: gh issue list --label qa --json number,title

You are DONE when all story issues have the "qa" label.`


const DEVOPS_TASK = `You will create deployment configuration files.

STEP 1: Read the current source to understand the app.
Use file_read to read:
- ${PROJECT_DIR}/src/app.ts
- ${PROJECT_DIR}/src/index.ts
- ${PROJECT_DIR}/package.json

STEP 2: Read the deployment story issue.
bash: cat ${ISSUES_FILE}
Find the issue with title containing "Deployment". Note the number.
bash: gh issue view <that-number>

STEP 3: Create a branch.
bash: cd ${PROJECT_DIR} && git checkout main && git pull origin main && git checkout -b feat/deployment

STEP 4: Create the Dockerfile.
Use file_write to create ${PROJECT_DIR}/Dockerfile with this exact content:

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
RUN mkdir -p /data
ENV DATABASE_PATH=/data/bottleneck.db
EXPOSE 3000
CMD ["node", "dist/index.js"]

STEP 5: Create .env.example.
Use file_write to create ${PROJECT_DIR}/.env.example with this exact content:

# Slack Bot Token (starts with xoxb-)
# Found at: Slack App > OAuth & Permissions > Bot User OAuth Token
SLACK_BOT_TOKEN=xoxb-your-token

# Slack Signing Secret
# Found at: Slack App > Basic Information > App Credentials > Signing Secret
SLACK_SIGNING_SECRET=your-signing-secret

# Slack App-Level Token (starts with xapp-)
# Found at: Slack App > Basic Information > App-Level Tokens
# Requires connections:write scope
SLACK_APP_TOKEN=xapp-your-token

# SQLite database file path
DATABASE_PATH=./data/bottleneck.db

# Port (optional, default 3000)
PORT=3000

STEP 6: Create DEPLOY.md.
Use file_write to create ${PROJECT_DIR}/DEPLOY.md with detailed sections:

# Deploying Bottleneck

## Prerequisites
- Node.js 20+
- A Slack workspace where you have admin access
- Railway account (for production deployment)

## 1. Create the Slack App
1. Go to https://api.slack.com/apps and click "Create New App" > "From scratch"
2. Name it "Bottleneck", select your workspace
3. Go to "Socket Mode" in the sidebar, enable it, create an app-level token with connections:write scope. Copy the token (starts with xapp-).
4. Go to "Slash Commands", click "Create New Command":
   - Command: /bottleneck
   - Description: Manage your todo queue
   - Usage hint: add <task> | list [@user] | done <number>
5. Go to "OAuth & Permissions", add bot scopes: commands, chat:write
6. Click "Install to Workspace", authorize
7. Copy the "Bot User OAuth Token" (starts with xoxb-)
8. Go to "Basic Information", copy the "Signing Secret"

## 2. Local Development
\`\`\`bash
git clone <repo-url>
cd bottleneck
npm install
cp .env.example .env
# Fill in SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN
npm start
\`\`\`

## 3. Railway Deployment
1. Go to https://railway.app, create a new project from GitHub repo
2. Add a persistent volume: Settings > Volumes > Mount at /data
3. Set environment variables (copy from .env.example, fill in real values)
4. Deploy — Railway will build from Dockerfile automatically

## Troubleshooting
- "Invalid signing secret": Double-check SLACK_SIGNING_SECRET matches your app's Basic Information page
- "Socket mode disabled": Make sure Socket Mode is enabled in your Slack app settings
- Database errors: Ensure DATABASE_PATH directory exists and is writable

STEP 7: Test Dockerfile build.
bash: cd ${PROJECT_DIR} && docker build -t bottleneck . 2>&1 | tail -10

STEP 8: Commit, push, create PR.
bash: cd ${PROJECT_DIR} && git add Dockerfile .env.example DEPLOY.md
bash: cd ${PROJECT_DIR} && git commit -m "feat: add deployment configuration"
bash: cd ${PROJECT_DIR} && git push -u origin feat/deployment
bash: gh pr create --title "Story: Deployment configuration" --body "Closes #<issue-number>" --base main

STEP 9: Comment on issue and add label.
bash: gh issue comment <issue-number> --body "## DevOps: Deployment Config Complete

Created:
- Dockerfile — multi-stage build with node:20-alpine, /data volume
- .env.example — all env vars with descriptions
- DEPLOY.md — Slack setup, local dev, Railway deployment instructions

Docker build: PASS (or FAIL with details)"
bash: gh issue edit <issue-number> --add-label devops

STEP 10: Merge and return to main.
bash: gh pr merge --squash --delete-branch
bash: cd ${PROJECT_DIR} && git checkout main && git pull

You are DONE when the PR is merged and the issue has the "devops" label.`


// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------

export const tasks = [
  {
    title: 'Write spec and create story issues',
    description: PM_TASK,
    assignee: 'pm',
  },
  {
    title: 'Research APIs and write tech reference',
    description: SPIKE_TASK,
    assignee: 'spike',
    dependsOn: ['Write spec and create story issues'],
  },
  {
    title: 'Implement DB schema and connection',
    description: DEV_DB_TASK,
    assignee: 'dev',
    dependsOn: ['Research APIs and write tech reference'],
  },
  {
    title: 'Implement /bottleneck add command',
    description: DEV_ADD_TASK,
    assignee: 'dev',
    dependsOn: ['Implement DB schema and connection'],
  },
  {
    title: 'Implement /bottleneck list command',
    description: DEV_LIST_TASK,
    assignee: 'dev',
    dependsOn: ['Implement /bottleneck add command'],
  },
  {
    title: 'Implement /bottleneck done command',
    description: DEV_DONE_TASK,
    assignee: 'dev',
    dependsOn: ['Implement /bottleneck list command'],
  },
  {
    title: 'Write and run tests',
    description: QA_TASK,
    assignee: 'qa',
    dependsOn: ['Implement /bottleneck done command'],
  },
  {
    title: 'Create deployment config',
    description: DEVOPS_TASK,
    assignee: 'devops',
    dependsOn: ['Implement /bottleneck done command'],
  },
]

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

const taskTimes = new Map<string, number>()

export function handleProgress(event: OrchestratorEvent): void {
  const ts = new Date().toISOString().slice(11, 23)

  switch (event.type) {
    case 'task_start': {
      taskTimes.set(event.task ?? '', Date.now())
      const task = event.data as Task | undefined
      console.log(`[${ts}] TASK START   ↓ "${task?.title ?? event.task}" (${task?.assignee ?? 'unassigned'})`)
      break
    }
    case 'task_complete': {
      const elapsed = Date.now() - (taskTimes.get(event.task ?? '') ?? Date.now())
      const task = event.data as Task | undefined
      console.log(`[${ts}] TASK DONE    ↑ "${task?.title ?? event.task}" (${(elapsed / 1000).toFixed(1)}s)`)
      break
    }
    case 'agent_start':
      console.log(`[${ts}] AGENT START  → ${event.agent}`)
      break
    case 'agent_complete':
      console.log(`[${ts}] AGENT DONE   ← ${event.agent}`)
      break
    case 'error': {
      const task = event.data as Task | undefined
      console.error(`[${ts}] ERROR        ✗ ${event.agent ?? ''} task="${task?.title ?? event.task}"`)
      if (event.data instanceof Error) {
        console.error(`               ${event.data.message}`)
      }
      break
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createOrchestrator(maxConcurrency = 2) {
  return new OpenMultiAgent({
    defaultModel: LLM.model,
    maxConcurrency,
    onProgress: handleProgress,
  })
}

export function printResults(result: { success: boolean; totalTokenUsage: { input_tokens: number; output_tokens: number }; agentResults: Map<string, { success: boolean; output: string; toolCalls: { toolName: string }[] }> }) {
  console.log('\n' + '='.repeat(60))
  console.log('Done.\n')
  console.log(`Success: ${result.success}`)
  console.log(`Tokens — input: ${result.totalTokenUsage.input_tokens}, output: ${result.totalTokenUsage.output_tokens}`)

  console.log('\nPer-agent summary:')
  for (const [name, r] of result.agentResults) {
    const icon = r.success ? 'OK  ' : 'FAIL'
    const tools = [...new Set(r.toolCalls.map(c => c.toolName))]
    console.log(`  [${icon}] ${name.padEnd(8)} tools: ${tools.join(', ') || '(none)'}`)
  }
}
