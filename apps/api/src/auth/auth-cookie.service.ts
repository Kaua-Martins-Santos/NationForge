import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import ms, { type StringValue } from 'ms';
import { clearAuthCookie, setAuthCookie } from './auth-cookie';

const DEFAULT_TOKEN_EXPIRATION: StringValue = '1d';

/**
 * Aplica e remove o cookie de autenticação.
 *
 * Existe para que o tempo de vida do cookie derive da MESMA variável de ambiente
 * que define a expiração do JWT (JWT_EXPIRES_IN). Se fossem configurados em
 * lugares separados, o cookie poderia sobreviver a um token expirado — ou o
 * contrário — e a sessão falharia de formas confusas.
 */
@Injectable()
export class AuthCookieService {
  private readonly secure: boolean;
  private readonly maxAgeMs: number;

  constructor(configService: ConfigService) {
    // Cookie só por HTTPS fora de desenvolvimento.
    this.secure = configService.get<string>('NODE_ENV') === 'production';

    const expiresIn = configService.get<StringValue>('JWT_EXPIRES_IN', DEFAULT_TOKEN_EXPIRATION);
    this.maxAgeMs = ms(expiresIn);
  }

  set(response: Response, token: string): void {
    setAuthCookie(response, token, { secure: this.secure, maxAgeMs: this.maxAgeMs });
  }

  clear(response: Response): void {
    clearAuthCookie(response, { secure: this.secure, maxAgeMs: this.maxAgeMs });
  }
}
