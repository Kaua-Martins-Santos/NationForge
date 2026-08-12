'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '../lib/auth';

/**
 * Envolve telas que exigem sessão ativa.
 *
 * Esta é uma proteção de conveniência, não de segurança: quem controla o
 * navegador pode contornar qualquer verificação feita no cliente. A garantia real
 * está no backend, onde cada rota protegida exige o token (CLAUDE.md seção 33).
 * Aqui só evitamos mostrar uma tela vazia a quem não está logado.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();

  const isLoggedOut = session.isSuccess && session.data === null;

  useEffect(() => {
    if (isLoggedOut) {
      // replace e não push: o botão "voltar" não deve retornar a uma tela
      // protegida que o usuário não pode ver.
      router.replace('/login');
    }
  }, [isLoggedOut, router]);

  if (session.isLoading || isLoggedOut) {
    return <p className="p-6 text-ink-muted">Verificando sessão…</p>;
  }

  if (session.isError) {
    return <p className="p-6 text-ink-secondary">Não foi possível falar com o servidor.</p>;
  }

  return <>{children}</>;
}
