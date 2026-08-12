import { Controller, Get } from '@nestjs/common';

/**
 * Endpoint de verificação de saúde da API.
 *
 * Serve para confirmar que a aplicação está no ar (útil em deploy, monitoramento
 * e testes de integração). Não faz parte do domínio do jogo.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
