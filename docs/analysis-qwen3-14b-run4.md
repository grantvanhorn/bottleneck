# Code Analysis: Fourth Pipeline Run (qwen3:14b)

**Date:** 2026-04-03
**Model:** qwen3:14b (Q4_K_M, Ollama)
**Pipeline:** PM (stories) → Spike (blueprints) → Dev (schema PR → add PR → list PR → done PR) → QA + DevOps
**Outcome:** All 8 tasks completed. Code quality regressed. GitHub integration failed.
**Tokens:** 133k input / 47k output | **Cost:** $0
**Total time:** ~48 min

**Approach this run:** "Teach process, not answers." Agents given format templates and quality bars instead of pre-filled API calls. Brief in, detailed out. Back to qwen3:14b for speed.

---

## Pipeline Timing

| Agent | Task | Time |
|-------|------|------|
| PM | Spec + issues | 3.5 min |
| Spike | Tech reference | 3.8 min |
| Dev | DB schema | 3.9 min |
| Dev | /bottleneck add | 9 min |
| Dev | /bottleneck list | 10 min |
| Dev | /bottleneck done | 9 min |
| QA | Tests | 25 min |
| DevOps | Deploy config | 19 min |
| **Total** | | **~48 min** |

Speed improvement: **3x faster** than run 3 (48 min vs 150 min).

---

## GitHub Integration: Failed

| Feature | Expected | Actual |
|---------|----------|--------|
| Issues created | 6 new issues | 0 — PM wrote stale issue numbers from closed run 3 issues |
| Issue comments | Every agent comments | 0 comments from any agent |
| Labels added | pm → spike → dev → qa → devops | No labels changed |
| PRs created | 1 per story | 0 PRs |
| Branches | 1 per story, pushed | Created locally, not pushed |
| Commits | Per story | 1 commit total (DevOps only) |

**Root cause:** PM's `gh issue create` commands either failed silently or the PM faked the output. It wrote `issues.json` with numbers 1-6 which are all closed issues from run 3. Every downstream agent read stale issue numbers and their `gh issue comment/edit` commands hit closed issues.

---

## Code Quality: Significant Regression from Run 3

### `docs/spec.md` — **C-**

- Used `todos` table instead of `tasks`
- Has `status` column instead of `position` — fundamental misunderstanding of the queue concept
- `/bottleneck done <task_id>` uses database ID instead of position number
- No mention of ephemeral responses
- Missing edge cases

### `src/db/schema.ts` — **F**

```typescript
export const schema = `CREATE TABLE IF NOT EXISTS users (...); CREATE TABLE IF NOT EXISTS tasks (...);`;
```
- Raw SQL string export, NOT Drizzle ORM at all
- Added `users` table with `email` column (not in brief)
- Uses `order` instead of `position`
- Default status is `'done'` which makes no sense
- Completely ignored the tech stack requirement for drizzle-orm

### `src/db/index.ts` — **F**

```typescript
import { Database } from 'better-sqlite3';
```
- Wrong import: `{ Database }` instead of default `import Database from 'better-sqlite3'`
- Uses raw SQL queries instead of Drizzle ORM
- References non-existent `queue_name` column
- Hardcoded path with `__dirname` instead of `DATABASE_PATH` env var
- Invented a `Queue` type and `getQueues()` function not in any spec

### `src/commands/add.ts` — **D**

- Uses `app.command('/bottleneck add', ...)` — Bolt doesn't support space-separated command registration. Must be one `/bottleneck` command with text parsing.
- Uses `say()` instead of ephemeral `respond()`
- Imports non-existent `initDB` function
- Imports `SlackEventAdapter` which doesn't exist in @slack/bolt

### `src/commands/list.ts` — **D**

- Same `/bottleneck list` registration issue
- Uses `say()` not `respond()`
- `.get()` returns single row, not array — then calls `.map()` on it
- Imports non-existent `initDB`

### Missing Files

- **No `src/commands/done.ts`** — done command never implemented despite task "completing"
- **No `src/app.ts`** — no main app setup file
- **No `src/index.ts`** — no entry point
- `src/cli.ts` exists but references non-existent `listTasks` from db/index with wrong types

### `tests/tasks.test.ts` — **F**

- Imports non-existent functions
- Tests have comments like "Mock database operations" but no actual setup
- Assertions reference data that was never inserted
- Would not run

### `Dockerfile` — **B+**

- node:20-alpine both stages (correct!)
- Adds non-root user (nice security touch)
- Creates /data with proper permissions
- Minor issue: `COPY package.json tsconfig.json .` should use `./`

### `DEPLOY.md` — Not checked (likely thin based on pattern)

### `package.json` — **Partially mangled**

- Scripts preserved this time (improvement!)
- Added better-sqlite3 and vitest
- But removed drizzle-orm, @slack/bolt, and other deps
- Missing open-multi-agent link

---

## Summary Scorecard

| File | Run 4 (14b, process) | Run 3 (32b, explicit) | Trend |
|------|---------------------|----------------------|-------|
| spec.md | C- | A | ⬇️⬇️ |
| db/schema.ts | F | A | ⬇️⬇️⬇️ |
| db/index.ts | F | A | ⬇️⬇️⬇️ |
| app.ts/commands | D | B+ | ⬇️⬇️ |
| Dockerfile | B+ | A | ⬇️ |
| Tests | F | C+ | ⬇️ |
| GitHub ops | F (nothing) | Partial | ⬇️ |
| **Speed** | **48 min** | **150 min** | ⬆️⬆️⬆️ |

---

## What Worked

1. **Speed** — 3x faster than run 3. 14b generates quickly.
2. **Task splitting** — 4 separate Dev tasks completed in sequence without stalling
3. **Branches created** — Dev made local branches per story (feat/add-command, feat/list-command, feat/done-command)
4. **Dockerfile** — consistently good across all runs
5. **Package.json scripts** — not removed this time (prompt improvement worked)

## What Failed

1. **Code quality collapsed** — without explicit API patterns, 14b hallucinated everything. Raw SQL instead of Drizzle, wrong imports, wrong Bolt.js patterns, missing files.
2. **GitHub integration completely broken** — no issues created, no comments, no labels, no PRs. PM faked issue numbers.
3. **Spike output ignored** — Dev didn't follow the tech reference at all
4. **PM wrote a weak spec** — despite detailed format instructions, output was thin with wrong data model
5. **No done command** — Dev task "completed" but never wrote the file

## Conclusions

**The "teach process, not answers" approach failed with qwen3:14b.** The model doesn't have enough capacity to:
1. Follow complex multi-step processes (write code, then git, then gh, then label)
2. Research and apply correct APIs without being shown them
3. Maintain consistency between spec → tech reference → implementation

**Key finding: There's a minimum model quality threshold for autonomous agent work.**
- 14b with explicit patterns (run 2): partial success, stalled
- 32b with explicit patterns (run 3): best code quality, too slow
- 14b with process-only prompts (run 4): fast but terrible quality

**The sweet spot might be:**
- 32b model (for quality)
- Process-oriented prompts (for autonomy)
- WITH key guardrails (specific anti-patterns, required patterns for the hardest parts)
- Or: accept that current open-source models at these sizes need more hand-holding than we'd like
