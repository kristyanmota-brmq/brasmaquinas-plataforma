# TASK-035 — BOM de curvas 90° em sub-laterais com routeCoords

**Status:** `concluída`
**Prioridade:** `P1-crítico`
**Classe:** `A — Crítica`
**Área:** `bom / construtibilidade / domínio`
**Criado em:** 2026-05-22
**Concluída em:** 2026-05-22 · 817/817 testes (+8 vs. 809 baseline) · 0 erros tsc · catálogo intocado

---

## Objetivo

Contar na BOM **apenas curvas 90° físicas reais** existentes nas laterais/sub-laterais, com base no `routeCoords` final pós-TASK-045B/TASK-046, sem alterar geometria, catálogo, PDF, mapa ou geração métrica da malha.

---

## Contexto

- TASK-022 já criou `src/lib/layout/physical-connections.ts` com contadores para curvas 90° em ramais em L, curvas 90°/45° na adutora e tês aspersor→lateral. **Curvas 90° dentro de laterais físicas (`PhysicalColumn.routeCoords`) não eram contadas.**
- TASK-028 introduziu `PhysicalColumn.routeCoords` e `Lateral.routeCoords` como polilinhas construtíveis 0°/90°.
- TASK-045B (com emenda interpretativa do ADR-012) substituiu o algoritmo greedy ponto-a-ponto de `buildLateralRoute` por **reta única no eixo via mediana de X** — `routeCoords` agora sempre tem 2 pontos no caminho feliz.
- TASK-046 fechou a série visual TASK-027→046: laterais retas, 0 blockers, PDF HTTP 200, BOM R$ 213.740,15 no Projeto A. Curvas 90° de lateral **continuam sem contagem**.
- ADR-013 (TASK-031) restringe laterais do aspersor 5022 a DN50 e DN75. Catálogo `CURVAS_90` (LF) tem SKU homologado para DN75 (`150174`) e **não** tem para DN50.

