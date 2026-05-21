# TASK-018 — Corrigir eixo canônico das laterais físicas

**Status:** `em progresso`
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / renderização
**Data de abertura:** 2026-05-20

---

## Problema

A TASK-017 corrigiu a renderização da lateral física para usar `[col.startLngLat, col.endLngLat]`
em vez de todos os aspersores da coluna. Porém a validação visual mostrou que a linha reta
entre esses dois pontos nem sempre passa pelos aspersores intermediários da coluna.

### Causa raiz

`generatePhysicalColumns` calculava `startLngLat = positions[seg[0].origIdx]` e
`endLngLat = positions[seg[n-1].origIdx]` — as posições geodésicas reais dos aspersores
extremos. O agrupamento de colunas aceita aspersores com X local até ±`spacing/2 = 6 m` do
X canônico. Quando os aspersores extremos têm desvios em direções opostas (X+δ e X-δ),
a linha entre eles se inclina em relação ao eixo verdadeiro da coluna, e os aspersores
intermediários — que estão próximos do X canônico — ficam visivelmente fora da reta.

### Regra: deflexão, não ângulo absoluto

O ângulo absoluto da tubulação no mapa não determina construtibilidade. Uma lateral reta
com rumo geográfico 120° é válida — não há dobra. O que deve ser 90°/180° é a deflexão
entre segmentos conectados. Portanto, a correção é no **eixo da lateral no frame local**,
não em criar staircase ou curvas artificiais.

---

## Solução implementada

Usar o **eixo canônico** do segmento para calcular `startLngLat` e `endLngLat`:

```typescript
// Em generatePhysicalColumns, dentro do loop de segmentos
const xSegRep = seg.reduce((s, p) => s + p.x, 0) / n;  // X médio do segmento
startLngLat = toLngLat(xSegRep, yFirst);                 // endpoint canônico start
endLngLat   = toLngLat(xSegRep, yLast);                  // endpoint canônico end
```

O `xSegRep` (média de X de todos os aspersores do segmento) é o melhor estimador do
X canônico da coluna. Todos os aspersores têm `x ≈ xSegRep`, portanto a reta entre os
dois endpoints canônicos passa pelos aspersores dentro da tolerância métrica.

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/layout/laterais.ts` | Removido `xRep` (variável morta de coluna); adicionado `xSegRep` por segmento; `startLngLat`/`endLngLat` via `toLngLat(xSegRep, yFirst/yLast)`; exportado `maxSprinklerAxisDeviationM` |
| `src/lib/layout/__tests__/physical-column-audit.test.ts` | Atualizado cabeçalho, P1e/P1f (precisão e semântica), P1g (comentário); adicionados T18-a, T18-b, T18-c |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | Adicionada premissa `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,5 m` |

---

## Função pura exportada

```typescript
export function maxSprinklerAxisDeviationM(
  col: PhysicalColumn,
  positions: [number, number][],
  centroid: { lng: number; lat: number },
): number
```

Retorna o desvio máximo (m) de qualquer aspersor da coluna em relação ao eixo canônico.
Tolerância de referência: `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,5 m`.

**Integração em `diagnostics.blockers`: escopo de task imediata (TASK-019).**

---

## Testes adicionados

| ID | O que verifica |
|----|----------------|
| T18-a | grid 30° flat-earth, 4×8 aspersores: `maxSprinklerAxisDeviationM < 0,01 m` em todas as colunas |
| T18-b | grid 45° flat-earth, 4×8 aspersores: `maxSprinklerAxisDeviationM < 0,01 m` em todas as colunas |
| T18-c-i | cenário sintético: 1 coluna com 5 aspersores gerada corretamente |
| T18-c-ii | startLngLat ≠ posição real do 1° aspersor (eixo canônico ≠ extremo real) |
| T18-c-iii | aspersores intermediários a < 0,1 m do eixo canônico |

---

## O que NÃO foi feito

- Não criar `routeCoords` staircase
- Não criar curvas artificiais entre aspersores
- Não alterar hidráulica, BOM, PDF, setorização, catálogo
- Não integrar desvio em `diagnostics.blockers` (task imediata)
- Não alterar `generateSecondaries` ou `detectNetworkAngleIssues`

---

## Critérios de aceite

- [x] `startLngLat = toLngLat(xSegRep, yFirst)` em `generatePhysicalColumns`
- [x] `endLngLat = toLngLat(xSegRep, yLast)` em `generatePhysicalColumns`
- [x] `xRep` de coluna removido (variável morta)
- [x] `maxSprinklerAxisDeviationM` exportado e testado
- [x] Premissa `TOLERANCIA_ASPERSOR_EIXO_LATERAL` registrada em `12-premissas-provisorias-e-revisao-rt.md`
- [x] T18-a, T18-b, T18-c adicionados
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 678 passando (673 base + 5 novos: T18-a, T18-b, T18-c × 3)

---

## Pendências abertas

- **Diagnóstico formal de desvio de eixo** — `maxSprinklerAxisDeviationM > TOLERANCIA_ASPERSOR_EIXO_LATERAL`
  deve gerar entrada em `diagnostics.warnings` ou `diagnostics.blockers`. Integração fica
  para TASK-019 (task imediata).
- **Variáveis mortas em `laterais.ts`** — `yFirst`/`yLast` eram mortas antes desta task e
  agora são usadas. `xRep` era morto e foi removido.
- **Validação visual no browser** — verificar que a lateral física aparece sobre os aspersores
  da coluna após o fix.
