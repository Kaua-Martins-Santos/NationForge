import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/configure-app';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { NATION_DEFAULTS } from '../src/nations/nation-defaults';
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
      population: Number(NATION_DEFAULTS.population),
      treasury: Number(NATION_DEFAULTS.treasury),
      gdp: Number(NATION_DEFAULTS.gdp),
      happiness: NATION_DEFAULTS.happiness,
      emissions: NATION_DEFAULTS.emissions,
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
    expect(typeof body.population).toBe('number');
    expect(typeof body.treasury).toBe('number');
    expect(typeof body.gdp).toBe('number');
  });
});
