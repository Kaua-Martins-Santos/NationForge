import { IsInt, Max, Min } from 'class-validator';
import { MAX_FARMLAND_SHARE, MIN_FARMLAND_SHARE } from '../agriculture-calculations';

/**
 * A decisão do jogador sobre a agricultura (CLAUDE.md seção 15).
 *
 * Acima de 100 o país plantaria mais terra do que possui, e não há motivo
 * legítimo para o cliente enviar isso.
 */
export class SetFarmlandShareDto {
  @IsInt()
  @Min(MIN_FARMLAND_SHARE)
  @Max(MAX_FARMLAND_SHARE)
  farmlandShare!: number;
}
