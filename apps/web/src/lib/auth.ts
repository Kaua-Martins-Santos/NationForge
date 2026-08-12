import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, apiRequest } from './api';
import {
  sessionSchema,
  type LoginFormValues,
  type RegisterFormValues,
  type Session,
} from './schemas';

export const SESSION_QUERY_KEY = ['session'] as const;

/**
 * Estado da sessão atual.
 *
 * Como o token está em um cookie httpOnly, o frontend não consegue inspecioná-lo:
 * a única forma de saber se há sessão válida é perguntar à API. Um 401 aqui
 * significa "não logado" — um caso esperado, não um erro a ser exibido.
 */
export function useSession(): UseQueryResult<Session | null> {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiRequest('/auth/me', { schema: sessionSchema });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }

        throw error;
      }
    },
    // Não faz sentido tentar de novo: 401 é uma resposta definitiva.
    retry: false,
  });
}

// register e login devolvem { accessToken } no corpo, útil para clientes fora do
// navegador. Aqui ignoramos esse corpo de propósito: no navegador a sessão vive
// no cookie httpOnly, e guardar o token em JavaScript anularia essa proteção.
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: RegisterFormValues): Promise<void> => {
      await apiRequest('/auth/register', { method: 'POST', body: values });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: LoginFormValues): Promise<void> => {
      await apiRequest('/auth/login', { method: 'POST', body: values });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiRequest('/auth/logout', { method: 'POST' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  });
}
