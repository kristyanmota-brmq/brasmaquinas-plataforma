/**
 * Motor geométrico-operacional de candidatos de layout 12×12.
 *
 * Gera e compara múltiplos candidatos de disposição da malha de aspersores
 * variando ângulo e offset X/Y. Quando `nSetores` é fornecido, inclui
 * métricas operacionais de setorização (registros de seção, fragmentação,
 * desbalanceamento de vazão).
 *
 * Escopo desta versão (TASK-010E-B):
 *   ✅  Métricas geométricas: fillingRatio, shortColumnRatio, edgeQualityScore
 *   ✅  Métricas operacionais: sectionValveCount, fragmentedLateralRatio,
 *       operationalSegmentsCount, fragmentedColumnCount, maxSegmentsPerColumn,
 *       desbalanceamentoPercent — disponíveis quando nSetores é válido
 *   ✅  Métricas de comprimento de laterais: totalLateralLengthM, avgLateralLengthM,
 *       maxLateralLengthM, lateralLengthPerSprinklerM, lateralLengthPerHectareM
 *   ✅  Métricas de rede de distribuição: principalLengthM, adutoraLengthM,
 *       secondaryLengthM, totalNetworkLengthM, avgSecondaryLengthM,
 *       maxSecondaryLengthM — disponíveis quando waterSource é fornecido
 *       (comprimentos geométricos preliminares — não substituem hidráulica nem BOM)
 *   ❌  hydraulicBlockers — PENDENTE: requer solver hidráulico
 *   ❌  Topografia — PENDENTE
 *
 * waterSource é parâmetro opcional. Quando ausente, métricas de rede ficam null.
 * O motor não chama solver hidráulico nem BOM.
 * Pesos de rede: PREMISSA_PROVISORIA_MERCADO — ver docs/metodologia/12-premissas-provisorias-e-revisao-rt.md
 * Todas as métricas são PRELIMINARES — não substituem validação hidráulica de campo.
 */

import * as turf from "@turf/turf";
import {
  findOptimalGridAngle,
  generateRotatedSprinklerGridWithOffset,
} from "@/lib/layout/sprinkler-grid";
import {
  generatePhysicalColumns,
  type PhysicalColumn,
} from "@/lib/layout/laterais";
import { buildSectorsByFlowWithColumnSplitting } from "@/lib/layout/sectorization";
import { generatePrincipalAndAdutora } from "@/lib/layout/principal";
import { generateSecondaries } from "@/lib/layout/hydraulic-connectivity";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de validação hidráulica (Top K)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status da avaliação hidráulica de um candidato de layout via solver oficial.
 * null = avaliação ainda não executada (estado inicial de todos os candidatos).
 */
export type HydraulicEvaluationStatus =
  | "not_evaluated_missing_waterSource"
  | "not_evaluated_missing_pump"
  | "not_evaluated_missing_sectorization"
  | "not_evaluated_not_in_top_k"
  | "not_evaluated_solver_error"
  | "evaluated_no_blockers"
  | "evaluated_has_blockers";

/** Blocker real do solver oficial — não é estimativa própria do motor. */
export interface HydraulicBlockerReal {
  /** Origem do blocker: string de diagnostics.blockers do solver oficial. */
  source: "diagnostics_blocker";
  message: string;
}

