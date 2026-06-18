import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

  const [profileRes, eventsRes, groupRes, postRes, msgRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('username, full_name').eq('id', userId).single(),
    supabaseAdmin.from('analytics_events').select('event_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('group_members').select('user_id').eq('user_id', userId),
    supabaseAdmin.from('posts').select('user_id').eq('user_id', userId),
    supabaseAdmin.from('messages').select('user_id').eq('user_id', userId),
  ]);

  const username = profileRes.data?.username ?? profileRes.data?.full_name ?? 'Desconocido';
  const events = eventsRes.data ?? [];
  const groupCount = groupRes.data?.length ?? 0;
  const postCount = postRes.data?.length ?? 0;
  const messageCount = msgRes.data?.length ?? 0;

  const challengeCount = events.filter(e => e.event_name === 'challenge_completed').length;

  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};
  const eventNameCounts: Record<string, number> = {};
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  for (const e of events) {
    const d = new Date(e.created_at);
    const h = d.getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    const day = dayNames[d.getDay()];
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    eventNameCounts[e.event_name] = (eventNameCounts[e.event_name] ?? 0) + 1;
  }

  const mostActiveHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'desconocida';
  const mostActiveDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d).join(', ') || 'desconocido';
  const topEvents = Object.entries(eventNameCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(', ') || 'ninguno';

  const prompt = `Analiza este perfil de usuario de OnlyFam (red social privada para familia y amigos) y genera insights.

    Datos del usuario:
    - Username: ${username}
    - Grupos: ${groupCount}
    - Posts creados: ${postCount}
    - Mensajes enviados: ${messageCount}
    - Retos completados: ${challengeCount}
    - Hora más activa: ${mostActiveHour}hs
    - Días más activos: ${mostActiveDays}
    - Eventos frecuentes: ${topEvents}

    Responde SOLO con JSON válido sin markdown:
    {
      "age_range": "18-25 | 26-35 | 36-45 | 46-55 | 55+",
      "gender_inferred": "masculino | femenino | desconocido",
      "interests": ["array", "de", "intereses"],
      "active_hours": "mañana | tarde | noche | madrugada",
      "favorite_content": "descripción breve",
      "activity_level": "muy activo | activo | moderado | inactivo",
      "personality_summary": "2-3 oraciones describiendo al usuario"
    }`;

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
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    return NextResponse.json({ error: `Anthropic error: ${err}` }, { status: 500 });
  }

  const aiJson = await aiRes.json();
  const rawText = aiJson.content?.[0]?.text ?? '{}';

  let insight: Record<string, unknown>;
  try {
    insight = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: 'Respuesta de IA no es JSON válido', raw: rawText }, { status: 500 });
  }

  const { error: upsertError, data: saved } = await supabaseAdmin
    .from('user_insights')
    .upsert({
      user_id: userId,
      ...insight,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ ok: true, insight: saved });
}
