'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type CostItem = { id: string; label: string; amount: number; editable?: boolean };

const DEFAULT_COSTS: CostItem[] = [
  { id: 'supabase', label: 'Supabase', amount: 0 },
  { id: 'vercel', label: 'Vercel', amount: 0 },
  { id: 'apple', label: 'Apple Developer ($99/año)', amount: 8.25 },
  { id: 'custom1', label: 'Otro', amount: 0, editable: true },
];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

export default function CostsPage() {
  const [costs, setCosts] = useState<CostItem[]>(DEFAULT_COSTS);
  const [newUsersMonth, setNewUsersMonth] = useState(0);
  const [ltvPrice, setLtvPrice] = useState(9.99);
  const [ltvMonths, setLtvMonths] = useState(6);
  const [customLabel, setCustomLabel] = useState('Otro');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin_costs_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCosts(parsed.costs ?? DEFAULT_COSTS);
        setLtvPrice(parsed.ltvPrice ?? 9.99);
        setLtvMonths(parsed.ltvMonths ?? 6);
        setCustomLabel(parsed.customLabel ?? 'Otro');
      }
    } catch {}
  }, []);

  // Fetch new users this month from Supabase
  useEffect(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString())
      .then(({ count }) => { setNewUsersMonth(count ?? 0); setLoadingUsers(false); });
  }, []);

  const save = () => {
    localStorage.setItem('admin_costs_v1', JSON.stringify({ costs, ltvPrice, ltvMonths, customLabel }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateCost = (id: string, val: number) => {
    setCosts(prev => prev.map(c => c.id === id ? { ...c, amount: val } : c));
  };

  const totalMonthly = costs.reduce((sum, c) => sum + (c.amount || 0), 0);
  const cac = newUsersMonth > 0 ? totalMonthly / newUsersMonth : null;
  const ltv = ltvPrice * ltvMonths;
  const ltvCacRatio = cac && cac > 0 ? ltv / cac : null;

  const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">CAC & Costos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Costos mensuales y métricas de adquisición</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Costo total mensual"
          value={fmt(totalMonthly)}
          color="#0d1b2a"
        />
        <MetricCard
          label="Nuevos usuarios mes"
          value={loadingUsers ? '…' : newUsersMonth.toString()}
          color="#1A6FD4"
        />
        <MetricCard
          label="CAC"
          value={cac !== null ? fmt(cac) : newUsersMonth === 0 ? '—' : fmt(0)}
          sub="Costo de adquisición"
          color={cac !== null && cac < 5 ? '#18A86B' : '#F59E0B'}
        />
        <MetricCard
          label="LTV / CAC"
          value={ltvCacRatio !== null ? `${ltvCacRatio.toFixed(1)}x` : '—'}
          sub={ltvCacRatio !== null && ltvCacRatio >= 3 ? '✅ Saludable' : ltvCacRatio !== null ? '⚠️ Mejorar' : 'Sin datos'}
          color={ltvCacRatio !== null && ltvCacRatio >= 3 ? '#18A86B' : '#EF4444'}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Costs editor */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-base font-semibold text-[#0d1b2a]">Costos mensuales</h2>
          {costs.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="flex-1">
                {c.editable ? (
                  <input
                    value={customLabel}
                    onChange={e => setCustomLabel(e.target.value)}
                    className="w-full text-sm font-medium text-gray-700 bg-transparent border-b border-gray-200 focus:outline-none focus:border-[#1A6FD4] pb-0.5"
                  />
                ) : (
                  <label className="text-sm font-medium text-gray-700">{c.label}</label>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.amount}
                  onChange={e => updateCost(c.id, parseFloat(e.target.value) || 0)}
                  className="w-24 text-sm text-right border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1A6FD4]"
                />
                <span className="text-xs text-gray-400">/mes</span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-[#0d1b2a]">{fmt(totalMonthly)}/mes</span>
          </div>
        </div>

        {/* LTV calculator */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-[#0d1b2a]">Estimación de LTV</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio mensual planeado</label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-400">$</span>
                <input
                  type="number" min="0" step="0.01" value={ltvPrice}
                  onChange={e => setLtvPrice(parseFloat(e.target.value) || 0)}
                  className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A6FD4]"
                />
                <span className="text-xs text-gray-400">/mes por usuario</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Retención promedio esperada</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min="1" max="120" value={ltvMonths}
                  onChange={e => setLtvMonths(parseInt(e.target.value) || 1)}
                  className="w-20 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A6FD4]"
                />
                <span className="text-xs text-gray-400">meses</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">LTV estimado</span>
                <span className="font-bold text-[#18A86B]">{fmt(ltv)}</span>
              </div>
              {cac !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ratio LTV/CAC</span>
                  <span className={`font-bold ${ltvCacRatio !== null && ltvCacRatio >= 3 ? 'text-[#18A86B]' : 'text-[#EF4444]'}`}>
                    {ltvCacRatio !== null ? `${ltvCacRatio.toFixed(1)}x` : '—'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#EBF3FF] rounded-xl p-4 text-sm text-[#1A6FD4] space-y-1">
            <p className="font-semibold">💡 Benchmark saludable</p>
            <p className="text-xs opacity-80">LTV/CAC ≥ 3x es considerado saludable para un negocio SaaS/consumer app. Por debajo de 1x significa que adquieres usuarios más caro de lo que valen.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="px-6 py-2.5 bg-[#1A6FD4] text-white text-sm font-semibold rounded-lg hover:bg-[#1560bc] transition-colors"
        >
          {saved ? '✅ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
