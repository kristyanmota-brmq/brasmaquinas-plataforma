/**
 * Dimensionamento individual de ramais/secundárias.
 *
 * Cada ramal é dimensionado com:
 *   - critério de velocidade (diâmetro interno, ≤ 1,5 m/s)
 *   - critério de perda de carga (Hazen-Williams, diâmetro interno)
 * O menor tubo que satisfaz ambos é selecionado.
 * Se nenhum tubo passar: usa o maior disponível e reporta a violação.
 *
 * Vazão de projeto = máxima vazão lateral na coluna física (design flow, cobertura de todos os setores).
 * Hf de operação = calculado com vazão real do setor ativo (no solver hidráulico).
 */

import { headLoss, velocity, type TuboCandidato } from "@/lib/hydraulics/hazenWilliams";
import { TUBOS_PVC_RIGIDO } from "@/lib/catalog/aspersores";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";
import type { Lateral } from "@/lib/layout/laterais";

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_MAX_VEL_MS = 1.5;
/** 10 % da pressão de serviço do aspersor padrão (30 mca). */
const DEFAULT_MAX_HF_MCA = 3.0;

// ── Public types ───────────────────────────────────────────────────────────────

/** Estado do dimensionamento de um ramal individual. */
export type SecondaryStatus =
  | "ok"                 // menor tubo válido encontrado — ambos os critérios passam
  | "velocity_exceeded"  // fallback ao maior; velocidade ainda excede o limite
  | "headloss_exceeded"  // fallback ao maior; hf ainda excede o limite
  | "both_exceeded"      // fallback ao maior; ambos os limites excedidos
  | "fallback_largest";  // fallback ao maior sem violação de critério explícita (catch-all)

/** Ramal dimensionado individualmente. Estende SecondaryPipe com dados hidráulicos. */
export interface SizedSecondaryPipe extends SecondaryPipe {
  /** Vazão de projeto (m³/h) — max lateral flow desta coluna física. */
  flowM3h: number;
  selectedTube: TuboCandidato;
  /** Diâmetro nominal/comercial (mm) — para BOM e exibição. */
  diametroMm: number;
  /** Diâmetro interno real (mm) — usado no cálculo de HW e velocidade. */
  diametroInternoMm: number;
  velocityMs: number;
  headLossMca: number;
  velocityExceeds: boolean;
  headLossExceeds: boolean;
  status: SecondaryStatus;
}

