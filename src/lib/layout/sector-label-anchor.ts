import type { PhysicalColumn } from "./laterais";

/**
 * Resolve a âncora geográfica do label de setor a partir das colunas físicas.
 *
 * Prioridade:
 *   1. Colunas onde sectorsTouched[0] === sectorIdx (setor primário da coluna)
 *   2. Colunas onde sectorsTouched.includes(sectorIdx) (setor secundário)
 *   3. null → chamador usa centroide como fallback
 *
 * Dentro de cada nível, a coluna com menor columnIndex é selecionada.
 */
export function resolveSectorLabelAnchor(
  sectorIdx: number,
  physicalColumns: PhysicalColumn[],
): [number, number] | null {
  const byIndex = (a: PhysicalColumn, b: PhysicalColumn) =>
    a.columnIndex - b.columnIndex;

  const primary = physicalColumns
    .filter((col) => col.sectorsTouched[0] === sectorIdx)
    .sort(byIndex);
  if (primary.length > 0) return primary[0].startLngLat;

  const secondary = physicalColumns
    .filter((col) => col.sectorsTouched.includes(sectorIdx))
    .sort(byIndex);
  if (secondary.length > 0) return secondary[0].startLngLat;

  return null;
}
