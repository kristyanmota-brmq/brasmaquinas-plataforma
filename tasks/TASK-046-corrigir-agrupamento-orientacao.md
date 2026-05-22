# TASK-046 — Corrigir agrupamento/orientação automática das laterais no Projeto A

**Status:** `concluída` — série de validação visual TASK-027→046 FECHADA
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / geometria
**Criado em:** 2026-05-22
**Atualizado em:** 2026-05-22
**Concluída em:** 2026-05-22 · 809/809 testes (+10 vs. 799 baseline) · 0 erros tsc · catálogo intocado
**Relatório:** [`docs/relatorios/2026-05-22-TASK-046.md`](../docs/relatorios/2026-05-22-TASK-046.md)

---

## Objetivo

> Corrigir a causa raiz do desalinhamento aspersor-eixo no Projeto A (que disparou blocker na TASK-045B), eliminando distorção métrica da geração da malha. **Geração em frame métrico local** + gate de desvio em `findOptimalGridAngle`. Preservar ADRs e TASK-045B (lateral reta).

---

## Resultado empírico Projeto A

| Indicador | TASK-045B | **TASK-046** |
|-----------|-----------|--------------|
| BOM total | R$ 226.946,41 | **R$ 213.740,15** (−R$ 13.206) |
| Blockers | 1 eixo (28 lat; máx 7,45 m) | **0** ✅ |
| PDF gate | HTTP 422 | **HTTP 200 + download** ✅ |
| Laterais retas | ✅ | **✅** preservado |
| Aspersores em kit | 337/337 | **344/344** |
| Orientação | 31° | **59°** (gate desvio aplicado) |
| DN100 LF | 0 ✅ | **0** ✅ (ADR-013) |
| Ramais total | 3.859 m | **2.736 m** |

vs. baseline TASK-041 (R$ 277.955): **−R$ 64.215 / −23,1%** ⬇️

---

## Arquivos impactados

| Arquivo | Tipo | Notas |
|---------|------|-------|
| `src/lib/layout/sprinkler-grid.ts` | reescrita | `generateRotatedSprinklerGrid` em frame métrico local; `findOptimalGridAngle` com gate de desvio (default `spacingMeters = 12`) |
| `src/lib/layout/__tests__/grid-orientation.test.ts` | **criação** | 10 testes T46-1..T46-10 |
| `docs/relatorios/2026-05-22-TASK-046.md` | **criação** | Relatório com 14 seções (diagnóstico + matriz + antes/depois) |
| `docs/relatorios/evidencias/2026-05-22-TASK-046/` | **criação** | 4 PNGs + PDF emitido + trace |
| `tasks/TASK-046-corrigir-agrupamento-orientacao.md` | este arquivo | Plano + fechamento |
| `tasks/backlog.md` | atualização | TASK-046 → concluída; cabeçalho |
| **`src/lib/catalog/aspersores.ts`** | **intocado** | Read-only |
| PDF, mapa, aspersor padrão, espaçamento, `package.json`, lockfile | **intocados** | Regras |
| ADRs | **não criado** | ADR-012 emenda TASK-045B preservada |

---

## Critérios de aceite — todos atendidos

- [x] Geração da malha em frame métrico local (Ajuste 1)
- [x] `findOptimalGridAngle` com gate de desvio (Ajuste 2)
- [x] Assinatura compatível (`spacingMeters` default 12)
- [x] **0 blockers no Projeto A** (validado por Playwright)
- [x] **PDF HTTP 200 + download** (validado por `browser_network_requests`)
- [x] **Aspersores dentro de 0,10 m do eixo** (validado por T46-1/2/5; visual)
- [x] **Laterais retas** preservadas (TASK-045B; T46-8 valida)
- [x] `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` não relaxada
- [x] Blocker `detectAxisDeviations` preservado (dispara como gate final via fallback)
- [x] DN100 LF = 0 (ADR-013)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 809/809 (+10 novos T46)
- [x] Catálogo, PDF, mapa, aspersor padrão, espaçamento intocados
- [x] ADRs 010, 011, 012 emenda, 013, 014, 015 preservadas
- [x] Sem ADR novo
- [x] Diagnóstico geométrico executado ANTES da implementação (Ajuste 1 do briefing)

---

## Diagnóstico geométrico — executado antes da implementação

Script temporário `tmp/task-046-diagnose.ts` (apagado após análise) extraiu polígono real do Projeto A via Prisma e rodou matriz ângulo × maxDeviation. **Apenas 0° e 45° tinham maxDev ≤ 0,10 m** com algoritmo antigo; todos os outros 88 ângulos tinham desvios entre 5,9-10,5 m. **Causa-raiz estrutural confirmada**: `turf.pointGrid` + `turf.transformRotate` em graus geográficos.

