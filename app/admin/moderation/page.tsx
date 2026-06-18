import { supabaseAdmin } from '@/lib/supabase-admin';
import { ReportsTable, BannedUsersTable } from './ModerationClient';

async function getData() {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [reportsRes, bannedProfilesRes, authRes] = await Promise.all([
    supabaseAdmin.from('reports').select(`
      id, reporter_id, reported_user_id, type, status, created_at, resolved_at,
      reporter:profiles!reporter_id(id, username, full_name),
      reported:profiles!reported_user_id(id, username, full_name)
    `).order('created_at', { ascending: false }),
    supabaseAdmin.from('profiles').select('id, username, full_name, ban_reason, banned_at').eq('banned', true),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const reports = (reportsRes.data ?? []) as any[];
  const bannedProfiles = bannedProfilesRes.data ?? [];
  const authUsers = authRes.data?.users ?? [];

  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? '']));

  const bannedUsers = bannedProfiles.map(p => ({
    id: p.id,
    username: p.username ?? '',
    full_name: p.full_name ?? '',
    email: emailMap[p.id] ?? '',
    ban_reason: p.ban_reason ?? null,
    banned_at: p.banned_at ?? null,
  }));

  const total = reports.length;
  const pending = reports.filter(r => r.status === 'pendiente').length;
  const resolvedToday = reports.filter(r =>
    r.status === 'resuelto' && r.resolved_at && new Date(r.resolved_at) >= today
  ).length;

  const resolvedWithTime = reports.filter(r => r.resolved_at && r.created_at);
  const avgHours = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((acc: number, r: any) =>
        acc + (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()), 0
      ) / resolvedWithTime.length / 3_600_000)
    : 0;

  return { reports, bannedUsers, total, pending, resolvedToday, avgHours };
}

function MetricCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default async function ModerationPage() {
  const d = await getData();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">Moderación</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona reportes y cuentas suspendidas</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total reportes" value={d.total} icon="📋" color="#1A6FD4" />
        <MetricCard label="Pendientes" value={d.pending} icon="⏳" color="#EF4444" />
        <MetricCard label="Resueltos hoy" value={d.resolvedToday} icon="✅" color="#18A86B" />
        <MetricCard label="Tiempo promedio (h)" value={d.avgHours} icon="⏱️" color="#8B5CF6" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Reportes</h2>
        <ReportsTable initialReports={d.reports} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Cuentas suspendidas
          {d.bannedUsers.length > 0 && (
            <span className="ml-2 text-red-400 normal-case">({d.bannedUsers.length})</span>
          )}
        </h2>
        <BannedUsersTable initialUsers={d.bannedUsers} />
      </section>
    </div>
  );
}
