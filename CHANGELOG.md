# Changelog

## 2026-04-02 17:55 — Model Debugging & Switch to qwen3:8b

**Problem: qwen2.5-coder models don't support native tool calling via Ollama**
- Tested both 7B and 14B — both returned tool-call JSON as plain text in `message.content`
- `message.tool_calls` was missing entirely, `finish_reason` was `"stop"` instead of `"tool_calls"`
- Confirmed via direct curl to Ollama's OpenAI-compatible API — this is a model-level limitation, not a framework bug
- open-multi-agent's parser at `openai-common.ts:184` correctly looks for `message.tool_calls` but the field is never populated

**Solution: Switched to qwen3:8b**
- qwen3 (newer architecture) properly populates `message.tool_calls` array
- Returns correct `finish_reason: "tool_calls"`
- Also includes chain-of-thought reasoning in a `reasoning` field
- ~5.2GB download, similar performance profile to qwen2.5-coder:7b

**Models tested:**
| Model | Tool Calling | Result |
|-------|-------------|--------|
| qwen2.5-coder:7b | Broken (text JSON) | Agents did nothing |
| qwen2.5-coder:14b | Broken (text JSON) | Agents did nothing |
| qwen3:8b | Working (native) | Proper tool_calls array |

**Lesson learned:** Not all Ollama models support the OpenAI-compatible tool-calling protocol. Always test with a curl before assuming tool use works. qwen2.5-coder was trained for code completion, not agentic tool use.

## 2026-04-02 17:00 — Hardware Audit & Model Configuration

**Documented dev machine specs:**
- MacBook Pro M3 Pro: 12 CPU cores, 18 GPU cores, 36GB unified memory
- Created `HARDWARE.md` with full specs, Ollama tuning params, and scaling guidance
- Updated `CLAUDE.md` with hardware/model section and link to HARDWARE.md

**Ollama tuning for this hardware:**
- Flash attention and q8_0 KV cache already enabled by brew default
- 36GB RAM gives plenty of headroom for 7B model (~6-8GB during inference)
- Expected ~40-60 tok/s generation speed
- Full pipeline estimated at 5-15 minutes

**Scaling path documented:**
- 7B (current) → 14B (~9GB) → 32B (~20GB) → Claude API (when key available)

## 2026-04-02 16:50 — Switch to Ollama for Local Development

**Decision: Use Ollama + local models instead of Anthropic API**
- Claude Code uses OAuth through the company's claude.ai Team/Enterprise plan — no raw API key available
- Getting an `ANTHROPIC_API_KEY` would require either a separate API org (needs admin) or a personal console.anthropic.com account
- Decided to use Ollama (free, local) to test the multi-agent pipeline at zero cost
- Model choice: `qwen2.5-coder:7b` — good code quality, ~4GB download, runs on Mac

**What this changes:**
- Agent configs in `agents/build.ts` will switch from `provider: 'anthropic'` to `provider: 'openai'` with `baseURL: 'http://localhost:11434/v1'`
- No API key needed — Ollama runs entirely on-device
- Can always switch back to Claude later if an API key becomes available

**Setup required:**
1. `brew install ollama`
2. `ollama serve` (start the server)
3. `ollama pull qwen2.5-coder:7b` (download the model)
4. `npx tsx agents/build.ts` (run the pipeline)

## 2026-04-02 16:41 — Multi-Agent Runner Setup

**Created project scaffolding:**
- `package.json` — links `open-multi-agent` as local dependency via `file:../open-multi-agent`
- `tsconfig.json` — ES2022 target, Node16 module resolution
- `.env.example` — placeholder for `ANTHROPIC_API_KEY`
- `.gitignore` — excludes node_modules, .env, dist, *.db

**Created `agents/build.ts` — the multi-agent runner:**
- 4 agents: PM, Dev, QA, DevOps (all using `claude-sonnet-4-6`)
- Explicit task pipeline with dependencies (not auto-orchestration)
- Flow: PM writes spec → Dev implements → QA tests + DevOps deploys (parallel)
- Progress tracking with timestamps and per-agent token usage reporting
- Run with: `npx tsx agents/build.ts`

**Agent toolsets:**
| Agent | Tools | Max Turns |
|-------|-------|-----------|
| PM | file_write, file_read | 5 |
| Dev | bash, file_read, file_write, file_edit | 15 |
| QA | bash, file_read, file_write, grep | 8 |
| DevOps | bash, file_write, file_read | 5 |

## 2026-04-02 16:30 — Project Kickoff

**Decisions made:**
- Project name: **Bottleneck**
- Stack: TypeScript, Bolt.js, SQLite (better-sqlite3), Drizzle ORM, Railway hosting
- UX: Slash commands (`/todo`)
- Build approach: Using [open-multi-agent](../open-multi-agent) framework with PM/Dev/QA/DevOps agent team to build the project

**Feature roadmap (4 phases):**
1. **MVP** — `add`, `list`, `done`, view other users' queues
2. **Collaboration** — add to others' queues (with approval), reorder tasks
3. **Polish** — Block Kit formatting, stats, archive
4. **Nice to have** — DM notifications, daily digest, snooze
