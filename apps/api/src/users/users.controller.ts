import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { toPublicUser, type PublicUser } from './public-user';
import { UsersService } from './users.service';

/**
 * Todas as rotas operam sobre o próprio usuário autenticado ("/me").
 *
 * Não existe rota para ler ou alterar outro usuário pelo id: isso exigiria
 * autorização por papéis, que o jogo ainda não tem — e cuja ausência seria uma
 * brecha se a rota existisse.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() currentUser: AuthenticatedUser): Promise<PublicUser> {
    const user = await this.usersService.findByIdOrFail(currentUser.userId);

    return toPublicUser(user);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.usersService.updateDisplayName(currentUser.userId, dto.displayName);

    return toPublicUser(user);
  }

  @Patch('me/password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(
      currentUser.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
