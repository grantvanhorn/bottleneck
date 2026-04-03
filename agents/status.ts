/**
 * Check that Ollama is running and the configured model is available.
 *
 * Usage: npm run agents:status
 */

import { LLM } from './config.js'

async function check() {
  console.log('Bottleneck — Agent Status Check')
  console.log('='.repeat(60))
  console.log(`Configured model: ${LLM.model}`)
  console.log(`Ollama URL: ${LLM.baseURL}`)
  console.log('')

  // Check Ollama is reachable
  try {
    const res = await fetch(`${LLM.baseURL}/models`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { data: { id: string }[] }
    const models = data.data.map((m: { id: string }) => m.id)

    console.log('Ollama: running')
    console.log(`Available models: ${models.join(', ')}`)

    if (models.includes(LLM.model)) {
      console.log(`\n${LLM.model}: ready`)
    } else {
      console.log(`\n${LLM.model}: NOT FOUND`)
      console.log(`Run: ollama pull ${LLM.model}`)
    }
  } catch (e) {
    console.error('Ollama: NOT RUNNING')
    console.error('Run: brew services start ollama')
  }
}

check()
