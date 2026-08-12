import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { User } from '../../generated/prisma/client';
import { PasswordService } from '../users/password.service';
import { UsersService } from '../users/users.service';
import { AuthService, type AuthResult } from './auth.service';
import type { CreateUserData } from '../users/users.service';

const VALID_CREDENTIALS = {
  email: 'jogador@nationforge.dev',
  displayName: 'Jogador',
  password: 'senha-forte-123',
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: VALID_CREDENTIALS.email,
    displayName: VALID_CREDENTIALS.displayName,
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findByDisplayName: jest.Mock;
    create: jest.Mock;
  };
  let passwordService: PasswordService;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByDisplayName: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: () => 'fake-jwt-token' } },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    passwordService = moduleRef.get(PasswordService);
  });

  describe('register', () => {
    it('cria o usuário com a senha hasheada e retorna um token', async () => {
      usersService.create.mockImplementation((data: CreateUserData) =>
        Promise.resolve(buildUser(data)),
      );

      const result: AuthResult = await authService.register(VALID_CREDENTIALS);

      expect(result).toEqual({ accessToken: 'fake-jwt-token' });

      const [created] = usersService.create.mock.calls[0] as [CreateUserData];
      expect(created.passwordHash).not.toBe(VALID_CREDENTIALS.password);
      await expect(
        passwordService.compare(VALID_CREDENTIALS.password, created.passwordHash),
      ).resolves.toBe(true);
    });

    it('rejeita e-mail já cadastrado', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(authService.register(VALID_CREDENTIALS)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejeita displayName já em uso', async () => {
      usersService.findByDisplayName.mockResolvedValue(buildUser({ id: 'outro-usuario' }));

      await expect(authService.register(VALID_CREDENTIALS)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('autentica com a senha correta', async () => {
      const passwordHash = await passwordService.hash(VALID_CREDENTIALS.password);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      const result = await authService.login(VALID_CREDENTIALS);

      expect(result).toEqual({ accessToken: 'fake-jwt-token' });
    });

    it('rejeita senha incorreta', async () => {
      const passwordHash = await passwordService.hash(VALID_CREDENTIALS.password);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        authService.login({ email: VALID_CREDENTIALS.email, password: 'senha-errada' }),
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
