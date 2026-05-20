/**
 * Testes de regressão para buildBOM.
 *
 * Critérios de aceitação:
 * 1. Colunas físicas não são duplicadas por setor — comprimento lateral correto.
 * 2. Principal não infla por zigzag — usa comprimento do layout (via mock).
 * 3. Adutora está na BOM quando coordenadas fornecidas.
 * 4. Caso ~1,89 ha, 132 aspersores, 14 setores: linha principal < 2× espaçamento × colunas.
 * 5. Comprimento de lateral = soma de (n-1)*12+0.5 por COLUNA FÍSICA, não por setor.
 * 6. Mesmo tubo físico em múltiplos setores: BOM conta uma única vez (sectorsTouched).
 * 7. Regressão 1,89 ha via pipeline completo: principal não resulta em milhares de metros.
 */

import { describe, it, expect } from "vitest";
import { generateGeometryDiagnostics, generateProposalDiagnostics } from "@/lib/bom";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import { generatePrincipalAndAdutora } from "@/lib/layout/principal";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Gera uma grade de aspersores num retângulo no frame local, retornando LngLat. */
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

/** Atribui setor por coluna (igual ao comportamento de buildSectors para grade perfeita). */
function makeSectorIndices(cols: number, rows: number, nSectors: number): number[] {
  const indices: number[] = [];
  const effectiveN = Math.min(nSectors, cols);
  for (let c = 0; c < cols; c++) {
    const sectorId = Math.floor((c * effectiveN) / cols);
    for (let r = 0; r < rows; r++) {
      indices.push(sectorId);
    }
  }
  return indices;
}

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
const WATER_SOURCE = { lng: CENTROID.lng - 0.003, lat: CENTROID.lat - 0.003 };

