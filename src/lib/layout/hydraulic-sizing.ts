/**
 * Solver hidráulico — dimensionamento por caminho crítico exaustivo.
 *
 * Modo de operação: "one_sector_at_a_time" — apenas um setor opera por vez.
 * O tubo da principal/adutora é selecionado pelo setor de MAIOR vazão (garantia
 * de velocidade e BOM imutável). O caminho crítico é encontrado de forma
 * exaustiva: todos os setores × todos os segmentos → argmax HMT.
 *
 * Hazen-Williams (SI):
 *   hf [m] = 10,67 × Q[m³/s]^1,852 / (C^1,852 × D_interno[m]^4,871) × L[m]
 *   C = 145 (PVC, V0.5-RC §14); D = diâmetro interno real.
 *
 * Perdas locais: localLossFactorPercent % das perdas distribuídas (padrão 10 %).
 * Desnível: layout.geodetic?.elevationDeltaMeters (positivo = captação abaixo da área).
 */

import { headLoss, velocity } from "@/lib/hydraulics/hazenWilliams";
import { ASPERSOR_PADRAO, TUBOS_PVC_RIGIDO } from "@/lib/catalog/aspersores";
import { christiansenF } from "@/lib/layout/laterais";
import { sizeAllSecondaries, type SizedSecondaryPipe } from "@/lib/layout/secondary-sizing";
import type { IrrigationProjectResult } from "@/lib/layout/irrigation-project";

export type { SizedSecondaryPipe };

// ── Constants ──────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;
const MAX_VEL_PRINCIPAL_MS = 1.5;
const MAX_VEL_SECONDARY_MS = 1.5;
const MAX_VEL_LATERAL_MS = 2.5;
const MAX_LATERAL_LOSS_FRACTION = 0.20;
const MAX_SECONDARY_LOSS_FRACTION = 0.10;
const DEFAULT_SAFETY_MARGIN_MCA = 2.0;
const DEFAULT_LOCAL_LOSS_FACTOR_PERCENT = 10;

/** Limites hidráulicos usados pelo solver — exportados para diagnósticos externos. */
export const HYDRAULIC_LIMITS = {
  maxVelocityPrincipalMs: MAX_VEL_PRINCIPAL_MS,
  maxVelocitySecondaryMs: MAX_VEL_SECONDARY_MS,
  maxVelocityLateralMs: MAX_VEL_LATERAL_MS,
  maxLateralLossFraction: MAX_LATERAL_LOSS_FRACTION,
  maxSecondaryLossFraction: MAX_SECONDARY_LOSS_FRACTION,
} as const;

// ── Public types ───────────────────────────────────────────────────────────────

export type OperationMode = "one_sector_at_a_time";

export type HydraulicSolverStatus =
  | "not_calculated"
  | "calculated_pending_review"
  | "validated"
  | "blocked";

export type PumpValidationStatus =
  | "not_informed"
  | "ok"
  | "pump_insufficient_flow"
  | "pump_insufficient_head";

export interface PumpValidation {
  status: PumpValidationStatus;
  /** Vazão de projeto = maior vazão de setor (m³/h). */
  designFlowM3h: number;
  requiredHMT: number;
  pump?: { hmtMca: number; vazaoMaxM3h: number };
}

export interface HydraulicModelLimitations {
  principalFlowModel: "single_diameter_decreasing_flow";
  /** P4: cada ramal dimensionado individualmente por velocidade + hf. */
  secondarySizingModel: "individual_velocity_and_headloss_checked" | "velocity_and_headloss_checked" | "velocity_based_only";
  lateralLossModel: "hazen_williams_christiansen_f";
  /** T8: perdas locais estimadas por fator percentual, ou ignoradas. */
  localLossesModel: "percent_estimate" | "neglected";
  elevationModel: "waterSource_elevation_only";
  /** T8: diâmetro interno real do catálogo, ou nominal como fallback. */
  diameterAssumption: "internal" | "nominal_fallback";
  /** T8: caminho crítico calculado por varredura exaustiva de todos os setores. */
  criticalPathModel: "exhaustive" | "heuristic";
  /**
   * Modelo de cálculo de pressão por segmento usado na verificação de PN.
   *
   * - `"hmt_conservative_inlet"` (legado/fallback): ramais/laterais usam HMT como
   *   limite superior conservativo. Adutora/principal sempre calculam pressão de
   *   entrada diretamente. Comportamento original da TASK-004.
   * - `"exact_per_derivation"` (TASK-004B): ramais/laterais usam pressão real por
   *   derivação = `HMT − hfAdutora − cumPrincipalHfM(até derivação)`. Ativado quando
   *   TODOS os segmentos `secondary`/`lateral` carregam `cumPrincipalHfM` E `adutoraHfM`.
   *
   * Determinado dinamicamente pela helper {@link derivePressureClassModel}.
   */
  pressureClassModel: "hmt_conservative_inlet" | "exact_per_derivation";
}

