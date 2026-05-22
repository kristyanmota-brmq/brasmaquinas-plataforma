# TASK-042R — Revisão RT da arquitetura de rede e escolha da alternativa MVP

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** E — Decisão técnica assistida / validação RT
**Área:** layout / domínio / produto / arquitetura
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 768/768 testes · 0 erros tsc · `src/` não alterado
**Documento (produto):** [`docs/relatorios/2026-05-21-TASK-042R.md`](../docs/relatorios/2026-05-21-TASK-042R.md)
**Entrada principal:** [`docs/relatorios/2026-05-21-TASK-042.md`](../docs/relatorios/2026-05-21-TASK-042.md)
**Dependências:** TASK-042 concluída; baseline TASK-041; ADRs 010-014

---

## Objetivo

> Registrar a diretriz arquitetural Brasmáquinas — **"o software deve comparar alternativas de arquitetura principal/ramais e escolher automaticamente a alternativa de menor BOM tecnicamente válida e operacionalmente executável"** — e formalizar o escopo da TASK-043 que implementará o motor de seleção. **Produto: documento.** Nenhum arquivo em `src/` é alterado. Nenhum ADR aberto. Nenhuma premissa formalizada.

---

## Contexto

A TASK-042 concluiu o diagnóstico técnico com 9 alternativas (A0-A8), recomendação MVP preliminar A2 (conservador) ou A3 (agressivo condicional), marcadas `PENDENTE_REVISAO_RT_BRASMAQUINAS`. O usuário/RT reformulou a decisão:

- **A decisão não é "A2 ou A3"** (binária).
- **A decisão é registrar a diretriz** e abrir a TASK-043 (motor de seleção).
- A0/A2/A3 viram candidatos do motor (A1 condicional).
- Critério de validade é **técnico + operacional** (não apenas hidráulico).

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `docs/relatorios/2026-05-21-TASK-042R.md` | criação | Documento de diretriz (produto) — 14 seções |
| `tasks/TASK-042R-revisao-rt-arquitetura-rede.md` | este arquivo | Formal da task |
| `tasks/backlog.md` | atualização | Entrada TASK-042R (concluída) + **reformulação completa** da entrada TASK-043 (motor de seleção, não escolha binária) |
| **`src/`** | **NÃO alterado** | Regra explícita |
| Catálogo, `package.json`, lockfile | NÃO alterado | Regra explícita |
| `docs/decisoes/` | NÃO criado | ADR-015 fica para TASK-043 |
| `docs/metodologia/12-premissas-...md` | NÃO alterado | Premissas formalizadas na TASK-043 |

---

## Critérios de aceite

- [x] Documento `docs/relatorios/2026-05-21-TASK-042R.md` criado com 14 seções
- [x] **Todas as 7 perguntas do briefing original** respondidas explicitamente
- [x] **Diretrizes L1/L2/L3** registradas com classificação e fontes técnicas
- [x] Critérios de validade: **"menor BOM tecnicamente válida e operacionalmente executável"** (Ajuste 1) — 3 categorias documentadas em §3 (hidráulicas, ADRs preservadas, construtibilidade operacional)
- [x] TASK-043 MVP limitada a **A0 + A2 + A3** (A1 condicional) (Ajuste 2) — §7.2
- [x] Linguagem oficial: **BOM estimada / preliminar / de comparação** (não "BOM real") (Ajuste 3) — §6
- [x] Registrado: **função objetivo = custo; restrições duras = hidráulica + construtibilidade** (Ajuste 4) — §5
- [x] **`MAX_VELOCITY_RAMAL_MS = 1,5 m/s` mantido** como referência conservadora; origem NRCS NEH; `PENDENTE_REVISAO_RT_BRASMAQUINAS` (Ajuste 5) — §4 P4 + §5
- [x] **Nenhum ADR aberto**; **nenhuma premissa formalizada em `12-premissas-...md`**; `src/` e catálogo intocados (Ajuste 6)
- [x] Validações finais: tsc 0; vitest 768/768; `git diff -- src/` (Ajuste 7) — §11 + §14
- [x] Escopo formal da TASK-043 detalhado em §7 (componentes, candidatos, função, ADR-015, premissas, testes, critério de aceite)
- [x] Coerência com ADRs 010-014 verificada item por item (§9 — nenhum conflito)
- [x] Próximas tasks em ordem (TASK-043 → TASK-044 → TASK-035 → TASK-034)
- [x] `tasks/backlog.md` atualizado (entrada TASK-042R + reformulação TASK-043)

---

## Fora do escopo

