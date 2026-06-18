'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
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
  group_count?: number;
  post_count?: number;
  message_count?: number;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const SUGGESTED = [
  '¿Le gustaría una función de videos?',
  '¿Es probable que pague por premium?',
  '¿Qué tipo de notificaciones le funcionarían?',
  '¿En qué horario enviarle una campaña?',
  '¿Cuál es su principal motivación para usar la app?',
];

const CHIP_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
];

const LEVEL_COLORS: Record<string, string> = {
  'muy activo': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'activo':     'bg-blue-100 text-blue-700 border border-blue-200',
  'moderado':   'bg-amber-100 text-amber-700 border border-amber-200',
  'inactivo':   'bg-gray-100 text-gray-500 border border-gray-200',
};

function engagementScore(insight: Insight): number {
  const base: Record<string, number> = {
    'muy activo': 80, 'activo': 60, 'moderado': 35, 'inactivo': 10,
  };
  const b = base[insight.activity_level?.toLowerCase() ?? ''] ?? 25;
  const g = Math.min(10, (insight.group_count ?? 0) * 4);
  const p = Math.min(6, (insight.post_count ?? 0) * 2);
  const m = Math.min(4, Math.floor((insight.message_count ?? 0) / 4));
  return Math.min(100, b + g + p + m);
}

