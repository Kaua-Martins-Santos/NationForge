import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { POPULATION_DEFAULTS } from '../population/population-defaults';
import { PopulationService } from '../population/population.service';
import { PrismaService } from '../prisma/prisma.service';
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
  let prisma: { nation: { findUnique: jest.Mock; create: jest.Mock } };

  beforeEach(async () => {
    prisma = { nation: { findUnique: jest.fn(), create: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [NationsService, PopulationService, { provide: PrismaService, useValue: prisma }],
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
    /** O create usa escrita aninhada, então o mock devolve o país já com o estado. */
    function mockCreateEchoingData() {
      prisma.nation.create.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...args.data, populationState: { id: 'pop-1' } }),
      );
    }

    it('aplica os valores iniciais do servidor', async () => {
      prisma.nation.findUnique.mockResolvedValue(null);
      mockCreateEchoingData();

      await nationsService.create('user-1', VALID_DTO, NOW);

      const [createArgs] = prisma.nation.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];

      expect(createArgs.data).toMatchObject({
        userId: 'user-1',
        name: VALID_DTO.name,
        government: 'REPUBLIC',
        treasury: NATION_DEFAULTS.treasury,
        happiness: NATION_DEFAULTS.happiness,
      });
    });

    it('cria o estado demográfico na mesma operação que o país', async () => {
      prisma.nation.findUnique.mockResolvedValue(null);
      mockCreateEchoingData();

      await nationsService.create('user-1', VALID_DTO, NOW);

      const [createArgs] = prisma.nation.create.mock.calls[0] as [
        { data: { populationState?: { create: Record<string, unknown> } } },
      ];

      // Escrita aninhada = uma transação: um país sem demografia seria inválido.
      expect(createArgs.data.populationState?.create).toMatchObject({
        total: POPULATION_DEFAULTS.total,
        health: POPULATION_DEFAULTS.health,
        education: POPULATION_DEFAULTS.education,
        simulatedUntil: NOW,
      });
    });

    it('ignora atributos de jogo enviados pelo cliente', async () => {
      prisma.nation.findUnique.mockResolvedValue(null);
      mockCreateEchoingData();

      // Simula um cliente malicioso tentando escolher o próprio tesouro. O
      // ValidationPipe global já rejeitaria a requisição antes disso; este teste
      // garante que o service também não confia no dto.
      const maliciousDto = {
        ...VALID_DTO,
        treasury: '999999999.00',
        population: 50_000_000n,
      } as CreateNationDto;

      await nationsService.create('user-1', maliciousDto, NOW);

      const [createArgs] = prisma.nation.create.mock.calls[0] as [
        { data: Record<string, unknown> & { populationState: { create: { total: bigint } } } },
      ];

      expect(createArgs.data.treasury).toBe(NATION_DEFAULTS.treasury);
      expect(createArgs.data.populationState.create.total).toBe(POPULATION_DEFAULTS.total);
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
