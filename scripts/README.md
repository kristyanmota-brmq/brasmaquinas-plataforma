# scripts/

Scripts standalone executáveis via `npx tsx`. Não fazem parte da build do Next.js. Não rodam automaticamente (não há `prisma/seed.ts` nem hook em `package.json`).

## seed-e06-fixtures.ts

Cria 4 projetos fixtures no banco para habilitar validação visual de E06 (Mapa e Workspace) — endereça pendência da TASK-048 (Cenários 2-5 NÃO EXECUTADOS por ausência de fixtures).

### O que cria

| ID | Nome | Cenário coberto |
|---|---|---|
| `fixture-e06-blocker` | FIXTURE E06 — PDF bloqueado | Bomba HMT/vazão insuficiente → blocker hidráulico → HTTP 422 ao clicar PDF |
| `fixture-e06-9setores` | FIXTURE E06 — 9 setores | `jornadaHoras = 9` → setoresCount 9 |
| `fixture-e06-14setores` | FIXTURE E06 — 14 setores | `jornadaHoras = 14` → setoresCount 14 |
| `fixture-e06-21setores` | FIXTURE E06 — 21 setores | `jornadaHoras = 21` → setoresCount 21 (referência) |

> **Nota sobre a contagem de setores:** o schema atual amarra `setoresCount = jornadaHoras` ([`src/lib/layout/layout-use-cases.ts:154`](../src/lib/layout/layout-use-cases.ts#L154)) e `jornadaHoras` é literal `9 | 14 | 21`. Por isso os fixtures cobrem 9/14/21 (não 2/3/4 como discutido inicialmente na TASK-048). Decisão registrada na abertura da TASK-049.

### Como executar

Pré-requisito: `.env.local` com `POSTGRES_PRISMA_URL` e `POSTGRES_URL_NON_POOLING` configuradas (o servidor Next.js precisa subir corretamente — se `npm run dev` funciona, o seed funciona).

```bash
# Criar/atualizar os 4 fixtures (idempotente via upsert por ID)
npx tsx scripts/seed-e06-fixtures.ts

# Remover os 4 fixtures (whitelist explícita de IDs)
npx tsx scripts/seed-e06-fixtures.ts --clean

# Ciclo completo (limpar + recriar)
npx tsx scripts/seed-e06-fixtures.ts --clean && npx tsx scripts/seed-e06-fixtures.ts
```

### Invariantes garantidos pelo script

- **Projeto A não é alterado.** O ID `cmpfu7e4b0001ulshh0ni8jhd` é tratado como read-only. O script:
  - lê `data` e `ownerId` via `findUnique`;
  - faz snapshot de `updatedAt` antes de gravar fixtures;
  - assert pós-execução que `updatedAt` é idêntico ao snapshot — se diferir, ROLLBACK automático (delete dos 4 fixtures).
- **`--clean` usa whitelist explícita** de 4 IDs. Nunca deleta por prefixo, por `ownerId`, nem por nome.
- **ownerId dos fixtures = ownerId do Projeto A**, garantindo visibilidade na listagem `/projetos` (que filtra por `ownerId === userId` Clerk).
- **IDs fixos** começam com `fixture-e06-*` e nunca colidem com Projeto A (assert no código).

### Como verificar manualmente

Após executar:

1. **No banco:** `SELECT id, name, status FROM "Project" WHERE id LIKE 'fixture-e06-%' ORDER BY name;` deve retornar 4 linhas.
2. **Na UI:** acessar `/projetos` autenticado com o mesmo usuário Clerk dono do Projeto A — verá 5 entradas (Projeto A + 4 fixtures).
3. **Projeto A intacto:** `SELECT "updatedAt" FROM "Project" WHERE id = 'cmpfu7e4b0001ulshh0ni8jhd';` deve manter o mesmo timestamp anterior à execução.

### O que o script NÃO faz

- Não altera o schema (`prisma/schema.prisma`).
- Não cria migração Prisma.
- Não toca `src/`.
- Não muda invariantes técnicas (catálogo, premissas, ADRs, orquestrador).
- Não executa Playwright (revalidação visual fica para TASK-050).

### Rastreabilidade

- Task: [`tasks/TASK-049-fixtures-validacao-visual-e06.md`](../tasks/TASK-049-fixtures-validacao-visual-e06.md)
- Relatório: [`docs/relatorios/2026-05-22-TASK-049.md`](../docs/relatorios/2026-05-22-TASK-049.md)
- Origem das pendências cobertas: TASK-048 (Cenários 2-5 NÃO EXECUTADOS).
