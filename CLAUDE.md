# NationForge

## 1. VISÃO DO PROJETO

Estamos desenvolvendo o **NationForge**, um simulador multiplayer de países.

O projeto será desenvolvido por dois desenvolvedores com auxílio do Claude Code.

O objetivo não é apenas criar um jogo funcional, mas também construir um projeto tecnicamente sólido que sirva como estudo de:

* Engenharia de software
* Arquitetura
* SOLID
* Clean Architecture
* Domain-Driven Design quando fizer sentido
* TypeScript
* React
* Next.js
* Node.js
* NestJS
* PostgreSQL
* Prisma
* Docker
* Git
* GitHub
* Testes
* CI/CD
* WebSockets
* Sistemas distribuídos quando necessário
* Segurança
* Performance

O projeto deve ser desenvolvido de maneira profissional, mas sem complexidade desnecessária.

---

# 2. CONCEITO DO JOGO

Cada jogador controla um país.

O jogador deverá administrar:

* População
* Economia
* Recursos naturais
* Agricultura
* Indústria
* Energia
* Educação
* Saúde
* Tecnologia
* Infraestrutura
* Exército
* Diplomacia
* Comércio
* Política
* Meio ambiente

O mundo será persistente.

Isso significa que o país continuará evoluindo mesmo quando o jogador estiver offline.

Exemplo:

```text
RELATÓRIO NACIONAL

Últimas 12 horas:

População: +3.245

PIB: +2,4%

Produção de aço: +520 toneladas

Receita: +R$ 2,8 milhões

Evento:
Seca reduziu a produção agrícola em 12%.

Diplomacia:
República de Aurora enviou uma proposta de aliança.
```

---

# 3. PRINCÍPIO FUNDAMENTAL DO DESENVOLVIMENTO

O projeto NÃO deve ser desenvolvido inteiro de uma vez.

O desenvolvimento será dividido em pequenas etapas.

Sempre seguir este ciclo:

```text
ANALISAR
↓
PLANEJAR
↓
EXPLICAR
↓
IMPLEMENTAR
↓
TESTAR
↓
REVISAR
↓
EXPLICAR
↓
SUGERIR COMMIT
↓
PARAR
```

Depois de parar, aguarde o usuário dizer:

```text
próxima etapa
```

Só então continue.

---

# 4. REGRA ABSOLUTA

Nunca implemente várias fases simultaneamente.

Se a tarefa atual for configurar o banco de dados, não implemente autenticação.

Se a tarefa atual for autenticação, não implemente economia.

Se a tarefa atual for economia, não implemente guerra.

Sempre trabalhe somente na etapa atual.

---

# 5. MODO MENTOR

O Claude Code deve agir simultaneamente como:

* Tech Lead
* Software Architect
* Desenvolvedor
* Code Reviewer
* Mentor

O objetivo é que os desenvolvedores entendam o código.

Ao implementar uma funcionalidade importante, explique:

### O que estamos fazendo?

### Por que estamos fazendo?

### Como funciona?

### Qual problema resolve?

### Quais decisões arquiteturais foram tomadas?

Não é necessário explicar cada linha de código.

Priorize explicar decisões importantes.

---

# 6. STACK PRINCIPAL

Utilizar inicialmente:

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* TanStack Query
* Zod

## Backend

* Node.js
* NestJS
* TypeScript
* REST API
* WebSockets

## Banco de dados

* PostgreSQL
* Prisma

## Infraestrutura

* Docker
* Docker Compose
* GitHub Actions

## Testes

* Jest ou Vitest
* Supertest
* Testes unitários
* Testes de integração
* Testes E2E quando necessário

## Qualidade

* ESLint
* Prettier
* Husky
* Conventional Commits
* Swagger / OpenAPI

---

# 7. NÃO ADICIONAR TECNOLOGIAS DESNECESSÁRIAS

Não adicionar:

* Redis
* RabbitMQ
* Kafka
* Kubernetes
* Microsserviços
* Elasticsearch
* GraphQL

simplesmente porque são tecnologias populares.

Primeiro resolva o problema com a solução mais simples.

Só introduza uma tecnologia quando existir uma necessidade real.

Antes de introduzir uma nova tecnologia, explique:

```text
Problema:
...

Solução considerada:
...

Por que precisamos dessa tecnologia:
...

Alternativas:
...

Recomendação:
...
```

---

# 8. ARQUITETURA

Começar com um **monólito modular**.

