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

export const GOVERNMENT_TYPES = ['DEMOCRACY', 'MONARCHY', 'DICTATORSHIP', 'REPUBLIC'] as const;

/** Rótulos em português para os valores do enum do backend. */
export const GOVERNMENT_LABELS: Record<(typeof GOVERNMENT_TYPES)[number], string> = {
  DEMOCRACY: 'Democracia',
  MONARCHY: 'Monarquia',
  DICTATORSHIP: 'Ditadura',
  REPUBLIC: 'República',
};

/**
 * Domínio População, aninhado na resposta do país.
 *
 * A API espelha na resposta a separação que existe no banco: cada domínio do jogo
 * tem seu próprio objeto.
 */
export const populationSchema = z.object({
  total: z.number(),
  employed: z.number(),
  unemployed: z.number(),
  unemploymentRate: z.number(),
  birthRatePerThousand: z.number(),
  deathRatePerThousand: z.number(),
  health: z.number(),
  education: z.number(),
});

export type Population = z.infer<typeof populationSchema>;

/**
 * Domínio Economia.
 *
 * Os valores anuais são projeções calculadas pelo servidor com as mesmas
 * fórmulas que o tick usa — o cliente nunca recalcula regra de jogo, só exibe.
 */
export const economySchema = z.object({
  treasury: z.number(),
  taxRate: z.number(),
  gdp: z.number(),
  annualRevenue: z.number(),
  annualExpenses: z.number(),
  annualBalance: z.number(),
});

export type Economy = z.infer<typeof economySchema>;

/**
 * Domínio Recursos.
 *
 * `label` vem do servidor, e não de um dicionário aqui: o nome do recurso é
 * parte do catálogo, e duplicá-lo no cliente criaria dois lugares para manter
 * sincronizados a cada recurso novo.
 */
export const depositSchema = z.object({
  type: z.string(),
  label: z.string(),
  reserves: z.number(),
  extractedTotal: z.number(),
  annualExtraction: z.number(),
  annualRevenue: z.number(),
  yearsRemaining: z.number().nullable(),
});

export const resourcesSchema = z.object({
  extractionRate: z.number(),
  annualRevenue: z.number(),
  deposits: z.array(depositSchema),
});

export type Deposit = z.infer<typeof depositSchema>;
export type Resources = z.infer<typeof resourcesSchema>;

/**
 * Domínio Produção.
 *
 * Como em Recursos, os rótulos e as projeções vêm prontos do servidor: a receita
 * de cada bem é regra de jogo, e recalculá-la aqui criaria uma segunda versão
 * dela fadada a divergir.
 */
export const productionLineSchema = z.object({
  good: z.string(),
  label: z.string(),
  input: z.string(),
  inputLabel: z.string(),
  inputPerUnit: z.number(),
  allocation: z.number(),
  producedTotal: z.number(),
  annualProduction: z.number(),
  annualInputConsumed: z.number(),
  annualValueAdded: z.number(),
  hasInput: z.boolean(),
});

export const productionSchema = z.object({
  lines: z.array(productionLineSchema),
  annualValueAdded: z.number(),
  annualCapacity: z.number(),
  annualDemand: z.number(),
  capacityUsage: z.number(),
});

export type ProductionLine = z.infer<typeof productionLineSchema>;
export type Production = z.infer<typeof productionSchema>;

export const nationSchema = z.object({
  id: z.string(),
  name: z.string(),
  flag: z.string(),
  capital: z.string(),
  government: z.enum(GOVERNMENT_TYPES),
  population: populationSchema,
  economy: economySchema,
  resources: resourcesSchema,
  production: productionSchema,
  territory: z.number(),
  happiness: z.number(),
  stability: z.number(),
  technology: z.number(),
  militaryPower: z.number(),
  infrastructure: z.number(),
  emissions: z.number(),
  createdAt: z.string(),
  /** Até quando a simulação está aplicada — o "as of" de todos os números. */
  simulatedUntil: z.string(),
});

export type Nation = z.infer<typeof nationSchema>;

/** A decisão econômica do jogador, com os mesmos limites que o backend valida. */
export const taxRateFormSchema = z.object({
  taxRate: z
    .number()
    .int('A alíquota precisa ser um número inteiro.')
    .min(0, 'A alíquota mínima é 0%.')
    .max(100, 'A alíquota máxima é 100%.'),
});

export type TaxRateFormValues = z.infer<typeof taxRateFormSchema>;

export const createNationFormSchema = z.object({
  name: z
    .string()
    .min(3, 'O nome do país precisa de ao menos 3 caracteres.')
    .max(40, 'O nome do país aceita no máximo 40 caracteres.'),
  flag: z
    .string()
    .min(1, 'Escolha uma bandeira.')
    .max(16, 'A bandeira aceita no máximo 16 caracteres.'),
  capital: z
    .string()
    .min(2, 'O nome da capital precisa de ao menos 2 caracteres.')
    .max(40, 'O nome da capital aceita no máximo 40 caracteres.'),
  government: z.enum(GOVERNMENT_TYPES),
});

export type CreateNationFormValues = z.infer<typeof createNationFormSchema>;
