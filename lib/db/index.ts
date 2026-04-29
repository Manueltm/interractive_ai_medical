//C:\Users\User\Desktop\Cloned\hume-voice-simulator\lib\db\index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 1️⃣  single pooled client for the whole app
const connection = postgres(process.env.DATABASE_URL!, {
  max: Number(process.env.POSTGRES_MAX || 20), // pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// 2️⃣  drizzle instance that re-uses that pool
export const db = drizzle(connection, { schema });


