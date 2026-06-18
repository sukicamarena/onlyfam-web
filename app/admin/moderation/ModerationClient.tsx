'use client';

import { useState } from 'react';

type Profile = { id: string; username: string; full_name: string } | null;

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  type: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  reporter: Profile;
  reported: Profile;
};

type BannedUser = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  ban_reason: string | null;
  banned_at: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  spam: 'Spam',
  acoso: 'Acoso',
  contenido_inapropiado: 'Contenido inapropiado',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const isResolved = status === 'resuelto';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isResolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isResolved ? 'Resuelto' : 'Pendiente'}
    </span>
  );
}

function BanModal({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason.trim()) { setError('Ingresa un motivo'); return; }
    setLoading(true);
    const res = await fetch('/api/admin/moderation/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reason }),
    });
    if (res.ok) { onDone(); onClose(); }
    else { const j = await res.json(); setError(j.error ?? 'Error'); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#0d1b2a]">Suspender usuario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Motivo del ban</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe el motivo..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Suspendiendo...' : 'Suspender'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReportsTable({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState(initialReports);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'resuelto'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [resolving, setResolving] = useState<string | null>(null);

  const resolve = async (id: string) => {
    setResolving(id);
    await fetch('/api/admin/moderation/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: id }),
    });
    setReports(prev => prev.map(r => r.id === id
      ? { ...r, status: 'resuelto', resolved_at: new Date().toISOString() }
      : r
    ));
    setResolving(null);
  };

  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
        <div className="flex gap-1.5">
          {(['all', 'pendiente', 'resuelto'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === f ? 'bg-[#1A6FD4] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {{ all: 'Todos', pendiente: 'Pendientes', resuelto: 'Resueltos' }[f]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {(['all', 'spam', 'acoso', 'contenido_inapropiado'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === t ? 'bg-[#8B5CF6] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? 'Todos los tipos' : TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f6f6f7] border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reporter</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reportado</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fecha</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-12 text-gray-400">
                <div className="text-3xl mb-2">🛡️</div>
                <p>No hay reportes con estos filtros</p>
              </td>
            </tr>
          ) : filtered.map((r, i) => (
            <tr key={r.id} className={`border-b border-gray-50 hover:bg-[#fafafa] ${i % 2 !== 0 ? 'bg-[#fdfdfd]' : ''}`}>
              <td className="px-4 py-3">
                <p className="font-medium text-[#0d1b2a] text-xs">{r.reporter?.full_name || r.reporter?.username || r.reporter_id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-[#0d1b2a] text-xs">{r.reported?.full_name || r.reported?.username || r.reported_user_id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-gray-600">{TYPE_LABELS[r.type] ?? r.type}</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{fmt(r.created_at)}</td>
              <td className="px-4 py-3">
                {r.status !== 'resuelto' && (
                  <button
                    onClick={() => resolve(r.id)}
                    disabled={resolving === r.id}
                    className="text-xs text-green-600 hover:underline font-medium disabled:opacity-50"
                  >
                    {resolving === r.id ? '...' : 'Marcar resuelto'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BannedUsersTable({ initialUsers }: { initialUsers: BannedUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [unbanning, setUnbanning] = useState<string | null>(null);

  const unban = async (id: string) => {
    setUnbanning(id);
    await fetch('/api/admin/moderation/unban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    });
    setUsers(prev => prev.filter(u => u.id !== id));
    setUnbanning(null);
  };

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm">No hay cuentas suspendidas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f6f6f7] border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Motivo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Suspendido</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id} className={`border-b border-gray-50 hover:bg-[#fafafa] ${i % 2 !== 0 ? 'bg-[#fdfdfd]' : ''}`}>
              <td className="px-4 py-3">
                <p className="font-medium text-[#0d1b2a]">{u.full_name || u.username}</p>
                <p className="text-xs text-gray-400">@{u.username}</p>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{u.email}</td>
              <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell max-w-xs truncate">{u.ban_reason ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{fmt(u.banned_at)}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => unban(u.id)}
                  disabled={unbanning === u.id}
                  className="text-xs text-[#1A6FD4] hover:underline font-medium disabled:opacity-50"
                >
                  {unbanning === u.id ? '...' : 'Levantar ban'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BanButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [banned, setBanned] = useState(false);

  if (banned) return <span className="text-xs text-red-400 font-medium">Suspendido</span>;

  return (
    <>
      {open && (
        <BanModal
          userId={userId}
          onClose={() => setOpen(false)}
          onDone={() => setBanned(true)}
        />
      )}
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-500 hover:underline font-medium"
      >
        Suspender
      </button>
    </>
  );
}
