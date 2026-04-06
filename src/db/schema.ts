import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  text: text('text').notNull(),
  position: integer('position').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  completed_at: text('completed_at'),
});