Não começar com microsserviços.

A arquitetura deve permitir crescimento futuro.

O backend deverá possuir módulos/domínios bem separados.

Possível estrutura:

```text
apps/
├── web/
└── api/

packages/
├── shared/
└── config/
```

Backend:

```text
modules/
├── auth/
├── users/
├── nations/
├── population/
├── economy/
├── resources/
├── agriculture/
├── industry/
├── energy/
├── technology/
├── infrastructure/
├── politics/
├── military/
├── diplomacy/
├── trade/
├── events/
├── reports/
└── rankings/
```

Essa estrutura é apenas uma sugestão.

Analise antes de implementar e altere caso exista uma solução melhor.

---

# 9. SOLID

Utilizar princípios SOLID quando realmente ajudarem.

Especialmente:

* Single Responsibility
* Dependency Inversion
* Open/Closed

Não criar interfaces, classes ou abstrações apenas para "cumprir SOLID".

O código deve continuar simples.

---

# 10. DOMAIN-DRIVEN DESIGN

Utilizar conceitos de domínio quando fizer sentido.

O jogo possui vários domínios:

```text
Nation
Economy
Population
Military
Diplomacy
Trade
Technology
Infrastructure
Events
```

As regras de negócio devem ficar próximas dos respectivos domínios.

Controllers não devem conter regras complexas de negócio.

---

# 11. PAÍS

Cada usuário poderá possuir um país.

O país terá inicialmente:

* ID
* Nome
* Bandeira
* Capital
* População
* Território
* Governo
* PIB
* Tesouro
* Felicidade
* Estabilidade
* Tecnologia
* Poder militar
* Infraestrutura
* Emissões

---

# 12. POPULAÇÃO

Simular:

* Crescimento populacional
* Natalidade
* Mortalidade
* Migração
* Emprego
* Desemprego
* Educação
* Saúde
* Felicidade

A população deverá interagir com a economia.

---

# 13. ECONOMIA

Implementar posteriormente:

* PIB
* Receita
* Despesas
* Impostos
* Inflação
* Dívida pública
* Consumo
* Produção
* Desemprego
* Comércio

As decisões econômicas devem gerar consequências.

Exemplo:

```text
Aumentar impostos

Resultado:

+ Receita
- Consumo
- Felicidade
```

---

# 14. RECURSOS

Recursos naturais:

* Ferro
* Petróleo
* Carvão
* Ouro
* Madeira
* Água
* Gás natural
* Urânio

Cada país poderá ter diferentes recursos.

Isso incentivará comércio.

---

# 15. AGRICULTURA

Implementar:

* Produção
* Consumo
* Estoque
* Clima
* Secas
* Chuvas
* Eficiência
* Tecnologia

---

# 16. INDÚSTRIA

Criar fábricas.

Exemplo:

```text
Fábrica de aço

Entrada:

Ferro
Energia

Saída:

Aço
```

As fábricas terão:

* Custo
* Funcionários
* Produção
* Consumo
* Eficiência
* Tecnologia

---

# 17. ENERGIA

Fontes:

* Carvão
* Petróleo
* Gás
* Nuclear
* Solar
* Eólica
* Hidrelétrica

Cada fonte terá:

* Custo
* Produção
* Eficiência
* Impacto ambiental

---

# 18. TECNOLOGIA

Criar uma árvore tecnológica.

Exemplo:

```text
Agricultura
    ↓
Irrigação
    ↓
Máquinas Agrícolas
    ↓
Agricultura Automatizada
    ↓
Fazendas Inteligentes
```

Outra:

```text
Metalurgia
    ↓
Armas
    ↓
Tanques
    ↓
Mísseis
    ↓
Drones
    ↓
IA Militar
```

O sistema deve ser extensível.

---

# 19. INFRAESTRUTURA

Construções:

* Casas
* Escolas
* Hospitais
* Fazendas
* Fábricas
* Usinas
* Estradas
* Portos
* Aeroportos
* Quartéis

Cada construção deverá possuir:

* Custo
* Tempo
* Benefícios
* Consumo
* Manutenção

---

# 20. POLÍTICA

Tipos iniciais:

* Democracia
* Monarquia
* Ditadura
* República

Posteriormente:

* Aprovação
* Eleições
* Protestos
* Corrupção
* Instabilidade
* Golpes

---

# 21. DIPLOMACIA

Permitir:

* Alianças
* Tratados
* Pactos de não agressão
* Comércio
* Compartilhamento de tecnologia
* Embargos
* Guerra

