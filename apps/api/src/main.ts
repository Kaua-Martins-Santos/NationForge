import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

const DEFAULT_PORT = 3333;
const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  // O frontend roda em outra porta, então precisa de CORS. `credentials: true` é
  // obrigatório para o navegador enviar e aceitar o cookie de sessão — e, com
  // credentials, a origem precisa ser explícita: o coringa "*" é rejeitado pelo
  // próprio navegador nesse modo.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);

  Logger.log(`API disponível em http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
