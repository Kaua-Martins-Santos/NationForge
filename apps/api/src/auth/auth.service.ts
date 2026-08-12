import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../users/password.service';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

export interface AuthResult {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register({ email, displayName, password }: RegisterDto): Promise<AuthResult> {
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const existingDisplayName = await this.usersService.findByDisplayName(displayName);
    if (existingDisplayName) {
      throw new ConflictException('Nome de jogador já está em uso.');
    }

    const passwordHash = await this.passwordService.hash(password);
    const user = await this.usersService.create({ email, displayName, passwordHash });

    return this.buildToken(user.id, user.email);
  }

  async login({ email, password }: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);
    const isValid = user ? await this.passwordService.compare(password, user.passwordHash) : false;

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
