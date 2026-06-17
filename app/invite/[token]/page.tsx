import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

type InvitePreview = {
  token: string;
  group_id: string;
  post_id: string | null;
  photo_url: string | null;
  sender_name: string;
  group_name: string;
  created_at: string;
};

async function getInvite(token: string): Promise<InvitePreview | null> {
  const { data } = await supabase
    .from('invite_previews')
    .select('*')
    .eq('token', token)
    .single();
  return data;
}

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const invite = await getInvite(token);

  if (!invite) return { title: 'OnlyFam' };

  return {
    title: `${invite.group_name} — OnlyFam`,
    description: `${invite.sender_name} te invita a unirte a ${invite.group_name}`,
    openGraph: {
      title: `${invite.group_name} — OnlyFam`,
      description: `${invite.sender_name} te invita a este grupo privado`,
      images: invite.photo_url ? [{ url: invite.photo_url }] : [],
    },
  };
}

const APP_STORE_URL = 'https://apps.apple.com';

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await getInvite(token);

  if (!invite) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="text-center">
          <p className="text-5xl mb-5">🔗</p>
          <h1 className="text-white text-2xl font-bold mb-3">Este link ya no está disponible</h1>
          <p className="text-white/50 text-base leading-relaxed">
            El link de invitación venció o fue eliminado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Animaciones */}
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .d1 { transition-delay: 0.08s; }
        .d2 { transition-delay: 0.18s; }
        .d3 { transition-delay: 0.28s; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .letter-enter {
          animation: fadeInUp 0.8s ease both;
        }
      `}</style>

      {/* ─────────────────────────────────────
          0. CARTA PERSONAL
      ───────────────────────────────────── */}
      <section className="bg-[#fffdf7] px-6 py-12">
        <div
          className="letter-enter max-w-lg mx-auto rounded-2xl shadow-md overflow-hidden"
          style={{ borderLeft: '3px solid #1d4ed8' }}
        >
          <div className="px-7 py-8">
            {/* Sobre */}
            <p className="text-2xl mb-4">💌</p>

            {/* Remitente */}
            <p
              className="text-sm font-semibold text-[#1d4ed8] mb-5 tracking-wide"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {invite.sender_name} te escribió algo:
            </p>

            {/* Carta */}
            <div
              className="text-[#2d2d2d] text-[1.05rem] leading-[1.85] space-y-4"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              <p>Hola 🤍</p>
              <p>
                Te mando este link porque te considero parte de mi familia —
                o algo muy cercano a eso. Y si lo estás leyendo, es porque lo eres.
              </p>
              <p>
                OnlyFam es el lugar donde guardo los momentos que más me importan.
                Fotos, recuerdos, conversaciones que no quiero que se pierdan
                en el ruido de las redes sociales.
              </p>
              <p>Quiero que tú también seas parte de esto.</p>
              <p className="pt-2 text-[#1d4ed8] font-semibold">
                — {invite.sender_name}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
          1. HERO
      ───────────────────────────────────── */}
      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center px-6 py-24 text-center">
        {/* Fondo con foto borrosa */}
        {invite.photo_url && (
          <div
            className="absolute inset-0 scale-110 blur-xl opacity-30"
            style={{
              backgroundImage: `url(${invite.photo_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
          {/* Logo */}
          <p className="text-white/60 text-xs font-bold tracking-[0.22em] uppercase mb-12">
            🤍 OnlyFam
          </p>

          {/* Foto del grupo */}
          {invite.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invite.photo_url}
              alt={invite.group_name}
              className="w-28 h-28 rounded-full object-cover border-[3px] border-white shadow-2xl mb-6"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-white/10 border-[3px] border-white flex items-center justify-center mb-6 text-4xl">
              👨‍👩‍👧‍👦
            </div>
          )}

          {/* Titular */}
          <h1 className="text-white text-3xl font-bold leading-snug mb-3">
            {invite.sender_name} te invita a{' '}
            <span className="text-blue-400">{invite.group_name}</span>
          </h1>

          <p className="text-white/60 text-base leading-relaxed mb-10">
            Tu espacio privado para los momentos que más importan
          </p>

          <a
            href={APP_STORE_URL}
            className="block w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-lg font-semibold px-8 py-4 rounded-2xl shadow-xl transition-all"
          >
            Unirme al grupo →
          </a>
        </div>
      </section>

      {/* ─────────────────────────────────────
          2. PROBLEMA
      ───────────────────────────────────── */}
      <section className="bg-white px-6 py-20">
        <div className="max-w-lg mx-auto">
          <h2 className="reveal text-[#0a0a0a] text-3xl font-bold text-center leading-tight mb-12">
            Las redes sociales de hoy<br />no son para tu familia
          </h2>

          <div className="flex flex-col gap-4">
            {(
              [
                {
                  icon: '📱',
                  title: 'Demasiado ruido',
                  desc: 'Instagram y TikTok son para extraños. Tus recuerdos familiares se pierden entre memes y publicidad.',
                },
                {
                  icon: '👁️',
                  title: 'Sin privacidad',
                  desc: '¿Por qué tus fotos familiares las ven miles de personas que ni conoces?',
                },
                {
                  icon: '💔',
                  title: 'Momentos perdidos',
                  desc: 'El cumpleaños de abuela, la graduación, el viaje familiar — se suben una vez y desaparecen para siempre.',
                },
              ] as const
            ).map((card, i) => (
              <div
                key={card.title}
                className={`reveal d${i + 1} bg-[#f9fafb] rounded-2xl p-6 flex gap-4 items-start`}
              >
                <span className="text-3xl flex-shrink-0">{card.icon}</span>
                <div>
                  <p className="font-bold text-[#0a0a0a] text-base mb-1">{card.title}</p>
                  <p className="text-[#6b7280] text-sm leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
          3. SOLUCIÓN
      ───────────────────────────────────── */}
      <section className="bg-[#f0f4ff] px-6 py-20">
        <div className="max-w-lg mx-auto">
          <div className="reveal text-center mb-12">
            <h2 className="text-[#0a0a0a] text-3xl font-bold leading-tight mb-3">
              OnlyFam es diferente
            </h2>
            <p className="text-[#4b5563] text-base leading-relaxed">
              Creamos el espacio que tu familia siempre mereció
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(
              [
                {
                  icon: '🔒',
                  title: '100% Privado',
                  desc: 'Solo las personas que tú invitas pueden ver tu contenido. Nunca extraños, nunca anuncios.',
                  delay: 'd1',
                },
                {
                  icon: '📸',
                  title: 'Recuerdos para siempre',
                  desc: 'Navidad 2024, Vacaciones de verano, Boda de María — todo organizado y en su lugar.',
                  delay: 'd2',
                },
                {
                  icon: '💬',
                  title: 'Chat del grupo incluido',
                  desc: 'Habla con toda la familia en el mismo lugar donde están los recuerdos. Sin cambiar de app.',
                  delay: 'd1',
                },
                {
                  icon: '❤️',
                  title: 'Hecho con amor',
                  desc: 'No somos una corporación. Creemos que los momentos familiares merecen un lugar especial.',
                  delay: 'd2',
                },
              ] as const
            ).map((feat) => (
              <div
                key={feat.title}
                className={`reveal ${feat.delay} bg-white rounded-2xl p-5 shadow-sm`}
              >
                <p className="text-3xl mb-3">{feat.icon}</p>
                <p className="font-bold text-[#0a0a0a] text-sm mb-2">{feat.title}</p>
                <p className="text-[#6b7280] text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
          4. STATS
      ───────────────────────────────────── */}
      <section className="bg-[#0a0a0a] px-6 py-20">
        <div className="max-w-lg mx-auto">
          <h2 className="reveal text-white text-3xl font-bold text-center mb-16">
            Los momentos no esperan
          </h2>

          <div className="flex flex-col gap-12">
            {(
              [
                {
                  stat: '70%',
                  text: 'de las fotos familiares nunca se vuelven a ver después de subirse a redes sociales',
                },
                {
                  stat: '10 años',
                  text: 'en promedio tarda una familia en perder el hilo de sus recuerdos digitales',
                },
                {
                  stat: '1 de cada 3',
                  text: 'personas siente que se desconecta de su familia por vivir en redes sociales distintas',
                },
              ] as const
            ).map((item, i) => (
              <div key={item.stat} className={`reveal d${i + 1} text-center`}>
                <p className="text-5xl font-black text-blue-400 mb-3">{item.stat}</p>
                <p className="text-white/50 text-sm leading-relaxed max-w-[260px] mx-auto">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="reveal mt-16 flex justify-center">
            <a
              href={APP_STORE_URL}
              className="block bg-white text-[#0a0a0a] text-base font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all"
            >
              Empieza a guardar tus recuerdos →
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
          5. TESTIMONIOS
      ───────────────────────────────────── */}
      <section className="bg-white px-6 py-20">
        <div className="max-w-lg mx-auto">
          <h2 className="reveal text-[#0a0a0a] text-3xl font-bold text-center mb-12">
            Familias que ya encontraron su espacio
          </h2>

          <div className="flex flex-col gap-5">
            {(
              [
                {
                  name: 'María G.',
                  role: 'Mamá de 3',
                  initials: 'MG',
                  bg: '#fce7f3',
                  color: '#be185d',
                  quote:
                    'Por fin un lugar donde puedo compartir fotos de mis hijos sin que las vea todo el mundo. Mi familia en Guadalajara se siente más cerca que nunca.',
                },
                {
                  name: 'Roberto S.',
                  role: 'Abuelo',
                  initials: 'RS',
                  bg: '#dbeafe',
                  color: '#1d4ed8',
                  quote:
                    'Mis nietos me mandaron el link y ahora veo cada momento de su vida. No sé mucho de tecnología pero esto es muy fácil.',
                },
                {
                  name: 'Daniela M.',
                  role: 'Hija mayor',
                  initials: 'DM',
                  bg: '#ede9fe',
                  color: '#6d28d9',
                  quote:
                    'Creé un grupo para mis papás y hermanos. Ahora compartimos fotos de viajes, memes familiares y hasta coordinamos reuniones. Es nuestra app familiar.',
                },
              ] as const
            ).map((t, i) => (
              <div
                key={t.name}
                className={`reveal d${i + 1} bg-[#f9fafb] rounded-2xl p-6`}
              >
                <p className="text-[#374151] text-sm leading-relaxed mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: t.bg, color: t.color }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[#0a0a0a] font-semibold text-sm">{t.name}</p>
                    <p className="text-[#9ca3af] text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
          6. FINAL CTA
      ───────────────────────────────────── */}
      <section
        className="px-6 py-24 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)' }}
      >
        <div className="max-w-sm mx-auto flex flex-col items-center">
          <h2 className="reveal text-4xl font-black leading-tight mb-4">
            Tu familia te está esperando
          </h2>
          <p className="reveal text-white/80 text-lg mb-10">
            {invite.group_name} ya tiene un espacio listo para ti
          </p>

          <a
            href={APP_STORE_URL}
            className="reveal block w-full bg-white text-blue-700 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-blue-50 active:scale-95 transition-all shadow-xl mb-6"
          >
            Unirme ahora — Es gratis →
          </a>

          <p className="reveal text-white/50 text-sm">
            Sin anuncios. Sin extraños. Solo tu familia.
          </p>

          <p className="mt-16 text-white/30 text-sm">🤍 OnlyFam</p>
        </div>
      </section>

      {/* Script de animaciones scroll */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function () {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
})();
`,
        }}
      />
    </div>
  );
}
