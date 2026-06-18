import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const [insightsRes, profilesRes, authRes, groupRes, postRes, msgRes] = await Promise.all([
    supabaseAdmin.from('user_insights').select('*').order('generated_at', { ascending: false }),
    supabaseAdmin.from('profiles').select('id, username, full_name, avatar_emoji, avatar_url'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from('group_members').select('user_id'),
    supabaseAdmin.from('posts').select('user_id'),
    supabaseAdmin.from('messages').select('user_id'),
  ]);

  const insights = insightsRes.data ?? [];
  const profiles = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));
  const emails = Object.fromEntries((authRes.data?.users ?? []).map(u => [u.id, u.email]));

  const groupCounts: Record<string, number> = {};
  (groupRes.data ?? []).forEach(r => { groupCounts[r.user_id] = (groupCounts[r.user_id] ?? 0) + 1; });

  const postCounts: Record<string, number> = {};
  (postRes.data ?? []).forEach(r => { postCounts[r.user_id] = (postCounts[r.user_id] ?? 0) + 1; });

  const msgCounts: Record<string, number> = {};
  (msgRes.data ?? []).forEach(r => { msgCounts[r.user_id] = (msgCounts[r.user_id] ?? 0) + 1; });

  const enriched = insights.map(i => ({
    ...i,
    username: profiles[i.user_id]?.username ?? profiles[i.user_id]?.full_name ?? i.user_id.slice(0, 8),
    email: emails[i.user_id] ?? '',
    avatar_emoji: profiles[i.user_id]?.avatar_emoji ?? '👤',
    avatar_url: profiles[i.user_id]?.avatar_url ?? null,
    group_count: groupCounts[i.user_id] ?? 0,
    post_count: postCounts[i.user_id] ?? 0,
    message_count: msgCounts[i.user_id] ?? 0,
  }));

  return NextResponse.json({ insights: enriched });
}
