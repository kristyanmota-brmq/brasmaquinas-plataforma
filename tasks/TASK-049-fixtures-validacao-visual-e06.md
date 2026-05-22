# TASK-049 — Criar fixtures de validação visual para E06

**Status:** `concluída` (com adaptação documentada — fixtures cobrem jornadas 9/14/21 em vez de 2/3/4 conforme restrição estrutural do schema)
**Prioridade:** P2-importante
**Classe:** B — Importante
**Área:** infraestrutura / fixtures / governança
**Arquivo:** `tasks/TASK-049-fixtures-validacao-visual-e06.md`
**Concluída em:** 2026-05-22 · 826/826 testes preservados · 0 erros tsc · `src/` não alterado · Projeto A não alterado

> Criado script standalone `scripts/seed-e06-fixtures.ts` + documentação `scripts/README.md`. Script lê o Projeto A (`cmpfu7e4b0001ulshh0ni8jhd`) read-only, usa como template (`data` + `ownerId`), e grava 4 fixtures: `fixture-e06-blocker` (bomba insuficiente → blocker hidráulico real) e `fixture-e06-9setores`/`fixture-e06-14setores`/`fixture-e06-21setores` (variando `jornadaHoras` para variar setorização). Executado com sucesso em DB local: 4/4 fixtures gravados, blocker confirmado, setoresCount bateu o alvo (9, 14, 21), Projeto A `updatedAt` preservado, `--clean` testado e remove só os 4 IDs whitelisted.

---

## 1. Restrição estrutural descoberta na implementação