/** Resultado da verificação de classe de pressão (PN) para um segmento.
 *  - `ok`: pressão operacional estimada ≤ PN do tubo.
 *  - `violation_confirmed`: pressão operacional calculada diretamente para este trecho excede o PN.
 *  - `violation_conservative`: comparação usou HMT como limite superior; pressão real pode ser menor.
 *  - `unknown`: tubo sem `pressaoNominalMca` — verificação não realizada.
 */
export type PressureClassCheck =
  | "ok"
  | "violation_confirmed"
  | "violation_conservative"
  | "unknown";

export interface HydraulicSegment {
  id: string;
  type: "adutora" | "principal" | "secondary" | "lateral";
  physicalColumnId?: string;
  sectorId?: number;
  operationalSegmentId?: string;
  lengthM: number;
  /** Diâmetro nominal/comercial (mm) — para exibição e BOM. */
  diametroMm: number;
  /** Diâmetro interno real usado nos cálculos HW (mm). Ausente em segmentos sintéticos legados. */
  internalDiameterMm?: number;
  coefC: number;
  flowM3h: number;
  headLossM: number;
  velocityMs: number;
  velocityExceeds: boolean;
  lateralLossExceeds?: boolean;
  /** T5: true quando hf do ramal > 10 % da pressão de serviço. */
  secondaryLossExceeds?: boolean;
  /** TASK-004: pressão nominal (PN) do tubo selecionado (mca). Do catálogo. */
  pressaoNominalMca?: number;
  /** TASK-004: pressão operacional estimada na entrada deste trecho (mca). */
  pressaoOperacionalMaxMca?: number;
  /** TASK-004: resultado da verificação de PN — ver `PressureClassCheck`. */
  pressureClassCheck?: PressureClassCheck;
  /**
   * TASK-004B: perda de carga acumulada na principal até a derivação deste segmento (mca).
   * Populado apenas para segmentos `secondary` e `lateral` quando o solver propaga `cumPrincipalHfM`
   * a partir de `EnrichedSeg`. Ausente em adutora/principal e em casos de fallback/teste sem dados
   * de derivação. Necessário (junto com `adutoraHfM`) para `annotatePressureClass` computar pressão
   * real por derivação em vez de fallback conservador via HMT.
   */
  cumPrincipalHfM?: number;
  /**
   * TASK-004B: perda de carga na adutora do setor correspondente a este segmento (mca).
   * Populado apenas para segmentos `secondary` e `lateral` no caminho real do solver.
   * Necessário (junto com `cumPrincipalHfM`) para classificação `exact_per_derivation`.
   */
  adutoraHfM?: number;
}

export interface CriticalPath {
  criticalSectorId: number;
  criticalPhysicalColumnId: string;
  criticalOperationalSegmentId: string;
  /** Segmentos em ordem: adutora → principal (sintético) → ramal → lateral. */
  criticalPathSegments: HydraulicSegment[];
  /** T4: sub-segmentos da principal até (e incluindo) a derivação crítica. */
  criticalPrincipalSubSegments: HydraulicSegment[];
  totalCriticalLengthM: number;
  totalHeadLossM: number;
}

export interface HMTBreakdown {
  pressaoServicoMca: number;
  hfAdutoraM: number;
  hfPrincipalToDerivationM: number;
  hfSecondaryM: number;
  hfLateralM: number;
  desnivelM: number;
  localLossesM: number;
  safetyMarginM: number;
  totalHMT: number;
  noElevationData: boolean;
}

export interface HydraulicValidation {
  invalidSegments: HydraulicSegment[];
  hasVelocityViolations: boolean;
  hasLateralLossViolations: boolean;
  /** T5: true quando algum ramal excede 10 % de perda de carga. */
  hasSecondaryLossViolations: boolean;
  /** TASK-004: true quando algum segmento tem violação de PN confirmada (pressão calculada diretamente). */
  hasPressureClassViolations: boolean;
  /** TASK-004: true quando algum segmento tem violação de PN conservativa (usou HMT como limite). */
  hasConservativePressureClassWarnings: boolean;
  /** false somente quando há violação confirmada (não conservativa) ou outra falha hidráulica. */
  allGatesPass: boolean;
}

export type HydraulicStatus =
  | "blocked_invalid_segments"
  | "technical_review_required"
  | "hydraulic_precheck_ok";

export interface HydraulicSizingReport {
  operationMode: OperationMode;
  criticalPath: CriticalPath;
  hmt: HMTBreakdown;
  validation: HydraulicValidation;
  pumpValidation: PumpValidation;
  modelLimitations: HydraulicModelLimitations;
  status: HydraulicStatus;
  hydraulicSolverStatus: HydraulicSolverStatus;
  warnings: string[];
  allSegments: HydraulicSegment[];
  /** P4: ramais dimensionados individualmente — um por SecondaryPipe. */
  sizedSecondaries: SizedSecondaryPipe[];
}

// ── TASK-004 / TASK-004B: Anotação de classe de pressão ──────────────────────

