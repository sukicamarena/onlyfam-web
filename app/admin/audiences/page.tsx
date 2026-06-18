'use client';

import { useEffect, useState, useCallback } from 'react';

type SegmentUser = {
  user_id: string;
  username: string;
  email: string;
  avatar_emoji: string;
  avatar_url: string | null;
};

type Segment = {
  id?: string;
  name: string;
  description: string;
  color: string;
  user_ids: string[];
  characteristics: string[];
  users: SegmentUser[];
};

type SearchResult = {
  user_id: string;
  username: string;
  email: string;
  avatar_emoji: string;
  avatar_url: string | null;
  match_score: number;
  match_reason: string;
};

const EXAMPLES = [
  'amantes del fútbol',
  'mamás activas',
  'usuarios nocturnos',
  'posibles clientes premium',
];

// ── ExportModal ──────────────────────────────────────────────────────────────
function ExportModal({ segment, onClose }: { segment: Segment; onClose: () => void }) {
  const emails = segment.users.map(u => u.email).filter(Boolean).join('\n');
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#0d1b2a]">Exportar segmento</h3>
              <p className="text-xs text-gray-400 mt-0.5">{segment.name} · {segment.users.length} usuarios</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
          </div>

          <textarea
            readOnly
            value={emails}
            rows={7}
            className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl font-mono bg-gray-50 resize-none focus:outline-none"
          />

          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex-1 py-2.5 bg-[#1A6FD4] text-white text-sm font-semibold rounded-xl hover:bg-[#155db5] transition-colors"
            >
              {copied ? '✓ Copiado' : 'Copiar todos'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── SegmentCard ──────────────────────────────────────────────────────────────
function SegmentCard({ segment, onExport }: { segment: Segment; onExport: (s: Segment) => void }) {
  const [expanded, setExpanded] = useState(false);
  const c = segment.color || '#1A6FD4';

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Color bar */}
      <div className="h-1.5 flex-shrink-0" style={{ backgroundColor: c }} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-[#0d1b2a] text-base leading-tight">{segment.name}</h3>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap"
            style={{ backgroundColor: `${c}20`, color: c }}
          >
            {segment.users.length} usuarios
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed">{segment.description}</p>

        {/* Characteristics */}
        {segment.characteristics?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {segment.characteristics.map(ch => (
              <span
                key={ch}
                className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${c}18`, color: c }}
              >
                {ch}
              </span>
            ))}
          </div>
        )}

        {/* Expanded users list */}
        {expanded && segment.users.length > 0 && (
          <div className="border-t border-gray-50 pt-3 space-y-2 max-h-48 overflow-y-auto">
            {segment.users.map(u => (
              <div key={u.user_id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#EBF3FF] flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                  {u.avatar_url
                    ? <img src={u.avatar_url} className="w-7 h-7 object-cover" alt="" />
                    : (u.avatar_emoji || '👤')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0d1b2a] truncate">{u.username}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex-1 text-xs font-semibold py-2 rounded-xl border transition-colors hover:opacity-80"
            style={{ borderColor: `${c}50`, color: c }}
          >
            {expanded ? '▲ Ocultar' : `Ver ${segment.users.length} usuarios →`}
          </button>
          <button
            onClick={() => onExport(segment)}
            className="px-3 py-2 text-xs font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Exportar 📋
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SearchResultItem ─────────────────────────────────────────────────────────
function SearchResultItem({ result }: { result: SearchResult }) {
  const score = result.match_score;
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-amber-500' : 'bg-gray-400';
  const textColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : score >= 40 ? 'text-amber-600' : 'text-gray-500';

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="w-10 h-10 rounded-full bg-[#EBF3FF] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
        {result.avatar_url
          ? <img src={result.avatar_url} className="w-10 h-10 object-cover" alt="" />
          : (result.avatar_emoji || '👤')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="font-semibold text-[#0d1b2a] text-sm truncate">{result.username}</p>
          <span className={`text-sm font-bold flex-shrink-0 ${textColor}`}>{score}%</span>
        </div>
        <p className="text-xs text-gray-400 truncate mb-1.5">{result.email}</p>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
          <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{result.match_reason}</p>
      </div>
    </div>
  );
}

// ── AudiencesPage ────────────────────────────────────────────────────────────
export default function AudiencesPage() {
  const [segments, setSegments]           = useState<Segment[]>([]);
  const [loadingSegs, setLoadingSegs]     = useState(true);
  const [generating, setGenerating]       = useState(false);
  const [genError, setGenError]           = useState('');

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [searchError, setSearchError]     = useState('');
  const [query, setQuery]                 = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');

  const [exportTarget, setExportTarget]   = useState<Segment | null>(null);

  const loadSegments = useCallback(async () => {
    setLoadingSegs(true);
    const res = await fetch('/api/admin/audiences/list');
    if (res.ok) setSegments((await res.json()).segments ?? []);
    setLoadingSegs(false);
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  const generate = async () => {
    setGenerating(true);
    setGenError('');
    const res = await fetch('/api/admin/audiences/generate');
    const j = await res.json();
    if (res.ok) setSegments(j.segments ?? []);
    else setGenError(j.error ?? 'Error al generar segmentos');
    setGenerating(false);
  };

  const search = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    const res = await fetch('/api/admin/audiences/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed }),
    });
    const j = await res.json();
    if (res.ok) {
      setSearchResults(j.results ?? []);
      setSearchedQuery(trimmed);
    } else {
      setSearchError(j.error ?? 'Error en la búsqueda');
    }
    setSearching(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {exportTarget && <ExportModal segment={exportTarget} onClose={() => setExportTarget(null)} />}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">Audiencias 🎯</h1>
        <p className="text-sm text-gray-500 mt-1">Agrupa usuarios similares automáticamente con IA</p>
      </div>

      {/* ── SECCIÓN A: Segmentos Lookalike ─────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Segmentos automáticos (Lookalike)</h2>
            <p className="text-sm font-semibold text-[#0d1b2a] mt-0.5">Grupos de usuarios similares basados en comportamiento IA</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={generate}
              disabled={generating}
              className="px-4 py-2 bg-[#0d1b2a] text-white text-sm font-semibold rounded-lg hover:bg-[#1a2f4a] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {generating ? '⏳ Generando...' : 'Generar segmentos con IA ✨'}
            </button>
          </div>
        </div>

        {genError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {genError}
          </div>
        )}

        {loadingSegs ? (
          <div className="text-center py-16 text-gray-400 text-sm animate-pulse">Cargando segmentos...</div>
        ) : segments.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-sm font-semibold text-gray-600">Aún no hay segmentos generados</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">
              Asegúrate de tener perfiles IA en la sección "Perfiles IA" y luego presiona el botón de arriba
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {segments.map((seg, i) => (
              <SegmentCard key={seg.id ?? i} segment={seg} onExport={setExportTarget} />
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-gray-100" />

      {/* ── SECCIÓN B: Búsqueda personalizada ─────────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Búsqueda de audiencia personalizada</h2>
          <p className="text-sm font-semibold text-[#0d1b2a] mt-0.5">Describe quién buscas y la IA encuentra los usuarios más similares</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(query); }}
            placeholder="Describe la audiencia que buscas..."
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6FD4] placeholder-gray-400"
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); search(ex); }}
                className="px-3 py-1.5 text-xs bg-[#EBF3FF] text-[#1A6FD4] rounded-full hover:bg-[#d4e9ff] transition-colors border border-blue-100 font-medium"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            onClick={() => search(query)}
            disabled={searching || !query.trim()}
            className="w-full py-2.5 bg-[#1A6FD4] text-white text-sm font-semibold rounded-xl hover:bg-[#155db5] disabled:opacity-50 transition-colors"
          >
            {searching ? '🔍 Buscando...' : 'Buscar audiencia 🔍'}
          </button>
        </div>

        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {searchError}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {searchResults.length} usuarios coinciden con &ldquo;{searchedQuery}&rdquo;
              </p>
              <p className="text-xs text-gray-400">ordenados por relevancia</p>
            </div>
            {searchResults.map(r => (
              <SearchResultItem key={r.user_id} result={r} />
            ))}
          </div>
        )}

        {!searching && searchResults.length === 0 && searchedQuery && (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm">Ningún usuario coincide con ese criterio (score &lt; 40%)</p>
          </div>
        )}
      </section>
    </div>
  );
}
