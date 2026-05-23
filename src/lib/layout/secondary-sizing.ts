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
 * Dimensiona todos os ramais (TASK-053 v6 — 3 paths kind-aware).
 *
 * Paths de dimensionamento:
 *   - **Path 0 (`kind === undefined`)** — caminho legado preservado byte-a-byte.
 *     Vazão = `max(lateral.vazaoM3h)` sobre `physicalColumnIds ?? [physicalColumnId]`.
 *     Cobre: ramal individual 1:1 (TASK-046), coluna isolada com fallback legado,
 *     sub-coletor v3 stair-step (multi-coluna sem `gridAngleDegrees`).
 *   - **Path 1 (`kind === "rib"`)** — vazão = `max(lateral.vazaoM3h)` da coluna em
 *     `physicalColumnIds[0]` (1 coluna por rib).
 *   - **Path 2 (`kind === "spine" || "spine_entry"`)** — vazão = `SUM` das vazões das
 *     ribs no mesmo `sectorId` (TASK-052 — operação rotativa: todas ribs do setor
 *     ativas simultaneamente quando o setor está rotacionando).
 *
 * Pass 1 (loop A): processa Path 0 e Path 1 + agrega vazão por setor em `flowSumBySectorId`.
 * Pass 2 (loop B): processa Path 2 consultando o mapa de soma.
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
  // Design flow por coluna = max lateral flow em todos os setores (operação rotativa — TASK-052)
  const maxFlowByColId = new Map<string, number>();
  for (const lat of laterais) {
    const prev = maxFlowByColId.get(lat.physicalColumnId) ?? 0;
    maxFlowByColId.set(lat.physicalColumnId, Math.max(prev, lat.vazaoM3h));
  }

  const sorted = [...candidatePipes].sort((a, b) => a.diametroMm - b.diametroMm);
  const smallest = sorted[0] ?? candidatePipes[0];

  // ── helper interno: aplica selectSecondaryPipe ou retorna fallback de smallest ──
  const buildSized = (sec: SecondaryPipe, flowM3h: number): SizedSecondaryPipe => {
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
  };

  // ── Pass 1: Path 0 (legado) + Path 1 (rib); soma vazões por sectorId ──
  // Pre-aloca o array final mantendo a ordem original; preenche slot a slot.
  const sized: (SizedSecondaryPipe | null)[] = new Array(secondaries.length).fill(null);
  const flowSumBySectorId = new Map<number, number>();

  for (let i = 0; i < secondaries.length; i++) {
    const sec = secondaries[i];
    if (sec.kind === "spine" || sec.kind === "spine_entry") {
      // Path 2 — adiado para Pass 2 (depende da soma dos ribs)
      continue;
    }
    // Path 0 (kind === undefined) ou Path 1 (kind === "rib"):
    // ambos usam max(lateral.vazaoM3h) sobre as colunas servidas.
    // Para spine/spine_entry físicos do v6, physicalColumnIds === []  → flowM3h = 0
    // (impossível alcançar aqui pois já desviamos acima).
    const colIds = sec.physicalColumnIds ?? [sec.physicalColumnId];
    let flowM3h = 0;
    for (const colId of colIds) {
      const v = maxFlowByColId.get(colId) ?? 0;
      if (v > flowM3h) flowM3h = v;
    }
    sized[i] = buildSized(sec, flowM3h);

    // Para ribs com sectorId, agregar para Pass 2.
    if (sec.kind === "rib" && sec.sectorId != null) {
      const prev = flowSumBySectorId.get(sec.sectorId) ?? 0;
      flowSumBySectorId.set(sec.sectorId, prev + flowM3h);
    }
  }

  // ── Pass 2: Path 2 (spine + spine_entry) — vazão = SUM ribs no sectorId ──
  for (let i = 0; i < secondaries.length; i++) {
    const sec = secondaries[i];
    if (sec.kind !== "spine" && sec.kind !== "spine_entry") continue;
    const flowM3h = sec.sectorId != null
      ? (flowSumBySectorId.get(sec.sectorId) ?? 0)
      : 0;
    sized[i] = buildSized(sec, flowM3h);
  }

  return sized as SizedSecondaryPipe[];
}
