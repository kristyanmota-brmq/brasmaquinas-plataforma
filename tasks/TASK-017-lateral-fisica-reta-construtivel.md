# TASK-017 — Corrigir lateral física para rota reta/construtível

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** mapa / renderização / construtibilidade
**Arquivo:** `tasks/TASK-017-lateral-fisica-reta-construtivel.md`
**Concluída em:** 2026-05-20 · 673/673 testes · 0 erros tsc

---

## Contexto

No mapa, a camada "Lateral física (tubo real)" estava sendo renderizada como uma polilinha
passando por todos os aspersores da coluna em sequência (`sprinklerIndices.map(idx => positions[idx])`).
Os aspersores compartilham o mesmo X teórico no frame local, mas a conversão rotação-local → geodésico
acumula erro de ponto flutuante por aspersor. O resultado visual são deflexões visíveis (~120°)
em vez de uma reta — violando a regra operacional da rede interna (apenas 0°/90°).

---

## Causa raiz

`physicalColumnsGeoJSON` em `ProjectMap.tsx` usava N pontos (um por aspersor):

```typescript
// ANTES — N pontos, zigzag:
coordinates: col.sprinklerIndices
  .map((idx) => layout.sprinklers?.positions[idx])
  .filter((p): p is [number, number] => p !== undefined),
```

O modelo (`PhysicalColumn.startLngLat` / `endLngLat`) já estava correto desde TASK-013.
O problema era exclusivamente de renderização.

---

## Solução

Usar os dois endpoints corretos do modelo — LineString reta de 2 pontos:

```typescript
// DEPOIS — 2 pontos, reta construtível:
coordinates: [col.startLngLat, col.endLngLat],
```

Aspersores intermediários são **conexões ao tubo**, não vértices da polilinha.

---

## Regras desta task

- Não alterar modelo `PhysicalColumn` / `generatePhysicalColumns`
- Não alterar `startLngLat` / `endLngLat`
- Não alterar solver hidráulico, BOM, catálogo, PDF, setorização, roteamento de ramais
- Não mascarar com CSS
- Não limpar `xRep`/`yFirst`/`yLast` (escopo futuro)

---

## Arquivos alterados

| Arquivo | Tipo |
|---------|------|
| `src/components/map/ProjectMap.tsx` | modificado (1 área) |
| `src/lib/layout/__tests__/physical-column-audit.test.ts` | modificado (describe P1g + novo teste) |
| `tasks/TASK-017-lateral-fisica-reta-construtivel.md` | criado |

---

## Critérios de aceite

- [x] `physicalColumnsGeoJSON` usa `[col.startLngLat, col.endLngLat]` — 2 pontos · [ProjectMap.tsx:248](../src/components/map/ProjectMap.tsx)
- [x] `layout.sprinklers` removido das deps do `useMemo` de `physicalColumnsGeoJSON` · [ProjectMap.tsx:252](../src/components/map/ProjectMap.tsx)
- [x] Teste P1g verifica backbone = 2 pontos exatos (start e end) · [physical-column-audit.test.ts](../src/lib/layout/__tests__/physical-column-audit.test.ts)
- [x] Teste P1g_col verifica colinaridade: aspersores intermediários < 0,5 m do eixo · [physical-column-audit.test.ts](../src/lib/layout/__tests__/physical-column-audit.test.ts)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 673/673 testes passando
