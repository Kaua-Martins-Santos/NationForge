import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/**
 * Configuração compartilhada entre o servidor real e os testes e2e.
 *
 * Existe para que os testes exercitem exatamente a mesma aplicação que roda em
 * produção. Quando cada teste montava a app por conta própria, era possível um
 * middleware existir só no main.ts — e os testes passarem enquanto o servidor
 * real estava mal configurado (ou o contrário).
 *
 * CORS fica de fora: depende da origem do ambiente e não afeta os testes, que
 * não passam por um navegador.
 */
export function configureApp(app: INestApplication): void {
  // O JWT chega em um cookie httpOnly; sem o parser, req.cookies é undefined e a
  // JwtStrategy não encontraria o token.
  app.use(cookieParser());

  // Regras de negócio não devem confiar no que chega do frontend (seção 33 do
  // CLAUDE.md). O ValidationPipe global rejeita qualquer request cujo corpo não
  // bata com os decorators do DTO, sem validar campo a campo em cada controller.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
}
