import type { CookieOptions, Response } from 'express';

/**
 * Nome do cookie que carrega o JWT.
 *
 * O token vive em um cookie httpOnly em vez de localStorage: assim o JavaScript
 * da página não consegue lê-lo, e uma falha de XSS no futuro não vira roubo de
 * sessão.
 */
export const AUTH_COOKIE_NAME = 'nationforge_token';

interface BuildCookieOptions {
  /** Em produção o cookie só deve trafegar por HTTPS. */
  secure: boolean;
  /** Tempo de vida em milissegundos, alinhado à expiração do JWT. */
  maxAgeMs: number;
}

function buildCookieOptions({ secure, maxAgeMs }: BuildCookieOptions): CookieOptions {
  return {
    httpOnly: true,
    secure,
    // 'lax' impede que o cookie seja enviado em requisições POST vindas de
    // outros sites, o que cobre os casos usuais de CSRF sem precisarmos de um
    // token anti-CSRF separado nesta fase.
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setAuthCookie(
  response: Response,
  token: string,
  options: BuildCookieOptions,
): void {
  response.cookie(AUTH_COOKIE_NAME, token, buildCookieOptions(options));
}

export function clearAuthCookie(response: Response, options: BuildCookieOptions): void {
  // Mesmas opções do set (menos maxAge): o navegador só remove o cookie quando
  // os atributos coincidem.
  response.clearCookie(AUTH_COOKIE_NAME, {
    ...buildCookieOptions(options),
    maxAge: undefined,
  });
}
