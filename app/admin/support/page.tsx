'use client';

import { useState } from 'react';

type UserResult = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_emoji: string;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  group_count: number;
  post_count: number;
  message_count: number;
  recent_events: { event_name: string; created_at: string; properties: Record<string, any> }[];
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const EVENT_ICONS: Record<string, string> = {
  home_viewed: '🏠', group_opened: '👥', message_sent: '💬',
  post_created: '📸', invite_shared: '🔗', login: '🔑',
  signup: '✨', challenge_completed: '🏆',
};

export default function SupportPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [copied, setCopied] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setUser(null);
    setNotFound(false);
    setResetLink(null);
    setResetError('');

    const res = await fetch(`/api/admin/support/search?q=${encodeURIComponent(query.trim())}`);
    const json = await res.json();

    if (!res.ok || !json.user) {
      setNotFound(true);
    } else {
      setUser(json.user);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!user) return;
    setResetting(true);
    setResetError('');
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    });
    const json = await res.json();
    if (res.ok) setResetLink(json.link);
    else setResetError(json.error ?? 'Error al generar link');
    setResetting(false);
  };

  const copyLink = () => {
    if (!resetLink) return;
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">Soporte</h1>
        <p className="text-sm text-gray-500 mt-0.5">Busca un usuario y gestiona su cuenta</p>
      </div>

      {/* Privacy notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <span className="text-lg">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">Nota de privacidad</p>
          <p className="text-xs text-amber-700 mt-0.5">No tienes acceso a contraseñas ni a mensajes privados de ningún usuario. Solo puedes ver métricas agregadas y actividad general.</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por email o nombre de usuario…"
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A6FD4] bg-white"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="px-5 py-2.5 bg-[#1A6FD4] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#1560bc] transition-colors"
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {notFound && (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm">No se encontró ningún usuario con ese criterio</p>
        </div>
      )}

      {user && (
        <div className="space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#EBF3FF] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                {user.avatar_url
                  ? <img src={user.avatar_url} className="w-14 h-14 object-cover rounded-full" />
                  : user.avatar_emoji}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-[#0d1b2a]">{user.full_name || user.username}</p>
                <p className="text-sm text-gray-500">@{user.username} · {user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Grupos', value: user.group_count, color: '#1A6FD4' },
                { label: 'Posts', value: user.post_count, color: '#EC4899' },
                { label: 'Mensajes', value: user.message_count, color: '#18A86B' },
              ].map(s => (
                <div key={s.label} className="bg-[#f6f6f7] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="text-sm space-y-1.5">
              <div className="flex justify-between text-gray-600 border-b border-gray-50 pb-1.5">
                <span>Registro</span><span className="font-medium text-[#0d1b2a]">{fmt(user.created_at)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Último acceso</span><span className="font-medium text-[#0d1b2a]">{fmt(user.last_sign_in_at)}</span>
              </div>
            </div>
          </div>

          {/* Password reset */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-[#0d1b2a] mb-3">Reseteo de contraseña</h2>
            {resetLink ? (
              <div className="space-y-2.5">
                <p className="text-sm text-green-700 font-medium">✅ Link generado — cópialo y envíaselo al usuario por email o WhatsApp</p>
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-green-800 break-all font-mono leading-relaxed">{resetLink}</p>
                </div>
                <button onClick={copyLink} className="text-sm text-[#1A6FD4] font-medium hover:underline">
                  {copied ? '✅ Copiado' : '📋 Copiar link'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Genera un link único para que el usuario pueda restablecer su contraseña. El link expira en 24 horas.</p>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="px-5 py-2.5 bg-[#0d1b2a] text-white text-sm font-semibold rounded-lg hover:bg-[#1a2f4a] disabled:opacity-50 transition-colors"
                >
                  {resetting ? 'Generando…' : '🔑 Generar link de reseteo'}
                </button>
                {resetError && <p className="text-sm text-red-500">{resetError}</p>}
              </div>
            )}
          </div>

          {/* Activity timeline */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-[#0d1b2a] mb-4">Actividad reciente</h2>
            {user.recent_events.length === 0 ? (
              <div className="text-center py-8 text-gray-300">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm">Sin actividad registrada</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {user.recent_events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f6f6f7] flex items-center justify-center text-base flex-shrink-0">
                      {EVENT_ICONS[ev.event_name] ?? '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0d1b2a]">{ev.event_name}</p>
                      {Object.keys(ev.properties).length > 0 && (
                        <p className="text-xs text-gray-400 truncate">{JSON.stringify(ev.properties)}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(ev.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
