import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/configure-app';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  // base36 mantém o sufixo curto o bastante para caber no limite de 20
  // caracteres do displayName, mesmo com sufixos extras nos testes.
  const suffix = Date.now().toString(36);
  const email = `e2e-users-${suffix}@nationforge.dev`;
  const displayName = `usr${suffix}`;
  const password = 'senha-forte-123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await prisma.user.deleteMany({ where: { email: { contains: `e2e-users-${suffix}` } } });
    await app.close();
  });

  function authenticated(method: 'get' | 'patch', path: string) {
    return request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${accessToken}`);
  }

  describe('GET /users/me', () => {
    it('exige autenticação', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('retorna o perfil sem expor o hash da senha', async () => {
      const response = await authenticated('get', '/users/me').expect(200);

      expect(response.body).toMatchObject({ email, displayName });
      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('PATCH /users/me', () => {
    it('atualiza o displayName', async () => {
      const novoNome = `${displayName}X`;

      const response = await authenticated('patch', '/users/me')
        .send({ displayName: novoNome })
        .expect(200);

      expect(response.body).toMatchObject({ displayName: novoNome });
      expect(response.body).not.toHaveProperty('passwordHash');

      // devolve ao nome original para não afetar os testes seguintes
      await authenticated('patch', '/users/me').send({ displayName }).expect(200);
    });

    it('rejeita displayName inválido', async () => {
      await authenticated('patch', '/users/me').send({ displayName: 'a' }).expect(400);
    });

    it('rejeita displayName já usado por outro jogador', async () => {
      const outroEmail = `e2e-users-${suffix}-outro@nationforge.dev`;
      const outroNome = `${displayName}Outro`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: outroEmail, displayName: outroNome, password })
        .expect(201);

      await authenticated('patch', '/users/me').send({ displayName: outroNome }).expect(409);
    });
  });

  describe('PATCH /users/me/password', () => {
    it('rejeita quando a senha atual está errada', async () => {
      await authenticated('patch', '/users/me/password')
        .send({ currentPassword: 'senha-errada', newPassword: 'nova-senha-456' })
        .expect(400);
    });

    it('troca a senha e passa a aceitar apenas a nova no login', async () => {
      const novaSenha = 'nova-senha-456';

      await authenticated('patch', '/users/me/password')
        .send({ currentPassword: password, newPassword: novaSenha })
        .expect(204);

      await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: novaSenha })
        .expect(200);
    });
  });
});
