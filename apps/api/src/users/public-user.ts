import type { User } from '../../generated/prisma/client';

/**
 * Representação de um usuário segura para sair em respostas HTTP.
 *
 * O mapeamento é explícito de propósito: campos sensíveis (passwordHash) só
 * vazariam se alguém os adicionasse aqui deliberadamente. Uma abordagem baseada
 * em serialização automática esconderia essa decisão em decorators.
 */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}
