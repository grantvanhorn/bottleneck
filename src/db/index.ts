import { drizzle } from 'drizzle-orm/better-sqlite3';
import { Database } from 'better-sqlite3';
import { users, tasks } from './schema';

export const db = drizzle(new Database(':memory:'), {
  schema: { users, tasks }
});