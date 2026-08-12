# NationForge

Simulador multiplayer de países. Cada jogador administra uma nação — população,
economia, recursos, indústria, diplomacia, entre outros sistemas — em um mundo
persistente que continua evoluindo mesmo enquanto o jogador está offline.

O projeto é construído de forma incremental e documentada. As regras de desenvolvimento
(fases, arquitetura, stack, convenções) estão em [`CLAUDE.md`](./CLAUDE.md).

## Status atual

**Fase 9a — Frontend autenticado.** O frontend agora **consome a API de verdade**: já é
possível criar conta, entrar e sair pelo navegador. A sessão usa um cookie `httpOnly`, e
não `localStorage`.

Antes disso: fundação do repositório (Fase 1), monorepo (Fase 2), Prisma (Fase 3),
backend NestJS (Fase 4), frontend Next.js (Fase 5), autenticação com JWT (Fase 6), perfil
do jogador (Fase 7) e criação de países pela API (Fase 8).

A seguir, na **Fase 9b**: tela de criação do país e o painel com seus atributos. Os
atributos ainda **não evoluem** — população (Fase 10), economia (Fase 11) e ticks
(Fase 19) virão depois.

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
    └── src/
        ├── app/                 páginas: /, /login, /register
        ├── components/          componentes de formulário
        └── lib/                 cliente HTTP, schemas Zod, hooks de sessão
```

Para rodar o jogo localmente é preciso subir os dois: `npm run dev:api` e
`npm run dev:web` (em terminais separados).

`packages/shared` e `packages/config` (sugeridos no CLAUDE.md) ainda não existem: só
serão criados quando houver código real para compartilhar entre `api` e `web`.
