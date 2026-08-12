import { IsInt, Max, Min } from 'class-validator';
import { MAX_EXTRACTION_RATE, MIN_EXTRACTION_RATE } from '../resource-extraction';

/**
 * A decisão do jogador sobre os recursos (CLAUDE.md seção 14).
 *
 * Fora de 0–100 a intensidade extrairia mais do que existe ou geraria reservas
 * do nada, e não há motivo legítimo para o cliente enviar isso.
 */
export class SetExtractionRateDto {
  @IsInt()
  @Min(MIN_EXTRACTION_RATE)
  @Max(MAX_EXTRACTION_RATE)
  extractionRate!: number;
}
