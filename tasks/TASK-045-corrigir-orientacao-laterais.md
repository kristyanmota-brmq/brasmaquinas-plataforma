# TASK-045 — Corrigir orientação profissional das laterais e eliminar zigue-zague artificial

**Status:** `concluída` (regressão TASK-044 resolvida)
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / construtibilidade
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 788/788 testes (+9 vs. 779 baseline) · 0 erros tsc · catálogo intocado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-045.md`](../docs/relatorios/2026-05-21-TASK-045.md)
**Dependências:** TASK-044 (regressão registrada); TASK-043 (motor); TASK-041 (baseline); ADRs 010-015

---

## Objetivo

> Corrigir a regressão da TASK-044 (blocker angular + PDF 422) atacando a **causa-raiz** — zigue-zague artificial nas laterais — não apenas o sintoma. Preservar todas as ADRs 010-015. Manter blocker angular como detector. Aceitar perda de economia da TASK-044 se tecnicamente justificada.

---

## Contexto

TASK-044 confirmou que o motor TASK-043 reduziu BOM em −38,7% (R$ 277.955 → R$ 170.264) MAS introduziu blocker angular ("3 conexões fora de 45°/90°/180° em lateral") → PDF 422. Investigação identificou DOIS sintomas independentes:

1. **Zigue-zague visual** nas laterais — `buildLateralRoute` criava cotovelos espúrios quando aspersores tinham desvio em X entre 0,05 e 0,10 m (ruído de rotação Haversine). Tolerância `ROUTE_BUILD_TOL_X_M = 0,05 m` estava desalinhada com o gate operacional `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m`.
2. **Blocker angular 180° antiparalelo** ramal→lateral em A3 central — motor não validava angular como restrição dura.

Esta TASK-045 corrige ambos.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `src/lib/layout/laterais.ts` | modificação | Linha 221: `ROUTE_BUILD_TOL_X_M = 0.05` → `0.10`; comentário atualizado |
| `src/lib/layout/architecture-selector.ts` | modificação | Import de `detectNetworkAngleIssues`; `evaluateCandidate` valida angular como restrição dura |
| `src/lib/layout/__tests__/lateral-zigzag.test.ts` | **criação** | 9 testes T45-1..T45-9 |
| `docs/metodologia/12-premissas-...md` | atualização | `ROUTE_BUILD_TOL_X_M`: 0,05 → 0,10 m; justificativa; histórico |
| `docs/relatorios/2026-05-21-TASK-045.md` | **criação** | Relatório com 14 seções (antes/depois) |
| `docs/relatorios/evidencias/2026-05-21-TASK-045/` | **criação** | 3 PNGs + PDF emitido + trace |
| `tasks/TASK-045-...md` | este arquivo | Plano + fechamento |
| `tasks/backlog.md` | atualização | Status TASK-045 + cabeçalho |
| `src/lib/catalog/aspersores.ts` | **intocado** | Read-only |
| PDF, mapa, aspersor padrão, espaçamento, `package.json`, lockfile | **intocados** | Regras explícitas |

---

## Critérios de aceite — todos atendidos

- [x] `ROUTE_BUILD_TOL_X_M = 0,10 m` (alinhado com `TOLERANCIA_ASPERSOR_EIXO_LATERAL`)
- [x] `architecture-selector.ts:evaluateCandidate` valida angular como restrição dura (Ajustes 3 e 4)
- [x] 9 testes novos em `lateral-zigzag.test.ts` — todos passando
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → **788/788** (779 + 9), sem regressão
- [x] **0 blockers angulares no Projeto A** (verificado por Playwright)
- [x] **PDF HTTP 200 + download** (verificado por `browser_network_requests`)
- [x] **BOM menor que baseline TASK-041:** R$ 265.199,21 < R$ 277.955,01 (−4,6%)
- [x] Tubo LF Ø100mm = 0 barras (ADR-013 preservada)
- [x] Aspersores em kit: 337/337 (ADR-013 preservada)
- [x] Catálogo, PDF, mapa intocados
- [x] ADRs 010-015 preservadas
- [x] Premissa `ROUTE_BUILD_TOL_X_M` atualizada em `12-premissas-...md` (Ajuste 2)
- [x] `ALLOWED_DEFLECTIONS_INTERNAL = [0, 90]` NÃO alterado (Ajuste 6)
- [x] Texto do blocker e PDF gate NÃO alterados
- [x] Validação visual obrigatória executada (Ajuste 8)
- [x] Relatório com antes/depois documentado

---

## Testes obrigatórios — 9 (excede mínimo)

| ID | Cobertura |
|----|-----------|
| T45-1 | Desvio 0,07 m em X NÃO gera cotovelo (era cotovelo com 0,05 m) |
| T45-2 | Desvio 0,15 m continua BLOQUEADO por `detectAxisDeviations` (ADR-011) |
| T45-3 | Desvio 0,10 m exato fica no trilho (limite operacional aceito) |
| T45-4 | Desvio 0,11 m gera cotovelo legítimo |
| T45-5 | Motor marca candidato com blocker angular como `isValid: false` |
| T45-6 | Motor escolhe menor BOM entre candidatos VÁLIDOS |
| T45-7 | Motor cai em `no_valid_candidate` quando todos angularmente inválidos |
| T45-8 | Detector angular continua bloqueando ângulo real (não-regressão) |
| T45-9 | Não-regressão de geometria reta simples |

---

## Fora do escopo

- Remover blocker angular (continua sendo detector legítimo)
- Relaxar `ALLOWED_DEFLECTIONS_INTERNAL`, ADR-010, tolerância angular, texto do blocker, PDF gate
- Voltar DN100 como lateral 5022
- Alterar catálogo, aspersor padrão (5022-SD), espaçamento 12×12
- Alterar PDF ou mapa (exceto renderização de resultado)
- Recalibrar hidráulica
- Alterar L2 (critério vazão) ou `MAX_VELOCITY_RAMAL_MS`
- Tocar em TASK-034/035/046/047

---

## Riscos previstos vs. resultado

| Risco previsto | Resultado real |
|----------------|----------------|
| Mudar `ROUTE_BUILD_TOL_X_M` quebrar testes existentes | 0 regressões — 779/779 passou |
| Motor rejeitar A3 sempre → economia perdida | Economia preservada parcialmente (−4,6%); aceitável |
| Validação angular ser lenta | Tempo trivial; sem impacto perceptível |
| Aspersores em 0,10 m exato → ambíguo | T45-3 cobre limite; comportamento estável |
| Zigue-zague persistir (causa secundária) | Eliminado conforme T45-1 e screenshot |
| ADR-011 quebrar em desvio 0,10 m | T45-2 e T45-3 cobrem; ADR-011 preservada |

---

## Plano de implementação (executado)

1. ✅ Fase 1 — `ROUTE_BUILD_TOL_X_M` 0,05 → 0,10 m em `laterais.ts:221`
2. ✅ Fase 2 — Validação angular como restrição dura em `architecture-selector.ts:evaluateCandidate`
3. ✅ Fase 3 — 9 testes em `lateral-zigzag.test.ts` (T45-1..T45-9)
4. ✅ Fase 4 — Validação visual via Playwright no Projeto A:
   - BOM R$ 265.199,21 (vs. R$ 277.955 TASK-041; vs. R$ 170.264 TASK-044)
   - 0 blockers; 6 avisos
   - PDF HTTP 200 + download
   - Polilinhas visualmente retas no zoom
5. ✅ Fase 5 — Documentação:
   - Premissa `ROUTE_BUILD_TOL_X_M` atualizada em `12-premissas-...md`
   - Relatório criado
   - Backlog atualizado

---

## Próximas tasks sugeridas

| Ordem | ID | Tipo | Motivo |
|-------|-----|------|--------|
| 1 | (B sugerida) | B | **Expor `ArchitectureSelectionResult` na sidebar** — UI ainda não mostra candidato vencedor + BOM por candidato |
| 2 | TASK-035 | A | BOM curvas 90° em sub-laterais |
| 3 | TASK-034 | A | Feedback visual após HTTP 422 (caso raro agora, mas válido) |
| 4 | TASK-046 (sugerida) | D | Calibração `MAX_VELOCITY_RAMAL_MS` (se RT trouxer NBR ou dados) |
| 5 | TASK-047 (sugerida) | D | A1 principal externa (pós-MVP) |

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | `/iniciar-task` da TASK-045 (escopo original "corrigir blocker angular"). Usuário reorientou para "corrigir orientação profissional das laterais + eliminar zigue-zague artificial" — escopo ampliado. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` da TASK-045 (escopo reorientado). Investigação confirmou H1 (`ROUTE_BUILD_TOL_X_M` estrito demais) + H4 (A3 central produz 180°). Plano com 5 fases. Aprovado com 9 ajustes obrigatórios. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` da TASK-045. **Modificações em `src/`:** `laterais.ts:221` (ROUTE_BUILD_TOL_X_M 0,05→0,10) + `architecture-selector.ts:evaluateCandidate` (validação angular como restrição dura usando estrutura completa do fluxo real — principal/adutora/secondaries/physicalColumns/routeCoords). **Criados:** `lateral-zigzag.test.ts` (9 testes), relatório, este arquivo. **Atualizados:** `12-premissas-...md` (entrada `ROUTE_BUILD_TOL_X_M`), backlog. **Resultado empírico:** Projeto A → BOM R$ 265.199,21 (−4,6% vs. baseline TASK-041; +R$ 94.936 vs. TASK-044 com regressão); 0 blockers; PDF HTTP 200 + download; Ø100mm rígido ramais reduzido 416 → 267 barras (−R$ 32.035); HMT 42,5 mca; aspersores em kit 337/337; DN100 LF = 0. Catálogo intocado. ADRs 010-015 preservadas. `ALLOWED_DEFLECTIONS_INTERNAL = [0, 90]` NÃO alterado. `npx tsc --noEmit` → 0 erros; `npx vitest run` → 788/788. |