- Implementar motor de seleção arquitetural (TASK-043)
- Alterar `src/`, catálogo, `package.json`, lockfile
- Abrir ADR (ADR-015 fica para TASK-043)
- Formalizar premissa em `12-premissas-...md` (TASK-043)
- Escolher candidato A2/A3/A0 a priori (motor decide por projeto)
- Validar visualmente (sem Playwright)
- Rodar solver para alternativas
- Tocar em TASK-034, TASK-035, TASK-029, TASK-030

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação aplicada |
|-------|---------------|---------|--------------------|
| Documento interpretado como "decisão A2 vs A3" apesar da reformulação | média | médio | §1 Resumo executivo + §2 Mudança paradigmática explícitos; tabela comparativa "Antes vs. Agora" |
| TASK-043 ser aberta com escopo subdimensionado | alta | médio | §7 detalha 9 sub-seções (título, candidatos, função, integração, ADR-015, premissas, testes, aceite, fora do escopo) |
| Falta de NBR específica para `MAX_VEL_RAMAL` | confirmada | baixo | Marcado **[FONTE-TÉCNICA]** NRCS NEH; `PENDENTE_REVISAO_RT_BRASMAQUINAS` explícito |
| Critério L2 (vazão simultânea vs. max) sem confirmação RT | alta | médio | §4 P5 documenta ambos os critérios; decisão final fica na TASK-043 após RT confirmar |
| BOM estimada do motor diferir significativamente do solver real | média | médio | §6 linguagem oficial "BOM estimada/preliminar"; nunca "BOM real" sem solver |

**Dependências:**

- ✅ TASK-042 concluída (diagnóstico)
- ✅ TASK-041 (baseline empírica)
- ✅ ADRs 010-014 (invariantes)
- ✅ Diretriz Brasmáquinas (L1/L2/L3) aprovada

---

## Plano de implementação (executado)

1. ✅ Receber e processar diretriz reformulada (L1/L2/L3 + decisão paradigmática)
2. ✅ Criar documento de diretriz com 14 seções (§0 a §14)
3. ✅ Aplicar 7 ajustes obrigatórios do plano:
   - Ajuste 1: terminologia "tecnicamente válida E operacionalmente executável"
   - Ajuste 2: TASK-043 MVP = A0+A2+A3 (A1 condicional)
   - Ajuste 3: linguagem "BOM estimada/preliminar"; nunca "BOM real"
   - Ajuste 4: função objetivo (custo) vs. restrições duras (engenharia)
   - Ajuste 5: 1,5 m/s mantido; origem NRCS; PENDENTE_REVISAO_RT_BRASMAQUINAS
   - Ajuste 6: nada de ADR, premissa, src/, catálogo
   - Ajuste 7: validações finais tsc/vitest/git diff
4. ✅ Cross-check coerência com ADRs 010-014 (§9 — nenhum conflito)
5. ✅ Atualizar backlog (entrada TASK-042R + reformulação TASK-043)
6. ✅ Validações finais (tsc 0; vitest 768/768; git diff -- src/ vazio para esta task)

---

## Próximas tasks sugeridas

| Ordem | ID | Tipo | Status | Motivo |
|-------|-----|------|--------|--------|
| 1 | **TASK-043** | A | a abrir | Motor de seleção arquitetural por menor BOM válida e executável (escopo formal em §7 do relatório) |
| 2 | **TASK-044** | E | a abrir | Revalidação visual pós-TASK-043 |
| 3 | TASK-035 | A | pendente | BOM de curvas 90° em sub-laterais |
| 4 | TASK-034 | A | pendente | Feedback visual após HTTP 422 |

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | `/iniciar-task` da TASK-042R. Detectado conflito de papel (agente não é RT); proposto modo "preparação para revisão RT". Após diretriz do usuário reformulando a decisão (motor de seleção em vez de escolha binária A2/A3), o escopo foi expandido e formalmente alinhado. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` da TASK-042R. Plano com 14 seções, 7 perguntas respondidas, diretrizes L1/L2/L3, escopo TASK-043 expandido (motor de seleção, candidatos mínimos, ADR-015, premissas, testes). Aprovado com 7 ajustes obrigatórios. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` da TASK-042R. Documento `docs/relatorios/2026-05-21-TASK-042R.md` criado (14 seções, marcadores [FATO]/[DIRETRIZ]/[FONTE-TÉCNICA]/[PROPOSTA-TASK-043]). Critério de validade técnica + operacional (§3) com 3 sub-categorias. Linguagem oficial BOM estimada/preliminar formalizada (§6). Escopo TASK-043 detalhado (§7) com 9 sub-seções, candidatos mínimos A0+A2+A3 (A1 condicional), ADR-015 + 3 premissas para formalizar. Coerência ADRs 010-014 verificada (§9 — nenhum conflito). Nenhum arquivo em `src/` alterado. Nenhum ADR aberto. Nenhuma premissa formalizada. `npx tsc --noEmit` → 0 erros; `npx vitest run` → 768/768; `git diff -- src/` confirma TASK-042R sem alterações em `src/`. |
