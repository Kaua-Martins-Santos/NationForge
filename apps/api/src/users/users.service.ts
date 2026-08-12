import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';

export interface CreateUserData {
  email: string;
  displayName: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByDisplayName(displayName: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { displayName } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Igual a findById, mas falha quando o usuário não existe.
   *
   * Usado em fluxos autenticados: o token é válido, então o usuário deveria
   * existir — se não existe (conta removida, banco restaurado), é um 404
   * legítimo em vez de um null silencioso propagando pelo código.
   */
  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateDisplayName(userId: string, displayName: string): Promise<User> {
    const owner = await this.findByDisplayName(displayName);

    // Reenviar o próprio nome atual não é conflito — só é conflito se o nome
    // pertence a outra conta.
    if (owner && owner.id !== userId) {
      throw new ConflictException('Nome de jogador já está em uso.');
    }

    await this.findByIdOrFail(userId);

    return this.prisma.user.update({ where: { id: userId }, data: { displayName } });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findByIdOrFail(userId);

    // Exigir a senha atual impede que um token vazado vire sequestro definitivo
    // da conta.
    const isCurrentValid = await this.passwordService.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      // 400 e não 401: o usuário ESTÁ autenticado (o token é válido), apenas
      // errou a senha atual. Um 401 aqui faria clientes com interceptor de
      // "sessão expirada" deslogarem o jogador por um simples erro de digitação.
      throw new BadRequestException('Senha atual incorreta.');
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
