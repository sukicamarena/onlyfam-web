'use client';

import { useState } from 'react';

type User = {
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
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleReset = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#EBF3FF] flex items-center justify-center text-2xl">
            {user.avatar_url
              ? <img src={user.avatar_url} className="w-12 h-12 rounded-full object-cover" />
              : user.avatar_emoji}
          </div>
          <div>
            <p className="font-semibold text-[#0d1b2a]">{user.full_name || user.username}</p>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Grupos', value: user.group_count },
            { label: 'Posts', value: user.post_count },
            { label: 'Mensajes', value: user.message_count },
          ].map(s => (
            <div key={s.label} className="bg-[#f6f6f7] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#1A6FD4]">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="text-sm space-y-1.5 text-gray-600">
          <div className="flex justify-between"><span>Email</span><span className="font-medium text-[#0d1b2a]">{user.email}</span></div>
          <div className="flex justify-between"><span>Registro</span><span className="font-medium">{fmt(user.created_at)}</span></div>
          <div className="flex justify-between"><span>Último acceso</span><span className="font-medium">{fmt(user.last_sign_in_at)}</span></div>
        </div>

        <div className="border-t pt-4 space-y-2">
          {resetLink ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-green-700">Link generado — cópialo y envíaselo al usuario:</p>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <p className="text-xs text-green-800 break-all font-mono">{resetLink}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(resetLink); }}
                className="text-xs text-[#1A6FD4] hover:underline"
              >Copiar link</button>
            </div>
          ) : (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full py-2 bg-[#0d1b2a] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4a] disabled:opacity-50 transition-colors"
            >
              {resetting ? 'Generando...' : '🔑 Enviar link de reseteo de contraseña'}
            </button>
          )}
          {resetError && <p className="text-xs text-red-500">{resetError}</p>}
        </div>
      </div>
    </div>
  );
}

export default function UsersTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'inactive30'>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const PER_PAGE = 20;

  const now = Date.now();
  const DAY = 86400000;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.email.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q);
    if (!matchQ) return false;
    if (filter === 'today') return u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < DAY;
    if (filter === 'week') return u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 7 * DAY;
    if (filter === 'inactive30') return !u.last_sign_in_at || now - new Date(u.last_sign_in_at).getTime() > 30 * DAY;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const fmtRelative = (iso: string | null) => {
    if (!iso) return <span className="text-gray-300">Nunca</span>;
    const diff = now - new Date(iso).getTime();
    if (diff < DAY) return <span className="text-green-600 text-xs font-medium">Hoy</span>;
    if (diff < 7 * DAY) return <span className="text-blue-600 text-xs">{Math.floor(diff / DAY)}d</span>;
    if (diff < 30 * DAY) return <span className="text-gray-500 text-xs">{Math.floor(diff / DAY)}d</span>;
    return <span className="text-red-400 text-xs">{Math.floor(diff / DAY)}d</span>;
  };

  return (
    <>
      {selected && <ProfileModal user={selected} onClose={() => setSelected(null)} />}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre o email…"
          className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A6FD4] bg-white"
        />
        <div className="flex gap-1.5">
          {(['all','today','week','inactive30'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                filter === f ? 'bg-[#1A6FD4] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {{ all: 'Todos', today: 'Hoy', week: 'Esta semana', inactive30: 'Inactivos 30d' }[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-[#f6f6f7]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Registro</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Último acceso</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Grupos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">👤</div>
                  <p>No se encontraron usuarios</p>
                </td>
              </tr>
            ) : slice.map((u, i) => (
              <tr key={u.id} className={`border-b border-gray-50 hover:bg-[#fafafa] transition-colors ${i % 2 === 0 ? '' : 'bg-[#fdfdfd]'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} className="w-8 h-8 object-cover" /> : u.avatar_emoji || '👤'}
                    </div>
                    <div>
                      <p className="font-medium text-[#0d1b2a] leading-tight">{u.full_name || u.username}</p>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{fmt(u.created_at)}</td>
                <td className="px-4 py-3">{fmtRelative(u.last_sign_in_at)}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="bg-[#EBF3FF] text-[#1A6FD4] text-xs font-medium px-2 py-0.5 rounded-full">{u.group_count}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(u)}
                    className="text-xs text-[#1A6FD4] hover:underline font-medium"
                  >Ver perfil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-[#fafafa]">
            <p className="text-xs text-gray-500">{filtered.length} usuarios · página {page} de {totalPages}</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">← Anterior</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
