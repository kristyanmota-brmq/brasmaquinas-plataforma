/**
 * Camada única de cálculo do projeto de irrigação.
 *
 * calculateIrrigationProject(layout) é a única orquestradora oficial.
 * Mapa, PDF, BOM e diagnósticos consomem IrrigationProjectResult —
 * nunca chamam funções de domínio diretamente.
 *
 * Ordem de cálculo:
 *  1. Validar entradas
 *  2. Gerar colunas físicas
 *  3. Derivar segmentos operacionais
 *  4. Derivar laterais (distribuição)
 *  5. Gerar secundárias / ramais
 *  6. Validar conectividade
 *  7. Gerar pontos de controle / construtibilidade
 *  8. Gerar BOM
 *  9. Gerar diagnósticos
 */

import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import {
  generatePhysicalColumns,
  deriveLateraisFromNetwork,
  type PhysicalColumn,
  type Lateral,
} from "@/lib/layout/laterais";
import {
  deriveOperationalSegments,
  type OperationalSegment,
  type SectorizationWithSplitResult,
} from "@/lib/layout/sectorization";
import {
  generateSecondaries,
  validateHydraulicConnectivity,
  type SecondaryPipe,
  type HydraulicConnectivityReport,
} from "@/lib/layout/hydraulic-connectivity";
import {
  buildConstructabilityReport,
  type ConstructabilityReport,
  type ControlPoint,
} from "@/lib/layout/constructability";
import {
  detectNetworkAngleIssues,
  type NetworkAngleReport,
} from "@/lib/layout/network-angle-diagnostics";
import {
  buildBOM,
  generateProposalDiagnostics,
  type BOMResult,
  type BOMInput,
  type ProposalDiagnostics,
} from "@/lib/bom";
import {
  sizeHydraulics,
  HYDRAULIC_LIMITS,
  type HydraulicSizingReport,
  type HydraulicSegment,
  type PressureClassCheck,
} from "@/lib/layout/hydraulic-sizing";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";
export type { ProjectLayout };
export type { HydraulicSizingReport };

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

/** Entradas validadas e normalizadas do ProjectLayout. */
export interface ProjectInput {
  positions: [number, number][];
  sectorIndices: number[];
  centroid: { lng: number; lat: number };
  waterSource: { lng: number; lat: number; elevation?: number };
  principalCoords: [number, number][];
  adutoraCoords: [number, number][];
  spacingM: number;
  gridAngleDegrees: number;
  vazaoPorAspersorM3h: number;
  nSetores: number;
  jornadaHoras: 9 | 14 | 21;
  laminaMm: 10;
  principalLengthM: number;
  principalSegments: number;
  corridorValidated: boolean;
  corridorSource: "auto" | "manual";
}

/** Rede física: colunas de aspersores independentes da setorização. */
export interface PhysicalNetwork {
  physicalColumns: PhysicalColumn[];
  nColumns: number;
  totalLengthM: number;
}

/** Rede operacional: setorização + segmentos atribuídos a setores. */
export interface OperationalNetwork {
  sectorIndices: number[];
  operationalSegments: OperationalSegment[];
  sprinklersPerSector: number[];
  vazaoPorSetor: number[];
  desbalanceamentoPercent: number;
  nSetores: number;
}

/** Rede de distribuição: laterais derivadas de physicalColumns + operationalSegments. */
export interface DistributionNetwork {
  laterais: Lateral[];
  nLaterais: number;
  nPhysical: number;
}

/** Grafo hidráulico: principal, adutora, secundárias, conectividade. */
export interface HydraulicGraph {
  principalCoords: [number, number][];
  adutoraCoords: [number, number][];
  principalLengthM: number;
  adutoraLengthM: number;
  secondaries: SecondaryPipe[];
  connectivityReport: HydraulicConnectivityReport;
  corridorSource: "auto" | "manual";
  corridorValidated: boolean;
}

/** Re-exporta para consumidores sem importar constructability.ts diretamente. */
export type { ConstructabilityReport, ControlPoint };

/** Resultado completo do projeto de irrigação. */
export interface IrrigationProjectResult {
  /** true quando todos os pré-requisitos estão presentes e o cálculo teve sucesso. */
  isComplete: boolean;
  /** Campos ausentes do layout. Vazio quando isComplete === true. */
  missingFields: string[];

