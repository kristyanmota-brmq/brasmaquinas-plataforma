/**
 * Tipos explícitos para cada camada de tubulação da rede de irrigação.
 *
 * Hierarquia física:
 *   captação → adutora → entrada da área
 *   entrada  → principal (1 linha, ao longo das derivações)
 *   principal → lateral (1 por coluna física)
 *   lateral  → aspersores
 *
 * Quando uma coluna física é dividida entre setores (gap-split ou split operacional),
 * o trecho adicional precisa de uma secundária: ramal da principal até o ponto de corte.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enumerações de tipo e status
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineSegmentType =
  | "adutora"
  | "principal"
  | "secundaria"
  | "lateral"
  | "trecho-operacional";

export type PipelineSegmentStatus =
  | "active"           // dimensionado, sem pendências
  | "pending"          // existe fisicamente mas falta válvula/ramal/dimensionamento
  | "blocked";         // não pode ser alimentado sem redesenho

export type PipelineCorridorSource = "auto" | "manual";

// ─────────────────────────────────────────────────────────────────────────────
// Segmento de tubulação
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineSegment {
  id: string;
  type: PipelineSegmentType;
  /** Coordenadas [lng, lat] do traçado, da origem para o destino. */
  coordinates: [number, number][];
  lengthM: number;
  diametroMm?: number;
  sectorId?: number;
  /** "auto" = gerado pelo algoritmo; "manual" = desenhado pelo usuário. */
  source: PipelineCorridorSource;
  status: PipelineSegmentStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ponto de controle / válvula
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineControlPointType =
  | "lateral_inlet"
  | "section_valve"
  | "isolation_valve"
  | "independent_feed_required"
  | "manual_validation_required";

export interface PipelineControlPoint {
  id: string;
  coordinate: [number, number];
  type: PipelineControlPointType;
  status: "resolved" | "pending";
  physicalColumnId: string;
  sectorId: number;
  /** ID do segmento (secundária ou lateral) que alimenta este ponto. */
  feedSegmentId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rede completa de tubulação
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineNetwork {
  /** Segmento da captação até a entrada da área irrigada. */
  adutora: PipelineSegment | null;
  /** Linha principal paralela às derivações, ao longo da borda captação-side. */
  principal: PipelineSegment | null;
  /**
   * Ramais de alimentação para trechos operacionais que não têm conexão direta
   * com a principal (pontos de corte em colunas com split operacional).
   * Cada secundária vai de um ponto da principal até o ponto de corte na lateral.
   */
  secundarias: PipelineSegment[];
  /** Laterais físicas — uma por coluna física. */
  laterais: PipelineSegment[];
  /** Pontos de controle: entradas, válvulas de seção, pendências. */
  controlPoints: PipelineControlPoint[];
  /** "auto" = traçado gerado automaticamente; "manual" = corredor definido pelo usuário. */
  routeSource: PipelineCorridorSource;
  /** true quando o engenheiro validou o corredor (ativa geração de proposta final). */
  corridorValidated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprimento total de uma polilinha de coordenadas [lng, lat] usando
 * projeção plana (adequada para distâncias < 50 km).
 */
export function polylineLengthM(
  coords: [number, number][],
  mPerLng: number = 111320,
  mPerLat: number = 111320,
): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dlng = (coords[i][0] - coords[i - 1][0]) * mPerLng;
    const dlat = (coords[i][1] - coords[i - 1][1]) * mPerLat;
    total += Math.sqrt(dlng * dlng + dlat * dlat);
  }
  return total;
}

/**
 * Ângulo interno (graus) em p1 formado pelos segmentos p0→p1 e p1→p2.
 *
 * Convenção de ângulo interno:
 *   - 180° = segmentos colineares (sem curva)
 *   - 90°  = curva em ângulo reto
 *   - 0°   = retorno completo (inversão de sentido)
 *
 * Curvas "agudas" (problemáticas) têm ângulo interno baixo (< 90°).
 */
export function bendAngleDeg(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
): number {
  const ax = p1[0] - p0[0];
  const ay = p1[1] - p0[1];
  const bx = p2[0] - p1[0];
  const by = p2[1] - p1[1];
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (magA < 1e-15 || magB < 1e-15) return 180;
  // Deflexão: ângulo entre vetor de chegada e vetor de saída
  const cosDeflection = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (magA * magB)));
  const deflectionDeg = (Math.acos(cosDeflection) * 180) / Math.PI;
  // Ângulo interno = suplemento da deflexão
  return 180 - deflectionDeg;
}

/**
 * Simplifica uma polilinha removendo vértices cujo desvio perpendicular
 * do segmento formado pelos vizinhos seja menor que `toleranceM` (metros).
 * Preserva sempre o primeiro e o último ponto.
 */
export function simplifyPolyline(
  coords: [number, number][],
  toleranceM: number,
  mPerLng: number = 111320,
  mPerLat: number = 111320,
): [number, number][] {
  if (coords.length <= 2 || toleranceM <= 0) return coords;

  function perpendicularDistM(
    p: [number, number],
    a: [number, number],
    b: [number, number],
  ): number {
    const ax = (a[0] - p[0]) * mPerLng;
    const ay = (a[1] - p[1]) * mPerLat;
    const bx = (b[0] - p[0]) * mPerLng;
    const by = (b[1] - p[1]) * mPerLat;
    const abx = (b[0] - a[0]) * mPerLng;
    const aby = (b[1] - a[1]) * mPerLat;
    const abLen = Math.sqrt(abx * abx + aby * aby);
    if (abLen < 1e-10) return Math.sqrt(ax * ax + ay * ay);
    return Math.abs(abx * ay - aby * ax) / abLen;
  }

  // Douglas-Peucker iterativo
  const keep = new Uint8Array(coords.length);
  keep[0] = 1;
  keep[coords.length - 1] = 1;

  const stack: [number, number][] = [[0, coords.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = start;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistM(coords[i], coords[start], coords[end]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > toleranceM) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }

  return coords.filter((_, i) => keep[i] === 1);
}
