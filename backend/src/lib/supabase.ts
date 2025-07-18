import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Public client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for Supabase Auth
export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata: {
    username?: string;
    role?: string;
  };
};