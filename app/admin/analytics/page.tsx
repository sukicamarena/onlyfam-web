import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ActiveUsersTrendChart, PostsBarChart, NewVsReturningChart,
  EventsBarChart, SessionsChart, HeatmapChart, ScreensBarChart,
} from './AnalyticsCharts';

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function dateKey(iso: string) { return iso.split('T')[0]; }
function last(n: number) { return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d.toISOString().split('T')[0]; }); }

async function getData() {
  const [eventsRes, postsRes, messagesRes, profilesRes, groupsRes] = await Promise.all([
    supabaseAdmin.from('analytics_events').select('user_id, event_name, created_at').gte('created_at', daysAgo(90)),
    supabaseAdmin.from('posts').select('user_id, created_at').gte('created_at', daysAgo(30)),
    supabaseAdmin.from('messages').select('user_id, created_at').gte('created_at', daysAgo(30)),
    supabaseAdmin.from('profiles').select('id, created_at'),
    supabaseAdmin.from('groups').select('id, created_at, last_activity_at'),
  ]);

  const events = eventsRes.data ?? [];
  const posts = postsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const groups = groupsRes.data ?? [];

  // ── DAU/WAU/MAU trend (last 90 days, compute rolling windows)
  const days90 = last(90);
  const trendData = days90.map(d => {
    const dDate = new Date(d).getTime();
    const dayEnd = dDate + 86400000;
    const weekStart = dDate - 6 * 86400000;
    const monthStart = dDate - 29 * 86400000;
    const dau = new Set(events.filter(e => { const t = new Date(e.created_at).getTime(); return t >= dDate && t < dayEnd; }).map(e => e.user_id)).size;
    const wau = new Set(events.filter(e => { const t = new Date(e.created_at).getTime(); return t >= weekStart && t < dayEnd; }).map(e => e.user_id)).size;
    const mau = new Set(events.filter(e => { const t = new Date(e.created_at).getTime(); return t >= monthStart && t < dayEnd; }).map(e => e.user_id)).size;
    return { date: d.slice(5), dau, wau, mau };
  });

  // ── Posts + messages per day (last 30)
  const days30 = last(30);
  const postsByDay: Record<string, number> = {};
  const msgsByDay: Record<string, number> = {};
  days30.forEach(d => { postsByDay[d] = 0; msgsByDay[d] = 0; });
  posts.forEach(p => { const k = dateKey(p.created_at); if (k in postsByDay) postsByDay[k]++; });
  messages.forEach(m => { const k = dateKey(m.created_at); if (k in msgsByDay) msgsByDay[k]++; });
  const contentData = days30.map(d => ({ date: d.slice(5), posts: postsByDay[d], messages: msgsByDay[d] }));

  // ── New vs Returning (this month)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newUserIds = new Set(profiles.filter(p => new Date(p.created_at) >= monthStart).map(p => p.id));
  const activeThisMonth = new Set(events.filter(e => new Date(e.created_at) >= monthStart).map(e => e.user_id));
  const newActive = [...activeThisMonth].filter(id => newUserIds.has(id)).length;
  const returningActive = activeThisMonth.size - newActive;

  // ── Events frequency
  const eventCounts: Record<string, number> = {};
  events.forEach(e => { eventCounts[e.event_name] = (eventCounts[e.event_name] ?? 0) + 1; });
  const totalEvents = events.length;
  const topEvents = Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([event, count]) => ({ event, count, pct: totalEvents ? Math.round(count / totalEvents * 100) : 0 }));

  // ── Sessions per day (home_viewed)
  const sessionsByDay: Record<string, number> = {};
  days30.forEach(d => { sessionsByDay[d] = 0; });
  events.filter(e => e.event_name === 'home_viewed').forEach(e => {
    const k = dateKey(e.created_at);
    if (k in sessionsByDay) sessionsByDay[k]++;
  });
  const sessionsData = days30.map(d => ({ date: d.slice(5), sessions: sessionsByDay[d] }));

  // ── Heatmap: posts+messages by hour × day
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  [...posts, ...messages].forEach(item => {
    const d = new Date(item.created_at);
    matrix[d.getDay()][d.getHours()]++;
  });

  // ── Pantallas más visitadas
  const SCREEN_EVENTS: Record<string, string> = {
    home_viewed: 'Home',
    group_opened: 'Grupo abierto',
    message_sent: 'Mensaje enviado',
    post_created: 'Post creado',
    invite_shared: 'Invitación compartida',
    challenge_completed: 'Reto completado',
    login: 'Login',
    signup: 'Registro',
  };
  const screenData = Object.entries(SCREEN_EVENTS)
    .map(([name, label]) => ({ screen: label, count: eventCounts[name] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  // ── Group health
  const now = Date.now();
  const activeGroups = groups.filter(g => g.last_activity_at && now - new Date(g.last_activity_at).getTime() < 7 * 86400000).length;
  const ghostGroups = groups.filter(g => !g.last_activity_at || now - new Date(g.last_activity_at).getTime() > 30 * 86400000).length;
  const avgMsgsPerGroup = groups.length ? Math.round(messages.length / groups.length) : 0;
  const avgPostsPerGroup = groups.length ? Math.round(posts.length / groups.length) : 0;

  // ── Cohort retention (weekly cohorts, last 8 weeks)
  const cohorts: { week: string; total: number; w1: number; w2: number; w4: number; w8: number }[] = [];
  const weekMs = 7 * 86400000;
  for (let i = 7; i >= 0; i--) {
    const cohortStart = new Date(now - (i + 1) * weekMs);
    const cohortEnd = new Date(now - i * weekMs);
    const cohortUsers = profiles.filter(p => {
      const t = new Date(p.created_at).getTime();
      return t >= cohortStart.getTime() && t < cohortEnd.getTime();
    });
    if (!cohortUsers.length) continue;
    const userIds = new Set(cohortUsers.map(p => p.id));
    const allEvents = eventsRes.data ?? [];
    const activeIn = (wStart: number, wEnd: number) =>
      Math.round(new Set(allEvents.filter(e => {
        const t = new Date(e.created_at).getTime();
        return userIds.has(e.user_id) && t >= wStart && t < wEnd;
      }).map(e => e.user_id)).size / cohortUsers.length * 100);

    const base = cohortEnd.getTime();
    cohorts.push({
      week: cohortStart.toISOString().split('T')[0].slice(5),
      total: cohortUsers.length,
      w1: activeIn(base, base + weekMs),
      w2: activeIn(base + weekMs, base + 2 * weekMs),
      w4: activeIn(base + 3 * weekMs, base + 4 * weekMs),
      w8: activeIn(base + 7 * weekMs, base + 8 * weekMs),
    });
  }

  return { trendData, contentData, newActive, returningActive, topEvents, sessionsData, matrix, activeGroups, ghostGroups, avgMsgsPerGroup, avgPostsPerGroup, totalEvents, groups: groups.length, cohorts, screenData };
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#0d1b2a]">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PctBar({ pct, color = '#1A6FD4' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default async function AnalyticsPage() {
  const d = await getData();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">Analítica</h1>
        <p className="text-sm text-gray-500 mt-0.5">{d.totalEvents.toLocaleString()} eventos registrados en los últimos 90 días</p>
      </div>

      {/* ── USUARIOS ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Usuarios</h2>

        <Card title="Actividad por período" subtitle="DAU / WAU / MAU — últimos 90 días">
          <ActiveUsersTrendChart data={d.trendData} />
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Nuevos vs Recurrentes" subtitle="Este mes">
            {d.newActive + d.returningActive === 0 ? (
              <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-1">📊</div><p className="text-sm">Sin datos aún</p></div>
            ) : (
              <NewVsReturningChart newUsers={d.newActive} returning={d.returningActive} />
            )}
          </Card>

          <Card title="Retención por cohorte" subtitle="% de usuarios activos semanas post-registro">
            {d.cohorts.length === 0 ? (
              <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-1">🔬</div><p className="text-sm">Sin datos suficientes</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1.5 text-gray-400 font-medium">Semana</th>
                      <th className="text-right py-1.5 text-gray-400 font-medium">Total</th>
                      <th className="text-right py-1.5 text-gray-400 font-medium">S1</th>
                      <th className="text-right py-1.5 text-gray-400 font-medium">S2</th>
                      <th className="text-right py-1.5 text-gray-400 font-medium">S4</th>
                      <th className="text-right py-1.5 text-gray-400 font-medium">S8</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.cohorts.map(c => (
                      <tr key={c.week} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-600">{c.week}</td>
                        <td className="text-right py-1.5 font-medium">{c.total}</td>
                        {[c.w1, c.w2, c.w4, c.w8].map((v, i) => (
                          <td key={i} className="text-right py-1.5">
                            <span className={`font-medium ${v >= 40 ? 'text-green-600' : v >= 20 ? 'text-yellow-600' : 'text-red-400'}`}>{v}%</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* ── CONTENIDO ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Contenido</h2>

        <Card title="Posts y mensajes por día" subtitle="Últimos 30 días">
          <PostsBarChart data={d.contentData} />
        </Card>

        <Card title="Horas pico de publicación" subtitle="Posts + mensajes por hora del día y día de la semana">
          <HeatmapChart matrix={d.matrix} />
        </Card>
      </section>

      {/* ── ENGAGEMENT ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Engagement</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Eventos más frecuentes" subtitle="Top 10 — últimos 90 días">
            {d.topEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-1">📱</div><p className="text-sm">Sin eventos registrados</p></div>
            ) : (
              <div className="space-y-2.5">
                {d.topEvents.map(e => (
                  <div key={e.event}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{e.event}</span>
                      <span className="text-gray-400">{e.count.toLocaleString()} · <span className="font-medium text-[#1A6FD4]">{e.pct}%</span></span>
                    </div>
                    <PctBar pct={e.pct} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Sesiones por día" subtitle="Aperturas de HomeScreen — últimos 30 días">
            <SessionsChart data={d.sessionsData} />
          </Card>
        </div>
      </section>

      {/* ── SALUD DE PLATAFORMA ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Salud de la plataforma</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Grupos activos (7d)', value: d.activeGroups, icon: '✅', color: '#18A86B' },
            { label: 'Grupos fantasma (30d)', value: d.ghostGroups, icon: '👻', color: '#9CA3AF' },
            { label: 'Msgs/grupo (30d)', value: d.avgMsgsPerGroup, icon: '💬', color: '#1A6FD4' },
            { label: 'Posts/grupo (30d)', value: d.avgPostsPerGroup, icon: '📸', color: '#EC4899' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{c.label}</span>
                <span className="text-lg">{c.icon}</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PANTALLAS MÁS VISITADAS ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Pantallas más visitadas</h2>

        <Card title="Actividad por pantalla" subtitle="Eventos registrados — últimos 90 días">
          {d.screenData.every(s => s.count === 0) ? (
            <div className="text-center py-8 text-gray-300">
              <div className="text-3xl mb-1">📱</div>
              <p className="text-sm">Sin datos de navegación</p>
            </div>
          ) : (
            <ScreensBarChart data={d.screenData} />
          )}
        </Card>
      </section>
    </div>
  );
}
