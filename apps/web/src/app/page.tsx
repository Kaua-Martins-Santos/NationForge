'use client';

import Link from 'next/link';
import { useLogout, useSession } from '../lib/auth';

export default function HomePage() {
  const session = useSession();
  const logout = useLogout();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">NationForge</h1>
        <p className="mt-2 text-lg text-neutral-400">Simulador multiplayer de países.</p>
      </div>

      {session.isLoading ? (
        <p className="text-neutral-500">Verificando sessão…</p>
      ) : session.data ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-md border border-neutral-800 bg-neutral-900/60 px-4 py-3">
            Sessão ativa como <span className="font-medium">{session.data.email}</span>
          </p>

          <p className="text-sm text-neutral-500">
            A criação do país e o painel com seus atributos chegam na próxima etapa.
          </p>

          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="self-start rounded-md border border-neutral-700 px-4 py-2 transition hover:border-neutral-500 disabled:opacity-50"
          >
            {logout.isPending ? 'Saindo…' : 'Sair'}
          </button>
        </div>
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
