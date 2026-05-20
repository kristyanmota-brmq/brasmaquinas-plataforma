import { describe, it, expect } from "vitest";
import {
  generateInvalidHydraulicSegmentsReport,
  type InvalidSegmentRow,
} from "@/lib/layout/irrigation-project";
import { HYDRAULIC_LIMITS } from "@/lib/layout/hydraulic-sizing";
import type { IrrigationProjectResult } from "@/lib/layout/irrigation-project";
import type {
  HydraulicSegment,
  HydraulicSizingReport,
  HydraulicValidation,
} from "@/lib/layout/hydraulic-sizing";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRESSAO_SERVICO = 30; // mca (ASPERSOR_PADRAO.pressaoServicoMca)

function makeSegment(overrides: Partial<HydraulicSegment> & Pick<HydraulicSegment, "id" | "type">): HydraulicSegment {
  return {
    lengthM: 100,
    diametroMm: 50,
    internalDiameterMm: 44,
    coefC: 145,
    flowM3h: 4.0,
    headLossM: 1.0,
    velocityMs: 1.0,
    velocityExceeds: false,
    ...overrides,
  };
}

function makeValidation(invalidSegments: HydraulicSegment[]): HydraulicValidation {
  return {
    invalidSegments,
    hasVelocityViolations: invalidSegments.some((s) => s.velocityExceeds),
    hasLateralLossViolations: invalidSegments.some((s) => s.lateralLossExceeds === true),
    hasSecondaryLossViolations: invalidSegments.some((s) => s.secondaryLossExceeds === true),
    hasPressureClassViolations: invalidSegments.some((s) => s.pressureClassCheck === "violation_confirmed"),
    hasConservativePressureClassWarnings: false,
    allGatesPass: invalidSegments.length === 0,
  };
}

function makeResult(invalidSegments: HydraulicSegment[]): IrrigationProjectResult {
  return {
    isComplete: true,
    missingFields: [],
    layout: {} as IrrigationProjectResult["layout"],
    hydraulics: {
      operationMode: "one_sector_at_a_time",
      criticalPath: {} as HydraulicSizingReport["criticalPath"],
      hmt: {
        pressaoServicoMca: PRESSAO_SERVICO,
        hfAdutoraM: 0,
        hfPrincipalToDerivationM: 0,
        hfSecondaryM: 0,
        hfLateralM: 0,
        desnivelM: 0,
        localLossesM: 0,
        safetyMarginM: 2,
        totalHMT: 32,
        noElevationData: true,
      },
      validation: makeValidation(invalidSegments),
      pumpValidation: { status: "not_informed", designFlowM3h: 4, requiredHMT: 32 },
      modelLimitations: {} as HydraulicSizingReport["modelLimitations"],
      status: "blocked_invalid_segments",
      hydraulicSolverStatus: "blocked",
      warnings: [],
      allSegments: invalidSegments,
      sizedSecondaries: [],
    },
  } as unknown as IrrigationProjectResult;
}

// ── Testes: generateInvalidHydraulicSegmentsReport ───────────────────────────

describe("generateInvalidHydraulicSegmentsReport — sem inválidos", () => {
  it("retorna [] quando hydraulics é null", () => {
    const result = { ...makeResult([]), hydraulics: null } as unknown as IrrigationProjectResult;
    expect(generateInvalidHydraulicSegmentsReport(result)).toHaveLength(0);
  });

  it("retorna [] quando invalidSegments está vazio", () => {
    const result = makeResult([]);
    expect(generateInvalidHydraulicSegmentsReport(result)).toHaveLength(0);
  });
});

describe("generateInvalidHydraulicSegmentsReport — rejectionReason", () => {
  it("velocity: segmento com velocityExceeds = true", () => {
    const seg = makeSegment({ id: "s1", type: "principal", velocityMs: 2.0, velocityExceeds: true });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].rejectionReason).toBe("velocity");
  });

  it("lateral_headloss: lateral com lateralLossExceeds = true", () => {
    const seg = makeSegment({
      id: "lat-1", type: "lateral",
      headLossM: 8.0, lateralLossExceeds: true, velocityExceeds: false,
    });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].rejectionReason).toBe("lateral_headloss");
  });

  it("secondary_headloss: ramal com secondaryLossExceeds = true", () => {
    const seg = makeSegment({
      id: "sec-1", type: "secondary",
      headLossM: 4.0, secondaryLossExceeds: true, velocityExceeds: false,
    });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].rejectionReason).toBe("secondary_headloss");
  });

  it("pressure_class: segmento com violation_confirmed", () => {
    const seg = makeSegment({
      id: "p1", type: "adutora",
      velocityExceeds: false, pressureClassCheck: "violation_confirmed",
    });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].rejectionReason).toBe("pressure_class");
  });

  it("multiple: velocidade + perda de carga lateral simultaneamente", () => {
    const seg = makeSegment({
      id: "lat-2", type: "lateral",
      velocityMs: 3.0, velocityExceeds: true,
      headLossM: 9.0, lateralLossExceeds: true,
    });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].rejectionReason).toBe("multiple");
  });
});

