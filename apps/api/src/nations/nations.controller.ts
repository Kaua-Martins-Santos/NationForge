import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateNationDto } from './dto/create-nation.dto';
import { NationsService } from './nations.service';
import { toPublicNation, type PublicNation } from './public-nation';

/**
 * O país é sempre derivado do token, nunca de um id na URL.
 *
 * Não existe rota para ver o país de outro jogador: visualização pública chega
 * com rankings (Fase 27) e diplomacia (Fase 22), que definirão o que é
 * legítimo expor de terceiros.
 */
@Controller('nations')
@UseGuards(JwtAuthGuard)
export class NationsController {
  constructor(private readonly nationsService: NationsService) {}

  @Post()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateNationDto,
  ): Promise<PublicNation> {
    const { nation, population } = await this.nationsService.create(
      currentUser.userId,
      dto,
      new Date(),
    );

    return toPublicNation(nation, population);
  }

  @Get('me')
  async getMyNation(@CurrentUser() currentUser: AuthenticatedUser): Promise<PublicNation> {
    // A leitura põe a simulação em dia antes de responder: é o momento em que o
    // tempo decorrido offline vira crescimento populacional.
    const { nation, population } = await this.nationsService.findCurrentStateOrFail(
      currentUser.userId,
      new Date(),
    );

    return toPublicNation(nation, population);
  }
}
