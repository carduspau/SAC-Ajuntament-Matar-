import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export function createServerSupabase() {
  return createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false },
  });
}