/**
 * Anota cada segmento com pressão operacional estimada e resultado da verificação de PN.
 *
 * - **Adutora/principal** (sequência linear): pressão de entrada decresce com `cumulativeHfM`
 *   in-loco. Violação ⇒ `"violation_confirmed"` (blocker).
 * - **Ramal/lateral**:
 *   - **TASK-004B (preferencial):** quando `seg.cumPrincipalHfM != null && seg.adutoraHfM != null`,
 *     usa pressão real por derivação: `pressaoOperacionalMaxMca = hmtMca − adutoraHfM − cumPrincipalHfM`.
 *     Violação ⇒ `"violation_confirmed"` (blocker real); dentro do PN ⇒ `"ok"`.
 *   - **Fallback legado (TASK-004):** quando esses campos são ausentes, usa HMT como limite
 *     superior conservativo. Violação ⇒ `"violation_conservative"` (warning, não blocker).
 *
 * A função é pura — não modifica a array original.
 */
export function annotatePressureClass(
  allSegments: HydraulicSegment[],
  hmtMca: number,
): HydraulicSegment[] {
  let cumulativeHfM = 0;
  let inLinearSequence = true;

  return allSegments.map((seg) => {
    const isLinear = seg.type === "adutora" || seg.type === "principal";
    if (!isLinear) inLinearSequence = false;

    const pressaoNominalMca = seg.pressaoNominalMca;

    if (pressaoNominalMca == null) {
      return { ...seg, pressureClassCheck: "unknown" as const };
    }

    let pressaoOperacionalMaxMca: number;
    let pressureClassCheck: PressureClassCheck;

    if (isLinear && inLinearSequence) {
      pressaoOperacionalMaxMca = hmtMca - cumulativeHfM;
      cumulativeHfM += seg.headLossM;
      pressureClassCheck = pressaoOperacionalMaxMca > pressaoNominalMca ? "violation_confirmed" : "ok";
    } else if (seg.cumPrincipalHfM != null && seg.adutoraHfM != null) {
      // TASK-004B: pressão real por derivação — ambos os campos requeridos
      pressaoOperacionalMaxMca = hmtMca - seg.adutoraHfM - seg.cumPrincipalHfM;
      pressureClassCheck = pressaoOperacionalMaxMca > pressaoNominalMca ? "violation_confirmed" : "ok";
    } else {
      // Fallback legado: HMT como limite superior conservativo
      pressaoOperacionalMaxMca = hmtMca;
      pressureClassCheck = pressaoOperacionalMaxMca > pressaoNominalMca ? "violation_conservative" : "ok";
    }

    return { ...seg, pressaoOperacionalMaxMca, pressureClassCheck };
  });
}

/**
 * Deriva o `pressureClassModel` a partir do conjunto de segmentos hidráulicos.
 *
 * Retorna `"exact_per_derivation"` quando:
 * - existe pelo menos 1 segmento `secondary` ou `lateral`, E
 * - TODOS os segmentos `secondary`/`lateral` carregam AMBOS `cumPrincipalHfM` E `adutoraHfM`.
 *
 * Caso contrário, retorna `"hmt_conservative_inlet"` (fallback legado da TASK-004).
 *
 * Função pura — não modifica a array de entrada.
 *
 * Ajuste TEC-004B-001 do GPT Reviewer: detecção exige ambos os campos para evitar
 * declarar modelo exato enquanto algum segmento usa fallback conservador internamente.
 */
export function derivePressureClassModel(
  allSegments: readonly HydraulicSegment[],
): "hmt_conservative_inlet" | "exact_per_derivation" {
  const relevant = allSegments.filter(
    (s) => s.type === "secondary" || s.type === "lateral",
  );
  if (relevant.length === 0) return "hmt_conservative_inlet";
  const allHaveDerivationData = relevant.every(
    (s) => s.cumPrincipalHfM != null && s.adutoraHfM != null,
  );
  return allHaveDerivationData ? "exact_per_derivation" : "hmt_conservative_inlet";
}

// ── Geometry helpers ───────────────────────────────────────────────────────────

function mPerLngAt(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function distM2D(a: [number, number], b: [number, number], mpl: number): number {
  const dx = (b[0] - a[0]) * mpl;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

function arcLengthOnPolyline(
  target: [number, number],
  polyline: [number, number][],
  mpl: number,
): number {
  if (polyline.length < 2) return 0;
  let bestDist = Infinity;
  let bestArc = 0;
  let arcSoFar = 0;
  for (let i = 0; i + 1 < polyline.length; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const segLen = distM2D(a, b, mpl);
    const ax = a[0] * mpl, ay = a[1] * M_PER_DEG_LAT;
    const bx = b[0] * mpl, by = b[1] * M_PER_DEG_LAT;
    const px = target[0] * mpl, py = target[1] * M_PER_DEG_LAT;
    const abx = bx - ax, aby = by - ay;
    const len2 = abx * abx + aby * aby;
    const t = len2 > 1e-20
      ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2))
      : 0;
    const projX = ax + t * abx, projY = ay + t * aby;
    const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    if (d < bestDist) { bestDist = d; bestArc = arcSoFar + t * segLen; }
    arcSoFar += segLen;
  }
  return bestArc;
}

