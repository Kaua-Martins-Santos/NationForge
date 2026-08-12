import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_COOKIE_NAME } from './auth-cookie';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * Lê o token do cookie httpOnly usado pelo navegador.
 *
 * Retornar null quando o cookie não existe faz o passport seguir para o
 * extractor seguinte, em vez de falhar a autenticação ali mesmo.
 */
function extractJwtFromCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;

  return cookies?.[AUTH_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Ordem importa: o navegador usa cookie; clientes fora do navegador
      // (curl, Postman, testes) continuam podendo mandar Authorization: Bearer.
      jwtFromRequest: ExtractJwt.fromExtractors<Request>([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email };
  }
}
