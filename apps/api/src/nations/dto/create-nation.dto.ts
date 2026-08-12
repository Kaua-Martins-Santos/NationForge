import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { GovernmentType } from '../../../generated/prisma/enums';

/**
 * Só o que o jogador legitimamente escolhe.
 *
 * População, tesouro, PIB e demais atributos são definidos pelo servidor
 * (ver NATION_DEFAULTS). Com o ValidationPipe global usando
 * `forbidNonWhitelisted`, tentar enviar qualquer outro campo resulta em 400.
 */
export class CreateNationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  name!: string;

  /** Emoji da bandeira. Não é upload de imagem: ver README. */
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  flag!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  capital!: string;

  @IsEnum(GovernmentType)
  government!: GovernmentType;
}
