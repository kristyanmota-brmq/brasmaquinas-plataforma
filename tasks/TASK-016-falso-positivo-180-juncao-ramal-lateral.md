# TASK-016 — Corrigir falso positivo 180° na junção ramal-lateral

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / diagnósticos
**Concluída em:** 2026-05-20 · 672/672 testes · 0 erros tsc
**Executada como:** follow-up imediato da TASK-015, mesma sessão

---

## Contexto

Após a implementação da TASK-015 (roteamento construtível de ramais/secundárias com 90°/180°),
foi identificado um falso positivo em `detectNetworkAngleIssues()`: a junção ramal → lateral
gerava blocker de deflexão 180° em situações onde a conexão era geometricamente correta.

---

## Causa raiz

A seção 2b de `detectNetworkAngleIssues()` calculava o vetor da lateral como:

```typescript
latVec = col.startLngLat → col.endLngLat  // sempre start → end
```

Quando `sec.toCoord ≈ col.endLngLat` (inlet da lateral era o extremo `end`), o vetor
`lastVec` (último segmento do ramal) apontava de `col.endLngLat` em direção ao interior
da coluna — antiparalelo a `latVec`. Isso produzia deflexão 180° como falso blocker
em vez de 0° (continuidade reta).

---

## Solução

Snap métrico com tolerância **1,0 m**: determinar qual extremo da coluna física é o inlet
do ramal, e então orientar `latVec` de inlet → extremidade oposta.

```typescript
// Pseudocódigo
const distToStart = haversineM(sec.toCoord, col.startLngLat);
const distToEnd   = haversineM(sec.toCoord, col.endLngLat);
const inletIsEnd  = distToEnd < distToStart && distToEnd < SNAP_TOLERANCE_M;

const latVec = inletIsEnd
  ? [col.startLngLat[0] - col.endLngLat[0], col.startLngLat[1] - col.endLngLat[1]]
  : [col.endLngLat[0] - col.startLngLat[0], col.endLngLat[1] - col.startLngLat[1]];
```

---

## Arquivos alterados

| Arquivo | Tipo |
|---------|------|
| `src/lib/layout/network-angle-diagnostics.ts` | modificado |
| `src/lib/layout/__tests__/network-angle-diagnostics.test.ts` | modificado |

---

## Testes adicionados

10 novos testes (T16-A a T16-F) em `network-angle-diagnostics.test.ts`:

| ID | Cenário | Resultado |
|----|---------|-----------|
| T16-A | Inlet no start, ramal perpendicular à lateral | Sem blocker (deflexão 90°) |
| T16-B | Inlet no end, ramal perpendicular à lateral | Sem blocker (deflexão 90°) |
| T16-C | Inlet no start, ramal em 45° (diagonal) | Blocker |
| T16-D | Inlet no end, ramal em 45° (diagonal) | Blocker |
| T16-E | Inlet no start, continuidade reta (180°) | Sem blocker (deflexão 0°) |
| T16-F | Inlet no end, continuidade reta (falso positivo pré-fix) | Sem blocker (deflexão 0°) |

---

## Invariantes preservados

- `isAllowedDeflection`, `ALLOWED_DEFLECTIONS_INTERNAL`, `ALLOWED_DEFLECTIONS_ADUTORA` não alterados.
- Roteamento (`routeSecondary`), solver hidráulico, BOM, mapa e catálogo não alterados.
- 672/672 testes passando · 0 erros TypeScript.

---

## Critérios de aceite

- [x] Junção ramal → lateral com inlet em `col.endLngLat` não gera blocker 180°
- [x] Junção ramal → lateral com inlet em `col.startLngLat` não gera blocker 180°
- [x] Casos de 45° continuam gerando blocker (regressão de TASK-015 não introduzida)
- [x] T16-A a T16-F passando
- [x] 672/672 testes passando
- [x] 0 erros TypeScript
