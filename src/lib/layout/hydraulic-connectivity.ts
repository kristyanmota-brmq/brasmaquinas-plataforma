/**
 * Conectividade hidráulica: secundárias e validação topológica.
 *
 * Modelo:
 *   - A principal é uma linha reta no frame local (principalY fixo, P1 fix).
 *   - Cada coluna física tem um "lateral_inlet" — a extremidade mais próxima
 *     da principal.
 *   - Se a distância entre o inlet e a principal > minGapM, é necessário um
 *     ramal/secundária explícito.
 *   - generateSecondaries() projeta cada inlet na principal e cria o ramal.
 *   - validateHydraulicConnectivity() verifica se todas as colunas físicas
 *     estão conectadas (diretamente ou via secundária).
 */

import type { PhysicalColumn } from "./laterais";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

/** Ramal de conexão entre um ponto da principal e o inlet de uma lateral física. */
export interface SecondaryPipe {
  id: string;
  /** ID da PhysicalColumn que este ramal alimenta. */
  physicalColumnId: string;
  /** Ponto de saída na principal (projeção do inlet). */
  fromCoord: [number, number];
  /** Inlet da lateral física (extremidade mais próxima da principal). */
  toCoord: [number, number];
  lengthM: number;
  /** Sempre "auto" — gerado algoritmicamente a partir da geometria. */
  source: "auto";
}