A TASK-035 fecha o gap: detector defensivo que conta curvas 90° em `PhysicalColumn.routeCoords` quando `length ≥ 3`, agrupa por DN, resolve via `CURVAS_90` (LF) e gera pendência explícita quando o SKU LF não existe — sem alterar geometria ou catálogo.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/physical-connections.ts` | modificação | Nova interface `LateralBends90` + função `countLateralBends90()` |
| `src/lib/bom.ts` | modificação | Import `CURVAS_90` + `countLateralBends90`; união `BOMPendingConnection.tipo` ganha `"curva_90_lateral"`; novos campos `meta.curvas90LateraisCount` e `meta.curvas90LateraisSemSkuCount`; bloco D de wiring; texto do blocker "BOM incompleta" reconhece `curva_90_lateral` |
| `src/lib/layout/__tests__/lateral-bends-90.test.ts` | criação | 8 novos testes T35-a..T35-h |
| `src/lib/layout/__tests__/bom-valves.test.ts` | modificação | Fixture `meta` ampliado com os 2 campos novos (manutenção mecânica) |
| `src/lib/layout/__tests__/pressure-class.test.ts` | modificação | Idem |

**NÃO ALTERADOS:** `src/lib/catalog/aspersores.ts`, geração da malha, `routeCoords`, `buildLateralRoute`, UI, PDF, server actions.

---

## Critérios de aceite

- [x] Laterais com `routeCoords.length === 2` (caso default pós-TASK-046) → `meta.curvas90LateraisCount === 0` e `meta.curvas90LateraisSemSkuCount === 0` (T35-a, T35-h).
- [x] `routeCoords.length ≥ 3` com vértice intermediário formando 90° → 1 curva contada por vértice, agrupada por DN (T35-b, T35-c, T35-d, T35-e).
- [x] Tolerância angular ±5° usando `ANGLE_TOL_DEG` já documentada — 87° conta como 90°, 84° não (T35-d).
- [x] Segmento métrico < 1 cm (ruído numérico / ponto duplicado) é ignorado (proteção via `MIN_SEG_LEN_M` antes do cálculo angular).
- [x] DN75 com curva 90° → item precificado SKU `150174` em `BOMResult.itens` (T35-f).
- [x] DN50 com curva 90° → `BOMPendingConnection { tipo: "curva_90_lateral", motivoPendencia: "sku_nao_catalogado" }`; **nenhum SKU rígido reutilizado em lateral LF** (T35-g).
- [x] Blocker "BOM incompleta" inclui o texto "curva 90° lateral" quando há pendência desse tipo (T35-g).
- [x] Catálogo `src/lib/catalog/aspersores.ts` permanece intocado.
- [x] PDF, mapa, server actions, schema, prisma, optimizer e malha intocados.
- [x] DN100 não volta como lateral 5022 (ADR-013 preservada).
- [x] `npx tsc --noEmit` → 0 erros.
- [x] `npx vitest run` → 817/817 passando (809 baseline + 8 novos T35).
- [x] BOM do Projeto-like default não muda por causa desta task (T35-h compara `totalGeral` ao recálculo dos itens).

---

## Testes obrigatórios

1. **T35-a** — rota reta (`length === 2`) → `byDnMm` vazio, `indeterminate = 0`.
2. **T35-b** — 1 cotovelo 90° em coluna DN75 → `byDnMm.get(75) === 1`.
3. **T35-c** — 2 cotovelos consecutivos (rota em U) → `byDnMm.get(75) === 2`.
4. **T35-d** — tolerância: deflexão 87° é contada; 84° não.
5. **T35-e** — duas colunas com DNs distintos (50 e 75), cada uma com 1 cotovelo → agrupamento por DN.
6. **T35-f** — `buildBOM` com coluna DN75 contendo cotovelo → SKU `150174` em `itens` e `meta.curvas90LateraisCount === 1`.
7. **T35-g** — `buildBOM` com coluna DN50 contendo cotovelo → `BOMPendingConnection` com `tipo: "curva_90_lateral"` e `motivoPendencia: "sku_nao_catalogado"`; blocker "BOM incompleta" cita "curva 90° lateral".
8. **T35-h** — Projeto-like default (todas as colunas retas) → 0 curvas, 0 pendência nova, `totalGeral` equivale à soma dos itens; o blocker "BOM incompleta" (se existir por outro motivo) **não** menciona "curva 90° lateral".

---

## Fora do escopo

- Não alterar geometria, `routeCoords`, eixo, mediana, ângulos, ou `buildLateralRoute`.
- Não alterar `src/lib/catalog/aspersores.ts` — read-only por invariante. DN50 LF permanece sem SKU homologado (vira pendência explícita).
- Não tocar UI, PDF, mapa, server actions, schema, prisma, optimizer.
- Não tocar em `countSecondaryLBends`, `countAdutoraBends`, `countSprinklerTees`.
- Não criar ADR nova — TASK-035 é cumprimento operacional da arquitetura já estabelecida (ADR-012 emenda + TASK-022 + TASK-023 + ADR-013).
- Não formalizar premissa nova — reusa `ANGLE_TOL_DEG` (`TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE`) já documentada.
- Não rodar validação Playwright (UI intocada).
- Não contar curvas em `Lateral.routeCoords` — fonte única é `PhysicalColumn.routeCoords`, para evitar dupla contagem do mesmo trecho operacional/setorial dentro da mesma vala física.
- Não usar `CURVAS_90_RIGIDAS` em lateral LF — mistura de famílias/classes sem homologação.

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Contar curva inexistente em colunas com `length === 2` | Baixa | Quebra critério principal | Guard `length < 3` no topo da iteração; T35-a + T35-h cobrem |
| Dupla contagem com `countSecondaryLBends` | Muito baixa | Inflar BOM | Fontes geométricas independentes (`PhysicalColumn.routeCoords` ≠ `SecondaryPipe.coords`) |
| Curva falsa por ponto duplicado | Baixa | Pendência espúria | `MIN_SEG_LEN_M = 0,01 m` filtra segmentos degenerados antes do cálculo angular |
| BOM do Projeto A muda inadvertidamente | Nula | Quebra R$ 213.740,15 | `routeCoords.length === 2` em todas as colunas pós-TASK-046 → 0 curvas → 0 alteração; T35-h protege |
| Premissa não documentada | Nula | Auditoria | Reusa `ANGLE_TOL_DEG = TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE` (premissa existente) |

**Dependências:** TASK-022 (`physical-connections.ts`), TASK-023 (kit aspersor 5022), TASK-028 (`routeCoords`), TASK-031/ADR-013 (DN50/DN75 homologados), TASK-045B (rota reta via mediana), TASK-046 (fechamento série visual).

---

## Plano de implementação executado

1. ✅ Adicionado `countLateralBends90()` + interface `LateralBends90` em `physical-connections.ts` com guards `length < 3` e `MIN_SEG_LEN_M`, reusando helpers e tolerância existentes.
2. ✅ Adicionado import `CURVAS_90` e `countLateralBends90` em `bom.ts`.
3. ✅ Ampliada união `BOMPendingConnection.tipo` com `"curva_90_lateral"`.
4. ✅ Adicionados campos `meta.curvas90LateraisCount` e `meta.curvas90LateraisSemSkuCount`.
5. ✅ Inserido bloco "D — Curvas 90° em laterais físicas (TASK-035)" no `buildBOM`, entre o bloco B (curvas adutora) e C (kit aspersor): catálogo LF apenas; pendência explícita para DN sem SKU; agrupamento por DN.
6. ✅ Atualizado texto `tipoTextos` em `generateProposalDiagnostics` para cobrir `curva_90_lateral`.
7. ✅ Criada suíte `lateral-bends-90.test.ts` com T35-a..T35-h.
8. ✅ Atualizadas fixtures `meta` em `bom-valves.test.ts` e `pressure-class.test.ts` para incluir os 2 campos novos.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-22 | Claude Opus 4.7 | Tarefa criada e implementada na mesma sessão. 817/817 testes; 0 erros tsc; catálogo intocado; Projeto-like default mantém 0 curvas e 0 pendência. |
