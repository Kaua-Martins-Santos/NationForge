# @nationforge/api

Backend do NationForge (NestJS).

Contém o esqueleto da aplicação (Fase 4), acesso a dados via Prisma (Fase 3),
autenticação com JWT (Fase 6), o perfil do usuário (Fase 7) e a criação de países
(Fase 8). Os atributos do país existem e são persistidos, mas **não evoluem ainda** —
população (Fase 10), economia (Fase 11) e ticks (Fase 19) virão nas próximas fases.

## Executando

```bash
npm run dev -w @nationforge/api
```

A API sobe em `http://localhost:3333` (porta configurável via `PORT`).

Endpoints disponíveis:

```text
GET   /health              →  { status, timestamp }

POST  /auth/register        { email, displayName, password }  →  201 { accessToken } + cookie
POST  /auth/login           { email, password }               →  200 { accessToken } + cookie
POST  /auth/logout                                            →  204 (limpa o cookie)
GET   /auth/me              🔒                                 →  { userId, email }

GET   /users/me             🔒                                 →  { id, email, displayName, createdAt }
PATCH /users/me             🔒 { displayName }                 →  perfil atualizado
PATCH /users/me/password    🔒 { currentPassword, newPassword } →  204 (sem corpo)

POST  /nations              🔒 { name, flag, capital, government } →  201 país criado
GET   /nations/me           🔒                                 →  país do jogador (404 se não tem)
```

🔒 = exige autenticação, aceita **cookie de sessão** (usado pelo navegador) **ou**
`Authorization: Bearer <token>` (útil para curl, Postman e testes).

`GET /auth/me` lê apenas o conteúdo do token (rápido, para checar se a sessão é
válida). `GET /users/me` consulta o banco e devolve o perfil atualizado.

## Banco de dados

O projeto usa PostgreSQL via Prisma. Não usamos Docker aqui — a conexão aponta para uma
instância Postgres já existente na máquina (porta `7789`).

### Configuração

