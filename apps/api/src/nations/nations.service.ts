import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Nation, PopulationState } from '../../generated/prisma/client';
import { PopulationService } from '../population/population.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNationDto } from './dto/create-nation.dto';
import { NATION_DEFAULTS } from './nation-defaults';

/** Um país com o domínio População carregado junto. */
export interface NationWithPopulation {
  nation: Nation;
  population: PopulationState;
}

@Injectable()
export class NationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly populationService: PopulationService,
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
   * Carrega o país com a simulação em dia.
   *
   * Pôr a demografia em dia é responsabilidade da leitura porque não existe
   * processo em background: o país evolui quando alguém olha para ele, com base
   * no tempo decorrido (CLAUDE.md seção 26).
   */
  async findCurrentStateOrFail(userId: string, now: Date): Promise<NationWithPopulation> {
    const nation = await this.prisma.nation.findUnique({
      where: { userId },
      include: { populationState: true },
    });

    if (!nation) {
      throw new NotFoundException('Você ainda não criou um país.');
    }

    // Todo país é criado junto do seu estado demográfico, na mesma transação —
    // então a ausência aqui significaria dado corrompido, não um caso normal.
    if (!nation.populationState) {
      throw new NotFoundException('Estado demográfico do país não encontrado.');
    }

    const population = await this.populationService.advance(nation, nation.populationState, now);

    return { nation, population };
  }

  async create(userId: string, dto: CreateNationDto, now: Date): Promise<NationWithPopulation> {
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
    // A escrita aninhada roda em uma única transação: um país sem estado
    // demográfico seria um registro inválido, e a criação parcial deixaria
    // exatamente isso no banco.
    const nation = await this.prisma.nation.create({
      data: {
        userId,
        name: dto.name,
        flag: dto.flag,
        capital: dto.capital,
        government: dto.government,
        ...NATION_DEFAULTS,
        populationState: {
          create: this.populationService.buildInitialState(now),
        },
      },
      include: { populationState: true },
    });

    // O include garante o valor; o if existe para satisfazer o tipo.
    if (!nation.populationState) {
      throw new Error('Falha ao criar o estado demográfico do país.');
    }

    return { nation, population: nation.populationState };
  }
}
