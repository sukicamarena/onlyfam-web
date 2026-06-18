import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ error: 'Query requerida' }, { status: 400 });

  // Find auth user by email (exact match) or search profiles by username/name
  let authUser: any = null;
  let profileData: any = null;

  // Try email lookup via listUsers filter
  if (q.includes('@')) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const found = data?.users?.find(u => u.email?.toLowerCase() === q.toLowerCase());
    if (found) {
      authUser = found;
      const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', authUser.id).single();
      profileData = p;
    }
  }

  // Fallback: search profiles by username or full_name
  if (!authUser) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(1);

    if (profiles?.[0]) {
      profileData = profiles[0];
      const { data } = await supabaseAdmin.auth.admin.getUserById(profileData.id);
      authUser = data?.user ?? null;
    }
  }

  if (!authUser || !profileData) {
    return NextResponse.json({ user: null });
  }

  const userId = authUser.id;

  const [groupRes, postRes, msgRes, eventsRes] = await Promise.all([
    supabaseAdmin.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin
      .from('analytics_events')
      .select('event_name, created_at, properties')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    user: {
      id: userId,
      email: authUser.email ?? '',
      username: profileData.username ?? '',
      full_name: profileData.full_name ?? '',
      avatar_emoji: profileData.avatar_emoji ?? '👤',
      avatar_url: profileData.avatar_url ?? null,
      created_at: profileData.created_at ?? authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      group_count: groupRes.count ?? 0,
      post_count: postRes.count ?? 0,
      message_count: msgRes.count ?? 0,
      recent_events: eventsRes.data ?? [],
    },
  });
}
