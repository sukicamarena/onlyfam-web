'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Row = { userId: string; username: string; full_name: string; email: string; groupId: string | null; date: string };
type Inviter = { userId: string; username: string; full_name: string; count: number };
type TreeGroup = { groupId: string; inviters: string[] };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReferralsClient({
  rows, chartData, topInviters, treeGroups,
}: {
  rows: Row[];
  chartData: { date: string; count: number }[];
  topInviters: Inviter[];
  treeGroups: TreeGroup[];
}) {
  return (
    <div className="space-y-5">
      {/* Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-[#0d1b2a] mb-1">Invites generados por día</h2>
        <p className="text-xs text-gray-400 mb-4">Últimos 30 días</p>
        {rows.length === 0 ? (
          <div className="text-center py-10 text-gray-300"><div className="text-3xl mb-2">🔗</div><p className="text-sm">Sin invites registrados aún</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Bar dataKey="count" name="Invites" fill="#1A6FD4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Top inviters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-[#0d1b2a] mb-4">Top 10 usuarios que más invitan</h2>
          {topInviters.length === 0 ? (
            <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-1">👤</div><p className="text-sm">Sin datos</p></div>
          ) : (
            <div className="space-y-2.5">
              {topInviters.map((u, i) => (
                <div key={u.userId} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-300 w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0d1b2a]">{u.full_name || u.username}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </div>
                  <span className="bg-[#EBF3FF] text-[#1A6FD4] text-xs font-bold px-2.5 py-1 rounded-full">{u.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tree by group */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-[#0d1b2a] mb-4">Árbol de referidos por grupo</h2>
          {treeGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-1">🌳</div><p className="text-sm">Sin datos</p></div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {treeGroups.map(g => (
                <div key={g.groupId}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-gray-500">Grupo</span>
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{g.groupId.slice(0, 8)}…</code>
                  </div>
                  <div className="ml-4 space-y-0.5">
                    {g.inviters.map(inv => (
                      <div key={inv} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-gray-300">└</span>
                        <span>@{inv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#0d1b2a]">Historial de invitaciones</h2>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-gray-300"><div className="text-3xl mb-2">📋</div><p className="text-sm">Sin invitaciones registradas</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f6f6f7]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Grupo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-[#fafafa]">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-[#0d1b2a]">{r.full_name || r.username}</p>
                    <p className="text-xs text-gray-400">@{r.username}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell text-xs">{r.email}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {r.groupId
                      ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{r.groupId.slice(0, 8)}…</code>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmt(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
