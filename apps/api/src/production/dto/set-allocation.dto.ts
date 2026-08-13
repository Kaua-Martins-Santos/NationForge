import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { GoodType } from '../../../generated/prisma/enums';
import { MAX_ALLOCATION, MIN_ALLOCATION } from '../good-catalog';

/**
 * A decisão do jogador sobre a produção (CLAUDE.md seção 16).
 *
 * O bem vem no corpo, e não na URL, porque a rota altera uma decisão do país —
 * não um recurso próprio identificável por id. Fora de 0–100 a alocação
 * desviaria mais insumo do que foi extraído, e não há motivo legítimo para o
 * cliente enviar isso.
 */
export class SetAllocationDto {
  @IsEnum(GoodType)
  good!: GoodType;

  @IsInt()
  @Min(MIN_ALLOCATION)
  @Max(MAX_ALLOCATION)
  allocation!: number;
}
