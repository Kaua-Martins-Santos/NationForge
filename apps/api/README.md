# @nationforge/api

Backend do NationForge.

A aplicação NestJS será implementada na **Fase 4** (Backend inicial). No momento este
pacote contém apenas a camada de acesso a dados (Prisma), criada na **Fase 3**.

## Banco de dados

O projeto usa PostgreSQL via Prisma. Não usamos Docker aqui — a conexão aponta para uma
instância Postgres já existente na máquina (porta `7789`).

### Configuração

1. Copie o template de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` preenchendo usuário, senha e nome do banco reais:

   ```text
   DATABASE_URL="postgresql://USUARIO:SENHA@localhost:7789/nationforge?schema=public"
   ```

   O `.env` está no `.gitignore` e nunca deve ser commitado.

3. Gere o Prisma Client:

   ```bash
   npm run prisma:generate
   ```

### Scripts

| Comando                   | Descrição                                      |
| ------------------------- | ---------------------------------------------- |
| `npm run prisma:generate` | Gera o Prisma Client a partir do schema        |
| `npm run db:push`         | Sincroniza o schema com o banco (sem migração) |

Ambos também podem ser executados da raiz do monorepo.

## Estado do schema

[`prisma/schema.prisma`](./prisma/schema.prisma) ainda **não possui models**. As
entidades do domínio (usuários, países, população, economia) serão criadas nas fases
seguintes, cada uma na sua etapa.
