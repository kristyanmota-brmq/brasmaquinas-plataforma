/**
 * Diagnóstico de rota para cada camada de tubulação.
 *
 * generatePipelineRouteDiagnostics() retorna métricas geométricas e construtivas
 * para adutora, principal e secundárias, além de warnings e blockers automáticos.
 *
 * Não altera o estado da rede — apenas analisa o traçado existente.
 */

import type { ProjectLayout } from "@/app/projetos/[id]/actions";
import { bendAngleDeg, polylineLengthM } from "./pipeline-types";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces de diagnóstico
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineSegmentDiagnostics {
  routeType: "auto" | "manual" | "absent";
  lengthM: number;
  numberOfVertices: number;
  numberOfBends: number;
  /** Ângulo mínimo encontrado nas curvas (graus). 180° = sem curva. */
  minBendAngleDeg: number;
  /** Curvas com ângulo interno < 90° (deflexão > 90° — requer conexão especial). */
  sharpBendsCount: number;
  /** % dos segmentos da rota que ficam dentro do polígono da área irrigada. */
  routeInsideIrrigatedAreaPercent: number;
  /** % dos segmentos que ficam fora do polígono (sem corredor manual). */
  routeOutsidePolygonPercent: number;
  /** Pares de vértices consecutivos idênticos (micro-vértice duplicado). */
  duplicatedSegmentsCount: number;
  /** Sobreposições exatas entre segmentos da mesma polilinha (auto-intersecção simples). */
  selfIntersectionsCount: number;
  hasManualCorridor: boolean;
  warnings: string[];
  blockers: string[];
}

