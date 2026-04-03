/**
 * Run only the QA agent to write and run tests.
 * Requires: src/ must exist (run agents:dev first).
 *
 * Usage: npm run agents:qa
 */

import { existsSync } from 'node:fs'
import { qa, SPEC_FILE, PROJECT_DIR, createOrchestrator, printResults } from './config.js'

if (!existsSync(`${PROJECT_DIR}/src`)) {
  console.error(`Error: src/ not found. Run 'npm run agents:dev' first.`)
  process.exit(1)
}

console.log('Bottleneck — QA Agent')
console.log('='.repeat(60))

const orchestrator = createOrchestrator(1)

const team = orchestrator.createTeam('qa-solo', {
  name: 'qa-solo',
  agents: [qa],
  sharedMemory: true,
})

const result = await orchestrator.runTasks(team, [
  {
    title: 'Write and run tests',
    description: `Read the spec at ${SPEC_FILE} and implementation in ${PROJECT_DIR}/src/.
Write tests in ${PROJECT_DIR}/tests/ and run them. Report results.`,
    assignee: 'qa',
  },
])
printResults(result)

const qaResult = result.agentResults.get('qa')
if (qaResult?.success) {
  console.log('\nQA Report:')
  console.log('─'.repeat(60))
  console.log(qaResult.output)
  console.log('─'.repeat(60))
}
