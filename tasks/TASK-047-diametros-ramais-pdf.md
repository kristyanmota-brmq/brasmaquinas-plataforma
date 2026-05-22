# TASK-047 — Diâmetros individuais de ramais no PDF

**Status:** `concluída`
**Prioridade:** P2-importante
**Classe:** B — Importante
**Área:** pdf / proposta
**Arquivo:** `tasks/TASK-047-diametros-ramais-pdf.md`
**Concluída em:** 2026-05-22 · 826/826 testes (+9 vs. 817 baseline) · 0 erros tsc · catálogo intocado · orquestrador intocado

> Adicionada ao Memorial Hidráulico do PDF (Página 3) a seção **"Dimensionamento dos ramais"** consumindo exclusivamente `result.hydraulics?.sizedSecondaries`. Tabela com 7 colunas: Ramal, SKU, DN, Comprimento, Velocidade, Hf, Status. Helper puro `mapSizedSecondariesToRows()` em `src/lib/pdf/secondary-rows.ts` mantém o componente PDF livre de lógica de domínio. Status `ok` exibido discreto; demais valores do enum (`velocity_exceeded`, `headloss_exceeded`, `both_exceeded`, `fallback_largest`) exibidos como warning âmbar. Quando `sizedSecondaries` está vazio ou ausente, a seção é omitida — sem erro, sem warning novo. Nenhum cálculo hidráulico, nenhuma seleção de tubo, nenhum blocker, nenhum ADR e nenhuma premissa criados ou alterados.

---

## 1. Contexto

