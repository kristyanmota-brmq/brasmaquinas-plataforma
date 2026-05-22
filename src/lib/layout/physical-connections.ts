/**
 * Contagem de conexões físicas construtíveis da rede de irrigação.
 *
 * Camada A (detecção geométrica pura): sem acesso ao catálogo.
 * A resolução de SKU e a emissão de pendências são responsabilidade de bom.ts.
 *
 * Conexões detectadas:
 *   - countAdutoraBends     : dobras ≈ 90° e ≈ 45° na adutora
 *   - countSecondaryLBends  : curvas 90° em ramais com rota em L (coords.length === 3)
 *   - countSprinklerTees    : derivações aspersor→lateral (1 por aspersor, por DN da lateral)
 *
 * Luvas: fora do escopo — nenhum critério de contagem definido, nenhum SKU catalogado.
 */

import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";
import type { SizedSecondaryPipe } from "@/lib/layout/secondary-sizing";
import type { PhysicalColumn } from "@/lib/layout/laterais";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers geométricos (mesma base de network-angle-diagnostics.ts)
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;

function mPerLngAtLat(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function metricVec(
  a: [number, number],
  b: [number, number],
  mLng: number,
): [number, number] {
  return [(b[0] - a[0]) * mLng, (b[1] - a[1]) * M_PER_DEG_LAT];
}

function angleBetweenDeg(va: [number, number], vb: [number, number]): number {
  const magA = Math.sqrt(va[0] ** 2 + va[1] ** 2);
  const magB = Math.sqrt(vb[0] ** 2 + vb[1] ** 2);
  if (magA < 1e-6 || magB < 1e-6) return 0;
  const dot = va[0] * vb[0] + va[1] * vb[1];
  const cos = Math.max(-1, Math.min(1, dot / (magA * magB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Tolerância angular — mesma de detectNetworkAngleIssues (PREMISSA_PROVISORIA_ENGENHARIA).
const ANGLE_TOL_DEG = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

/** Dobras detectadas na adutora, classificadas por tipo de conexão física. */
export interface AdutoraBends {
  /** Dobras ≈ 90° — SKU disponível em CURVAS_90_RIGIDAS → item precificado em bom.ts. */
  curvas90Count: number;
  /** Dobras ≈ 45° — sem SKU catalogado → BOMPendingConnection em bom.ts. */
  curvas45Count: number;
}

/** Curvas 90° em ramais com rota em L (coords.length === 3), agrupadas por DN. */
export interface SecondaryLBends {
  /** DN (mm) → quantidade de curvas 90° com DN conhecido via sizedSecondaries. */
  byDnMm: Map<number, number>;
  /** Ramais em L cujo DN não pôde ser determinado (sizedSecondaries ausente ou coluna não mapeada). */
  indeterminate: number;
}

/** Derivações aspersor→lateral por DN da lateral (1 por aspersor). */
export interface SprinklerTeesByDn {
  /** DN lateral (mm) → número de aspersores a conectar nessa lateral. */
  byDnMm: Map<number, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções públicas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conta dobras na adutora classificando em 90° (SKU disponível) e 45° (pendência).
 *
 * Dobras ≈ 0° (trechos retos) são ignoradas — luvas fora do escopo.
 * Ângulos não construtíveis (ex.: 30°, 60°) já teriam gerado blocker em
 * detectNetworkAngleIssues; não são duplicados aqui.
 */
export function countAdutoraBends(
  adutoraCoords: [number, number][],
  centroid: { lat: number; lng: number },
  toleranceDeg = ANGLE_TOL_DEG,
): AdutoraBends {
  const result: AdutoraBends = { curvas90Count: 0, curvas45Count: 0 };
  if (adutoraCoords.length < 3) return result;

  const mLng = mPerLngAtLat(centroid.lat);

  for (let i = 1; i < adutoraCoords.length - 1; i++) {
    const A = adutoraCoords[i - 1];
    const B = adutoraCoords[i];
    const C = adutoraCoords[i + 1];

    const vIn  = metricVec(A, B, mLng);
    const vOut = metricVec(B, C, mLng);
    const deflection = angleBetweenDeg(vIn, vOut);

    if (Math.abs(deflection - 90) <= toleranceDeg) {
      result.curvas90Count++;
    } else if (Math.abs(deflection - 45) <= toleranceDeg) {
      result.curvas45Count++;
    }
    // deflection ≈ 0° → trecho reto; luva fora do escopo (sem critério/SKU)
    // outros ângulos → blocker de detectNetworkAngleIssues; não duplicar aqui
  }

  return result;
}

/**
 * Conta curvas 90° em ramais com rota em L (coords.length === 3).
 *
 * O ponto médio da polilinha [F, M, T] é o cotovelo 90° físico.
 * O DN é obtido de sizedSecondaries (via physicalColumnId).
 * Sem DN determinado → contado em `indeterminate` para BOMPendingConnection
 * com motivo `dn_indeterminado` (não usar DN da principal como fallback para item precificado).
 */
export function countSecondaryLBends(
  secondaries: SecondaryPipe[],
  sizedSecondaries: SizedSecondaryPipe[] | undefined,
): SecondaryLBends {
  const result: SecondaryLBends = { byDnMm: new Map(), indeterminate: 0 };

  const dnByColId = new Map<string, number>();
  if (sizedSecondaries) {
    for (const s of sizedSecondaries) {
      dnByColId.set(s.physicalColumnId, s.diametroMm);
    }
  }

  for (const sec of secondaries) {
    if (sec.coords?.length !== 3) continue; // apenas rota em L tem cotovelo físico

    const dn = dnByColId.get(sec.physicalColumnId);
    if (dn === undefined) {
      result.indeterminate++;
    } else {
      result.byDnMm.set(dn, (result.byDnMm.get(dn) ?? 0) + 1);
    }
  }

  return result;
}

/**
 * Conta derivações aspersor→lateral: 1 por aspersor, agrupado por DN da lateral.
 *
 * A conexão física entre o riser do aspersor (DN 25mm) e a lateral exige um tê redutor
 * ou sela de tomada — peça inexistente no catálogo atual. O resultado é sempre
 * BOMPendingConnection com motivo `sku_nao_catalogado`.
 */
export function countSprinklerTees(physicalColumns: PhysicalColumn[]): SprinklerTeesByDn {
  const byDnMm = new Map<number, number>();
  for (const col of physicalColumns) {
    const dn = col.selecao.tubo.diametroMm;
    byDnMm.set(dn, (byDnMm.get(dn) ?? 0) + col.sprinklerCount);
  }
  return { byDnMm };
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK-035 — Curvas 90° dentro de laterais físicas (sub-laterais)
// ─────────────────────────────────────────────────────────────────────────────

/** Curvas 90° detectadas em laterais físicas, agrupadas por DN da lateral. */
export interface LateralBends90 {
  /** DN da lateral (mm) → quantidade total de curvas 90° contadas. */
  byDnMm: Map<number, number>;
  /** Curvas detectadas em colunas cujo DN não pôde ser determinado. */
  indeterminate: number;
}

/**
 * Comprimento mínimo de segmento (em metros) para participar do cálculo angular.
 * Segmentos abaixo desse limiar são tratados como ruído numérico (ponto duplicado,
 * artefato de transformação de coordenadas) e ignorados.
 */
const MIN_SEG_LEN_M = 0.01;

/**
 * Conta curvas 90° físicas reais dentro de cada lateral física (sub-lateral).
 *
 * Fonte de verdade: `PhysicalColumn.routeCoords` (uma coluna física = uma vala).
 * `Lateral.routeCoords` NÃO é consumido aqui — evita dupla contagem do mesmo
 * trecho operacional/setorial dentro da mesma vala física.
 *
 * Pós-TASK-045B/TASK-046, `buildLateralRoute` devolve sempre 2 pontos (reta
 * no eixo único via mediana de X). No caminho feliz default esta função
 * retorna `byDnMm` vazio e `indeterminate = 0`. A iteração é defensiva: se
 * algum chamador futuro reintroduzir polilinha com vértice intermediário
 * real, a curva é detectada e agrupada por DN.
 *
 * Critério de curva 90°: `|deflexão − 90°| ≤ toleranceDeg` (default
 * `ANGLE_TOL_DEG = 5°`, alinhado com `TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE`).
 * Deflexão ≈ 0° é trecho reto/luva (fora de escopo). Outras deflexões em
 * lateral violam `REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA` e já viram
 * blocker em `detectNetworkAngleIssues` — não duplicadas aqui.
 *
 * Segmentos com comprimento métrico < `MIN_SEG_LEN_M` (1 cm) são ignorados
 * para não gerar curva falsa por ponto duplicado ou ruído numérico.
 */
export function countLateralBends90(
  physicalColumns: PhysicalColumn[],
  centroid: { lat: number; lng: number },
  toleranceDeg = ANGLE_TOL_DEG,
): LateralBends90 {
  const result: LateralBends90 = { byDnMm: new Map(), indeterminate: 0 };
  const mLng = mPerLngAtLat(centroid.lat);

  for (const col of physicalColumns) {
    const route = col.routeCoords;
    if (!route || route.length < 3) continue; // rota reta de 2 pontos → 0 curvas

    let bends = 0;
    for (let i = 1; i < route.length - 1; i++) {
      const vIn  = metricVec(route[i - 1], route[i],     mLng);
      const vOut = metricVec(route[i],     route[i + 1], mLng);

      const lenIn  = Math.hypot(vIn[0],  vIn[1]);
      const lenOut = Math.hypot(vOut[0], vOut[1]);
      if (lenIn < MIN_SEG_LEN_M || lenOut < MIN_SEG_LEN_M) continue;

      const deflection = angleBetweenDeg(vIn, vOut);
      if (Math.abs(deflection - 90) <= toleranceDeg) bends++;
    }

    if (bends === 0) continue;

    const dn = col.selecao?.tubo?.diametroMm;
    if (typeof dn !== "number" || !Number.isFinite(dn) || dn <= 0) {
      result.indeterminate += bends;
    } else {
      result.byDnMm.set(dn, (result.byDnMm.get(dn) ?? 0) + bends);
    }
  }

  return result;
}