function distToPolyline(
  point: [number, number],
  polyline: [number, number][],
  mpl: number,
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return distM2D(point, polyline[0], mpl);
  let best = Infinity;
  const px = point[0] * mpl, py = point[1] * M_PER_DEG_LAT;
  for (let i = 0; i + 1 < polyline.length; i++) {
    const a = polyline[i], b = polyline[i + 1];
    const ax = a[0] * mpl, ay = a[1] * M_PER_DEG_LAT;
    const bx = b[0] * mpl, by = b[1] * M_PER_DEG_LAT;
    const abx = bx - ax, aby = by - ay;
    const len2 = abx * abx + aby * aby;
    const t = len2 > 1e-20
      ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2))
      : 0;
    const projX = ax + t * abx, projY = ay + t * aby;
    const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    if (d < best) best = d;
  }
  return best;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Retorna diâmetro interno quando disponível, nominal como fallback. */
function internoMm(tube: { diametroMm: number; diametroInternoMm?: number }): number {
  return tube.diametroInternoMm ?? tube.diametroMm;
}

/** Menor tubo do catálogo PVC rígido que mantém velocidade ≤ maxVelMs (usa diâmetro interno). */
function selectPrincipalTube(
  flowM3h: number,
  maxVelMs: number = MAX_VEL_PRINCIPAL_MS,
): (typeof TUBOS_PVC_RIGIDO)[number] {
  const sorted = [...TUBOS_PVC_RIGIDO].sort((a, b) => a.diametroMm - b.diametroMm);
  for (const tube of sorted) {
    if (velocity(flowM3h, internoMm(tube)) <= maxVelMs) return tube;
  }
  return sorted[sorted.length - 1];
}

function validatePump(
  pump: { hmtMca: number; vazaoMaxM3h: number } | undefined,
  maxSectorFlow: number,
  requiredHMT: number,
): PumpValidation {
  if (!pump) {
    return { status: "not_informed", designFlowM3h: maxSectorFlow, requiredHMT };
  }
  if (pump.vazaoMaxM3h < maxSectorFlow) {
    return { status: "pump_insufficient_flow", designFlowM3h: maxSectorFlow, requiredHMT, pump };
  }
  if (pump.hmtMca < requiredHMT) {
    return { status: "pump_insufficient_head", designFlowM3h: maxSectorFlow, requiredHMT, pump };
  }
  return { status: "ok", designFlowM3h: maxSectorFlow, requiredHMT, pump };
}

// ── Main orchestrator ──────────────────────────────────────────────────────────

