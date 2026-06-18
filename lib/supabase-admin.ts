import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — never instantiated at build time, only on first request
let _client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _client;
}

// Proxy delegates every property access to the lazy singleton
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    return getClient()[prop as keyof SupabaseClient];
  },
});
