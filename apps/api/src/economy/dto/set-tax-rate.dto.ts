import { IsInt, Max, Min } from 'class-validator';
import { MAX_TAX_RATE, MIN_TAX_RATE } from '../economy-calculations';

/**
 * A decisão econômica do jogador (CLAUDE.md seção 13).
 *
 * Os limites são validados aqui e no banco (Int): uma alíquota fora de 0–100
 * produziria receita negativa ou multiplicaria o PIB, e não há motivo legítimo
 * para o cliente enviar isso.
 */
export class SetTaxRateDto {
  @IsInt()
  @Min(MIN_TAX_RATE)
  @Max(MAX_TAX_RATE)
  taxRate!: number;
}