describe("generateInvalidHydraulicSegmentsReport — maxVelocityMs", () => {
  it("maxVelocityMs = 1.5 para tipo principal", () => {
    const seg = makeSegment({ id: "p1", type: "principal", velocityExceeds: true, velocityMs: 2.0 });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].maxVelocityMs).toBe(HYDRAULIC_LIMITS.maxVelocityPrincipalMs);
  });

  it("maxVelocityMs = 1.5 para tipo secondary", () => {
    const seg = makeSegment({ id: "s1", type: "secondary", velocityExceeds: true, velocityMs: 2.0 });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].maxVelocityMs).toBe(HYDRAULIC_LIMITS.maxVelocitySecondaryMs);
  });

  it("maxVelocityMs = 2.5 para tipo lateral", () => {
    const seg = makeSegment({ id: "lat-1", type: "lateral", velocityExceeds: true, velocityMs: 3.0 });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].maxVelocityMs).toBe(HYDRAULIC_LIMITS.maxVelocityLateralMs);
  });
});

describe("generateInvalidHydraulicSegmentsReport — maxHeadLossMca", () => {
  it("maxHeadLossMca para lateral = pressaoServico × 0.20", () => {
    const seg = makeSegment({ id: "lat-1", type: "lateral", lateralLossExceeds: true });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].maxHeadLossMca).toBeCloseTo(PRESSAO_SERVICO * 0.20);
  });

  it("maxHeadLossMca para secondary = pressaoServico × 0.10", () => {
    const seg = makeSegment({ id: "sec-1", type: "secondary", secondaryLossExceeds: true });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].maxHeadLossMca).toBeCloseTo(PRESSAO_SERVICO * 0.10);
  });

  it("maxHeadLossMca = undefined para adutora (sem limite de hf)", () => {
    const seg = makeSegment({ id: "adu", type: "adutora", velocityExceeds: true });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].maxHeadLossMca).toBeUndefined();
  });

  it("maxHeadLossMca = undefined para principal (sem limite de hf)", () => {
    const seg = makeSegment({ id: "pr", type: "principal", velocityExceeds: true });
    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    expect(rows[0].maxHeadLossMca).toBeUndefined();
  });
});

describe("generateInvalidHydraulicSegmentsReport — campos completos", () => {
  it("todos os campos estão presentes com valores corretos", () => {
    const seg = makeSegment({
      id: "lat-complete",
      type: "lateral",
      physicalColumnId: "col-3",
      sectorId: 1,
      operationalSegmentId: "seg-3",
      lengthM: 72,
      flowM3h: 6.0,
      diametroMm: 50,
      internalDiameterMm: 46,
      velocityMs: 1.0,
      headLossM: 7.5,
      velocityExceeds: false,
      lateralLossExceeds: true,
      pressureClassCheck: "ok",
    });

    const rows = generateInvalidHydraulicSegmentsReport(makeResult([seg]));
    const row: InvalidSegmentRow = rows[0];

    expect(row.id).toBe("lat-complete");
    expect(row.type).toBe("lateral");
    expect(row.physicalColumnId).toBe("col-3");
    expect(row.sectorId).toBe(1);
    expect(row.operationalSegmentId).toBe("seg-3");
    expect(row.lengthM).toBe(72);
    expect(row.flowM3h).toBe(6.0);
    expect(row.diameterNominalMm).toBe(50);
    expect(row.internalDiameterMm).toBe(46);
    expect(row.velocityMs).toBe(1.0);
    expect(row.maxVelocityMs).toBe(HYDRAULIC_LIMITS.maxVelocityLateralMs);
    expect(row.headLossMca).toBe(7.5);
    expect(row.maxHeadLossMca).toBeCloseTo(PRESSAO_SERVICO * 0.20);
    expect(row.rejectionReason).toBe("lateral_headloss");
    expect(row.pressureClassCheck).toBe("ok");
  });

  it("retorna uma linha por segmento inválido", () => {
    const segs = [
      makeSegment({ id: "a", type: "principal", velocityExceeds: true }),
      makeSegment({ id: "b", type: "lateral", lateralLossExceeds: true }),
      makeSegment({ id: "c", type: "secondary", secondaryLossExceeds: true }),
    ];
    const rows = generateInvalidHydraulicSegmentsReport(makeResult(segs));
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
