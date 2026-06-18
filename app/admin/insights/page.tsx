'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

type Insight = {
  user_id: string;
  age_range: string;
  gender_inferred: string;
  interests: string[];
  active_hours: string;
  favorite_content: string;
  activity_level: string;
  personality_summary: string;
  generated_at: string;
  username?: string;
  email?: string;
  avatar_emoji?: string;
  avatar_url?: string | null;
};

const LEVEL_COLORS: Record<string, string> = {
  'muy activo': 'bg-green-100 text-green-700',
  'activo': 'bg-blue-100 text-blue-700',
  'moderado': 'bg-yellow-100 text-yellow-700',
  'inactivo': 'bg-gray-100 text-gray-500',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function InsightCard({ insight, onRegenerate }: { insight: Insight; onRegenerate: (id: string) => void }) {
  const [regen, setRegen] = useState(false);

  const handleRegen = async () => {
    setRegen(true);
    await onRegenerate(insight.user_id);
    setRegen(false);
  };

  const levelColor = LEVEL_COLORS[insight.activity_level?.toLowerCase()] ?? 'bg-gray-100 text-gray-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#EBF3FF] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
          {insight.avatar_url
            ? <img src={insight.avatar_url} className="w-10 h-10 object-cover" alt="" />
            : (insight.avatar_emoji ?? '👤')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0d1b2a] truncate">{insight.username ?? insight.user_id.slice(0, 8)}</p>
          {insight.email && <p className="text-xs text-gray-400 truncate">{insight.email}</p>}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${levelColor}`}>
          {insight.activity_level}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>🎂 {insight.age_range}</span>
        <span>{insight.gender_inferred === 'masculino' ? '👨' : insight.gender_inferred === 'femenino' ? '👩' : '🧑'} {insight.gender_inferred}</span>
        <span>🕐 {insight.active_hours}</span>
      </div>

      {insight.interests?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.interests.slice(0, 5).map(i => (
            <span key={i} className="bg-[#EBF3FF] text-[#1A6FD4] text-xs px-2 py-0.5 rounded-full">{i}</span>
          ))}
        </div>
      )}

      {insight.personality_summary && (
        <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{insight.personality_summary}&rdquo;</p>
      )}

      <div className="flex items-center justify-between pt-1 mt-auto">
        <span className="text-xs text-gray-400">{timeAgo(insight.generated_at)}</span>
        <button
          onClick={handleRegen}
          disabled={regen}
          className="text-xs text-[#1A6FD4] hover:underline disabled:opacity-40"
        >
          {regen ? 'Generando...' : 'Regenerar'}
        </button>
      </div>
    </div>
  );
}

function InsightsContent() {
  const params = useSearchParams();
  const focusUser = params.get('user');

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');

  const [filterLevel, setFilterLevel] = useState('todos');
  const [filterGender, setFilterGender] = useState('todos');
  const [filterAge, setFilterAge] = useState('todos');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/insights/list');
    if (res.ok) {
      const j = await res.json();
      setInsights(j.insights ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateAll = async () => {
    setGenerating(true);
    setProgress('Iniciando...');
    const res = await fetch('/api/admin/insights/generate-all');
    if (res.ok) {
      const j = await res.json();
      setProgress(`✅ ${j.processed} perfiles generados${j.errors?.length ? ` · ${j.errors.length} errores` : ''}`);
      await load();
    } else {
      setProgress('❌ Error al generar perfiles');
    }
    setGenerating(false);
  };

  const regenerate = async (userId: string) => {
    const res = await fetch('/api/admin/insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) await load();
  };

  const levels = ['todos', 'muy activo', 'activo', 'moderado', 'inactivo'];
  const genders = ['todos', 'masculino', 'femenino', 'desconocido'];
  const ages = ['todos', '18-25', '26-35', '36-45', '46-55', '55+'];

  const filtered = insights.filter(i => {
    if (filterLevel !== 'todos' && i.activity_level?.toLowerCase() !== filterLevel) return false;
    if (filterGender !== 'todos' && i.gender_inferred?.toLowerCase() !== filterGender) return false;
    if (filterAge !== 'todos' && i.age_range !== filterAge) return false;
    return true;
  });

  const sorted = focusUser
    ? [...filtered].sort((a, b) => (a.user_id === focusUser ? -1 : b.user_id === focusUser ? 1 : 0))
    : filtered;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2a]">Perfiles Enriquecidos con IA 🧠</h1>
          <p className="text-sm text-gray-500 mt-0.5">{insights.length} perfiles generados</p>
        </div>
        <div className="flex items-center gap-3">
          {progress && <span className="text-xs text-gray-500">{progress}</span>}
          <button
            onClick={generateAll}
            disabled={generating}
            className="px-4 py-2 bg-[#0d1b2a] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4a] disabled:opacity-50 transition-colors"
          >
            {generating ? '⏳ Generando...' : '✨ Generar todos los perfiles'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <FilterGroup label="Actividad" options={levels} value={filterLevel} onChange={setFilterLevel} />
        <FilterGroup label="Género" options={genders} value={filterGender} onChange={setFilterGender} />
        <FilterGroup label="Edad" options={ages} value={filterAge} onChange={setFilterAge} />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">🧠</div>
          <p>Cargando perfiles...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-xl font-semibold text-[#0d1b2a] mb-2">
            {insights.length === 0 ? 'Aún no hay perfiles generados' : 'Sin resultados para estos filtros'}
          </h2>
          {insights.length === 0 && (
            <>
              <p className="text-sm text-gray-500 mb-6">Genera perfiles IA para todos los usuarios de un clic</p>
              <button
                onClick={generateAll}
                disabled={generating}
                className="px-6 py-3 bg-[#1A6FD4] text-white font-semibold rounded-xl hover:bg-[#155db5] disabled:opacity-50 transition-colors"
              >
                {generating ? '⏳ Generando...' : '🚀 Generar perfiles con IA'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(insight => (
            <InsightCard key={insight.user_id} insight={insight} onRegenerate={regenerate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400"><div className="text-4xl animate-pulse">🧠</div></div>}>
      <InsightsContent />
    </Suspense>
  );
}

function FilterGroup({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500">{label}:</span>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
            value === o
              ? 'bg-[#1A6FD4] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