---

## Testes obrigatórios (T46-1..T46-10)

| ID | Cobertura |
|----|-----------|
| T46-1 | Ângulo 31° → maxDev ≤ 0,01 m (era ~9 m) |
| T46-2 | Ângulos 17° e 73° → maxDev ≤ 0,01 m |
| T46-3 | Espaçamento real entre vizinhos = 12 m ± 0,01 m em vários ângulos |
| T46-4 | Pontos dentro do polígono (point-in-polygon métrico) |
| T46-5 | Integração: `detectAxisDeviations` zero violations no Projeto-A-like |
| T46-6 | `findOptimalGridAngle` compatível (default `spacingMeters` = 12) |
| T46-7 | `findOptimalGridAngle` escolhe ângulo com maxDev ≤ 0,10 m (gate) |
| T46-8 | `buildLateralRoute` continua reta de 2 pontos (TASK-045B preservada) |
| T46-9 | Polígono retangular: maxDev ≈ 0 em vários ângulos |
| T46-10 | Polígono muito pequeno: 0 ou 1 aspersor (fallback) |

---

## Fora do escopo (Ajustes do briefing)

- Não relaxar `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m`
- Não voltar a criar escada
- Não alterar `buildLateralRoute` (TASK-045B preservada)
- Não remover blockers
- Não alterar catálogo, aspersor padrão, espaçamento, PDF, mapa
- Não mexer em TASK-035
- Não criar ADR novo

---

## Próximas tasks recomendadas

| Ordem | ID | Tipo | Motivo |
|-------|-----|------|--------|
| 1 | TASK-035 | A | BOM curvas 90° (relevância reduzida — laterais retas) |
| 2 | TASK-034 | A | Feedback visual após HTTP 422 (caso raro agora) |
| 3 | (B) | B | Expor `ArchitectureSelectionResult` na sidebar |
| 4 | (limpeza) | B | Remover `ROUTE_BUILD_TOL_X_M` deprecated |
| 5 | TASK-046 (calibração) | D | `MAX_VELOCITY_RAMAL_MS` (NRCS NEH) |

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-22 | Claude Opus 4.7 | `/iniciar-task` da TASK-046 após TASK-045B revelar blocker legítimo (28 laterais; máx 7,45 m). |
| 2026-05-22 | Claude Opus 4.7 | `/planejar` da TASK-046 original. Plano com extensão de `findOptimalGridAngle` aprovado com 9 ajustes obrigatórios (incluindo diagnóstico geométrico ANTES de implementar). |
| 2026-05-22 | Claude Opus 4.7 | **Diagnóstico geométrico executado**: extraído polígono real do Projeto A via Prisma + matriz ângulo × maxDeviation. Achado crítico: apenas 0° e 45° eram válidos (eixos cardinais Haversine); causa-raiz estrutural — `turf.pointGrid` + `turf.transformRotate` em graus geográficos. **Plano revisado proposto**: reescrever `generateRotatedSprinklerGrid` em frame métrico local; `findOptimalGridAngle` como defesa secundária. Aprovado com 6 ajustes adicionais. |
| 2026-05-22 | Claude Opus 4.7 | `/implementar` da TASK-046 (plano revisado). **Fase 1:** `generateRotatedSprinklerGrid` reescrita em frame métrico local — centroide em lng/lat → vértices em metros via rotação plana → bbox em metros → grade uniforme em metros → point-in-polygon métrico (ray-casting) → rotação plana inversa → conversão final lng/lat. `generateRotatedSprinklerGridWithOffset` virou base; `generateRotatedSprinklerGrid` chama com offset (0,0). **Fase 2:** `findOptimalGridAngle` estendida com gate de desvio aspersor-eixo (≤ TOLERANCIA_ASPERSOR_EIXO_LATERAL); `spacingMeters` default 12; fallback `console.warn` se nenhum válido. **Fase 3:** 10 testes T46-* novos. **Fase 4:** Validação visual Playwright no Projeto A — Reposicionar regenerou positions; 31° → 59°; 337 → 344 aspersores; 0 blockers; PDF HTTP 200 + download; BOM **R$ 213.740,15** (−R$ 64.215 / −23,1% vs. baseline TASK-041). **Resultado:** série de validação visual TASK-027→046 FECHADA com sucesso. tsc 0; vitest 809/809; catálogo intocado; ADRs preservadas. |
