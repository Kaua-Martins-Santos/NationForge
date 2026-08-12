# @nationforge/web

Frontend do NationForge (Next.js).

Contém o esqueleto criado na **Fase 5** e, desde a **Fase 9a**, as telas de cadastro e
login consumindo a API de verdade. A criação do país e o painel com seus atributos
chegam na Fase 9b.

## Configuração

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` aponta para a API (padrão `http://localhost:3333`). O prefixo
`NEXT_PUBLIC_` expõe a variável ao navegador — nunca coloque segredos ali.

A API precisa estar rodando junto: `npm run dev:api` na raiz.

## Telas

| Rota        | O que faz                                            |
| ----------- | ---------------------------------------------------- |
| `/`         | Mostra a sessão ativa (ou os botões de entrar/criar) |
| `/register` | Cadastro: e-mail, nome do jogador e senha            |
| `/login`    | Login                                                |

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
