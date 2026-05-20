import type { PhysicalColumn } from "@/lib/layout/laterais";
import { columnPhysicalInlet } from "@/lib/layout/hydraulic-connectivity";

export type ControlPointType =
  | "lateral_inlet"
  | "section_valve"
  | "isolation_valve"
  | "independent_feed_required"
  | "manual_validation_required";

export type ControlPointStatus = "resolved" | "pending";

export type ConstructabilityStatus =
  | "ok"
  | "pending_control_validation"
  | "blocked_unfeedable_segments";

/**
 * Ponto de controle hidráulico: derivação de lateral, válvula de seção, ou ponto
 * sem alimentação física modelada.
 *
 * `lateral_inlet` → conexão natural da lateral com a principal; sempre `resolved`.
 * `section_valve`  → válvula de seção no ponto de corte entre setores; sempre `pending`
 *                    até que seja modelada na BOM ou validada em campo.
 * `independent_feed_required` → trecho que não pode receber água sem ativar
 *                    aspersores de outro setor; exige ramal próprio ou redesenho.
 */
export interface ControlPoint {
  id: string;
  physicalColumnId: string;
  operationalSegmentId: string;
  sectorId: number;
  /** Coordenada [lng, lat] do ponto de controle. */
  coordinate: [number, number];
  type: ControlPointType;
  status: ControlPointStatus;
}

/** Diagnóstico de construtibilidade por lateral física. */
export interface ColumnConstructibilityDiagnostic {
  physicalColumnId: string;
  totalAspersores: number;
  sectorsTouched: number[];
  operationalSegmentsCount: number;
  splitPointsCount: number;
  hasSingleSector: boolean;
  requiresControl: boolean;
  requiresIndependentFeed: boolean;
  isConstructivelyResolved: boolean;
}

