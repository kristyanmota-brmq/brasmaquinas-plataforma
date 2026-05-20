import type { PhysicalColumn } from "@/lib/layout/laterais";

const M_PER_DEG_LAT = 111320;

export interface SectorizationResult {
  sectorIndices: number[];
  /** Número de aspersores em cada setor (índice = sectorId). */
  sprinklersPerSector: number[];
  /** Vazão por setor em m³/h (índice = sectorId). */
  vazaoPorSetor: number[];
  /** (vazaoMax - vazaoMin) / vazaoMedia × 100. */
  desbalanceamentoPercent: number;
}

/**
 * Segmento operacional: trecho contíguo de uma lateral física atribuído a um único setor.
 *
 * Uma lateral física pode ser dividida em múltiplos segmentos (um por setor) quando
 * `buildSectorsByFlowWithColumnSplitting` corta a coluna para equilibrar vazão.
 * A BOM de tubos continua derivada das colunas físicas — os segmentos operacionais não
 * duplicam comprimento de lateral.
 */
export interface OperationalSegment {
  /** Ex.: "col-3-s2-0" (column id + sectorId + ordem na lateral). */
  id: string;
  physicalColumnId: string;
  sectorId: number;
  /** Índices em positions[] dos aspersores deste segmento, em ordem Y crescente. */
  sprinklerIndices: number[];
  sprinklerCount: number;
  vazaoM3h: number;
  /** Verdadeiro quando o segmento não é o primeiro da coluna — indica ponto de controle/válvula. */
  requiresValveOrControlPoint: boolean;
  /** Posição 0-based do segmento dentro da coluna física (0 = início da lateral). */
  ordemNaLateral: number;
}