---

# 22. COMÉRCIO

Criar comércio entre países.

Exemplo:

```text
País A
vende petróleo
↓
País B

País B
vende máquinas
↓
País A
```

Posteriormente:

* Oferta
* Demanda
* Preços
* Contratos
* Mercado global

---

# 23. MILITAR

Unidades:

* Soldados
* Tanques
* Aviões
* Navios
* Mísseis
* Drones

O resultado de uma guerra deverá considerar:

* Quantidade
* Tecnologia
* Moral
* Logística
* Economia
* Terreno
* Estratégia

Começar com uma versão simples.

---

# 24. EVENTOS

Eventos aleatórios:

* Pandemia
* Terremoto
* Furacão
* Seca
* Descoberta de petróleo
* Crise econômica
* Revolução
* Boom tecnológico
* Migração
* Descoberta científica

Criar o sistema de eventos de maneira extensível.

---

# 25. SISTEMA DE TEMPO

Criar posteriormente um sistema de ticks.

Inicialmente:

```text
1 tick = 1 hora do jogo
```

Cada tick poderá processar:

```text
População
↓
Economia
↓
Produção
↓
Consumo
↓
Recursos
↓
Eventos
↓
Diplomacia
↓
Relatórios
```

O sistema deverá ser determinístico quando possível e permitir testes.

---

# 26. OFFLINE

O país continuará evoluindo enquanto o jogador estiver offline.

Não é necessário manter o servidor executando uma simulação individual a cada segundo.

Utilizar timestamps e processamento baseado no tempo decorrido quando fizer sentido.

Projetar essa parte cuidadosamente para evitar exploits.

---

# 27. RELATÓRIOS

Criar relatórios de acontecimentos.

Exemplo:

```text
RELATÓRIO NACIONAL

População:
+3.245

PIB:
+2,4%

Produção:
+5%

Felicidade:
-1,2%

Eventos:
Seca atingiu o norte.

Diplomacia:
Nova proposta de aliança recebida.
```

---

# 28. MAPA

Posteriormente criar mapa mundial.

O jogador poderá:

* Visualizar países
* Clicar em países
* Ver informações
* Visualizar fronteiras
* Ver recursos
* Ver guerras
* Ver alianças

Não implementar mapa complexo no início.

---

# 29. MULTIPLAYER

O mundo será compartilhado.

Posteriormente utilizar WebSockets para:

* Atualizações
* Diplomacia
* Mercado
* Guerra
* Chat

Não implementar isso antecipadamente.

---

# 30. RANKINGS

Rankings:

* País mais rico
* Maior população
* Maior felicidade
* Maior poder militar
* Maior tecnologia
* Maior exportador
* Menor emissão
* Melhor infraestrutura

---

# 31. CONQUISTAS

Criar sistema genérico de achievements.

Exemplos:

```text
Primeiro Milhão

Tenha 1.000.000 habitantes.


Potência Industrial

Produza 100.000 toneladas de aço.


Diplomata

Faça 10 alianças.


Pacifista

Passe 365 dias sem guerra.


Império

Controle 10 territórios.
```

---

# 32. IA CONSELHEIRA

Posteriormente integrar uma IA.

O jogador poderá perguntar:

```text
Por que minha economia está ruim?
```

ou:

```text
Devo aumentar os impostos?
```

A IA deverá analisar os dados reais do país.

Não implementar agora.

Apenas manter a arquitetura preparada.

---

# 33. SEGURANÇA

Desde o começo:

* Validar inputs
* Autenticação
* Autorização
* Hash de senha
* Rate limiting
* Proteção contra SQL Injection
* Não confiar no frontend
* Validar regras no backend
* Secrets em environment variables
* Nunca commitar secrets

---

# 34. TESTES

Toda regra de negócio importante deverá possuir testes.

Priorizar testes para:

* Economia
* População
* Produção
* Recursos
* Ticks
* Eventos
* Guerra
* Diplomacia

Não criar testes artificiais apenas para aumentar cobertura.

---

# 35. GIT

Nunca fazer commit automaticamente.

Nunca fazer push automaticamente.

O usuário fará os commits.

Utilizar Conventional Commits:

```text
feat:
fix:
refactor:
test:
docs:
chore:
```

Exemplos:

```text
feat(auth): add user registration

test(auth): add registration tests

feat(nation): add nation creation

test(nation): add nation creation tests
```

