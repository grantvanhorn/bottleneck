import { App } from '@slack/bolt';
import { eq, and, asc, gt, sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { tasks } from './db/schema.js';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.command('/bottleneck', async ({ command, ack, respond }) => {
  await ack();
  const [subcommand, ...rest] = command.text.trim().split(/\s+/);
  const args = rest.join(' ');
  switch (subcommand) {
    case 'add': {
      if (!args) {
        await respond({ text: 'Usage: /bottleneck add <task text>', response_type: 'ephemeral' });
        return;
      }
      const userId = command.user_id;
      const maxPosition = await db.select({ position: tasks.position })
        .from(tasks)
        .where(eq(tasks.user_id, userId))
        .orderBy(asc(tasks.position))
        .get();
      const position = maxPosition ? maxPosition.position + 1 : 1;
      await db.insert(tasks).values({
        user_id: userId,
        text: args,
        position,
      }).run();
      await respond({ text: `Added: "${args}" (position ${position})`, response_type: 'ephemeral' });
      break;
    }
    case 'list': {
      const userId = command.user_id;
      const tasksList = await db.select({ text: tasks.text, position: tasks.position })
        .from(tasks)
        .where(eq(tasks.user_id, userId))
        .orderBy(asc(tasks.position))
        .all();
      const text = tasksList.length === 0
        ? 'No tasks yet. Add one with: /bottleneck add <task>'
        : tasksList.map(t => `${t.position}. ${t.text}`).join('\n');
      await respond({ text: text, response_type: 'ephemeral' });
      break;
    }
    case 'done': {
      const userId = command.user_id;
      const taskId = parseInt(command.text.replace(/^done\s*/, ''), 10);
      if (isNaN(taskId)) {
        await respond({ text: 'Usage: /bottleneck done <task-id>', response_type: 'ephemeral' });
        return;
      }
      await db.update(tasks)
        .set({ completed_at: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(tasks.user_id, userId), eq(tasks.id, taskId)))
        .run();
      await respond({ text: `Task ${taskId} marked as done.`, response_type: 'ephemeral' });
      break;
    }
    default: {
      await respond({ text: 'Unknown command. Try: add, list, done', response_type: 'ephemeral' });
    }
  }
});

export default app;
