# TASK-014 — Labels de setor no mapa usando PhysicalColumn.startLngLat

**Status:** `em progresso`
**Prioridade:** P2-importante
**Área:** mapa / UI
**Criada em:** 2026-05-20

---

## Contexto

TASK-013 corrigiu `PhysicalColumn.startLngLat` e `endLngLat` para usar as posições
geodésicas reais dos aspersores extremos de cada coluna física. Esses pontos são agora
confiáveis como âncoras geoespaciais.

Os labels de setor no mapa eram ancorados no centroide da nuvem de aspersores do setor
(`turf.centroid`), que pode cair no interior de uma área irregular ou sobre a principal.

---

## Objetivo

Substituir a âncora dos labels de setor pelo `startLngLat` da primeira `PhysicalColumn`
do setor, mantendo centroide como fallback quando não há coluna disponível.

---

## Regras

- Não alterar solver hidráulico, BOM, catálogo, setorização, motor de layout, PDF, motor A/B/C
- Não recalcular `PhysicalColumn` na UI — usar `projectResult.physical.physicalColumns`
- Não alterar `PhysicalColumn` nem `generatePhysicalColumns`

---

## Algoritmo de resolução de âncora

```
Para cada setor s:
  1. Filtrar colunas onde sectorsTouched[0] === s (setor primário)
     → ordenar por columnIndex, usar a primeira
  2. Se vazio: filtrar colunas onde sectorsTouched.includes(s)
     → ordenar por columnIndex, usar a primeira
  3. Se vazio: retornar null → usar centroide como fallback
```

---

## Arquivos criados

- `src/lib/layout/sector-label-anchor.ts` — `resolveSectorLabelAnchor(sectorIdx, physicalColumns)`
- `src/lib/layout/__tests__/sector-label-anchor.test.ts` — 5 testes T1–T5

## Arquivos modificados

- `src/components/map/ProjectMap.tsx`
  - Import de `resolveSectorLabelAnchor`
  - `sectorLabelsGeoJSON` useMemo: substitui centroide por `resolveSectorLabelAnchor`;
    mantém centroide como fallback quando `null`
  - `physicalColumns` adicionado ao array de deps

---

## Critérios de aceite

- [x] `src/lib/layout/sector-label-anchor.ts` criado
- [x] `src/lib/layout/__tests__/sector-label-anchor.test.ts` com 5 testes passando
- [x] `sectorLabelsGeoJSON` usa `resolveSectorLabelAnchor`; fallback ao centroide
- [x] `physicalColumns` nas deps do useMemo
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 634/634 (629 + 5 novos)
- [ ] Validação visual em browser: 2, 3 e 4 setores
- [ ] Validação visual: coluna fragmentada não duplica label

---

## Testes

| ID | Descrição |
|----|-----------|
| T1 | primary wins — sectorsTouched[0] retorna startLngLat |
| T2 | secondary fallback — includes() retorna startLngLat |
| T3 | null quando nenhuma coluna toca o setor |
| T4 | menor columnIndex vence entre múltiplas primary |
| T5 | primary (sectorsTouched[0]) vence secondary mesmo com columnIndex maior |

---

## Pendências

- Validação visual no browser (2, 3 e 4 setores; coluna fragmentada)
