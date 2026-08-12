import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  // Nome exibido a outros jogadores. Restringimos a letras, números, hífen e
  // underscore para evitar nomes com espaços invisíveis ou caracteres de controle
  // que permitiriam imitar outro jogador.
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'displayName deve conter apenas letras, números, hífen ou underscore.',
  })
  displayName!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
