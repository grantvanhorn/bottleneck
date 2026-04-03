/**
 * Run only the PM agent to write/update the product spec.
 *
 * Usage: npm run agents:pm
 */

import { pm, tasks, createOrchestrator, printResults } from './config.js'

console.log('Bottleneck — PM Agent')
console.log('='.repeat(60))

const orchestrator = createOrchestrator(1)

const team = orchestrator.createTeam('pm-solo', {
  name: 'pm-solo',
  agents: [pm],
  sharedMemory: true,
})

const pmTask = tasks.filter(t => t.assignee === 'pm')
const result = await orchestrator.runTasks(team, pmTask)
printResults(result)
