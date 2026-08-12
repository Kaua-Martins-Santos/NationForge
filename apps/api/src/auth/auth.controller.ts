import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService, type AuthResult } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const result = await this.authService.register(dto);
    this.authCookieService.set(response, result.accessToken);

    return result;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResult> {
    const result = await this.authService.login(dto);
    this.authCookieService.set(response, result.accessToken);

    return result;
  }

  /**
   * Remove o cookie de sessão.
   *
   * Precisa existir como endpoint porque o cookie é httpOnly: o JavaScript do
   * navegador não pode apagá-lo por conta própria.
   *
   * Não exige autenticação de propósito — sair deve funcionar mesmo com um token
   * já expirado ou inválido, caso em que a operação simplesmente não tem efeito.
   */
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    this.authCookieService.clear(response);
  }

  /**
   * Devolve apenas o que está dentro do token, sem consultar o banco — serve
   * para o cliente verificar rapidamente se a sessão é válida.
   * Para o perfil completo e atualizado, use GET /users/me.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() currentUser: AuthenticatedUser): AuthenticatedUser {
    return currentUser;
  }
}