A pendência foi identificada na TASK-024 (Mapa Mestre, Seção 8 — próximas 5 tasks #3) e reforçada pela TASK-024D (matriz de validação, passo 5 do roteiro mínimo) e pelo bloco de valor E07 da TASK-024E. O PDF emitia HMT, decomposição da carga e BOM precificada, mas **não exibia o diâmetro individual de cada ramal** — embora o solver hidráulico (`sizeHydraulics → sizeAllSecondaries`) já calculasse e expusesse `result.hydraulics.sizedSecondaries: SizedSecondaryPipe[]` desde HIST-002.

A TASK-047 fecha esse gap apenas pelo lado do PDF, sem tocar solver, orquestrador, catálogo ou gate.

---

## 2. Decisões editoriais

| Decisão | Motivo |
|---|---|
| Fonte: `result.hydraulics?.sizedSecondaries` | Caminho real do código. Briefing original sugeria `distribution.sizedSecondaries`, mas o campo vive em `HydraulicSizingReport`, não em `DistributionNetwork`. Confirmado pelo usuário (opção A). |
| Helper puro `src/lib/pdf/secondary-rows.ts` | Mantém `PropostaPDF.tsx` livre de lógica; permite testar mapeamento sem renderizar PDF. |
| Enum REAL do `SecondaryStatus` | Valores: `ok`, `velocity_exceeded`, `headloss_exceeded`, `both_exceeded`, `fallback_largest`. Sem prefixo `secondary_`. |
| Status `ok` discreto, ≠ `ok` em warning âmbar | Reduz ruído visual quando todos os ramais estão dentro dos limites. |
| Seção omitida quando `sizedSecondaries.length === 0` | Sem erro, sem warning novo — comportamento conservador, análogo a outras seções condicionais do PDF. |
| Ordenação por `id` numérico/natural | `S01, S02, S03, S10` em vez de ordem lexicográfica `S01, S02, S03, S10`. Garantia de output determinístico no PDF. |
| Não exibir `flowM3h`, `diametroInternoMm`, `velocityExceeds`, `headLossExceeds`, `selectedTube` completo | Campos internos do solver; PDF é proposta apresentada ao cliente. |

---

## 3. Escopo

### Dentro do escopo

- Adição de seção visual ao Memorial Hidráulico (Página 3 do PDF).
- Helper puro de mapeamento + rotulação de status.
- Testes automatizados ≥ 7 cobrindo todas as branches do enum + caso vazio + mapeamento + ordenação.
- Atualização documental (backlog, Mapa Mestre, relatório).

### Fora do escopo (regra do briefing)

- Não alterar `src/lib/layout/irrigation-project.ts` (orquestrador).
- Não alterar `src/lib/layout/hydraulic-sizing.ts` (solver).
- Não alterar `src/lib/layout/secondary-sizing.ts` (seletor de tubo).
- Não alterar `src/lib/catalog/aspersores.ts` (catálogo).
- Não alterar `src/components/map/ProjectMap.tsx` (mapa).
- Não alterar `src/app/api/projetos/[id]/pdf/route.tsx` (gate HTTP 422).
- Não criar/alterar ADR.
- Não criar/alterar premissa em `docs/metodologia/12-premissas-...md`.
- Não criar blocker novo.
- Não fazer Playwright obrigatório (opcional).

---

## 4. Arquivos alterados

| Arquivo | Operação | Notas |
|---|---|---|
| `src/lib/pdf/secondary-rows.ts` | criado | Helper puro: tipos `SecondaryDisplayRow`, `StatusLabel`, `StatusSeverity`; funções `mapSizedSecondariesToRows()` e `secondaryStatusLabel()`. |
| `src/lib/pdf/__tests__/secondary-rows.test.ts` | criado | 9 testes T47-1..T47-9. |
| `src/lib/pdf/PropostaPDF.tsx` | modificado | 1 import; 10 estilos de tabela; ~30 linhas de JSX inseridas na Página 3 entre a seção "Pendências" e o footer. |
| `tasks/TASK-047-diametros-ramais-pdf.md` | criado | Este arquivo. |
| `docs/relatorios/2026-05-22-TASK-047.md` | criado | Relatório de fechamento. |
| `tasks/backlog.md` | modificado | Entrada formal TASK-047 + remoção da bullet "Diâmetros individuais de ramais no PDF" das próximas tarefas sugeridas + header de working tree. |
| `tasks/TASK-024-mapa-mestre-tasks.md` | modificado | E07 movido de pendente para concluído na Seção 2 (bloco de valor) e Seção 3; removido da Seção 4 (futuras) e Seção 8 (próximas 5 tasks). |

---

## 5. Testes T47-1..T47-9

| ID | Cobertura |
|---|---|
| T47-1 | `secondaryStatusLabel("ok")` → `{ text: "OK", severity: "ok" }` |
| T47-2 | `secondaryStatusLabel("velocity_exceeded")` → severity `warning`, texto cita velocidade |
| T47-3 | `secondaryStatusLabel("headloss_exceeded")` → severity `warning`, texto cita perda |
| T47-4 | `secondaryStatusLabel("both_exceeded")` → severity `warning`, texto cita ambos |
| T47-5 | `secondaryStatusLabel("fallback_largest")` → severity `warning`, texto cita fallback |
| T47-6 | `mapSizedSecondariesToRows([])` → `[]` (vazio) |
| T47-7 | Mapeamento completo: `id`, `ramalLabel`, `sku`, `dnLabel` (`Ø 75 mm`), `lengthLabel` (`180,5 m`), `velocityLabel` (`1,35 m/s`), `hfLabel` (`2,84 mca`), `status`, `statusLabel` |
| T47-8 | Ordenação determinística por `id` numérico/natural (`S01, S02, S03, S10`) |
| T47-9 | Função pura — não muta o array de entrada |

---

## 6. Critérios de aceite verificados

- [x] PDF gerado para um `IrrigationProjectResult` válido com `result.hydraulics.sizedSecondaries.length > 0` exibe seção "Dimensionamento dos ramais" no Memorial Hidráulico
- [x] Tabela com colunas: Ramal, SKU, DN, Comprimento, Velocidade, Hf, Status
- [x] Status `ok` discreto; ≠ `ok` exibido com warning âmbar
- [x] Quando `result.hydraulics.sizedSecondaries.length === 0`, seção é omitida sem crash
- [x] Nenhuma lógica de domínio (cálculo hidráulico, seleção de tubo, recalculação) adicionada ao componente PDF
- [x] Helper puro `mapSizedSecondariesToRows` testado em `src/lib/pdf/__tests__/secondary-rows.test.ts`
- [x] ≥ 7 testes novos (entregues: 9) cobrindo status, mapeamento e caso vazio
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 826/826 (817 + 9 novos)
- [x] Nenhum teste existente eliminado ou alterado
- [x] Arquivo `tasks/TASK-047-diametros-ramais-pdf.md` criado
- [x] Relatório `docs/relatorios/2026-05-22-TASK-047.md` criado
- [x] `tasks/backlog.md` atualizado
- [x] `tasks/TASK-024-mapa-mestre-tasks.md` atualizado
- [x] Nenhum arquivo em `src/lib/layout/`, `src/lib/hydraulics/`, `src/lib/catalog/`, `src/components/`, `src/app/api/`, `docs/decisoes/`, `docs/metodologia/` alterado

---

## 7. Pendências abertas

- **Validação visual via Playwright (opcional):** não executada. Se executada, geraria PNG da Página 3 do PDF com a nova seção em projeto real e ficaria em `docs/relatorios/evidencias/2026-05-22-TASK-047/`.
- **Validação RT do PDF como proposta completa:** continua pendente. TASK-047 cobre apenas o gap "diâmetros de ramais ausentes do PDF" — o status de E07 no Mapa Mestre permanece "Validado visualmente no Projeto A — caso único" até o RT aprovar o PDF como apresentável a cliente real.

---

## 8. Rastreabilidade

- Plano aprovado: nesta sessão (Plan + Approve com ajustes; opção A — `result.hydraulics?.sizedSecondaries`).
- Mapa Mestre Seção 8 — próxima task #3 (antes de TASK-047).
- Mapa Mestre Seção 2 — bloco de valor E07 (Tasks vinculadas: TASK-003, TASK-047).
- Relatório: `docs/relatorios/2026-05-22-TASK-047.md`.
- Helper: `src/lib/pdf/secondary-rows.ts`.
- Testes: `src/lib/pdf/__tests__/secondary-rows.test.ts`.
- Consumidor: `src/lib/pdf/PropostaPDF.tsx` (Memorial Hidráulico — Página 3).
- Fonte dos dados: `result.hydraulics.sizedSecondaries` ← `sizeHydraulics()` ← `sizeAllSecondaries()` ← `selectSecondaryPipe()` ← `TUBOS_PVC_RIGIDO` (catálogo).
- ADRs preservadas (não alteradas): ADR-001 a ADR-015.
- Premissas preservadas (não alteradas): `12-premissas-provisorias-e-revisao-rt.md`.
