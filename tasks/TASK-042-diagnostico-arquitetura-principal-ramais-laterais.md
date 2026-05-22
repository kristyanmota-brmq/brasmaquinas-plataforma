# TASK-042 — Diagnóstico profissional da arquitetura principal/ramais/laterais

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica / Diagnóstico de engenharia
**Área:** layout / domínio / produto / arquitetura
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 768/768 testes · 0 erros tsc · `src/` não alterado
**Relatório (produto):** [`docs/relatorios/2026-05-21-TASK-042.md`](../docs/relatorios/2026-05-21-TASK-042.md)
**Dependências:** TASK-040 concluída (ADR-014); TASK-041 (baseline empírica)

---

## Objetivo

> Diagnosticar se a arquitetura atual da rede (principal/ramais/laterais) está profissionalmente correta ou se o software está apenas criando uma solução hidraulicamente válida, porém cara. **Produto: documento técnico de diagnóstico.** Nenhum arquivo em `src/` é alterado.

---

## Contexto

A TASK-041 confirmou que a TASK-040 eliminou o blocker técnico DN75 e liberou o PDF no Projeto A (HTTP 200). Custo: BOM R$ 226.724,81 → R$ 277.955,01 (+R$ 51.230 / +22,6%). Maior driver: PVC rígido Ø100mm em ramais (416 barras × R$ 215 = R$ 89.440 = 32% da BOM).

Esta task investiga **se a arquitetura atual é o ótimo ou apenas o aceitável** — e propõe alternativas para o MVP (sem implementar nada).

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `docs/relatorios/2026-05-21-TASK-042.md` | criação | Produto da task — 18 seções, 9 alternativas (A0-A8), recomendação preliminar para MVP marcada `PENDENTE_REVISAO_RT_BRASMAQUINAS` |
| `tasks/TASK-042-diagnostico-...md` | este arquivo | Formal da task |
| `tasks/backlog.md` | atualização | Classe `D` → `A`; status `pendente` → `concluída`; resumo |
| **`src/`** | **NÃO alterado** | Regra explícita |
| Catálogo, `package.json`, lockfile | NÃO alterado | Regra explícita |
| `docs/decisoes/` | NÃO criado | ADR-015 fica para TASK-043 (implementação) |

---

## Critérios de aceite

- [x] Documento `docs/relatorios/2026-05-21-TASK-042.md` criado com 18 seções
- [x] Todas as **13 perguntas do briefing original** respondidas explicitamente
- [x] **9 alternativas** avaliadas (A0 baseline + A1-A8 conforme briefing)
- [x] **7 critérios técnicos** + **5 critérios de construtibilidade operacional** (Ajuste 6) + **5 critérios de risco comercial** (Ajuste 7) aplicados a cada alternativa
- [x] Cada afirmação classificada como **[FATO]** / **[INFER]** / **[HIPÓTESE]** / **[REC-PRELIM]** (Ajuste 1)
- [x] Cada alternativa classificada como **regra técnica / boa prática / decisão de engenharia / decisão comercial** (Ajustes 2 e 5)
- [x] **A0 — manter arquitetura atual** explícita como baseline (Ajuste 3)
- [x] **Recomendação MVP marcada `PENDENTE_REVISAO_RT_BRASMAQUINAS`** (Ajuste 4)
- [x] **Estimativas em faixa** (baixa/média/alta) ou método explícito (Ajuste 5)
- [x] Recomendação MVP conservadora: A2 (refinamento de A0) — compatível com ADR-010/011/012/013/014; sem mudar catálogo/aspersor/espaçamento/PDF (Ajuste 8)
- [x] **Nenhum ADR aberto** — ADR-015 fica para TASK-043 (Ajuste 9)
- [x] Próximas tasks em ordem objetiva: TASK-043 → TASK-044 → TASK-035 → TASK-034 (Ajuste 10)
- [x] Validações finais: `npx tsc --noEmit`, `npx vitest run`, `git diff -- src/` (Ajuste 11)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 768/768 (sem regressão)
- [x] `git diff -- src/` confirma TASK-042 não alterou `src/`
- [x] Catálogo, `package.json`, lockfile intocados

---

## Fora do escopo

