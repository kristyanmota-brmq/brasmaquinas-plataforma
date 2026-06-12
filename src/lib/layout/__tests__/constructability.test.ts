/**
 * Testes de construtibilidade dos trechos operacionais.
 *
 * Critérios de aceitação:
 *  - Lateral com único setor não gera ponto de controle adicional.
 *  - Lateral dividida em 2 setores gera 1 split point.
 *  - Lateral dividida em 3 setores gera 2 split points.
 *  - operationalSegments não duplicam tubo lateral na BOM.
 *  - Trechos sem controle geram warning.
 *  - Segmento no meio da lateral exige validação de alimentação.
 *  - independent_feed_required gera blocker.
 *  - PDF/BOM.meta exibe pendingControlPointsCount.
 *  - generateProposalDiagnostics retorna constructabilityStatus.
 *  - Projeto P → pending_control_validation enquanto pontos pendentes.
 */

import { describe, it, expect } from "vitest";
import {
  buildConstructabilityReport,
  evaluateConstructability,
  type ControlPoint,
} from "@/lib/layout/constructability";
import {
  buildSectorsByFlowWithColumnSplitting,
} from "@/lib/layout/sectorization";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import { generateProposalDiagnostics } from "@/lib/bom";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
// TASK-083: vazão SINTÉTICA de fixture — estes testes exercem COMPORTAMENTO
// (split operacional, válvulas, construtibilidade) com colunas longas (20-30
// aspersores); com a lateral única DN50 PN40 (ordem do RT), a vazão precisa
// caber para a coluna não dividir fisicamente antes do cenário testado.
const VAZ = 0.4;
const WATER_SOURCE = { lng: CENTROID.lng - 0.003, lat: CENTROID.lat - 0.003 };

/** Grade uniforme column-major. */
function makeGrid(
  cols: number,
  rows: number,
  spacingM: number,
  centroid: { lng: number; lat: number },
): [number, number][] {
  const mPerLng = 111320 * Math.cos((centroid.lat * Math.PI) / 180);
  const positions: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const xM = (c - (cols - 1) / 2) * spacingM;
      const yM = (r - (rows - 1) / 2) * spacingM;
      positions.push([centroid.lng + xM / mPerLng, centroid.lat + yM / 111320]);
    }
  }
  return positions;
}

