import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, apiRequest } from './api';
import { nationSchema, type CreateNationFormValues, type Nation } from './schemas';

export const NATION_QUERY_KEY = ['nation'] as const;

/**
 * País do jogador autenticado.
 *
 * `null` significa "o jogador ainda não criou um país" — um estado normal do
 * fluxo, não um erro. A API responde 404 nesse caso, então traduzimos aqui em
 * vez de deixar cada tela interpretar o status.
 */
export function useNation(): UseQueryResult<Nation | null> {
  return useQuery({
    queryKey: NATION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiRequest('/nations/me', { schema: nationSchema });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    retry: false,
  });
}

export function useCreateNation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateNationFormValues) =>
      apiRequest('/nations', { method: 'POST', body: values, schema: nationSchema }),
    onSuccess: (nation) => {
      // Semeia o cache com o país recém-criado: o dashboard abre já preenchido,
      // sem um segundo request nem um piscar de "carregando".
      queryClient.setQueryData(NATION_QUERY_KEY, nation);
    },
  });
}
