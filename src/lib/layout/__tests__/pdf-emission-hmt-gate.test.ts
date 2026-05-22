/**
 * TASK-026-B — Gate de emissão para cálculo hidráulico essencial.
 *
 * Verifica que `generateProposalDiagnostics()` emite blocker quando:
 *   - o projeto está completo, mas `hydraulics` é null;
 *   - o projeto está completo, mas `hydraulics.hmt.totalHMT` é NaN, Infinity ou ≤ 0;
 *   - o projeto está completo, há colunas físicas, mas `sizedSecondaries` está vazio.
 *
 * E que NÃO emite blocker quando:
 *   - o projeto está incompleto (já bloqueado pelo gate de `isComplete`);
 *   - o projeto está completo, HMT é válida e há ramais coerentes.
 */

import { describe, it, expect } from "vitest";
import { generateProposalDiagnostics, type BOMResult } from "@/lib/bom";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";
import type { HydraulicSizingReport } from "@/lib/layout/hydraulic-sizing";

const CENTROID = { lng: -46.0, lat: -12.0 };
const WATER_SOURCE = { lng: -46.001, lat: -12.001 };

function makeCompleteLayout(): ProjectLayout {
  return {
    schemaVersion: "1",
    sprinklers: {
      count: 10,
      positions: [],
      gridAngleDegrees: 0,
      espacamentoM: 18,
      vazaoProjetoM3PorHora: 10.0,
    },
    sectorization: { setoresCount: 2, sectorIndices: [] },
    mainPipeline: { lengthMeters: 100, segments: 2 },
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
  } as unknown as ProjectLayout;
}

function makeIncompleteLayout(): ProjectLayout {
  // sem waterSource → projeto incompleto
  return {
    schemaVersion: "1",
    sprinklers: {
      count: 10,
      positions: [],
      gridAngleDegrees: 0,
      espacamentoM: 18,
      vazaoProjetoM3PorHora: 10.0,
    },
    sectorization: { setoresCount: 2, sectorIndices: [] },
    mainPipeline: { lengthMeters: 100, segments: 2 },
    centroid: CENTROID,
  } as unknown as ProjectLayout;
}

function makeMinimalBOM(nColunasLaterais = 4): BOMResult {
  return {
    itens: [],
    totalGeral: 0,
    laterais: [],
    meta: {
      diametroPrincipalMm: 75,
      diametroPrincipalCalculadoMm: 75,
      barrasDeTubo: 5,
      nCurvas90: 2,
      nTes: 1,
      nLaterais: nColunasLaterais,
      nColunasLaterais,
      comprimentoLateraisM: 100,
      comprimentoAdutoraM: 0,
      comprimentoSecundariasM: 0,
      aspersoresPorSetorMin: 5,
      aspersoresPorSetorMax: 5,
      aspersoresPorSetorMedia: 5,
      vazaoPorSetorMin: 0.5,
      vazaoPorSetorMax: 0.5,
      desbalanceamentoSetoresPercent: 0,
      tees50Source: "physicalColumns",
      operationalSegmentsCount: 4,
      physicalColumnsSplitCount: 0,
      maxSegmentsPerPhysicalColumn: 1,
      splitControlPointsCount: 0,
      splitPointsCount: 0,
      unresolvedOperationalSegmentsCount: 0,
      controlPointsCount: 0,
      pendingControlPointsCount: 0,
      independentFeedRequiredCount: 0,
      constructabilityStatus: "ok",
      valvulasCount: 0,
      valvulasResolvidasCount: 0,
      valvulasSemCatalogoCount: 0,
      registrosManuaisSecaoCount: 0,
      conexoesFisicasPendentes: [],
      conexoesFisicasSemSkuCount: 0,
      curvas90RamaisLCount: 0,
      curvas90AdutoraCount: 0,
      curvas45AdutoraCount: 0,
      kitAspersorResolvCount: 0,
      kitAspersorDnNaoHomologadoCount: 0,
    } as unknown as BOMResult["meta"],
  };
}

function makeHydraulics(opts: {
  totalHMT: number;
  sizedSecondariesCount: number;
}): HydraulicSizingReport {
  const sized = Array.from({ length: opts.sizedSecondariesCount }, (_, i) => ({
    physicalColumnId: `col-${i}`,
  })) as unknown as HydraulicSizingReport["sizedSecondaries"];

  return {
    hmt: {
      pressaoServicoMca: 30,
      hfAdutoraM: 0,
      hfPrincipalToDerivationM: 0,
      hfSecondaryM: 0,
      hfLateralM: 0,
      desnivelM: 0,
      localLossesM: 0,
      safetyMarginM: 0,
      totalHMT: opts.totalHMT,
      noElevationData: false,
    },
    validation: {
      invalidSegments: [],
      hasVelocityViolations: false,
      hasLateralLossViolations: false,
      hasSecondaryLossViolations: false,
      hasPressureClassViolations: false,
      hasConservativePressureClassWarnings: false,
      allGatesPass: true,
    },
    pumpValidation: {
      status: "ok",
      designFlowM3h: 10,
      requiredHMT: 30,
      pump: { hmtMca: 40, vazaoMaxM3h: 12 },
    },
    status: "hydraulic_precheck_ok",
    hydraulicSolverStatus: "validated",
    sizedSecondaries: sized,
    allSegments: [],
    warnings: [],
  } as unknown as HydraulicSizingReport;
}

