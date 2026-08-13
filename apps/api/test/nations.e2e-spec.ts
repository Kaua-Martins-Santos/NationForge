import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/configure-app';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ECONOMY_DEFAULTS } from '../src/economy/economy-defaults';
import { NATION_DEFAULTS } from '../src/nations/nation-defaults';
import { POPULATION_DEFAULTS } from '../src/population/population-defaults';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Nations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const suffix = Date.now().toString(36);
  const email = `e2e-nations-${suffix}@nationforge.dev`;
  const displayName = `nat${suffix}`;
  const password = 'senha-forte-123';
  const nationName = `Aurora ${suffix}`;

  const validNation = {
    name: nationName,
    flag: '🏳️',
    capital: 'Cidade Aurora',
    government: 'REPUBLIC',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, displayName, password })
      .expect(201);

    accessToken = (registerResponse.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    // nations é apagado em cascata junto com o usuário (onDelete: Cascade).
    await prisma.user.deleteMany({ where: { email: { contains: `e2e-nations-${suffix}` } } });
    await app.close();
  });

  function authenticated(method: 'get' | 'post' | 'patch', path: string) {
    return request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${accessToken}`);
  }

  /**
   * Empurra o marco da simulação para o passado direto no banco, simulando um
   * jogador que ficou offline — sem precisar esperar horas de verdade.
   */
  async function rewindSimulation(hours: number): Promise<void> {
    await prisma.nation.update({
      where: { name: nationName },
      data: { simulatedUntil: new Date(Date.now() - hours * 60 * 60 * 1000) },
    });
  }

  it('exige autenticação', async () => {
    await request(app.getHttpServer()).get('/nations/me').expect(401);
    await request(app.getHttpServer()).post('/nations').send(validNation).expect(401);
  });

  it('retorna 404 antes de o país existir', async () => {
    await authenticated('get', '/nations/me').expect(404);
  });

  it('rejeita governo inválido', async () => {
    await authenticated('post', '/nations')
      .send({ ...validNation, government: 'TECNOCRACIA' })
      .expect(400);
  });

  it('rejeita nome curto', async () => {
    await authenticated('post', '/nations')
      .send({ ...validNation, name: 'ab' })
      .expect(400);
  });

  it('rejeita tentativa de definir o próprio tesouro', async () => {
    await authenticated('post', '/nations')
      .send({ ...validNation, treasury: 999999999 })
      .expect(400);
  });

  it('cria o país com os valores iniciais do servidor', async () => {
    const response = await authenticated('post', '/nations').send(validNation).expect(201);

    expect(response.body).toMatchObject({
      name: nationName,
      capital: 'Cidade Aurora',
      government: 'REPUBLIC',
      happiness: NATION_DEFAULTS.happiness,
      emissions: NATION_DEFAULTS.emissions,
      population: {
        total: Number(POPULATION_DEFAULTS.total),
        health: POPULATION_DEFAULTS.health,
        education: POPULATION_DEFAULTS.education,
      },
      economy: {
        treasury: Number(ECONOMY_DEFAULTS.treasuryCents) / 100,
        taxRate: ECONOMY_DEFAULTS.taxRate,
      },
    });
    expect(response.body).toHaveProperty('id');
  });

  it('rejeita criar um segundo país para o mesmo jogador', async () => {
    await authenticated('post', '/nations')
      .send({ ...validNation, name: `${nationName} II` })
      .expect(409);
  });

  it('rejeita nome de país já usado por outro jogador', async () => {
    const outroEmail = `e2e-nations-${suffix}-b@nationforge.dev`;
    const outroRegistro = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: outroEmail, displayName: `${displayName}b`, password })
      .expect(201);

    const outroToken = (outroRegistro.body as { accessToken: string }).accessToken;

    await request(app.getHttpServer())
      .post('/nations')
      .set('Authorization', `Bearer ${outroToken}`)
      .send(validNation)
      .expect(409);
  });

  it('devolve o país do jogador com números serializáveis em JSON', async () => {
    const response = await authenticated('get', '/nations/me').expect(200);
    const body = response.body as Record<string, unknown>;

    expect(body).toMatchObject({ name: nationName });

    // BigInt não sobrevive a JSON.stringify sem conversão; o mapeador precisa
    // entregar população e dinheiro como números.
    const population = body.population as Record<string, unknown>;
    const economy = body.economy as Record<string, unknown>;

    expect(typeof population.total).toBe('number');
    expect(typeof economy.treasury).toBe('number');
    expect(typeof economy.gdp).toBe('number');
  });

  it('não expõe os restos internos da simulação', async () => {
    const response = await authenticated('get', '/nations/me').expect(200);
    const body = response.body as {
      population: Record<string, unknown>;
      economy: Record<string, unknown>;
    };

    expect(body.population).not.toHaveProperty('growthCarryMicro');
    expect(body.economy).not.toHaveProperty('treasuryCarryMicro');
    expect(body.economy).not.toHaveProperty('treasuryCents');
    expect(body).not.toHaveProperty('happinessCarryMicro');
  });

  it('deriva emprego e desemprego da população', async () => {
    const response = await authenticated('get', '/nations/me').expect(200);
    const population = (response.body as { population: PublicPopulationBody }).population;

    expect(population.employed + population.unemployed).toBe(population.total);
    expect(population.unemploymentRate).toBeGreaterThan(0);
  });

  describe('crescimento por tempo decorrido', () => {
    it('recarregar dentro da mesma hora não gera população', async () => {
      await rewindSimulation(0);

      const primeira = await authenticated('get', '/nations/me').expect(200);
      const segunda = await authenticated('get', '/nations/me').expect(200);
      const terceira = await authenticated('get', '/nations/me').expect(200);

      const total = (body: unknown) => (body as { population: { total: number } }).population.total;

      expect(total(segunda.body)).toBe(total(primeira.body));
      expect(total(terceira.body)).toBe(total(primeira.body));
    });

    it('a população cresce depois de horas offline', async () => {
      const antes = await authenticated('get', '/nations/me').expect(200);
      const totalAntes = (antes.body as { population: { total: number } }).population.total;

      await rewindSimulation(30 * 24);

      const depois = await authenticated('get', '/nations/me').expect(200);
      const totalDepois = (depois.body as { population: { total: number } }).population.total;

      expect(totalDepois).toBeGreaterThan(totalAntes);
    });

    it('o crescimento é persistido, não recalculado a cada leitura', async () => {
      await rewindSimulation(48);

      const primeira = await authenticated('get', '/nations/me').expect(200);
      const segunda = await authenticated('get', '/nations/me').expect(200);

      const total = (body: unknown) => (body as { population: { total: number } }).population.total;

      // A segunda leitura não avança de novo: o marco já foi gravado.
      expect(total(segunda.body)).toBe(total(primeira.body));
    });

    it('o tesouro também evolui com o tempo offline', async () => {
      const antes = await authenticated('get', '/nations/me').expect(200);

      await rewindSimulation(30 * 24);

      const depois = await authenticated('get', '/nations/me').expect(200);

      const treasury = (body: unknown) =>
        (body as { economy: { treasury: number } }).economy.treasury;

      expect(treasury(depois.body)).not.toBe(treasury(antes.body));
    });
  });

  describe('alíquota de imposto', () => {
    it('exige autenticação', async () => {
      await request(app.getHttpServer())
        .patch('/nations/me/tax-rate')
        .send({ taxRate: 30 })
        .expect(401);
    });

    it('rejeita alíquota fora de 0–100', async () => {
      await authenticated('patch', '/nations/me/tax-rate').send({ taxRate: 101 }).expect(400);
      await authenticated('patch', '/nations/me/tax-rate').send({ taxRate: -1 }).expect(400);
      await authenticated('patch', '/nations/me/tax-rate').send({ taxRate: 12.5 }).expect(400);
    });

    it('rejeita campos que o jogador não escolhe', async () => {
      await authenticated('patch', '/nations/me/tax-rate')
        .send({ taxRate: 30, treasuryCents: 999_999_999 })
        .expect(400);
    });

    it('persiste a alíquota e recalcula a receita projetada', async () => {
      const antes = await authenticated('get', '/nations/me').expect(200);
      const receitaAntes = (antes.body as { economy: { annualRevenue: number } }).economy
        .annualRevenue;

      const resposta = await authenticated('patch', '/nations/me/tax-rate')
        .send({ taxRate: 50 })
        .expect(200);

      const economy = (resposta.body as { economy: { taxRate: number; annualRevenue: number } })
        .economy;

      expect(economy.taxRate).toBe(50);
      expect(economy.annualRevenue).toBeGreaterThan(receitaAntes);

      // E continua valendo na próxima leitura.
      const depois = await authenticated('get', '/nations/me').expect(200);
      expect((depois.body as { economy: { taxRate: number } }).economy.taxRate).toBe(50);
    });

    /**
     * O exploit que o `setTaxRate` fecha ao simular ANTES de gravar: ficar um mês
     * com imposto baixo e subi-lo no último instante não pode arrecadar o mês
     * inteiro na alíquota nova.
     */
    it('fecha o período na alíquota que valeu nele, não na nova', async () => {
      // Zera o imposto e fecha a simulação neste instante.
      const zerado = await authenticated('patch', '/nations/me/tax-rate')
        .send({ taxRate: 0 })
        .expect(200);

      const treasuryAntes = (zerado.body as { economy: { treasury: number } }).economy.treasury;

      // Um mês se passa com o imposto em zero...
      await rewindSimulation(30 * 24);

      // ...e só então o jogador tenta subir a alíquota ao máximo.
      const resposta = await authenticated('patch', '/nations/me/tax-rate')
        .send({ taxRate: 100 })
        .expect(200);

      const body = resposta.body as {
        economy: { taxRate: number; treasury: number };
        simulatedUntil: string;
      };

      expect(body.economy.taxRate).toBe(100);

      // O mês rodou com imposto zero: o país só gastou. Se o período fosse
      // fechado na alíquota nova, o tesouro teria subido em vez de cair.
      expect(body.economy.treasury).toBeLessThan(treasuryAntes);

      // E o marco foi fechado antes da troca.
      expect(new Date(body.simulatedUntil).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('recursos', () => {
    const resourcesOf = (body: unknown) => (body as { resources: PublicResourcesBody }).resources;

    it('o país nasce com uma dotação natural', async () => {
      const resources = resourcesOf((await authenticated('get', '/nations/me').expect(200)).body);

      expect(resources.deposits.length).toBeGreaterThanOrEqual(3);

      for (const deposit of resources.deposits) {
        expect(deposit.reserves).toBeGreaterThan(0);
        expect(deposit.label).toBeTruthy();
      }
    });

    it('não expõe o resto interno nem a semente da dotação', async () => {
      const body = (await authenticated('get', '/nations/me').expect(200)).body as {
        resources: Record<string, unknown> & { deposits: Record<string, unknown>[] };
      };

      expect(body.resources).not.toHaveProperty('seed');

      for (const deposit of body.resources.deposits) {
        expect(deposit).not.toHaveProperty('extractionCarryMicro');
      }
    });

    it('rejeita intensidade fora de 0–100', async () => {
      await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: 101 })
        .expect(400);
      await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: -1 })
        .expect(400);
    });

    it('rejeita campos que o jogador não escolhe', async () => {
      await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: 50, seed: 1 })
        .expect(400);
    });

    it('persiste a intensidade e recalcula as projeções', async () => {
      const antes = resourcesOf((await authenticated('get', '/nations/me').expect(200)).body);

      const resposta = await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: 100 })
        .expect(200);

      const depois = resourcesOf(resposta.body);

      expect(depois.extractionRate).toBe(100);
      expect(depois.annualRevenue).toBeGreaterThan(antes.annualRevenue);

      // E continua valendo na próxima leitura.
      expect(
        resourcesOf((await authenticated('get', '/nations/me').expect(200)).body).extractionRate,
      ).toBe(100);
    });

    it('a extração consome reservas ao longo do tempo offline', async () => {
      const antes = resourcesOf((await authenticated('get', '/nations/me').expect(200)).body);

      await rewindSimulation(90 * 24);

      const depois = resourcesOf((await authenticated('get', '/nations/me').expect(200)).body);

      const primeiroAntes = antes.deposits[0]!;
      const primeiroDepois = depois.deposits.find((d) => d.type === primeiroAntes.type)!;

      expect(primeiroDepois.reserves).toBeLessThan(primeiroAntes.reserves);
      expect(primeiroDepois.extractedTotal).toBeGreaterThan(primeiroAntes.extractedTotal);
    });

    it('intensidade zero congela as reservas', async () => {
      await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: 0 })
        .expect(200);

      const antes = resourcesOf((await authenticated('get', '/nations/me').expect(200)).body);

      await rewindSimulation(90 * 24);

      const depois = resourcesOf((await authenticated('get', '/nations/me').expect(200)).body);

      for (const deposit of antes.deposits) {
        const atual = depois.deposits.find((d) => d.type === deposit.type)!;

        expect(atual.reserves).toBe(deposit.reserves);
      }
    });

    /** O mesmo exploit que o `setTaxRate` fecha, agora na extração. */
    it('fecha o período na intensidade que valeu nele, não na nova', async () => {
      await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: 0 })
        .expect(200);

      const antes = resourcesOf((await authenticated('get', '/nations/me').expect(200)).body);

      await rewindSimulation(90 * 24);

      const resposta = await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: 100 })
        .expect(200);

      const depois = resourcesOf(resposta.body);

      expect(depois.extractionRate).toBe(100);

      // O período rodou com extração zero: nada saiu do solo.
      for (const deposit of antes.deposits) {
        const atual = depois.deposits.find((d) => d.type === deposit.type)!;

        expect(atual.reserves).toBe(deposit.reserves);
      }
    });
  });

  describe('produção', () => {
    const productionOf = (body: unknown) =>
      (body as { production: PublicProductionBody }).production;

    const steelOf = (body: unknown) =>
      productionOf(body).lines.find((line) => line.good === 'STEEL')!;

    beforeAll(async () => {
      // Garante o insumo da siderurgia em vez de torcer pelo sorteio da dotação:
      // sem ferro, a linha de aço existe mas nunca produz, e os testes abaixo
      // passariam sem exercitar nada.
      const state = await prisma.resourceState.findFirst({
        where: { nation: { name: nationName } },
      });

      await prisma.resourceDeposit.upsert({
        where: { resourceStateId_type: { resourceStateId: state!.id, type: 'IRON' } },
        update: { reserves: 50_000_000n },
        create: { resourceStateId: state!.id, type: 'IRON', reserves: 50_000_000n },
      });

      await authenticated('patch', '/nations/me/extraction-rate')
        .send({ extractionRate: 100 })
        .expect(200);
    });

    it('o país nasce com uma linha por bem do catálogo', async () => {
      const production = productionOf((await authenticated('get', '/nations/me').expect(200)).body);

      expect(production.lines.length).toBeGreaterThanOrEqual(3);
      expect(production.annualCapacity).toBeGreaterThan(0);

      for (const line of production.lines) {
        expect(line.label).toBeTruthy();
        expect(line.inputLabel).toBeTruthy();
      }
    });

    it('rejeita alocação fora de 0–100 e bem inexistente', async () => {
      await authenticated('patch', '/nations/me/production')
        .send({ good: 'STEEL', allocation: 101 })
        .expect(400);
      await authenticated('patch', '/nations/me/production')
        .send({ good: 'STEEL', allocation: -1 })
        .expect(400);
      await authenticated('patch', '/nations/me/production')
        .send({ good: 'ANTIMATERIA', allocation: 50 })
        .expect(400);
    });

    it('rejeita campos que o jogador não escolhe', async () => {
      await authenticated('patch', '/nations/me/production')
        .send({ good: 'STEEL', allocation: 50, producedTotal: 999_999 })
        .expect(400);
    });

    it('persiste a alocação e recalcula as projeções', async () => {
      const resposta = await authenticated('patch', '/nations/me/production')
        .send({ good: 'STEEL', allocation: 100 })
        .expect(200);

      const aco = steelOf(resposta.body);

      expect(aco.allocation).toBe(100);
      expect(aco.annualProduction).toBeGreaterThan(0);
      // A razão de ser da fase: beneficiar rende mais que vender bruto.
      expect(aco.annualValueAdded).toBeGreaterThan(0);

      // E continua valendo na próxima leitura.
      expect(steelOf((await authenticated('get', '/nations/me').expect(200)).body).allocation).toBe(
        100,
      );
    });

    it('a produção acumula ao longo do tempo offline', async () => {
      const antes = steelOf((await authenticated('get', '/nations/me').expect(200)).body);

      await rewindSimulation(90 * 24);

      const depois = steelOf((await authenticated('get', '/nations/me').expect(200)).body);

      expect(depois.producedTotal).toBeGreaterThan(antes.producedTotal);
    });

    /** O mesmo exploit que as demais decisões fecham, agora na produção. */
    it('fecha o período na alocação que valeu nele, não na nova', async () => {
      await authenticated('patch', '/nations/me/production')
        .send({ good: 'STEEL', allocation: 0 })
        .expect(200);

      const antes = steelOf((await authenticated('get', '/nations/me').expect(200)).body);

      await rewindSimulation(90 * 24);

      const depois = steelOf(
        (
          await authenticated('patch', '/nations/me/production')
            .send({ good: 'STEEL', allocation: 100 })
            .expect(200)
        ).body,
      );

      expect(depois.allocation).toBe(100);
      // O período rodou com a fábrica parada: nada foi beneficiado nele.
      expect(depois.producedTotal).toBe(antes.producedTotal);
    });
  });
});

interface PublicProductionBody {
  annualCapacity: number;
  annualDemand: number;
  capacityUsage: number;
  annualValueAdded: number;
  lines: {
    good: string;
    label: string;
    inputLabel: string;
    allocation: number;
    producedTotal: number;
    annualProduction: number;
    annualValueAdded: number;
    hasInput: boolean;
  }[];
}

interface PublicResourcesBody {
  extractionRate: number;
  annualRevenue: number;
  deposits: {
    type: string;
    label: string;
    reserves: number;
    extractedTotal: number;
    annualRevenue: number;
    yearsRemaining: number | null;
  }[];
}

interface PublicPopulationBody {
  total: number;
  employed: number;
  unemployed: number;
  unemploymentRate: number;
}
