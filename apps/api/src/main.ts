import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3333;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Regras de negócio não devem confiar no que chega do frontend (seção 33 do
  // CLAUDE.md). O ValidationPipe global rejeita qualquer request cujo corpo
  // não bata com os decorators do DTO, sem precisar validar campo a campo em
  // cada controller.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);

  Logger.log(`API disponível em http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
