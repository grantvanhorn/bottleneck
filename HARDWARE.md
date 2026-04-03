# Hardware & Model Configuration

## Development Machine

| Spec | Value |
|------|-------|
| **Model** | MacBook Pro (Mac15,6) |
| **Chip** | Apple M3 Pro |
| **CPU Cores** | 12 (6 Performance + 6 Efficiency) |
| **GPU Cores** | 18 (Metal 4) |
| **RAM** | 36 GB unified memory |
| **Display** | 14" Liquid Retina XDR (3024x1964) |

## Ollama Model: qwen3:8b (active)

| Param | Value |
|-------|-------|
| **Size on disk** | 5.2 GB |
| **Parameters** | 8 billion |
| **Quantization** | Q4_K_M (default) |
| **Tool calling** | Native support (verified) |
| **Reasoning** | Built-in chain-of-thought via `reasoning` field |

> **Note:** qwen2.5-coder (7b and 14b) was tested first but does not support native tool calling via Ollama — it outputs tool-call JSON as plain text. qwen3 is the correct choice for agentic workflows.

### Recommended Ollama Parameters for This Hardware

With 36GB unified memory and an M3 Pro, we have plenty of headroom for a 7B model (~4.7GB). Key tuning:

```
OLLAMA_NUM_GPU=18          # Use all 18 GPU cores (default: auto-detect, should already use all)
OLLAMA_FLASH_ATTENTION=1   # Enabled by brew default — faster attention on Apple Silicon
OLLAMA_KV_CACHE_TYPE=q8_0  # Enabled by brew default — quantized KV cache saves memory
```

### Agent-Level Parameters (set in build.ts)

| Parameter | PM | Dev | QA | DevOps | Rationale |
|-----------|-----|-----|-----|--------|-----------|
| **temperature** | 0.3 | 0.1 | 0.2 | 0.2 | Dev needs determinism; PM needs slight creativity |
| **maxTurns** | 5 | 15 | 8 | 5 | Dev does the most work; PM/DevOps are focused tasks |

### Context Window

- qwen2.5-coder:7b default context: **32,768 tokens**
- For longer specs/code, can extend with `num_ctx` in the Ollama request (up to 128k supported by the model architecture, but quality degrades and memory usage increases)
- 32k should be sufficient for MVP — the spec + implementation fits well within this

### Performance Expectations

- **Tokens/sec:** ~40-60 tok/s on M3 Pro for 7B Q4 (generation)
- **Full pipeline estimate:** 5-15 minutes depending on output length
- **Memory usage:** ~6-8 GB during inference (well within 36GB)

### Scaling Up Later

If output quality isn't sufficient with 7B:
- `qwen2.5-coder:14b` — better quality, ~9GB, still fits easily in 36GB
- `qwen2.5-coder:32b` — near-frontier quality, ~20GB, tight but doable on 36GB
- Switch back to Claude API if/when an API key is available (just change the `LLM` config block in `agents/build.ts`)
