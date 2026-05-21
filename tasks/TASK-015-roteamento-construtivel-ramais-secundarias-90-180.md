# TASK-015 — Roteamento construtível de ramais/secundárias com 90°/180°

**Status:** `concluída`
**Concluída em:** 2026-05-20 · 662/662 testes · 0 erros tsc
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / domínio
**Criada em:** 2026-05-20

---

## Contexto

A TASK-013 introduziu `detectNetworkAngleIssues()` que detecta ângulos fora dos padrões
construtíveis na rede e emite blocker, impedindo a emissão do PDF. A lógica original
permitia 0°/45°/90° de deflexão para toda a rede.

Esta task aplica a **regra oficial de construtibilidade angular** da Brasmáquinas:

### Regra oficial

| Componente | Deflexões permitidas | Conexões equivalentes |
|-----------|----------------------|----------------------|
| Rede interna (principal, ramais, laterais, trechos operacionais, registros, junções internas) | 0°, 90° | 180° (luva) e 90° (curva/tê) |
| Adutora | 0°, 45°, 90° | 180° (luva), 45° (curva 45°), 90° (curva/tê) |

**45° é proibido na rede interna. Permitido somente na adutora.**

---

## Objetivo

1. Atualizar `detectNetworkAngleIssues()` para usar `ALLOWED_DEFLECTIONS_INTERNAL = [0, 90]`
   em todos os elementos da rede interna.
2. Fazer `generateSecondaries()` produzir rotas em L (90°) quando possível, em vez de linha
   reta que pode chegar à lateral em ângulo inválido.
3. Se a geometria não permitir rota com 90°/180°, manter o blocker com mensagem clara.

---

## Regras invariantes desta task

- Não alterar aspersor padrão, espaçamento 12×12, setorização, solver hidráulico, BOM de conexões, catálogo, PDF, motor A/B/C.
- `npx tsc --noEmit` → 0 erros.
- `npx vitest run` → 100% passando, contagem ≥ anterior.

---

## Mudanças planejadas

### `network-angle-diagnostics.ts`

- Substituir `ALLOWED_DEFLECTIONS = [0, 45, 90]` por:
  - `ALLOWED_DEFLECTIONS_INTERNAL = [0, 90]` (exportado) — rede interna
  - `ALLOWED_DEFLECTIONS_ADUTORA = [0, 45, 90]` (exportado) — documentação
- `isAllowedDeflection()` passa a usar `ALLOWED_DEFLECTIONS_INTERNAL` por padrão.
- Secondary angle check usa **primeiro segmento** de `coords` para junção com principal
  e **último segmento** de `coords` para junção com lateral.

### `hydraulic-connectivity.ts`

- `SecondaryPipe` ganha campo opcional `coords?: [number, number][]`.
  - Se ausente: fallback para `[fromCoord, toCoord]`.
  - Se presente: polilinha completa do ramal (incluindo cotovelo).
- `fromCoord` e `toCoord` preservados para retrocompatibilidade.
- `lengthM` = soma dos comprimentos de todos os segmentos da rota real.
- `generateSecondaries()` implementa algoritmo de roteamento construtível:
  - `α ≈ 0°` (principal ⊥ lateral): rota reta — caso padrão, sem mudança.
  - `α ≈ 90°` (principal ∥ lateral): rota em L com cotovelo 90°.
  - Qualquer outro `α` (incluindo 45°): rota reta mantida; diagnóstico emite blocker.

### `ProjectMap.tsx`

- `secondariesGeoJSON` usa `s.coords ?? [s.fromCoord, s.toCoord]` como coordenadas da LineString.

---

## Algoritmo de roteamento de ramal

```
Inputs: F=fromCoord, T=toCoord (inlet), principalCoords, col.startLngLat/endLngLat
Outputs: { coords, lengthM }

1. Converter F, T para metros: Fm, Tm.
2. principalDir = direção do segmento de principal mais próximo de F (em metros).
3. lateralDir = unitVec(startLngLat → endLngLat) em metros.
4. perpDir = ⊥ principalDir (perpendicular, apontando para T).
5. α = angle(perpDir, lateralDir).
6. Se α ≈ 0° (±5°): return { coords: [F,T], lengthM: |FT| }    // padrão
7. Se α ≈ 90° (±5°):
     M_m = intersecção(reta F em perpDir, reta T em lateralDir)
     Se |FM| < 1e-3 ou |MT| < 1e-3: return { coords: [F,T], lengthM }  // degenerado
     M = Mlnglat
     return { coords: [F, M, T], lengthM: |FM| + |MT| }
8. Caso contrário: return { coords: [F,T], lengthM: |FT| }  // blocker via diagnóstico
```

---

## Testes obrigatórios

| # | Cenário | Resultado |
|---|---------|-----------|
| T1 | Ramal padrão (principal ⊥ lateral, α≈0°) | Rota reta, `coords.length=2`, sem blocker |
| T2 | Principal ∥ lateral (α≈90°) | Rota em L, `coords.length=3`, sem blocker |
| T3 | α≈45° (principal 45° da lateral) | Rota reta mantida, blocker ativo |
| T4 | α≈30° ou 60° | Rota reta mantida, blocker ativo |
| T5 | `lengthM` rota em L = `|FM|+|MT|` | Correto geometricamente |
| T6 | `fromCoord` e `toCoord` preservados | Retrocompatibilidade |
| T7 | `detectNetworkAngleIssues`: secondary 90° | `hasBlockers=false` |
| T8 | `detectNetworkAngleIssues`: secondary 45° | `hasBlockers=true` |
| T9 | `detectNetworkAngleIssues`: principal bend 45° | `hasBlockers=true` |
| T10 | `detectNetworkAngleIssues`: principal bend 90° | `hasBlockers=false` |
| T11 | Mapa usa `coords` quando presente | GeoJSON LineString com 3+ coords |
| T12 | `isAllowedDeflection(45)` → false | Nova regra rede interna |
| T13 | `isAllowedDeflection(0)` → true | Luva permitida |
| T14 | `isAllowedDeflection(90)` → true | Tê/curva 90° permitido |

---

## Decisões arquiteturais

- **45° é permitido somente na adutora. Rede interna usa apenas 90° e 180°.**
- Rota em L com cotovelo 90° é a única forma de corrigir geometria automaticamente.
- Ângulos irredutíveis (45°, 30°, 60°, etc.) mantêm blocker explícito.
- `coords` é opcional para retrocompatibilidade; consumidores antigos continuam funcionando.

---

## Pendências / Próximos passos

- ADR-010 sugerido: "Regra de construtibilidade angular da rede interna e adutora"
- BOM de conexões físicas (cotovelos, luvas, tês) — futura task
- Roteamento de dobras na principal manual — fora do escopo desta task
