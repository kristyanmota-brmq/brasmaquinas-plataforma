import { describe, it, expect } from "vitest";
import { buildBOM, generateProposalDiagnostics, type BOMResult } from "@/lib/bom";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import type { ConstructabilityReport, ControlPoint } from "@/lib/layout/constructability";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM;

function makeGrid(
  cols: number,
  rows: number,
): [number, number][] {
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
  const positions: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const xM = (c - (cols - 1) / 2) * SPACING;
      const yM = (r - (rows - 1) / 2) * SPACING;
      positions.push([CENTROID.lng + xM / mPerLng, CENTROID.lat + yM / 111320]);
    }
  }
  return positions;
}

function makeSectorIndices(cols: number, rows: number, nSectors: number): number[] {
  const indices: number[] = [];
  for (let c = 0; c < cols; c++) {
    const sectorId = Math.floor((c * Math.min(nSectors, cols)) / cols);
    for (let r = 0; r < rows; r++) indices.push(sectorId);
  }
  return indices;
}

function makeControlPoint(type: ControlPoint["type"], id: string): ControlPoint {
  return {
    id,
    physicalColumnId: "col-1",
    operationalSegmentId: "seg-1",
    sectorId: 0,
    coordinate: [-46.0, -12.0],
    type,
    status: "pending",
  };
}

function makeConstructability(sectionValveCount: number): ConstructabilityReport {
  const sectionValves = Array.from({ length: sectionValveCount }, (_, i) =>
    makeControlPoint("section_valve", `sv-${i}`),
  );
  const inlets: ControlPoint[] = [makeControlPoint("lateral_inlet", "inlet-0")];
  const controlPoints = [...inlets, ...sectionValves];
  const pending = sectionValves; // section_valve are always pending initially
  return {
    controlPoints,
    columnDiagnostics: [],
    controlPointsCount: controlPoints.length,
    pendingControlPointsCount: pending.length,
    independentFeedRequiredCount: 0,
    constructabilityStatus: sectionValveCount > 0 ? "pending_control_validation" : "ok",
  };
}

function makeBOMInput(sectionValveCount: number) {
  const COLS = 3, ROWS = 4;
  const positions = makeGrid(COLS, ROWS);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 2);
  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID,
    SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  const vazaoPorSetor = ASPERSOR_PADRAO.vazaoM3PorHora * (COLS * ROWS) / 2;
  return {
    sprinklers: {
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM: SPACING,
    },
    sectorization: { setoresCount: 2, sectorIndices, vazaoPorSetorM3PorHora: vazaoPorSetor },
    mainPipeline: { lengthMeters: (COLS - 1) * SPACING, segments: COLS - 1, adutora: undefined },
    physicalColumns: physCols,
    laterais: [],
    secondaries: [],
    constructability: makeConstructability(sectionValveCount),
  };
}

// ── buildBOM — contagem de válvulas ──────────────────────────────────────────

describe("buildBOM — valvulasCount e valvulasSemCatalogoCount", () => {
  it("valvulasCount = 0 quando não há section_valve", () => {
    const bom = buildBOM(makeBOMInput(0));
    expect(bom.meta.valvulasCount).toBe(0);
  });

  it("valvulasCount = N quando há N section_valve CPs", () => {
    const bom = buildBOM(makeBOMInput(2));
    expect(bom.meta.valvulasCount).toBe(2);
  });

  it("valvulasSemCatalogoCount = valvulasCount (sem catálogo nesta versão)", () => {
    const bom = buildBOM(makeBOMInput(3));
    expect(bom.meta.valvulasSemCatalogoCount).toBe(bom.meta.valvulasCount);
    expect(bom.meta.valvulasSemCatalogoCount).toBe(3);
  });

  it("nenhum item precificado de válvula é criado na BOM", () => {
    const bom = buildBOM(makeBOMInput(2));
    const valveItems = bom.itens.filter(
      (i) => i.descricao.toLowerCase().includes("válvula") || i.descricao.toLowerCase().includes("valvula"),
    );
    expect(valveItems).toHaveLength(0);
  });

  it("valvulasCount = 1 quando há exatamente 1 section_valve", () => {
    const bom = buildBOM(makeBOMInput(1));
    expect(bom.meta.valvulasCount).toBe(1);
    expect(bom.meta.valvulasSemCatalogoCount).toBe(1);
  });
});

// ── generateProposalDiagnostics — warning técnico e blocker comercial ────────

function makeMinimalLayout(): ProjectLayout {
  return {
    schemaVersion: "1",
    sprinklers: {
      count: 10,
      positions: [],
      gridAngleDegrees: 0,
      espacamentoM: 18,
      vazaoProjetoM3PorHora: 1.0,
    },
    sectorization: { setoresCount: 2, sectorIndices: [] },
    mainPipeline: { lengthMeters: 100, segments: 2 },
    centroid: CENTROID,
  } as unknown as ProjectLayout;
}

function makeMinimalBOM(valvulasCount: number): BOMResult {
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
      nLaterais: 4,
      nColunasLaterais: 4,
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
      physicalColumnsSplitCount: valvulasCount > 0 ? 1 : 0,
      maxSegmentsPerPhysicalColumn: 1,
      splitControlPointsCount: valvulasCount,
      splitPointsCount: valvulasCount,
      unresolvedOperationalSegmentsCount: valvulasCount,
      controlPointsCount: valvulasCount + 1,
      pendingControlPointsCount: valvulasCount,
      independentFeedRequiredCount: 0,
      constructabilityStatus: valvulasCount > 0 ? "pending_control_validation" : "ok",
      valvulasCount,
      valvulasSemCatalogoCount: valvulasCount,
    },
  };
}

describe("generateProposalDiagnostics — válvulas de seção", () => {
  it("gera warning técnico quando valvulasCount > 0", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(), makeMinimalBOM(2));
    expect(diag.warnings.some((w) => w.includes("válvula") && w.includes("seção"))).toBe(true);
  });

  it("gera blocker quando valvulasSemCatalogoCount > 0", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(), makeMinimalBOM(2));
    expect(diag.blockers.some((b) => b.includes("SKU") || b.includes("catálogo"))).toBe(true);
  });

  it("sem warning de válvula quando valvulasCount = 0", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(), makeMinimalBOM(0));
    expect(diag.warnings.some((w) => w.includes("válvula") && w.includes("seção"))).toBe(false);
  });

  it("sem blocker de válvula quando valvulasSemCatalogoCount = 0", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(), makeMinimalBOM(0));
    expect(diag.blockers.some((b) => b.includes("SKU") || b.includes("catálogo"))).toBe(false);
  });

  it("blocker e warning são mensagens distintas", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(), makeMinimalBOM(1));
    const blockerTexts = diag.blockers.filter((b) => b.includes("SKU") || b.includes("catálogo"));
    const warningTexts = diag.warnings.filter((w) => w.includes("válvula") && w.includes("seção"));
    expect(blockerTexts.length).toBeGreaterThan(0);
    expect(warningTexts.length).toBeGreaterThan(0);
    expect(blockerTexts[0]).not.toBe(warningTexts[0]);
  });
});
