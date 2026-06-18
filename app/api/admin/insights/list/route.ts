import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const [insightsRes, profilesRes, authRes] = await Promise.all([
    supabaseAdmin.from('user_insights').select('*').order('generated_at', { ascending: false }),
    supabaseAdmin.from('profiles').select('id, username, full_name, avatar_emoji, avatar_url'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const insights = insightsRes.data ?? [];
  const profiles = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));
  const emails = Object.fromEntries((authRes.data?.users ?? []).map(u => [u.id, u.email]));

  const enriched = insights.map(i => ({
    ...i,
    username: profiles[i.user_id]?.username ?? profiles[i.user_id]?.full_name ?? i.user_id.slice(0, 8),
    email: emails[i.user_id] ?? '',
    avatar_emoji: profiles[i.user_id]?.avatar_emoji ?? '👤',
    avatar_url: profiles[i.user_id]?.avatar_url ?? null,
  }));

  return NextResponse.json({ insights: enriched });
}
