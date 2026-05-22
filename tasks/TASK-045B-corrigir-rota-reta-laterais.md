# TASK-045B — Corrigir rota reta das laterais e eliminar lógica ponto-a-ponto em escada

**Status:** `concluída em código` · resultado misto (zigue-zague eliminado; blocker de eixo dispara legitimamente; TASK-046 obrigatória para fechar série)
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / construtibilidade
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 799/799 testes (+11 vs. 788 baseline) · 0 erros tsc · catálogo intocado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-045B.md`](../docs/relatorios/2026-05-21-TASK-045B.md)

---

## Objetivo

> Substituir algoritmo greedy ponto-a-ponto de `buildLateralRoute` por **reta única no eixo (mediana de X)**. Eliminar zigue-zague visual. Aspersor fora de tolerância → blocker via `detectAxisDeviations` (ADR-011), sem cotovelo de compensação. Preservar ADRs 010-015. Validação visual com screenshot obrigatório.

---

## Arquivos impactados

| Arquivo | Tipo | Notas |
|---------|------|-------|
| `src/lib/layout/laterais.ts` | modificação | `buildLateralRoute` reescrita (mediana de X + reta 2 pontos); `ROUTE_BUILD_TOL_X_M` mantida com comentário deprecated |
| `src/lib/layout/__tests__/lateral-reta.test.ts` | **criação** | 11 testes T45B-1..T45B-11 |
| `src/lib/layout/__tests__/lateral-route.test.ts` | ajuste | T28-1, T28-2, T28-3, T28-5, T28-7, T28-8 reescritos para novo contrato |
| `src/lib/layout/__tests__/physical-column-audit.test.ts` | ajuste | T28-c, T28-c-violation, T28-d ajustados |
| `src/lib/layout/__tests__/integration.test.ts` | ajuste | T28-f, T28-h invertidos (blocker DISPARA agora) |
| `src/lib/layout/__tests__/lateral-zigzag.test.ts` | ajuste | T45-1, T45-3, T45-4, T45-9 ajustados |
| `docs/decisoes/ADR-012-lateral-fisica-polilinha-construtivel-0-90.md` | modificação | Emenda interpretativa adicionada |
| `docs/metodologia/12-premissas-...md` | modificação | `ROUTE_BUILD_TOL_X_M` marcada DEPRECATED |
| `docs/relatorios/2026-05-21-TASK-045B.md` | **criação** | Relatório com 13 seções |
| `docs/relatorios/evidencias/2026-05-21-TASK-045B/` | **criação** | 3 PNGs + trace |
| `tasks/backlog.md` | atualização | Entrada TASK-045B + TASK-046 sugerida |
| `tasks/TASK-045B-...md` | este arquivo | Plano + fechamento |
| `src/lib/catalog/aspersores.ts` | **intocado** | Read-only |
| PDF, mapa, aspersor padrão, espaçamento, `package.json`, `lockfile` | **intocados** | Regras |

---

## Critérios de aceite — resultado

- [x] `ROUTE_BUILD_TOL_X_M` deprecated em `12-premissas-...md` (Ajuste 5)
- [x] `buildLateralRoute` retorna reta de 2 pontos via mediana de X (Ajuste 1, Ajuste 2)
- [x] Outlier não mascarado pela mediana (T45B-5 valida — Ajuste 1)
- [x] Aspersor fora de 0,10 m → blocker via `detectAxisDeviations` (T45B-3, Ajuste 3)
- [x] 11 testes novos em `lateral-reta.test.ts`; todos passando (Ajuste 6)
- [x] Testes T28-* / T45-* ajustados (intent preservada)
- [x] ADR-012 com emenda interpretativa; ADR-016 NÃO criado (Ajuste 4)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → **799/799** (788 + 11)
- [x] Catálogo intocado
- [x] PDF, mapa intocados
- [x] ADRs 010, 011, 013, 014, 015 preservadas
- [x] DN100 LF = 0 (ADR-013)
- [x] Validação visual via Playwright executada (Ajuste 7)
- [x] **Laterais visualmente retas** no Projeto A (mudança vs. imagem TASK-045 confirmada)
- [x] Relatório com antes/depois documentado
- [ ] **0 blockers** — NÃO cumprido (1 blocker de eixo presente — comportamento esperado pelo Ajuste 3)
- [ ] **PDF HTTP 200** — NÃO cumprido (422; consequência do blocker)

**Falhas dos 2 últimos critérios são esperadas pelo briefing** (Ajuste 3: blocker é comportamento correto se aspersor fora de 0,10 m). Causa-raiz está em `findOptimalGridAngle` / `generatePhysicalColumns` (fora do escopo desta task; Ajuste 8). TASK-046 prevista para resolver.

---

## Resultado empírico Projeto A

| Indicador | TASK-045 | **TASK-045B** |
|-----------|----------|---------------|
| BOM total | R$ 265.199,21 | **R$ 226.946,41** ⬇️ |
| Blockers | 0 | 1 eixo (28 laterais; máx 7,45 m) |
| PDF gate | HTTP 200 | **HTTP 422** |
| Laterais retas | ✗ zigue-zague | ✅ **retas** |
| Ramais total | 4.062 m | 3.859 m |
| Tubo LF Ø100 | 0 ✅ | 0 ✅ |
| Aspersores em kit | 337/337 | 337/337 |
| HMT | 42,5 mca | 41,0 mca |

---

## Fora do escopo (Ajuste 8)

- Alterar `findOptimalGridAngle`
- Implementar reagrupamento automático
- Catálogo, aspersor padrão, espaçamento, PDF, mapa
- DN100 lateral, TASK-035
- Remover blockers
- Recalibrar hidráulica

---

## Próximas tasks recomendadas

1. **TASK-046 (A — Crítica)** — Corrigir agrupamento/orientação automática para eliminar aspersores genuinamente desalinhados no Projeto A. Sem isso, blocker de eixo persistirá. **Bloqueador para caminho feliz.**
2. (B) Expor `ArchitectureSelectionResult` na sidebar
3. TASK-035 — BOM curvas 90° (relevância reduzida)
4. TASK-034 — Feedback visual após HTTP 422
5. (limpeza) Remover `ROUTE_BUILD_TOL_X_M` deprecated

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | `/iniciar-task` da TASK-045B após usuário rejeitar TASK-045 visualmente (escada persistiu). Diagnóstico: `buildLateralRoute` greedy ponto-a-ponto era estruturalmente errado. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` da TASK-045B. Plano: reescrever algoritmo (mediana de X + reta de 2 pontos); preservar `detectAxisDeviations` como gate; ADR-012 com emenda. Aprovado com 8 ajustes obrigatórios. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` da TASK-045B. **Fase 1:** `buildLateralRoute` reescrita (linhas 257-330 de laterais.ts) — mediana de X + reta de 2 pontos; `anglesValid = true` (single segment). **Fase 2:** 15 testes existentes ajustados (T28-1, T28-2, T28-3, T28-5, T28-7, T28-8, T28-c, T28-c-violation, T28-d, T28-f, T28-h, T45-1, T45-3, T45-4, T45-9). **Fase 3:** 11 testes novos T45B-1..T45B-11 em `lateral-reta.test.ts` — outlier não mascarado, splitByCapacity preserva retas, Projeto-A-like sintético sem zigue-zague, detector angular não-regressão. **Fase 4:** ADR-012 com emenda interpretativa (sem criar ADR-016); `ROUTE_BUILD_TOL_X_M` marcada DEPRECATED em `12-premissas-...md`. **Fase 5:** Validação visual via Playwright no Projeto A — 3 PNGs + trace. **Resultado empírico:** zigue-zague eliminado em código (mudança visual confirmada); MAS blocker de eixo dispara (28 laterais; máx 7,45 m) → PDF 422. **Comportamento esperado pelo Ajuste 3** do briefing. **TASK-046 obrigatória** para corrigir agrupamento/orientação. tsc 0; vitest 799/799; catálogo intocado. |
