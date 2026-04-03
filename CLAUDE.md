# Bottleneck

A Slackbot that manages per-user todo queues. Teammates can view each other's queues, request to add tasks to others' lists, and manage/reorder their own priorities.

## Tech Stack
- **Runtime:** TypeScript / Node.js
- **Slack SDK:** Bolt.js (`@slack/bolt`)
- **Database:** SQLite via `better-sqlite3`
- **ORM:** Drizzle ORM
- **Hosting:** Railway (free tier)
- **Build tooling:** open-multi-agent (PM/Dev/QA/DevOps agent workflow)
- **LLM (local):** Ollama + qwen3:8b (see [HARDWARE.md](HARDWARE.md) for config and tuning)

## Hardware & Model Config

See [HARDWARE.md](HARDWARE.md) for dev machine specs, Ollama parameters, and model scaling options.
- Machine: MacBook Pro M3 Pro, 36GB RAM, 18 GPU cores
- Model: qwen3:8b (5.2GB, Q4_K_M, native tool calling)
- To swap models, edit the `LLM` config block at the top of `agents/build.ts`

## Changelog Rule

**Always update `CHANGELOG.md` when making changes to this project.** Every session should document:
- Decisions made and the reasoning behind them
- What was built, changed, or removed
- Stack/tooling choices and why
- Problems encountered and how they were resolved
- Open questions or deferred decisions

Entries should be in reverse chronological order (newest first) with a date header.
