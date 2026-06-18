import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const { reportId } = await request.json();
  if (!reportId) return NextResponse.json({ error: 'reportId requerido' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('reports')
    .update({ status: 'resuelto', resolved_at: new Date().toISOString() })
    .eq('id', reportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
