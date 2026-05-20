/**
 * Motor geométrico-operacional de candidatos de layout 12×12.
 *
 * Gera e compara múltiplos candidatos de disposição da malha de aspersores
 * variando ângulo e offset X/Y. Quando `nSetores` é fornecido, inclui
 * métricas operacionais de setorização (registros de seção, fragmentação,
 * desbalanceamento de vazão).
 *
 * Escopo desta versão (TASK-010E-A):
 *   ✅  Métricas geométricas: fillingRatio, shortColumnRatio, edgeQualityScore
 *   ✅  Métricas operacionais: sectionValveCount, fragmentedLateralRatio,
 *       operationalSegmentsCount, fragmentedColumnCount, maxSegmentsPerColumn,
 *       desbalanceamentoPercent — disponíveis quando nSetores é válido
 *   ✅  Métricas de comprimento de laterais: totalLateralLengthM, avgLateralLengthM,
 *       maxLateralLengthM, lateralLengthPerSprinklerM, lateralLengthPerHectareM
 *       (geométricas puras — não incluem principal, adutora nem ramais até captação)
 *   ❌  secondaryLengthM — PENDENTE TASK-010E-B: requer waterSource e principalCoords
 *   ❌  hydraulicBlockers — PENDENTE: requer solver hidráulico
 *   ❌  Topografia — PENDENTE
 *
 * A captação (waterSource) não é parâmetro de nenhuma função deste módulo.
 * O motor não chama solver hidráulico nem BOM.
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
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";

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

  // ── Métricas pendentes de solver hidráulico ──────────────────────────────
  /**
   * PENDENTE TASK-010E-B: requer waterSource, principalCoords e generateSecondaries().
   * Ramais/secundárias conectam colunas físicas à tubulação principal.
   */
  secondaryLengthM: null;
  /** PENDENTE: requer solver hidráulico para cálculo. */
  hydraulicBlockers: null;
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
      secondaryLengthM: NULL,
      hydraulicBlockers: NULL,
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

  const total =
    fillingRatio
    - WEIGHT_SHORT_COLUMN * shortColumnRatio
    - WEIGHT_EDGE * edgePenalty
    - operationalPenalty;

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
    secondaryLengthM: NULL,
    hydraulicBlockers: NULL,
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

  const score = computeScore(positions, polygon, physicalColumns, spacingMeters, nSetores);

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
 * A captação (waterSource) não é parâmetro.
 * O motor não chama solver hidráulico nem BOM.
 * secondaryLengthM e hydraulicBlockers permanecem null (requerem solver hidráulico).
 * Todos os resultados são PRELIMINARES — não substituem validação hidráulica de campo.
 *
 * @throws Error se nenhum candidato gerar posições válidas.
 */
export function findBestSprinklerLayout(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
  nSetores?: number | null,
): LayoutSelectionResult {
  const polyFeature = turf.polygon(polygon.coordinates);
  const centroidFeature = turf.centroid(polyFeature);
  const [lng, lat] = centroidFeature.geometry.coordinates;
  const centroid = { lng, lat };

  const effectiveN = nSetores ?? null;
  const configs = generateCandidateConfigs(polygon, spacingMeters);

  const allCandidates = configs.map(({ angleDegrees, offsetXm, offsetYm }) =>
    evaluateCandidate(polygon, spacingMeters, centroid, angleDegrees, offsetXm, offsetYm, effectiveN),
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
