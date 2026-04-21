import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.js';

//Anon client — respects Row Level Security
export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);

//Service role client — bypasses RLS, for trusted server-side ops only
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey
);