export interface ConstructabilityReport {
  controlPoints: ControlPoint[];
  columnDiagnostics: ColumnConstructibilityDiagnostic[];
  controlPointsCount: number;
  pendingControlPointsCount: number;
  independentFeedRequiredCount: number;
  constructabilityStatus: ConstructabilityStatus;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agrupa os sprinklerIndices de uma coluna física por setor consecutivo.
 * Retorna os grupos em ordem de ordemNaLateral crescente.
 */
function groupSprinklersByConsecutiveSector(
  col: PhysicalColumn,
  sectorIndices: number[],
): { sectorId: number; sprinklerIndices: number[]; ordemNaLateral: number }[] {
  if (col.sprinklerIndices.length === 0) return [];

  const groups: { sectorId: number; sprinklerIndices: number[]; ordemNaLateral: number }[] = [];
  let currentSector = sectorIndices[col.sprinklerIndices[0]];
  let currentBatch: number[] = [];
  let ordem = 0;

  for (const idx of col.sprinklerIndices) {
    const s = sectorIndices[idx] ?? currentSector;
    if (s !== currentSector) {
      groups.push({ sectorId: currentSector, sprinklerIndices: currentBatch, ordemNaLateral: ordem });
      ordem++;
      currentSector = s;
      currentBatch = [];
    }
    currentBatch.push(idx);
  }
  if (currentBatch.length > 0) {
    groups.push({ sectorId: currentSector, sprinklerIndices: currentBatch, ordemNaLateral: ordem });
  }

  return groups;
}

/**
 * Gera os pontos de controle hidráulico para toda a malha de laterais físicas.
 *
 * Para cada lateral:
 *  - Um `lateral_inlet` (resolved) no primeiro aspersor — conexão natural com a principal.
 *  - Um `section_valve` (pending) por ponto de corte entre setores consecutivos.
 *
 * Os pontos de controle `section_valve` permanecem `pending` até que sejam
 * modelados na BOM (válvulas, ramais de alimentação) ou validados em campo.
 */
export function generateControlPoints(
  physicalColumns: PhysicalColumn[],
  sectorIndices: number[],
  positions: [number, number][],
  principalCoords?: [number, number][],
  centroid?: { lng: number; lat: number },
): ControlPoint[] {
  const points: ControlPoint[] = [];

  for (const col of physicalColumns) {
    const groups = groupSprinklersByConsecutiveSector(col, sectorIndices);
    if (groups.length === 0) continue;

    const firstGroup = groups[0];
    // Inlet = extremo da coluna física mais próximo da principal.
    // Quando principalCoords não está disponível, usa o primeiro aspersor como fallback.
    const inletPos =
      principalCoords && principalCoords.length >= 1 && centroid
        ? columnPhysicalInlet(col, principalCoords, centroid)
        : (positions[firstGroup.sprinklerIndices[0]] ?? col.startLngLat);

    points.push({
      id: `${col.id}-cp-inlet`,
      physicalColumnId: col.id,
      operationalSegmentId: `${col.id}-s${firstGroup.sectorId}-0`,
      sectorId: firstGroup.sectorId,
      coordinate: inletPos,
      type: "lateral_inlet",
      status: "resolved",
    });

    for (let i = 1; i < groups.length; i++) {
      const seg = groups[i];
      const prev = groups[i - 1];

      const prevLastIdx = prev.sprinklerIndices[prev.sprinklerIndices.length - 1];
      const thisFirstIdx = seg.sprinklerIndices[0];
      const prevPos = positions[prevLastIdx] ?? col.startLngLat;
      const thisPos = positions[thisFirstIdx] ?? col.startLngLat;
      const coordinate: [number, number] = [
        (prevPos[0] + thisPos[0]) / 2,
        (prevPos[1] + thisPos[1]) / 2,
      ];

      points.push({
        id: `${col.id}-cp-split-${i}`,
        physicalColumnId: col.id,
        operationalSegmentId: `${col.id}-s${seg.sectorId}-${seg.ordemNaLateral}`,
        sectorId: seg.sectorId,
        coordinate,
        type: "section_valve",
        status: "pending",
      });
    }
  }

  return points;
}

/** Diagnóstico por coluna física a partir dos pontos de controle gerados. */
export function generateColumnDiagnostics(
  physicalColumns: PhysicalColumn[],
  controlPoints: ControlPoint[],
): ColumnConstructibilityDiagnostic[] {
  const cpsByCol = new Map<string, ControlPoint[]>();
  for (const cp of controlPoints) {
    const arr = cpsByCol.get(cp.physicalColumnId) ?? [];
    arr.push(cp);
    cpsByCol.set(cp.physicalColumnId, arr);
  }

  return physicalColumns.map((col) => {
    const cps = cpsByCol.get(col.id) ?? [];
    const splitCps = cps.filter((cp) => cp.type !== "lateral_inlet");
    const pendingCps = cps.filter((cp) => cp.status === "pending");
    const independentFeedCps = cps.filter((cp) => cp.type === "independent_feed_required");

    return {
      physicalColumnId: col.id,
      totalAspersores: col.sprinklerCount,
      sectorsTouched: col.sectorsTouched,
      operationalSegmentsCount: splitCps.length + 1,
      splitPointsCount: splitCps.length,
      hasSingleSector: col.sectorsTouched.length <= 1,
      requiresControl: splitCps.length > 0,
      requiresIndependentFeed: independentFeedCps.length > 0,
      isConstructivelyResolved: pendingCps.length === 0,
    };
  });
}

/**
 * Avalia o status de construtibilidade a partir de um array de pontos de controle.
 * Pode ser chamado diretamente com pontos manuais (ex.: em testes ou quando o
 * engenheiro marca um segmento como `independent_feed_required`).
 *
 * Status:
 *  - `"ok"` — sem pontos pendentes.
 *  - `"pending_control_validation"` — há pontos de controle pendentes (section_valve
 *    sem modelagem de válvula/ramal).
 *  - `"blocked_unfeedable_segments"` — há pelo menos um ponto com
 *    `type: "independent_feed_required"`, indicando impossibilidade de alimentação
 *    sem redesenho ou ramal próprio.
 */
export function evaluateConstructability(controlPoints: ControlPoint[]): {
  constructabilityStatus: ConstructabilityStatus;
  controlPointsCount: number;
  pendingControlPointsCount: number;
  independentFeedRequiredCount: number;
} {
  const pending = controlPoints.filter((cp) => cp.status === "pending");
  const independentFeed = controlPoints.filter((cp) => cp.type === "independent_feed_required");

  let constructabilityStatus: ConstructabilityStatus;
  if (independentFeed.length > 0) {
    constructabilityStatus = "blocked_unfeedable_segments";
  } else if (pending.length > 0) {
    constructabilityStatus = "pending_control_validation";
  } else {
    constructabilityStatus = "ok";
  }

  return {
    constructabilityStatus,
    controlPointsCount: controlPoints.length,
    pendingControlPointsCount: pending.length,
    independentFeedRequiredCount: independentFeed.length,
  };
}

/**
 * Constrói o relatório completo de construtibilidade para toda a malha.
 * Gera os pontos de controle, os diagnósticos por coluna e avalia o status global.
 */
export function buildConstructabilityReport(
  physicalColumns: PhysicalColumn[],
  sectorIndices: number[],
  positions: [number, number][],
  principalCoords?: [number, number][],
  centroid?: { lng: number; lat: number },
): ConstructabilityReport {
  const controlPoints = generateControlPoints(
    physicalColumns,
    sectorIndices,
    positions,
    principalCoords,
    centroid,
  );
  const columnDiagnostics = generateColumnDiagnostics(physicalColumns, controlPoints);
  const evaluation = evaluateConstructability(controlPoints);

  return {
    controlPoints,
    columnDiagnostics,
    ...evaluation,
  };
}
