# @nationforge/api

Backend do NationForge (NestJS).

No momento a aplicação contém apenas o esqueleto criado na **Fase 4**: um módulo raiz e
um endpoint de saúde. Nenhum módulo de domínio do jogo foi implementado ainda.

## Executando

```bash
npm run dev -w @nationforge/api
```

A API sobe em `http://localhost:3333`. A porta pode ser alterada pela variável de
ambiente `PORT` do processo — o `.env` ainda **não** é lido pela aplicação (hoje ele
serve apenas ao Prisma CLI); o carregamento de configuração via `@nestjs/config` será
adicionado quando houver configuração de verdade para gerenciar.

Endpoint disponível:

```text
GET /health  →  { "status": "ok", "timestamp": "..." }
```

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

## Estado do schema

[`prisma/schema.prisma`](./prisma/schema.prisma) ainda **não possui models**. As
entidades do domínio (usuários, países, população, economia) serão criadas nas fases
seguintes, cada uma na sua etapa.

O Prisma também **ainda não está conectado ao NestJS**. Essa integração
(`PrismaModule`/`PrismaService`) será feita quando o primeiro módulo realmente precisar
acessar dados.

## Scripts

| Comando                   | Descrição                                      |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Sobe a API em modo watch                       |
| `npm run build`           | Compila para `dist/`                           |
| `npm start`               | Executa a versão compilada                     |
| `npm test`                | Roda os testes (unitários e e2e)               |
| `npm run typecheck`       | Verifica os tipos sem emitir arquivos          |
| `npm run prisma:generate` | Gera o Prisma Client a partir do schema        |
| `npm run db:push`         | Sincroniza o schema com o banco (sem migração) |

Todos também podem ser executados da raiz do monorepo.
