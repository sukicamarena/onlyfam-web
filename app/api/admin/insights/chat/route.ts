import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(request: Request) {
  const { userId, question, chatHistory = [] }: {
    userId: string;
    question: string;
    chatHistory: ChatMessage[];
  } = await request.json();

  if (!userId || !question) {
    return NextResponse.json({ error: 'userId y question requeridos' }, { status: 400 });
  }

  const [insightRes, eventsRes, groupRes, postRes, msgRes, profileRes] = await Promise.all([
    supabaseAdmin.from('user_insights').select('*').eq('user_id', userId).single(),
    supabaseAdmin.from('analytics_events').select('event_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('group_members').select('user_id').eq('user_id', userId),
    supabaseAdmin.from('posts').select('user_id').eq('user_id', userId),
    supabaseAdmin.from('messages').select('user_id').eq('user_id', userId),
    supabaseAdmin.from('profiles').select('username, full_name').eq('id', userId).single(),
  ]);

  const insight = insightRes.data;
  const events = eventsRes.data ?? [];
  const groupCount = groupRes.data?.length ?? 0;
  const postCount = postRes.data?.length ?? 0;
  const messageCount = msgRes.data?.length ?? 0;
  const username = profileRes.data?.username ?? profileRes.data?.full_name ?? 'Desconocido';

  const eventSummary = (() => {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.event_name] = (counts[e.event_name] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `${k}(${v})`)
      .join(', ') || 'ninguno';
  })();

  const systemPrompt = `Eres un analista de datos experto en comportamiento de usuarios de apps móviles.
Tienes acceso a los datos de comportamiento de un usuario específico de OnlyFam (red social privada para familias y amigos).
Responde preguntas sobre este usuario de forma directa, comercial y accionable.
Sé específico con los datos que tienes. Si no tienes suficientes datos, dilo claramente.
Responde en español, máximo 3 párrafos cortos.

DATOS DEL USUARIO @${username}:
- Grupos en que participa: ${groupCount}
- Posts creados: ${postCount}
- Mensajes enviados: ${messageCount}
- Eventos recientes (top por frecuencia): ${eventSummary}
${insight ? `
PERFIL IA GENERADO:
- Rango de edad estimado: ${insight.age_range}
- Género inferido: ${insight.gender_inferred}
- Intereses: ${Array.isArray(insight.interests) ? insight.interests.join(', ') || 'ninguno registrado' : 'ninguno registrado'}
- Horario activo: ${insight.active_hours}
- Contenido favorito: ${insight.favorite_content}
- Nivel de actividad: ${insight.activity_level}
- Resumen de personalidad: ${insight.personality_summary}
` : '\n(Sin perfil IA generado aún — responde basándote solo en las métricas de uso)'}`;

  const messages: ChatMessage[] = [
    ...chatHistory,
    { role: 'user', content: question },
  ];

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    }),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    return NextResponse.json({ error: `Error de IA: ${err}` }, { status: 500 });
  }

  const aiJson = await aiRes.json();
  const answer = aiJson.content?.[0]?.text ?? 'Sin respuesta';

  return NextResponse.json({ answer });
}