  /** Layout original — passthrough para PDF e exibição de campos não calculados. */
  layout: ProjectLayout;

  input: ProjectInput | null;
  physical: PhysicalNetwork | null;
  operational: OperationalNetwork | null;
  distribution: DistributionNetwork | null;
  hydraulic: HydraulicGraph | null;
  constructability: ConstructabilityReport | null;
  bom: BOMResult | null;
  diagnostics: ProposalDiagnostics | null;
  networkAngle: NetworkAngleReport | null;
  /** Null quando o projeto ainda não tem todos os dados necessários para o solver hidráulico. */
  hydraulics: HydraulicSizingReport | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;

function lngLatDistM(a: [number, number], b: [number, number]): number {
  const mPerLng = M_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

function polylineLengthM(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += lngLatDistM(coords[i - 1], coords[i]);
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orquestrador
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Única orquestradora oficial do domínio de irrigação.
 *
 * Calcula progressivamente: cada bloco é gerado somente quando seus
 * pré-requisitos estão presentes. Mapa e PDF consomem este resultado;
 * nunca chamam funções de domínio diretamente.
 */
export function calculateIrrigationProject(
  layout: ProjectLayout,
): IrrigationProjectResult {
  const missing: string[] = [];

  // ── 1. Validar entradas ───────────────────────────────────────────────────

  if (!layout.sprinklers) missing.push("sprinklers");
  if (!layout.sectorization) missing.push("sectorization");
  if (!layout.mainPipeline) missing.push("mainPipeline");
  if (!layout.centroid) missing.push("centroid");
  if (!layout.waterSource) missing.push("waterSource");

  const incomplete = (
    partial: Partial<Omit<IrrigationProjectResult, "isComplete" | "missingFields" | "layout">>,
  ): IrrigationProjectResult => ({
    isComplete: false,
    missingFields: missing,
    layout,
    input: null,
    physical: null,
    operational: null,
    distribution: null,
    hydraulic: null,
    constructability: null,
    bom: null,
    diagnostics: null,
    networkAngle: null,
    hydraulics: null,
    ...partial,
  });

  // ── Bloco físico (requer sprinklers + centroid) ───────────────────────────

  if (!layout.sprinklers || !layout.centroid) {
    return incomplete({});
  }

  const { sprinklers, centroid } = layout;
  const sectorIndices = layout.sectorization?.sectorIndices ?? [];
  const vazaoPorAspersorM3h = sprinklers.vazaoProjetoM3PorHora / sprinklers.count;

  const physicalColumns = generatePhysicalColumns(
    sprinklers.positions,
    sprinklers.gridAngleDegrees,
    centroid,
    sprinklers.espacamentoM,
    { vazao: vazaoPorAspersorM3h, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
    sectorIndices.length > 0 ? sectorIndices : undefined,
  );

  const physicalNetwork: PhysicalNetwork = {
    physicalColumns,
    nColumns: physicalColumns.length,
    totalLengthM: physicalColumns.reduce((s, c) => s + c.comprimentoM, 0),
  };

  // ── Bloco operacional (requer sectorization) ──────────────────────────────

  if (!layout.sectorization) {
    return incomplete({ physical: physicalNetwork });
  }

  const { sectorization } = layout;

  const operationalSegments = deriveOperationalSegments(
    physicalColumns,
    sectorIndices,
    vazaoPorAspersorM3h,
  );

  const sprinklersPerSector = new Array<number>(sectorization.setoresCount).fill(0);
  for (const s of sectorIndices) {
    if (s >= 0 && s < sectorization.setoresCount) sprinklersPerSector[s]++;
  }
  const vazaoPorSetor = sprinklersPerSector.map((c) => c * vazaoPorAspersorM3h);
  const minV = Math.min(...vazaoPorSetor);
  const maxV = Math.max(...vazaoPorSetor);
  const avgV = sprinklers.vazaoProjetoM3PorHora / sectorization.setoresCount;
  const desbalPercent = avgV > 0 ? ((maxV - minV) / avgV) * 100 : 0;

  const operationalNetwork: OperationalNetwork = {
    sectorIndices,
    operationalSegments,
    sprinklersPerSector,
    vazaoPorSetor,
    desbalanceamentoPercent: desbalPercent,
    nSetores: sectorization.setoresCount,
  };

  // ── Bloco de distribuição (laterais) ─────────────────────────────────────

  const laterais = deriveLateraisFromNetwork(
    physicalColumns,
    operationalSegments,
    sprinklers.positions,
    sprinklers.espacamentoM,
    { vazao: vazaoPorAspersorM3h, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );

  const distributionNetwork: DistributionNetwork = {
    laterais,
    nLaterais: laterais.length,
    nPhysical: physicalColumns.length,
  };

  // ── Bloco hidráulico (requer mainPipeline + waterSource) ──────────────────

  if (!layout.mainPipeline || !layout.waterSource) {
    return incomplete({
      physical: physicalNetwork,
      operational: operationalNetwork,
      distribution: distributionNetwork,
    });
  }

  const { mainPipeline, waterSource } = layout;
  const principalCoords = mainPipeline.coordinates as [number, number][];
  const adutoraCoords = (mainPipeline.adutora ?? []) as [number, number][];

  const secondaries = generateSecondaries(physicalColumns, principalCoords, centroid);

  const connectivityReport = validateHydraulicConnectivity(
    physicalColumns,
    principalCoords,
    secondaries,
    centroid,
  );

  const hydraulicGraph: HydraulicGraph = {
    principalCoords,
    adutoraCoords,
    principalLengthM: mainPipeline.lengthMeters,
    adutoraLengthM: adutoraCoords.length >= 2 ? polylineLengthM(adutoraCoords) : 0,
    secondaries,
    connectivityReport,
    corridorSource: mainPipeline.source,
    corridorValidated: mainPipeline.corridorValidated ?? false,
  };

  // ── Construtibilidade ─────────────────────────────────────────────────────

  const constructability = buildConstructabilityReport(
    physicalColumns,
    sectorIndices,
    sprinklers.positions,
    principalCoords,
    centroid,
  );

  // ── Entradas validadas (input block) ──────────────────────────────────────

  const projectInput: ProjectInput = {
    positions: sprinklers.positions,
    sectorIndices,
    centroid,
    waterSource,
    principalCoords,
    adutoraCoords,
    spacingM: sprinklers.espacamentoM,
    gridAngleDegrees: sprinklers.gridAngleDegrees,
    vazaoPorAspersorM3h,
    nSetores: sectorization.setoresCount,
    jornadaHoras: sectorization.jornadaHoras,
    laminaMm: sectorization.laminaMm,
    principalLengthM: mainPipeline.lengthMeters,
    principalSegments: mainPipeline.segments,
    corridorValidated: mainPipeline.corridorValidated ?? false,
    corridorSource: mainPipeline.source,
  };

  // ── BOM ───────────────────────────────────────────────────────────────────

  const bomInput: BOMInput = {
    sprinklers: {
      count: sprinklers.count,
      vazaoProjetoM3PorHora: sprinklers.vazaoProjetoM3PorHora,
      espacamentoM: sprinklers.espacamentoM,
    },
    sectorization: {
      setoresCount: sectorization.setoresCount,
      sectorIndices,
      vazaoPorSetorM3PorHora: sectorization.vazaoPorSetorM3PorHora,
    },
    mainPipeline: {
      lengthMeters: mainPipeline.lengthMeters,
      segments: mainPipeline.segments,
      adutora: adutoraCoords.length >= 2 ? adutoraCoords : undefined,
    },
    physicalColumns,
    laterais,
    secondaries,
    constructability,
  };

  // BOM preliminar sem secondary sizing — solver ainda não rodou
  const bomPrelim = buildBOM(bomInput);

  // ── Resultado parcial (antes do solver hidráulico e diagnósticos) ─────────

  // ── Construtibilidade angular da rede ────────────────────────────────────

  const networkAngle = detectNetworkAngleIssues({
    physicalColumns,
    secondaries,
    principalCoords,
    adutoraCoords,
    centroid,
  });

  const partialResult: IrrigationProjectResult = {
    isComplete: true,
    missingFields: [],
    layout,
    input: projectInput,
    physical: physicalNetwork,
    operational: operationalNetwork,
    distribution: distributionNetwork,
    hydraulic: hydraulicGraph,
    constructability,
    bom: bomPrelim,
    diagnostics: null,
    networkAngle,
    hydraulics: null,
  };

  // ── Solver hidráulico (dimensiona ramais individualmente via P4) ─────────

  const hydraulics = sizeHydraulics(partialResult);

  // ── BOM final — ramais agrupados por SKU do tubo selecionado (P4) ────────

  const bom = buildBOM({
    ...bomInput,
    sizedSecondaries: hydraulics?.sizedSecondaries,
  });

  // ── Diagnósticos (recebe BOM final + solver hidráulico) ──────────────────

  const diagnostics = generateProposalDiagnostics(layout, bom, hydraulics, networkAngle);

  return { ...partialResult, bom, diagnostics, hydraulics };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de governança (consumidos pela rota de PDF)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna os blockers ativos que impedem a emissão do PDF de proposta final.
 * Função pura — usada pela rota de PDF e pelos testes de governança.
 */
export function pdfEmissionBlockers(result: IrrigationProjectResult): string[] {
  return result.diagnostics?.blockers ?? [];
}

// ── TASK-008A: Diagnóstico de segmentos hidráulicos inválidos ─────────────────

export type RejectionReason =
  | "velocity"
  | "lateral_headloss"
  | "secondary_headloss"
  | "pressure_class"
  | "multiple"
  | "unknown";

export interface InvalidSegmentRow {
  id: string;
  type: HydraulicSegment["type"];
  sectorId: number | undefined;
  physicalColumnId: string | undefined;
  operationalSegmentId: string | undefined;
  lengthM: number;
  flowM3h: number;
  diameterNominalMm: number;
  internalDiameterMm: number | undefined;
  velocityMs: number;
  maxVelocityMs: number;
  headLossMca: number;
  maxHeadLossMca: number | undefined;
  rejectionReason: RejectionReason;
  pressureClassCheck: PressureClassCheck | undefined;
}

/**
 * Transforma `hydraulics.validation.invalidSegments` em linhas de diagnóstico
 * com todos os campos relevantes. Retorna `[]` quando não há segmentos inválidos
 * ou quando o solver não foi executado.
 */
export function generateInvalidHydraulicSegmentsReport(
  result: IrrigationProjectResult,
): InvalidSegmentRow[] {
  const hydraulics = result.hydraulics;
  const invalidSegments = hydraulics?.validation.invalidSegments;
  if (!hydraulics || !invalidSegments || invalidSegments.length === 0) return [];

  const pressaoServico = hydraulics.hmt.pressaoServicoMca;
  const latMaxHf  = pressaoServico * HYDRAULIC_LIMITS.maxLateralLossFraction;
  const secMaxHf  = pressaoServico * HYDRAULIC_LIMITS.maxSecondaryLossFraction;

  return invalidSegments.map((seg): InvalidSegmentRow => {
    const reasons: RejectionReason[] = [];
    if (seg.velocityExceeds) reasons.push("velocity");
    if (seg.lateralLossExceeds === true) reasons.push("lateral_headloss");
    if (seg.secondaryLossExceeds === true) reasons.push("secondary_headloss");
    if (seg.pressureClassCheck === "violation_confirmed") reasons.push("pressure_class");

    const rejectionReason: RejectionReason =
      reasons.length === 0 ? "unknown"
      : reasons.length > 1 ? "multiple"
      : reasons[0];

    const maxVelocityMs =
      seg.type === "lateral"
        ? HYDRAULIC_LIMITS.maxVelocityLateralMs
        : HYDRAULIC_LIMITS.maxVelocityPrincipalMs;

    const maxHeadLossMca =
      seg.type === "lateral" ? latMaxHf
      : seg.type === "secondary" ? secMaxHf
      : undefined;

    return {
      id: seg.id,
      type: seg.type,
      sectorId: seg.sectorId,
      physicalColumnId: seg.physicalColumnId,
      operationalSegmentId: seg.operationalSegmentId,
      lengthM: seg.lengthM,
      flowM3h: seg.flowM3h,
      diameterNominalMm: seg.diametroMm,
      internalDiameterMm: seg.internalDiameterMm,
      velocityMs: seg.velocityMs,
      maxVelocityMs,
      headLossMca: seg.headLossM,
      maxHeadLossMca,
      rejectionReason,
      pressureClassCheck: seg.pressureClassCheck,
    };
  });
}
