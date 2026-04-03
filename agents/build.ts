/**
 * Run the full build pipeline: PM → Dev → QA + DevOps (parallel)
 *
 * Usage: npm run agents:all
 */

import { allAgents, tasks, createOrchestrator, handleProgress, printResults } from './config.js'

console.log('Bottleneck — Full Build Pipeline')
console.log('PM (spec) → Dev (implement) → QA + DevOps (parallel)')
console.log('='.repeat(60))

const orchestrator = createOrchestrator(2)

const team = orchestrator.createTeam('bottleneck-builders', {
  name: 'bottleneck-builders',
  agents: allAgents,
  sharedMemory: true,
  maxConcurrency: 2,
})

console.log(`Team: ${team.getAgents().map(a => a.name).join(', ')}\n`)

const result = await orchestrator.runTasks(team, tasks)
printResults(result)
