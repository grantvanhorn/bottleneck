# Code Analysis: Second Pipeline Run (qwen3:14b)

**Date:** 2026-04-03
**Model:** qwen3:14b (Q4_K_M, Ollama)
**Pipeline:** PM → Spike → Dev → QA + DevOps (parallel)
**Outcome:** Killed after ~35 min — Dev agent stalled/ran too long
**Tokens:** Unknown (pipeline didn't complete)

**New this run:** Spike agent (API research), GitHub issue integration, `/bottleneck` command prefix, compile requirement for Dev.

---

## Pipeline Timing

| Agent | Status | Time |
|-------|--------|------|
| PM | Completed | 6 min |
| Spike | Completed | 4 min |
| Dev | Killed (stalled) | 30+ min |
| QA | Never started | — |
| DevOps | Never started | — |

## File-by-File Analysis

### `docs/spec.md` — PM Output: **A**

Improved over run 1. Uses `/bottleneck` prefix correctly, clean user stories, proper data model with `AUTOINCREMENT`, good error cases. Added response time NFR of <500ms.

### `docs/tech-reference.md` — Spike Output: **B+**

**This is the key new addition.** The Spike agent successfully:
- Looked up correct package versions (bolt 4.6.0, drizzle 0.45.2, better-sqlite3 12.8.0)
- Documented correct import paths (`sqliteTable` from `drizzle-orm/sqlite-core`)
- Provided working Bolt.js setup with Socket Mode and ephemeral responses
- Showed correct `command.user_id` (not `command.user.id`)

Minor gaps:
- Didn't include `@types/better-sqlite3` version
- Could have included more Drizzle query examples (insert, update, delete)
- No example of parsing subcommands from `command.text`

### `docs/current-issue.txt` — **Working**

Contains `1` — PM created GitHub issue #1 successfully.

### GitHub Issue #1 — **Working**

PM created the issue with spec as body. Spike commented with a summary of research findings. GitHub integration works via `gh` CLI through bash tool.

### `src/db/schema.ts` — **C+ (better but still diverges from spec)**

```typescript
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
```
- Correct Drizzle API! Uses `sqliteTable`, `text`, `integer` properly
- But: schema doesn't match the spec's data model
  - Has `description` instead of `text` (spec column name)
  - Has `status` instead of `position` + `completed_at`
  - Has `updatedAt` (not in spec)
  - Added unnecessary `users` table (spec only has `tasks`)
  - Unused `primaryKey` import
- Still improvising rather than following the spec exactly

### `src/db/index.ts` — **D (wrong API)**

```typescript
import { open } from 'better-sqlite3';
```
- `open` doesn't exist in better-sqlite3 — should be `import Database from 'better-sqlite3'` then `new Database(path)`
- The tech reference showed the correct pattern but Dev didn't follow it
- Uses `DATABASE_PATH` env var (good) with `:memory:` fallback

### `src/app.ts` — **C- (partially correct)**

Improvements over run 1:
- Uses `/bottleneck` command (correct!)
- Has subcommand parsing from `command.text`
- Uses `drizzle` insert correctly

Still wrong:
- `text.split(' ', 2)` — splits into max 2 parts, so `args[0]` only gets one word of the task
- Uses `say()` instead of ephemeral `respond()` — spec requires ephemeral
- Missing `done` and `list @user` subcommands (only has `add` and `list`)
- Variable shadowing: imports `tasks` schema, then `const tasks = await dbClient.select()...`
- No Socket Mode config (`socketMode: true`, `appToken` missing)
- Hardcoded `userId: 1` instead of using `command.user_id`

### `src/index.ts` — **B**

Clean and correct. Starts the app with configurable port.

---

## Summary Scorecard

| File | Grade | vs Run 1 | Spec Compliance | Would Compile |
|------|-------|----------|----------------|---------------|
| `docs/spec.md` | A | +1 | n/a | n/a |
| `docs/tech-reference.md` | B+ | NEW | n/a | n/a |
| `src/db/schema.ts` | C+ | +2 grades | Partial — wrong columns | Likely yes |
| `src/db/index.ts` | D | Same | No — wrong import | No |
| `src/app.ts` | C- | +1 grade | Partial — missing commands | Probably no |
| `src/index.ts` | B | Same | Yes | Yes |

## What Worked

1. **Spike agent is valuable** — tech reference had correct APIs, packages, and patterns
2. **GitHub integration works** — PM created issue, Spike commented on it
3. **`/bottleneck` command adopted** — Dev used the correct prefix and subcommand parsing
4. **Correct Drizzle imports** — `sqliteTable`, `text`, `integer` from right paths

## What Failed

1. **Dev didn't follow the tech reference closely** — used `open` from better-sqlite3 instead of the documented `Database` default import
2. **Dev didn't follow the spec's data model** — invented its own schema instead of matching the SQL in the spec
3. **Dev stalled** — ran 30+ min without completing, likely hit maxTurns or got stuck in a long generation. Never reached the compile check step.
4. **Dev agent package.json changes** — installed different versions than Spike recommended (bolt 6.1.0 vs recommended 4.6.0, drizzle 0.29.1 vs 0.45.2)
5. **Incomplete implementation** — only `add` and `list` subcommands, missing `done` and `list @user`

## Conclusions

**The Spike agent addition was the right call** — it produced correct API references. The problem is the Dev agent doesn't strictly follow the reference docs. It reads them but then improvises.

**Possible fixes for run 3:**
- Include the EXACT schema SQL from the spec in the Dev task description (don't rely on Dev reading the spec correctly)
- Include the EXACT code snippets from the tech reference in the Dev prompt (spoon-feed the patterns)
- Reduce maxTurns on Dev but make each turn more focused
- Consider splitting Dev into smaller tasks (schema first, then db layer, then app)
- Try qwen3:32b for better instruction following
- Add explicit "DO NOT deviate from these patterns" guardrails
