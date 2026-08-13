import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AGRICULTURE_DEFAULTS } from '../agriculture/agriculture-defaults';
import { AgricultureService } from '../agriculture/agriculture.service';
import { ECONOMY_DEFAULTS } from '../economy/economy-defaults';
import { EconomyService } from '../economy/economy.service';
import { POPULATION_DEFAULTS } from '../population/population-defaults';
import { PopulationService } from '../population/population.service';
import { PrismaService } from '../prisma/prisma.service';
import { GOOD_ORDER } from '../production/good-catalog';
import { PRODUCTION_DEFAULTS } from '../production/production-defaults';
import { ProductionService } from '../production/production.service';
import { RESOURCE_DEFAULTS } from '../resources/resource-defaults';
import { ResourcesService } from '../resources/resources.service';
import { SimulationService } from '../simulation/simulation.service';
import type { CreateNationDto } from './dto/create-nation.dto';
import { NATION_DEFAULTS } from './nation-defaults';
import { NationsService } from './nations.service';

const VALID_DTO: CreateNationDto = {
  name: 'República de Aurora',
  flag: '🏳️',
  capital: 'Aurora',
  government: 'REPUBLIC',
};

const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('NationsService', () => {
  let nationsService: NationsService;
  let prisma: {
    nation: { findUnique: jest.Mock; create: jest.Mock };
    economyState: { update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      nation: { findUnique: jest.fn(), create: jest.fn() },
      economyState: { update: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NationsService,
        PopulationService,
        EconomyService,
        ResourcesService,
        ProductionService,
        AgricultureService,
        SimulationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    nationsService = moduleRef.get(NationsService);
  });

  describe('findByUserIdOrFail', () => {
    it('lança NotFound quando o jogador ainda não tem país', async () => {
      prisma.nation.findUnique.mockResolvedValue(null);

      await expect(nationsService.findByUserIdOrFail('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    /** O create usa escrita aninhada, então o mock devolve o país já com os estados. */
    function mockCreateEchoingData() {
      prisma.nation.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...args.data,
          populationState: { id: 'pop-1' },
          economyState: { id: 'eco-1' },
          resourceState: { id: 'res-1', deposits: [] },
          productionLines: [],
          agricultureState: { id: 'agr-1' },
        }),
      );
    }

    function createArgs(): { data: Record<string, unknown> } {
      const [args] = prisma.nation.create.mock.calls[0] as [{ data: Record<string, unknown> }];

      return args;
    }

    it('aplica os valores iniciais do servidor', async () => {
      prisma.nation.findUnique.mockResolvedValue(null);
      mockCreateEchoingData();

      await nationsService.create('user-1', VALID_DTO, NOW);

      expect(createArgs().data).toMatchObject({
        userId: 'user-1',
        name: VALID_DTO.name,
        government: 'REPUBLIC',
        happiness: NATION_DEFAULTS.happiness,
        // O marco começa agora: um país recém-fundado não tem passado a simular.
        simulatedUntil: NOW,
      });
    });

    it('cria os estados de todos os domínios na mesma operação que o país', async () => {
      prisma.nation.findUnique.mockResolvedValue(null);
      mockCreateEchoingData();

      await nationsService.create('user-1', VALID_DTO, NOW);

      const data = createArgs().data as {
        populationState: { create: Record<string, unknown> };
        economyState: { create: Record<string, unknown> };
        resourceState: {
          create: {
            extractionRate: number;
            seed: number;
            deposits: { create: { type: string; reserves: bigint }[] };
          };
        };
        productionLines: { create: { good: string; allocation: number }[] };
        agricultureState: {
          create: { farmlandShare: number; foodStock: bigint; weatherSeed: number };
        };
      };

      // Escrita aninhada = uma transação: um país sem seus domínios seria inválido.
      expect(data.populationState.create).toMatchObject({
        total: POPULATION_DEFAULTS.total,
        health: POPULATION_DEFAULTS.health,
        education: POPULATION_DEFAULTS.education,
      });

      expect(data.economyState.create).toMatchObject({
        treasuryCents: ECONOMY_DEFAULTS.treasuryCents,
        taxRate: ECONOMY_DEFAULTS.taxRate,
      });

      expect(data.resourceState.create.extractionRate).toBe(RESOURCE_DEFAULTS.extractionRate);

      // A dotação natural vem sorteada junto, com o mínimo jogável garantido.
      expect(data.resourceState.create.deposits.create.length).toBeGreaterThanOrEqual(3);

      // Uma linha de produção por bem do catálogo, inclusive para os bens cujo
      // insumo o país não sorteou — a decisão existe antes do insumo.
      expect(data.productionLines.create).toHaveLength(GOOD_ORDER.length);
      expect(data.productionLines.create[0]!.allocation).toBe(PRODUCTION_DEFAULTS.allocation);

      expect(data.agricultureState.create).toMatchObject({
        farmlandShare: AGRICULTURE_DEFAULTS.farmlandShare,
        foodStock: AGRICULTURE_DEFAULTS.foodStock,
      });

      // A semente do clima é sorteada pelo servidor, como a da dotação natural.
      expect(data.agricultureState.create.weatherSeed).toEqual(expect.any(Number));
    });

    it('ignora atributos de jogo enviados pelo cliente', async () => {
      prisma.nation.findUnique.mockResolvedValue(null);
      mockCreateEchoingData();

      // Simula um cliente malicioso tentando escolher o próprio tesouro e a
      // própria alíquota. O ValidationPipe global já rejeitaria a requisição
      // antes disso; este teste garante que o service também não confia no dto.
      const maliciousDto = {
        ...VALID_DTO,
        treasuryCents: 999_999_999_900n,
        taxRate: 0,
        population: 50_000_000n,
      } as CreateNationDto;

      await nationsService.create('user-1', maliciousDto, NOW);

      const data = createArgs().data as {
        treasuryCents?: unknown;
        taxRate?: unknown;
        populationState: { create: { total: bigint } };
        economyState: { create: { treasuryCents: bigint; taxRate: number } };
      };

      // Os campos do cliente não viram colunas da nação...
      expect(data.treasuryCents).toBeUndefined();
      expect(data.taxRate).toBeUndefined();

      // ...nem contaminam os domínios, que usam sempre os defaults do servidor.
      expect(data.economyState.create.treasuryCents).toBe(ECONOMY_DEFAULTS.treasuryCents);
      expect(data.economyState.create.taxRate).toBe(ECONOMY_DEFAULTS.taxRate);
      expect(data.populationState.create.total).toBe(POPULATION_DEFAULTS.total);
    });

    it('rejeita quando o jogador já tem um país', async () => {
      prisma.nation.findUnique.mockResolvedValue({ id: 'nation-1' });

      await expect(nationsService.create('user-1', VALID_DTO, NOW)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.nation.create).not.toHaveBeenCalled();
    });

    it('rejeita quando o nome do país já existe', async () => {
      prisma.nation.findUnique
        .mockResolvedValueOnce(null) // busca por userId: jogador sem país
        .mockResolvedValueOnce({ id: 'nation-de-outro' }); // busca por name: ocupado

      await expect(nationsService.create('user-1', VALID_DTO, NOW)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.nation.create).not.toHaveBeenCalled();
    });
  });
});
