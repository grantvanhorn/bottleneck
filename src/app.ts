import { App } from '@slack/bolt';
import { db } from './db';

export async function startApp() {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
  });

  app.command('/start', async ({ command, ack, respond }) => {
    await ack();
    await respond(`Welcome! Use /add to add a task.`);
  });

  app.command('/add', async ({ command, ack, respond }) => {
    const userId = command.user.id;
    const taskName = command.text;

    await db.insert(tasks).values({
      userId,
      taskName,
      status: 'pending'
    });

    await ack();
    await respond(`Task "${taskName}" added!`);
  });

  app.command('/list', async ({ command, ack, respond }) => {
    const userId = command.user.id;
    const tasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
    let response = 'Your tasks:\n';
    tasks.forEach((task, index) => {
      response += `${index + 1}. ${task.taskName} (${task.status})\n`;
    });
    await ack();
    await respond(response);
  });

  app.command('/complete', async ({ command, ack, respond }) => {
    const userId = command.user.id;
    const taskId = parseInt(command.text);
    await db.update(tasks).set({ status: 'completed' }).where(eq(tasks.id, taskId));
    await ack();
    await respond('Task marked as completed.');
  });

  app.command('/stats', async ({ command, ack, respond }) => {
    const userId = command.user.id;
    const tasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    await ack();
    await respond(`Total tasks: ${total}\nCompleted: ${completed}\nPending: ${pending}`);
  });

  await app.start(3000);
}