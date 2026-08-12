import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

/**
 * Módulo raiz da aplicação.
 *
 * Os módulos de domínio do jogo (usuários, países, economia, população...)
 * serão registrados aqui conforme forem implementados, cada um na sua fase.
 */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
