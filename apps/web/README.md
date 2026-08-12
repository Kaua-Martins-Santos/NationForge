# @nationforge/web

Frontend do NationForge (Next.js).

Contém o esqueleto criado na **Fase 5**, as telas de cadastro e login (**Fase 9a**) e,
desde a **Fase 9b**, a fundação do país e o painel com seus atributos.

## Configuração

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` aponta para a API (padrão `http://localhost:3333`). O prefixo
`NEXT_PUBLIC_` expõe a variável ao navegador — nunca coloque segredos ali.

A API precisa estar rodando junto: `npm run dev:api` na raiz.

## Telas

| Rota           | O que faz                                                         |
| -------------- | ----------------------------------------------------------------- |
| `/`            | Porta de entrada; quem já tem sessão vai direto para `/dashboard` |
| `/register`    | Cadastro: e-mail, nome do jogador e senha                         |
| `/login`       | Login                                                             |
| `/nations/new` | Fundação do país: nome, bandeira, capital e governo               |
| `/dashboard`   | Painel com os atributos do país                                   |

O fluxo se encadeia pelo estado, não por navegação manual: sem sessão → `/login`; com
sessão e sem país → `/nations/new`; com país → `/dashboard`.

`RequireSession` ([`components/require-session.tsx`](./src/components/require-session.tsx))
é conveniência de UX, **não** segurança: quem controla o navegador contorna qualquer
verificação no cliente. A garantia real está no backend, que exige o token em cada rota
protegida.

## Como o painel apresenta os números

Decisões de forma, tomadas antes de escolher qualquer cor:

- **Não há gráficos.** Os atributos são valores pontuais únicos, sem série temporal —
  nada evolui até o sistema de ticks. Um gráfico exigiria um histórico que não existe, e
  desenhá-lo significaria inventar dados. Por isso também não há indicadores de variação
  ("+2,4%") nem sparklines.
- **Um número-herói** (população), o valor que o painel lidera — exatamente um por tela.
- **Stat tiles** para os demais valores, com números compactos (`1,2 mi`).
- **Medidores** para felicidade e estabilidade, que são índices 0–100 — um valor contra
  seu limite. A trilha vazia é um passo mais claro da mesma cor do preenchimento, para o
  estado ser legível na barra inteira.
- **Cor nunca carrega significado sozinha.** A severidade do medidor aparece também como
  número e como rótulo de estado ("estável", "atenção", "crítico"). As cores de status
  foram verificadas contra o fundo real da aplicação (contraste ≥ 3:1 e separação
  suficiente para daltonismo), não escolhidas a olho.
- **Rótulos e valores usam tinta de texto, nunca a cor do dado** — uma cor de status como
  texto sobre o fundo escuro seria ilegível.

## Como a sessão funciona

O JWT vive em um **cookie httpOnly** definido pela API — não em `localStorage`. Isso
significa que:

- O JavaScript da página **não consegue ler o token**, então uma falha de XSS no futuro
  não vira roubo de sessão.
- Toda requisição usa `credentials: 'include'`
  ([`lib/api.ts`](./src/lib/api.ts)), senão o navegador não envia o cookie.
- Saber se há sessão ativa exige **perguntar à API** (`GET /auth/me`), já que o token é
  opaco para o frontend. Um `401` ali significa "não logado" — um caso esperado, não um
  erro a ser exibido.
- Sair da conta é um `POST /auth/logout`: como o cookie é httpOnly, só o servidor pode
  apagá-lo.

As respostas da API são validadas com **Zod** ([`lib/schemas.ts`](./src/lib/schemas.ts)).
Não é desconfiança do próprio backend: é o que faz uma mudança de contrato aparecer como
erro claro em vez de `undefined` no meio da tela.

## Executando

```bash
npm run dev -w @nationforge/web
```

Sobe em `http://localhost:3000`.

## Scripts

| Comando             | Descrição                             |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Sobe o app em modo watch              |
| `npm run build`     | Build de produção                     |
| `npm start`         | Executa o build de produção           |
| `npm run typecheck` | Verifica os tipos sem emitir arquivos |

Todos também podem ser executados da raiz do monorepo.
