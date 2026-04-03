/**
 * Shared configuration for all agent runners.
 *
 * LLM settings, agent definitions, progress tracking, and task descriptions
 * live here so individual runner scripts stay thin and consistent.
 */

import { OpenMultiAgent } from 'open-multi-agent'
import type { AgentConfig, OrchestratorEvent, Task } from 'open-multi-agent'

// ---------------------------------------------------------------------------
// Project paths
// ---------------------------------------------------------------------------

export const PROJECT_DIR = process.cwd()
export const SPEC_FILE = `${PROJECT_DIR}/docs/spec.md`

// ---------------------------------------------------------------------------
// LLM config — swap these to use a different provider
// ---------------------------------------------------------------------------

export const LLM = {
  model: 'qwen3:8b',
  provider: 'openai' as const,
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
}

// ---------------------------------------------------------------------------
// Agent definitions
// ---------------------------------------------------------------------------

export const pm: AgentConfig = {
  name: 'pm',
  ...LLM,
  systemPrompt: `You are a product manager for a Slack bot called Bottleneck.
Your job is to write a clear, concise technical spec in markdown.

The spec must include:
- Overview (2-3 sentences)
- User stories with acceptance criteria
- Data model (SQLite tables, columns, types)
- Slash command signatures with example usage
- Error cases and edge cases
- Non-functional requirements (response time, ephemeral messages, etc.)

Write the spec to ${SPEC_FILE}. Be precise — developers will implement directly from this.`,
  tools: ['file_write', 'file_read'],
  maxTurns: 5,
  temperature: 0.3,
}

export const dev: AgentConfig = {
  name: 'dev',
  ...LLM,
  systemPrompt: `You are a senior TypeScript developer building a Slack bot called Bottleneck.

Read the PM's spec at ${SPEC_FILE}, then implement the bot in ${PROJECT_DIR}/src/.

Tech stack (do not deviate):
- @slack/bolt for Slack integration (use Socket Mode for local dev)
- better-sqlite3 for database
- drizzle-orm + drizzle-orm/better-sqlite3 for schema and queries

File structure to create:
- src/app.ts        — Bolt app setup and slash command handlers
- src/db/schema.ts  — Drizzle schema definition
- src/db/index.ts   — Database connection and initialization
- src/index.ts      — Entry point (starts the app)

Also update ${PROJECT_DIR}/package.json to add the runtime dependencies:
@slack/bolt, better-sqlite3, drizzle-orm

Write clean, production-quality TypeScript. No placeholder code.`,
  tools: ['bash', 'file_read', 'file_write', 'file_edit'],
  maxTurns: 15,
  temperature: 0.1,
}

export const qa: AgentConfig = {
  name: 'qa',
  ...LLM,
  systemPrompt: `You are a QA engineer testing the Bottleneck Slack bot.

Read the spec at ${SPEC_FILE} and the implementation in ${PROJECT_DIR}/src/.

Your tasks:
1. Write unit tests in ${PROJECT_DIR}/tests/ using vitest
2. Test the database layer (schema, CRUD operations)
3. Test the command parsing logic
4. Run the tests with: npx vitest run
5. Report results: what passed, what failed, any bugs found

Focus on testing business logic, not mocking Slack APIs.
Add vitest to devDependencies if not already present.`,
  tools: ['bash', 'file_read', 'file_write', 'grep'],
  maxTurns: 8,
  temperature: 0.2,
}

export const devops: AgentConfig = {
  name: 'devops',
  ...LLM,
  systemPrompt: `You are a DevOps engineer setting up deployment for the Bottleneck Slack bot.

Read the implementation in ${PROJECT_DIR}/src/ and create:

1. ${PROJECT_DIR}/Dockerfile
   - Multi-stage build (build + runtime)
   - Node.js 20 alpine base
   - Copy only production files

2. ${PROJECT_DIR}/.env.example (update if it exists)
   - SLACK_BOT_TOKEN
   - SLACK_SIGNING_SECRET
   - SLACK_APP_TOKEN (for Socket Mode)
   - DATABASE_PATH (default: ./data/bottleneck.db)

3. ${PROJECT_DIR}/DEPLOY.md
   - Railway deployment steps
   - Slack app setup instructions (manifest, scopes, Socket Mode)
   - Environment variable reference
   - How to test locally

Keep it practical and concise.`,
  tools: ['bash', 'file_write', 'file_read'],
  maxTurns: 5,
  temperature: 0.2,
}

// ---------------------------------------------------------------------------
// All agents list
// ---------------------------------------------------------------------------

export const allAgents = [pm, dev, qa, devops]

// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------

export const tasks = [
  {
    title: 'Write product spec',
    description: `Write a technical spec for the Bottleneck Slackbot MVP.

The MVP has these slash commands:
- /todo add <task>       — add a task to your own queue
- /todo list             — view your own numbered, ordered queue
- /todo done <number>    — mark a task complete and remove it
- /todo list @user       — view another user's queue

Requirements:
- Each user has their own ordered todo list
- Tasks have: id, user_id, text, position, created_at, completed_at
- Position determines display order (1 = top of queue)
- /todo done removes the task and re-numbers remaining tasks
- All responses should be ephemeral (only visible to command user)
- @user mentions use Slack user IDs

Write the spec to ${SPEC_FILE}.`,
    assignee: 'pm',
  },
  {
    title: 'Implement the bot',
    description: `Read the spec at ${SPEC_FILE} and implement the Bottleneck Slackbot.
Write all source files to ${PROJECT_DIR}/src/.
Update package.json with runtime dependencies.
Make sure the code compiles and is complete — no TODOs or placeholders.`,
    assignee: 'dev',
    dependsOn: ['Write product spec'],
  },
  {
    title: 'Write and run tests',
    description: `Read the spec and implementation, write tests in ${PROJECT_DIR}/tests/,
and run them. Report results.`,
    assignee: 'qa',
    dependsOn: ['Implement the bot'],
  },
  {
    title: 'Create deployment config',
    description: `Read the implementation and create Dockerfile, updated .env.example,
and DEPLOY.md with Railway deployment and local testing instructions.`,
    assignee: 'devops',
    dependsOn: ['Implement the bot'],
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
