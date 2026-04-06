# Tech Reference for Bottleneck

## Package Versions
Add these to package.json dependencies:
- "@slack/bolt": "^4.6.0"
- "better-sqlite3": "^12.8.0"
- "drizzle-orm": "^0.45.2"

Add these to package.json devDependencies:
- "@types/better-sqlite3": "^12.8.0"

---

## File: src/db/schema.ts
Purpose: Drizzle ORM table definition for the tasks table.

Imports:
```ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
```

Export:
```ts
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  text: text('text').notNull(),
  position: integer('position').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  completed_at: text('completed_at'),
});
```

DO NOT:
- Do not use defineTable (doesn't exist in drizzle-orm)
- Do not use column.text() syntax (wrong API)
- Do not create a users table (not in the spec)
- Do not rename columns from the spec (use user_id, text, position exactly)

---

## File: src/db/index.ts
Purpose: Create SQLite connection and initialize the database.

Imports:
```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
```

CRITICAL: better-sqlite3 uses a DEFAULT export.
Write: import Database from 'better-sqlite3'
DO NOT write: import { Database } from 'better-sqlite3'
DO NOT write: import { open } from 'better-sqlite3'

Pattern:
```ts
const sqlite = new Database(process.env.DATABASE_PATH || './data/bottleneck.db');
sqlite.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
)`);
export const db = drizzle(sqlite);
```

---

## File: src/app.ts
Purpose: Bolt.js app with /bottleneck command handler.

Imports:
```ts
import { App } from '@slack/bolt';
import { eq, and, asc, gt, sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { tasks } from './db/schema.js';
```

App setup — env var names MUST match .env.example exactly:
```ts
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});
```

Command handler pattern:
```ts
app.command('/bottleneck', async ({ command, ack, respond }) => {
  await ack();
  const [subcommand, ...rest] = command.text.trim().split(/\s+/);
  const args = rest.join(' ');
  switch (subcommand) {
    case 'add': { /* ... */ break; }
    case 'list': { /* ... */ break; }
    case 'done': { /* ... */ break; }
    default: { await respond({ text: 'Unknown command. Try: add, list, done', response_type: 'ephemeral' }); }
  }
});
```

Ephemeral response pattern — use this for ALL responses:
```ts
await respond({ text: 'message here', response_type: 'ephemeral' });
```

DO NOT:
- Do not use say() — always use respond() with response_type: 'ephemeral'
- Do not use command.user.id — use command.user_id
- Do not register separate commands like app.command('/bottleneck add') — Bolt doesn't support spaces
- Do not use SLACK_TOKEN — use SLACK_BOT_TOKEN (match .env.example)

---

## File: src/index.ts
Purpose: Entry point that starts the Bolt app.

```ts
import app from './app.js';

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Bottleneck is running!');
})();
```

Note: src/app.ts should use `export default app;`
