import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

const DEFAULT_TOKEN_EXPIRATION: StringValue = '1d';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // JWT_EXPIRES_IN vem do ambiente como string solta; StringValue é o tipo
          // (da lib "ms") que o @nestjs/jwt exige — ex.: "1d", "2h", "30m".
          expiresIn: configService.get<StringValue>('JWT_EXPIRES_IN', DEFAULT_TOKEN_EXPIRATION),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
