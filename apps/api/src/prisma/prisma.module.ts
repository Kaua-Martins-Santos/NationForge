import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global: o acesso a dados é uma dependência transversal a praticamente todo
 * módulo de domínio futuro. Evita reimportar PrismaModule em cada um deles.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
