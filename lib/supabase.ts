import { createClient } from '@supabase/supabase-js';

// Fallback placeholders prevent build-time crash when env vars are not yet
// configured in the CI/CD environment. At runtime the real values are required.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
