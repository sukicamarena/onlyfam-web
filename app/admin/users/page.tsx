import { supabaseAdmin } from '@/lib/supabase-admin';
import UsersTable from './UserActions';

async function getUsers() {
  const [authRes, profilesRes, groupCountRes, postCountRes, msgCountRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from('profiles').select('id, username, full_name, avatar_emoji, avatar_url, created_at'),
    supabaseAdmin.from('group_members').select('user_id'),
    supabaseAdmin.from('posts').select('user_id'),
    supabaseAdmin.from('messages').select('user_id'),
  ]);

  console.log('AUTH ERROR:', authRes.error);
  console.log('AUTH USERS COUNT:', authRes.data?.users?.length);
  console.log('PROFILES ERROR:', profilesRes.error);
  console.log('PROFILES COUNT:', profilesRes.data?.length);

  const authUsers = authRes.data?.users ?? [];
  const profiles = profilesRes.data ?? [];

  const groupCounts: Record<string, number> = {};
  groupCountRes.data?.forEach(r => { groupCounts[r.user_id] = (groupCounts[r.user_id] ?? 0) + 1; });

  const postCounts: Record<string, number> = {};
  postCountRes.data?.forEach(r => { postCounts[r.user_id] = (postCounts[r.user_id] ?? 0) + 1; });

  const msgCounts: Record<string, number> = {};
  msgCountRes.data?.forEach(r => { msgCounts[r.user_id] = (msgCounts[r.user_id] ?? 0) + 1; });

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  const debugErrors = { authError: authRes.error, profilesError: profilesRes.error };

  return { users: authUsers.map(u => ({
    id: u.id,
    email: u.email ?? '',
    username: profileMap[u.id]?.username ?? '',
    full_name: profileMap[u.id]?.full_name ?? '',
    avatar_emoji: profileMap[u.id]?.avatar_emoji ?? '👤',
    avatar_url: profileMap[u.id]?.avatar_url ?? null,
    created_at: profileMap[u.id]?.created_at ?? u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    group_count: groupCounts[u.id] ?? 0,
    post_count: postCounts[u.id] ?? 0,
    message_count: msgCounts[u.id] ?? 0,
  })), debugErrors };
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color }}>{value.toLocaleString()}</p>
    </div>
  );
}

export default async function UsersPage() {
  const { users, debugErrors } = await getUsers();

  const now = Date.now();
  const DAY = 86400000;
  const newToday = users.filter(u => now - new Date(u.created_at).getTime() < DAY).length;
  const activeToday = users.filter(u => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < DAY).length;
  const inactive30 = users.filter(u => !u.last_sign_in_at || now - new Date(u.last_sign_in_at).getTime() > 30 * DAY).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} usuarios registrados</p>
        <pre style={{fontSize:10, color:'red'}}>
          AUTH: {JSON.stringify(debugErrors.authError)} | PROFILES: {JSON.stringify(debugErrors.profilesError)}
        </pre>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total" value={users.length} icon="👥" color="#1A6FD4" />
        <MetricCard label="Nuevos hoy" value={newToday} icon="✨" color="#18A86B" />
        <MetricCard label="Activos hoy" value={activeToday} icon="🔥" color="#F59E0B" />
        <MetricCard label="Inactivos 30d" value={inactive30} icon="💤" color="#9CA3AF" />
      </div>

      <UsersTable users={users} />
    </div>
  );
}
