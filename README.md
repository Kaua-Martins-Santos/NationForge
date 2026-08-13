# NationForge

Simulador multiplayer de países. Cada jogador administra uma nação — população,
economia, recursos, indústria, diplomacia, entre outros sistemas — em um mundo
persistente que continua evoluindo mesmo enquanto o jogador está offline.

O projeto é construído de forma incremental e documentada. As regras de desenvolvimento
(fases, arquitetura, stack, convenções) estão em [`CLAUDE.md`](./CLAUDE.md).

## Status atual

**Fase 13 — Produção.** O país passa a **beneficiar** o que extrai: ferro vira aço,
petróleo vira combustível, madeira vira madeira serrada. A decisão é vender in natura ou
processar — beneficiar quase dobra o que os recursos rendem.

O que impede a resposta óbvia ("processar tudo") é a **capacidade industrial**, que vem dos
trabalhadores, da tecnologia e da infraestrutura. O que passa dela continua sendo vendido
bruto, e processar polui bem mais que só extrair. Industrializar deixa de ser um botão e
vira consequência de desenvolver o país.

Antes: **Fase 12 — Recursos**, em que cada país nasce com uma **dotação natural diferente**
— ferro, petróleo, urânio, água — sorteada por semente. A escassez é o ponto: nenhum país
tem tudo, e é isso que vai dar motivo ao comércio. A decisão que ela habilita é a
intensidade de extração, sobre reservas finitas: extrair rápido rende agora e esgota depois.

Antes: **Fase 11 — Economia**, a primeira decisão com consequência — a alíquota de imposto
move receita, tesouro e felicidade, e como felicidade move a migração, a escolha econômica
volta como consequência demográfica. Para isso, os domínios passaram a avançar em um
**único laço de ticks**: com laços separados, esperar offline renderia mais que jogar.

Antes: **Fase 10 — População**, o primeiro número que se move sozinho — nascimentos, mortes
e migração calculados pelo tempo decorrido, sem processo algum rodando em background. E o
jogo já era jogável de ponta a ponta pelo navegador (criar conta, entrar, fundar o país, ver
o painel), com sessão em cookie `httpOnly`.

Antes disso: fundação do repositório (Fase 1), monorepo (Fase 2), Prisma (Fase 3),
backend NestJS (Fase 4), frontend Next.js (Fase 5), autenticação com JWT (Fase 6), perfil
do jogador (Fase 7), criação de países pela API (Fase 8) e telas de autenticação
(Fase 9a).

Os demais atributos ainda **não evoluem**: agricultura (Fase 14), energia (Fase 16) e o
restante do roadmap virão depois. As receitas de produção ainda não consomem energia — o
insumo só existirá na Fase 16, e fingi-lo antes seria inventar número. A camada visual é
provisória — um redesign completo está planejado.

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
│   ├── src/population/           demografia: crescimento, saúde, emprego
│   ├── src/economy/              PIB, impostos, tesouro
│   ├── src/resources/            dotação natural, extração, reservas
│   ├── src/production/           catálogo de bens, receitas, capacidade industrial
│   ├── src/simulation/           o laço de ticks que avança todos os domínios
│   ├── src/prisma/                PrismaService/PrismaModule
│   ├── test/                     testes e2e (Supertest)
│   └── prisma/schema.prisma      model User + migrations
└── web/                        Next.js
    └── src/
        ├── app/                 páginas: /, /login, /register, /nations/new, /dashboard
        ├── components/          formulários, guarda de rota, stat tiles e medidores
        └── lib/                 cliente HTTP, schemas Zod, hooks de sessão e do país
```

Para rodar o jogo localmente é preciso subir os dois: `npm run dev:api` e
`npm run dev:web` (em terminais separados).

`packages/shared` e `packages/config` (sugeridos no CLAUDE.md) ainda não existem: só
serão criados quando houver código real para compartilhar entre `api` e `web`.