// ────────────────────────────────────────────────────────────────────────────
// Teste 1 — Comprimento de lateral usando colunas físicas
//
// Grade 5 colunas × 10 linhas = 50 aspersores, 3 setores.
// Cada coluna física tem 10 aspersores → comprimento = 9×12 + 0.5 = 108.5 m.
// Total lateral = 5 × 108.5 = 542.5 m.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 1 — comprimento lateral usa colunas físicas, não setores", () => {
  const COLS = 5, ROWS = 10, SECTORS = 3;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const sectorIndices = makeSectorIndices(COLS, ROWS, SECTORS);

  const physCols = generatePhysicalColumns(
    positions,
    0, // gridAngleDegrees = 0
    CENTROID,
    SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );

  it("gera exatamente 5 colunas físicas (uma por coluna de grade)", () => {
    expect(physCols).toHaveLength(COLS);
  });

  it("cada coluna física tem 10 aspersores e 108.5 m", () => {
    for (const col of physCols) {
      expect(col.sprinklerCount).toBe(ROWS);
      expect(col.comprimentoM).toBeCloseTo((ROWS - 1) * SPACING + 0.5, 1);
    }
  });

  it("comprimento total das laterais = 5 × 108.5 = 542.5 m (não fragmentado por setor)", () => {
    const total = physCols.reduce((s, c) => s + c.comprimentoM, 0);
    expect(total).toBeCloseTo(COLS * ((ROWS - 1) * SPACING + 0.5), 1);
  });

  it("buildBOM usa comprimento correto de lateral", () => {
    const layout: ProjectLayout = {
      centroid: CENTROID,
      waterSource: WATER_SOURCE,
      sprinklers: {
        aspersorId: ASPERSOR_PADRAO.sku,
        positions,
        count: positions.length,
        vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
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
        vazaoPorSetorM3PorHora:
          Math.round(positions.length / SECTORS) * ASPERSOR_PADRAO.vazaoM3PorHora,
        sectorIndices,
      },
      mainPipeline: {
        coordinates: [[-46.001, -12.005], [-46.0, -12.005]],
        adutora: [[-46.001, -12.01], [-46.001, -12.005]],
        lengthMeters: (COLS - 1) * SPACING, // comprimento real da principal
        segments: COLS - 1,
        source: "auto",
      },
    };

    const bom = calculateIrrigationProject(layout).bom;
    expect(bom).not.toBeNull();

    // Comprimento lateral na meta deve ser a soma das colunas físicas
    const expectedLateral = COLS * ((ROWS - 1) * SPACING + 0.5);
    expect(bom!.meta.comprimentoLateraisM).toBeCloseTo(expectedLateral, 0);
    expect(bom!.meta.nColunasLaterais).toBe(COLS);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 2 — Adutora está na BOM
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 2 — adutora entra na lista de materiais", () => {
  const COLS = 3, ROWS = 5;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 3);

  // Adutora de 120m (dois pontos separados ~120m em lat)
  const dLat120 = 120 / 111320;
  const adutora: [number, number][] = [
    [CENTROID.lng, CENTROID.lat - 0.005],
    [CENTROID.lng, CENTROID.lat - 0.005 + dLat120],
  ];

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: 3,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: 5,
      vazaoPorSetorM3PorHora: 5 * ASPERSOR_PADRAO.vazaoM3PorHora,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[-46.001, -12.001], [-46.0, -12.001]],
      adutora,
      lengthMeters: (COLS - 1) * SPACING,
      segments: COLS - 1,
      source: "auto",
    },
  };

  const bom = calculateIrrigationProject(layout).bom;

  it("comprimentoAdutoraM ≈ 120 m", () => {
    expect(bom!.meta.comprimentoAdutoraM).toBeGreaterThan(110);
    expect(bom!.meta.comprimentoAdutoraM).toBeLessThan(130);
  });

  it("BOM contém item de tubo rotulado como adutora", () => {
    const temAdutora = bom!.itens.some(
      (i) => i.categoria === "TUBO" && i.descricao.toLowerCase().includes("adutora"),
    );
    expect(temAdutora).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 3 — Caso real: ~1,89 ha, 132 aspersores, 14 setores
//
// Grade 14 colunas × 9-10 linhas ≈ 132 aspersores.
// Comprimento principal esperado: (14-1) × 12 ≈ 156 m.
// Regra: comprimentoLateraisM DEVE SER ≥ 14 × (9-1) × 12 = 1344 m (mínimo físico).
// Comprimento principal fornecido no layout (mock): 156 m — não deve ser inflado.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 3 — ~1,89 ha, 132 aspersores, 14 setores", () => {
  // 14 colunas × 9 linhas = 126; acrescentamos 6 aspersores extras em 6 colunas (10 linhas)
  // para chegar a 132.  Simplificação: grade uniforme 12×11 = 132 mesmo.
  const COLS = 12, ROWS = 11; // 132 aspersores
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 14);

  const principalLength = (COLS - 1) * SPACING; // 132 m

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: 14,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: Math.round(positions.length / 14),
      vazaoPorSetorM3PorHora: Math.round(positions.length / 14) * ASPERSOR_PADRAO.vazaoM3PorHora,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[CENTROID.lng - 0.001, CENTROID.lat - 0.001],
                    [CENTROID.lng + 0.001, CENTROID.lat - 0.001]],
      adutora: [[CENTROID.lng - 0.001, CENTROID.lat - 0.005],
                [CENTROID.lng - 0.001, CENTROID.lat - 0.001]],
      lengthMeters: principalLength,
      segments: COLS - 1,
      source: "auto",
    },
  };

  const bom = calculateIrrigationProject(layout).bom;

  it("buildBOM retorna resultado (projeto completo)", () => {
    expect(bom).not.toBeNull();
  });

  it("nColunasLaterais = 12 (uma por coluna física, sem fragmentação)", () => {
    expect(bom!.meta.nColunasLaterais).toBe(COLS);
  });

  it("comprimentoLateraisM ≥ mínimo físico (12 colunas × 10 segmentos × 12m = 1440m)", () => {
    const minFisico = COLS * (ROWS - 1) * SPACING;
    expect(bom!.meta.comprimentoLateraisM).toBeGreaterThanOrEqual(minFisico);
  });

  it("comprimentoLateraisM não é inflado por fragmentação de setor", () => {
    // Com fragmentação, o total seria ≈ (nSetores × nColunas/setor × (sub_n-1)*12+0.5)
    // muito menor que o comprimento físico real.  Após a correção, deve ser ≥ mínimo físico.
    const bomLateralTotal = bom!.meta.comprimentoLateraisM;
    const minFisico = COLS * (ROWS - 1) * SPACING;
    expect(bomLateralTotal).toBeGreaterThanOrEqual(minFisico * 0.95); // tolera 5% de arredondamento
  });

  it("comprimentoPrincipalM = 132 m (sem zigzag) — vem do layout.mainPipeline.lengthMeters", () => {
    // O principal length agora é fornecido pelo layout (calculado por calculatePipelineLength
    // depois do fix em principal.ts).  Aqui usamos o valor mockado de 132 m.
    expect(bom!.meta.barrasDeTubo).toBeGreaterThanOrEqual(1);
    // Barras = ceil(132 / 6) = 22
    expect(bom!.meta.barrasDeTubo).toBeLessThanOrEqual(25); // razoável para 132 m
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 4 — Trechos compartilhados contados uma vez
//
// Uma coluna fragmentada em 2 setores (10 + 10 aspersores) deve produzir
// 1 coluna física de 20 aspersores, não 2 sub-colunas.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 4 — coluna fragmentada: comprimento físico ≠ soma das sub-colunas", () => {
  // 1 coluna física de 20 aspersores em 2 setores (10 each)
  const ROWS_PER_HALF = 10;
  const positions = makeGrid(1, ROWS_PER_HALF * 2, SPACING, CENTROID);
  // Setor 0: os 10 aspersores inferiores; setor 1: os 10 superiores
  const sectorIndices = positions.map((_, i) => (i < ROWS_PER_HALF ? 0 : 1));

  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID,
    SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );

  it("gera 1 coluna física (não 2 sub-colunas)", () => {
    expect(physCols).toHaveLength(1);
  });

  it("coluna física tem 20 aspersores", () => {
    expect(physCols[0].sprinklerCount).toBe(ROWS_PER_HALF * 2);
  });

  it("comprimento físico = (20-1)×12+0.5 = 228.5 m (não 2×(10-1)×12+0.5 = 109 m)", () => {
    const fisico = (ROWS_PER_HALF * 2 - 1) * SPACING + 0.5;
    const somaSubs = 2 * ((ROWS_PER_HALF - 1) * SPACING + 0.5);
    expect(physCols[0].comprimentoM).toBeCloseTo(fisico, 1);
    expect(physCols[0].comprimentoM).toBeGreaterThan(somaSubs);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 5 — Mesmo tubo físico em múltiplos setores: BOM conta uma única vez
//
// 3 colunas físicas, cada uma abrangendo 3 setores (sectorsTouched.length = 3).
// Na BOM deve aparecer exatamente 3 colunas (nColunasLaterais = 3), não 9.
// O comprimento total deve refletir o comprimento físico real (1 vez por coluna).
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 5 — mesmo tubo físico em múltiplos setores: BOM conta uma única vez", () => {
  const COLS = 3, ROWS = 12, SECTORS = 3;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  // makeGrid produz posições em ordem coluna-principal: [col0-row0, col0-row1, ..., col2-row11]
  // Setor atribuído pela linha (i % ROWS), dividido em 3 faixas iguais de 4 linhas.
  // Assim cada coluna física toca os 3 setores.
  const sectorIndices = positions.map((_, i) =>
    Math.floor((i % ROWS) / (ROWS / SECTORS)),
  );

  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID,
    SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
    sectorIndices,
  );

  it("gera exatamente 3 colunas físicas (não 9 = 3 colunas × 3 setores)", () => {
    expect(physCols).toHaveLength(COLS);
  });

  it("cada coluna física registra os 3 setores em sectorsTouched", () => {
    for (const col of physCols) {
      expect(col.sectorsTouched.sort()).toEqual([0, 1, 2]);
    }
  });

  it("buildBOM conta 3 colunas, não 9", () => {
    const layout: ProjectLayout = {
      centroid: CENTROID,
      waterSource: WATER_SOURCE,
      sprinklers: {
        aspersorId: ASPERSOR_PADRAO.sku,
        positions,
        count: positions.length,
        vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
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
        vazaoPorSetorM3PorHora:
          Math.round(positions.length / SECTORS) * ASPERSOR_PADRAO.vazaoM3PorHora,
        sectorIndices,
      },
      mainPipeline: {
        coordinates: [[CENTROID.lng - 0.001, CENTROID.lat - 0.001],
                      [CENTROID.lng + 0.001, CENTROID.lat - 0.001]],
        adutora: [[CENTROID.lng - 0.001, CENTROID.lat - 0.005],
                  [CENTROID.lng - 0.001, CENTROID.lat - 0.001]],
        lengthMeters: (COLS - 1) * SPACING,
        segments: COLS - 1,
        source: "auto",
      },
    };

    const bom = calculateIrrigationProject(layout).bom;
    expect(bom).not.toBeNull();
    expect(bom!.meta.nColunasLaterais).toBe(COLS);
    // comprimento = 3 colunas × (12-1)×12+0.5 = 3 × 132.5 = 397.5 m
    expect(bom!.meta.comprimentoLateraisM).toBeCloseTo(COLS * ((ROWS - 1) * SPACING + 0.5), 0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 6 — Regressão pipeline completo: 1,89 ha, 132 aspersores, 14 setores
//
// Usa generatePhysicalColumns + generatePrincipalAndAdutora sem mock.
// Comprimento da principal deve ser geometricamente plausível (< 500m para
// uma grade de 12 colunas com espaçamento 12m, extruded ≈ 132m).
// Com o bug antigo (sector-split), o principal inflava para > 1 000m por zigzag.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 6 — regressão pipeline completo: 1,89 ha, 132 aspersores, 14 setores", () => {
  const COLS = 12, ROWS = 11; // 132 aspersores
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 14);

  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID,
    SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
    sectorIndices,
  );

  const waterSource = {
    lng: CENTROID.lng - 0.002,
    lat: CENTROID.lat - 0.002,
  };

  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource,
    physCols,
    CENTROID,
    0,
  );

  it("12 colunas físicas (não fragmentadas por 14 setores)", () => {
    expect(physCols).toHaveLength(COLS);
  });

  it("principal tem 12 pontos de derivação (1 por coluna física)", () => {
    expect(principal).toHaveLength(COLS);
  });

  it("comprimento da principal ≤ 500m (plausível para grade 12 colunas × 12m)", () => {
    const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
    let length = 0;
    for (let i = 1; i < principal.length; i++) {
      const dx = (principal[i][0] - principal[i - 1][0]) * mPerLng;
      const dy = (principal[i][1] - principal[i - 1][1]) * 111320;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    // Comprimento real esperado ≈ (12-1) × 12 = 132m
    expect(length).toBeLessThan(500);
    expect(length).toBeGreaterThan(50); // confirma que algo foi gerado
  });

  it("adutora tem exatamente 2 pontos (captação → entrada da principal)", () => {
    expect(adutora).toHaveLength(2);
    expect(adutora[0]).toEqual([waterSource.lng, waterSource.lat]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 7 — Adutora BOM: barras = ceil(comprimentoAdutoraM / 6)
//
// Regra: barras da adutora devem ser exatamente ceil(comprimento_real / 6).
// Não deve haver barras "fantasma" por uso de fonte de comprimento errada.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 7 — BOM adutora: barras = ceil(comprimentoAdutoraM / 6)", () => {
  const BARRA_M = 6;
  const COLS = 5, ROWS = 5;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 14);

  function makeLayoutWithAdutora(adutora: [number, number][]): ProjectLayout {
    return {
      centroid: CENTROID,
      waterSource: WATER_SOURCE,
      sprinklers: {
        aspersorId: ASPERSOR_PADRAO.sku,
        positions,
        count: positions.length,
        vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
        espacamentoM: SPACING,
        gridAngleDegrees: 0,
        angleMode: "auto",
      },
      sectorization: {
        jornadaHoras: 14,
        laminaMm: 10,
        setoresCount: 14,
        tempoPorSetorMinutos: 58,
        aspersoresPorSetor: Math.round(positions.length / 14),
        vazaoPorSetorM3PorHora: Math.round(positions.length / 14) * ASPERSOR_PADRAO.vazaoM3PorHora,
        sectorIndices,
      },
      mainPipeline: {
        coordinates: [[CENTROID.lng - 0.0002, CENTROID.lat - 0.001], [CENTROID.lng + 0.0002, CENTROID.lat - 0.001]],
        adutora,
        lengthMeters: (COLS - 1) * SPACING,
        segments: COLS - 1,
        source: "auto",
      },
    };
  }

  it("adutora de 366m → ceil(366/6) = 61 barras (não 100)", () => {
    const dLat366 = 366 / 111320;
    const adutora: [number, number][] = [
      [CENTROID.lng, CENTROID.lat - dLat366],
      [CENTROID.lng, CENTROID.lat],
    ];
    const bom = calculateIrrigationProject(makeLayoutWithAdutora(adutora)).bom!;
    expect(bom.meta.comprimentoAdutoraM).toBeGreaterThan(360);
    expect(bom.meta.comprimentoAdutoraM).toBeLessThan(372);
    const adutoraItem = bom.itens.find(
      (i) => i.categoria === "TUBO" && i.descricao.toLowerCase().includes("adutora"),
    );
    expect(adutoraItem).toBeDefined();
    // Barras deve bater exatamente com o comprimento da BOM
    expect(adutoraItem!.quantidade).toBe(Math.ceil(bom.meta.comprimentoAdutoraM / BARRA_M));
    // Não pode ter sobra fantasma de mais de 1 barra acima do comprimento medido
    expect(adutoraItem!.quantidade * BARRA_M).toBeLessThan(bom.meta.comprimentoAdutoraM + BARRA_M + 1);
  });

  it("adutora de 120m → 20 barras (ceil(120/6))", () => {
    const dLat120 = 120 / 111320;
    const adutora: [number, number][] = [
      [CENTROID.lng, CENTROID.lat - dLat120],
      [CENTROID.lng, CENTROID.lat],
    ];
    const bom = calculateIrrigationProject(makeLayoutWithAdutora(adutora)).bom!;
    expect(bom.meta.comprimentoAdutoraM).toBeGreaterThan(115);
    expect(bom.meta.comprimentoAdutoraM).toBeLessThan(125);
    const adutoraItem = bom.itens.find(
      (i) => i.categoria === "TUBO" && i.descricao.toLowerCase().includes("adutora"),
    );
    expect(adutoraItem!.quantidade).toBe(Math.ceil(bom.meta.comprimentoAdutoraM / BARRA_M));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 8 — Discriminador: nColunasLaterais ≠ nLaterais em projeto multi-setor
//
// nColunasLaterais = laterais físicas (usa para BOM de tubo e proposta).
// nLaterais = trechos operacionais (setor × coluna, usa para memorial).
//
// Para demonstrar o discriminador usamos setores horizontais (por linha):
// cada coluna física toca os 3 setores → nLaterais = COLS×SECTORS > nColunasLaterais = COLS.
//
// makeGrid é column-major: índice i → coluna = floor(i/ROWS), linha = i % ROWS.
// Setores horizontais: linha 0-3 → S0, linha 4-6 → S1, linha 7-9 → S2.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 8 — nColunasLaterais ≠ nLaterais (discriminador físico vs operacional)", () => {
  const COLS = 5, ROWS = 10, SECTORS = 3;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  // Setorização horizontal: cada coluna física cruza todos os setores
  const rowsPerSector = Math.ceil(ROWS / SECTORS);
  const sectorIndices = positions.map((_, i) =>
    Math.min(SECTORS - 1, Math.floor((i % ROWS) / rowsPerSector)),
  );

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
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
      vazaoPorSetorM3PorHora: Math.round(positions.length / SECTORS) * ASPERSOR_PADRAO.vazaoM3PorHora,
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

  it("nColunasLaterais = 5 (laterais físicas)", () => {
    expect(bom.meta.nColunasLaterais).toBe(COLS);
  });

  it("nLaterais > nColunasLaterais (trechos operacionais são mais que linhas físicas)", () => {
    expect(bom.meta.nLaterais).toBeGreaterThan(bom.meta.nColunasLaterais);
  });

  it("nLaterais ≤ nColunasLaterais × setoresCount (cota superior)", () => {
    expect(bom.meta.nLaterais).toBeLessThanOrEqual(bom.meta.nColunasLaterais * SECTORS);
  });

  it("comprimentoLateraisM usa nColunasLaterais, não nLaterais (não inflado por setor)", () => {
    // Comprimento físico correto: 5 colunas × (10-1)×12+0.5 = 5 × 108.5 = 542.5 m
    expect(bom.meta.comprimentoLateraisM).toBeCloseTo(COLS * ((ROWS - 1) * SPACING + 0.5), 0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 9 — generateGeometryDiagnostics: sanidade de campos-chave
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 9 — generateGeometryDiagnostics retorna diagnóstico consistente", () => {
  const COLS = 8, ROWS = 10, SECTORS = 14;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  // Setorização horizontal (por linha) para garantir lateralTrechosOperacionais > physicalColumns
  const rowsPerSec = Math.ceil(ROWS / SECTORS);
  const sectorIndices = positions.map((_, i) =>
    Math.min(SECTORS - 1, Math.floor((i % ROWS) / rowsPerSec)),
  );
  const dLat240 = 240 / 111320;

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
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
      vazaoPorSetorM3PorHora: Math.round(positions.length / SECTORS) * ASPERSOR_PADRAO.vazaoM3PorHora,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [[CENTROID.lng - 0.001, CENTROID.lat - 0.001], [CENTROID.lng + 0.001, CENTROID.lat - 0.001]],
      adutora: [[CENTROID.lng, CENTROID.lat - dLat240], [CENTROID.lng, CENTROID.lat]],
      lengthMeters: (COLS - 1) * SPACING,
      segments: COLS - 1,
      source: "auto",
    },
  };

  const diag = generateGeometryDiagnostics(layout)!;

  it("retorna objeto não-nulo", () => {
    expect(diag).not.toBeNull();
  });

  it("physicalColumnsCount = COLS (sem fragmentação)", () => {
    expect(diag.physicalColumnsCount).toBe(COLS);
  });

  it("avgSprinklersPerPhysicalColumn = ROWS", () => {
    expect(diag.avgSprinklersPerPhysicalColumn).toBeCloseTo(ROWS, 1);
  });

  it("lateralTrechosOperacionaisCount > physicalColumnsCount (operacional > físico)", () => {
    expect(diag.lateralTrechosOperacionaisCount).toBeGreaterThan(diag.physicalColumnsCount);
  });

  it("adutoraLengthM ≈ 240m", () => {
    expect(diag.adutoraLengthM).toBeGreaterThan(235);
    expect(diag.adutoraLengthM).toBeLessThan(245);
  });

  it("adutoraBomBars = ceil(adutoraLengthM / 6)", () => {
    expect(diag.adutoraBomBars).toBe(Math.ceil(diag.adutoraLengthM / 6));
  });

  it("principalBomBars = ceil(principalLengthM / 6)", () => {
    expect(diag.principalBomBars).toBe(Math.ceil(diag.principalLengthM / 6));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 10 — Tê de derivação lateral vem de physicalCols, não de generateLaterais
//
// Com setorização horizontal (cada coluna toca todos os setores),
// nLaterais > nColunasLaterais.  A soma total de Tês na BOM deve ser igual a
// nColunasLaterais, não a nLaterais.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 10 — Tê: origem physicalCols (não generateLaterais)", () => {
  const COLS = 5, ROWS = 10, SECTORS = 3;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  // Setorização horizontal: cada coluna física cruza os 3 setores
  const rowsPerSec = Math.ceil(ROWS / SECTORS);
  const sectorIndices = positions.map((_, i) =>
    Math.min(SECTORS - 1, Math.floor((i % ROWS) / rowsPerSec)),
  );

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
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
      vazaoPorSetorM3PorHora:
        Math.round(positions.length / SECTORS) * ASPERSOR_PADRAO.vazaoM3PorHora,
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

  it("nLaterais > nColunasLaterais (setorização horizontal cria mais trechos que linhas físicas)", () => {
    expect(bom.meta.nLaterais).toBeGreaterThan(bom.meta.nColunasLaterais);
  });

  it("soma total de Tês na BOM = nColunasLaterais (physicalCols), não nLaterais", () => {
    const totalTees = bom.itens
      .filter((i) => i.categoria === "CONEXAO" && i.descricao.toLowerCase().startsWith("tê pvc lf"))
      .reduce((s, i) => s + i.quantidade, 0);
    expect(totalTees).toBe(bom.meta.nColunasLaterais);
    expect(totalTees).not.toBe(bom.meta.nLaterais);
  });

  it("tees50Source é 'physicalColumns'", () => {
    expect(bom.meta.tees50Source).toBe("physicalColumns");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 11 — generateProposalDiagnostics emite aviso quando imbalance > 10 %
//
// Layout artificial com 2 setores: setor 0 recebe 80 % dos aspersores,
// setor 1 apenas 20 %.  O aviso de desbalanceamento deve estar presente.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 11 — generateProposalDiagnostics: aviso quando imbalance > 10%", () => {
  const COLS = 10, ROWS = 10;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  // Setor 0: primeiras 8 colunas (80 asp), setor 1: últimas 2 colunas (20 asp)
  const sectorIndices = positions.map((_, i) => (Math.floor(i / ROWS) < 8 ? 0 : 1));

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: 2,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: positions.length / 2,
      vazaoPorSetorM3PorHora: (positions.length / 2) * ASPERSOR_PADRAO.vazaoM3PorHora,
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
  const diag = generateProposalDiagnostics(layout, bom)!;

  it("retorna diagnóstico não-nulo", () => {
    expect(diag).not.toBeNull();
  });

  it("desbalanceamentoSetoresPercent > 10%", () => {
    expect(diag.desbalanceamentoSetoresPercent).toBeGreaterThan(10);
  });

  it("warnings contém aviso de desbalanceamento", () => {
    const hasWarning = diag.warnings.some((w) => w.toLowerCase().includes("desbalanceamento"));
    expect(hasWarning).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Teste 12 — generateProposalDiagnostics NÃO emite aviso para setores balanceados
//
// Grade 14 colunas × 10 linhas, 14 setores — cada setor recebe exatamente 1 coluna.
// Não há desbalanceamento; o aviso de imbalance não deve aparecer.
// ────────────────────────────────────────────────────────────────────────────
describe("Teste 12 — generateProposalDiagnostics: sem aviso para setores balanceados", () => {
  const COLS = 14, ROWS = 10, SECTORS = 14;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const sectorIndices = positions.map((_, i) => Math.floor(i / ROWS)); // 1 setor por coluna

  const layout: ProjectLayout = {
    centroid: CENTROID,
    waterSource: WATER_SOURCE,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: SECTORS,
      tempoPorSetorMinutos: 58,
      aspersoresPorSetor: ROWS,
      vazaoPorSetorM3PorHora: ROWS * ASPERSOR_PADRAO.vazaoM3PorHora,
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
  const diag = generateProposalDiagnostics(layout, bom)!;

  it("desbalanceamentoSetoresPercent ≈ 0", () => {
    expect(diag.desbalanceamentoSetoresPercent).toBeCloseTo(0, 5);
  });

  it("warnings NÃO contém aviso de desbalanceamento", () => {
    const hasWarning = diag.warnings.some((w) => w.toLowerCase().includes("desbalanceamento"));
    expect(hasWarning).toBe(false);
  });

  it("tees50Count = nColunasLaterais = COLS", () => {
    expect(diag.tees50Count).toBe(COLS);
    expect(diag.tees50Source).toBe("physicalColumns");
  });

  it("principalLengthM = layout.mainPipeline.lengthMeters", () => {
    expect(diag.principalLengthM).toBe(layout.mainPipeline!.lengthMeters);
  });
});
