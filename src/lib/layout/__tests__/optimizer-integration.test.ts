import { describe, it, expect } from "vitest";
import { candidateToSprinklers } from "@/lib/layout/optimizer-integration";
import type { LayoutCandidate } from "@/lib/layout/sprinkler-grid-optimizer";

// ─────────────────────────────────────────────────────────────────────────────
// Fixture mínima: candidato geométrico sem posições reais de campo
// ─────────────────────────────────────────────────────────────────────────────

function makeCandidate(positions: [number, number][]): LayoutCandidate {
  return {
    angleDegrees: 15,
    offsetXm: 3,
    offsetYm: 6,
    positions,
    physicalColumns: [],
    score: {
      total: 0.72,
      fillingRatio: 0.78,
      sprinklerCount: positions.length,
      physicalColumnCount: 4,
      avgSprinklersPerColumn: positions.length / 4,
      shortColumnCount: 1,
      shortColumnRatio: 0.25,
      edgeQualityScore: 0.85,
      edgePenalty: 0.15,
      operationalSegmentsCount: null,
      sectionValveCount: null,
      fragmentedColumnCount: null,
      fragmentedLateralRatio: null,
      maxSegmentsPerColumn: null,
      desbalanceamentoPercent: null,
      totalLateralLengthM: 120,
      avgLateralLengthM: 30,
      maxLateralLengthM: 36,
      lateralLengthPerSprinklerM: 12,
      lateralLengthPerHectareM: 166,
      principalLengthM: null,
      adutoraLengthM: null,
      secondaryLengthM: null,
      totalNetworkLengthM: null,
      avgSecondaryLengthM: null,
      maxSecondaryLengthM: null,
      distributionLengthRatio: null,
      hydraulicBlockers: null,
      hydraulicEvaluationStatus: null,
      hydraulicHmtRequiredMca: null,
      hydraulicInvalidSegmentsCount: null,
    },
  };
}

const SPACING = 12;
const SKU = "ASP-001";
const VAZAO = 1.5; // m³/h por aspersor

const POSITIONS: [number, number][] = [
  [-46.001, -12.001],
  [-46.002, -12.002],
  [-46.003, -12.003],
];

// ─────────────────────────────────────────────────────────────────────────────
// candidateToSprinklers
// ─────────────────────────────────────────────────────────────────────────────

describe("candidateToSprinklers", () => {
  it("preserva positions do candidato", () => {
    const candidate = makeCandidate(POSITIONS);
    const result = candidateToSprinklers(candidate, SKU, SPACING, VAZAO);

    expect(result.positions).toEqual(POSITIONS);
    expect(result.positions).toBe(candidate.positions);
  });

  it("calcula vazão total como count × vazaoM3PorHoraPerSprinkler", () => {
    const candidate = makeCandidate(POSITIONS);
    const result = candidateToSprinklers(candidate, SKU, SPACING, VAZAO);

    expect(result.count).toBe(POSITIONS.length);
    expect(result.vazaoProjetoM3PorHora).toBeCloseTo(POSITIONS.length * VAZAO, 6);
  });

  it("define angleMode = 'optimizer'", () => {
    const candidate = makeCandidate(POSITIONS);
    const result = candidateToSprinklers(candidate, SKU, SPACING, VAZAO);

    expect(result.angleMode).toBe("optimizer");
  });

  it("define gridAngleDegrees = candidate.angleDegrees", () => {
    const candidate = makeCandidate(POSITIONS);
    const result = candidateToSprinklers(candidate, SKU, SPACING, VAZAO);

    expect(result.gridAngleDegrees).toBe(candidate.angleDegrees);
  });

  it("define espacamentoM = spacingM passado", () => {
    const candidate = makeCandidate(POSITIONS);
    const result = candidateToSprinklers(candidate, SKU, SPACING, VAZAO);

    expect(result.espacamentoM).toBe(SPACING);
  });

  it("candidato com 0 posições gera count = 0 e vazão = 0", () => {
    const empty = makeCandidate([]);
    const result = candidateToSprinklers(empty, SKU, SPACING, VAZAO);

    expect(result.count).toBe(0);
    expect(result.vazaoProjetoM3PorHora).toBe(0);
    expect(result.positions).toHaveLength(0);
  });

  it("não tem campos de solver, BOM ou setorização no resultado", () => {
    const candidate = makeCandidate(POSITIONS);
    const result = candidateToSprinklers(candidate, SKU, SPACING, VAZAO);

    expect("hydraulics" in result).toBe(false);
    expect("bom" in result).toBe(false);
    expect("sectorization" in result).toBe(false);
    expect("waterSource" in result).toBe(false);
  });
});
