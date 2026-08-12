import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './jwt.strategy';

/**
 * Extrai o usuário autenticado que o JwtStrategy anexou à requisição.
 *
 * Evita repetir o cast de `req.user` (que o Express tipa de forma ampla) em
 * cada rota protegida.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();

    return request.user;
  },
);
