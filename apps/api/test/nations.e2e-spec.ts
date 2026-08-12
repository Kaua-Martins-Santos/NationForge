import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/configure-app';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
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

  function authenticated(method: 'get' | 'post', path: string) {
    return request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${accessToken}`);
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
      treasury: Number(NATION_DEFAULTS.treasury),
      gdp: Number(NATION_DEFAULTS.gdp),
      happiness: NATION_DEFAULTS.happiness,
      emissions: NATION_DEFAULTS.emissions,
      population: {
        total: Number(POPULATION_DEFAULTS.total),
        health: POPULATION_DEFAULTS.health,
        education: POPULATION_DEFAULTS.education,
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

    // BigInt e Decimal do Prisma não sobrevivem a JSON.stringify sem conversão;
    // o mapeador precisa entregá-los como números.
    const population = body.population as Record<string, unknown>;
    expect(typeof population.total).toBe('number');
    expect(typeof body.treasury).toBe('number');
    expect(typeof body.gdp).toBe('number');
  });

  it('não expõe o resto interno da simulação', async () => {
    const response = await authenticated('get', '/nations/me').expect(200);
    const population = (response.body as { population: Record<string, unknown> }).population;

    expect(population).not.toHaveProperty('growthCarryMicro');
  });

  it('deriva emprego e desemprego da população', async () => {
    const response = await authenticated('get', '/nations/me').expect(200);
    const population = (response.body as { population: PublicPopulationBody }).population;

    expect(population.employed + population.unemployed).toBe(population.total);
    expect(population.unemploymentRate).toBeGreaterThan(0);
  });

  describe('crescimento por tempo decorrido', () => {
    /**
     * Empurra o marco da simulação para o passado direto no banco, simulando um
     * jogador que ficou offline — sem precisar esperar horas de verdade.
     */
    async function rewindSimulation(hours: number): Promise<void> {
      const nation = await prisma.nation.findFirstOrThrow({ where: { name: nationName } });

      await prisma.populationState.update({
        where: { nationId: nation.id },
        data: { simulatedUntil: new Date(Date.now() - hours * 60 * 60 * 1000) },
      });
    }

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
  });
});

interface PublicPopulationBody {
  total: number;
  employed: number;
  unemployed: number;
  unemploymentRate: number;
}
