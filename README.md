# NationForge

Simulador multiplayer de países. Cada jogador administra uma nação — população,
economia, recursos, indústria, diplomacia, entre outros sistemas — em um mundo
persistente que continua evoluindo mesmo enquanto o jogador está offline.

O projeto é construído de forma incremental e documentada. As regras de desenvolvimento
(fases, arquitetura, stack, convenções) estão em [`CLAUDE.md`](./CLAUDE.md).

## Status atual

**Fase 8 — Criação de países.** Já temos a fundação do repositório (Fase 1), o monorepo
(Fase 2), o Prisma (Fase 3), o backend NestJS (Fase 4), o frontend Next.js (Fase 5),
autenticação com JWT (Fase 6), o perfil do jogador (Fase 7) e agora a criação do país,
com seus atributos iniciais definidos pelo servidor.

Os atributos do país existem mas **ainda não evoluem**: população (Fase 10), economia
(Fase 11) e o sistema de ticks (Fase 19) virão depois. O frontend também ainda não
consome a API — a primeira tela de verdade é o Dashboard (Fase 9).

## Requisitos

- Node.js >= 24 (versão fixada em [`.nvmrc`](./.nvmrc))
- npm
- PostgreSQL rodando localmente (o projeto assume a porta `7789`)

## Instalação

```bash
npm install
```

Em seguida configure o acesso ao banco seguindo o
[README do backend](./apps/api/README.md).

## Scripts disponíveis

| Comando                   | Descrição                                             |
| ------------------------- | ----------------------------------------------------- |
| `npm run lint`            | Executa o ESLint em todo o projeto                    |
| `npm run lint:fix`        | Executa o ESLint corrigindo problemas automaticamente |
| `npm run format`          | Formata todos os arquivos com o Prettier              |
| `npm run format:check`    | Verifica a formatação sem alterar arquivos            |
| `npm run dev:api`         | Sobe o backend em modo watch                          |
| `npm run dev:web`         | Sobe o frontend em modo watch                         |
| `npm run build`           | Compila todos os workspaces                           |
| `npm test`                | Roda os testes de todos os workspaces                 |
| `npm run typecheck`       | Verifica os tipos de todos os workspaces              |
| `npm run prisma:generate` | Gera o Prisma Client (`apps/api`)                     |
| `npm run db:push`         | Sincroniza o schema Prisma com o banco (`apps/api`)   |

## Convenções de commit

O projeto usa [Conventional Commits](https://www.conventionalcommits.org/), validado
automaticamente pelo commitlint em cada commit (via Husky). Exemplos:

```text
feat(auth): add user registration
fix(economy): correct tax calculation rounding
docs: update README
```

## Estrutura atual

```text
apps/
├── api/                        NestJS
│   ├── src/
│   │   ├── main.ts             bootstrap
│   │   ├── app.module.ts       módulo raiz
│   │   └── health/             GET /health
│   ├── src/auth/                registro, login, JWT
│   ├── src/users/                perfil do jogador (/users/me)
│   ├── src/nations/              criação e consulta do país
│   ├── src/prisma/                PrismaService/PrismaModule
│   ├── test/                     testes e2e (Supertest)
│   └── prisma/schema.prisma      model User + migrations
└── web/                        Next.js
    └── src/app/                página inicial + layout (Tailwind CSS)
```

`packages/shared` e `packages/config` (sugeridos no CLAUDE.md) ainda não existem: só
serão criados quando houver código real para compartilhar entre `api` e `web`.
