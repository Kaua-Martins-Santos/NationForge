import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register({ email, password }: RegisterDto): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.usersService.create(email, passwordHash);

    return this.buildToken(user.id, user.email);
  }

  async login({ email, password }: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);
    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // Mesma mensagem para "usuário não existe" e "senha errada": não vazar
    // se um e-mail está cadastrado.
    if (!user || !isValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.buildToken(user.id, user.email);
  }

  private buildToken(userId: string, email: string): AuthResult {
    return { accessToken: this.jwtService.sign({ sub: userId, email }) };
  }
}
