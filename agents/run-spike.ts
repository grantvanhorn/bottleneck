/**
 * Run only the Spike agent to research APIs and write a tech reference.
 * Requires: docs/spec.md must exist (run agents:pm first).
 *
 * Usage: npm run agents:spike
 */

import { existsSync } from 'node:fs'
import { spike, SPEC_FILE, createOrchestrator, printResults } from './config.js'

if (!existsSync(SPEC_FILE)) {
  console.error(`Error: ${SPEC_FILE} not found. Run 'npm run agents:pm' first.`)
  process.exit(1)
}

console.log('Bottleneck — Spike Agent (API Research)')
console.log('='.repeat(60))

const orchestrator = createOrchestrator(1)

const team = orchestrator.createTeam('spike-solo', {
  name: 'spike-solo',
  agents: [spike],
  sharedMemory: true,
})

const result = await orchestrator.runTasks(team, [
  {
    title: 'Research APIs and write tech reference',
    description: `Read the spec at ${SPEC_FILE}. Research the correct APIs for @slack/bolt, better-sqlite3, and drizzle-orm.
Write a technical reference document to ${process.cwd()}/docs/tech-reference.md with correct package versions, import paths, and copy-paste-ready code snippets.`,
    assignee: 'spike',
  },
])
printResults(result)
