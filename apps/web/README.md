# @nationforge/web

Frontend do NationForge (Next.js).

No momento contém apenas o esqueleto criado na **Fase 5**: uma página inicial estática
com Tailwind CSS. Nenhuma tela de jogo foi implementada, e o frontend ainda **não**
chama a API — isso entra no Dashboard (Fase 9).

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
