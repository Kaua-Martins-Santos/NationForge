import { z } from 'zod';

/**
 * Formato esperado das respostas da API.
 *
 * Validar aqui não é desconfiança do nosso próprio backend: é o que impede que
 * uma mudança de contrato na API vire um `undefined` silencioso no meio da tela.
 * Com Zod, a divergência aparece imediatamente e com mensagem clara.
 */
export const sessionSchema = z.object({
  userId: z.string(),
  email: z.string(),
});

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  createdAt: z.string(),
});

export type Session = z.infer<typeof sessionSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;

/** Regras de entrada dos formulários, espelhando as validações do backend. */
export const registerFormSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  displayName: z
    .string()
    .min(3, 'O nome do jogador precisa de ao menos 3 caracteres.')
    .max(20, 'O nome do jogador aceita no máximo 20 caracteres.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Use apenas letras, números, hífen ou underscore.'),
  password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres.'),
});

export const loginFormSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type LoginFormValues = z.infer<typeof loginFormSchema>;
