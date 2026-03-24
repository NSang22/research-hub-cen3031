import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

/**
 * Anon client — uses the public anon key.
 * Safe to use for operations that respect Row Level Security policies.
 * Use this for all standard authenticated-user requests.
 */
export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);

/**
 * Service role client — bypasses Row Level Security.
 * Use only for trusted server-side operations (e.g. admin tasks, seeding).
 * Never expose this client to the browser or untrusted code.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey
);