export function sizeHydraulics(
  result: IrrigationProjectResult,
  safetyMarginMca: number = DEFAULT_SAFETY_MARGIN_MCA,
  localLossFactorPercent: number = DEFAULT_LOCAL_LOSS_FACTOR_PERCENT,
): HydraulicSizingReport | null {
  const { isComplete, operational, physical, distribution, hydraulic, input } = result;
  if (!isComplete || !operational || !physical || !distribution || !hydraulic || !input) return null;
  if (distribution.laterais.length === 0) return null;

  const { operationalSegments, vazaoPorSetor, nSetores } = operational;
  const { laterais } = distribution;
  const { principalCoords, adutoraCoords, adutoraLengthM, secondaries } = hydraulic;

  const mpl = mPerLngAt(input.centroid.lat);
  const warnings: string[] = [];

  // ── 1. Selecionar tubo da principal pelo setor de maior vazão (BOM-safe) ────

  const maxSectorFlow = Math.max(...vazaoPorSetor.filter((v) => v > 0));
  const principalTube = selectPrincipalTube(maxSectorFlow);
  const pipeDiam = principalTube.diametroMm;       // nominal — exibição/BOM
  const pipeCoefC = principalTube.coefC;
  const pipeInternoMm = internoMm(principalTube);  // interno — cálculo HW

  if (pipeInternoMm === pipeDiam) {
    warnings.push(
      "Diâmetro interno ausente no catálogo; cálculo hidráulico usa diâmetro nominal como aproximação. " +
      "hf pode estar subestimado — usar curvas do fabricante para dimensionamento definitivo.",
    );
  }

  // ── 2. Normalizar direção da principal (entrada da adutora = arc 0) ─────────

  const adutoraLen = adutoraLengthM > 0 ? adutoraLengthM : 0;

  let principal = principalCoords;
  if (adutoraCoords.length >= 2) {
    const adEnd = adutoraCoords[adutoraCoords.length - 1];
    const dToStart = distM2D(adEnd, principalCoords[0], mpl);
    const dToEnd   = distM2D(adEnd, principalCoords[principalCoords.length - 1], mpl);
    if (dToEnd < dToStart) principal = [...principalCoords].reverse();
  }

  // ── 3. Índices de consulta rápida ────────────────────────────────────────────

  // ── P4: Dimensionamento individual dos ramais ───────────────────────────────
  // Vazão de projeto = max lateral flow por coluna (design flow).
  // O solver usa a vazão real do setor ativo para cálculo de HMT.
  const sizedSecondaries = sizeAllSecondaries(secondaries, laterais);
  const sizedSecByColId = new Map(sizedSecondaries.map((s) => [s.physicalColumnId, s]));

  const physColById      = new Map(physical.physicalColumns.map((c) => [c.id, c]));
  const secondaryByColId = new Map(secondaries.map((s) => [s.physicalColumnId, s]));
  const lateralByKey     = new Map(laterais.map((l) => [`${l.physicalColumnId}:${l.sectorId}`, l]));

  // ── 4. Varredura exaustiva: todos os setores × todos os segmentos ─────────────

  interface EnrichedSeg {
    seg: (typeof operationalSegments)[0];
    arcLength: number;
    lateral: (typeof laterais)[0] | undefined;
    secondary: (typeof secondaries)[0] | undefined;
    cumPrincipalHfM: number;
  }

  interface SectorResult {
    sectorId: number;
    sectorFlow: number;
    adutoraHf: number;
    enriched: EnrichedSeg[];
    principalSubSegs: HydraulicSegment[];
    subSegCountAtDerivation: number[];
    secondarySegs: HydraulicSegment[];
    lateralSegs: HydraulicSegment[];
    critIdx: number;
    maxPathHf: number;
  }

  let globalBest: SectorResult | null = null;

  for (let s = 0; s < nSetores; s++) {
    const sFlow = vazaoPorSetor[s];
    if (sFlow <= 0) continue;

    const sOperSegs = operationalSegments.filter((seg) => seg.sectorId === s);
    if (sOperSegs.length === 0) continue;

    // Adutora HF para este setor (vazão real quando ele opera)
    const adutoraHf = adutoraLen > 0 ? headLoss(sFlow, adutoraLen, pipeInternoMm, pipeCoefC) : 0;

    // Enriquecer com arc-lengths e lookup de lateral/ramal
    const sEnriched: EnrichedSeg[] = sOperSegs.map((seg) => {
      const col = physColById.get(seg.physicalColumnId);
      let inletCoord: [number, number] = principal[0];
      if (col) {
        const dStart = distToPolyline(col.startLngLat, principal, mpl);
        const dEnd   = distToPolyline(col.endLngLat,   principal, mpl);
        inletCoord = dStart <= dEnd ? col.startLngLat : col.endLngLat;
      }
      return {
        seg,
        arcLength: arcLengthOnPolyline(inletCoord, principal, mpl),
        lateral: lateralByKey.get(`${seg.physicalColumnId}:${seg.sectorId}`),
        secondary: secondaryByColId.get(seg.physicalColumnId),
        cumPrincipalHfM: 0,
      };
    });
    sEnriched.sort((a, b) => a.arcLength - b.arcLength);

    // Modelo de vazão decrescente na principal para este setor
    const sPrincipalSubSegs: HydraulicSegment[] = [];
    const subSegCount = new Array<number>(sEnriched.length).fill(0);
    let remainFlow = sFlow;
    let prevArc = 0;
    let cumHf = 0;
    let pushCount = 0;

    for (let i = 0; i < sEnriched.length; i++) {
      const { arcLength } = sEnriched[i];
      const subLen = arcLength - prevArc;
      if (subLen > 0.1 && remainFlow > 1e-6) {
        const hf  = headLoss(remainFlow, subLen, pipeInternoMm, pipeCoefC);
        const vel = velocity(remainFlow, pipeInternoMm);
        sPrincipalSubSegs.push({
          id: `principal-${s}-${i}`,
          type: "principal",
          lengthM: subLen,
          diametroMm: pipeDiam,
          internalDiameterMm: pipeInternoMm,
          coefC: pipeCoefC,
          flowM3h: remainFlow,
          headLossM: hf,
          velocityMs: vel,
          velocityExceeds: vel > MAX_VEL_PRINCIPAL_MS,
          pressaoNominalMca: principalTube.pressaoMca,
        });
        cumHf += hf;
        pushCount++;
      }
      sEnriched[i].cumPrincipalHfM = cumHf;
      subSegCount[i] = pushCount;
      remainFlow -= sEnriched[i].seg.vazaoM3h;
      if (remainFlow < 0) remainFlow = 0;
      prevArc = arcLength;
    }

    // Avaliar ramais e laterais; encontrar melhor derivação neste setor
    const sSecSegs: HydraulicSegment[] = [];
    const sLatSegs: HydraulicSegment[] = [];
    let localCritIdx = 0;
    let localMaxHf = -Infinity;

    for (let i = 0; i < sEnriched.length; i++) {
      const { seg, secondary, lateral, cumPrincipalHfM } = sEnriched[i];

      // Ramal — tubo pré-dimensionado individualmente; hf com vazão real do setor
      let hfSec = 0;
      if (secondary && secondary.lengthM > 0) {
        const secFlow = lateral?.vazaoM3h ?? seg.vazaoM3h;

        const sizedSec = sizedSecByColId.get(seg.physicalColumnId);
        let secIntMm: number;
        let secTubeDiam: number;
        let secCoefC: number;
        let secPressaoNominalMca: number | undefined;

        if (sizedSec) {
          secIntMm = sizedSec.diametroInternoMm;
          secTubeDiam = sizedSec.diametroMm;
          secCoefC = sizedSec.selectedTube.coefC;
          secPressaoNominalMca = sizedSec.selectedTube.pressaoMca;
        } else {
          // Fallback: secondary sem lateral mapeada — usar seleção por velocidade
          const fb = selectPrincipalTube(secFlow, MAX_VEL_SECONDARY_MS);
          secIntMm = internoMm(fb);
          secTubeDiam = fb.diametroMm;
          secCoefC = fb.coefC;
          secPressaoNominalMca = fb.pressaoMca;
        }

        hfSec = headLoss(secFlow, secondary.lengthM, secIntMm, secCoefC);
        const velSec = velocity(secFlow, secIntMm);
        sSecSegs.push({
          id: `secondary-${seg.physicalColumnId}`,
          type: "secondary",
          physicalColumnId: seg.physicalColumnId,
          sectorId: seg.sectorId,
          lengthM: secondary.lengthM,
          diametroMm: secTubeDiam,
          internalDiameterMm: secIntMm,
          coefC: secCoefC,
          flowM3h: secFlow,
          headLossM: hfSec,
          velocityMs: velSec,
          velocityExceeds: velSec > MAX_VEL_SECONDARY_MS,
          secondaryLossExceeds: hfSec > ASPERSOR_PADRAO.pressaoServicoMca * MAX_SECONDARY_LOSS_FRACTION,
          pressaoNominalMca: secPressaoNominalMca,
          // TASK-004B: dados de derivação para pressão real (ver annotatePressureClass)
          cumPrincipalHfM,
          adutoraHfM: adutoraHf,
        });
      }

      // Lateral — recalcular hf com diâmetro interno + Christiansen F
      let hfLat = 0;
      if (lateral) {
        const latIntMm = internoMm(lateral.selecao.tubo);
        const F = christiansenF(lateral.sprinklerCount);
        hfLat = headLoss(lateral.vazaoM3h, lateral.comprimentoM, latIntMm, lateral.selecao.tubo.coefC) * F;
        const latVel = velocity(lateral.vazaoM3h, latIntMm);
        sLatSegs.push({
          id: `lateral-${seg.id}`,
          type: "lateral",
          physicalColumnId: seg.physicalColumnId,
          sectorId: seg.sectorId,
          operationalSegmentId: seg.id,
          lengthM: lateral.comprimentoM,
          diametroMm: lateral.selecao.tubo.diametroMm,  // nominal para exibição
          internalDiameterMm: latIntMm,
          coefC: lateral.selecao.tubo.coefC,
          flowM3h: lateral.vazaoM3h,
          headLossM: hfLat,
          velocityMs: latVel,
          velocityExceeds: latVel > MAX_VEL_LATERAL_MS,
          lateralLossExceeds: hfLat > ASPERSOR_PADRAO.pressaoServicoMca * MAX_LATERAL_LOSS_FRACTION,
          pressaoNominalMca: lateral.selecao.tubo.pressaoMca,
          // TASK-004B: dados de derivação para pressão real (ver annotatePressureClass)
          cumPrincipalHfM,
          adutoraHfM: adutoraHf,
        });
      }

      const pathHf = adutoraHf + cumPrincipalHfM + hfSec + hfLat;
      if (pathHf > localMaxHf) { localMaxHf = pathHf; localCritIdx = i; }
    }

    if (localMaxHf > (globalBest?.maxPathHf ?? -Infinity)) {
      globalBest = {
        sectorId: s,
        sectorFlow: sFlow,
        adutoraHf,
        enriched: sEnriched,
        principalSubSegs: sPrincipalSubSegs,
        subSegCountAtDerivation: subSegCount,
        secondarySegs: sSecSegs,
        lateralSegs: sLatSegs,
        critIdx: localCritIdx,
        maxPathHf: localMaxHf,
      };
    }
  }

  if (!globalBest) return null;

  // ── 5. Montar caminho crítico a partir do melhor setor/segmento ───────────────

  const { sectorId: critSectorId, sectorFlow: critSectorFlow } = globalBest;
  const critEnr  = globalBest.enriched[globalBest.critIdx];
  const critSeg  = critEnr.seg;

  // Segmento de adutora (com vazão do setor crítico)
  const adutoraSegment: HydraulicSegment = {
    id: "adutora",
    type: "adutora",
    lengthM: adutoraLen,
    diametroMm: pipeDiam,
    internalDiameterMm: pipeInternoMm,
    coefC: pipeCoefC,
    flowM3h: critSectorFlow,
    headLossM: globalBest.adutoraHf,
    velocityMs: velocity(critSectorFlow, pipeInternoMm),
    velocityExceeds: velocity(critSectorFlow, pipeInternoMm) > MAX_VEL_PRINCIPAL_MS,
    pressaoNominalMca: principalTube.pressaoMca,
  };

  // Sub-segmentos da principal até a derivação crítica (T4)
  const critPrincipalSubSegs = globalBest.principalSubSegs.slice(
    0,
    globalBest.subSegCountAtDerivation[globalBest.critIdx],
  );

  // Segmento sintético "principal até a derivação crítica"
  const critPrincipalSeg: HydraulicSegment = {
    id: "principal-to-critical",
    type: "principal",
    lengthM: critEnr.arcLength,
    diametroMm: pipeDiam,
    internalDiameterMm: pipeInternoMm,
    coefC: pipeCoefC,
    flowM3h: critSectorFlow,
    headLossM: critEnr.cumPrincipalHfM,
    velocityMs: velocity(critSectorFlow, pipeInternoMm),
    velocityExceeds: velocity(critSectorFlow, pipeInternoMm) > MAX_VEL_PRINCIPAL_MS,
  };

  const critSecSeg = globalBest.secondarySegs.find(
    (s) => s.physicalColumnId === critSeg.physicalColumnId,
  );
  const critLatSeg = globalBest.lateralSegs.find(
    (l) => l.physicalColumnId === critSeg.physicalColumnId && l.sectorId === critSeg.sectorId,
  );

  const critPathSegs: HydraulicSegment[] = [adutoraSegment, critPrincipalSeg];
  if (critSecSeg) critPathSegs.push(critSecSeg);
  if (critLatSeg) critPathSegs.push(critLatSeg);

  const criticalPath: CriticalPath = {
    criticalSectorId: critSectorId,
    criticalPhysicalColumnId: critSeg.physicalColumnId,
    criticalOperationalSegmentId: critSeg.id,
    criticalPathSegments: critPathSegs,
    criticalPrincipalSubSegments: critPrincipalSubSegs,
    totalCriticalLengthM: critPathSegs.reduce((s, x) => s + x.lengthM, 0),
    totalHeadLossM: critPathSegs.reduce((s, x) => s + x.headLossM, 0),
  };

  // ── 6. HMT (T6 perdas locais + T7 desnível) ──────────────────────────────────

  const hfAdutora  = globalBest.adutoraHf;
  const hfPrincipal = critEnr.cumPrincipalHfM;
  const hfSec      = critSecSeg?.headLossM ?? 0;
  const hfLat      = critLatSeg?.headLossM ?? 0;
  const distribHf  = hfAdutora + hfPrincipal + hfSec + hfLat;

  // Perdas locais (T6)
  const localLossesM = distribHf * localLossFactorPercent / 100;
  if (localLossFactorPercent === 0) {
    warnings.push(
      "Fator de perdas locais = 0 %. Recomenda-se acrescentar 10–15 % da perda distribuída " +
      "para tês, curvas e válvulas.",
    );
  }

  // Desnível (T7)
  const elevationDeltaM = result.layout.geodetic?.elevationDeltaMeters;
  const noElevationData = elevationDeltaM == null;
  if (noElevationData) {
    warnings.push(
      "Desnível não informado — assumido zero. " +
      "Informe geodetic.elevationDeltaMeters (positivo: captação abaixo da área) para HMT precisa.",
    );
  }

  const rawDesnivel = noElevationData ? 0 : elevationDeltaM;
  const rawTotal    = ASPERSOR_PADRAO.pressaoServicoMca + distribHf + localLossesM + rawDesnivel + safetyMarginMca;
  // Piso: desnível favorável não pode reduzir HMT abaixo de pressão + perdas locais + margem
  const hmtFloor    = ASPERSOR_PADRAO.pressaoServicoMca + localLossesM + safetyMarginMca;
  const totalHMT    = Math.max(rawTotal, hmtFloor);
  // desnível efetivo: quando sem dados = 0; quando com dados, back-derivado do totalHMT real
  const desnivelM   = noElevationData
    ? 0
    : totalHMT - ASPERSOR_PADRAO.pressaoServicoMca - distribHf - localLossesM - safetyMarginMca;

  const hmt: HMTBreakdown = {
    pressaoServicoMca: ASPERSOR_PADRAO.pressaoServicoMca,
    hfAdutoraM: hfAdutora,
    hfPrincipalToDerivationM: hfPrincipal,
    hfSecondaryM: hfSec,
    hfLateralM: hfLat,
    desnivelM,
    localLossesM,
    safetyMarginM: safetyMarginMca,
    totalHMT,
    noElevationData,
  };

  // ── 7. allSegments (setor globalmente crítico) + anotação de PN ──────────────

  const rawAllSegs: HydraulicSegment[] = [
    adutoraSegment,
    ...globalBest.principalSubSegs,
    ...globalBest.secondarySegs,
    ...globalBest.lateralSegs,
  ];
  const allSegs = annotatePressureClass(rawAllSegs, hmt.totalHMT);

  // ── 8. Validação dos segmentos ────────────────────────────────────────────────

  const hasPressureClassViolations = allSegs.some(
    (s) => s.pressureClassCheck === "violation_confirmed",
  );
  const hasConservativePressureClassWarnings = allSegs.some(
    (s) => s.pressureClassCheck === "violation_conservative",
  );

  const invalidSegs = allSegs.filter(
    (s) =>
      s.velocityExceeds ||
      s.lateralLossExceeds === true ||
      s.secondaryLossExceeds === true ||
      s.pressureClassCheck === "violation_confirmed",
  );
  const hasVelocity    = invalidSegs.some((s) => s.velocityExceeds);
  const hasLatLoss     = invalidSegs.some((s) => s.lateralLossExceeds === true);
  const hasSecLoss     = invalidSegs.some((s) => s.secondaryLossExceeds === true);

  if (hasVelocity) {
    warnings.push(
      `${invalidSegs.filter((s) => s.velocityExceeds).length} segmento(s) com velocidade acima do limite. ` +
      "Revisar diâmetros antes da emissão.",
    );
  }
  if (hasLatLoss) {
    warnings.push(
      `${invalidSegs.filter((s) => s.lateralLossExceeds).length} lateral(is) com perda > 20% da pressão de serviço. ` +
      "Revisar comprimento ou diâmetro das laterais.",
    );
  }
  if (hasSecLoss) {
    warnings.push(
      `${invalidSegs.filter((s) => s.secondaryLossExceeds).length} ramal(is) com perda de carga > 10% da pressão de serviço. ` +
      "Revisar comprimento ou diâmetro dos ramais.",
    );
  }
  if (hasPressureClassViolations) {
    const violated = allSegs.filter((s) => s.pressureClassCheck === "violation_confirmed");
    warnings.push(
      `${violated.length} trecho(s) com pressão operacional acima do PN do tubo (violação confirmada). ` +
      "Substituir tubo por classe de pressão superior antes da emissão.",
    );
  }
  if (hasConservativePressureClassWarnings) {
    const warned = allSegs.filter((s) => s.pressureClassCheck === "violation_conservative");
    warnings.push(
      `${warned.length} trecho(s) com pressão máxima conservadora (HMT) pode exceder o PN. ` +
      "Validar pressão real no ponto de derivação antes da emissão.",
    );
  }

  const validation: HydraulicValidation = {
    invalidSegments: invalidSegs,
    hasVelocityViolations: hasVelocity,
    hasLateralLossViolations: hasLatLoss,
    hasSecondaryLossViolations: hasSecLoss,
    hasPressureClassViolations,
    hasConservativePressureClassWarnings,
    allGatesPass: invalidSegs.length === 0,
  };

  // ── 9. Validação da bomba ─────────────────────────────────────────────────────

  const pumpValidation = validatePump(result.layout.pump, maxSectorFlow, hmt.totalHMT);

  if (pumpValidation.status === "pump_insufficient_flow") {
    warnings.push(
      `Bomba insuficiente: vazão máxima da bomba ` +
      `(${pumpValidation.pump!.vazaoMaxM3h.toFixed(1)} m³/h) ` +
      `< setor crítico (${maxSectorFlow.toFixed(1)} m³/h).`,
    );
  } else if (pumpValidation.status === "pump_insufficient_head") {
    warnings.push(
      `Bomba insuficiente: HMT da bomba ` +
      `(${pumpValidation.pump!.hmtMca.toFixed(1)} mca) ` +
      `< HMT mínima requerida (${hmt.totalHMT.toFixed(1)} mca).`,
    );
  } else if (pumpValidation.status === "not_informed") {
    warnings.push(
      "Sistema calcula HMT mínima requerida. " +
      "A bomba ainda deve ser selecionada ou validada contra curva Q-H.",
    );
  }

  // ── 10. Status e limitações do modelo ────────────────────────────────────────

  let status: HydraulicStatus;
  let hydraulicSolverStatus: HydraulicSolverStatus;

  if (!validation.allGatesPass) {
    status = "blocked_invalid_segments";
    hydraulicSolverStatus = "blocked";
  } else if (
    pumpValidation.status === "pump_insufficient_flow" ||
    pumpValidation.status === "pump_insufficient_head"
  ) {
    status = "technical_review_required";
    hydraulicSolverStatus = "blocked";
  } else if (pumpValidation.status === "not_informed") {
    status = "technical_review_required";
    hydraulicSolverStatus = "calculated_pending_review";
  } else {
    status = "hydraulic_precheck_ok";
    hydraulicSolverStatus = "validated";
  }

  const hasInternalDiams = TUBOS_PVC_RIGIDO.every((t) => t.diametroInternoMm != null);
  const modelLimitations: HydraulicModelLimitations = {
    principalFlowModel: "single_diameter_decreasing_flow",
    secondarySizingModel: "individual_velocity_and_headloss_checked",
    lateralLossModel: "hazen_williams_christiansen_f",
    localLossesModel: localLossFactorPercent > 0 ? "percent_estimate" : "neglected",
    elevationModel: "waterSource_elevation_only",
    diameterAssumption: hasInternalDiams ? "internal" : "nominal_fallback",
    criticalPathModel: "exhaustive",
    // TASK-004B: detectado dinamicamente — `"exact_per_derivation"` quando todos os
    // ramais/laterais carregam `cumPrincipalHfM` E `adutoraHfM`.
    pressureClassModel: derivePressureClassModel(allSegs),
  };

  return {
    operationMode: "one_sector_at_a_time",
    criticalPath,
    hmt,
    validation,
    pumpValidation,
    modelLimitations,
    status,
    hydraulicSolverStatus,
    warnings,
    allSegments: allSegs,
    sizedSecondaries,
  };
}
