# @nationforge/api

Backend do NationForge (NestJS).

Contém o esqueleto da aplicação (Fase 4), acesso a dados via Prisma (Fase 3),
autenticação com JWT (Fase 6), o perfil do usuário (Fase 7), a criação de países (Fase 8)
e o domínio População (Fase 10).

A população **já evolui com o tempo**; os demais atributos do país continuam estáticos —
economia (Fase 11) e o sistema de ticks generalizado (Fase 19) virão nas próximas fases.

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

`GET /nations/me` põe a simulação demográfica em dia antes de responder, e traz o domínio
População aninhado:

```json
{
  "name": "...",
  "government": "MONARCHY",
  "treasury": 5000000,
  "population": {
    "total": 1001156,
    "employed": 580670,
    "unemployed": 420486,
    "unemploymentRate": 42,
    "birthRatePerThousand": 18,
    "deathRatePerThousand": 8,
    "health": 50,
    "education": 10,
    "simulatedUntil": "..."
  }
}
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
- **`Nation`** — o país: identidade e os atributos que ainda não têm domínio próprio.
  Relação 1:1 com `User` (`userId` único), com `onDelete: Cascade`.
- **`PopulationState`** — o domínio População, 1:1 com `Nation`. Dono único do número de
  habitantes (`total`).

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

## Decisões da Fase 10 (população)

- **Uma tabela por domínio.** `population_states` é 1:1 com `nations`, e cada domínio
  futuro (economia, recursos, indústria) ganha a sua. Assim cada fato tem um único dono e
  a tabela `nations` não vira um registro de 80 colunas. O número de habitantes **saiu de
  `nations`** e passou a morar em `population_states.total`: manter os dois seria ter duas
  fontes da verdade para o mesmo dado.
- **A população evolui por tempo decorrido, não por processo em background**
  (CLAUDE.md seção 26). `GET /nations/me` põe a simulação em dia antes de responder.
- **O tick é a defesa contra exploits**, e tem três partes — a terceira só existe porque
  um teste a cobrou (ver [`population-growth.ts`](./src/population/population-growth.ts)):
  1. Só ticks **inteiros** de 1 hora são aplicados, e o marco avança em múltiplos exatos
     da duração do tick, nunca para "agora". Recarregar não gera população.
  2. Cada tick é aplicado **individualmente em laço**, para que 10 ticks de uma vez
     equivalham a 1 tick dez vezes.
  3. Toda a aritmética usa **milionésimos de habitante**, e o resto fracionário é
     persistido em `growthCarryMicro`. A primeira versão arredondava para habitante
     inteiro a cada cálculo e descartava a fração — quem recarregava de hora em hora
     acumulava MENOS gente que quem esperava um dia. Há um teste garantindo a
     equivalência exata dos dois caminhos.
- **Regras puras e sem `Math.random()`.** Determinismo é requisito da seção 25: mesmas
  entradas, mesma saída, sempre — o que torna as regras testáveis e auditáveis.
- **Emprego é derivado, não armazenado.** Depende da demanda por trabalho, que pertence à
  economia; um campo no banco ficaria desatualizado. Quando a economia existir, a função é
  substituída por uma que olhe a demanda real.
- **Catch-up limitado a 1 ano** de ausência, para limitar o custo do laço.
- **Pool de conexões com teto explícito** ([`prisma.service.ts`](./src/prisma/prisma.service.ts)):
  o padrão do driver é proporcional ao número de CPUs, e com 9 suítes de teste em paralelo
  isso estourava o `max_connections` do Postgres — a suíte falhava se um servidor de dev
  estivesse rodando. `DATABASE_POOL_MAX` ajusta o teto.
- **`testTimeout` de 30s** (config do Jest no `package.json`): o `beforeAll` dos e2e compila
  o `AppModule` inteiro e abre conexão com o banco, o que passa dos 5s padrão do Jest em
  execução fria. O sintoma era uma suíte que falhava na primeira rodada e passava na
  segunda — flakiness, não erro de lógica.

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
