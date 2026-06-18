import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BATCH = 5;

export async function GET() {
  const authRes = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const users = authRes.data?.users ?? [];

  const errors: { userId: string; error: string }[] = [];
  let processed = 0;

  const base = 'https://onlyfam-web.vercel.app';

  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.all(batch.map(async (u) => {
      try {
        const res = await fetch(`${base}/api/admin/insights/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.id }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          errors.push({ userId: u.id, error: j.error ?? `HTTP ${res.status}` });
        } else {
          processed++;
        }
      } catch (e) {
        errors.push({ userId: u.id, error: String(e) });
      }
    }));
  }

  return NextResponse.json({ processed, total: users.length, errors });
}
