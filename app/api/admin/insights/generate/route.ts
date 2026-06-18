import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

    // ── 0. Tabla user_insights: prueba de existencia y columnas ──────────────
    const { data: tableTest, error: tableError } = await supabaseAdmin
      .from('user_insights')
      .select('*')
      .limit(1);
    console.log('user_insights test:', JSON.stringify({ data: tableTest, error: tableError }));

    if (tableError) {
      return NextResponse.json({
        step: 'user_insights_table_check',
        error: tableError.message,
        details: tableError,
      }, { status: 500 });
    }

    // ── 1. Datos del usuario ─────────────────────────────────────────────────
    const [profileRes, eventsRes, groupRes, postRes, msgRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('username, full_name').eq('id', userId).single(),
      supabaseAdmin.from('analytics_events').select('event_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('group_members').select('user_id').eq('user_id', userId),
      supabaseAdmin.from('posts').select('user_id').eq('user_id', userId),
      supabaseAdmin.from('messages').select('user_id').eq('user_id', userId),
    ]);

    console.log('profileRes error:', JSON.stringify(profileRes.error));
    console.log('eventsRes error:', JSON.stringify(eventsRes.error));
    console.log('groupRes error:', JSON.stringify(groupRes.error));
    console.log('postRes error:', JSON.stringify(postRes.error));
    console.log('msgRes error:', JSON.stringify(msgRes.error));

    for (const [name, res] of [['profiles', profileRes], ['analytics_events', eventsRes], ['group_members', groupRes], ['posts', postRes], ['messages', msgRes]] as const) {
      if ((res as { error: unknown }).error) {
        return NextResponse.json({
          step: `query_${name}`,
          error: (res as { error: { message: string } }).error.message,
          details: (res as { error: unknown }).error,
        }, { status: 500 });
      }
    }

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

    console.log('user_data:', JSON.stringify({ username, groupCount, postCount, messageCount, challengeCount, mostActiveHour, mostActiveDays, topEvents }));

    // ── 2. Llamada a Anthropic ───────────────────────────────────────────────
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

    const aiRawBody = await aiRes.text();
    console.log('anthropic status:', aiRes.status, 'body:', aiRawBody);

    if (!aiRes.ok) {
      return NextResponse.json({
        step: 'anthropic_call',
        status: aiRes.status,
        error: aiRawBody,
      }, { status: 500 });
    }

    let aiJson: { content?: { text: string }[] };
    try {
      aiJson = JSON.parse(aiRawBody);
    } catch (e) {
      return NextResponse.json({ step: 'anthropic_parse', error: String(e), raw: aiRawBody }, { status: 500 });
    }

    const rawText = aiJson.content?.[0]?.text ?? '{}';
    console.log('ai raw text:', rawText);

    let insight: Record<string, unknown>;
    try {
      insight = JSON.parse(rawText);
    } catch (e) {
      return NextResponse.json({ step: 'insight_json_parse', error: String(e), raw: rawText }, { status: 500 });
    }

    console.log('insight parsed:', JSON.stringify(insight));

    // ── 3. Guardar en user_insights ──────────────────────────────────────────
    const { error: upsertError, data: saved } = await supabaseAdmin
      .from('user_insights')
      .upsert({
        user_id: userId,
        ...insight,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    console.log('upsert result:', JSON.stringify({ saved, upsertError }));

    if (upsertError) {
      return NextResponse.json({
        step: 'upsert_user_insights',
        error: upsertError.message,
        code: upsertError.code,
        details: upsertError,
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, insight: saved });

  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('generate insight unhandled:', err);
    return NextResponse.json({
      step: 'unhandled',
      error: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}
