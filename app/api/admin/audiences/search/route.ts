import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function stripJson(t: string) {
  return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export async function POST(request: Request) {
  const { query } = await request.json();
  if (!query?.trim()) return NextResponse.json({ error: 'query requerida' }, { status: 400 });

  const [insightsRes, profilesRes, authRes] = await Promise.all([
    supabaseAdmin.from('user_insights').select('*'),
    supabaseAdmin.from('profiles').select('id, username, full_name, avatar_emoji, avatar_url'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const insights = insightsRes.data ?? [];
  if (insights.length === 0) {
    return NextResponse.json({ error: 'No hay perfiles IA. Genera los perfiles primero en "Perfiles IA".' }, { status: 400 });
  }

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));
  const emailMap   = Object.fromEntries((authRes.data?.users ?? []).map(u => [u.id, u.email ?? '']));

  const compactProfiles = insights.map(i => ({
    user_id:              i.user_id,
    username:             profileMap[i.user_id]?.username ?? i.user_id.slice(0, 8),
    age_range:            i.age_range,
    gender_inferred:      i.gender_inferred,
    interests:            i.interests ?? [],
    active_hours:         i.active_hours,
    activity_level:       i.activity_level,
    personality_summary:  i.personality_summary,
  }));

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `Eres un experto en segmentación de audiencias.
Dado un criterio de búsqueda, identifica qué usuarios del listado coinciden mejor con ese criterio.
Responde SOLO con JSON válido sin markdown, sin texto adicional.`,
      messages: [{
        role: 'user',
        content: `El admin busca usuarios que coincidan con: "${query}"\n\nPerfiles disponibles:\n${JSON.stringify(compactProfiles, null, 2)}\n\nResponde SOLO con un array JSON ordenado por match_score descendente. Solo incluye usuarios con match_score >= 40:\n[{"user_id":"uuid","match_score":85,"match_reason":"razón específica en 1 línea"}]`,
      }],
    }),
  });

  if (!aiRes.ok) {
    return NextResponse.json({ error: `Anthropic error: ${await aiRes.text()}` }, { status: 500 });
  }

  const aiJson = await aiRes.json();
  const rawText = aiJson.content?.[0]?.text ?? '[]';

  type RawResult = { user_id: string; match_score: number; match_reason: string };
  let results: RawResult[];
  try {
    results = JSON.parse(stripJson(rawText));
  } catch {
    return NextResponse.json({ error: 'Respuesta IA no es JSON válido', raw: rawText }, { status: 500 });
  }

  const enriched = results.map(r => ({
    ...r,
    username:     profileMap[r.user_id]?.username ?? profileMap[r.user_id]?.full_name ?? r.user_id.slice(0, 8),
    email:        emailMap[r.user_id] ?? '',
    avatar_emoji: profileMap[r.user_id]?.avatar_emoji ?? '👤',
    avatar_url:   profileMap[r.user_id]?.avatar_url   ?? null,
  }));

  return NextResponse.json({ results: enriched });
}
