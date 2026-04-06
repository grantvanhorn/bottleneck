# Bottleneck Technical Spec

## Overview
Bottleneck is a Slack bot that manages personal todo queues. Users interact via the /bottleneck slash command with subcommands. All responses are ephemeral (only visible to the user who ran the command).

## Slash Command
The bot registers ONE slash command: /bottleneck
Subcommands are parsed from the text argument.

### /bottleneck add <task text>
- Adds a new task to the calling user's queue
- Task is appended at the end (position = highest current position + 1)
- Bot responds with ephemeral confirmation: "Added: <task text> (position N)"
- Error if text is empty: "Please provide a task. Usage: /bottleneck add <task>"

### /bottleneck list
- Shows the calling user's tasks, ordered by position
- Format: numbered list "1. Task text\n2. Task text"
- Empty queue: "Your queue is empty."
- Response is ephemeral

### /bottleneck list <@user>
- Shows another user's tasks (Slack user mention format: <@U12345> or <@U12345|name>)
- Same numbered list format
- Empty queue: "<@U12345> has no tasks."
- Response is ephemeral

### /bottleneck done <number>
- Removes the task at that position number from the calling user's queue
- Remaining tasks are renumbered sequentially (no gaps)
- Response: "Completed: <task text>"
- Error if number is invalid or out of range: "No task at position N"
- Response is ephemeral

## Data Model
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
```

## Technical Stack
- @slack/bolt with Socket Mode
- better-sqlite3 for SQLite
- drizzle-orm for type-safe queries
- Environment variables: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN, DATABASE_PATH

## File Structure
- src/db/schema.ts — Drizzle table definition
- src/db/index.ts — Database connection and initialization
- src/app.ts — Bolt app setup, /bottleneck command handler
- src/index.ts — Entry point
