/**
 * Run only the DevOps agent to create deployment config.
 * Requires: src/ must exist (run agents:dev first).
 *
 * Usage: npm run agents:devops
 */

import { existsSync } from 'node:fs'
import { devops, PROJECT_DIR, createOrchestrator, printResults } from './config.js'

if (!existsSync(`${PROJECT_DIR}/src`)) {
  console.error(`Error: src/ not found. Run 'npm run agents:dev' first.`)
  process.exit(1)
}

console.log('Bottleneck — DevOps Agent')
console.log('='.repeat(60))

const orchestrator = createOrchestrator(1)

const team = orchestrator.createTeam('devops-solo', {
  name: 'devops-solo',
  agents: [devops],
  sharedMemory: true,
})

const result = await orchestrator.runTasks(team, [
  {
    title: 'Create deployment config',
    description: `Read the implementation in ${PROJECT_DIR}/src/ and create Dockerfile,
updated .env.example, and DEPLOY.md with Railway deployment and local testing instructions.`,
    assignee: 'devops',
  },
])
printResults(result)
