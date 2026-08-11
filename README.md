# NationForge

Simulador multiplayer de países. Cada jogador administra uma nação — população,
economia, recursos, indústria, diplomacia, entre outros sistemas — em um mundo
persistente que continua evoluindo mesmo enquanto o jogador está offline.

O projeto é construído de forma incremental e documentada. As regras de desenvolvimento
(fases, arquitetura, stack, convenções) estão em [`CLAUDE.md`](./CLAUDE.md).

## Status atual

**Fase 1 — Setup inicial.** Apenas a fundação do repositório está pronta: controle de
versão, lint, formatação e hooks de commit. Ainda não há backend, frontend, banco de
dados ou qualquer funcionalidade de jogo — isso vem nas próximas fases.

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

Nesta fase, o repositório contém apenas configuração de raiz. A estrutura de monorepo
(`apps/`, `packages/`) será criada na Fase 2.
