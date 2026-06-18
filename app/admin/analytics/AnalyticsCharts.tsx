'use client';

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/* ── DAU/WAU/MAU trend ── */
export function ActiveUsersTrendChart({ data }: { data: { date: string; dau: number; wau: number; mau: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="dau" name="DAU" stroke="#1A6FD4" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="wau" name="WAU" stroke="#18A86B" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="mau" name="MAU" stroke="#8B5CF6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Posts per day bar chart ── */
export function PostsBarChart({ data }: { data: { date: string; posts: number; messages: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="posts" name="Posts" fill="#EC4899" radius={[3, 3, 0, 0]} />
        <Bar dataKey="messages" name="Mensajes" fill="#1A6FD4" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── New vs returning (donut) ── */
export function NewVsReturningChart({ newUsers, returning }: { newUsers: number; returning: number }) {
  const data = [
    { name: 'Nuevos', value: newUsers },
    { name: 'Recurrentes', value: returning },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
          <Cell fill="#1A6FD4" />
          <Cell fill="#18A86B" />
        </Pie>
        <Tooltip contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ── Top events horizontal bar ── */
export function EventsBarChart({ data }: { data: { event: string; count: number; pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="event" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={80} />
        <Tooltip contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Bar dataKey="count" name="Eventos" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Sessions per day ── */
export function SessionsChart({ data }: { data: { date: string; sessions: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Line type="monotone" dataKey="sessions" name="Sesiones" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Hour×Day heatmap ── */
export function HeatmapChart({ matrix }: { matrix: number[][] }) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const maxVal = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-max">
        <div className="flex flex-col gap-0.5 mr-1">
          <div className="w-7 h-5" />
          {days.map(d => (
            <div key={d} className="w-7 h-5 flex items-center justify-end pr-1">
              <span className="text-[9px] text-gray-400">{d}</span>
            </div>
          ))}
        </div>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex flex-col gap-0.5">
            <div className="w-5 h-5 flex items-end justify-center pb-0.5">
              <span className="text-[9px] text-gray-400">{h % 6 === 0 ? `${h}h` : ''}</span>
            </div>
            {matrix.map((dayRow, d) => {
              const val = dayRow[h];
              const intensity = val / maxVal;
              const bg = intensity === 0
                ? '#f3f4f6'
                : `rgba(26, 111, 212, ${0.1 + intensity * 0.9})`;
              return (
                <div key={d} title={`${days[d]} ${h}:00 — ${val} eventos`}
                  className="w-5 h-5 rounded-sm cursor-default"
                  style={{ backgroundColor: bg }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
