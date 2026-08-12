import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Ponto único onde senhas são transformadas em hash e verificadas.
 *
 * Existe para que o custo do bcrypt e o algoritmo fiquem definidos em um lugar
 * só: registro (auth) e troca de senha (perfil) precisam das mesmas regras, e
 * duplicá-las abriria espaço para divergirem com o tempo.
 */
@Injectable()
export class PasswordService {
  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