- Implementar qualquer alternativa (A1–A8)
- Alterar `src/`, catálogo, `package.json`, lockfile
- Abrir ADR (ADR-015 fica para TASK-043)
- Rodar solver para alternativas — estimativas qualitativas
- Decidir entre A2 e A3 sem RT
- Tocar em TASK-034, TASK-035, TASK-029, TASK-030
- Validar visualmente (sem Playwright nesta task)

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação aplicada |
|-------|---------------|---------|--------------------|
| Diagnóstico subjetivo sem RT | alta | médio | Toda recomendação MVP marcada `PENDENTE_REVISAO_RT_BRASMAQUINAS`; classificação por tipo (regra técnica/boa prática/decisão eng/decisão comercial) explícita em cada alternativa |
| Estimativa de BOM sem solver | alta | baixo | Faixas qualitativas (baixa/média/alta) ou método explícito; nunca número exato |
| Recomendação errada → task-filha implementa subótimo | média | alto | Submeter ao usuário/RT; TASK-043 só abrir após revisão |
| Hipótese arquitetural lida como conclusão | média | médio | Marcação `[FATO]` / `[INFER]` / `[HIPÓTESE]` / `[REC-PRELIM]` em todo o documento (Ajuste 1) |
| Conflito de classe esboço (D) vs briefing (A) | confirmado | baixo | Atualizado no backlog (D → A) |

**Dependências:**

- ✅ TASK-040 concluída (ADR-014)
- ✅ TASK-041 (baseline empírica)
- ✅ Catálogo de preços disponível
- ✅ Código-fonte (`principal.ts`, `secondary-sizing.ts`, `hydraulic-connectivity.ts`) disponível para leitura

---

## Plano de implementação (executado)

1. ✅ Leitura de `principal.ts`, `secondary-sizing.ts`, `hydraulic-connectivity.ts`, `bom.ts`, catálogo
2. ✅ Decomposição da BOM categoria por categoria (somou exatamente R$ 277.955,01)
3. ✅ Análise da geração da principal (borda Y, lado por proximidade da captação)
4. ✅ Análise dos ramais (Q por max setor; `MAX_VEL=1,5 m/s` força DN100 para Q ≥ 20 m³/h)
5. ✅ Identificação das 3 alavancas (L1 posição da principal, L2 vazão de projeto, L3 limite de velocidade)
6. ✅ Avaliação das 9 alternativas (A0-A8) com 7 critérios técnicos + 10 critérios complementares
7. ✅ Classificação por tipo de regra
8. ✅ Recomendação preliminar MVP (A2; A3 condicional ao RT)
9. ✅ Validações finais (tsc 0 erros, vitest 768/768, git diff -- src/ vazio para TASK-042)
10. ✅ Atualização do backlog (classe D→A, status concluída)

---

## Próximas tasks sugeridas

1. **TASK-043** — Implementar alternativa MVP escolhida pelo RT (A2 ou A3) + ADR-015
2. **TASK-044** — Revalidação visual pós-TASK-043
3. **TASK-035** — BOM curvas 90° em sub-laterais (pendência da TASK-028)
4. **TASK-034** — Feedback visual após HTTP 422

Tasks adicionais sugeridas (não bloqueiam MVP): TASK-045 (revisão de `max(setor)` para vazão de projeto do ramal), TASK-046 (calibração RT de `MAX_VEL` em ramais), TASK-047 (A7 — orientação automática).

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | `/iniciar-task` da TASK-042. Verificado: TASK-041 concluída; baseline BOM R$ 277.955,01; ADRs 010-014 ativas; classe D do esboço alinhada para A conforme briefing. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` da TASK-042. Plano com 18 seções, 9 alternativas (A0-A8), critérios técnicos + construtibilidade operacional + risco comercial, recomendação MVP marcada `PENDENTE_REVISAO_RT_BRASMAQUINAS`. Aprovado com 11 ajustes obrigatórios. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` da TASK-042. Documento `docs/relatorios/2026-05-21-TASK-042.md` criado (18 seções, 9 alternativas, marcadores [FATO]/[INFER]/[HIPÓTESE]/[REC-PRELIM]). Análise baseada em leitura literal de `principal.ts`, `secondary-sizing.ts`, `hydraulic-connectivity.ts`, catálogo. Decomposição da BOM somou exatamente R$ 277.955,01. Recomendação MVP: A2 (refinamento conservador de A0), com A3 como opção agressiva condicional ao RT. Nenhum ADR aberto. Nenhum arquivo em `src/` alterado. `npx tsc --noEmit` → 0 erros; `npx vitest run` → 768/768; `git diff -- src/` confirma TASK-042 sem alterações em `src/`. |
