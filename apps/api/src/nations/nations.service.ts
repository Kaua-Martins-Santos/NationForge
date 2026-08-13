import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Nation } from '../../generated/prisma/client';
import type { GoodType } from '../../generated/prisma/enums';
import { EconomyService } from '../economy/economy.service';
import { PopulationService } from '../population/population.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionService } from '../production/production.service';
import { ResourcesService } from '../resources/resources.service';
import { SimulationService, type SimulatedNation } from '../simulation/simulation.service';
import type { CreateNationDto } from './dto/create-nation.dto';
import { NATION_DEFAULTS } from './nation-defaults';

@Injectable()
export class NationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly populationService: PopulationService,
    private readonly economyService: EconomyService,
    private readonly resourcesService: ResourcesService,
    private readonly productionService: ProductionService,
    private readonly simulationService: SimulationService,
  ) {}

  findByUserId(userId: string): Promise<Nation | null> {
    return this.prisma.nation.findUnique({ where: { userId } });
  }

  async findByUserIdOrFail(userId: string): Promise<Nation> {
    const nation = await this.findByUserId(userId);

    if (!nation) {
      throw new NotFoundException('Você ainda não criou um país.');
    }

    return nation;
  }

  /**
   * Carrega o país com todos os domínios, sem simular.
   *
   * Separado de `findCurrentStateOrFail` porque escrever também precisa do
   * estado completo — e precisa dele já simulado antes de alterar qualquer coisa.
   */
  private async loadOrFail(userId: string): Promise<SimulatedNation> {
    const nation = await this.prisma.nation.findUnique({
      where: { userId },
      include: {
        populationState: true,
        economyState: true,
        resourceState: { include: { deposits: true } },
        productionLines: true,
      },
    });

    if (!nation) {
      throw new NotFoundException('Você ainda não criou um país.');
    }

    // Todo país é criado junto dos seus domínios, na mesma transação — então a
    // ausência aqui significaria dado corrompido, não um caso normal.
    if (!nation.populationState || !nation.economyState || !nation.resourceState) {
      throw new NotFoundException('Estado interno do país não encontrado.');
    }

    return {
      nation,
      population: nation.populationState,
      economy: nation.economyState,
      resources: nation.resourceState,
      production: nation.productionLines,
    };
  }

  /**
   * Carrega o país com a simulação em dia.
   *
   * Pôr o país em dia é responsabilidade da leitura porque não existe processo
   * em background: o país evolui quando alguém olha para ele, com base no tempo
   * decorrido (CLAUDE.md seção 26).
   */
  async findCurrentStateOrFail(userId: string, now: Date): Promise<SimulatedNation> {
    return this.simulationService.advance(await this.loadOrFail(userId), now);
  }

  /**
   * Altera a alíquota de imposto.
   *
   * **Simula antes de alterar.** Sem isso, o jogador poderia ficar um mês com
   * imposto zero (felicidade subindo), colocar 100% um instante antes da
   * próxima leitura e arrecadar o mês inteiro na alíquota nova. A simulação
   * fecha o período na alíquota que de fato valeu nele.
   */
  async setTaxRate(userId: string, taxRate: number, now: Date): Promise<SimulatedNation> {
    const current = await this.findCurrentStateOrFail(userId, now);

    const economy = await this.prisma.economyState.update({
      where: { id: current.economy.id },
      data: { taxRate },
    });

    return { ...current, economy };
  }

  /**
   * Altera a intensidade de extração de recursos.
   *
   * Simula antes de alterar, pelo mesmo motivo do `setTaxRate`: o período que já
   * passou tem de ser fechado na intensidade que de fato valeu nele, senão
   * bastaria deixar em zero e subir para 100% um instante antes da leitura para
   * extrair o mês inteiro no máximo.
   */
  async setExtractionRate(
    userId: string,
    extractionRate: number,
    now: Date,
  ): Promise<SimulatedNation> {
    const current = await this.findCurrentStateOrFail(userId, now);

    const resourceState = await this.prisma.resourceState.update({
      where: { id: current.resources.id },
      data: { extractionRate },
      include: { deposits: true },
    });

    return { ...current, resources: resourceState };
  }

  /**
   * Altera quanto de um insumo vai para a indústria.
   *
   * Simula antes de alterar, como as demais decisões: o período que já passou
   * precisa ser fechado na alocação que de fato valeu nele.
   *
   * A linha é encontrada pelo par (país, bem), que é único — o cliente manda o
   * bem, nunca o id da linha, para não haver como tentar alterar a produção de
   * outro jogador.
   */
  async setProductionAllocation(
    userId: string,
    good: GoodType,
    allocation: number,
    now: Date,
  ): Promise<SimulatedNation> {
    const current = await this.findCurrentStateOrFail(userId, now);

    await this.prisma.productionLine.update({
      where: { nationId_good: { nationId: current.nation.id, good } },
      data: { allocation },
    });

    return {
      ...current,
      production: current.production.map((line) =>
        line.good === good ? { ...line, allocation } : line,
      ),
    };
  }

  async create(userId: string, dto: CreateNationDto, now: Date): Promise<SimulatedNation> {
    const existingNation = await this.findByUserId(userId);
    if (existingNation) {
      throw new ConflictException('Você já possui um país.');
    }

    const nameOwner = await this.prisma.nation.findUnique({ where: { name: dto.name } });
    if (nameOwner) {
      throw new ConflictException('Já existe um país com esse nome.');
    }

    // Os atributos vêm de NATION_DEFAULTS, nunca do dto: o jogador escolhe apenas
    // identidade (nome, bandeira, capital, governo).
    //
    // A escrita aninhada roda em uma única transação: um país sem seus domínios
    // seria um registro inválido, e a criação parcial deixaria exatamente isso
    // no banco.
    const nation = await this.prisma.nation.create({
      data: {
        userId,
        name: dto.name,
        flag: dto.flag,
        capital: dto.capital,
        government: dto.government,
        ...NATION_DEFAULTS,
        // O marco começa agora: um país recém-fundado não tem passado a simular.
        simulatedUntil: now,
        populationState: { create: this.populationService.buildInitialState() },
        economyState: { create: this.economyService.buildInitialState() },
        resourceState: { create: this.resourcesService.buildInitialState() },
        productionLines: { create: this.productionService.buildInitialLines() },
      },
      include: {
        populationState: true,
        economyState: true,
        resourceState: { include: { deposits: true } },
        productionLines: true,
      },
    });

    // O include garante os valores; o if existe para satisfazer o tipo.
    if (!nation.populationState || !nation.economyState || !nation.resourceState) {
      throw new Error('Falha ao criar o estado interno do país.');
    }

    return {
      nation,
      population: nation.populationState,
      economy: nation.economyState,
      resources: nation.resourceState,
      production: nation.productionLines,
    };
  }
}
