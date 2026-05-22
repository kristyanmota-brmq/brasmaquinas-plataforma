/**
 * TASK-043 — Motor de seleção arquitetural da principal/ramais por menor BOM
 * estimada preliminar tecnicamente válida e operacionalmente executável.
 *
 * Decisão registrada na ADR-015.
 *
 * Função objetivo: BOM estimada preliminar (custo R$).
 * Restrições duras: hidráulica (velocidade, perda de carga em ramais) + ADRs 010-014.
 *
 * IMPORTANTE: A "BOM estimada preliminar" calculada aqui não é a BOM oficial do projeto.
 * A BOM oficial continua sendo gerada por `buildBOM()` em `src/lib/bom.ts` sobre o
 * resultado do solver hidráulico oficial — após o motor escolher a arquitetura
 * vencedora. Esta BOM é apenas para COMPARAÇÃO entre candidatos.
 *
 * Candidatos avaliados no MVP:
 *   A0 — Baseline: principal na borda Y mais próxima da captação (comportamento atual).
 *   A2 — Borda otimizada: avalia `min` e `max` Y forçados e escolhe o de menor BOM.
 *   A3 — Central: principal no eixo Y central da malha; warning obrigatório
 *        "principal central atravessa área irrigada — validar operacional/RT".
 *
 * Pós-MVP (NÃO implementados): A1 externa, A4 espinha, A5 subprincipais,
 * A6 alimentação central, A7 orientação automática, A8 blocos hidráulicos.
 *
 * Critério L2 (vazão de projeto dos ramais): MANTÉM `max(setor)` atual via
 * `sizeAllSecondaries`. Não usar `max(setor_simultâneo)` para baratear BOM enquanto
 * a operação real Brasmáquinas não estiver validada pelo RT
 * (PENDENTE_REVISAO_RT_BRASMAQUINAS — ver docs/metodologia/12-premissas-...).
 */

import {
  generatePrincipalAndAdutora,
  type GeneratePrincipalOptions,
} from "./principal";
import { generateSecondaries, type SecondaryPipe } from "./hydraulic-connectivity";
import { sizeAllSecondaries, type SizedSecondaryPipe } from "./secondary-sizing";
import { detectNetworkAngleIssues } from "./network-angle-diagnostics";
import { TUBOS_PVC_RIGIDO } from "@/lib/catalog/aspersores";
import type { PhysicalColumn, Lateral } from "./laterais";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes — referências técnicas formalizadas em 12-premissas (TASK-043)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Limite de velocidade em ramal (m/s). Referência conservadora baseada em NRCS NEH
 * (≈ 5 ft/s = 1,524 m/s para tubulação plástica enterrada com válvulas).
 * Status: PENDENTE_REVISAO_RT_BRASMAQUINAS.
 */
export const MAX_VELOCITY_RAMAL_MS = 1.5;

/**
 * Limite de perda de carga em ramal (mca). Boa prática: ≤ 10% da pressão de
 * serviço do aspersor (30 mca → 3,0 mca). Status: PENDENTE_REVISAO_RT_BRASMAQUINAS.
 */
export const MAX_HEADLOSS_RAMAL_MCA = 3.0;

/**
 * Preço (R$/barra) do tubo PVC rígido Ø100mm PN80 — usado para estimar custo
 * de principal e adutora no MVP (ambas usam DN100 R PN80 hoje).
 */
const PRECO_TUBO_R_100_PN80 = (() => {
  const tube = TUBOS_PVC_RIGIDO.find((t) => t.diametroMm === 100);
  if (!tube) throw new Error("Catálogo inconsistente: TIGRE_R_100_PN80 não encontrado");
  return tube.precoVenda;
})();

const METROS_POR_BARRA = 6;

/**
 * Epsilon (R$) para comparação de BOM estimada preliminar.
 * Diferenças menores que este valor são consideradas empate.
 * Em empate, preferimos A0 (princípio "menor mudança").
 */
const EPSILON_BOM_R$ = 1.0;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export type ArchitectureCandidateId = "A0" | "A2" | "A3";

export interface ArchitectureCandidate {
  id: ArchitectureCandidateId;
  description: string;
  principal: [number, number][];
  adutora: [number, number][];
  principalLengthM: number;
  adutoraLengthM: number;
}

