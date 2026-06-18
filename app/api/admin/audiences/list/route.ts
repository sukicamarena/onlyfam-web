import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('user_segments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ segments: [] });

  const segments = (data ?? []).map(row => ({
    id:              row.id,
    name:            row.name,
    description:     row.description,
    color:           row.color,
    user_ids:        row.user_ids        ?? [],
    characteristics: row.characteristics ?? [],
    users:           row.users_data      ?? [],
  }));

  return NextResponse.json({ segments });
}
