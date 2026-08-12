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
    const nation = await this.nationsService.create(currentUser.userId, dto);

    return toPublicNation(nation);
  }

  @Get('me')
  async getMyNation(@CurrentUser() currentUser: AuthenticatedUser): Promise<PublicNation> {
    const nation = await this.nationsService.findByUserIdOrFail(currentUser.userId);

    return toPublicNation(nation);
  }
}
