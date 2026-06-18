import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function stripJson(t: string) {
  return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export async function GET() {
  const [insightsRes, profilesRes, authRes] = await Promise.all([
    supabaseAdmin.from('user_insights').select('*'),
    supabaseAdmin.from('profiles').select('id, username, full_name, avatar_emoji, avatar_url'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const insights = insightsRes.data ?? [];
  if (insights.length === 0) {
    return NextResponse.json(
      { error: 'No hay perfiles IA generados. Ve a "Perfiles IA" y genera los perfiles primero.' },
      { status: 400 },
    );
  }

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));
  const emailMap   = Object.fromEntries((authRes.data?.users ?? []).map(u => [u.id, u.email ?? '']));

  const compactProfiles = insights.map(i => ({
    user_id:          i.user_id,
    username:         profileMap[i.user_id]?.username ?? i.user_id.slice(0, 8),
    age_range:        i.age_range,
    gender_inferred:  i.gender_inferred,
    interests:        i.interests ?? [],
    active_hours:     i.active_hours,
    activity_level:   i.activity_level,
    favorite_content: i.favorite_content,
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
      max_tokens: 2000,
      system: `Eres un experto en segmentación de audiencias como Facebook Ads Manager.
Agrupa estos usuarios en segmentos lookalike basándote en sus características comunes.
Crea entre 3-7 segmentos con nombres creativos y descriptivos.
Cada segmento debe tener sentido comercial (útil para campañas de marketing).
Responde SOLO con JSON válido, sin markdown, sin texto adicional.`,
      messages: [{
        role: 'user',
        content: `Aquí están los perfiles de usuarios:\n${JSON.stringify(compactProfiles, null, 2)}\n\nResponde SOLO con un array JSON:\n[{"name":"Nombre creativo con emoji","description":"Por qué son similares en 1 oración","color":"#hexcolor","user_ids":["uuid1"],"characteristics":["característica1","característica2"]}]`,
      }],
    }),
  });

  if (!aiRes.ok) {
    return NextResponse.json({ error: `Anthropic error: ${await aiRes.text()}` }, { status: 500 });
  }

  const aiJson = await aiRes.json();
  const rawText = aiJson.content?.[0]?.text ?? '[]';

  type RawSeg = { name: string; description: string; color: string; user_ids: string[]; characteristics: string[] };
  let rawSegments: RawSeg[];
  try {
    rawSegments = JSON.parse(stripJson(rawText));
  } catch (e) {
    return NextResponse.json({ error: 'Respuesta IA no es JSON válido', raw: rawText }, { status: 500 });
  }

  const enriched = rawSegments.map(s => ({
    ...s,
    users: (s.user_ids ?? []).map(uid => ({
      user_id:      uid,
      username:     profileMap[uid]?.username ?? profileMap[uid]?.full_name ?? uid.slice(0, 8),
      email:        emailMap[uid] ?? '',
      avatar_emoji: profileMap[uid]?.avatar_emoji ?? '👤',
      avatar_url:   profileMap[uid]?.avatar_url   ?? null,
    })),
  }));

  // Best-effort persistence — table may not exist yet
  try {
    await supabaseAdmin.from('user_segments').delete().gte('created_at', '2000-01-01T00:00:00Z');
    await Promise.all(enriched.map(seg =>
      supabaseAdmin.from('user_segments').insert({
        name:            seg.name,
        description:     seg.description,
        color:           seg.color,
        user_ids:        seg.user_ids,
        characteristics: seg.characteristics,
        users_data:      seg.users,
      }),
    ));
  } catch { /* continue without saving */ }

  return NextResponse.json({ segments: enriched });
}
