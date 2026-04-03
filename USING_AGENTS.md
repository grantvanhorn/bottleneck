# Using the Agent System

## Quick Reference

```bash
npm run agents:status   # Check Ollama + model are ready
npm run agents:all      # Full pipeline: PM → Dev → QA + DevOps
npm run agents:pm       # PM only — write/update the spec
npm run agents:dev      # Dev only — implement from spec
npm run agents:qa       # QA only — write and run tests
npm run agents:devops   # DevOps only — create deploy config
```

## How It Works

### No persistent state between runs

The agent framework (open-multi-agent) does **not** persist task state between runs. Every time you run a command, it starts fresh. There is no database of "completed tasks" or "what was done last time."

Instead, agents know what's been done by **reading the filesystem**. If `docs/spec.md` exists, the Dev agent reads it. If `src/` has code, the QA agent tests it. The files *are* the state.

This means:
- Running `agents:pm` twice will overwrite the spec
- Running `agents:dev` twice will overwrite the implementation
- You can re-run any agent at any time to redo its work

### Within a single run

During a pipeline run (`agents:all`), the framework tracks task status in memory:

```
pending → in_progress → completed (or failed)
              ↓
           blocked (waiting on dependencies)
```

Tasks with `dependsOn` won't start until their dependencies complete. QA and DevOps both depend on Dev, so they run in parallel after Dev finishes.

### Shared memory within a run

When `sharedMemory: true` is set on a team, agents can read what earlier agents wrote to the shared memory store. This is ephemeral — it only lasts for the duration of that run.

## How to Add New Tasks

### Option 1: Edit the task list in config.ts

The tasks are defined in `agents/config.ts` in the `tasks` array. Each task has:

```typescript
{
  title: 'Human-readable name',           // used for dependency references
  description: 'Detailed instructions',    // the actual prompt for the agent
  assignee: 'pm',                          // which agent runs this task
  dependsOn: ['Other task title'],         // optional: wait for these first
}
```

To add a new task to the pipeline, add an entry to the `tasks` array:

```typescript
{
  title: 'Write API documentation',
  description: `Read the implementation in ${PROJECT_DIR}/src/ and write
API documentation in ${PROJECT_DIR}/docs/api.md covering all slash commands,
their parameters, and example responses.`,
  assignee: 'pm',
  dependsOn: ['Implement the bot'],
}
```

### Option 2: Create a new runner script

For one-off or specialized tasks, create a new file in `agents/`:

```typescript
// agents/run-custom.ts
import { dev, createOrchestrator, printResults } from './config.js'

const orchestrator = createOrchestrator(1)
const team = orchestrator.createTeam('custom', {
  name: 'custom',
  agents: [dev],
  sharedMemory: true,
})

const result = await orchestrator.runTasks(team, [
  {
    title: 'Add reorder command',
    description: `Read the existing implementation in src/ and add a new
slash command: /todo move <from> <to> that reorders tasks.
Update the database queries and command handler.`,
    assignee: 'dev',
  },
])
printResults(result)
```

Then add a script to `package.json`:
```json
"agents:custom": "npx tsx agents/run-custom.ts"
```

### Option 3: Use auto-orchestration (let the coordinator decide)

Instead of `runTasks()` (explicit pipeline), use `runTeam()` with a goal string. The framework creates a temporary "coordinator" agent that breaks the goal into tasks automatically:

```typescript
const result = await orchestrator.runTeam(team, 
  'Add a /todo move command that lets users reorder their tasks'
)
```

This is more flexible but less predictable — the coordinator decides which agents do what.

## Changing the LLM

All agents share the `LLM` config block at the top of `agents/config.ts`:

```typescript
export const LLM = {
  model: 'qwen3:8b',
  provider: 'openai' as const,
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
}
```

**To use a different Ollama model:**
```typescript
model: 'qwen3:14b',  // just change the model name
```

**To switch to Claude API:**
```typescript
export const LLM = {
  model: 'claude-sonnet-4-6',
  provider: 'anthropic' as const,
}
// Remove baseURL and apiKey — uses ANTHROPIC_API_KEY env var
```

## Agent Capabilities

Each agent has specific tools it can use:

| Agent | Tools | What it can do |
|-------|-------|----------------|
| **PM** | file_write, file_read | Read existing files, write specs and docs |
| **Dev** | bash, file_read, file_write, file_edit | Full access: run commands, read/write/edit code |
| **QA** | bash, file_read, file_write, grep | Run tests, search code, write test files |
| **DevOps** | bash, file_write, file_read | Run commands, write config files |

### Adding a new agent

Define it in `agents/config.ts`:

```typescript
export const designer: AgentConfig = {
  name: 'designer',
  ...LLM,
  systemPrompt: `You are a UI/UX designer for Slack apps...`,
  tools: ['file_write', 'file_read'],
  maxTurns: 5,
  temperature: 0.3,
}
```

Add it to `allAgents` and create a runner script if needed.

## Tips

- **Re-run individual agents** when you're iterating. Don't re-run the whole pipeline just to redo tests.
- **Check `agents:status`** before running if you haven't used Ollama in a while — it may have stopped.
- **Read the agent output** — the progress log shows which tools each agent used and how long they took. `tools: (none)` means the model didn't make any tool calls (something went wrong).
- **Longer tasks need more `maxTurns`** — if an agent seems to stop mid-work, increase its `maxTurns` in config.ts.
- **The Dev agent modifies package.json** — it adds runtime dependencies. After a dev run, do `npm install` to sync.