export interface PipelineRouteDiagnosticsReport {
  adutora: PipelineSegmentDiagnostics;
  principal: PipelineSegmentDiagnostics;
  /** Diagnóstico agregado das secundárias (se existirem). */
  secundarias: PipelineSegmentDiagnostics | null;
  overallValid: boolean;
  blockers: string[];
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const SHARP_BEND_DEG = 90;
const HIGH_BEND_COUNT = 5;
const M_PER_DEG_LAT = 111320;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

function absentDiagnostics(): PipelineSegmentDiagnostics {
  return {
    routeType: "absent",
    lengthM: 0,
    numberOfVertices: 0,
    numberOfBends: 0,
    minBendAngleDeg: 180,
    sharpBendsCount: 0,
    routeInsideIrrigatedAreaPercent: 0,
    routeOutsidePolygonPercent: 100,
    duplicatedSegmentsCount: 0,
    selfIntersectionsCount: 0,
    hasManualCorridor: false,
    warnings: ["Segmento não definido."],
    blockers: [],
  };
}

/**
 * Verifica se um ponto [lng, lat] está dentro de um polígono GeoJSON simples
 * usando ray-casting (sem dependência de turf — mantém o módulo puro).
 */
function pointInPolygon(
  point: [number, number],
  polygon: GeoJSON.Polygon,
): boolean {
  const [px, py] = point;
  const ring = polygon.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Percentual de vértices de uma polilinha que ficam dentro do polígono.
 * Usa apenas vértices (não integra ao longo dos segmentos).
 */
function insidePercent(
  coords: [number, number][],
  polygon: GeoJSON.Polygon,
): number {
  if (coords.length === 0) return 0;
  const inside = coords.filter((c) => pointInPolygon(c, polygon)).length;
  return (inside / coords.length) * 100;
}

/**
 * Conta pares de vértices consecutivos idênticos (micro-vértices duplicados).
 */
function countDuplicateSegments(coords: [number, number][]): number {
  let count = 0;
  const eps = 1e-9;
  for (let i = 1; i < coords.length; i++) {
    if (
      Math.abs(coords[i][0] - coords[i - 1][0]) < eps &&
      Math.abs(coords[i][1] - coords[i - 1][1]) < eps
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Conta auto-intersecções simples (segmentos que se cruzam dentro da mesma polilinha).
 * Usa teste de cruzamento 2D (segmentos, não linhas infinitas).
 */
function countSelfIntersections(coords: [number, number][]): number {
  if (coords.length < 4) return 0;

  function cross2D(
    ax: number, ay: number,
    bx: number, by: number,
  ): number {
    return ax * by - ay * bx;
  }

  function segmentsIntersect(
    p1: [number, number], p2: [number, number],
    p3: [number, number], p4: [number, number],
  ): boolean {
    const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1];
    const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1];
    const denom = cross2D(d1x, d1y, d2x, d2y);
    if (Math.abs(denom) < 1e-15) return false;
    const dx = p3[0] - p1[0], dy = p3[1] - p1[1];
    const t = cross2D(dx, dy, d2x, d2y) / denom;
    const u = cross2D(dx, dy, d1x, d1y) / denom;
    const eps = 1e-9;
    return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
  }

  let count = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    for (let j = i + 2; j < coords.length - 1; j++) {
      if (i === 0 && j === coords.length - 2) continue; // adjacent at closure
      if (segmentsIntersect(coords[i], coords[i + 1], coords[j], coords[j + 1])) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Calcula as métricas de uma polilinha e gera warnings/blockers.
 */
function diagnosePolyline(
  coords: [number, number][],
  source: "auto" | "manual",
  area: GeoJSON.Polygon | undefined,
  segmentLabel: string,
): PipelineSegmentDiagnostics {
  const mPerLng = M_PER_DEG_LAT * Math.cos(((coords[0]?.[1] ?? 0) * Math.PI) / 180);

  const lengthM = polylineLengthM(coords, mPerLng, M_PER_DEG_LAT);
  const numberOfVertices = coords.length;
  const duplicatedSegmentsCount = countDuplicateSegments(coords);
  const selfIntersectionsCount = countSelfIntersections(coords);

  const warnings: string[] = [];
  const blockers: string[] = [];

  // Curvas
  let minBendAngleDeg = 180;
  let sharpBendsCount = 0;
  const numberOfBends = Math.max(0, coords.length - 2);
  for (let i = 1; i < coords.length - 1; i++) {
    const angle = bendAngleDeg(coords[i - 1], coords[i], coords[i + 1]);
    if (angle < minBendAngleDeg) minBendAngleDeg = angle;
    if (angle < SHARP_BEND_DEG) sharpBendsCount++;
  }

  // Análise de posição relativa ao polígono
  let routeInsideIrrigatedAreaPercent = 0;
  let routeOutsidePolygonPercent = 0;
  if (area) {
    routeInsideIrrigatedAreaPercent = insidePercent(coords, area);
    routeOutsidePolygonPercent = 100 - routeInsideIrrigatedAreaPercent;
  }

  // W1 — muitas curvas
  if (numberOfBends > HIGH_BEND_COUNT) {
    warnings.push(
      `${segmentLabel}: ${numberOfBends} curvas detectadas. Considere simplificar o traçado.`,
    );
  }

  // W2 — curva aguda
  if (sharpBendsCount > 0) {
    warnings.push(
      `${segmentLabel}: ${sharpBendsCount} curva(s) com ângulo < ${SHARP_BEND_DEG}°. ` +
        `Curvas agudas aumentam perda localizada e dificultam instalação.`,
    );
  }

  // W3 — micro-vértices do polígono
  if (numberOfBends > 2 * HIGH_BEND_COUNT && source === "auto") {
    warnings.push(
      `${segmentLabel}: traçado automático com muitos vértices — pode estar seguindo ` +
        `microvértices do polígono da área. Verifique o traçado.`,
    );
  }

  // W4 — rota fora do polígono sem corredor manual
  if (routeOutsidePolygonPercent > 10 && source === "auto") {
    warnings.push(
      `${segmentLabel}: ${routeOutsidePolygonPercent.toFixed(0)}% da rota está fora ` +
        `do polígono sem corredor manual validado.`,
    );
  }

  // W5 — micro-vértices duplicados
  if (duplicatedSegmentsCount > 0) {
    warnings.push(
      `${segmentLabel}: ${duplicatedSegmentsCount} vértice(s) duplicado(s) no traçado.`,
    );
  }

  // W6 — auto-intersecção
  if (selfIntersectionsCount > 0) {
    warnings.push(
      `${segmentLabel}: ${selfIntersectionsCount} auto-intersecção(ões) detectada(s).`,
    );
  }

  return {
    routeType: source,
    lengthM,
    numberOfVertices,
    numberOfBends,
    minBendAngleDeg,
    sharpBendsCount,
    routeInsideIrrigatedAreaPercent,
    routeOutsidePolygonPercent,
    duplicatedSegmentsCount,
    selfIntersectionsCount,
    hasManualCorridor: source === "manual",
    warnings,
    blockers,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Função principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera o relatório de diagnóstico de rota para adutora e principal.
 *
 * Retorna warnings e blockers automáticos para auxiliar na validação do traçado
 * antes da geração da proposta final.
 */
export function generatePipelineRouteDiagnostics(
  layout: ProjectLayout,
): PipelineRouteDiagnosticsReport {
  const { mainPipeline, area } = layout;

  if (!mainPipeline) {
    const absent = absentDiagnostics();
    return {
      adutora: absent,
      principal: absent,
      secundarias: null,
      overallValid: false,
      blockers: ["Tubulação principal não definida."],
      warnings: [],
    };
  }

  const source = mainPipeline.source ?? "auto";
  const corridorValidated = (mainPipeline as { corridorValidated?: boolean }).corridorValidated ?? false;

  // --- Principal ---
  const principalCoords = mainPipeline.coordinates as [number, number][];
  const principalDiag = principalCoords.length >= 2
    ? diagnosePolyline(principalCoords, source, area, "Principal")
    : absentDiagnostics();

  // --- Adutora ---
  const adutoraCoords = (mainPipeline.adutora ?? []) as [number, number][];
  const adutoraDiag = adutoraCoords.length >= 2
    ? diagnosePolyline(adutoraCoords, source, area, "Adutora")
    : absentDiagnostics();

  // W6 — sobreposição adutora/principal
  const allWarnings: string[] = [...principalDiag.warnings, ...adutoraDiag.warnings];
  const allBlockers: string[] = [...principalDiag.blockers, ...adutoraDiag.blockers];

  if (
    adutoraCoords.length >= 2 &&
    principalCoords.length >= 2 &&
    source === "auto" &&
    !corridorValidated
  ) {
    allWarnings.push(
      "Traçado automático — validar corredor de instalação, curvas, pontos de controle e " +
        "interferências antes da emissão final.",
    );
  }

  if (!corridorValidated && source === "auto") {
    allBlockers.push(
      "Corredor de tubulação não validado. Proposta final requer validação manual do traçado.",
    );
  }

  const overallValid = allBlockers.length === 0;

  return {
    adutora: adutoraDiag,
    principal: principalDiag,
    secundarias: null, // populado via buildConstructabilityReport quando disponível
    overallValid,
    blockers: allBlockers,
    warnings: allWarnings,
  };
}
