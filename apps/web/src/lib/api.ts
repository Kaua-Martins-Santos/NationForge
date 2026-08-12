import type { z } from 'zod';

const DEFAULT_API_URL = 'http://localhost:3333';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

/** Erro de uma resposta HTTP sem sucesso, já com o status para quem chamou decidir. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions<TSchema extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Quando informado, a resposta é validada por este schema. */
  schema?: TSchema;
}

/**
 * Extrai a mensagem de erro do corpo da resposta do NestJS.
 *
 * O Nest devolve `message` como string ou como array (uma entrada por campo
 * inválido, quando o ValidationPipe rejeita o corpo).
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const { message } = body as { message: unknown };

      if (Array.isArray(message)) {
        return message.join(' ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }
  } catch {
    // Resposta sem JSON: cai na mensagem genérica abaixo.
  }

  return `Erro ${response.status} ao chamar a API.`;
}

export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  options: RequestOptions<TSchema> = {},
): Promise<z.infer<TSchema>> {
  const { method = 'GET', body, schema } = options;

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    // Essencial para o cookie httpOnly de sessão ser enviado e recebido: sem
    // isso o navegador ignora o cookie em requisições cross-origin.
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as z.infer<TSchema>;
  }

  const data: unknown = await response.json();

  return schema ? (schema.parse(data) as z.infer<TSchema>) : (data as z.infer<TSchema>);
}
