# Bottleneck

A Slackbot that manages per-user todo queues. Teammates can view each other's queues, request to add tasks to others' lists, and manage/reorder their own priorities.

## Tech Stack
- **Runtime:** TypeScript / Node.js
- **Slack SDK:** Bolt.js (`@slack/bolt`)
- **Database:** SQLite via `better-sqlite3`
- **ORM:** Drizzle ORM
- **Hosting:** Railway (free tier)
- **Slash command:** `/bottleneck <subcommand> <args>`
- **Build tooling:** open-multi-agent (PM/Spike/Dev/QA/DevOps agent workflow)
- **LLM (local):** Ollama + qwen3:14b (see [HARDWARE.md](HARDWARE.md) for config and tuning)

## Agent Pipeline

PM (spec) → Spike (API research) → Dev (implement) → QA + DevOps (parallel)

All agents comment on a GitHub Issue for visibility. See [USING_AGENTS.md](USING_AGENTS.md) for full docs.

## Hardware & Model Config

See [HARDWARE.md](HARDWARE.md) for dev machine specs, Ollama parameters, and model scaling options.
- Machine: MacBook Pro M3 Pro, 36GB RAM, 18 GPU cores
- Model: qwen3:14b (native tool calling)
- To swap models, edit the `LLM` config block in `agents/config.ts`

## Changelog Rule

**Always update `CHANGELOG.md` when making changes to this project.** Every session should document:
- Decisions made and the reasoning behind them
- What was built, changed, or removed
- Stack/tooling choices and why
- Problems encountered and how they were resolved
- Open questions or deferred decisions

Entries should be in reverse chronological order (newest first) with a date header.
