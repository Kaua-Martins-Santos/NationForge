import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { UsersService } from './users.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'jogador@nationforge.dev',
    displayName: 'Jogador',
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('UsersService', () => {
  let usersService: UsersService;
  let passwordService: PasswordService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, PasswordService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    usersService = moduleRef.get(UsersService);
    passwordService = moduleRef.get(PasswordService);
  });

  describe('findByIdOrFail', () => {
    it('lança NotFound quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.findByIdOrFail('sumido')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateDisplayName', () => {
    it('rejeita nome já usado por outra conta', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ id: 'outra-conta' }));

      await expect(usersService.updateDisplayName('user-1', 'Jogador')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('permite reenviar o próprio nome atual', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ id: 'user-1' }));
      prisma.user.update.mockResolvedValue(buildUser({ displayName: 'Jogador' }));

      await expect(usersService.updateDisplayName('user-1', 'Jogador')).resolves.toMatchObject({
        displayName: 'Jogador',
      });
    });

    it('atualiza quando o nome está livre', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // busca por displayName: livre
        .mockResolvedValueOnce(buildUser()); // findByIdOrFail
      prisma.user.update.mockResolvedValue(buildUser({ displayName: 'NovoNome' }));

      await expect(usersService.updateDisplayName('user-1', 'NovoNome')).resolves.toMatchObject({
        displayName: 'NovoNome',
      });
    });
  });

  describe('changePassword', () => {
    it('rejeita quando a senha atual está errada', async () => {
      const passwordHash = await passwordService.hash('senha-correta');
      prisma.user.findUnique.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        usersService.changePassword('user-1', 'senha-errada', 'nova-senha-123'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('grava um hash novo (nunca a senha em texto puro)', async () => {
      const passwordHash = await passwordService.hash('senha-atual-123');
      prisma.user.findUnique.mockResolvedValue(buildUser({ passwordHash }));
      prisma.user.update.mockResolvedValue(buildUser());

      await usersService.changePassword('user-1', 'senha-atual-123', 'nova-senha-123');

      const [updateArgs] = prisma.user.update.mock.calls[0] as [{ data: { passwordHash: string } }];
      const newHash = updateArgs.data.passwordHash;

      expect(newHash).not.toBe('nova-senha-123');
      expect(newHash).not.toBe(passwordHash);
      await expect(passwordService.compare('nova-senha-123', newHash)).resolves.toBe(true);
    });
  });
});