1. Copie o template de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` preenchendo usuário, senha e nome do banco reais, e gere um
   `JWT_SECRET` aleatório (ex.: `openssl rand -hex 32`):

   ```text
   DATABASE_URL="postgresql://USUARIO:SENHA@localhost:7789/nationforge?schema=public"
   JWT_SECRET="..."
   JWT_EXPIRES_IN="1d"
   ```

   O `.env` está no `.gitignore` e nunca deve ser commitado.

3. Aplique as migrations e gere o Prisma Client:

   ```bash
   npx prisma migrate dev
   npm run prisma:generate
   ```

## Schema e migrations

A partir da Fase 6, mudanças de schema usam **migrations versionadas**
(`prisma migrate dev`), não mais `db push`: o schema agora tem histórico real, e cada
alteração precisa ficar registrada em [`prisma/migrations/`](./prisma/migrations/).

Models atuais:

- **`User`** (id, email, displayName, passwordHash, createdAt, updatedAt). `email` é
  credencial privada de login; `displayName` é o nome público do jogador. Ambos únicos.
- **`Nation`** — o país. Relação 1:1 com `User` (`userId` único), com
  `onDelete: Cascade`: apagar o usuário apaga o país.

> Nota: `prisma migrate dev` é interativo e falha em terminais não interativos quando há
> avisos (ex.: adicionar uma constraint `UNIQUE`). Nesses casos, gere o SQL com
> `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`,
> salve em `prisma/migrations/<timestamp>_<nome>/migration.sql` e aplique com
> `prisma migrate deploy`.

## Decisões da Fase 6 (auth)

- **JWT via `@nestjs/jwt` + `passport-jwt`**, sem sessão em servidor.
- **bcrypt** para hash de senha.
- **`class-validator` + `ValidationPipe` global** (com `whitelist` e
  `forbidNonWhitelisted`) valida todo o corpo das requisições antes de chegar no
  controller.
- **Mesma mensagem de erro** para "e-mail não existe" e "senha errada" no login, para
  não revelar quais e-mails estão cadastrados.
- Login ainda não está vinculado a um país — isso é a Fase 8.

## Decisões da Fase 7 (usuários)

- **`toPublicUser()` explícito** ([`public-user.ts`](./src/users/public-user.ts)) em vez
  de serialização automática por decorators: o que sai numa resposta é uma lista
  visível no código, então `passwordHash` só vazaria por decisão deliberada.
- **Troca de senha exige a senha atual** — sem isso, um token vazado permitiria
  sequestro definitivo da conta.
- **Senha atual incorreta retorna 400, não 401.** O usuário está autenticado; um 401
  faria clientes com interceptor de "sessão expirada" deslogarem o jogador por um erro
  de digitação.
- **`PasswordService`** centraliza bcrypt e o custo do hash, usado tanto por `auth`
  (registro/login) quanto por `users` (troca de senha) — evita as duas regras
  divergirem com o tempo.
- **Só existem rotas `/users/me`.** Ler ou alterar outro usuário por id exigiria
  autorização por papéis, que o jogo ainda não tem; a rota existir sem isso seria uma
  brecha.
- Não implementados: exclusão de conta, avatar, listagem pública de jogadores, papéis
  e permissões.

## Decisões da Fase 8 (países)

- **O jogador escolhe apenas 4 campos**: nome, bandeira, capital e governo. População,
  território, PIB, tesouro e índices vêm de
  [`nation-defaults.ts`](./src/nations/nation-defaults.ts), no servidor. Deixar o cliente
  enviá-los permitiria escolher o próprio tesouro inicial (CLAUDE.md seção 33). O
  `ValidationPipe` global com `forbidNonWhitelisted` faz a tentativa retornar 400, e o
  service também ignora o dto para esses campos — há testes cobrindo os dois níveis.
- **Um país por usuário** (`userId` único). Segundo país → 409.
- **Nome de país único** entre todos os jogadores. Nome repetido → 409.
- **Dinheiro em `Decimal(18,2)`, não em float.** Os ticks (Fase 19) farão milhares de
  operações sobre PIB e tesouro; float acumula erro de arredondamento e a seção 25 pede
  determinismo. Escolher agora evita migrar com economia já rodando.
- **População em `BigInt`.** `INTEGER` do Postgres estoura em ~2,1 bilhões, alcançável
  por uma nação grande num jogo de crescimento longo.
- **`toPublicNation()` converte `BigInt` e `Decimal` para `number`.** `JSON.stringify`
  lança `TypeError` em BigInt, e o `Decimal` sairia como objeto. A conversão fica em um
  lugar só, com teste verificando que a resposta traz números.
- **Governo é enum no banco** (`GovernmentType`), conforme a seção 20 — texto livre
  permitiria valores inválidos persistidos.
- **Bandeira é uma string curta (emoji), não upload de imagem** — upload exigiria
  storage, validação de arquivo e CDN, nada disso necessário para o país existir.
- **Não existe rota para ver o país de outro jogador.** Visualização pública chega com
  diplomacia (Fase 22) e rankings (Fase 27), que definirão o que é legítimo expor.

## Decisões da Fase 9a (sessão no navegador)

- **O JWT vai num cookie `httpOnly` + `SameSite=Lax`**, não em `localStorage`. JavaScript
  não consegue ler o token, então um XSS futuro não rouba a sessão. O `SameSite=Lax`
  cobre os casos usuais de CSRF sem precisarmos de um token anti-CSRF separado nesta
  fase.
- **O corpo continua devolvendo `accessToken`.** O navegador ignora e usa o cookie; o
  campo serve a clientes fora do navegador (curl, Postman, testes e2e).
- **`POST /auth/logout` existe porque o cookie é httpOnly** — o frontend não pode
  apagá-lo. A rota não exige autenticação: sair deve funcionar mesmo com token expirado.
- **`AuthCookieService` deriva o `maxAge` do cookie da mesma variável `JWT_EXPIRES_IN`**
  que define a expiração do token. Configurados em lugares separados, cookie e token
  poderiam expirar em momentos diferentes e a sessão falharia de forma confusa.
- **CORS com `credentials: true` e origem explícita** (`WEB_ORIGIN`). Com credentials, o
  navegador rejeita o coringa `*`.
- **[`configure-app.ts`](./src/configure-app.ts) é compartilhado entre `main.ts` e os
  testes e2e.** Antes cada teste montava a aplicação por conta própria — o que permitia
  um middleware existir só no `main.ts`, com os testes passando enquanto o servidor real
  estava mal configurado (ou o contrário).

### Armadilhas do Prisma 7 que apareceram aqui (documentado para não repetir)

- O gerador `prisma-client` infere ESM por padrão; como este projeto é CommonJS,
  `moduleFormat = "cjs"` precisa estar explícito no `schema.prisma`.
- O client gerado usa imports relativos com extensão `.js` (estilo NodeNext). O Jest
  precisa de um `moduleNameMapper` (já configurado) para resolver esses imports de
  volta para os arquivos `.ts`.
- Desde a v7, o `PrismaClient` **não tem engine embutido**: é obrigatório passar um
  driver adapter (`@prisma/adapter-pg` aqui) no construtor.
- O adapter carrega seu compilador de queries via WebAssembly, usando `import()`
  dinâmico. Isso exige a flag `--experimental-vm-modules` do Node ao rodar testes — por
  isso o script `test` usa `cross-env NODE_OPTIONS=--experimental-vm-modules jest`
  (o `cross-env` só existe para essa flag funcionar igual no Windows e no Linux/Mac).

## Scripts

| Comando                   | Descrição                                                     |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev`             | Sobe a API em modo watch                                      |
| `npm run build`           | Compila para `dist/`                                          |
| `npm start`               | Executa a versão compilada                                    |
| `npm test`                | Roda os testes (unitários e e2e)                              |
| `npm run typecheck`       | Verifica os tipos sem emitir arquivos                         |
| `npm run prisma:generate` | Gera o Prisma Client a partir do schema                       |
| `npm run db:push`         | Sincroniza o schema com o banco (prototipagem, sem migration) |

Todos também podem ser executados da raiz do monorepo.
