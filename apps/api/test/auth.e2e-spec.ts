import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // base36 mantém o sufixo curto o bastante para caber no limite de 20
  // caracteres do displayName, mesmo com sufixos extras nos testes.
  const suffix = Date.now().toString(36);
  const email = `e2e-auth-${suffix}@nationforge.dev`;
  const displayName = `auth${suffix}`;
  const password = 'senha-forte-123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: `e2e-auth-${suffix}` } } });
    await app.close();
  });

  it('registra um novo usuário e retorna um token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, displayName, password })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
  });

  it('rejeita registro com e-mail já cadastrado', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, displayName: `${displayName}b`, password })
      .expect(409);
  });

  it('rejeita registro com displayName já em uso', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `outro-${email}`, displayName, password })
      .expect(409);
  });

  it('rejeita registro com senha curta', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `curto-${email}`, displayName: `${displayName}c`, password: '123' })
      .expect(400);
  });

  it('rejeita registro com displayName inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `inv-${email}`, displayName: 'nome com espaço', password })
      .expect(400);
  });

  it('rejeita campos não previstos no corpo da requisição', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `extra-${email}`, displayName: `${displayName}d`, password, isAdmin: true })
      .expect(400);
  });

  it('faz login com credenciais corretas', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
  });

  it('rejeita login com senha incorreta', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'senha-errada' })
      .expect(401);
  });

  it('rejeita acesso a rota protegida sem token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('permite acesso a rota protegida com token válido', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { accessToken } = loginResponse.body as { accessToken: string };

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meResponse.body).toMatchObject({ email });
  });
});
