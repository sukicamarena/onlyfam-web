import { supabaseAdmin } from '@/lib/supabase-admin';
import ReferralsClient from './ReferralsClient';

async function getData() {
  const [eventsRes, profilesRes, authRes] = await Promise.all([
    supabaseAdmin
      .from('analytics_events')
      .select('user_id, properties, created_at')
      .eq('event_name', 'invite_shared')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('profiles').select('id, username, full_name, avatar_emoji'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const events = eventsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const authUsers = authRes.data?.users ?? [];

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? '']));

  // Build referral rows
  const rows = events.map(e => ({
    userId: e.user_id,
    username: profileMap[e.user_id]?.username ?? '—',
    full_name: profileMap[e.user_id]?.full_name ?? '',
    email: emailMap[e.user_id] ?? '',
    groupId: (e.properties as any)?.groupId ?? null,
    date: e.created_at,
  }));

  // Invites per day (last 30)
  const last30: Record<string, number> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    last30[d.toISOString().split('T')[0]] = 0;
  }
  events.forEach(e => {
    const k = e.created_at.split('T')[0];
    if (k in last30) last30[k]++;
  });
  const chartData = Object.entries(last30).map(([date, count]) => ({ date: date.slice(5), count }));

  // Top inviters
  const inviteCount: Record<string, number> = {};
  events.forEach(e => { inviteCount[e.user_id] = (inviteCount[e.user_id] ?? 0) + 1; });
  const topInviters = Object.entries(inviteCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([uid, count]) => ({
      userId: uid,
      username: profileMap[uid]?.username ?? '—',
      full_name: profileMap[uid]?.full_name ?? '',
      count,
    }));

  // Group invite trees (who invited from which group)
  const byGroup: Record<string, { groupId: string; inviters: string[] }> = {};
  rows.forEach(r => {
    if (!r.groupId) return;
    if (!byGroup[r.groupId]) byGroup[r.groupId] = { groupId: r.groupId, inviters: [] };
    if (!byGroup[r.groupId].inviters.includes(r.username)) byGroup[r.groupId].inviters.push(r.username);
  });

  return {
    rows,
    chartData,
    topInviters,
    treeGroups: Object.values(byGroup).slice(0, 20),
    totalInvites: events.length,
  };
}

export default async function ReferralsPage() {
  const data = await getData();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">Referidos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tracking de invitaciones generadas</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total invites</p>
          <p className="text-3xl font-bold text-[#1A6FD4]">{data.totalInvites}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Usuarios que invitan</p>
          <p className="text-3xl font-bold text-[#18A86B]">{data.topInviters.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Grupos con invites</p>
          <p className="text-3xl font-bold text-[#8B5CF6]">{data.treeGroups.length}</p>
        </div>
      </div>

      <ReferralsClient
        rows={data.rows}
        chartData={data.chartData}
        topInviters={data.topInviters}
        treeGroups={data.treeGroups}
      />
    </div>
  );
}