function makePhysCols(cols: number, rows: number) {
  const positions = makeGrid(cols, rows, SPACING, CENTROID);
  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID,
    SPACING,
    { vazao: VAZ, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  return { positions, physCols };
}

function buildTestLayout(
  positions: [number, number][],
  sectorIndices: number[],
  nSetores: number,
  principalLengthM: number,
): ProjectLayout {
  return {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * VAZ,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: nSetores,
      tempoPorSetorMinutos: Math.round((60 * 14) / nSetores),
      aspersoresPorSetor: Math.round(positions.length / nSetores),
      vazaoPorSetorM3PorHora: Math.round(positions.length / nSetores) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [
        [CENTROID.lng - 0.001, CENTROID.lat - 0.001],
        [CENTROID.lng + 0.001, CENTROID.lat - 0.001],
      ],
      adutora: [],
      lengthMeters: Math.max(SPACING, principalLengthM),
      segments: Math.max(1, Math.round(principalLengthM / SPACING)),
      source: "auto",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Lateral com setor único não gera ponto de controle adicional
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 1 — lateral com setor único não exige ponto de controle adicional", () => {
  const { positions, physCols } = makePhysCols(1, 10);
  const sectorIndices = new Array<number>(positions.length).fill(0);
  const report = buildConstructabilityReport(physCols, sectorIndices, positions);

  it("hasSingleSector = true", () => {
    expect(report.columnDiagnostics[0].hasSingleSector).toBe(true);
  });

  it("splitPointsCount = 0", () => {
    expect(report.columnDiagnostics[0].splitPointsCount).toBe(0);
  });

  it("requiresControl = false", () => {
    expect(report.columnDiagnostics[0].requiresControl).toBe(false);
  });

  it("isConstructivelyResolved = true", () => {
    expect(report.columnDiagnostics[0].isConstructivelyResolved).toBe(true);
  });

  it("pendingControlPointsCount = 0", () => {
    expect(report.pendingControlPointsCount).toBe(0);
  });

  it("constructabilityStatus = 'ok'", () => {
    expect(report.constructabilityStatus).toBe("ok");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Lateral dividida em 2 setores gera 1 split point
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 2 — lateral dividida em 2 setores gera 1 split point e 1 control point", () => {
  const { positions, physCols } = makePhysCols(1, 20);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);
  const report = buildConstructabilityReport(physCols, sectorIndices, positions);

  it("splitPointsCount = 1", () => {
    expect(report.columnDiagnostics[0].splitPointsCount).toBe(1);
  });

  it("pendingControlPointsCount = 1", () => {
    expect(report.pendingControlPointsCount).toBe(1);
  });

  it("control point tem tipo 'section_valve' e status 'pending'", () => {
    const sectionValves = report.controlPoints.filter((cp) => cp.type === "section_valve");
    expect(sectionValves).toHaveLength(1);
    expect(sectionValves[0].status).toBe("pending");
  });

  it("constructabilityStatus = 'pending_control_validation'", () => {
    expect(report.constructabilityStatus).toBe("pending_control_validation");
  });

  it("requiresControl = true para a coluna dividida", () => {
    expect(report.columnDiagnostics[0].requiresControl).toBe(true);
  });

  it("isConstructivelyResolved = false enquanto controle pendente", () => {
    expect(report.columnDiagnostics[0].isConstructivelyResolved).toBe(false);
  });

  it("lateral_inlet tem status 'resolved'", () => {
    const inlets = report.controlPoints.filter((cp) => cp.type === "lateral_inlet");
    expect(inlets).toHaveLength(1);
    expect(inlets[0].status).toBe("resolved");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Lateral dividida em 3 setores gera 2 split points
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 3 — lateral dividida em 3 setores gera 2 split points", () => {
  // TASK-083: 18 aspersores (3 setores de 6) — cabe na lateral única DN50
  const { positions, physCols } = makePhysCols(1, 18);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 3, VAZ, positions.length);
  const report = buildConstructabilityReport(physCols, sectorIndices, positions);

  it("splitPointsCount = 2", () => {
    expect(report.columnDiagnostics[0].splitPointsCount).toBe(2);
  });

  it("pendingControlPointsCount = 2", () => {
    expect(report.pendingControlPointsCount).toBe(2);
  });

  it("há 2 section_valves e 1 lateral_inlet", () => {
    const sectionValves = report.controlPoints.filter((cp) => cp.type === "section_valve");
    const inlets = report.controlPoints.filter((cp) => cp.type === "lateral_inlet");
    expect(sectionValves).toHaveLength(2);
    expect(inlets).toHaveLength(1);
  });

  it("constructabilityStatus = 'pending_control_validation'", () => {
    expect(report.constructabilityStatus).toBe("pending_control_validation");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — operationalSegments não duplicam comprimento de lateral na BOM
//
// Mesma lógica da Suite 5 do arquivo sectorization-split.test.ts.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 4 — operationalSegments não duplicam tubo lateral na BOM", () => {
  const ROWS = 20;
  const { positions, physCols } = makePhysCols(1, ROWS);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);
  const layout = buildTestLayout(positions, sectorIndices, 2, SPACING);
  const bom = calculateIrrigationProject(layout).bom!;

  it("nColunasLaterais = 1 (não 2 por divisão)", () => {
    expect(bom.meta.nColunasLaterais).toBe(1);
  });

  it("comprimentoLateraisM = (20-1)*12+0.5 (coluna física completa)", () => {
    expect(bom.meta.comprimentoLateraisM).toBeCloseTo((ROWS - 1) * SPACING + 0.5, 1);
  });

  it("operationalSegmentsCount > nColunasLaterais (divisão detectada)", () => {
    expect(bom.meta.operationalSegmentsCount).toBeGreaterThan(bom.meta.nColunasLaterais);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — Trechos operacionais sem controle geram warning
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 5 — trechos operacionais sem controle geram warning", () => {
  const { positions, physCols } = makePhysCols(1, 20);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);
  const layout = buildTestLayout(positions, sectorIndices, 2, SPACING);
  const bom = calculateIrrigationProject(layout).bom!;
  const diag = generateProposalDiagnostics(layout, bom)!;

  it("warnings contém aviso sobre pontos de controle pendentes", () => {
    const hasWarning = diag.warnings.some(
      (w) => w.toLowerCase().includes("controle") && w.toLowerCase().includes("pendente"),
    );
    expect(hasWarning).toBe(true);
  });

  it("constructabilityStatus !== 'ok'", () => {
    expect(diag.constructabilityStatus).not.toBe("ok");
  });

  it("pendingControlPointsCount > 0", () => {
    expect(diag.pendingControlPointsCount).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — Segmento no meio da lateral exige validação de alimentação
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 6 — segmento no meio da lateral exige validação de alimentação", () => {
  const { positions, physCols } = makePhysCols(1, 20);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);
  const report = buildConstructabilityReport(physCols, sectorIndices, positions);

  it("segmento com ordemNaLateral > 0 gera control point section_valve", () => {
    const sectionValves = report.controlPoints.filter((cp) => cp.type === "section_valve");
    expect(sectionValves.length).toBeGreaterThan(0);
  });

  it("section_valve tem coordenada entre os dois sprinklers do corte", () => {
    const valve = report.controlPoints.find((cp) => cp.type === "section_valve");
    expect(valve).toBeDefined();
    // Coordenada deve estar próxima ao centróide (a coluna é centrada em CENTROID)
    expect(Math.abs(valve!.coordinate[0] - CENTROID.lng)).toBeLessThan(0.01);
    expect(Math.abs(valve!.coordinate[1] - CENTROID.lat)).toBeLessThan(0.01);
  });

  it("requiresControl = true para coluna dividida", () => {
    expect(report.columnDiagnostics[0].requiresControl).toBe(true);
  });

  it("isConstructivelyResolved = false enquanto há section_valve pendente", () => {
    expect(report.columnDiagnostics[0].isConstructivelyResolved).toBe(false);
  });

  it("requiresIndependentFeed = false (section_valve não é independent_feed_required)", () => {
    expect(report.columnDiagnostics[0].requiresIndependentFeed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7 — independent_feed_required gera blocker
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 7 — independent_feed_required gera blocker", () => {
  it("evaluateConstructability com independent_feed_required → blocked_unfeedable_segments", () => {
    const cp: ControlPoint = {
      id: "cp-test",
      physicalColumnId: "col-0",
      operationalSegmentId: "col-0-s1-1",
      sectorId: 1,
      coordinate: [CENTROID.lng, CENTROID.lat],
      type: "independent_feed_required",
      status: "pending",
    };
    const result = evaluateConstructability([cp]);
    expect(result.constructabilityStatus).toBe("blocked_unfeedable_segments");
    expect(result.independentFeedRequiredCount).toBe(1);
  });

  it("evaluateConstructability com section_valve NÃO gera blocked_unfeedable_segments", () => {
    const cp: ControlPoint = {
      id: "cp-test",
      physicalColumnId: "col-0",
      operationalSegmentId: "col-0-s1-1",
      sectorId: 1,
      coordinate: [CENTROID.lng, CENTROID.lat],
      type: "section_valve",
      status: "pending",
    };
    const result = evaluateConstructability([cp]);
    expect(result.constructabilityStatus).toBe("pending_control_validation");
    expect(result.independentFeedRequiredCount).toBe(0);
  });

  it("generateProposalDiagnostics produz blocker quando independentFeedRequiredCount > 0", () => {
    const { positions, physCols } = makePhysCols(1, 20);
    const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);
    const layout = buildTestLayout(positions, sectorIndices, 2, SPACING);
    const bom = calculateIrrigationProject(layout).bom!;

    // Simular cenário com independent_feed_required no meta
    const patchedBom: typeof bom = {
      ...bom,
      meta: {
        ...bom.meta,
        independentFeedRequiredCount: 1,
        constructabilityStatus: "blocked_unfeedable_segments",
      },
    };

    const diag = generateProposalDiagnostics(layout, patchedBom)!;
    expect(diag.blockers.length).toBeGreaterThan(0);
    expect(
      diag.blockers.some(
        (b) =>
          b.toLowerCase().includes("alimentação") ||
          b.toLowerCase().includes("independent_feed"),
      ),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 8 — BOM.meta tem pendingControlPointsCount para PDF
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 8 — BOM.meta exibe pendingControlPointsCount e constructabilityStatus para PDF", () => {
  const { positions, physCols } = makePhysCols(1, 20);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);
  const layout = buildTestLayout(positions, sectorIndices, 2, SPACING);
  const bom = calculateIrrigationProject(layout).bom!;

  it("bom.meta.pendingControlPointsCount > 0 quando há split column", () => {
    expect(bom.meta.pendingControlPointsCount).toBeGreaterThan(0);
  });

  it("bom.meta.controlPointsCount = nColunasLaterais + splitControlPointsCount", () => {
    expect(bom.meta.controlPointsCount).toBe(
      bom.meta.nColunasLaterais + bom.meta.splitControlPointsCount,
    );
  });

  it("bom.meta.constructabilityStatus = 'pending_control_validation'", () => {
    expect(bom.meta.constructabilityStatus).toBe("pending_control_validation");
  });

  it("bom.meta.independentFeedRequiredCount = 0 (geração automática nunca marca independent_feed)", () => {
    expect(bom.meta.independentFeedRequiredCount).toBe(0);
  });

  it("coluna sem split → constructabilityStatus = 'ok'", () => {
    const { positions: pos1, physCols: pc1 } = makePhysCols(1, 10);
    const allSector0 = new Array<number>(pos1.length).fill(0);
    const layout1 = buildTestLayout(pos1, allSector0, 1, SPACING);
    const bom1 = calculateIrrigationProject(layout1).bom!;
    expect(bom1.meta.constructabilityStatus).toBe("ok");
    expect(bom1.meta.pendingControlPointsCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 9 — generateProposalDiagnostics retorna constructabilityStatus
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 9 — generateProposalDiagnostics retorna constructabilityStatus e campos de controle", () => {
  const { positions, physCols } = makePhysCols(5, 10);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 3, VAZ, positions.length);
  const layout = buildTestLayout(positions, sectorIndices, 3, 4 * SPACING);
  const bom = calculateIrrigationProject(layout).bom!;
  const diag = generateProposalDiagnostics(layout, bom)!;

  it("diag.constructabilityStatus está definido", () => {
    expect(diag.constructabilityStatus).toBeDefined();
  });

  it("diag.constructabilityStatus é um dos valores válidos", () => {
    expect(["ok", "pending_control_validation", "blocked_unfeedable_segments"]).toContain(
      diag.constructabilityStatus,
    );
  });

  it("diag.controlPointsCount é um número ≥ 0", () => {
    expect(typeof diag.controlPointsCount).toBe("number");
    expect(diag.controlPointsCount).toBeGreaterThanOrEqual(0);
  });

  it("diag.pendingControlPointsCount ≤ diag.controlPointsCount", () => {
    expect(diag.pendingControlPointsCount).toBeLessThanOrEqual(diag.controlPointsCount);
  });

  it("diag.independentFeedRequiredCount = 0 (geração automática)", () => {
    expect(diag.independentFeedRequiredCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 11 — Invariantes de contagem de pontos de controle
//
// Verifica as invariantes fundamentais entre operationalSegmentsCount,
// physicalColumnsCount, splitControlPointsCount e pendingControlPointsCount.
// Cobre também o caso de coluna com 3 setores (splitControlPointsCount ≠ physicalColumnsSplitCount).
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 11 — invariantes de contagem de trechos operacionais e pontos de corte", () => {
  // ── 11a: coluna com 3 setores → 2 cortes ≠ physicalColumnsSplitCount = 1 ──
  // Nota: usamos n=18 aspersores (cabe em DN75 — hf=4.32 mca, V=2.01 m/s) para
  // que o split por capacidade hidráulica da TASK-040 não dispare. A intenção
  // do teste é validar setorização operacional (1 coluna × 3 setores).
  describe("11a — 1 coluna física que toca 3 setores gera 2 pontos de corte", () => {
    const { positions, physCols } = makePhysCols(1, 18);
    const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 3, VAZ, positions.length);
    const layout = buildTestLayout(positions, sectorIndices, 3, SPACING);
    const bom = calculateIrrigationProject(layout).bom!;

    it("physicalColumnsSplitCount = 1 (apenas 1 lateral dividida)", () => {
      expect(bom.meta.physicalColumnsSplitCount).toBe(1);
    });

    it("splitControlPointsCount = 2 (2 transições de setor na coluna)", () => {
      expect(bom.meta.splitControlPointsCount).toBe(2);
    });

    it("splitControlPointsCount ≠ physicalColumnsSplitCount quando coluna toca 3 setores", () => {
      expect(bom.meta.splitControlPointsCount).not.toBe(bom.meta.physicalColumnsSplitCount);
    });

    it("pendingControlPointsCount = splitControlPointsCount = 2", () => {
      expect(bom.meta.pendingControlPointsCount).toBe(2);
      expect(bom.meta.pendingControlPointsCount).toBe(bom.meta.splitControlPointsCount);
    });

    it("operationalSegmentsCount = nColunasLaterais + splitControlPointsCount = 1 + 2 = 3", () => {
      expect(bom.meta.operationalSegmentsCount).toBe(bom.meta.nColunasLaterais + bom.meta.splitControlPointsCount);
      expect(bom.meta.operationalSegmentsCount).toBe(3);
    });
  });

  // ── 11b: invariante operationalSegmentsCount = physicalColumns + splitPoints ──
  describe("11b — invariante: operationalSegmentsCount = physicalColumnsCount + splitControlPointsCount", () => {
    const { positions, physCols } = makePhysCols(5, 10);
    const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 3, VAZ, positions.length);
    const layout = buildTestLayout(positions, sectorIndices, 3, 4 * SPACING);
    const bom = calculateIrrigationProject(layout).bom!;

    it("operationalSegmentsCount = nColunasLaterais + splitControlPointsCount", () => {
      expect(bom.meta.operationalSegmentsCount).toBe(
        bom.meta.nColunasLaterais + bom.meta.splitControlPointsCount,
      );
    });

    it("pendingControlPointsCount = splitControlPointsCount", () => {
      expect(bom.meta.pendingControlPointsCount).toBe(bom.meta.splitControlPointsCount);
    });

    it("splitPointsCount = splitControlPointsCount", () => {
      expect(bom.meta.splitPointsCount).toBe(bom.meta.splitControlPointsCount);
    });

    it("unresolvedOperationalSegmentsCount = pendingControlPointsCount", () => {
      expect(bom.meta.unresolvedOperationalSegmentsCount).toBe(bom.meta.pendingControlPointsCount);
    });

    it("controlPointsCount = nColunasLaterais + splitControlPointsCount", () => {
      expect(bom.meta.controlPointsCount).toBe(
        bom.meta.nColunasLaterais + bom.meta.splitControlPointsCount,
      );
    });
  });

  // ── 11c: projeto P aproximado (40×20=800 asp, 14 setores) ──
  // Verifica que a invariante se mantém independente do número exato de cortes,
  // que depende de quantas fronteiras de setor coincidem com fim de coluna.
  describe("11c — Projeto P: 40 colunas / 14 setores → invariante operationalSegments", () => {
    const { positions, physCols } = makePhysCols(40, 20);
    const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 14, VAZ, positions.length);
    const layout = buildTestLayout(positions, sectorIndices, 14, 39 * SPACING);
    const bom = calculateIrrigationProject(layout).bom!;

    it("nColunasLaterais = 40", () => {
      expect(bom.meta.nColunasLaterais).toBe(40);
    });

    it("operationalSegmentsCount = nColunasLaterais + splitControlPointsCount (invariante)", () => {
      expect(bom.meta.operationalSegmentsCount).toBe(
        bom.meta.nColunasLaterais + bom.meta.splitControlPointsCount,
      );
    });

    it("pendingControlPointsCount = splitControlPointsCount", () => {
      expect(bom.meta.pendingControlPointsCount).toBe(bom.meta.splitControlPointsCount);
    });

    it("operationalSegmentsCount < 95 (não está inflado por generateLaterais)", () => {
      // O valor correto é nColunasLaterais + cuts (≤ nSetores-1 = 13)
      // 95 era um artefato de generateLaterais overcounting em campos irregulares.
      expect(bom.meta.operationalSegmentsCount).toBeLessThan(60);
    });

    it("splitControlPointsCount ≤ nSetores - 1 = 13 (no máximo um corte por fronteira de setor)", () => {
      expect(bom.meta.splitControlPointsCount).toBeLessThanOrEqual(13);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 10 — Projeto P → pending_control_validation enquanto pontos pendentes
//
// Grade 39 × 19 = 741 asp / 14 setores ≈ projeto P.
// O sistema deve identificar os pontos de controle mas NÃO bloquear
// com "blocked_unfeedable_segments" (sem independent_feed_required automático).
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 10 — Projeto P: pending_control_validation enquanto controles não resolvidos", () => {
  const COLS = 39, ROWS = 19, SECTORS = 14;
  const { positions, physCols } = makePhysCols(COLS, ROWS);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, SECTORS, VAZ, positions.length);
  const layout = buildTestLayout(positions, sectorIndices, SECTORS, (COLS - 1) * SPACING);
  const bom = calculateIrrigationProject(layout).bom!;
  const diag = generateProposalDiagnostics(layout, bom)!;

  it("constructabilityStatus = 'pending_control_validation'", () => {
    expect(diag.constructabilityStatus).toBe("pending_control_validation");
  });

  it("pendingControlPointsCount > 0 (há laterais divididas)", () => {
    expect(diag.pendingControlPointsCount).toBeGreaterThan(0);
  });

  it("independentFeedRequiredCount = 0 (nenhum trecho detectado automaticamente como sem alimentação)", () => {
    expect(diag.independentFeedRequiredCount).toBe(0);
  });

  it("constructabilityStatus !== 'blocked_unfeedable_segments'", () => {
    expect(diag.constructabilityStatus).not.toBe("blocked_unfeedable_segments");
  });

  it("constructabilityStatus !== 'ok' (há pontos pendentes)", () => {
    expect(diag.constructabilityStatus).not.toBe("ok");
  });

  it("bom.meta.physicalColumnsSplitCount > 0 (confirmação de divisão)", () => {
    expect(bom.meta.physicalColumnsSplitCount).toBeGreaterThan(0);
  });

  it("balanceamento ≈ projeto P: todos os setores ±1 asp", () => {
    const asp = new Array<number>(SECTORS).fill(0);
    for (const s of sectorIndices) asp[s]++;
    const minN = Math.min(...asp);
    const maxN = Math.max(...asp);
    expect(maxN - minN).toBeLessThanOrEqual(1);
  });
});