const HMT_BLOCKER_RX = /HMT total não computada ou inválida/;
const DIST_BLOCKER_RX = /coluna\(s\) física\(s\) sem ramal correspondente/;

describe("TASK-026-B — gate de emissão para HMT/distribuição", () => {
  it("T26B-a: projeto completo, HMT válida e ramais coerentes → sem blocker novo", () => {
    const diag = generateProposalDiagnostics(
      makeCompleteLayout(),
      makeMinimalBOM(4),
      makeHydraulics({ totalHMT: 35, sizedSecondariesCount: 4 }),
    );
    expect(diag.blockers.some((b) => HMT_BLOCKER_RX.test(b))).toBe(false);
    expect(diag.blockers.some((b) => DIST_BLOCKER_RX.test(b))).toBe(false);
  });

  it("T26B-b: projeto completo, hydraulics === null → blocker de HMT", () => {
    const diag = generateProposalDiagnostics(
      makeCompleteLayout(),
      makeMinimalBOM(4),
      null,
    );
    expect(diag.blockers.some((b) => HMT_BLOCKER_RX.test(b))).toBe(true);
  });

  it("T26B-c: projeto completo, totalHMT = NaN → blocker de HMT", () => {
    const diag = generateProposalDiagnostics(
      makeCompleteLayout(),
      makeMinimalBOM(4),
      makeHydraulics({ totalHMT: NaN, sizedSecondariesCount: 4 }),
    );
    expect(diag.blockers.some((b) => HMT_BLOCKER_RX.test(b))).toBe(true);
  });

  it("T26B-d: projeto completo, totalHMT = 0 → blocker de HMT", () => {
    const diag = generateProposalDiagnostics(
      makeCompleteLayout(),
      makeMinimalBOM(4),
      makeHydraulics({ totalHMT: 0, sizedSecondariesCount: 4 }),
    );
    expect(diag.blockers.some((b) => HMT_BLOCKER_RX.test(b))).toBe(true);
  });

  it("T26B-e: projeto completo, nColunasLaterais > 0 e sizedSecondaries.length = 0 → blocker de distribuição", () => {
    const diag = generateProposalDiagnostics(
      makeCompleteLayout(),
      makeMinimalBOM(4),
      makeHydraulics({ totalHMT: 35, sizedSecondariesCount: 0 }),
    );
    expect(diag.blockers.some((b) => DIST_BLOCKER_RX.test(b))).toBe(true);
    // Confirma também que a contagem aparece na mensagem
    const blocker = diag.blockers.find((b) => DIST_BLOCKER_RX.test(b))!;
    expect(blocker).toContain("4 coluna(s) física(s)");
  });

  it("T26B-f: projeto isComplete === false → nenhum blocker da TASK-026-B dispara", () => {
    const diag = generateProposalDiagnostics(
      makeIncompleteLayout(),
      makeMinimalBOM(4),
      null,
    );
    expect(diag.blockers.some((b) => HMT_BLOCKER_RX.test(b))).toBe(false);
    expect(diag.blockers.some((b) => DIST_BLOCKER_RX.test(b))).toBe(false);
  });

  it("T26B-g: textos dos blockers contêm a chave técnica e a ação de revisão", () => {
    const diagHmt = generateProposalDiagnostics(
      makeCompleteLayout(),
      makeMinimalBOM(4),
      null,
    );
    const hmtMsg = diagHmt.blockers.find((b) => HMT_BLOCKER_RX.test(b))!;
    expect(hmtMsg).toMatch(/HMT/);
    expect(hmtMsg.toLowerCase()).toMatch(/revisar/);

    const diagDist = generateProposalDiagnostics(
      makeCompleteLayout(),
      makeMinimalBOM(4),
      makeHydraulics({ totalHMT: 35, sizedSecondariesCount: 0 }),
    );
    const distMsg = diagDist.blockers.find((b) => DIST_BLOCKER_RX.test(b))!;
    expect(distMsg).toMatch(/ramal correspondente/);
    expect(distMsg.toLowerCase()).toMatch(/revisar/);
  });
});
