# @nationforge/api

Backend do NationForge (NestJS).

Contém o esqueleto da aplicação (Fase 4), acesso a dados via Prisma (Fase 3) e
autenticação por e-mail/senha com JWT (Fase 6). Nenhum outro módulo de domínio do jogo
foi implementado ainda.

## Executando

```bash
npm run dev -w @nationforge/api
```

A API sobe em `http://localhost:3333` (porta configurável via `PORT`).

Endpoints disponíveis:

```text
GET  /health          →  { "status": "ok", "timestamp": "..." }
POST /auth/register    body: { email, password }  →  { "accessToken": "..." }
POST /auth/login       body: { email, password }  →  { "accessToken": "..." }
GET  /auth/me          header: Authorization: Bearer <token>  →  { userId, email }
```

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

Model atual: `User` (id, email, passwordHash, createdAt, updatedAt).

## Decisões da Fase 6 (auth)

- **JWT via `@nestjs/jwt` + `passport-jwt`**, sem sessão em servidor.
- **bcrypt** para hash de senha.
- **`class-validator` + `ValidationPipe` global** (com `whitelist` e
  `forbidNonWhitelisted`) valida todo o corpo das requisições antes de chegar no
  controller.
- **Mesma mensagem de erro** para "e-mail não existe" e "senha errada" no login, para
  não revelar quais e-mails estão cadastrados.
- Login ainda não está vinculado a um país — isso é a Fase 8.

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
