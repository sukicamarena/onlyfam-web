import { createClient } from '@supabase/supabase-js';
import UsersChart from './UsersChart';
import RealTimeUsers from './RealTimeUsers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getMetrics() {
  const [
    { count: totalUsers },
    { count: totalGroups },
    { count: totalMessages },
    { count: totalPosts },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('groups').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ count: dau }, { count: mau }] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'home_viewed')
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'home_viewed')
      .gte('created_at', monthStart.toISOString()),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    totalGroups: totalGroups ?? 0,
    totalMessages: totalMessages ?? 0,
    totalPosts: totalPosts ?? 0,
    dau: dau ?? 0,
    mau: mau ?? 0,
  };
}

async function getNewUsersChart() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at');

  const counts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    counts[d.toISOString().split('T')[0]] = 0;
  }

  data?.forEach(row => {
    const key = row.created_at.split('T')[0];
    if (key in counts) counts[key]++;
  });

  return Object.entries(counts).map(([date, users]) => ({
    date: date.slice(5),
    users,
  }));
}

const CARDS = [
  { key: 'totalUsers',    label: 'Total usuarios',        icon: '👥', color: '#1A6FD4', bg: '#EBF3FF' },
  { key: 'dau',           label: 'Activos hoy (DAU)',     icon: '🔥', color: '#EF4444', bg: '#FEF2F2' },
  { key: 'mau',           label: 'Activos este mes (MAU)',icon: '📅', color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'totalGroups',   label: 'Grupos creados',        icon: '👨‍👩‍👧‍👦', color: '#18A86B', bg: '#ECFDF5' },
  { key: 'totalMessages', label: 'Mensajes enviados',     icon: '💬', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'totalPosts',    label: 'Fotos subidas',         icon: '📸', color: '#EC4899', bg: '#FDF2F8' },
] as const;

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export default async function AdminDashboard() {
  const [metrics, chartData] = await Promise.all([getMetrics(), getNewUsersChart()]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Métricas generales de OnlyFam</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <RealTimeUsers />
        {CARDS.map(card => (
          <div key={card.key} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-4">
                {card.label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: card.bg }}
              >
                {card.icon}
              </div>
            </div>
            <div className="text-3xl font-bold" style={{ color: card.color }}>
              {fmt(metrics[card.key])}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[#0d1b2a]">Nuevos usuarios</h2>
          <p className="text-xs text-gray-400 mt-0.5">Últimos 30 días</p>
        </div>
        <UsersChart data={chartData} />
      </div>
    </div>
  );
}
