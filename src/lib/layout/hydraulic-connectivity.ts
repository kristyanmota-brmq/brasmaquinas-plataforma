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
  /** Ponto de saída na principal (projeção do inlet). Preservado para retrocompatibilidade. */
  fromCoord: [number, number];
  /** Inlet da lateral física (extremidade mais próxima da principal). Preservado para retrocompatibilidade. */
  toCoord: [number, number];
  /**
   * Polilinha completa do ramal (LngLat).
   * - Ausente: rota é [fromCoord, toCoord] (linha reta — caso legado ou caso padrão).
   * - Presente com length=2: linha reta explícita.
   * - Presente com length=3: rota em L com cotovelo 90°.
   * coords[0] === fromCoord e coords[coords.length-1] === toCoord sempre.
   */
  coords?: [number, number][];
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

/** Tolerância angular para classificar deflexão como 0° ou 90° (graus). */
const ROUTING_TOL_DEG = 5;

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

// ─── Helpers de roteamento (L-shape 90°) ─────────────────────────────────────

function toMetricPt(p: [number, number], mPerLng: number): [number, number] {
  return [p[0] * mPerLng, p[1] * M_PER_DEG_LAT];
}

function fromMetricPt(m: [number, number], mPerLng: number): [number, number] {
  return [m[0] / mPerLng, m[1] / M_PER_DEG_LAT];
}

function euclidM(a: [number, number], b: [number, number]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

function unitVecM(a: [number, number], b: [number, number]): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return [1, 0];
  return [dx / len, dy / len];
}

function perpCCW(v: [number, number]): [number, number] {
  return [-v[1], v[0]];
}

function angleBetweenDegM(va: [number, number], vb: [number, number]): number {
  const dot = va[0] * vb[0] + va[1] * vb[1];
  return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
}

/**
 * Direção (unit vector) do segmento da polilinha mais próximo ao ponto (em espaço métrico).
 */
function nearestSegDirM(
  point: [number, number],
  polyline: [number, number][],
  mPerLng: number,
): [number, number] {
  if (polyline.length < 2) return [1, 0];
  const px = point[0] * mPerLng;
  const py = point[1] * M_PER_DEG_LAT;
  let bestDist = Infinity;
  let bestDir: [number, number] = [1, 0];
  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i][0] * mPerLng;
    const ay = polyline[i][1] * M_PER_DEG_LAT;
    const bx = polyline[i + 1][0] * mPerLng;
    const by = polyline[i + 1][1] * M_PER_DEG_LAT;
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    if (len2 < 1e-20) continue;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
    const d = Math.sqrt((px - (ax + t * abx)) ** 2 + (py - (ay + t * aby)) ** 2);
    if (d < bestDist) {
      bestDist = d;
      const len = Math.sqrt(len2);
      bestDir = [abx / len, aby / len];
    }
  }
  return bestDir;
}

/**
 * Interseção de duas retas: A + s*dA = B + t*dB.
 * Retorna o ponto de interseção em espaço métrico, ou null se paralelas.
 */
function intersectRaysM(
  A: [number, number], dA: [number, number],
  B: [number, number], dB: [number, number],
): [number, number] | null {
  // det = dA[1]*dB[0] - dA[0]*dB[1]
  const det = dA[1] * dB[0] - dA[0] * dB[1];
  if (Math.abs(det) < 1e-10) return null;
  const bax = B[0] - A[0];
  const bay = B[1] - A[1];
  const s = (bay * dB[0] - bax * dB[1]) / det;
  return [A[0] + s * dA[0], A[1] + s * dA[1]];
}

/**
 * Calcula a rota construtível de um ramal.
 *
 * Regra da rede interna: apenas deflexões 0° (luva) e 90° (curva/tê) são permitidas.
 *
 * - α ≈ 0° (principal ⊥ lateral): rota reta [F, T] — caso padrão.
 * - α ≈ 90° (principal ∥ lateral): rota em L [F, M, T] com cotovelo 90°.
 * - Outro α (incluindo 45°): rota reta mantida; diagnóstico emitirá blocker.
 *
 * @param F  fromCoord (ponto na principal)
 * @param T  toCoord (inlet da lateral)
 * @param col  PhysicalColumn — fornece direção da lateral
 * @param principalCoords  Polilinha da principal
 * @param mPerLng  Metros por grau de longitude na latitude local
 */
function routeSecondary(
  F: [number, number],
  T: [number, number],
  col: PhysicalColumn,
  principalCoords: [number, number][],
  mPerLng: number,
): { coords: [number, number][]; lengthM: number } {
  const Fm = toMetricPt(F, mPerLng);
  const Tm = toMetricPt(T, mPerLng);
  const directLen = euclidM(Fm, Tm);

  if (directLen < 1e-3) {
    return { coords: [F, T], lengthM: directLen };
  }

  const principalDir = nearestSegDirM(F, principalCoords, mPerLng);
  const latStart = toMetricPt(col.startLngLat, mPerLng);
  const latEnd   = toMetricPt(col.endLngLat,   mPerLng);
  const lateralDir = unitVecM(latStart, latEnd);

  // Perpendicular à principal, apontando para T.
  let perpDir = perpCCW(principalDir);
  if (perpDir[0] * (Tm[0] - Fm[0]) + perpDir[1] * (Tm[1] - Fm[1]) < 0) {
    perpDir = [-perpDir[0], -perpDir[1]];
  }

  const alpha = angleBetweenDegM(perpDir, lateralDir);

  if (alpha <= ROUTING_TOL_DEG) {
    // perpDir ∥ lateralDir → principal ⊥ lateral → rota reta (caso padrão).
    return { coords: [F, T], lengthM: directLen };
  }

  if (Math.abs(alpha - 90) <= ROUTING_TOL_DEG) {
    // perpDir ⊥ lateralDir → principal ∥ lateral → rota em L 90°.
    const Mm = intersectRaysM(Fm, perpDir, Tm, lateralDir);
    if (Mm === null) {
      return { coords: [F, T], lengthM: directLen };
    }
    const lenFM = euclidM(Fm, Mm);
    const lenMT = euclidM(Mm, Tm);
    if (lenFM < 1e-3 || lenMT < 1e-3) {
      return { coords: [F, T], lengthM: directLen };
    }
    const M = fromMetricPt(Mm, mPerLng);
    return { coords: [F, M, T], lengthM: lenFM + lenMT };
  }

  // Ângulo não construtível (ex.: 45°, 30°, 60°): manter rota reta.
  // detectNetworkAngleIssues emitirá blocker para este ramal.
  return { coords: [F, T], lengthM: directLen };
}

// ─────────────────────────────────────────────────────────────────────────────

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
      const { coords, lengthM } = routeSecondary(
        projCoord, inlet, col, principalCoords, mPerLng,
      );
      secondaries.push({
        id: `sec-${col.id}`,
        physicalColumnId: col.id,
        fromCoord: projCoord,
        toCoord: inlet,
        coords,
        lengthM,
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
