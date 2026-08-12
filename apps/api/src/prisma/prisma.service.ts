import { PrismaPg } from '@prisma/adapter-pg';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Encapsula o Prisma Client como um provider do NestJS.
 *
 * A partir do Prisma 7, o client não inclui mais um engine embutido: é
 * obrigatório passar um driver adapter (aqui, node-postgres via @prisma/adapter-pg).
 * Conecta no boot e desconecta no shutdown, para que o ciclo de vida do banco
 * acompanhe o ciclo de vida da aplicação em vez de abrir conexões avulsas.
 */
/**
 * Teto de conexões por instância do client.
 *
 * O padrão do driver é proporcional ao número de CPUs, o que estoura o
 * `max_connections` do Postgres quando várias suítes de teste rodam em paralelo
 * (cada uma cria seu próprio client) — ainda mais com um servidor de dev também
 * conectado. Um teto explícito e modesto torna o comportamento previsível.
 */
const DEFAULT_POOL_MAX = 10;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configService.getOrThrow<string>('DATABASE_URL'),
        max: Number(configService.get<string>('DATABASE_POOL_MAX') ?? DEFAULT_POOL_MAX),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