export interface SelectSecondaryPipeInput {
  flowM3h: number;
  lengthM: number;
  candidatePipes: readonly TuboCandidato[];
  maxVelocityMs: number;
  /** Se ausente, perda de carga não é critério de seleção. */
  maxHeadLossMca?: number;
  /** Pressão nominal mínima (mca). Candidatos abaixo são descartados. */
  pressureClassRequirement?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function internoMm(tube: TuboCandidato): number {
  return tube.diametroInternoMm ?? tube.diametroMm;
}

function evalTube(
  tube: TuboCandidato,
  flowM3h: number,
  lengthM: number,
): { vel: number; hf: number } {
  const intMm = internoMm(tube);
  const vel = flowM3h > 0 ? velocity(flowM3h, intMm) : 0;
  const hf = flowM3h > 0 && lengthM > 0 ? headLoss(flowM3h, lengthM, intMm, tube.coefC) : 0;
  return { vel, hf };
}

function buildResult(
  tube: TuboCandidato,
  vel: number,
  hf: number,
  maxVelocityMs: number,
  maxHeadLossMca: number | undefined,
  status: SecondaryStatus,
): ReturnType<typeof selectSecondaryPipe> {
  const velExceeds = vel > maxVelocityMs;
  const hfExceeds = maxHeadLossMca != null && hf > maxHeadLossMca;
  return {
    selectedTube: tube,
    velocityMs: vel,
    headLossMca: hf,
    velocityExceeds: velExceeds,
    headLossExceeds: hfExceeds,
    status,
  };
}

// ── Core selection ─────────────────────────────────────────────────────────────

/**
 * Seleciona o menor tubo do catálogo que satisfaz velocidade e perda de carga.
 * Velocidade e HW são calculados com diâmetro interno real.
 *
 * @returns O tubo selecionado e suas métricas hidráulicas.
 */
export function selectSecondaryPipe(input: SelectSecondaryPipeInput): {
  selectedTube: TuboCandidato;
  velocityMs: number;
  headLossMca: number;
  velocityExceeds: boolean;
  headLossExceeds: boolean;
  status: SecondaryStatus;
} {
  const { flowM3h, lengthM, candidatePipes, maxVelocityMs, maxHeadLossMca, pressureClassRequirement } = input;

  let candidates = [...candidatePipes];

  if (pressureClassRequirement != null) {
    const filtered = candidates.filter((t) => t.pressaoMca >= pressureClassRequirement);
    if (filtered.length > 0) candidates = filtered;
  }

  candidates.sort((a, b) => a.diametroMm - b.diametroMm);

  if (candidates.length === 0) {
    const fallback = [...candidatePipes].sort((a, b) => b.diametroMm - a.diametroMm)[0];
    if (!fallback) throw new Error("selectSecondaryPipe: candidatePipes está vazio");
    const { vel, hf } = evalTube(fallback, flowM3h, lengthM);
    return buildResult(fallback, vel, hf, maxVelocityMs, maxHeadLossMca, "fallback_largest");
  }

  for (const tube of candidates) {
    const { vel, hf } = evalTube(tube, flowM3h, lengthM);
    const velOk = vel <= maxVelocityMs;
    const hfOk = maxHeadLossMca == null || hf <= maxHeadLossMca;
    if (velOk && hfOk) {
      return buildResult(tube, vel, hf, maxVelocityMs, maxHeadLossMca, "ok");
    }
  }

  // Nenhum tubo passou: usar o maior disponível
  const largest = candidates[candidates.length - 1];
  const { vel, hf } = evalTube(largest, flowM3h, lengthM);
  const velExceeds = vel > maxVelocityMs;
  const hfExceeds = maxHeadLossMca != null && hf > maxHeadLossMca;

  let status: SecondaryStatus;
  if (velExceeds && hfExceeds) status = "both_exceeded";
  else if (velExceeds) status = "velocity_exceeded";
  else if (hfExceeds) status = "headloss_exceeded";
  else status = "fallback_largest";

  return buildResult(largest, vel, hf, maxVelocityMs, maxHeadLossMca, status);
}

// ── Batch sizing ───────────────────────────────────────────────────────────────

/**
 * Dimensiona todos os ramais individualmente.
 *
 * Vazão de projeto de cada ramal = máxima vazão lateral na coluna física
 * (cobre todos os setores em que a coluna opera).
 *
 * @param secondaries  Ramais gerados por generateSecondaries().
 * @param laterais     Laterais derivadas pela rede (todas as laterais do projeto).
 * @param candidatePipes  Catálogo de tubos candidatos (padrão: TUBOS_PVC_RIGIDO).
 * @param maxVelocityMs   Limite de velocidade (padrão: 1,5 m/s).
 * @param maxHeadLossMca  Limite de perda de carga (padrão: 3,0 mca = 10 % × 30 mca).
 */
export function sizeAllSecondaries(
  secondaries: SecondaryPipe[],
  laterais: Lateral[],
  candidatePipes: readonly TuboCandidato[] = TUBOS_PVC_RIGIDO as readonly TuboCandidato[],
  maxVelocityMs: number = DEFAULT_MAX_VEL_MS,
  maxHeadLossMca: number = DEFAULT_MAX_HF_MCA,
): SizedSecondaryPipe[] {
  // Design flow por coluna = max lateral flow em todos os setores
  const maxFlowByColId = new Map<string, number>();
  for (const lat of laterais) {
    const prev = maxFlowByColId.get(lat.physicalColumnId) ?? 0;
    maxFlowByColId.set(lat.physicalColumnId, Math.max(prev, lat.vazaoM3h));
  }

  const sorted = [...candidatePipes].sort((a, b) => a.diametroMm - b.diametroMm);
  const smallest = sorted[0] ?? candidatePipes[0];

  return secondaries.map((sec): SizedSecondaryPipe => {
    const flowM3h = maxFlowByColId.get(sec.physicalColumnId) ?? 0;

    if (flowM3h <= 0 || sec.lengthM <= 0) {
      const tube = smallest;
      return {
        ...sec,
        flowM3h,
        selectedTube: tube,
        diametroMm: tube.diametroMm,
        diametroInternoMm: internoMm(tube),
        velocityMs: 0,
        headLossMca: 0,
        velocityExceeds: false,
        headLossExceeds: false,
        status: "ok",
      };
    }

    const result = selectSecondaryPipe({
      flowM3h,
      lengthM: sec.lengthM,
      candidatePipes,
      maxVelocityMs,
      maxHeadLossMca,
    });

    return {
      ...sec,
      flowM3h,
      selectedTube: result.selectedTube,
      diametroMm: result.selectedTube.diametroMm,
      diametroInternoMm: internoMm(result.selectedTube),
      velocityMs: result.velocityMs,
      headLossMca: result.headLossMca,
      velocityExceeds: result.velocityExceeds,
      headLossExceeds: result.headLossExceeds,
      status: result.status,
    };
  });
}