O briefing original pediu fixtures "2/3/4 setores". Durante a implementação, ao ler [`src/lib/layout/layout-use-cases.ts:154`](../src/lib/layout/layout-use-cases.ts#L154), descobri:

```typescript
return {
  jornadaHoras: jornada,
  laminaMm: LAMINA_MM,
  setoresCount: jornada,  // ← setoresCount === jornadaHoras (literal)
  ...
};
```

Combinado com [`src/app/projetos/[id]/layout-schema.ts:89`](../src/app/projetos/[id]/layout-schema.ts#L89):

```typescript
jornadaHoras: 9 | 14 | 21;  // tipo literal restrito
```

**Conclusão:** `setoresCount ∈ {9, 14, 21}` — não há caminho para 2/3/4 sem alterar `src/`. PAREI antes de implementar e reportei ao usuário. Decisão tomada em conjunto: **adaptar para jornadas 9/14/21** (opção A da pergunta), preservando Classe B (sem tocar `src/`). Cobertura da TASK-014 (labels com múltiplos setores) fica intacta — apenas o range muda.

---

## 2. O que foi entregue

### Script principal: `scripts/seed-e06-fixtures.ts`

Executável via `npx tsx scripts/seed-e06-fixtures.ts`. Funções:

- **Modo padrão:** cria/atualiza os 4 fixtures (idempotente via `prisma.project.upsert` por ID).
- **`--clean`:** remove os 4 fixtures via whitelist explícita de IDs.

Estrutura:
1. Lê Projeto A via `findUnique` (read-only).
2. Snapshot de `updatedAt` antes de qualquer escrita.
3. Calcula `physicalColumns` via `calculateIrrigationProject(dataA)` (orquestrador é puro — não escreve em nada).
4. Constrói 4 payloads:
   - `fixture-e06-blocker`: copy do `dataA` + override `pump: { hmtMca: 5, vazaoMaxM3h: 5 }`.
   - `fixture-e06-9setores` / `14setores` / `21setores`: copy do `dataA` + override `sectorization` via `buildSectorizationForJornada(physicalColumns, jornada, ...)`.
5. Para cada fixture: valida via `calculateIrrigationProject` (blocker presente onde esperado; `setoresCount` igual ao alvo). Se falhar, aborta.
6. Grava via `prisma.project.upsert` com ID explícito.
7. Re-lê Projeto A e assert `updatedAt` idêntico ao snapshot. Se diferir → **ROLLBACK automático** (delete dos 4 fixtures) + exit 1.
8. Confirma visibilidade dos 4 fixtures para `ownerId` do Projeto A.

### Documentação: `scripts/README.md`

Instruções de uso, invariantes garantidos, como verificar manualmente, o que o script não faz.

---

## 3. Validações executadas (output real do script)

```
[seed-e06] Lendo Projeto A (cmpfu7e4b0001ulshh0ni8jhd)…
[seed-e06]   ownerId=user_3E2tksp9EZFK9Mz34myn6Zyefpb • sprinklers=344 • vazaoPorAspersor=1.50 m³/h • tempoPorSetor=58 min
[seed-e06] Calculando physicalColumns via orquestrador (read-only)…
[seed-e06]   physicalColumns=31
[seed-e06] Validando e gravando 4 fixtures…
[seed-e06]   fixture-e06-blocker: setoresCount=21 (esperado 21) • blockers=1
[seed-e06]   fixture-e06-9setores: setoresCount=9 (esperado 9) • blockers=0
[seed-e06]   fixture-e06-14setores: setoresCount=14 (esperado 14) • blockers=0
[seed-e06]   fixture-e06-21setores: setoresCount=21 (esperado 21) • blockers=0
[seed-e06] ✓ Projeto A inalterado (updatedAt preservado)
[seed-e06] ✓ 4/4 fixtures visíveis para ownerId=user_3E2tksp9EZFK9Mz34myn6Zyefpb:
[seed-e06]     - fixture-e06-14setores | FIXTURE E06 — 14 setores | DRAFT
[seed-e06]     - fixture-e06-21setores | FIXTURE E06 — 21 setores | DRAFT
[seed-e06]     - fixture-e06-9setores | FIXTURE E06 — 9 setores | DRAFT
[seed-e06]     - fixture-e06-blocker | FIXTURE E06 — PDF bloqueado | DRAFT
[seed-e06] ✅ Seed completo
```

E o `--clean`:

```
[seed-e06] Removendo fixtures por whitelist: fixture-e06-blocker, fixture-e06-9setores, fixture-e06-14setores, fixture-e06-21setores
[seed-e06] ✓ Removidos 4 fixtures
[seed-e06] ✓ Projeto A continua existindo (id=cmpfu7e4b0001ulshh0ni8jhd, name="TASK-027 A — Cenário Limpo")
```

---

## 4. Decisões e regras

| Decisão | Justificativa |
|---|---|
| Fonte do template = Projeto A read-only | Layout válido completo já existe; evita reimplementar geração de polígono + sprinklers no seed |
| `ownerId` copiado do Projeto A | Página `/projetos` filtra por `ownerId === userId Clerk`; ownerId fixo invisibilizaria os fixtures |
| Blocker via `pump: { hmtMca: 5, vazaoMaxM3h: 5 }` | HMT real do Projeto A é 41,3 mca; 5 mca é insuficiente garantido — `validatePump()` retorna `pump_insufficient_head` → blocker em `generateProposalDiagnostics` |
| `--clean` por whitelist de 4 IDs | Proibido prefixo amplo ou `ownerId` (regra do briefing); garante que nada além dos 4 fixtures pode ser apagado |
| Validação via `calculateIrrigationProject` antes de gravar | Confirma comportamento esperado (blocker, setoresCount) com o orquestrador real, não simulação |
| Rollback automático se Projeto A alterado | Defesa em profundidade — proibição de alterar Projeto A é validada após gravação |
| Script standalone (não `prisma/seed.ts`) | Evita execução automática em `prisma migrate dev`; `npx tsx scripts/seed-e06-fixtures.ts` é explícito |
| Sem alteração em `package.json` | Conforme briefing — usuário decidiu não adicionar atalho de script agora |

---

## 5. Arquivos alterados

| Arquivo | Operação | Notas |
|---|---|---|
| `scripts/seed-e06-fixtures.ts` | criado | 244 linhas; script principal |
| `scripts/README.md` | criado | Documentação operacional |
| `tasks/TASK-049-fixtures-validacao-visual-e06.md` | criado | Este arquivo |
| `docs/relatorios/2026-05-22-TASK-049.md` | criado | Relatório de fechamento |
| `tasks/backlog.md` | modificado | Entrada formal TASK-049 + ajuste das próximas tarefas |
| `tasks/TASK-024-mapa-mestre-tasks.md` | modificado | E06 bloco de valor (Tasks vinculadas), Seção 4 (futuras), Seção 12 (rastreabilidade) |

### Arquivos NÃO alterados (regra do briefing)

- `src/**` — invariante absoluta da Classe B.
- `src/lib/catalog/aspersores.ts` — catálogo read-only.
- `src/components/map/`, `src/app/projetos/`, `src/lib/pdf/` — fora do escopo.
- `prisma/schema.prisma`, `prisma/migrations/**` — schema preservado.
- `prisma/seed.ts` — **explicitamente não criado** (evita execução automática).
- `package.json` — não modificado (regra do briefing).
- `docs/decisoes/ADR-*.md` — nenhuma ADR.
- `docs/metodologia/12-premissas-...md` — premissas preservadas.
- `Project` com ID `cmpfu7e4b0001ulshh0ni8jhd` — read-only confirmado por snapshot.

---

## 6. Critérios de aceite verificados

- [x] `scripts/seed-e06-fixtures.ts` criado e executável via `npx tsx`
- [x] `scripts/README.md` criado com instruções de uso, remoção, verificação
- [x] 4 fixtures gravados no DB com nomes "FIXTURE E06 — *"
- [x] IDs explícitos não colidem com Projeto A (assert no código)
- [x] `ownerId` dos fixtures = `ownerId` do Projeto A
- [x] Projeto A não alterado — `updatedAt` idêntico antes/depois (assert passou)
- [x] Fixture blocker: `calculateIrrigationProject` retorna `blockers.length === 1`
- [x] Fixtures de setores: `setoresCount` bateu exatamente o alvo (9, 14, 21)
- [x] Modo `--clean` testado — remove apenas os 4 IDs whitelisted; Projeto A preserved
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 826/826 (preservado)
- [x] Nenhum arquivo em `src/`, catálogo, PDF, mapa, orquestrador, ADR, premissa alterado
- [x] Nenhuma migração Prisma criada
- [x] `package.json` não alterado
- [x] **TASK-050 sugerida** para re-execução de cenários da TASK-048 com fixtures plantados

### Critério adaptado (transparência)

- **Briefing original:** fixtures com 2/3/4 setores DEVEM bater o alvo.
- **Realidade:** schema restringe `setoresCount = jornadaHoras ∈ {9, 14, 21}`. Tornar 2/3/4 possível exigiria alterar `src/` (fora do escopo Classe B).
- **Decisão conjunta:** trocar para jornadas 9/14/21 (opção A da pergunta interativa). Aprovado pelo usuário antes da implementação.
- **Resultado:** os 3 fixtures de setores bateram exatamente os alvos novos (9, 14, 21).

---

## 7. Pendências abertas

- **TASK-050 — Re-executar cenários 2-5 da TASK-048 com fixtures E06** (Classe E): usar os 4 fixtures plantados para validar visualmente `pdfError.invalidHydraulicSegments` (Cenário 2) e labels com setorizações distintas (Cenários 3-5 — agora 9/14/21 em vez de 2/3/4).
- **Promoção de E06**: depende da TASK-050 (validação visual). Esta TASK-049 não promove E06 — apenas habilita.
- **`aria-expanded` no toggle do drawer** (H1 da TASK-048): permanece como Classe D futura, sem mudança nesta task.

---

## 8. Rastreabilidade

- Plano aprovado: nesta sessão com ajustes (Classe B; jornadas 9/14/21).
- Origem das pendências cobertas: TASK-048 (Cenários 2-5 NÃO EXECUTADOS).
- Script: `scripts/seed-e06-fixtures.ts`.
- Documentação: `scripts/README.md`.
- Relatório: `docs/relatorios/2026-05-22-TASK-049.md`.
- Mapa Mestre atualizado: Seções 2 (E06 bloco de valor), 4 (E06 futuras), 12 (rastreabilidade).
- ADRs preservadas (não alteradas): ADR-001 a ADR-015.
- Premissas preservadas (não alteradas): `12-premissas-...md`.
- Projeto A: `cmpfu7e4b0001ulshh0ni8jhd` — read-only confirmado.
