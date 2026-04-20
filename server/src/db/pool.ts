import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Release idle connections after 30 s so Supabase's pooler (which drops idle
  // sockets after ~60 s) doesn't reset them while they are still in the pool.
  idleTimeoutMillis: 30_000,
  // Keep the pool small — Supabase free tier has a 60-connection limit.
  max: 10,
});

// Catch idle-connection errors (e.g. ECONNRESET from Supabase pooler) so they
// don't crash the process with an unhandled 'error' event.
pool.on('error', (err) => {
  console.error('[pg-pool] Idle client error (connection will be discarded):', err.message);
});

export default pool;
