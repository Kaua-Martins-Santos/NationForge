# NationForge

Simulador multiplayer de países. Cada jogador administra uma nação — população,
economia, recursos, indústria, diplomacia, entre outros sistemas — em um mundo
persistente que continua evoluindo mesmo enquanto o jogador está offline.

O projeto é construído de forma incremental e documentada. As regras de desenvolvimento
(fases, arquitetura, stack, convenções) estão em [`CLAUDE.md`](./CLAUDE.md).

## Status atual

**Fase 3 — PostgreSQL + Prisma.** Já temos a fundação do repositório (Fase 1), o
monorepo com npm workspaces (Fase 2) e agora o Prisma configurado em `apps/api`
apontando para um Postgres local. O schema ainda não possui models, e não há NestJS,
Next.js ou qualquer funcionalidade de jogo — isso vem nas próximas fases.

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
├── api/    (Prisma configurado — NestJS chega na Fase 4)
│   └── prisma/schema.prisma   (ainda sem models)
└── web/    (placeholder — Next.js chega na Fase 5)
```

`packages/shared` e `packages/config` (sugeridos no CLAUDE.md) ainda não existem: só
serão criados quando houver código real para compartilhar entre `api` e `web`.