/** Opções para runTopKHydraulicValidation. */
export interface TopKHydraulicOptions {
  polygon: GeoJSON.Polygon;
  spacingMeters: number;
  waterSource: { lng: number; lat: number } | null | undefined;
  pump: { hmtMca: number; vazaoMaxM3h: number } | null | undefined;
  geodetic?: { distanceSourceToAreaMeters?: number; elevationDeltaMeters?: number } | null;
  nSetores?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de calibração
// Todos os valores abaixo são PENDENTE_CALIBRACAO_RT_CAMPO.
// Não usar como limites técnicos definitivos sem validação de campo.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parâmetros do motor geométrico.
 * Exportado para que testes possam verificar a existência e documentação dos
 * limites pendentes de calibração.
 *
 * TODOS os valores são PENDENTE_CALIBRACAO_RT_CAMPO.
 */
export const OPTIMIZER_PARAMS = {
  /** Colunas com menos aspersores que este limiar são penalizadas no score. */
  N_MIN_COLUMN: 3,
  /** Número de vizinhos angulares testados em cada direção do ângulo ótimo. */
  N_ANGLE_NEIGHBORS: 3,
  /** Passo em graus entre ângulos candidatos. */
  ANGLE_STEP_DEG: 3,
  /** Número de valores de offset testados por eixo (X e Y). */
  N_OFFSET_STEPS: 4,
  /** Peso da penalidade de colunas curtas no score total. PENDENTE_CALIBRACAO_RT_CAMPO */
  WEIGHT_SHORT_COLUMN: 0.5,
  /** Peso da penalidade de borda no score total. PENDENTE_CALIBRACAO_RT_CAMPO */
  WEIGHT_EDGE: 0.3,
  /**
   * Peso da penalidade de registros de seção (sectionValveCount / nCols).
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  WEIGHT_SECTION_VALVE: 0.3,
  /**
   * Peso da penalidade de fragmentação de laterais (fragmentedLateralRatio ∈ [0,1]).
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  WEIGHT_FRAGMENTATION: 0.4,
  /**
   * Peso da penalidade de desbalanceamento de vazão entre setores
   * (desbalanceamentoPercent / 100, normalizado para [0,1]).
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  WEIGHT_IMBALANCE: 0.2,
  /**
   * Peso da penalidade de comprimento de laterais.
   * Atualmente INATIVO (0) — normalização pendente de calibração com dados de campo.
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  WEIGHT_LATERAL_LENGTH: 0,
  /**
   * Peso da penalidade de comprimento de ramais/secundárias (secondaryLengthM / totalLateralLengthM).
   * PREMISSA_PROVISORIA_MERCADO — 0,10 baseado em heurística de redes de irrigação convencionais
   * onde ramais excessivos indicam layout desfavorável à distribuição.
   * PENDENTE_REVISAO_RT_BRASMAQUINAS | PENDENTE_REVISAO_CAMPO_BRASMAQUINAS
   * Ver docs/metodologia/12-premissas-provisorias-e-revisao-rt.md
   */
  WEIGHT_SECONDARY_LENGTH: 0.10,
  /**
   * Peso da penalidade de comprimento total de distribuição relativo às laterais.
   * distributionLengthRatio = (principalLengthM + adutoraLengthM + secondaryLengthM)
   *                           / max(totalLateralLengthM, 1)
   * PREMISSA_PROVISORIA_MERCADO — 0,10 baseado em heurística de que comprimento de
   * distribuição superior ao de laterais indica layout penalizante.
   * PENDENTE_REVISAO_RT_BRASMAQUINAS | PENDENTE_REVISAO_CAMPO_BRASMAQUINAS
   * Ver docs/metodologia/12-premissas-provisorias-e-revisao-rt.md
   */
  WEIGHT_TOTAL_NETWORK_LENGTH: 0.10,
  /**
   * Número máximo de candidatos que recebem validação hidráulica via solver oficial
   * em `runTopKHydraulicValidation`. Motor geométrico avalia todos os candidatos;
   * apenas os melhores por score geométrico recebem o solver completo.
   * PREMISSA_PROVISORIA_MERCADO — 5 baseado em heurística de balancear cobertura
   * vs. custo computacional.
   * PENDENTE_REVISAO_RT_BRASMAQUINAS | PENDENTE_REVISAO_CAMPO_BRASMAQUINAS
   * Ver docs/metodologia/12-premissas-provisorias-e-revisao-rt.md
   */
  TOP_K_HYDRAULIC_CANDIDATES: 5,
  /**
   * Penalidade no score de candidatos com blockers reais do solver oficial.
   * Aplicada apenas quando `hydraulicBlockers.length > 0` no resultado de
   * `runTopKHydraulicValidation`. Blocker do solver oficial é critério significativo
   * de eliminação — penalidade deliberadamente alta.
   * PREMISSA_PROVISORIA_MERCADO
   * PENDENTE_REVISAO_RT_BRASMAQUINAS | PENDENTE_REVISAO_CAMPO_BRASMAQUINAS
   * Ver docs/metodologia/12-premissas-provisorias-e-revisao-rt.md
   */
  WEIGHT_HYDRAULIC_BLOCKER: 0.50,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export interface LayoutScore {
  /** Score combinado (maior = geometricamente melhor). */
  total: number;
  /** Aspersores gerados / máximo teórico (área / spacing²). */
  fillingRatio: number;
  sprinklerCount: number;
  physicalColumnCount: number;
  avgSprinklersPerColumn: number;
  /** Colunas com menos de N_MIN_COLUMN aspersores. */
  shortColumnCount: number;
  /** shortColumnCount / physicalColumnCount. */
  shortColumnRatio: number;
  /**
   * Razão entre aspersores médios nas colunas de borda (primeira e última por X)
   * e nas colunas internas.  1,0 = bordas tão preenchidas quanto o interior.
   * Heurística — PENDENTE_CALIBRACAO_RT_CAMPO.
   */
  edgeQualityScore: number;
  /**
   * Penalidade de borda = 1 - edgeQualityScore.
   * 0 = bordas perfeitas; 1 = bordas completamente vazias.
   * PENDENTE_CALIBRACAO_RT_CAMPO.
   */
  edgePenalty: number;

  // ── Métricas operacionais de setorização (disponíveis quando nSetores é válido) ──
  /**
   * Número de segmentos operacionais totais entre todos os setores.
   * null quando nSetores não fornecido ou inválido.
   * Preliminar — não substitui validação hidráulica. PENDENTE_CALIBRACAO_RT_CAMPO
   */
  operationalSegmentsCount: number | null;
  /**
   * Registros de seção necessários: segmentos com requiresValveOrControlPoint = true.
   * null quando nSetores não fornecido ou inválido.
   * Preliminar — não substitui validação hidráulica. PENDENTE_CALIBRACAO_RT_CAMPO
   */
  sectionValveCount: number | null;
  /**
   * Número de colunas físicas divididas entre mais de um setor.
   * null quando nSetores não fornecido ou inválido.
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  fragmentedColumnCount: number | null;
  /**
   * fragmentedColumnCount / physicalColumnCount.
   * null quando nSetores não fornecido ou inválido.
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  fragmentedLateralRatio: number | null;
  /**
   * Número máximo de segmentos operacionais em uma única coluna física.
   * null quando nSetores não fornecido ou inválido.
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  maxSegmentsPerColumn: number | null;
  /**
   * (maxVazão - minVazão) / médiaVazão × 100 entre setores.
   * null quando nSetores não fornecido ou inválido.
   * PENDENTE_CALIBRACAO_RT_CAMPO
   */
  desbalanceamentoPercent: number | null;

  // ── Métricas de comprimento de laterais (geométricas puras) ─────────────
  // Calculadas de physicalColumns.comprimentoM — sem solver, sem waterSource.
  // NÃO incluem principal, adutora nem ramais até captação.
  // Ramais/secundárias dependem de waterSource e principalCoords → TASK-010E-B.
  // PENDENTE_CALIBRACAO_RT_CAMPO — preliminares.
  /** Soma de comprimentoM de todas as colunas físicas (metro de tubo lateral total). */
  totalLateralLengthM: number;
  /** Comprimento médio de coluna física (totalLateralLengthM / physicalColumnCount). */
  avgLateralLengthM: number;
  /** Comprimento da coluna física mais longa. */
  maxLateralLengthM: number;
  /** totalLateralLengthM / sprinklerCount — metro de lateral por aspersor. */
  lateralLengthPerSprinklerM: number;
  /**
   * totalLateralLengthM / (área_ha) — metro de lateral por hectare irrigado.
   * Permite comparar layouts em áreas de tamanhos diferentes.
   */
  lateralLengthPerHectareM: number;

  // ── Métricas de rede de distribuição (geométricas preliminares) ─────────
  // Disponíveis quando waterSource é fornecido a findBestSprinklerLayout.
  // Calculadas via generatePrincipalAndAdutora() + generateSecondaries() — sem solver.
  // NÃO substituem hidráulica, BOM ou validação técnica.
  // Penalidades: PREMISSA_PROVISORIA_MERCADO — ver docs/metodologia/12-premissas-provisorias-e-revisao-rt.md
  /** Comprimento da polyline da tubulação principal. null quando sem captação. */
  principalLengthM: number | null;
  /** Comprimento do segmento adutora (captação → entrada da principal). null quando sem captação. */
  adutoraLengthM: number | null;
  /**
   * Soma dos comprimentos de todos os ramais/secundárias gerados (SecondaryPipe.lengthM).
   * null quando sem captação.
   */
  secondaryLengthM: number | null;
  /**
   * Comprimento total de rede de distribuição:
   * totalLateralLengthM + principalLengthM + adutoraLengthM + secondaryLengthM.
   * null quando sem captação.
   */
  totalNetworkLengthM: number | null;
  /** secondaryLengthM / nRamais. null quando sem captação ou sem ramais. */
  avgSecondaryLengthM: number | null;
  /** Comprimento do ramal mais longo. null quando sem captação. */
  maxSecondaryLengthM: number | null;
  /**
   * (principalLengthM + adutoraLengthM + secondaryLengthM) / max(totalLateralLengthM, 1).
   * Razão entre rede de distribuição e laterais — normalização da penalidade.
   * null quando sem captação. PREMISSA_PROVISORIA_MERCADO.
   */
  distributionLengthRatio: number | null;

  // ── Métricas de validação hidráulica Top K (via solver oficial) ─────────
  // Preenchidas por runTopKHydraulicValidation — não pelo motor geométrico.
  // null = avaliação ainda não executada.
  /** Blockers reais do solver oficial. null = não avaliado. [] = avaliado, sem blockers. */
  hydraulicBlockers: HydraulicBlockerReal[] | null;
  /** Status da avaliação hidráulica para este candidato. null = não avaliado. */
  hydraulicEvaluationStatus: HydraulicEvaluationStatus | null;
  /** HMT necessária calculada pelo solver oficial (mca). null = não avaliado. */
  hydraulicHmtRequiredMca: number | null;
  /** Número de segmentos hidráulicos inválidos. null = não avaliado. */
  hydraulicInvalidSegmentsCount: number | null;
}

export interface LayoutCandidate {
  angleDegrees: number;
  /** Deslocamento X da grade no frame local rotacionado (metros). */
  offsetXm: number;
  /** Deslocamento Y da grade no frame local rotacionado (metros). */
  offsetYm: number;
  /** Posições dos aspersores em [lng, lat]. */
  positions: [number, number][];
  /** Colunas físicas derivadas das posições (sem setorização). */
  physicalColumns: PhysicalColumn[];
  score: LayoutScore;
}

export interface LayoutSelectionResult {
  /** Candidato geometricamente melhor pelo score atual. Não homologado como layout técnico final. */
  best: LayoutCandidate;
  /** Todos os candidatos avaliados, ordenados por score.total decrescente. */
  candidates: LayoutCandidate[];
  /** Explicação textual de por que o candidato foi escolhido. */
  selectionReason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementação interna
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida se nSetores é utilizável para setorização de um candidato com
 * `sprinklerCount` aspersores. Retorna o valor validado ou null.
 */
function validateNSetores(
  nSetores: number | null | undefined,
  sprinklerCount: number,
): number | null {
  if (
    nSetores == null ||
    !Number.isInteger(nSetores) ||
    nSetores <= 0 ||
    nSetores > sprinklerCount
  ) {
    return null;
  }
  return nSetores;
}

function computeScore(
  positions: [number, number][],
  polygon: GeoJSON.Polygon,
  physicalColumns: PhysicalColumn[],
  spacingMeters: number,
  nSetores: number | null,
  waterSource: { lng: number; lat: number } | null,
  centroid: { lng: number; lat: number },
  angleDegrees: number,
): LayoutScore {
  const NULL = null as null;

  if (positions.length === 0) {
    return {
      total: -Infinity,
      fillingRatio: 0,
      sprinklerCount: 0,
      physicalColumnCount: 0,
      avgSprinklersPerColumn: 0,
      shortColumnCount: 0,
      shortColumnRatio: 0,
      edgeQualityScore: 0,
      edgePenalty: 1,
      operationalSegmentsCount: NULL,
      sectionValveCount: NULL,
      fragmentedColumnCount: NULL,
      fragmentedLateralRatio: NULL,
      maxSegmentsPerColumn: NULL,
      desbalanceamentoPercent: NULL,
      totalLateralLengthM: 0,
      avgLateralLengthM: 0,
      maxLateralLengthM: 0,
      lateralLengthPerSprinklerM: 0,
      lateralLengthPerHectareM: 0,
      principalLengthM: NULL,
      adutoraLengthM: NULL,
      secondaryLengthM: NULL,
      totalNetworkLengthM: NULL,
      avgSecondaryLengthM: NULL,
      maxSecondaryLengthM: NULL,
      distributionLengthRatio: NULL,
      hydraulicBlockers: NULL,
      hydraulicEvaluationStatus: NULL,
      hydraulicHmtRequiredMca: NULL,
      hydraulicInvalidSegmentsCount: NULL,
    };
  }

  const areaM2 = turf.area(turf.polygon(polygon.coordinates));
  const theoreticalMax = areaM2 / (spacingMeters * spacingMeters);
  const fillingRatio = theoreticalMax > 0 ? positions.length / theoreticalMax : 0;

  const nCols = physicalColumns.length;
  const {
    N_MIN_COLUMN,
    WEIGHT_SHORT_COLUMN,
    WEIGHT_EDGE,
    WEIGHT_SECTION_VALVE,
    WEIGHT_FRAGMENTATION,
    WEIGHT_IMBALANCE,
    WEIGHT_SECONDARY_LENGTH,
    WEIGHT_TOTAL_NETWORK_LENGTH,
  } = OPTIMIZER_PARAMS;
  const shortColumns = physicalColumns.filter((c) => c.sprinklerCount < N_MIN_COLUMN);
  const shortColumnCount = shortColumns.length;
  const shortColumnRatio = nCols > 0 ? shortColumnCount / nCols : 0;
  const avgSprinklersPerColumn = nCols > 0 ? positions.length / nCols : 0;

  // ── Métrica de borda (PENDENTE_CALIBRACAO_RT_CAMPO) ──────────────────────
  // Razão entre a média de aspersores nas colunas de borda e nas colunas internas.
  // Limitação: com gap-splits, os índices 0 e nCols-1 podem não ser os mais externos.
  let edgeQualityScore = 1;
  if (nCols >= 3) {
    const edgeAvg =
      (physicalColumns[0].sprinklerCount + physicalColumns[nCols - 1].sprinklerCount) / 2;
    const innerCols = physicalColumns.slice(1, -1);
    const innerAvg =
      innerCols.reduce((s, c) => s + c.sprinklerCount, 0) / innerCols.length;
    edgeQualityScore = innerAvg > 0 ? Math.min(1, edgeAvg / innerAvg) : 1;
  }
  const edgePenalty = 1 - edgeQualityScore;

  // ── Métricas de comprimento de laterais ─────────────────────────────────
  // Geométricas puras: derivadas de physicalColumns.comprimentoM, sem waterSource.
  // NÃO incluem principal, adutora nem ramais até captação (TASK-010E-B).
  // PENDENTE_CALIBRACAO_RT_CAMPO — peso WEIGHT_LATERAL_LENGTH atualmente inativo (0).
  const totalLateralLengthM = physicalColumns.reduce((s, c) => s + c.comprimentoM, 0);
  const avgLateralLengthM = nCols > 0 ? totalLateralLengthM / nCols : 0;
  const maxLateralLengthM = nCols > 0 ? Math.max(...physicalColumns.map((c) => c.comprimentoM)) : 0;
  const lateralLengthPerSprinklerM = positions.length > 0 ? totalLateralLengthM / positions.length : 0;
  const areaHa = areaM2 / 10000;
  const lateralLengthPerHectareM = areaHa > 0 ? totalLateralLengthM / areaHa : 0;

  // ── Métricas operacionais de setorização ─────────────────────────────────
  // Calculadas apenas quando nSetores é inteiro > 0 e ≤ sprinklerCount.
  // PENDENTE_CALIBRACAO_RT_CAMPO — preliminares; não substituem validação hidráulica.
  let operationalSegmentsCount: number | null = NULL;
  let sectionValveCount: number | null = NULL;
  let fragmentedColumnCount: number | null = NULL;
  let fragmentedLateralRatio: number | null = NULL;
  let maxSegmentsPerColumn: number | null = NULL;
  let desbalanceamentoPercent: number | null = NULL;
  let operationalPenalty = 0;

  const effectiveN = validateNSetores(nSetores, positions.length);
  if (effectiveN !== null) {
    const sect = buildSectorsByFlowWithColumnSplitting(
      physicalColumns,
      effectiveN,
      ASPERSOR_PADRAO.vazaoM3PorHora,
      positions.length,
    );

    sectionValveCount = sect.operationalSegments.filter(
      (s) => s.requiresValveOrControlPoint,
    ).length;
    fragmentedColumnCount = sect.physicalColumnsSplitCount;
    fragmentedLateralRatio = nCols > 0 ? sect.physicalColumnsSplitCount / nCols : 0;
    operationalSegmentsCount = sect.operationalSegments.length;
    desbalanceamentoPercent = sect.desbalanceamentoPercent;

    const segCountByCol = new Map<string, number>();
    for (const seg of sect.operationalSegments) {
      segCountByCol.set(seg.physicalColumnId, (segCountByCol.get(seg.physicalColumnId) ?? 0) + 1);
    }
    maxSegmentsPerColumn = segCountByCol.size > 0 ? Math.max(...segCountByCol.values()) : 0;

    operationalPenalty =
      WEIGHT_SECTION_VALVE * (nCols > 0 ? sectionValveCount / nCols : 0)
      + WEIGHT_FRAGMENTATION * fragmentedLateralRatio
      + WEIGHT_IMBALANCE * (desbalanceamentoPercent / 100);
  }

  // ── Métricas de rede de distribuição ────────────────────────────────────
  // Calculadas apenas quando waterSource é fornecido.
  // Usa generatePrincipalAndAdutora (geométrico puro) + generateSecondaries.
  // Penalidades: PREMISSA_PROVISORIA_MERCADO — ver 12-premissas-provisorias-e-revisao-rt.md
  let principalLengthM: number | null = NULL;
  let adutoraLengthM: number | null = NULL;
  let secondaryLengthM: number | null = NULL;
  let totalNetworkLengthM: number | null = NULL;
  let avgSecondaryLengthM: number | null = NULL;
  let maxSecondaryLengthM: number | null = NULL;
  let distributionLengthRatio: number | null = NULL;
  let distributionPenalty = 0;

  if (waterSource !== null) {
    try {
      const { principal, adutora } = generatePrincipalAndAdutora(
        waterSource,
        physicalColumns,
        centroid,
        angleDegrees,
      );
      const secondaries = generateSecondaries(physicalColumns, principal, centroid);

      principalLengthM = principal.length >= 2
        ? turf.length(turf.lineString(principal), { units: "meters" })
        : 0;
      adutoraLengthM = adutora.length >= 2
        ? turf.length(turf.lineString(adutora), { units: "meters" })
        : 0;
      secondaryLengthM = secondaries.reduce((s, r) => s + r.lengthM, 0);
      totalNetworkLengthM = totalLateralLengthM + principalLengthM + adutoraLengthM + secondaryLengthM;
      avgSecondaryLengthM = secondaries.length > 0 ? secondaryLengthM / secondaries.length : 0;
      maxSecondaryLengthM = secondaries.length > 0 ? Math.max(...secondaries.map((r) => r.lengthM)) : 0;

      // Normalização da penalidade: razão rede de distribuição / laterais.
      // Quanto mais a distribuição excede as laterais, maior a penalidade.
      // PREMISSA_PROVISORIA_MERCADO — valor de referência (razão 1,0) sem dado de campo.
      distributionLengthRatio =
        (principalLengthM + adutoraLengthM + secondaryLengthM) / Math.max(totalLateralLengthM, 1);

      distributionPenalty =
        WEIGHT_SECONDARY_LENGTH * Math.min(secondaryLengthM / Math.max(totalLateralLengthM, 1), 1)
        + WEIGHT_TOTAL_NETWORK_LENGTH * Math.min(distributionLengthRatio, 1);
    } catch {
      // Falha silenciosa — captação inválida para este candidato; métricas permanecem null.
    }
  }

  const total =
    fillingRatio
    - WEIGHT_SHORT_COLUMN * shortColumnRatio
    - WEIGHT_EDGE * edgePenalty
    - operationalPenalty
    - distributionPenalty;

  return {
    total,
    fillingRatio,
    sprinklerCount: positions.length,
    physicalColumnCount: nCols,
    avgSprinklersPerColumn,
    shortColumnCount,
    shortColumnRatio,
    edgeQualityScore,
    edgePenalty,
    operationalSegmentsCount,
    sectionValveCount,
    fragmentedColumnCount,
    fragmentedLateralRatio,
    maxSegmentsPerColumn,
    desbalanceamentoPercent,
    totalLateralLengthM,
    avgLateralLengthM,
    maxLateralLengthM,
    lateralLengthPerSprinklerM,
    lateralLengthPerHectareM,
    principalLengthM,
    adutoraLengthM,
    secondaryLengthM,
    totalNetworkLengthM,
    avgSecondaryLengthM,
    maxSecondaryLengthM,
    distributionLengthRatio,
    hydraulicBlockers: NULL,
    hydraulicEvaluationStatus: NULL,
    hydraulicHmtRequiredMca: NULL,
    hydraulicInvalidSegmentsCount: NULL,
  };
}

function evaluateCandidate(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
  centroid: { lng: number; lat: number },
  angleDegrees: number,
  offsetXm: number,
  offsetYm: number,
  nSetores: number | null,
  waterSource: { lng: number; lat: number } | null,
): LayoutCandidate {
  const positions = generateRotatedSprinklerGridWithOffset(
    polygon,
    spacingMeters,
    angleDegrees,
    offsetXm,
    offsetYm,
  );

  const physicalColumns = generatePhysicalColumns(
    positions,
    angleDegrees,
    centroid,
    spacingMeters,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
    // Sem sectorIds — avaliação puramente geométrica
  );

  const score = computeScore(
    positions,
    polygon,
    physicalColumns,
    spacingMeters,
    nSetores,
    waterSource,
    centroid,
    angleDegrees,
  );

  return { angleDegrees, offsetXm, offsetYm, positions, physicalColumns, score };
}

function generateCandidateConfigs(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
): Array<{ angleDegrees: number; offsetXm: number; offsetYm: number }> {
  const { N_ANGLE_NEIGHBORS, ANGLE_STEP_DEG, N_OFFSET_STEPS } = OPTIMIZER_PARAMS;
  const optimalAngle = findOptimalGridAngle(polygon);

  const angles: number[] = [];
  for (let i = -N_ANGLE_NEIGHBORS; i <= N_ANGLE_NEIGHBORS; i++) {
    const a = optimalAngle + i * ANGLE_STEP_DEG;
    if (a >= 0 && a <= 89) angles.push(a);
  }
  if (angles.length === 0) angles.push(optimalAngle);

  const offsetStep = spacingMeters / N_OFFSET_STEPS;
  const offsets: number[] = [];
  for (let i = 0; i < N_OFFSET_STEPS; i++) {
    offsets.push(i * offsetStep);
  }

  const configs: Array<{ angleDegrees: number; offsetXm: number; offsetYm: number }> = [];
  for (const angle of angles) {
    for (const ox of offsets) {
      for (const oy of offsets) {
        configs.push({ angleDegrees: angle, offsetXm: ox, offsetYm: oy });
      }
    }
  }

  return configs;
}

function buildSelectionReason(
  best: LayoutCandidate,
  second: LayoutCandidate | null,
  opts?: { noElevationWarning?: boolean },
): string {
  const sc = best.score;
  const { N_MIN_COLUMN } = OPTIMIZER_PARAMS;

  const parts: string[] = [
    `Candidato geometricamente melhor entre os avaliados — não homologado como layout técnico final.`,
    `Ângulo ${best.angleDegrees}°, offset X=${best.offsetXm.toFixed(1)} m / Y=${best.offsetYm.toFixed(1)} m.`,
    `Aspersores: ${sc.sprinklerCount} (fillingRatio=${(sc.fillingRatio * 100).toFixed(0)}%).`,
    `Colunas físicas: ${sc.physicalColumnCount} | média ${sc.avgSprinklersPerColumn.toFixed(1)} asp./coluna.`,
    `Colunas curtas (<${N_MIN_COLUMN} asp.): ${sc.shortColumnCount}/${sc.physicalColumnCount} (${(sc.shortColumnRatio * 100).toFixed(0)}%). [PENDENTE_CALIBRACAO_RT_CAMPO]`,
    `Qualidade de borda: ${(sc.edgeQualityScore * 100).toFixed(0)}% (colunas de borda vs. média interna). [PENDENTE_CALIBRACAO_RT_CAMPO]`,
    `Comprimento de laterais: total ${sc.totalLateralLengthM.toFixed(0)} m` +
    ` | média ${sc.avgLateralLengthM.toFixed(0)} m/coluna` +
    ` | ${sc.lateralLengthPerSprinklerM.toFixed(1)} m/asp.` +
    ` | ${sc.lateralLengthPerHectareM.toFixed(0)} m/ha.` +
    ` Não inclui principal, adutora nem ramais até captação. [PENDENTE_CALIBRACAO_RT_CAMPO]`,
  ];

  if (sc.sectionValveCount !== null) {
    parts.push(
      `Métricas operacionais (preliminares — não substituem validação hidráulica):` +
      ` Segmentos operacionais: ${sc.operationalSegmentsCount}.` +
      ` Registros de seção: ${sc.sectionValveCount}.` +
      ` Colunas fragmentadas: ${sc.fragmentedColumnCount}/${sc.physicalColumnCount}` +
      ` (${(sc.fragmentedLateralRatio! * 100).toFixed(0)}%).` +
      ` Desbalanceamento de vazão: ${sc.desbalanceamentoPercent!.toFixed(1)}%.` +
      ` [PENDENTE_CALIBRACAO_RT_CAMPO]`,
    );
  } else {
    parts.push(
      `Métricas operacionais de setorização não calculadas —` +
      ` selecione uma jornada/setorização para incluir registros de seção e fragmentação no score.`,
    );
  }

  if (sc.secondaryLengthM !== null) {
    parts.push(
      `Rede de distribuição (preliminar — comprimentos geométricos, não substitui hidráulica):` +
      ` Principal: ${sc.principalLengthM!.toFixed(0)} m.` +
      ` Adutora: ${sc.adutoraLengthM!.toFixed(0)} m.` +
      ` Ramais/secundárias: ${sc.secondaryLengthM.toFixed(0)} m (média ${sc.avgSecondaryLengthM!.toFixed(0)} m, máx. ${sc.maxSecondaryLengthM!.toFixed(0)} m).` +
      ` Rede total: ${sc.totalNetworkLengthM!.toFixed(0)} m.` +
      ` Razão distribuição/laterais: ${sc.distributionLengthRatio!.toFixed(2)}.` +
      ` Penalidade usa PREMISSA_PROVISORIA_MERCADO — ver 12-premissas-provisorias-e-revisao-rt.md.`,
    );
  } else {
    parts.push(`Métricas de rede de distribuição não calculadas — defina a captação para incluir principal, adutora e ramais no score.`);
  }

  if (sc.hydraulicEvaluationStatus !== null) {
    if (sc.hydraulicEvaluationStatus === "evaluated_no_blockers") {
      parts.push(
        `Validação hidráulica (solver oficial — Top K candidatos): SEM blockers.` +
        ` HMT necessária: ${sc.hydraulicHmtRequiredMca !== null ? sc.hydraulicHmtRequiredMca.toFixed(1) + " mca" : "n/a"}.` +
        ` Segmentos inválidos: ${sc.hydraulicInvalidSegmentsCount ?? 0}.` +
        ` [PREMISSA_PROVISORIA_MERCADO]`,
      );
    } else if (sc.hydraulicEvaluationStatus === "evaluated_has_blockers") {
      const msgs = sc.hydraulicBlockers?.map((b) => b.message).join("; ") ?? "";
      parts.push(
        `Validação hidráulica (solver oficial — Top K candidatos): ${sc.hydraulicBlockers?.length ?? 0} blocker(s).` +
        ` ${msgs}.` +
        ` HMT necessária: ${sc.hydraulicHmtRequiredMca !== null ? sc.hydraulicHmtRequiredMca.toFixed(1) + " mca" : "n/a"}.` +
        ` Penalidade de score: -${OPTIMIZER_PARAMS.WEIGHT_HYDRAULIC_BLOCKER} (PREMISSA_PROVISORIA_MERCADO).`,
      );
    } else {
      parts.push(`Validação hidráulica: ${sc.hydraulicEvaluationStatus}.`);
    }
    if (opts?.noElevationWarning) {
      parts.push(`Avaliação hidráulica sem desnível informado.`);
    }
  }

  parts.push(`Score total: ${sc.total.toFixed(4)}.`);

  if (second) {
    parts.push(
      `Segundo melhor: ângulo ${second.angleDegrees}°, offset X=${second.offsetXm.toFixed(1)} m / Y=${second.offsetYm.toFixed(1)} m — score ${second.score.total.toFixed(4)}.`,
    );
  }

  return parts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o candidato melhor entre múltiplas variações de ângulo e offset X/Y
 * da grade 12×12, com relatório de justificativa.
 *
 * Espaço de busca (PENDENTE_CALIBRACAO_RT_CAMPO):
 *   - 7 ângulos ao redor do ângulo ótimo (step 3°)
 *   - 4 × 4 = 16 offsets por ângulo
 *   - Total: até 112 candidatos
 *
 * @param nSetores — número de setores da jornada operacional escolhida.
 *   Deve ser inteiro > 0 e ≤ sprinklerCount. Se ausente, nulo ou inválido,
 *   as métricas operacionais (sectionValveCount, fragmentedLateralRatio, etc.)
 *   ficam null e o score usa apenas critérios geométricos.
 *
 * @param nSetores — número de setores da jornada operacional. Opcional.
 * @param waterSource — captação do projeto. Opcional. Quando fornecido, inclui métricas
 *   de principal, adutora e ramais no score. Sem waterSource, essas métricas ficam null.
 *   Penalidades de rede: PREMISSA_PROVISORIA_MERCADO — ver 12-premissas-provisorias-e-revisao-rt.md.
 *
 * O motor não chama solver hidráulico nem BOM.
 * hydraulicBlockers permanece null (requer solver hidráulico).
 * Todos os resultados são PRELIMINARES — não substituem validação hidráulica de campo.
 *
 * @throws Error se nenhum candidato gerar posições válidas.
 */
export function findBestSprinklerLayout(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
  nSetores?: number | null,
  waterSource?: { lng: number; lat: number } | null,
): LayoutSelectionResult {
  const polyFeature = turf.polygon(polygon.coordinates);
  const centroidFeature = turf.centroid(polyFeature);
  const [lng, lat] = centroidFeature.geometry.coordinates;
  const centroid = { lng, lat };

  const effectiveN = nSetores ?? null;
  const effectiveWS = waterSource ?? null;
  const configs = generateCandidateConfigs(polygon, spacingMeters);

  const allCandidates = configs.map(({ angleDegrees, offsetXm, offsetYm }) =>
    evaluateCandidate(
      polygon,
      spacingMeters,
      centroid,
      angleDegrees,
      offsetXm,
      offsetYm,
      effectiveN,
      effectiveWS,
    ),
  );

  const candidates = allCandidates
    .filter((c) => isFinite(c.score.total))
    .sort((a, b) => b.score.total - a.score.total);

  if (candidates.length === 0) {
    throw new Error(
      "findBestSprinklerLayout: nenhum candidato válido gerado. " +
      "Verifique se o polígono tem área suficiente para o espaçamento fornecido.",
    );
  }

  const best = candidates[0];
  const second = candidates[1] ?? null;
  const selectionReason = buildSelectionReason(best, second);

  return { best, candidates, selectionReason };
}

/**
 * Executa validação hidráulica via solver oficial nos Top K candidatos do ranking geométrico.
 *
 * Fluxo de dois passos:
 *  1. `findBestSprinklerLayout` — ranking geométrico-operacional (todos os candidatos).
 *  2. `runTopKHydraulicValidation` — solver oficial apenas nos Top K melhores.
 *
 * O `best` retornado é sempre o melhor entre os candidatos Top K avaliados.
 * Candidatos fora do Top K NUNCA podem ser `best` após esta função.
 *
 * @param selectionResult — resultado de findBestSprinklerLayout (ranking geométrico).
 * @param options — polygon, spacingMeters, waterSource, pump, geodetic, nSetores.
 *
 * Pré-condições para avaliação:
 *   - waterSource deve estar presente → caso contrário: not_evaluated_missing_waterSource
 *   - pump deve estar presente → caso contrário: not_evaluated_missing_pump
 *   - nSetores deve ser válido → caso contrário: not_evaluated_missing_sectorization
 *
 * Sem desnível (geodetic ausente): avaliação não é bloqueada, mas selectionReason registra aviso.
 *
 * TOP_K_HYDRAULIC_CANDIDATES e WEIGHT_HYDRAULIC_BLOCKER: PREMISSA_PROVISORIA_MERCADO
 * Ver docs/metodologia/12-premissas-provisorias-e-revisao-rt.md
 */
export function runTopKHydraulicValidation(
  selectionResult: LayoutSelectionResult,
  options: TopKHydraulicOptions,
): LayoutSelectionResult {
  const { polygon, spacingMeters, waterSource, pump, geodetic, nSetores } = options;

  // ── Pré-condições ────────────────────────────────────────────────────────

  const earlyStatus: HydraulicEvaluationStatus | null =
    !waterSource ? "not_evaluated_missing_waterSource"
    : !pump ? "not_evaluated_missing_pump"
    : null;

  if (earlyStatus !== null) {
    const candidates = selectionResult.candidates.map((c) => ({
      ...c,
      score: { ...c.score, hydraulicEvaluationStatus: earlyStatus },
    }));
    return {
      ...selectionResult,
      candidates,
      best: candidates[0],
      selectionReason: buildSelectionReason(candidates[0], candidates[1] ?? null),
    };
  }

  const effectiveN =
    nSetores != null && Number.isInteger(nSetores) && nSetores > 0 ? nSetores : null;

  if (effectiveN === null) {
    const s: HydraulicEvaluationStatus = "not_evaluated_missing_sectorization";
    const candidates = selectionResult.candidates.map((c) => ({
      ...c,
      score: { ...c.score, hydraulicEvaluationStatus: s },
    }));
    return {
      ...selectionResult,
      candidates,
      best: candidates[0],
      selectionReason: buildSelectionReason(candidates[0], candidates[1] ?? null),
    };
  }

  // ── Centroide (idêntico ao de findBestSprinklerLayout) ───────────────────

  const polyFeature = turf.polygon(polygon.coordinates);
  const centroidFeature = turf.centroid(polyFeature);
  const [lng, lat] = centroidFeature.geometry.coordinates;
  const centroid = { lng, lat };

  const noElevationWarning = !geodetic?.elevationDeltaMeters;

  // ── Marcar todos os candidatos; Top K serão avaliados ────────────────────

  const { TOP_K_HYDRAULIC_CANDIDATES, WEIGHT_HYDRAULIC_BLOCKER } = OPTIMIZER_PARAMS;
  const topKCount = Math.min(TOP_K_HYDRAULIC_CANDIDATES, selectionResult.candidates.length);

  const evaluatedCandidates: LayoutCandidate[] = selectionResult.candidates.map((c, i) => ({
    ...c,
    score: {
      ...c.score,
      hydraulicEvaluationStatus:
        i < topKCount ? null : ("not_evaluated_not_in_top_k" as HydraulicEvaluationStatus),
    },
  }));

  // ── Avaliar cada candidato Top K com o solver oficial ────────────────────

  for (let i = 0; i < topKCount; i++) {
    const candidate = evaluatedCandidates[i];

    try {
      // Reconstruir sectorIndices para este candidato
      const sectResult = buildSectorsByFlowWithColumnSplitting(
        candidate.physicalColumns,
        effectiveN,
        ASPERSOR_PADRAO.vazaoM3PorHora,
        candidate.positions.length,
      );

      // Reconstruir principal/adutora para este candidato e ângulo
      const { principal, adutora } = generatePrincipalAndAdutora(
        waterSource!,
        candidate.physicalColumns,
        centroid,
        candidate.angleDegrees,
      );

      const principalLengthM =
        principal.length >= 2
          ? turf.length(turf.lineString(principal), { units: "meters" })
          : 0;

      const aspersoresPorSetor = Math.floor(candidate.positions.length / effectiveN);
      const vazaoPorSetorM3PorHora = aspersoresPorSetor * ASPERSOR_PADRAO.vazaoM3PorHora;

      // Montar ProjectLayout temporário — mínimo para o solver oficial rodar
      // jornadaHoras e tempoPorSetorMinutos são placeholders: não afetam hidráulica.
      const tempLayout: ProjectLayout = {
        schemaVersion: "1",
        area: polygon,
        centroid,
        waterSource: { lng: waterSource!.lng, lat: waterSource!.lat },
        geodetic: geodetic ?? undefined,
        pump: pump ?? undefined,
        sprinklers: {
          aspersorId: ASPERSOR_PADRAO.sku,
          positions: candidate.positions,
          count: candidate.positions.length,
          vazaoProjetoM3PorHora: candidate.positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
          espacamentoM: spacingMeters,
          gridAngleDegrees: candidate.angleDegrees,
          angleMode: "optimizer",
        },
        sectorization: {
          sectorIndices: sectResult.sectorIndices,
          setoresCount: effectiveN,
          // Placeholders — campos obrigatórios pelo schema; não usados pelo solver hidráulico.
          jornadaHoras: 9,
          laminaMm: 10,
          tempoPorSetorMinutos: 0,
          aspersoresPorSetor,
          vazaoPorSetorM3PorHora,
        },
        mainPipeline: {
          coordinates: principal,
          adutora: adutora.length >= 2 ? adutora : undefined,
          lengthMeters: principalLengthM,
          segments: Math.max(1, principal.length - 1),
          source: "auto",
          corridorValidated: false,
        },
      };

      const result = calculateIrrigationProject(tempLayout);

      if (!result.isComplete || !result.diagnostics) {
        evaluatedCandidates[i] = {
          ...candidate,
          score: {
            ...candidate.score,
            hydraulicEvaluationStatus: "not_evaluated_solver_error",
          },
        };
        continue;
      }

      // Blockers reais do solver oficial (diagnostics.blockers = string[])
      const blockers: HydraulicBlockerReal[] = result.diagnostics.blockers.map((msg) => ({
        source: "diagnostics_blocker" as const,
        message: msg,
      }));

      const hmtRequired = result.hydraulics?.hmt.totalHMT ?? null;
      const invalidCount = result.hydraulics?.validation.invalidSegments.length ?? null;
      const hasBlockers = blockers.length > 0;

      evaluatedCandidates[i] = {
        ...candidate,
        score: {
          ...candidate.score,
          total: hasBlockers
            ? candidate.score.total - WEIGHT_HYDRAULIC_BLOCKER
            : candidate.score.total,
          hydraulicBlockers: blockers,
          hydraulicEvaluationStatus: hasBlockers
            ? "evaluated_has_blockers"
            : "evaluated_no_blockers",
          hydraulicHmtRequiredMca: hmtRequired,
          hydraulicInvalidSegmentsCount: invalidCount,
        },
      };
    } catch {
      evaluatedCandidates[i] = {
        ...candidate,
        score: {
          ...candidate.score,
          hydraulicEvaluationStatus: "not_evaluated_solver_error",
        },
      };
    }
  }

  // ── Best é o melhor entre os Top K avaliados (não candidatos não avaliados) ─

  const topKCandidates = evaluatedCandidates.slice(0, topKCount);
  const best = topKCandidates.reduce((a, b) =>
    a.score.total > b.score.total ? a : b,
  );
  const second = topKCandidates.find((c) => c !== best) ?? null;

  const selectionReason = buildSelectionReason(best, second, { noElevationWarning });

  return { best, candidates: evaluatedCandidates, selectionReason };
}
