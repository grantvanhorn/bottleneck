import { defineTable, column } from 'drizzle-orm/better-sqlite3';

export const users = defineTable('users', {
  id: column.integer().primaryKey(),
  slackUserId: column.text().unique(),
  name: column.text()
});

export const tasks = defineTable('tasks', {
  id: column.integer().primaryKey(),
  userId: column.integer().references(users.id),
  taskName: column.text(),
  status: column.text().default('pending'),
  dueDate: column.text()
});