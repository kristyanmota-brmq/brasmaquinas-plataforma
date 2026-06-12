/**
 * Testes para buildSectorsByFlowWithColumnSplitting.
 *
 * Critérios de aceitação (projeto P: 718 asp / 39 cols / 14 setores):
 *  - Resultado esperado: 51–52 asp/setor, maxMinRatio ≈ 1,02.
 *  - operationalSegments podem dividir uma physicalColumn.
 *  - BOM física continua derivada de physicalColumns (sem duplicação).
 *  - generateProposalDiagnostics avisa quando há divisão de lateral física.
 *  - Tês e tubos continuam vindo de physicalColumns.
 *  - buildSectorsByFlow (colunas inteiras) NÃO é o padrão — buildSectorsByFlowWithColumnSplitting é.
 */

import { describe, it, expect } from "vitest";
import {
  buildSectorsByFlowWithColumnSplitting,
  buildSectorsByFlow,
} from "@/lib/layout/sectorization";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import { generateProposalDiagnostics } from "@/lib/bom";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import { ASPERSOR_5022_SD_40X18, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_5022_SD_40X18.espacamentoPadraoM; // 12 m
const VAZ = ASPERSOR_5022_SD_40X18.vazaoM3PorHora;
const WATER_SOURCE = { lng: CENTROID.lng - 0.003, lat: CENTROID.lat - 0.003 };

/** Grade uniforme column-major: col varia mais devagar que row. */
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
    { vazao: VAZ, pressaoServico: ASPERSOR_5022_SD_40X18.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  return { positions, physCols };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Resultado próximo de 51/52 asp/setor para grade similar ao projeto P
//
// Grade 36 × 20 = 720 asp / 14 setores → 720/14 = 51,43
// Esperado: todos os setores com 51 ou 52 asp.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 1 — balanceamento: 720 asp / 14 setores → 51–52 asp/setor", () => {
  const { positions, physCols } = makePhysCols(36, 20);
  const result = buildSectorsByFlowWithColumnSplitting(physCols, 14, VAZ, positions.length);

  it("retorna 14 setores", () => {
    expect(result.sprinklersPerSector).toHaveLength(14);
  });

  it("todo setor tem 51 ou 52 aspersores", () => {
    for (const n of result.sprinklersPerSector) {
      expect(n).toBeGreaterThanOrEqual(51);
      expect(n).toBeLessThanOrEqual(52);
    }
  });

  it("soma de sprinklersPerSector = 720", () => {
    expect(result.sprinklersPerSector.reduce((s, c) => s + c, 0)).toBe(positions.length);
  });

  it("desbalanceamentoPercent < 5%", () => {
    expect(result.desbalanceamentoPercent).toBeLessThan(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — maxMinRatio cai drasticamente vs colunas inteiras
//
// Mesma grade 36×20, 14 setores.
// Com colunas inteiras: 36/14 ≈ 2,57 cols/setor → distribuição 3/3/.../2 cols
//   → aspersores: 3×20=60 vs 2×20=40, ratio = 60/40 = 1,50.
// Com splitting: 51/52 → ratio ≈ 1,02.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 2 — maxMinRatio: splitting < colunas inteiras", () => {
  const { positions, physCols } = makePhysCols(36, 20);
  const split = buildSectorsByFlowWithColumnSplitting(physCols, 14, VAZ, positions.length);
  const whole = buildSectorsByFlow(positions, 14, 0, CENTROID, SPACING, VAZ);

  it("maxMinRatio do splitting < maxMinRatio das colunas inteiras", () => {
    const wholeRatio =
      Math.max(...whole.vazaoPorSetor) / Math.max(1e-9, Math.min(...whole.vazaoPorSetor));
    expect(split.maxMinRatio).toBeLessThan(wholeRatio);
  });

  it("maxMinRatio do splitting < 1,10", () => {
    expect(split.maxMinRatio).toBeLessThan(1.1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — operationalSegments podem dividir uma physicalColumn
//
// 1 coluna física × 20 asp, 2 setores → espera-se 2 segmentos na mesma coluna,
// e physicalColumnsSplitCount = 1.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 3 — operationalSegments dividem physicalColumn", () => {
  const { positions, physCols } = makePhysCols(1, 20);
  const result = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);

  it("gera 2 operationalSegments para 1 physicalColumn e 2 setores", () => {
    expect(result.operationalSegments).toHaveLength(2);
  });

  it("ambos os segmentos referenciam a mesma physicalColumn", () => {
    const ids = new Set(result.operationalSegments.map((s) => s.physicalColumnId));
    expect(ids.size).toBe(1);
  });

  it("physicalColumnsSplitCount = 1", () => {
    expect(result.physicalColumnsSplitCount).toBe(1);
  });

  it("segundo segmento tem requiresValveOrControlPoint = true", () => {
    const seg1 = result.operationalSegments.find((s) => s.ordemNaLateral === 1);
    expect(seg1).toBeDefined();
    expect(seg1!.requiresValveOrControlPoint).toBe(true);
  });

  it("primeiro segmento tem requiresValveOrControlPoint = false", () => {
    const seg0 = result.operationalSegments.find((s) => s.ordemNaLateral === 0);
    expect(seg0!.requiresValveOrControlPoint).toBe(false);
  });

  it("soma de sprinklerCount dos segmentos = total de aspersores", () => {
    const total = result.operationalSegments.reduce((s, seg) => s + seg.sprinklerCount, 0);
    expect(total).toBe(positions.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — physicalColumns = fonte da BOM (não operationalSegments)
//
// 5 colunas × 12 asp, 3 setores.
// BOM deve listar 5 Tês (um por coluna física), não mais.
// Comprimento lateral = soma das colunas físicas completas.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 4 — physicalColumns é a fonte da BOM de tubos e Tês", () => {
  const COLS = 5, ROWS = 12, SECTORS = 3;
  const { positions, physCols } = makePhysCols(COLS, ROWS);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(
    physCols, SECTORS, VAZ, positions.length,
  );

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_5022_SD_40X18.sku,
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
      setoresCount: SECTORS,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: Math.round(positions.length / SECTORS),
      vazaoPorSetorM3PorHora: Math.round(positions.length / SECTORS) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[CENTROID.lng - 0.001, CENTROID.lat - 0.001], [CENTROID.lng + 0.001, CENTROID.lat - 0.001]],
      adutora: [[CENTROID.lng - 0.001, CENTROID.lat - 0.005], [CENTROID.lng - 0.001, CENTROID.lat - 0.001]],
      lengthMeters: (COLS - 1) * SPACING,
      segments: COLS - 1,
      source: "auto",
    },
  };

  const bom = calculateIrrigationProject(layout).bom!;

  it("nColunasLaterais = COLS (sem duplicação por setor)", () => {
    expect(bom.meta.nColunasLaterais).toBe(COLS);
  });

  it("comprimentoLateraisM = soma das colunas físicas completas", () => {
    const expected = COLS * ((ROWS - 1) * SPACING + 0.5);
    expect(bom.meta.comprimentoLateraisM).toBeCloseTo(expected, 0);
  });

  it("soma total de Tês na BOM = nColunasLaterais = COLS", () => {
    const totalTees = bom.itens
      .filter((i) => i.categoria === "CONEXAO" && i.descricao.toLowerCase().startsWith("tê pvc lf")
        // TASK-054: tês fishbone (sub-coletor) têm contadores próprios — fora da invariante "1 tê de derivação lateral por coluna"
        && !i.descricao.includes("sub-coletor"))
      .reduce((s, i) => s + i.quantidade, 0);
    expect(totalTees).toBe(COLS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — operationalSegments não duplicam comprimento de lateral na BOM
//
// 1 coluna × 20 asp dividida em 2 setores: a BOM deve ter 1 coluna física
// com comprimento (20-1)*12+0.5 = 228.5 m, não 2 sub-segmentos.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 5 — operationalSegments não duplicam comprimento de lateral", () => {
  const ROWS = 20;
  const { positions, physCols } = makePhysCols(1, ROWS);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_5022_SD_40X18.sku,
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
      setoresCount: 2,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: ROWS / 2,
      vazaoPorSetorM3PorHora: (ROWS / 2) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[CENTROID.lng, CENTROID.lat - 0.001], [CENTROID.lng, CENTROID.lat + 0.001]],
      adutora: [],
      lengthMeters: SPACING,
      segments: 1,
      source: "auto",
    },
  };

  const bom = calculateIrrigationProject(layout).bom!;

  it("nColunasLaterais = 1 (não 2 por divisão operacional)", () => {
    expect(bom.meta.nColunasLaterais).toBe(1);
  });

  it("comprimentoLateraisM = (20-1)*12+0.5 = 228.5 m (coluna física completa)", () => {
    expect(bom.meta.comprimentoLateraisM).toBeCloseTo((ROWS - 1) * SPACING + 0.5, 1);
  });

  it("physicalColumnsSplitCount = 1 (1 coluna dividida entre 2 setores)", () => {
    expect(bom.meta.physicalColumnsSplitCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — PDF: BOM.meta tem campos para laterais físicas e trechos operacionais
//
// Verifica que os campos necessários ao PDF existem no BOM.meta com valores corretos.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 6 — BOM.meta tem campos para PDF: físicas e trechos operacionais", () => {
  const { positions, physCols } = makePhysCols(5, 10);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 3, VAZ, positions.length);

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_5022_SD_40X18.sku,
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
      setoresCount: 3,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: Math.round(positions.length / 3),
      vazaoPorSetorM3PorHora: Math.round(positions.length / 3) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[CENTROID.lng - 0.001, CENTROID.lat - 0.001], [CENTROID.lng + 0.001, CENTROID.lat - 0.001]],
      adutora: [],
      lengthMeters: 4 * SPACING,
      segments: 4,
      source: "auto",
    },
  };

  const bom = calculateIrrigationProject(layout).bom!;

  it("bom.meta.nColunasLaterais está definido e > 0", () => {
    expect(bom.meta.nColunasLaterais).toBeGreaterThan(0);
  });

  it("bom.meta.operationalSegmentsCount está definido e ≥ nColunasLaterais", () => {
    expect(bom.meta.operationalSegmentsCount).toBeGreaterThanOrEqual(bom.meta.nColunasLaterais);
  });

  it("bom.meta.physicalColumnsSplitCount está definido e ≥ 0", () => {
    expect(bom.meta.physicalColumnsSplitCount).toBeGreaterThanOrEqual(0);
  });

  it("bom.meta.splitControlPointsCount está definido e ≥ 0", () => {
    expect(bom.meta.splitControlPointsCount).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7 — generateProposalDiagnostics avisa quando lateral física é dividida
//
// 1 coluna × 20 asp, 2 setores → physicalColumnsSplitCount = 1 → warning W1.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 7 — generateProposalDiagnostics: aviso quando lateral física é dividida", () => {
  const ROWS = 20;
  const { positions, physCols } = makePhysCols(1, ROWS);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(physCols, 2, VAZ, positions.length);

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_5022_SD_40X18.sku,
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
      setoresCount: 2,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: ROWS / 2,
      vazaoPorSetorM3PorHora: (ROWS / 2) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[CENTROID.lng, CENTROID.lat - 0.001], [CENTROID.lng, CENTROID.lat + 0.001]],
      adutora: [],
      lengthMeters: SPACING,
      segments: 1,
      source: "auto",
    },
  };

  const bom = calculateIrrigationProject(layout).bom!;
  const diag = generateProposalDiagnostics(layout, bom)!;

  it("physicalColumnsSplitCount = 1", () => {
    expect(diag.physicalColumnsSplitCount).toBe(1);
  });

  it("pendingControlConnections = 1", () => {
    expect(diag.pendingControlConnections).toBe(1);
  });

  it("warnings contém aviso de divisão de laterais físicas", () => {
    const hasWarning = diag.warnings.some((w) =>
      w.toLowerCase().includes("lateral") && w.toLowerCase().includes("dividida"),
    );
    expect(hasWarning).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 8 — Tês e tubos continuam vindo de physicalColumns
//
// 4 colunas × 15 asp, 8 setores (mais setores que colunas → splitting intenso).
// Os Tês da BOM devem ser = 4 (colunas físicas), não 8 (setores) nem mais.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 8 — Tês e tubos vêm de physicalColumns mesmo com splitting intenso", () => {
  const COLS = 4, ROWS = 15, SECTORS = 8;
  const { positions, physCols } = makePhysCols(COLS, ROWS);
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(
    physCols, SECTORS, VAZ, positions.length,
  );

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_5022_SD_40X18.sku,
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
      setoresCount: SECTORS,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: Math.round(positions.length / SECTORS),
      vazaoPorSetorM3PorHora: Math.round(positions.length / SECTORS) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[CENTROID.lng - 0.001, CENTROID.lat - 0.001], [CENTROID.lng + 0.001, CENTROID.lat - 0.001]],
      adutora: [],
      lengthMeters: (COLS - 1) * SPACING,
      segments: COLS - 1,
      source: "auto",
    },
  };

  const bom = calculateIrrigationProject(layout).bom!;
  const totalTees = bom.itens
    .filter((i) => i.categoria === "CONEXAO" && i.descricao.toLowerCase().startsWith("tê pvc lf")
        // TASK-054: tês fishbone (sub-coletor) têm contadores próprios — fora da invariante "1 tê de derivação lateral por coluna"
        && !i.descricao.includes("sub-coletor"))
    .reduce((s, i) => s + i.quantidade, 0);

  it("total de Tês = nColunasLaterais = COLS (não SECTORS nem mais)", () => {
    expect(totalTees).toBe(COLS);
    expect(totalTees).not.toBe(SECTORS);
  });

  it("nColunasLaterais = COLS", () => {
    expect(bom.meta.nColunasLaterais).toBe(COLS);
  });

  it("tees50Source = 'physicalColumns'", () => {
    expect(bom.meta.tees50Source).toBe("physicalColumns");
  });

  it("comprimentoLateraisM usa comprimento físico real (não inflado por splitting)", () => {
    const expected = COLS * ((ROWS - 1) * SPACING + 0.5);
    expect(bom.meta.comprimentoLateraisM).toBeCloseTo(expected, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 9 — buildSectorsByFlow (colunas inteiras) NÃO é o padrão
//
// Para a mesma grade, buildSectorsByFlowWithColumnSplitting produz melhor
// balanceamento que buildSectorsByFlow.
// Este teste documenta que a função antiga não deve ser usada como padrão.
// ─────────────────────────────────────────────────────────────────────────────
describe("Suite 9 — buildSectorsByFlow (legado) produz pior balanceamento que a nova função", () => {
  // Grade onde o número de colunas não divide bem por setores
  // 13 colunas / 5 setores → colunas inteiras: 3/3/3/2/2 → ratio = 3/2 = 1.5
  const { positions, physCols } = makePhysCols(13, 10);
  const split = buildSectorsByFlowWithColumnSplitting(physCols, 5, VAZ, positions.length);
  const whole = buildSectorsByFlow(positions, 5, 0, CENTROID, SPACING, VAZ);

  it("splitting tem maxMinRatio < ratio das colunas inteiras", () => {
    const wholeMin = Math.min(...whole.vazaoPorSetor);
    const wholeMax = Math.max(...whole.vazaoPorSetor);
    const wholeRatio = wholeMin > 0 ? wholeMax / wholeMin : Infinity;
    expect(split.maxMinRatio).toBeLessThan(wholeRatio);
  });

  it("splitting tem desbalanceamentoPercent < 5% (colunas inteiras podem chegar a 50%+)", () => {
    expect(split.desbalanceamentoPercent).toBeLessThan(5);
  });

  it("grade uniforme: splitting produz todos os setores com mesma contagem ±1", () => {
    const minN = Math.min(...split.sprinklersPerSector);
    const maxN = Math.max(...split.sprinklersPerSector);
    expect(maxN - minN).toBeLessThanOrEqual(1);
  });
});
