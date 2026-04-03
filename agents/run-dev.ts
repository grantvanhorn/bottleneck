/**
 * Run only the Dev agent to implement from the existing spec.
 * Requires: docs/spec.md must exist (run agents:pm first).
 *
 * Usage: npm run agents:dev
 */

import { existsSync } from 'node:fs'
import { dev, SPEC_FILE, createOrchestrator, printResults } from './config.js'

if (!existsSync(SPEC_FILE)) {
  console.error(`Error: ${SPEC_FILE} not found. Run 'npm run agents:pm' first.`)
  process.exit(1)
}

console.log('Bottleneck — Dev Agent')
console.log('='.repeat(60))

const orchestrator = createOrchestrator(1)

const team = orchestrator.createTeam('dev-solo', {
  name: 'dev-solo',
  agents: [dev],
  sharedMemory: true,
})

const result = await orchestrator.runTasks(team, [
  {
    title: 'Implement the bot',
    description: `Read the spec at ${SPEC_FILE} and implement the Bottleneck Slackbot.
Write all source files to ${process.cwd()}/src/.
Update package.json with runtime dependencies.
Make sure the code compiles and is complete — no TODOs or placeholders.`,
    assignee: 'dev',
  },
])
printResults(result)
