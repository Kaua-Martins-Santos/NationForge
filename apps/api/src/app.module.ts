import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { NationsModule } from './nations/nations.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

/**
 * Módulo raiz da aplicação.
 *
 * Os módulos de domínio do jogo (economia, população, indústria...) serão
 * registrados aqui conforme forem implementados, cada um na sua fase.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    NationsModule,
  ],
})
export class AppModule {}
