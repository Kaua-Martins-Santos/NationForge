# NationForge

Simulador multiplayer de países. Cada jogador administra uma nação — população,
economia, recursos, indústria, diplomacia, entre outros sistemas — em um mundo
persistente que continua evoluindo mesmo enquanto o jogador está offline.

O projeto é construído de forma incremental e documentada. As regras de desenvolvimento
(fases, arquitetura, stack, convenções) estão em [`CLAUDE.md`](./CLAUDE.md).

## Status atual

**Fase 2 — Monorepo e estrutura.** O repositório já tem a fundação (Fase 1: git, lint,
formatação, hooks de commit) e agora também o esqueleto do monorepo (`apps/api`,
`apps/web`) via npm workspaces. Os dois pacotes ainda são placeholders — sem NestJS,
sem Next.js, sem banco de dados ou qualquer funcionalidade de jogo. Isso vem nas
próximas fases.

## Requisitos

- Node.js >= 24 (versão fixada em [`.nvmrc`](./.nvmrc))
- npm

## Instalação

```bash
npm install
```

## Scripts disponíveis

| Comando                | Descrição                                             |
| ---------------------- | ----------------------------------------------------- |
| `npm run lint`         | Executa o ESLint em todo o projeto                    |
| `npm run lint:fix`     | Executa o ESLint corrigindo problemas automaticamente |
| `npm run format`       | Formata todos os arquivos com o Prettier              |
| `npm run format:check` | Verifica a formatação sem alterar arquivos            |

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
├── api/    (placeholder — NestJS chega na Fase 4)
└── web/    (placeholder — Next.js chega na Fase 5)
```

`packages/shared` e `packages/config` (sugeridos no CLAUDE.md) ainda não existem: só
serão criados quando houver código real para compartilhar entre `api` e `web`.
