import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { SetFarmlandShareDto } from '../agriculture/dto/set-farmland-share.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { SetTaxRateDto } from '../economy/dto/set-tax-rate.dto';
import { SetAllocationDto } from '../production/dto/set-allocation.dto';
import { SetExtractionRateDto } from '../resources/dto/set-extraction-rate.dto';
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
    return toPublicNation(await this.nationsService.create(currentUser.userId, dto, new Date()));
  }

  @Get('me')
  async getMyNation(@CurrentUser() currentUser: AuthenticatedUser): Promise<PublicNation> {
    // A leitura põe a simulação em dia antes de responder: é o momento em que o
    // tempo decorrido offline vira população e dinheiro.
    return toPublicNation(
      await this.nationsService.findCurrentStateOrFail(currentUser.userId, new Date()),
    );
  }

  /**
   * A decisão econômica do jogador (CLAUDE.md seção 13).
   *
   * PATCH, e não POST: altera um atributo de um recurso que já existe. Devolve o
   * país inteiro porque mudar o imposto muda as projeções de receita e o rumo da
   * felicidade — o cliente precisa do estado novo, não só da alíquota.
   */
  @Patch('me/tax-rate')
  async setTaxRate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SetTaxRateDto,
  ): Promise<PublicNation> {
    return toPublicNation(
      await this.nationsService.setTaxRate(currentUser.userId, dto.taxRate, new Date()),
    );
  }

  /**
   * A decisão do jogador sobre os recursos (CLAUDE.md seção 14): extrair rápido
   * rende agora e esgota depois.
   */
  @Patch('me/extraction-rate')
  async setExtractionRate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SetExtractionRateDto,
  ): Promise<PublicNation> {
    return toPublicNation(
      await this.nationsService.setExtractionRate(
        currentUser.userId,
        dto.extractionRate,
        new Date(),
      ),
    );
  }

  /**
   * A decisão do jogador sobre a produção (CLAUDE.md seção 16): vender o insumo
   * bruto ou beneficiá-lo, se houver capacidade industrial para isso.
   *
   * Uma rota para todas as linhas, com o bem no corpo, em vez de uma rota por
   * bem: adicionar um bem ao catálogo não deve exigir mexer no controller.
   */
  @Patch('me/production')
  async setProductionAllocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SetAllocationDto,
  ): Promise<PublicNation> {
    return toPublicNation(
      await this.nationsService.setProductionAllocation(
        currentUser.userId,
        dto.good,
        dto.allocation,
        new Date(),
      ),
    );
  }

  /**
   * A decisão do jogador sobre a agricultura (CLAUDE.md seção 15): quanto do
   * território virar lavoura — comida contra tesouro.
   */
  @Patch('me/farmland')
  async setFarmlandShare(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SetFarmlandShareDto,
  ): Promise<PublicNation> {
    return toPublicNation(
      await this.nationsService.setFarmlandShare(currentUser.userId, dto.farmlandShare, new Date()),
    );
  }
}
