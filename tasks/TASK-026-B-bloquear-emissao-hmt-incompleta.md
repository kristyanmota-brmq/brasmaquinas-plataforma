# TASK-026-B — Bloquear emissão quando HMT ou cálculo hidráulico essencial estiver indefinido

**Status:** `concluída`
**Prioridade:** `P1-crítico`
**Classe:** A — Crítica
**Área:** governança / pdf / hidráulica
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21

---

## Objetivo

Garantir que a proposta/PDF nunca seja emitida quando o cálculo hidráulico essencial estiver incompleto ou indefinido — derivada do achado A-2 da TASK-026 (`distribution.secondaries = 0`, `hydraulics` inválido e `pdfEmissionBlockers = 0` simultaneamente).

---

## Contexto

Na TASK-026 (Classe E — Exploratória), a validação sintética encontrou um cenário em que o projeto era considerado completo (`isComplete = true`) mas a hidráulica estava estruturalmente vazia (`secondaries = []`) e o `pdfEmissionBlockers` retornava lista vazia — significando que a rota de PDF emitiria o documento. Isto representa risco direto de proposta inválida para cliente.

Esta task NÃO corrige a causa-raiz (achado A-1 — investigação de `generateSecondaries` fica em TASK-026-A). Adiciona apenas o gate de emissão que detecta o sintoma e bloqueia a saída.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/bom.ts` | modificação | Bloco TASK-026-B em `generateProposalDiagnostics()` adicionando 2 blockers; nenhuma alteração na geração de materiais |
| `src/lib/layout/sprinkler-grid-optimizer.ts` | modificação | Filtro do otimizer: novos blockers de cálculo incompleto não devem penalizar candidatos (mesma lógica do filtro "BOM incompleta") |
| `src/lib/layout/__tests__/pdf-emission-hmt-gate.test.ts` | criação | 7 testes T26B-a..g |
| `tasks/TASK-026-B-bloquear-emissao-hmt-incompleta.md` | criação | Este arquivo |
| `tasks/backlog.md` | modificação | Entrada TASK-026-B como `concluída` |

---

## Critérios de aceite

- [x] `pdfEmissionBlockers()` permanece passthrough puro (`result.diagnostics?.blockers ?? []`)
- [x] Blocker novo dispara quando `hydraulics === null` em projeto completo
- [x] Blocker novo dispara quando `totalHMT` é NaN, Infinity, 0 ou negativo
- [x] Blocker novo dispara quando há colunas físicas e `sizedSecondaries.length === 0`
- [x] Blockers novos NÃO disparam quando `isComplete === false`
- [x] Mensagens contêm a chave técnica ("HMT" ou "ramal correspondente") e ação ("revisar")
- [x] `generateSecondaries`, layout, roteamento, solver, catálogo, BOM de materiais, mapa e PDF route NÃO foram alterados
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 738/738 (731 prévios + 7 novos)
- [x] Nenhuma lógica de domínio movida para UI
- [x] Nenhum SKU do catálogo alterado

---

## Testes criados

`src/lib/layout/__tests__/pdf-emission-hmt-gate.test.ts` — 7 testes:

1. **T26B-a** — projeto completo, HMT válida e ramais coerentes → sem blocker novo
2. **T26B-b** — projeto completo, `hydraulics === null` → blocker de HMT
3. **T26B-c** — projeto completo, `totalHMT = NaN` → blocker de HMT
4. **T26B-d** — projeto completo, `totalHMT = 0` → blocker de HMT
5. **T26B-e** — projeto completo, `nColunasLaterais = 4` e `sizedSecondaries.length = 0` → blocker de distribuição (com contagem `4 coluna(s)` no texto)
6. **T26B-f** — projeto `isComplete === false` → blockers da TASK-026-B não disparam
7. **T26B-g** — textos dos blockers contêm "HMT" ou "ramal correspondente" e "revisar"

---

## Decisões

### Por que `bom.ts` e não `irrigation-project.ts`?

Para preservar `pdfEmissionBlockers()` como passthrough puro (`result.diagnostics?.blockers ?? []`) e manter todos os blockers em um único ponto de geração (`generateProposalDiagnostics`).

### Por que o critério de HMT inválida cobre 4 condições?

Apenas `=== undefined` não é suficiente: `totalHMT` é tipado como `number` mas pode ser `NaN`/`Infinity` em runtime se entradas estiverem corrompidas, ou `0` se solver retornou zeros silenciosamente. O critério composto (`!hydraulics || !Number.isFinite(x) || x <= 0`) cobre todos os estados estruturalmente inválidos.

### Por que distribuição inconsistente é `physCols > 0 && secondaries === 0`?

O domínio Brasmáquinas não admite projeto válido sem ramais quando há colunas físicas — cada `PhysicalColumn` é alimentada por exatamente um ramal vindo da principal (TASK-009C). A relação `physicalColumns.length > 0 && secondaries.length === 0` é, por definição, estado inconsistente — não configuração válida.

### Por que o gate de distribuição usa `sizedSecondaries.length` em vez de `secondaries.length`?

`generateProposalDiagnostics` não recebe `result.hydraulic.secondaries` diretamente. `sizedSecondaries` é populado em `sizeHydraulics()` com 1:1 correspondência com `secondaries` (mesmo array dimensionado). Equivalência comprovada na cadeia atual do orquestrador.

### Por que filtrar os novos blockers no otimizer?

O otimizer ranqueia candidatos por violações hidráulicas reais (velocidade, pressão, bomba) — mesma justificativa do filtro `"BOM incompleta"` já existente. Blockers de cálculo incompleto representam falha de processo, não restrição hidráulica do layout. Sem o filtro, o teste `sprinkler-grid-optimizer.test.ts > candidato com bomba adequada recebe hydraulicBlockers = []` quebrava porque o achado A-1 também atinge candidatos sintéticos do otimizer. Esta é a única alteração fora de `bom.ts` e segue o mesmo padrão surgical-fix.

---

## Fora do escopo

- Não corrigir `generateSecondaries` em `hydraulic-connectivity.ts` (TASK-026-A)
- Não alterar `sizeHydraulics` nem cálculos de HMT
- Não alterar layout schema ou `actions.ts`
- Não alterar a rota de PDF
- Não alterar `pdfEmissionBlockers()` (permanece passthrough puro)
- Não alterar geração de materiais da BOM (apenas blockers em `generateProposalDiagnostics`)
- Não alterar componentes de UI
- Não criar ADR — adição surgical em motor de diagnósticos já existente

---

## Pendências abertas

- [ ] **TASK-026-A** — Investigar `generateSecondaries` retornando vazio para layout sintético com 4 colunas físicas válidas (Classe D ou A após investigação)

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude (agente) | Tarefa criada e concluída |