function scoreStyle(score: number) {
  if (score < 30) return { bar: 'from-red-400 to-rose-500',        text: 'text-rose-600',    label: 'Bajo'  };
  if (score < 70) return { bar: 'from-amber-400 to-yellow-500',    text: 'text-amber-600',   label: 'Medio' };
  return            { bar: 'from-emerald-400 to-green-500',         text: 'text-emerald-600', label: 'Alto'  };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── ChatPanel ────────────────────────────────────────────────────────────────
function ChatPanel({ insight, onClose }: { insight: Insight; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput('');
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/insights/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: insight.user_id, question: q, chatHistory: messages }),
      });
      const j = await res.json();
      setMessages([...next, { role: 'assistant', content: j.answer ?? j.error ?? 'Error' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Error al conectar con la IA' }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] bg-white z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#0d1b2a] to-[#1e3557] flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
            {insight.avatar_url
              ? <img src={insight.avatar_url} className="w-9 h-9 object-cover" alt="" />
              : (insight.avatar_emoji ?? '👤')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm leading-tight">IA sobre @{insight.username}</p>
            <p className="text-xs text-white/50 truncate">{insight.email}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🤖</div>
              <p className="text-sm font-medium text-gray-700 mb-1">Analista IA listo</p>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                Haz preguntas sobre el comportamiento, preferencias o potencial de este usuario
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-[#0d1b2a] flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                  🤖
                </div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#1A6FD4] text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0d1b2a] flex items-center justify-center text-xs flex-shrink-0">🤖</div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested chips */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {SUGGESTED.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              className="flex-shrink-0 px-3 py-1.5 text-xs bg-[#EBF3FF] text-[#1A6FD4] rounded-full hover:bg-[#d4e9ff] transition-colors disabled:opacity-40 whitespace-nowrap border border-blue-100"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Pregunta algo sobre este usuario..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6FD4] disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-9 h-9 bg-[#1A6FD4] text-white rounded-xl hover:bg-[#155db5] disabled:opacity-40 transition-colors flex items-center justify-center text-base"
          >
            ↑
          </button>
        </div>

      </div>
    </>
  );
}

// ── InsightCard ──────────────────────────────────────────────────────────────
function InsightCard({ insight, onRegenerate, onChat }: {
  insight: Insight;
  onRegenerate: (id: string) => Promise<void>;
  onChat: (insight: Insight) => void;
}) {
  const [regen, setRegen] = useState(false);
  const score = engagementScore(insight);
  const { bar, text, label } = scoreStyle(score);
  const levelColor = LEVEL_COLORS[insight.activity_level?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-500 border border-gray-200';

  const handleRegen = async () => {
    setRegen(true);
    await onRegenerate(insight.user_id);
    setRegen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-[#EBF3FF] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
          {insight.avatar_url
            ? <img src={insight.avatar_url} className="w-12 h-12 object-cover" alt="" />
            : (insight.avatar_emoji ?? '👤')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#0d1b2a] text-[15px] leading-tight truncate">
            {insight.username ?? insight.user_id.slice(0, 8)}
          </p>
          {insight.email && <p className="text-xs text-gray-400 truncate mt-0.5">{insight.email}</p>}
          <span className={`inline-flex mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${levelColor}`}>
            ⚡ {insight.activity_level}
          </span>
        </div>
      </div>

      <div className="px-5 pb-5 flex flex-col gap-4 flex-1">

        {/* Engagement bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Engagement</span>
            <span className={`text-xs font-bold ${text}`}>{score}/100 · {label}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${bar}`}
              style={{ width: `${score}%`, transition: 'width 0.8s ease-out' }}
            />
          </div>
        </div>

        {/* ¿Quién es? */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">¿Quién es?</p>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><span>🎂</span>{insight.age_range ?? '?'}</span>
            <span className="flex items-center gap-1.5 truncate">
              <span>{insight.gender_inferred === 'masculino' ? '👨' : insight.gender_inferred === 'femenino' ? '👩' : '🧑'}</span>
              <span className="capitalize truncate">{insight.gender_inferred ?? '?'}</span>
            </span>
            <span className="flex items-center gap-1.5"><span>🌙</span><span className="capitalize">{insight.active_hours ?? '?'}</span></span>
            <span className="flex items-center gap-1.5 truncate"><span>❤️</span><span className="truncate">{insight.favorite_content ?? '?'}</span></span>
          </div>
        </div>

        {/* Intereses */}
        {insight.interests?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Le interesa:</p>
            <div className="flex flex-wrap gap-1.5">
              {insight.interests.slice(0, 5).map((tag, idx) => (
                <span key={tag} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Personalidad */}
        {insight.personality_summary && (
          <p className="text-xs text-gray-500 italic leading-relaxed border-l-[3px] border-[#1A6FD4]/30 pl-3">
            &ldquo;{insight.personality_summary}&rdquo;
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
          {[
            { label: 'grupos',   value: insight.group_count   ?? 0 },
            { label: 'posts',    value: insight.post_count    ?? 0 },
            { label: 'mensajes', value: insight.message_count ?? 0 },
          ].map(s => (
            <div key={s.label} className="text-center bg-gray-50 rounded-xl py-2">
              <p className="text-base font-bold text-[#0d1b2a]">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onChat(insight)}
            className="flex-1 py-2 bg-[#0d1b2a] text-white text-xs font-semibold rounded-xl hover:bg-[#1a2f4a] transition-colors"
          >
            Preguntarle a la IA 💬
          </button>
          <button
            onClick={handleRegen}
            disabled={regen}
            title={`Generado hace ${timeAgo(insight.generated_at)}`}
            className="px-3 py-2 bg-gray-100 text-gray-500 text-xs rounded-xl hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            {regen ? '⏳' : '🔄'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── FilterGroup ──────────────────────────────────────────────────────────────
function FilterGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 text-xs rounded-full transition-colors capitalize ${
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

// ── InsightsContent ──────────────────────────────────────────────────────────
function InsightsContent() {
  const params = useSearchParams();
  const focusUser = params.get('user');

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [chatTarget, setChatTarget] = useState<Insight | null>(null);

  const [filterLevel,  setFilterLevel]  = useState('todos');
  const [filterGender, setFilterGender] = useState('todos');
  const [filterAge,    setFilterAge]    = useState('todos');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/insights/list');
    if (res.ok) setInsights((await res.json()).insights ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateAll = async () => {
    setGenerating(true);
    setProgress('Iniciando...');
    const res = await fetch('/api/admin/insights/generate-all');
    if (res.ok) {
      const j = await res.json();
      setProgress(`✅ ${j.processed} generados${j.errors?.length ? ` · ${j.errors.length} errores` : ''}`);
      await load();
    } else {
      setProgress('❌ Error');
    }
    setGenerating(false);
  };

  const regenerate = useCallback(async (userId: string) => {
    const res = await fetch('/api/admin/insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) await load();
  }, [load]);

  const filtered = insights.filter(i => {
    if (filterLevel  !== 'todos' && i.activity_level?.toLowerCase()  !== filterLevel)  return false;
    if (filterGender !== 'todos' && i.gender_inferred?.toLowerCase() !== filterGender) return false;
    if (filterAge    !== 'todos' && i.age_range !== filterAge)                          return false;
    return true;
  });

  const sorted = focusUser
    ? [...filtered].sort((a, b) => (a.user_id === focusUser ? -1 : b.user_id === focusUser ? 1 : 0))
    : filtered;

  return (
    <>
      {chatTarget && <ChatPanel insight={chatTarget} onClose={() => setChatTarget(null)} />}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0d1b2a]">Perfiles Enriquecidos con IA 🧠</h1>
            <p className="text-sm text-gray-500 mt-0.5">{insights.length} perfiles · {filtered.length} visibles</p>
          </div>
          <div className="flex items-center gap-3">
            {progress && <span className="text-xs text-gray-500">{progress}</span>}
            <button
              onClick={generateAll}
              disabled={generating}
              className="px-4 py-2 bg-[#0d1b2a] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4a] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {generating ? '⏳ Generando...' : '✨ Generar todos'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-y-3 gap-x-6 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <FilterGroup label="Actividad" options={['todos','muy activo','activo','moderado','inactivo']} value={filterLevel}  onChange={v => setFilterLevel(v)}  />
          <FilterGroup label="Género"    options={['todos','masculino','femenino','desconocido']}        value={filterGender} onChange={v => setFilterGender(v)} />
          <FilterGroup label="Edad"      options={['todos','18-25','26-35','36-45','46-55','55+']}       value={filterAge}    onChange={v => setFilterAge(v)}    />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-3 animate-pulse">🧠</div>
            <p className="text-sm">Cargando perfiles...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="text-xl font-semibold text-[#0d1b2a] mb-2">
              {insights.length === 0 ? 'Aún no hay perfiles generados' : 'Sin resultados para estos filtros'}
            </h2>
            {insights.length === 0 && (
              <>
                <p className="text-sm text-gray-500 mb-6">Analiza a todos tus usuarios con IA en un solo clic</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sorted.map(insight => (
              <InsightCard
                key={insight.user_id}
                insight={insight}
                onRegenerate={regenerate}
                onChat={setChatTarget}
              />
            ))}
          </div>
        )}

      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-24 text-gray-400">
        <div className="text-5xl animate-pulse">🧠</div>
      </div>
    }>
      <InsightsContent />
    </Suspense>
  );
}
