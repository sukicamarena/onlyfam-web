import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const { userId, reason } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ banned: true, banned_at: new Date().toISOString(), ban_reason: reason ?? null })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
