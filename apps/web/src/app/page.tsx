'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '../lib/auth';

export default function HomePage() {
  const router = useRouter();
  const session = useSession();

  const isLoggedIn = session.isSuccess && session.data !== null;

  useEffect(() => {
    // Quem já tem sessão vai direto ao painel: esta página é a porta de entrada
    // para visitantes.
    if (isLoggedIn) {
      router.replace('/dashboard');
    }
  }, [isLoggedIn, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">NationForge</h1>
        <p className="mt-2 text-lg text-ink-secondary">Simulador multiplayer de países.</p>
      </div>

      {session.isLoading || isLoggedIn ? (
        <p className="text-ink-muted">Verificando sessão…</p>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/register"
            className="rounded-md bg-neutral-100 px-4 py-2 font-medium text-neutral-900 transition hover:bg-white"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-neutral-700 px-4 py-2 transition hover:border-neutral-500"
          >
            Entrar
          </Link>
        </div>
      )}
    </main>
  );
}
