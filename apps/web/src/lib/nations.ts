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

/**
 * Altera a alíquota de imposto.
 *
 * A resposta traz o país inteiro, não só a alíquota: mudar o imposto fecha o
 * período de simulação e move receita, tesouro e felicidade. Guardamos essa
 * resposta no cache em vez de invalidar a query — o estado novo já veio, e um
 * refetch só adicionaria um piscar.
 */
export function useSetTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taxRate: number) =>
      apiRequest('/nations/me/tax-rate', {
        method: 'PATCH',
        body: { taxRate },
        schema: nationSchema,
      }),
    onSuccess: (nation) => {
      queryClient.setQueryData(NATION_QUERY_KEY, nation);
    },
  });
}

/**
 * Altera a intensidade de extração de recursos.
 *
 * Como a alíquota, a resposta traz o país inteiro: a troca fecha o período de
 * simulação e mexe em reservas, tesouro e emissões de uma vez.
 */
export function useSetExtractionRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (extractionRate: number) =>
      apiRequest('/nations/me/extraction-rate', {
        method: 'PATCH',
        body: { extractionRate },
        schema: nationSchema,
      }),
    onSuccess: (nation) => {
      queryClient.setQueryData(NATION_QUERY_KEY, nation);
    },
  });
}

/**
 * Altera quanto de um insumo vai para a indústria.
 *
 * Uma mutation para todas as linhas, com o bem na variável: as linhas dividem a
 * mesma capacidade industrial, então mexer em uma muda as projeções das outras —
 * e a resposta traz o país inteiro justamente por isso.
 */
export function useSetProductionAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ good, allocation }: { good: string; allocation: number }) =>
      apiRequest('/nations/me/production', {
        method: 'PATCH',
        body: { good, allocation },
        schema: nationSchema,
      }),
    onSuccess: (nation) => {
      queryClient.setQueryData(NATION_QUERY_KEY, nation);
    },
  });
}
