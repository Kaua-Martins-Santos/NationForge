import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Nation } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNationDto } from './dto/create-nation.dto';
import { NATION_DEFAULTS } from './nation-defaults';

@Injectable()
export class NationsService {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<Nation | null> {
    return this.prisma.nation.findUnique({ where: { userId } });
  }

  async findByUserIdOrFail(userId: string): Promise<Nation> {
    const nation = await this.findByUserId(userId);

    if (!nation) {
      throw new NotFoundException('Você ainda não criou um país.');
    }

    return nation;
  }

  async create(userId: string, dto: CreateNationDto): Promise<Nation> {
    const existingNation = await this.findByUserId(userId);
    if (existingNation) {
      throw new ConflictException('Você já possui um país.');
    }

    const nameOwner = await this.prisma.nation.findUnique({ where: { name: dto.name } });
    if (nameOwner) {
      throw new ConflictException('Já existe um país com esse nome.');
    }

    // Os atributos vêm de NATION_DEFAULTS, nunca do dto: o jogador escolhe apenas
    // identidade (nome, bandeira, capital, governo).
    return this.prisma.nation.create({
      data: {
        userId,
        name: dto.name,
        flag: dto.flag,
        capital: dto.capital,
        government: dto.government,
        ...NATION_DEFAULTS,
      },
    });
  }
}
