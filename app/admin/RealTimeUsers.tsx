'use client';

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RealTimeUsers() {
  const [count, setCount] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('analytics_events')
      .select('user_id')
      .gte('created_at', fiveMinAgo);
    const unique = new Set(data?.map(e => e.user_id) ?? []).size;
    setCount(unique);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-4">
          Usuarios en tiempo real
        </span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-[10px] text-green-600 font-medium">En vivo</span>
        </div>
      </div>

      <div className="text-3xl font-bold text-green-600">
        {count === null ? (
          <span className="text-gray-300 animate-pulse">—</span>
        ) : count}
      </div>
      <p className="text-xs text-gray-400 mt-1">activos en los últimos 5 min</p>

      {lastUpdated && (
        <p className="text-[10px] text-gray-300 mt-2">
          Actualizado {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}
    </div>
  );
}
