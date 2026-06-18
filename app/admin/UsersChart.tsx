'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type DataPoint = { date: string; users: number };

export default function UsersChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            border: 'none',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            fontSize: 12,
          }}
          labelStyle={{ fontWeight: 600, color: '#0d1b2a' }}
        />
        <Line
          type="monotone"
          dataKey="users"
          name="Nuevos usuarios"
          stroke="#1A6FD4"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#1A6FD4' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
