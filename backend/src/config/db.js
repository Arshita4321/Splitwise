import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon/Supabase require SSL; this works for both local (no sslmode) and hosted DBs
  ssl:
    process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
});
console.log("DB URL:", process.env.DATABASE_URL);

pool.on('connect', () => {
  console.log('PostgreSQL pool: client connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});
