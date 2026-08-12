import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { User } from '../../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'jogador@nationforge.dev',
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), create: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: () => 'fake-jwt-token' } },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('cria o usuário com a senha hasheada e retorna um token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation((email: string, passwordHash: string) =>
        Promise.resolve(buildUser({ email, passwordHash })),
      );

      const result = await authService.register({
        email: 'jogador@nationforge.dev',
        password: 'senha-forte-123',
      });

      expect(result).toEqual({ accessToken: 'fake-jwt-token' });

      const [, storedHash] = usersService.create.mock.calls[0] as [string, string];
      expect(storedHash).not.toBe('senha-forte-123');
      expect(await bcrypt.compare('senha-forte-123', storedHash)).toBe(true);
    });

    it('rejeita e-mail já cadastrado', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(
        authService.register({ email: 'jogador@nationforge.dev', password: 'senha-forte-123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('autentica com a senha correta', async () => {
      const passwordHash = await bcrypt.hash('senha-forte-123', 4);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      const result = await authService.login({
        email: 'jogador@nationforge.dev',
        password: 'senha-forte-123',
      });

      expect(result).toEqual({ accessToken: 'fake-jwt-token' });
    });

    it('rejeita senha incorreta', async () => {
      const passwordHash = await bcrypt.hash('senha-forte-123', 4);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        authService.login({ email: 'jogador@nationforge.dev', password: 'senha-errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita usuário inexistente com a mesma exceção (não vaza quem existe)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ninguem@nationforge.dev', password: 'qualquer-coisa' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
