/**
 * Run only the Dev agent to implement from the existing spec and tech reference.
 * Requires: docs/spec.md and docs/tech-reference.md must exist.
 *
 * Usage: npm run agents:dev
 */

import { existsSync } from 'node:fs'
import { dev, SPEC_FILE, TECH_REF_FILE, createOrchestrator, printResults } from './config.js'

if (!existsSync(SPEC_FILE)) {
  console.error(`Error: ${SPEC_FILE} not found. Run 'npm run agents:pm' first.`)
  process.exit(1)
}

if (!existsSync(TECH_REF_FILE)) {
  console.error(`Error: ${TECH_REF_FILE} not found. Run 'npm run agents:spike' first.`)
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
    description: `Read the spec at ${SPEC_FILE} AND the tech reference at ${TECH_REF_FILE}.
Implement the Bottleneck Slackbot in ${process.cwd()}/src/.
Use ONLY the APIs documented in the tech reference.
Update package.json with the correct dependency versions.
CRITICAL: Code must compile. Run npx tsc --noEmit and fix any errors.`,
    assignee: 'dev',
  },
])
printResults(result)