export interface SectorizationWithSplitResult {
  sectorIndices: number[];
  operationalSegments: OperationalSegment[];
  sprinklersPerSector: number[];
  vazaoPorSetor: number[];
  desbalanceamentoPercent: number;
  /** vazaoMax / vazaoMin. Quanto mais próximo de 1, mais equilibrado. */
  maxMinRatio: number;
  /** Número de colunas físicas divididas entre mais de um setor. */
  physicalColumnsSplitCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setorização por colunas inteiras (legado — mantido para retro-compatibilidade)
// Não usar como padrão — prefira buildSectorsByFlowWithColumnSplitting.
// ─────────────────────────────────────────────────────────────────────────────

export function buildSectorsByFlow(
  positions: [number, number][],
  n: number,
  angleDegrees: number,
  centroid: { lng: number; lat: number },
  spacingMeters: number,
  vazaoPorAspersorM3h: number,
): SectorizationResult {
  const total = positions.length;
  const empty: SectorizationResult = {
    sectorIndices: [],
    sprinklersPerSector: [],
    vazaoPorSetor: [],
    desbalanceamentoPercent: 0,
  };
  if (total === 0 || n <= 0) return empty;

  const mPerLng = M_PER_DEG_LAT * Math.cos((centroid.lat * Math.PI) / 180);
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const localX = positions.map(([lng, lat]) => {
    const dx = (lng - centroid.lng) * mPerLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return dx * cosA + dy * sinA;
  });

  const xMin = Math.min(...localX);
  const rawColByPos = localX.map((x) => Math.round((x - xMin) / spacingMeters));

  const uniqueRawCols = [...new Set(rawColByPos)].sort((a, b) => a - b);
  const totalColumns = uniqueRawCols.length;
  const colRemap = new Map<number, number>();
  uniqueRawCols.forEach((raw, i) => colRemap.set(raw, i));
  const colByPos = rawColByPos.map((c) => colRemap.get(c)!);

  const countPerCol = new Array<number>(totalColumns).fill(0);
  for (const col of colByPos) countPerCol[col]++;

  const effectiveN = Math.min(n, totalColumns);
  const totalFlow = total * vazaoPorAspersorM3h;
  const targetFlowPerSector = totalFlow / effectiveN;

  const colToSector = new Array<number>(totalColumns).fill(0);
  let sectorId = 0;
  let accFlow = 0;
  for (let c = 0; c < totalColumns; c++) {
    colToSector[c] = Math.min(sectorId, effectiveN - 1);
    accFlow += countPerCol[c] * vazaoPorAspersorM3h;
    if (sectorId < effectiveN - 1 && accFlow >= (sectorId + 1) * targetFlowPerSector) {
      sectorId++;
    }
  }

  const sectorIndices = colByPos.map((col) => colToSector[col]);

  const sprinklersPerSector = new Array<number>(effectiveN).fill(0);
  for (const s of sectorIndices) sprinklersPerSector[s]++;
  const vazaoPorSetor = sprinklersPerSector.map((c) => c * vazaoPorAspersorM3h);

  const minV = Math.min(...vazaoPorSetor);
  const maxV = Math.max(...vazaoPorSetor);
  const avgV = totalFlow / effectiveN;
  const desbalanceamentoPercent = avgV > 0 ? ((maxV - minV) / avgV) * 100 : 0;

  return { sectorIndices, sprinklersPerSector, vazaoPorSetor, desbalanceamentoPercent };
}

// ─────────────────────────────────────────────────────────────────────────────
// Derivar segmentos operacionais a partir de sectorIndices armazenados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reconstrói os OperationalSegment a partir de physicalColumns + sectorIndices
 * já armazenados no layout (sem reexecutar o algoritmo de setorização).
 *
 * Usado por calculateIrrigationProject para derivar a estrutura operacional sem
 * depender de buildSectorsByFlowWithColumnSplitting.
 */
export function deriveOperationalSegments(
  physicalColumns: PhysicalColumn[],
  sectorIndices: number[],
  vazaoPorAspersorM3h: number,
): OperationalSegment[] {
  if (physicalColumns.length === 0 || sectorIndices.length === 0) return [];

  const segments: OperationalSegment[] = [];

  for (const col of physicalColumns) {
    if (col.sprinklerIndices.length === 0) continue;

    // Agrupar sprinklerIndices por setor consecutivo
    const groups: { sectorId: number; sprinklerIndices: number[]; ordem: number }[] = [];
    let currentSector = sectorIndices[col.sprinklerIndices[0]] ?? 0;
    let currentBatch: number[] = [];
    let ordem = 0;

    for (const idx of col.sprinklerIndices) {
      const s = sectorIndices[idx] ?? currentSector;
      if (s !== currentSector) {
        groups.push({ sectorId: currentSector, sprinklerIndices: currentBatch, ordem });
        ordem++;
        currentSector = s;
        currentBatch = [];
      }
      currentBatch.push(idx);
    }
    if (currentBatch.length > 0) {
      groups.push({ sectorId: currentSector, sprinklerIndices: currentBatch, ordem });
    }

    for (const g of groups) {
      segments.push({
        id: `${col.id}-s${g.sectorId}-${g.ordem}`,
        physicalColumnId: col.id,
        sectorId: g.sectorId,
        sprinklerIndices: g.sprinklerIndices,
        sprinklerCount: g.sprinklerIndices.length,
        vazaoM3h: g.sprinklerIndices.length * vazaoPorAspersorM3h,
        requiresValveOrControlPoint: g.ordem > 0,
        ordemNaLateral: g.ordem,
      });
    }
  }

  return segments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setorização com divisão de colunas (padrão)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Distribui os aspersores em `nSetores` setores com balanceamento de vazão,
 * permitindo dividir uma lateral física entre múltiplos setores quando necessário.
 *
 * Diferenças em relação a `buildSectorsByFlow`:
 *  - Trata cada aspersor individualmente (não coluna inteira).
 *  - Para ~718 asp / 14 setores → resultado esperado: 51–52 asp/setor, ratio ≈ 1,02.
 *  - A BOM de tubos continua baseada em physicalColumns — os operationalSegments
 *    não duplicam comprimento nem tubo.
 *
 * Quando uma lateral física é dividida, o campo `requiresValveOrControlPoint = true`
 * no segundo segmento em diante indica necessidade de ponto de controle hidráulico.
 *
 * @param physicalColumns  Saída de generatePhysicalColumns — colunas físicas ordenadas por X,
 *                         cada uma com sprinklerIndices populados (ordenados por Y crescente).
 * @param nSetores         Número de setores desejado.
 * @param vazaoPorAspersorM3h  Vazão nominal de cada aspersor (m³/h).
 * @param totalPositions   positions.length — tamanho do array sectorIndices de saída.
 */
export function buildSectorsByFlowWithColumnSplitting(
  physicalColumns: PhysicalColumn[],
  nSetores: number,
  vazaoPorAspersorM3h: number,
  totalPositions: number,
): SectorizationWithSplitResult {
  const totalSprinklers = physicalColumns.reduce((s, c) => s + c.sprinklerCount, 0);

  const empty: SectorizationWithSplitResult = {
    sectorIndices: new Array<number>(totalPositions).fill(0),
    operationalSegments: [],
    sprinklersPerSector: [],
    vazaoPorSetor: [],
    desbalanceamentoPercent: 0,
    maxMinRatio: 1,
    physicalColumnsSplitCount: 0,
  };

  if (totalSprinklers === 0 || nSetores <= 0 || physicalColumns.length === 0) return empty;

  const effectiveN = Math.min(nSetores, totalSprinklers);
  const totalFlow = totalSprinklers * vazaoPorAspersorM3h;
  const targetFlow = totalFlow / effectiveN;

  const sectorIndices = new Array<number>(totalPositions).fill(0);
  const operationalSegments: OperationalSegment[] = [];

  let currentSector = 0;
  let accFlow = 0;

  for (const col of physicalColumns) {
    let segmentSprinklers: number[] = [];
    let segmentSector = currentSector;
    let ordemNaLateral = 0;

    for (const origIdx of col.sprinklerIndices) {
      sectorIndices[origIdx] = currentSector;
      segmentSprinklers.push(origIdx);
      accFlow += vazaoPorAspersorM3h;

      if (currentSector < effectiveN - 1 && accFlow >= (currentSector + 1) * targetFlow) {
        // Fechar o segmento atual (inclui este aspersor que atingiu a meta)
        operationalSegments.push({
          id: `${col.id}-s${segmentSector}-${ordemNaLateral}`,
          physicalColumnId: col.id,
          sectorId: segmentSector,
          sprinklerIndices: segmentSprinklers,
          sprinklerCount: segmentSprinklers.length,
          vazaoM3h: segmentSprinklers.length * vazaoPorAspersorM3h,
          requiresValveOrControlPoint: ordemNaLateral > 0,
          ordemNaLateral,
        });
        ordemNaLateral++;
        currentSector++;
        segmentSector = currentSector;
        segmentSprinklers = [];
      }
    }

    // Flush do trecho restante da coluna no setor atual
    if (segmentSprinklers.length > 0) {
      operationalSegments.push({
        id: `${col.id}-s${segmentSector}-${ordemNaLateral}`,
        physicalColumnId: col.id,
        sectorId: segmentSector,
        sprinklerIndices: segmentSprinklers,
        sprinklerCount: segmentSprinklers.length,
        vazaoM3h: segmentSprinklers.length * vazaoPorAspersorM3h,
        requiresValveOrControlPoint: ordemNaLateral > 0,
        ordemNaLateral,
      });
    }
  }

  // ── Estatísticas ─────────────────────────────────────────────────────────
  const sprinklersPerSector = new Array<number>(effectiveN).fill(0);
  for (const s of sectorIndices.slice(0, totalPositions)) sprinklersPerSector[s]++;
  const vazaoPorSetor = sprinklersPerSector.map((c) => c * vazaoPorAspersorM3h);

  const minV = Math.min(...vazaoPorSetor);
  const maxV = Math.max(...vazaoPorSetor);
  const avgV = totalFlow / effectiveN;
  const desbalanceamentoPercent = avgV > 0 ? ((maxV - minV) / avgV) * 100 : 0;
  const maxMinRatio = minV > 0 ? maxV / minV : 1;

  // Quantas colunas físicas têm mais de um segmento operacional
  const segCountPerCol = new Map<string, number>();
  for (const seg of operationalSegments) {
    segCountPerCol.set(seg.physicalColumnId, (segCountPerCol.get(seg.physicalColumnId) ?? 0) + 1);
  }
  const physicalColumnsSplitCount = [...segCountPerCol.values()].filter((c) => c > 1).length;

  return {
    sectorIndices,
    operationalSegments,
    sprinklersPerSector,
    vazaoPorSetor,
    desbalanceamentoPercent,
    maxMinRatio,
    physicalColumnsSplitCount,
  };
}
