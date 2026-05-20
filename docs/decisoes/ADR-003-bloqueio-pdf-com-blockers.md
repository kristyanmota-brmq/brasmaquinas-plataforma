# ADR-003 — Bloqueio de PDF quando há blockers ativos

**Data:** 2026-05-19
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

O diagnóstico TASK-001 identificou que a rota de PDF (`/api/projetos/[id]/pdf/route.tsx`) verificava apenas `isComplete && bom` antes de renderizar o documento. O campo `diagnostics.blockers` não era verificado. Um projeto com `hydraulicSolverStatus === "blocked"` ou `corridorValidated === false` podia gerar PDF normalmente, contradizendo o gate de emissão definido em `docs/metodologia/06-orcamento-proposta.md §5`.

O único gate real de emissão existia no código, mas estava incompleto. A correção era trivial — não requeria Motor de Governança A/B/C.

---

## Decisão

Decidimos que a rota de PDF retorna **HTTP 422** com JSON estruturado `{ error: "PDF_BLOCKED", message, blockers }` quando `diagnostics.blockers.length > 0`, antes de qualquer chamada a `renderToBuffer`. A lógica de extração dos blockers foi extraída como função pura `pdfEmissionBlockers(result)` em `irrigation-project.ts`, testável com vitest sem dependência de Next.js.

---

## Alternativas consideradas

### Alternativa A — Verificação inline na rota, sem função pura

**Descrição:** Adicionar `if (result.diagnostics?.blockers?.length) return 422` diretamente no corpo da rota.

**Por que foi descartada:** Rotas Next.js não são testáveis com vitest. Extrair `pdfEmissionBlockers` permite testar os três cenários (blockers vazios, blockers ativos, diagnostics nulo) sem montar a rota.

### Alternativa B — Emitir PDF com watermark de "bloqueado"

**Descrição:** Gerar o PDF mas com marca d'água indicando que há pendências.

**Por que foi descartada:** Um PDF entregue ao cliente — mesmo com marca — é um documento de proposta. O risco comercial e técnico de um PDF com blocker ativo chegar ao cliente é alto e não justifica a complexidade da watermark.

### Alternativa C — Rebaixar blockers a warnings para liberar emissão

**Descrição:** O usuário poderia override os blockers para gerar o PDF com justificativa.

**Por que foi descartada:** Override de blockers é funcionalidade do Motor de Governança (TASK-002), que requer designação de responsável e log de auditoria. Implementar override sem log é pior do que não ter override.

---

## Consequências

### Positivas

- Propostas com blockers não chegam ao cliente por construção — nenhum controle manual necessário.
- `pdfEmissionBlockers` é testável e auditável independentemente.
- A UI pode diferenciar bloqueio técnico de erro inesperado via discriminated union no estado de erro.

### Negativas / trade-offs

- A rota retorna 422 para qualquer blocker, inclusive os que o usuário poderia considerar aceitáveis. Override só será possível após Motor de Governança (TASK-002).
- Novos blockers adicionados a `generateProposalDiagnostics` são automaticamente aplicados ao gate de PDF — requer cuidado ao classificar algo como blocker vs. warning.

### Neutras

- `pdfEmissionBlockers` retorna `[]` quando `diagnostics` é `null` (projeto sem cálculo completo retorna 422 pelo check de `isComplete` anterior, não por blockers).

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/irrigation-project.ts` | criada `pdfEmissionBlockers(result): string[]` |
| `src/app/api/projetos/[id]/pdf/route.tsx` | gate de blockers adicionado antes de `renderToBuffer` |
| `src/components/map/ProjectMap.tsx` | estado `pdfError` como discriminated union; painel diferenciado |
| `src/lib/layout/__tests__/pdf-guard.test.ts` | 3 testes criados |

---

## Classificação

- decisão de engenharia
- governança de bloqueio/emissão

---

## Referências

- TASK-003 — Bloquear PDF quando há blockers ativos
- `docs/relatorios/2026-05-19-TASK-003.md`
- `docs/relatorios/2026-05-19-diagnostico-software-atual.md` §1.4

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
