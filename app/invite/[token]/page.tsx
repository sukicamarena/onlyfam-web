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

  if (!invite) {
    return { title: 'OnlyFam' };
  }

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
          <h1 className="text-white text-2xl font-bold mb-3">
            Este link ya no está disponible
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            El link de invitación venció o fue eliminado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-[#0a0a0a] overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Fondo: foto del grupo con blur y opacidad */}
      {invite.photo_url && (
        <div
          className="absolute inset-0 scale-110 blur-md opacity-40"
          style={{
            backgroundImage: `url(${invite.photo_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Degradado oscuro sobre el fondo */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

      {/* Contenido */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo */}
        <p className="text-white/60 text-xs font-bold tracking-[0.25em] uppercase mb-12">
          OnlyFam
        </p>

        {/* Foto circular del grupo */}
        {invite.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={invite.photo_url}
            alt={invite.group_name}
            className="w-[120px] h-[120px] rounded-full object-cover border-[3px] border-white shadow-2xl mb-6"
          />
        ) : (
          <div className="w-[120px] h-[120px] rounded-full bg-white/10 border-[3px] border-white flex items-center justify-center mb-6 text-4xl">
            👨‍👩‍👧‍👦
          </div>
        )}

        {/* Nombre del grupo */}
        <h1 className="text-white text-4xl font-bold mb-3 leading-tight max-w-xs">
          {invite.group_name}
        </h1>

        {/* Subtítulo */}
        <p className="text-white/80 text-lg mb-3">
          <span className="font-semibold">{invite.sender_name}</span>{' '}
          te invita a este grupo privado
        </p>

        {/* Descripción */}
        <p className="text-white/50 text-base max-w-[260px] mb-12 leading-relaxed">
          Únete para ver los recuerdos y momentos del grupo
        </p>

        {/* CTA */}
        <a
          href="https://apps.apple.com"
          className="block w-full max-w-xs bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-lg font-semibold px-8 py-4 rounded-2xl shadow-lg transition-all text-center"
        >
          Unirme al grupo →
        </a>

        <p className="text-white/30 text-xs mt-5">Disponible en iOS</p>
      </div>
    </div>
  );
}