Os commits devem ser pequenos.

---

# 36. BRANCHES

Usar:

```text
main
```

e branches de funcionalidade:

```text
feature/auth
feature/nation
feature/economy
feature/population
feature/map
feature/diplomacy
```

Nunca desenvolver tudo diretamente na main.

---

# 37. NÃO FAZER

Não:

* Implementar o projeto inteiro de uma vez.
* Criar centenas de arquivos sem necessidade.
* Criar abstrações prematuras.
* Criar microsserviços inicialmente.
* Usar tecnologias sem necessidade.
* Criar funções gigantes.
* Criar controllers com regras de negócio complexas.
* Usar `any` sem justificativa.
* Ignorar testes.
* Fazer commits automaticamente.
* Fazer push automaticamente.
* Apagar código sem explicar.
* Refatorar partes não relacionadas.
* Modificar funcionalidades futuras durante uma tarefa atual.

---

# 38. FLUXO OBRIGATÓRIO DE CADA ETAPA

Antes de implementar:

```text
## Objetivo

O que vamos fazer?

## Motivo

Por que isso é necessário?

## Arquitetura

Como isso será estruturado?

## Arquivos

Quais arquivos serão criados/modificados?

## Implementação

Agora implemente somente essa etapa.
```

Depois:

```text
## Testes

Execute os testes necessários.

## Validação

Execute:

- lint
- typecheck
- build

quando aplicável.

## Revisão

Verifique se a implementação está coerente.

## Explicação

Explique o que foi feito.

## Commit

Sugira uma mensagem de Conventional Commit.

## FIM

Pare e aguarde "próxima etapa".
```

---

# 39. ROADMAP

Seguir aproximadamente:

```text
FASE 1
Setup inicial

FASE 2
Monorepo e estrutura

FASE 3
PostgreSQL + Prisma

FASE 4
Backend inicial

FASE 5
Frontend inicial

FASE 6
Autenticação

FASE 7
Usuários

FASE 8
Criação de países

FASE 9
Dashboard

FASE 10
População

FASE 11
Economia

FASE 12
Recursos

FASE 13
Produção

FASE 14
Agricultura

FASE 15
Indústria

FASE 16
Energia

FASE 17
Infraestrutura

FASE 18
Tecnologia

FASE 19
Sistema de tempo

FASE 20
Eventos

FASE 21
Relatórios

FASE 22
Diplomacia

FASE 23
Comércio

FASE 24
Militar

FASE 25
Mapa

FASE 26
Multiplayer

FASE 27
Rankings

FASE 28
Conquistas

FASE 29
IA Conselheira

FASE 30
Testes e qualidade

FASE 31
Performance

FASE 32
CI/CD

FASE 33
Deploy
```

Esse roadmap pode ser alterado quando dependências técnicas exigirem.

---

# 40. PRIMEIRA TAREFA

O projeto está começando do ZERO.

Não assuma que nenhum arquivo ou tecnologia está configurado.

Primeiro:

1. Verifique o ambiente.
2. Verifique versões disponíveis do Node, npm/pnpm e Docker.
3. Verifique se Git está instalado.
4. Analise a pasta atual.
5. Proponha a estrutura inicial.
6. Inicialize o projeto.
7. Configure TypeScript.
8. Configure ESLint.
9. Configure Prettier.
10. Configure Git.
11. Configure Conventional Commits.
12. Configure Docker.
13. Prepare PostgreSQL.
14. Crie README inicial.
15. Faça uma aplicação mínima funcionar.
16. Rode os testes.
17. Rode lint.
18. Rode typecheck.
19. Rode build quando aplicável.

NÃO implemente ainda:

* Autenticação
* Usuários
* Países
* Economia
* População
* Guerra
* Diplomacia
* Mapa
* IA

Apenas prepare a fundação do projeto.

Ao terminar:

1. Explique o que foi criado.
2. Explique as decisões importantes.
3. Mostre como executar o projeto.
4. Mostre os comandos de validação.
5. Sugira um commit.
6. PARE.

Aguarde o usuário dizer:

```text
próxima etapa
```

antes de continuar.

---

# 41. COMANDO INICIAL

Quando o Claude Code for iniciado, o usuário deverá poder simplesmente dizer:

"Comece a Fase 1."

A partir daí, siga todas as regras deste documento.

Lembre-se:

**Não tenha pressa.**

O objetivo é construir um projeto grande de maneira incremental, profissional e compreensível.
