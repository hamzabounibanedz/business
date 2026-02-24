import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local when running locally (e.g. vercel dev) if Vercel didn't inject env
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  config({ path: resolve(process.cwd(), '.env.local') });
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Admin client — service key bypasses RLS — used in all admin & order routes
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Public client — anon key, respects RLS (read-only active products)
export const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);