export interface CandidateEvaluation {
  candidate: ArchitectureCandidate;
  /** true se todas as restrições técnicas foram satisfeitas. */
  isValid: boolean;
  /** Motivo da invalidação (null quando válido). */
  invalidReason: string | null;
  /** Ramais gerados para este candidato. */
  secondaries: SecondaryPipe[];
  /** Ramais dimensionados por `sizeAllSecondaries` — usado também para auditoria. */
  sizedSecondariesPreview: SizedSecondaryPipe[];
  totalSecondaryLengthM: number;
  /** Custo estimado preliminar de tubos principal (R$). */
  bomPrincipal: number;
  /** Custo estimado preliminar de tubos adutora (R$). */
  bomAdutora: number;
  /** Custo estimado preliminar de tubos ramais (R$). */
  bomSecondaries: number;
  /**
   * BOM estimada preliminar deste candidato — soma de principal + adutora + ramais.
   * NÃO é a BOM oficial do projeto. Usada apenas para comparação entre candidatos.
   */
  bomEstimadaPreliminar: number;
  /** Proxies de construtibilidade — A3 sempre marca true. */
  principalCrossesArea: boolean;
  numPrincipalSegments: number;
  warnings: string[];
}

export type ArchitectureSelectionDecision =
  | "winner_reduces_bom"
  | "baseline_preserved"
  | "no_valid_candidate";

export interface ArchitectureSelectionResult {
  /** Identificador do candidato vencedor. */
  winner: ArchitectureCandidateId;
  winnerCandidate: ArchitectureCandidate;
  /** Todas as avaliações (válidas + inválidas) — para auditoria completa. */
  evaluations: CandidateEvaluation[];
  decision: ArchitectureSelectionDecision;
  /** Texto humano-legível com motivo da escolha. */
  reason: string;
  /**
   * Diferença estimada (R$) entre o vencedor e o baseline A0.
   * Negativo = vencedor reduz BOM vs. A0.
   * Zero = baseline preservado.
   */
  bomDeltaVsBaseline: number;
  warnings: string[];
}

