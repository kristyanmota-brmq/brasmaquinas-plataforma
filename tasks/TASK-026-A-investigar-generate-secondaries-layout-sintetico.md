# TASK-026-A — Investigar `generateSecondaries` com layout sintético válido

**Status:** `concluída`
**Prioridade:** `P1-crítico`
**Classe:** D — Correção rápida, com regra de escalada obrigatória (mantida — sem escalada)
**Área:** layout / hidráulica / domínio (investigação)
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 738/738 testes · 0 erros tsc · `src/` não alterado

---

## Objetivo

Identificar a causa-raiz de `distribution.secondaries.length === 0` observada na TASK-026 (achado A-1) para um layout sintético com:

- 4 colunas físicas DN50 válidas;
- 8 aspersores por coluna (32 no total);
- `kitAspersorResolvCount = 32`;
- pipeline N-S 1 espaçamento a oeste da coluna 0, `lengthMeters = 84 m`;
- fonte ortogonal ao extremo sul (adutora horizontal).

O produto único desta task é um diagnóstico textual em `docs/relatorios/2026-05-21-TASK-026-A.md` que responda às 7 perguntas listadas abaixo. **Nenhuma alteração em `src/` será feita nesta task.**

---

## Contexto

A TASK-026 (Classe E — Exploratória) executou os passos 1 e 2 do roteiro mínimo da TASK-024D via arquivo de teste temporário (apagado no fechamento). O Cenário 1 mostrou:

- `isComplete = true`;
- 4 colunas físicas DN50 com 8 aspersores cada;
- `kitAspersorResolvCount = 32`, `conexoesFisicasSemSkuCount = 0`;
- `distribution.secondaries.length = 0` ← **objeto desta task**;
- `result.hydraulics.hmt.hmtMca = undefined` como consequência.

A TASK-026-B (Classe A) já adicionou o gate de emissão (PDF bloqueado quando `hydraulics === null` ou `physCols > 0 && sizedSecondaries.length === 0`). Essa task tratou o sintoma; esta task investiga a causa.

---

## Perguntas obrigatórias a responder

1. Quais entradas `generateSecondaries` recebeu no cenário sintético.
2. Quais pré-condições `generateSecondaries` exige.
3. Qual pré-condição falhou, se alguma.
4. Se o problema está no fixture sintético ou no motor.
5. Quais arquivos seriam alterados se houver correção.
6. Quais testes seriam necessários.
7. Se a task continua Classe D ou deve escalar para Classe A.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `tasks/TASK-026-A-investigar-generate-secondaries-layout-sintetico.md` | criação | Este arquivo |
| `tmp/task-026-a-investigation.test.ts` | criação temporária | Reproduz o fixture; instrumenta inputs/outputs de `generateSecondaries`; apagado antes de `/fechar-task` |
| `vitest.task026a.config.ts` | criação temporária | Config Vitest que inclui o teste fora de `src/`; apagado antes de `/fechar-task` |
| `docs/relatorios/2026-05-21-TASK-026-A.md` | criação (em `/fechar-task`) | Relatório final com as 7 respostas |
| `tasks/backlog.md` | modificação (em `/fechar-task`) | Adicionar entrada `TASK-026-A` |

**Nenhum arquivo em `src/` será alterado nesta task.**

---

## Critérios de aceite (Classe D — fase de investigação)

- [x] Arquivo `tasks/TASK-026-A-...md` criado
- [x] Arquivo `tmp/task-026-a-investigation.test.ts` criado e executável via `vitest.task026a.config.ts`
- [x] Fixture sintético reconstruído fielmente conforme `docs/relatorios/2026-05-21-TASK-026.md`
- [x] Output do diagnóstico cobrindo as 7 perguntas capturado por instrumentação
- [x] Arquivos temporários (`tmp/...`, `vitest.task026a.config.ts`) **apagados** antes do `/fechar-task`
- [x] `npx tsc --noEmit` → **0 erros** (após apagar temporários)
- [x] `npx vitest run` → **738/738** (após apagar temporários — sem regressão)
- [x] Relatório final em `docs/relatorios/2026-05-21-TASK-026-A.md` com causa-raiz e decisão de classe
- [x] Nenhum arquivo em `src/`, `src/components/`, `src/app/`, `src/lib/catalog/`, `src/lib/bom.ts` alterado

---

## Regra de escalada (obrigatória)

Se a investigação concluir que a correção exige alterar qualquer um dos seguintes:

- `src/lib/layout/hydraulic-connectivity.ts` (`generateSecondaries`, `columnInletCoord`, `projectOnPolyline`, `routeSecondary`)
- `src/lib/layout/laterais.ts` (`generatePhysicalColumns`)
- `src/lib/layout/irrigation-project.ts` (orquestrador)
- Outras funções de roteamento ou distribuição hidráulica

**então pausar e reclassificar para Classe A** com novo `/planejar` antes de qualquer alteração de produção. Esta task termina com diagnóstico documentado, **nunca** com correção de motor.

Se a causa-raiz for exclusivamente do fixture sintético (ex.: geometria inválida usada na TASK-026), a recomendação é não corrigir o motor — apenas documentar como o fixture deveria ser construído em validações futuras (TASK-024D).

---

## Fora do escopo

- Não corrigir nenhum arquivo em `src/`
- Não alterar solver hidráulico, BOM, catálogo, PDF, mapa ou motor A/B/C
- Não criar testes permanentes em `src/**/__tests__/`
- Não criar ADR
- Não reabrir TASK-026-B (gate já implementado)
- Não validar via projeto real ou pipeline E2E

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Fixture reconstruído não reproduz `secondaries=0` | média | alto | Construir 2–3 variações do fixture com interpretações alternativas; a que reproduzir é a fonte de evidência. |
| Causa-raiz aponta para `generatePhysicalColumns` ou rotinas do motor | média | médio | Documentar; pausar e escalar para Classe A; nova task A subsequente. |
| Causa-raiz é estritamente o fixture original | alta | baixo | Documentar como recomendação para validações futuras (TASK-024D). |

**Dependências:** TASK-026 ✅, TASK-026-B ✅

---

## Pendências abertas

Nenhuma. Investigação concluída sem ação corretiva necessária.

---

## Resultado final

- Causa-raiz: **falso positivo de instrumentação na TASK-026** (campo `hmt.hmtMca` lido em vez de `hmt.totalHMT`). Achado A-1 não-reproduzível; achado A-2 explicado.
- `generateSecondaries` retornou **4 ramais** no cenário fiel (Variant A), não 0.
- `hmt.totalHMT = 37,11 mca` no cenário fiel — solver operando corretamente.
- Decisão de classe: **Classe D mantida.** Sem escalada.
- TASK-026-B permanece um gate defensivo válido (usa `hmt.totalHMT` corretamente).

Relatório completo: `docs/relatorios/2026-05-21-TASK-026-A.md`.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude (agente) | Tarefa criada — fase de investigação iniciada |
| 2026-05-21 | Claude (agente) | Investigação concluída; relatório criado; backlog atualizado; status → `concluída` |
