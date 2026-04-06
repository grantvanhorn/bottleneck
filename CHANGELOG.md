# Changelog

## 2026-04-06 — Run 5 Setup: Hyper-Detailed Tasks + Sushi-Coder Model

**Biggest rewrite of agent prompts yet + new model.**

### Model Switch: Sushi-Coder (Qwen 3.5 9b fine-tuned for coding)
- Source: https://huggingface.co/bigatuna/Qwen3.5-9b-Sushi-Coder-RL-GGUF
- Quantization: Q4_K_M (5.6GB)
- Architecture: Qwen 3.5 (newer than qwen3 used in runs 1-4), fine-tuned with RL for coding tasks
- Tool calling: verified working via Ollama's qwen3.5 renderer/parser
- Imported via custom Modelfile at ~/models/Modelfile.sushi-coder
- Registered in Ollama as `sushi-coder:latest`

### Prompt Architecture Overhaul

Two structural changes:

1. **System prompts reduced to 1 sentence each** (identity only: "You are a PM", "You are a developer")
2. **Task descriptions contain EVERYTHING** — every step, every bash command, every file path, every expected output. Self-contained scripts that agents execute.

### What changed
- PM task: 150+ lines with full spec content and exact `gh issue create` commands with complete issue bodies
- Spike task: 100+ lines with exact tech reference template including all code snippets and DO NOT sections
- Dev tasks (4): Each has step-by-step git workflow — branch, write code (copy from tech reference), compile check, commit, push, create PR, comment on issue, add label, merge
- QA task: Read actual exports first (don't guess), test against real paths, report per-AC on issues
- DevOps task: Exact Dockerfile content, exact .env.example content, exact DEPLOY.md structure

### Why this approach
Runs 1-4 showed that:
- Models skip vague instructions ("see your system prompt", "create an issue")
- Models follow explicit commands ("bash: gh issue create --title '...' --body '...' --label '...'")
- The more detail in the task, the less the model needs to improvise
- This should work even on 14b because the agent is executing a script, not thinking

### Model: qwen3:14b
Same as run 4 for speed. The task descriptions compensate for model size.

## 2026-04-03 16:20 — Fourth Pipeline Run (qwen3:14b) — Fast but Bad

**Full analysis:** [docs/analysis-qwen3-14b-run4.md](docs/analysis-qwen3-14b-run4.md)

**Speed: 48 min (3x faster than run 3). Quality: regressed badly.**

| | Run 3 (32b, explicit) | Run 4 (14b, process) |
|---|---|---|
| Time | 150 min | 48 min |
| Schema | A | F (raw SQL, no Drizzle) |
| Commands | B+ | D (wrong Bolt patterns) |
| GitHub | Partial | Failed completely |
| Compiles | 5 fixes needed | Won't compile |

**What happened:** The "teach process, not answers" approach didn't work with 14b. Without explicit API patterns, the model hallucinated everything — raw SQL instead of Drizzle, wrong import styles, invented functions, missing files. PM didn't create GitHub issues (faked the numbers). No PRs, no comments, no labels.

**Key insight from 4 runs:**
- 14b + explicit patterns = partial (run 2)
- 32b + explicit patterns = best quality (run 3)
- 14b + process-only = fast garbage (run 4)
- There's a minimum model quality threshold for autonomous agent work
- The sweet spot is probably 32b + process prompts + key guardrails for the hardest parts

## 2026-04-03 15:30 — Run 4 Setup: Teach Process, Not Answers

**Fundamental shift in approach.** Previous runs failed because we were doing the agents' thinking for them — embedding exact API calls, code snippets, and column names in prompts. The agents need to learn HOW to work, then figure out the WHAT themselves.

### Philosophy Change
- **Input:** A 2-sentence product brief. That's it.
- **PM** expands it into full stories with ACs, edge cases, error cases — using a format template, not pre-written content
- **Spike** researches APIs itself and writes file-by-file blueprints — we don't tell it what to find
- **Dev** follows Spike's blueprints and PM's ACs — creates a branch and PR per story
- **QA** tests against PM's acceptance criteria checkboxes
- Agents are taught FORMAT and PROCESS, not given answers

### Specific Improvements
- **PM stories now require:** Description (user-focused), AC checkboxes (testable), edge/error cases, technical notes. Quality bar: "a dev who's never seen this project can implement from the issue alone"
- **Spike now writes BY FILE:** each section covers one file (path, imports, exports, patterns, DO NOTs). Not generic API lists.
- **Dev now creates PRs:** one branch per story, `gh pr create` linked to issue, merge after compile check. Full git workflow.
- **All agents have completion checklists:** task isn't done until GitHub comments posted, labels added, PRs created
- **Package.json protection:** all agents told to READ first, ADD deps, NEVER remove existing scripts/entries
- **Dev gets 8 maxTurns per story:** fail fast, report errors, don't spiral

### Model
Back to qwen3:14b. The bet: better prompts > bigger model. 14b is 2-3x faster than 32b.

### Cleanup
- Closed issues #2-#6 from run 3
- Deleted all generated code
- Restored package.json to clean state

### Pipeline Shape
```
PM (brief → stories) → Spike (research → blueprints) → Dev (schema PR) → Dev (add PR) → Dev (list PR) → Dev (done PR) → QA + DevOps (parallel)
```
8 tasks total, 4 separate Dev tasks with individual PRs.

## 2026-04-03 13:45 — Third Pipeline Run (qwen3:32b) — SUCCESS

**Full analysis:** [docs/analysis-qwen3-32b-run3.md](docs/analysis-qwen3-32b-run3.md)

**All 6 tasks completed. All 5 agents used tools. First fully successful run.**

**Timing:** PM 16m → Spike 18m → Dev (schema) 24m → Dev (commands) 45m → QA 31m + DevOps 16m = **~2.5 hrs total**
**Tokens:** 126k input / 40k output | **Cost:** $0

### What's dramatically better vs runs 1-2:
- Schema matches spec EXACTLY (correct columns, no extras)
- Correct imports everywhere (`import Database from 'better-sqlite3'`)
- All 4 subcommands implemented with proper logic
- Ephemeral responses, Socket Mode, DATABASE_PATH env var
- Dockerfile works (node:20-alpine both stages)
- Tests written (DB layer + command parsing)
- 5 GitHub issues created with labels

### Minor fixes still needed (~5 min manual work):
- `app.ts` missing `and` + `sql` imports from drizzle-orm
- `app.ts` wrong env var names (SLACK_TOKEN vs SLACK_BOT_TOKEN)
- `app.ts` wrong import path for db
- `index.ts` named vs default import mismatch
- Delete hallucinated `src/move-agents.ts`
- Restore package.json (Dev agent overwrites our scripts)

### Key learnings:
- **Explicit prompting works** — exact column names and "NOT this, NOT that" anti-patterns eliminated improvisation
- **Split tasks work** — schema-first then commands prevented the stalling we saw in run 2
- **32b model follows instructions** — dramatic quality jump over 8b and 14b
- **Package.json protection needed** — Dev agent keeps overwriting it across all runs

## 2026-04-03 11:45 — Run 3 Setup: Story-per-Issue, Labels, qwen3:32b

**Major architecture changes to agent pipeline:**

### Story-per-Issue
- Switched from one mega-issue to 5 separate GitHub issues (one per user story)
- Stories: DB schema, `/bottleneck add`, `/bottleneck list`, `/bottleneck done`, Deployment
- Closed old issue #1 (superseded)

### GitHub Labels
Created 6 labels for tracking agent progress:
- `story`, `pm`, `spike`, `dev`, `qa`, `devops`
- Each agent adds its label to issues it works on: `gh issue edit <n> --add-label <label>`

### Dev Agent Overhaul
The core problem from runs 1-2: Dev reads the tech reference but improvises instead of following it. Fixes:
- **Explicit code patterns** baked directly into task descriptions (exact import paths, exact column names, exact API calls)
- **Split into 2 focused tasks**: schema+connection first, then all commands — instead of one monolithic "implement everything"
- **Anti-patterns called out explicitly**: "NOT { open }", "NOT say()", "NOT :memory:"
- **maxTurns reduced to 10** per task (focused, not sprawling)

### Model Upgrade: qwen3:32b
- Deleted old models: qwen2.5-coder:7b, qwen2.5-coder:14b, qwen3:8b (freed ~19GB)
- Pulled qwen3:32b (~20GB) — better instruction following, fits in 36GB RAM
- Kept qwen3:14b as fallback
- Expected: ~8-15 tok/s (slower but more accurate)

### Other Changes
- Restored package.json (Dev agent from run 2 had nuked our scripts and open-multi-agent dep)
- PM prompt now includes EXACT `gh issue create` commands to reduce improvisation
- All agents now read issue numbers from `docs/issues.json`

### Pipeline running
Run 3 launched with: PM (spec+issues) → Spike (research) → Dev (schema → commands) → QA + DevOps

## 2026-04-03 11:05 — Second Pipeline Run (qwen3:14b) — Killed

**Full analysis:** [docs/analysis-qwen3-14b-run2.md](docs/analysis-qwen3-14b-run2.md)

**What changed from run 1:**
- Added Spike agent (API research) between PM and Dev
- Switched to qwen3:14b (double params)
- `/bottleneck` command prefix
- GitHub issue integration (PM creates, Spike comments)
- Dev required to compile code before finishing

**Results:** PM and Spike completed well (6 min + 4 min). Dev stalled at 30+ min and was killed. Wrote files but never reached compile check. Code quality improved (correct Drizzle imports, `/bottleneck` prefix) but Dev still diverged from spec data model and tech reference patterns.

**Key insight:** Spike agent works — produced correct API docs. The Dev agent reads the reference but still improvises instead of following it strictly. Need to spoon-feed patterns more directly or split Dev into smaller focused tasks.

**GitHub integration:** Working. Issue #1 created, Spike commented on it.

## 2026-04-03 10:25 — Improved Prompts, Spike Agent, GitHub Integration

**Changes made:**
- Added Spike agent to pipeline: PM → Spike → Dev → QA + DevOps
- Added `gh` CLI instructions to all agent prompts for GitHub Issue tracking
- Changed slash command from `/todo` to `/bottleneck <subcommand> <args>`
- Dev agent now required to run `npx tsc --noEmit` and fix errors before completing
- Increased Dev maxTurns from 15 → 20
- Upgraded model from qwen3:8b → qwen3:14b
- Deleted generated code from run 1 (kept PM spec analysis)
- Created `agents/run-spike.ts` and added `agents:spike` script

## 2026-04-03 — Code Analysis of First Pipeline Run

**Full analysis:** [docs/analysis-qwen3-8b-run1.md](docs/analysis-qwen3-8b-run1.md)
**Commit analyzed:** `d09c201`

**TL;DR:** PM spec is great (A-). Code is structurally correct but won't compile — Dev agent hallucinated Drizzle/Slack APIs, used wrong command patterns, and diverged from the spec's data model. Dockerfile won't run (no Node in runtime stage). Typical 8B model ceiling for framework-specific code.

## 2026-04-02 18:45 — Decision Point: Next Steps

**Where we are:** Pipeline ran successfully, produced real files, but the code has issues typical of a small local model (wrong APIs, incorrect slash command patterns, broken Dockerfile).

**Three paths forward:**

1. **Fix the code manually (Claude Code)** — Have me fix the Drizzle schema, app.ts command handling, Dockerfile, etc. directly. Fastest path to working code. ~15 min.

2. **Re-run with a bigger model** — Try `qwen3:14b` or `qwen3:32b` for better API accuracy. Tests the agent system further but costs more time (~30-45 min) and may still need fixes. Good learning exercise.

3. **Move on to Slack app setup** — Set up the Slack app, Railway account, and deployment infrastructure first. Fix the code after we have the environment ready to test against. Avoids fixing code we can't test yet.

**Considerations:**
- We can't test the bot without a Slack app configured (need tokens)
- Fixing code without being able to run it risks fixing the wrong things
- A bigger model run would further validate the agent workflow but delays progress
- Manual fixes are fastest but skip the agent learning experience

**Decision: TBD**

## 2026-04-02 18:30 — First Full Pipeline Run (qwen3:8b)

**Pipeline completed successfully. All 4 agents used tools and produced real files.**

**Timing & cost:**
- PM: 12 min → Dev: 4 min → QA: 6 min + DevOps: 2 min (parallel) = **~22 min total**
- Token usage: 24k input / 17k output (all local, **$0 cost**)

**What worked well:**
- PM spec is solid — clean user stories, data model, error cases, acceptance criteria
- All 4 agents used tools and produced real files
- File structure matches what was requested: `docs/spec.md`, `src/app.ts`, `src/db/schema.ts`, `src/db/index.ts`, `src/index.ts`, `Dockerfile`, `DEPLOY.md`

**What needs work (expected from an 8B model):**
- `app.ts` — Uses `/add`, `/list`, `/complete`, `/stats` commands instead of the `/todo` subcommand pattern from the spec. Also has Drizzle API errors (wrong imports, `command.user.id` should be `command.user_id`, variable shadowing `tasks`)
- `schema.ts` — Uses non-existent Drizzle API (`defineTable`, `column`). Drizzle uses `sqliteTable` and typed column builders
- `db/index.ts` — Uses in-memory DB instead of file path from env var
- `Dockerfile` — Missing Node.js in the runtime stage (copies to bare alpine)
- `DEPLOY.md` — Barebones but directionally correct

**Assessment:** Typical for a 7-8B local model doing multi-file code generation — gets the structure and intent right but fumbles framework-specific API details. The PM spec output is genuinely good and usable as-is. The code needs manual fixes or a re-run with a larger model.

## 2026-04-02 18:15 — Agent Runner Scripts & CLI Commands

**Split monolithic `build.ts` into modular runner system:**
- `agents/config.ts` — shared LLM config, agent definitions, task list, progress tracking
- `agents/build.ts` — thin wrapper for full pipeline
- `agents/run-pm.ts`, `run-dev.ts`, `run-qa.ts`, `run-devops.ts` — individual agent runners
- `agents/status.ts` — Ollama health check

**Package.json scripts:**
| Command | Description |
|---------|-------------|
| `npm run agents:status` | Check Ollama + model availability |
| `npm run agents:all` | Full pipeline: PM → Dev → QA + DevOps |
| `npm run agents:pm` | PM only |
| `npm run agents:dev` | Dev only (requires spec) |
| `npm run agents:qa` | QA only (requires src/) |
| `npm run agents:devops` | DevOps only (requires src/) |

**Created `USING_AGENTS.md`** — full documentation on how the agent system works, how to add tasks, change models, and add new agents.

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