export interface ArchitectureSelectorInput {
  waterSource: { lng: number; lat: number };
  physicalColumns: PhysicalColumn[];
  centroid: { lng: number; lat: number };
  gridAngleDegrees: number;
  /** Laterais — necessárias para `sizeAllSecondaries` calcular vazão de projeto por ramal. */
  laterais: Lateral[];
  /** Override do limite de velocidade em ramal. Default: MAX_VELOCITY_RAMAL_MS. */
  maxVelocityRamalMs?: number;
  /** Override do limite de perda em ramal. Default: MAX_HEADLOSS_RAMAL_MCA. */
  maxHeadlossRamalMca?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;

function lngLatDistM(a: [number, number], b: [number, number]): number {
  const mPerLng = M_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

function polylineLengthM(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  return coords.slice(1).reduce((s, pt, i) => s + lngLatDistM(coords[i], pt), 0);
}

function priceByDn(diametroMm: number): number {
  const tube = TUBOS_PVC_RIGIDO.find((t) => t.diametroMm === diametroMm);
  return tube?.precoVenda ?? 0;
}

function buildCandidate(
  id: ArchitectureCandidateId,
  description: string,
  waterSource: { lng: number; lat: number },
  physicalColumns: PhysicalColumn[],
  centroid: { lng: number; lat: number },
  gridAngleDegrees: number,
  options?: GeneratePrincipalOptions,
): ArchitectureCandidate {
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource,
    physicalColumns,
    centroid,
    gridAngleDegrees,
    options,
  );
  return {
    id,
    description,
    principal,
    adutora,
    principalLengthM: polylineLengthM(principal),
    adutoraLengthM: polylineLengthM(adutora),
  };
}

function evaluateCandidate(
  candidate: ArchitectureCandidate,
  physicalColumns: PhysicalColumn[],
  centroid: { lng: number; lat: number },
  laterais: Lateral[],
  maxVelocityRamalMs: number,
  maxHeadlossRamalMca: number,
): CandidateEvaluation {
  // Gerar ramais com base na principal deste candidato.
  const secondaries = generateSecondaries(physicalColumns, candidate.principal, centroid);

  // Dimensionar ramais (preview — não substitui o solver oficial).
  // Critério L2 conservador: sizeAllSecondaries usa max(lateral.vazaoM3h) por coluna.
  const sizedSecondaries = sizeAllSecondaries(
    secondaries,
    laterais,
    TUBOS_PVC_RIGIDO as unknown as Parameters<typeof sizeAllSecondaries>[2],
    maxVelocityRamalMs,
    maxHeadlossRamalMca,
  );

  // Verificar invariantes técnicas: nenhum ramal pode exceder velocidade ou perda
  // mesmo com o maior DN disponível.
  let invalidReason: string | null = null;
  const violatingRamais = sizedSecondaries.filter(
    (s) => s.velocityExceeds || s.headLossExceeds,
  );
  if (violatingRamais.length > 0) {
    const maxVel = Math.max(...violatingRamais.map((s) => s.velocityMs));
    const maxHf = Math.max(...violatingRamais.map((s) => s.headLossMca));
    invalidReason =
      `${violatingRamais.length} ramal(is) excedem limites hidráulicos ` +
      `(velocidade máx: ${maxVel.toFixed(2)} m/s vs. limite ${maxVelocityRamalMs.toFixed(1)}; ` +
      `perda máx: ${maxHf.toFixed(2)} mca vs. limite ${maxHeadlossRamalMca.toFixed(1)})`;
  }

  // TASK-045: restrição dura adicional — construtibilidade angular (ADR-010).
  // Candidato com blockers angulares (junções fora de 0°/90° na rede interna) é
  // marcado inválido — independente da hidráulica. Usa estrutura completa do fluxo
  // real (principal + adutora + ramais + physicalColumns com routeCoords) para
  // evitar falso positivo/negativo diferente do produzido pelo solver oficial.
  // O detector NÃO é alterado; ele apenas vira gate adicional no motor de seleção.
  if (invalidReason === null) {
    const angleReport = detectNetworkAngleIssues({
      principalCoords: candidate.principal,
      adutoraCoords: candidate.adutora,
      secondaries,
      physicalColumns,
      centroid,
    });
    if (angleReport.hasBlockers) {
      const blockerIssues = angleReport.issues.filter((i) => i.severity === "blocker");
      const inLateral = blockerIssues.filter((i) => i.elementType === "lateral").length;
      const inSecondary = blockerIssues.filter((i) => i.elementType === "secondary").length;
      const inPrincipal = blockerIssues.filter((i) => i.elementType === "principal").length;
      const parts: string[] = [];
      if (inLateral > 0) parts.push(`${inLateral} em lateral`);
      if (inSecondary > 0) parts.push(`${inSecondary} em ramal`);
      if (inPrincipal > 0) parts.push(`${inPrincipal} em principal`);
      invalidReason =
        `${blockerIssues.length} junção(ões) com ângulo fora de 0°/90° na rede interna ` +
        `(${parts.join(", ")}). ADR-010 — rede interna apenas 0°/90°.`;
    }
  }

  // Estimativa preliminar de BOM (DIFERENCIAL — apenas itens que mudam entre candidatos).
  // Principal e adutora usam DN100 R PN80 (comportamento atual do solver).
  const bomPrincipal =
    Math.ceil(candidate.principalLengthM / METROS_POR_BARRA) * PRECO_TUBO_R_100_PN80;
  const bomAdutora =
    Math.ceil(candidate.adutoraLengthM / METROS_POR_BARRA) * PRECO_TUBO_R_100_PN80;

  // Ramais: somar por SKU agrupado por DN. Para BOM preliminar diferencial,
  // calculamos custo direto por barra (ceil(length/6) × preço(DN)).
  // Nota: na BOM oficial, agrupamento por SKU consolida; aqui calculamos
  // por ramal e somamos — pequena imprecisão (até ~5 barras extras) aceita
  // como overhead de comparação preliminar.
  const bomSecondaries = sizedSecondaries.reduce(
    (sum, s) =>
      sum + Math.ceil(s.lengthM / METROS_POR_BARRA) * priceByDn(s.diametroMm),
    0,
  );

  const totalSecondaryLengthM = sizedSecondaries.reduce((s, r) => s + r.lengthM, 0);
  const bomEstimadaPreliminar = bomPrincipal + bomAdutora + bomSecondaries;

  // Proxies de construtibilidade.
  const principalCrossesArea = candidate.id === "A3";
  const warnings: string[] = [];
  if (principalCrossesArea) {
    warnings.push(
      "principal central atravessa área irrigada — validar construtibilidade operacional/RT",
    );
  }

  return {
    candidate,
    isValid: invalidReason === null,
    invalidReason,
    secondaries,
    sizedSecondariesPreview: sizedSecondaries,
    totalSecondaryLengthM,
    bomPrincipal,
    bomAdutora,
    bomSecondaries,
    bomEstimadaPreliminar,
    principalCrossesArea,
    numPrincipalSegments: Math.max(0, candidate.principal.length - 1),
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Avalia candidatos arquiteturais (A0/A2/A3) e escolhe o de menor BOM estimada
 * preliminar tecnicamente válida e operacionalmente executável.
 *
 * A0 é o baseline atual (compatível com `generatePrincipalAndAdutora` sem options).
 * A2 avalia ambos os lados Y forçados e escolhe o de menor BOM entre eles.
 * A3 usa eixo Y central da malha (com warning obrigatório de cruzamento).
 *
 * Em empate (< R$ 1,00 de diferença), prefere A0 (princípio "menor mudança").
 *
 * Quando nenhum candidato é válido (caso patológico defensivo), retorna A0 com
 * decision="no_valid_candidate" e a UI/orquestrador deve sinalizar o problema
 * via diagnóstico normal (blockers técnicos vindos do solver oficial).
 */
export function selectArchitectureByBom(
  input: ArchitectureSelectorInput,
): ArchitectureSelectionResult {
  const {
    waterSource,
    physicalColumns,
    centroid,
    gridAngleDegrees,
    laterais,
    maxVelocityRamalMs = MAX_VELOCITY_RAMAL_MS,
    maxHeadlossRamalMca = MAX_HEADLOSS_RAMAL_MCA,
  } = input;

  // Caso degenerado: sem colunas, não há o que selecionar. Retorna A0 puro.
  if (physicalColumns.length === 0) {
    const a0 = buildCandidate(
      "A0",
      "Baseline: principal na borda Y mais próxima da captação",
      waterSource,
      physicalColumns,
      centroid,
      gridAngleDegrees,
    );
    const evalA0 = evaluateCandidate(
      a0,
      physicalColumns,
      centroid,
      laterais,
      maxVelocityRamalMs,
      maxHeadlossRamalMca,
    );
    return {
      winner: "A0",
      winnerCandidate: a0,
      evaluations: [evalA0],
      decision: "baseline_preserved",
      reason: "Nenhuma coluna física — A0 é único candidato.",
      bomDeltaVsBaseline: 0,
      warnings: [],
    };
  }

  // Gerar candidatos.
  const a0 = buildCandidate(
    "A0",
    "Baseline: principal na borda Y mais próxima da captação",
    waterSource,
    physicalColumns,
    centroid,
    gridAngleDegrees,
  );

  // A2: avaliar min e max forçados; escolher o de menor BOM.
  const a2Min = buildCandidate(
    "A2",
    "Borda otimizada: principal na borda Y forçada (min)",
    waterSource,
    physicalColumns,
    centroid,
    gridAngleDegrees,
    { forceSide: "min" },
  );
  const a2Max = buildCandidate(
    "A2",
    "Borda otimizada: principal na borda Y forçada (max)",
    waterSource,
    physicalColumns,
    centroid,
    gridAngleDegrees,
    { forceSide: "max" },
  );

  const a3 = buildCandidate(
    "A3",
    "Central: principal no eixo Y central da malha",
    waterSource,
    physicalColumns,
    centroid,
    gridAngleDegrees,
    { centralMode: true },
  );

  // Avaliar todos.
  const evalA0 = evaluateCandidate(a0, physicalColumns, centroid, laterais, maxVelocityRamalMs, maxHeadlossRamalMca);
  const evalA2Min = evaluateCandidate(a2Min, physicalColumns, centroid, laterais, maxVelocityRamalMs, maxHeadlossRamalMca);
  const evalA2Max = evaluateCandidate(a2Max, physicalColumns, centroid, laterais, maxVelocityRamalMs, maxHeadlossRamalMca);
  const evalA3 = evaluateCandidate(a3, physicalColumns, centroid, laterais, maxVelocityRamalMs, maxHeadlossRamalMca);

  // Dentre as variantes de A2 (min/max), escolher a de menor BOM válida.
  // Se ambas inválidas, manter a de menor BOM mesmo assim (para diagnóstico).
  let evalA2: CandidateEvaluation;
  if (evalA2Min.isValid && !evalA2Max.isValid) {
    evalA2 = evalA2Min;
  } else if (!evalA2Min.isValid && evalA2Max.isValid) {
    evalA2 = evalA2Max;
  } else {
    evalA2 = evalA2Min.bomEstimadaPreliminar <= evalA2Max.bomEstimadaPreliminar ? evalA2Min : evalA2Max;
  }

  const evaluations: CandidateEvaluation[] = [evalA0, evalA2, evalA3];
  const validEvals = evaluations.filter((e) => e.isValid);

  // Caso patológico: nenhum válido — fallback defensivo para A0.
  if (validEvals.length === 0) {
    return {
      winner: "A0",
      winnerCandidate: evalA0.candidate,
      evaluations,
      decision: "no_valid_candidate",
      reason:
        "Nenhum candidato satisfez as restrições técnicas (velocidade ≤ " +
        `${maxVelocityRamalMs.toFixed(1)} m/s, perda ≤ ${maxHeadlossRamalMca.toFixed(1)} mca). ` +
        "Mantendo A0 como fallback — diagnóstico de bloqueio virá do solver oficial.",
      bomDeltaVsBaseline: 0,
      warnings: evalA0.warnings,
    };
  }

  // Função objetivo: menor BOM estimada preliminar entre os válidos.
  // Empate (< EPSILON_BOM_R$) prefere A0 (princípio "menor mudança").
  validEvals.sort((a, b) => a.bomEstimadaPreliminar - b.bomEstimadaPreliminar);
  const minBom = validEvals[0].bomEstimadaPreliminar;
  const tied = validEvals.filter(
    (e) => Math.abs(e.bomEstimadaPreliminar - minBom) < EPSILON_BOM_R$,
  );
  const winnerEval = tied.find((e) => e.candidate.id === "A0") ?? tied[0];

  const bomDeltaVsBaseline = winnerEval.bomEstimadaPreliminar - evalA0.bomEstimadaPreliminar;

  let decision: ArchitectureSelectionDecision;
  let reason: string;
  if (winnerEval.candidate.id === "A0") {
    decision = "baseline_preserved";
    const a2Bom = evalA2.bomEstimadaPreliminar.toFixed(2);
    const a3Bom = evalA3.bomEstimadaPreliminar.toFixed(2);
    const a0Bom = evalA0.bomEstimadaPreliminar.toFixed(2);
    reason =
      `Baseline (A0) preservado por ter a menor BOM estimada preliminar entre os candidatos válidos. ` +
      `A0=R$ ${a0Bom}; A2=R$ ${a2Bom}; A3=R$ ${a3Bom}. ` +
      `BOM diferencial (apenas tubos principal/adutora/ramais — não é BOM oficial).`;
  } else {
    decision = "winner_reduces_bom";
    const economia = Math.abs(bomDeltaVsBaseline).toFixed(2);
    reason =
      `Candidato ${winnerEval.candidate.id} escolhido por ter menor BOM estimada preliminar ` +
      `(economia diferencial vs. A0: R$ ${economia}). ` +
      `Restrições técnicas preservadas (velocidade ≤ ${maxVelocityRamalMs.toFixed(1)} m/s; ` +
      `perda ≤ ${maxHeadlossRamalMca.toFixed(1)} mca em todos os ramais). ` +
      `BOM final será gerada por buildBOM() sobre o solver oficial.`;
  }

  return {
    winner: winnerEval.candidate.id,
    winnerCandidate: winnerEval.candidate,
    evaluations,
    decision,
    reason,
    bomDeltaVsBaseline,
    warnings: winnerEval.warnings,
  };
}