export interface HydraulicConnectivityReport {
  isConnected: boolean;
  /** IDs de colunas físicas sem caminho hidráulico até a captação. */
  orphanPhysicalColumns: string[];
  /** IDs de trechos operacionais derivados de colunas órfãs. */
  orphanOperationalSegments: string[];
  /** IDs de colunas que precisam de ramal mas não têm um na lista fornecida. */
  missingSecondaryConnections: string[];
  /** Ramais calculados por generateSecondaries. */
  secondaries: SecondaryPipe[];
  totalSecondaryLengthM: number;
  connectedColumnsCount: number;
  disconnectedColumnsCount: number;
  warnings: string[];
  blockers: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes e helpers geométricos
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;

function mPerLngAtLat(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Distância euclidiana entre dois pontos em metros. */
function distM(
  a: [number, number],
  b: [number, number],
  mPerLng: number,
): number {
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Projeta um ponto na polilinha mais próxima.
 * Retorna o ponto projetado (em LngLat) e a distância em metros.
 */
function projectOnPolyline(
  point: [number, number],
  polyline: [number, number][],
  mPerLng: number,
): { coord: [number, number]; distM: number } {
  if (polyline.length === 0) return { coord: point, distM: 0 };
  if (polyline.length === 1) {
    return { coord: polyline[0], distM: distM(point, polyline[0], mPerLng) };
  }

  let bestDist = Infinity;
  let bestCoord: [number, number] = polyline[0];

  const px = point[0] * mPerLng;
  const py = point[1] * M_PER_DEG_LAT;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const ax = a[0] * mPerLng;
    const ay = a[1] * M_PER_DEG_LAT;
    const bx = b[0] * mPerLng;
    const by = b[1] * M_PER_DEG_LAT;

    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;

    if (len2 < 1e-20) {
      const d = Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
      if (d < bestDist) { bestDist = d; bestCoord = a; }
      continue;
    }

    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
    const projX = ax + t * abx;
    const projY = ay + t * aby;
    const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);

    if (d < bestDist) {
      bestDist = d;
      bestCoord = [projX / mPerLng, projY / M_PER_DEG_LAT];
    }
  }

  return { coord: bestCoord, distM: bestDist };
}

/**
 * Retorna a extremidade da coluna física mais próxima da principal.
 */
function columnInletCoord(
  col: PhysicalColumn,
  principalCoords: [number, number][],
  mPerLng: number,
): [number, number] {
  const dStart = projectOnPolyline(col.startLngLat, principalCoords, mPerLng).distM;
  const dEnd   = projectOnPolyline(col.endLngLat,   principalCoords, mPerLng).distM;
  return dStart <= dEnd ? col.startLngLat : col.endLngLat;
}

/**
 * API pública: extremidade da coluna física mais próxima da principal.
 *
 * Fonte única de verdade compartilhada entre generateSecondaries (ramais) e
 * generateControlPoints (lateral_inlet). Aceita centroid em vez de mPerLng
 * pré-calculado para facilitar o uso em pontos de entrada externos.
 */
export function columnPhysicalInlet(
  col: PhysicalColumn,
  principalCoords: [number, number][],
  centroid: { lng: number; lat: number },
): [number, number] {
  return columnInletCoord(col, principalCoords, mPerLngAtLat(centroid.lat));
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera ramais (secundárias) para colunas físicas cujo inlet não toca a principal.
 *
 * Para cada coluna: projeta o inlet na principal.  Se a distância for
 * maior que minGapM, cria um ramal do ponto projetado até o inlet.
 *
 * Funciona tanto com principal automática quanto manual.
 *
 * @param minGapM  Tolerância de contato direto (padrão 0.5 m).
 */
export function generateSecondaries(
  physicalColumns: PhysicalColumn[],
  principalCoords: [number, number][],
  centroid: { lng: number; lat: number },
  minGapM: number = 0.5,
): SecondaryPipe[] {
  if (physicalColumns.length === 0 || principalCoords.length === 0) return [];

  const mPerLng = mPerLngAtLat(centroid.lat);
  const secondaries: SecondaryPipe[] = [];

  for (const col of physicalColumns) {
    const inlet = columnInletCoord(col, principalCoords, mPerLng);
    const { coord: projCoord, distM: gap } = projectOnPolyline(inlet, principalCoords, mPerLng);

    if (gap > minGapM) {
      secondaries.push({
        id: `sec-${col.id}`,
        physicalColumnId: col.id,
        fromCoord: projCoord,
        toCoord: inlet,
        lengthM: gap,
        source: "auto",
      });
    }
  }

  return secondaries;
}

/**
 * Valida a conectividade hidráulica da rede.
 *
 * Determina quais colunas físicas estão conectadas à principal (diretamente ou
 * via ramal na lista `secondaries`) e quais estão órfãs.
 *
 * Uma coluna está conectada quando:
 *   - gap até a principal ≤ minGapM (contato direto), OU
 *   - existe uma SecondaryPipe em `secondaries` com physicalColumnId === col.id.
 *
 * @param secondaries  Lista gerada por generateSecondaries().
 *                     Pode ser vazia para testar o estado sem ramais.
 * @param minGapM      Mesma tolerância usada em generateSecondaries().
 */
export function validateHydraulicConnectivity(
  physicalColumns: PhysicalColumn[],
  principalCoords: [number, number][] | null | undefined,
  secondaries: SecondaryPipe[],
  centroid: { lng: number; lat: number },
  minGapM: number = 0.5,
): HydraulicConnectivityReport {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!principalCoords || principalCoords.length === 0) {
    const allIds = physicalColumns.map((c) => c.id);
    blockers.push("Principal não definida. Todas as laterais físicas estão desconectadas.");
    return {
      isConnected: false,
      orphanPhysicalColumns: allIds,
      orphanOperationalSegments: [],
      missingSecondaryConnections: allIds,
      secondaries: [],
      totalSecondaryLengthM: 0,
      connectedColumnsCount: 0,
      disconnectedColumnsCount: physicalColumns.length,
      warnings,
      blockers,
    };
  }

  const mPerLng = mPerLngAtLat(centroid.lat);
  const secondaryByColId = new Map(secondaries.map((s) => [s.physicalColumnId, s]));
  const totalSecondaryLengthM = secondaries.reduce((s, r) => s + r.lengthM, 0);

  const orphanPhysicalColumns: string[] = [];
  const missingSecondaryConnections: string[] = [];
  let connectedCount = 0;

  for (const col of physicalColumns) {
    const inlet = columnInletCoord(col, principalCoords, mPerLng);
    const gap = projectOnPolyline(inlet, principalCoords, mPerLng).distM;
    const hasSecondary = secondaryByColId.has(col.id);

    const isConnected = gap <= minGapM || hasSecondary;
    if (isConnected) {
      connectedCount++;
    } else {
      orphanPhysicalColumns.push(col.id);
      // Se precisa de ramal mas não tem, reporta como missing
      if (gap > minGapM) missingSecondaryConnections.push(col.id);
    }
  }

  const disconnectedCount = orphanPhysicalColumns.length;

  if (disconnectedCount > 0) {
    blockers.push(
      `Existem ${disconnectedCount} lateral${disconnectedCount > 1 ? "is" : ""} física${disconnectedCount > 1 ? "s" : ""} ` +
      `sem conexão hidráulica com a principal.`,
    );
  }

  if (missingSecondaryConnections.length > 0) {
    blockers.push(
      `Existem ${missingSecondaryConnections.length} lateral${missingSecondaryConnections.length > 1 ? "is" : ""} ` +
      `que exigem ramais/secundárias não modelados.`,
    );
  }

  if (totalSecondaryLengthM > 0 && secondaries.length > 0) {
    warnings.push(
      `${secondaries.length} ramal${secondaries.length > 1 ? "is" : ""} de conexão gerado${secondaries.length > 1 ? "s" : ""} ` +
      `(total: ${totalSecondaryLengthM.toFixed(0)} m). ` +
      `Inclua na BOM e valide em campo.`,
    );
  }

  const orphanOperationalSegments: string[] = [];

  return {
    isConnected: disconnectedCount === 0,
    orphanPhysicalColumns,
    orphanOperationalSegments,
    missingSecondaryConnections,
    secondaries,
    totalSecondaryLengthM,
    connectedColumnsCount: connectedCount,
    disconnectedColumnsCount: disconnectedCount,
    warnings,
    blockers,
  };
}
