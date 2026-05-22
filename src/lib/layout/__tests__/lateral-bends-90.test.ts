/**
 * TASK-035 — Testes da contagem de curvas 90° em laterais físicas (sub-laterais).
 *
 * Cobertura:
 *   A. Unidades puras de countLateralBends90
 *      T35-a: rota reta (length === 2)        → 0 curvas
 *      T35-b: 1 cotovelo 90°                  → 1 curva no DN
 *      T35-c: 2 cotovelos consecutivos (U)    → 2 curvas no DN
 *      T35-d: tolerância angular (87° conta; 84° não)
 *      T35-e: DNs distintos (50 e 75)         → agrupamento por DN
 *   B. Integração via buildBOM
 *      T35-f: DN75 com curva  → SKU 150174 precificado em itens; meta.curvas90LateraisCount === 1
 *      T35-g: DN50 com curva  → BOMPendingConnection (curva_90_lateral, sku_nao_catalogado); blocker "BOM incompleta" contém "curva 90° lateral"
 *      T35-h: Projeto-like pós-TASK-046 (todas retas) → 0 curvas, 0 pendência nova, BOM total inalterada
 */

import { describe, it, expect } from "vitest";
import { countLateralBends90 } from "@/lib/layout/physical-connections";
import { buildBOM, generateProposalDiagnostics } from "@/lib/bom";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import { generatePhysicalColumns, type PhysicalColumn } from "@/lib/layout/laterais";
import type { ConstructabilityReport } from "@/lib/layout/constructability";
import type { BOMInput } from "@/lib/bom";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING  = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
const M_PER_LAT = 111320;
const M_PER_LNG = M_PER_LAT * Math.cos((CENTROID.lat * Math.PI) / 180);

const EMPTY_CONSTRUCTABILITY: ConstructabilityReport = {
  controlPoints: [],
  columnDiagnostics: [],
  controlPointsCount: 0,
  pendingControlPointsCount: 0,
  independentFeedRequiredCount: 0,
  constructabilityStatus: "ok",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeGrid(cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      pts.push([
        CENTROID.lng + ((c - (cols - 1) / 2) * SPACING) / M_PER_LNG,
        CENTROID.lat + ((r - (rows - 1) / 2) * SPACING) / M_PER_LAT,
      ]);
    }
  }
  return pts;
}

function makeSectorIndices(cols: number, rows: number, nSectors: number): number[] {
  const idx: number[] = [];
  for (let c = 0; c < cols; c++) {
    const s = Math.floor((c * Math.min(nSectors, cols)) / cols);
    for (let r = 0; r < rows; r++) idx.push(s);
  }
  return idx;
}

/** Constrói uma PhysicalColumn real e substitui apenas seu routeCoords. */
function withRoute(
  baseCol: PhysicalColumn,
  route: [number, number][],
): PhysicalColumn {
  return { ...baseCol, routeCoords: route };
}

/** Gera N colunas físicas reais (DNs determinados pelo seletor) para uso como base. */
function makeRealColumns(cols: number, rows: number): PhysicalColumn[] {
  const positions = makeGrid(cols, rows);
  return generatePhysicalColumns(
    positions, 0, CENTROID, SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
}

/**
 * Constrói uma rota com 1 cotovelo 90°: 2 segmentos perpendiculares.
 * Trecho 1: vertical (subindo segLenM metros em Y).
 * Trecho 2: horizontal (deslocando segLenM metros em X).
 */
function makeRouteWithOneBend(segLenM: number): [number, number][] {
  const dLat = segLenM / M_PER_LAT;
  const dLng = segLenM / M_PER_LNG;
  return [
    [CENTROID.lng, CENTROID.lat],                     // A
    [CENTROID.lng, CENTROID.lat + dLat],              // B — vertice 90°
    [CENTROID.lng + dLng, CENTROID.lat + dLat],       // C
  ];
}

/**
 * Constrói uma rota em U com 2 cotovelos 90° consecutivos:
 *   vertical → horizontal → vertical
 */
function makeRouteWithTwoBends(segLenM: number): [number, number][] {
  const dLat = segLenM / M_PER_LAT;
  const dLng = segLenM / M_PER_LNG;
  return [
    [CENTROID.lng,           CENTROID.lat],
    [CENTROID.lng,           CENTROID.lat + dLat],            // bend 90°
    [CENTROID.lng + dLng,    CENTROID.lat + dLat],            // bend 90°
    [CENTROID.lng + dLng,    CENTROID.lat + 2 * dLat],
  ];
}

/**
 * Constrói uma rota com 1 cotovelo de deflexão definida.
 * vIn ao longo de +Y; vOut em ângulo `deflectionDeg` (medido em torno de Z).
 */
function makeRouteWithDeflection(deflectionDeg: number, segLenM: number): [number, number][] {
  const dLat = segLenM / M_PER_LAT;
  // Vetor B→C: rotacionar vetor (0, +1) por `deflectionDeg` (deflexão do vetor de entrada).
  const θ = (deflectionDeg * Math.PI) / 180;
  // vIn = (0, +1) em (x, y) metric. Rotação 2D: (sin θ, cos θ).
  const dxOut = Math.sin(θ) * segLenM;
  const dyOut = Math.cos(θ) * segLenM;
  return [
    [CENTROID.lng, CENTROID.lat],
    [CENTROID.lng, CENTROID.lat + dLat],
    [CENTROID.lng + dxOut / M_PER_LNG, CENTROID.lat + dLat + dyOut / M_PER_LAT],
  ];
}

function makeMinimalBOMInput(overrides: Partial<BOMInput> = {}): BOMInput {
  const COLS = 2, ROWS = 3;
  const positions = makeGrid(COLS, ROWS);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 1);
  const physCols = makeRealColumns(COLS, ROWS);
  return {
    sprinklers: {
      count:                 COLS * ROWS,
      vazaoProjetoM3PorHora: COLS * ROWS * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM:          SPACING,
    },
    sectorization: {
      setoresCount:           1,
      sectorIndices,
      vazaoPorSetorM3PorHora: COLS * ROWS * ASPERSOR_PADRAO.vazaoM3PorHora,
    },
    mainPipeline: {
      lengthMeters: (COLS - 1) * SPACING,
      segments:     COLS - 1,
    },
    physicalColumns:  physCols,
    laterais:         [],
    secondaries:      [],
    constructability: EMPTY_CONSTRUCTABILITY,
    centroid:         CENTROID,
    ...overrides,
  };
}

function makeMinimalLayout(): ProjectLayout {
  return {
    centroid: CENTROID,
    waterSource: { lng: CENTROID.lng - 0.003, lat: CENTROID.lat - 0.003 },
    sprinklers: {
      aspersorId:            ASPERSOR_PADRAO.sku,
      positions:             makeGrid(2, 3),
      count:                 6,
      vazaoProjetoM3PorHora: 6 * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM:          SPACING,
      gridAngleDegrees:      0,
      angleMode:             "auto",
    },
    sectorization: {
      jornadaHoras:           14,
      laminaMm:               10,
      setoresCount:           1,
      tempoPorSetorMinutos:   840,
      aspersoresPorSetor:     6,
      vazaoPorSetorM3PorHora: 6 * ASPERSOR_PADRAO.vazaoM3PorHora,
      sectorIndices:          makeSectorIndices(2, 3, 1),
    },
  } as ProjectLayout;
}

/** Recupera uma coluna base e mutaliza seu DN diretamente em `selecao.tubo.diametroMm`. */
function forceDnMm(col: PhysicalColumn, dnMm: number): PhysicalColumn {
  return {
    ...col,
    selecao: {
      ...col.selecao,
      tubo: { ...col.selecao.tubo, diametroMm: dnMm },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Unidades puras de countLateralBends90
// ─────────────────────────────────────────────────────────────────────────────

describe("T35-a..e — countLateralBends90 (unidades puras)", () => {
  it("T35-a: rota reta (routeCoords.length === 2) → byDnMm vazio, indeterminate = 0", () => {
    const cols = makeRealColumns(2, 3); // todas com routeCoords.length === 2 por construção
    for (const c of cols) expect(c.routeCoords.length).toBe(2);

    const r = countLateralBends90(cols, CENTROID);
    expect(r.byDnMm.size).toBe(0);
    expect(r.indeterminate).toBe(0);
  });

  it("T35-b: 1 cotovelo 90° em coluna DN75 → byDnMm.get(75) === 1", () => {
    const [base] = makeRealColumns(1, 3);
    const route = makeRouteWithOneBend(12);
    const col = withRoute(forceDnMm(base, 75), route);

    const r = countLateralBends90([col], CENTROID);
    expect(r.byDnMm.get(75)).toBe(1);
    expect(r.indeterminate).toBe(0);
  });

  it("T35-c: 2 cotovelos consecutivos (rota em U) → byDnMm.get(75) === 2", () => {
    const [base] = makeRealColumns(1, 3);
    const route = makeRouteWithTwoBends(12);
    const col = withRoute(forceDnMm(base, 75), route);

    const r = countLateralBends90([col], CENTROID);
    expect(r.byDnMm.get(75)).toBe(2);
    expect(r.indeterminate).toBe(0);
  });

  it("T35-d: tolerância angular — deflexão 87° conta; 84° não", () => {
    const [base] = makeRealColumns(1, 3);
    const dn75 = forceDnMm(base, 75);

    const colAt87 = withRoute(dn75, makeRouteWithDeflection(87, 12));
    const r87 = countLateralBends90([colAt87], CENTROID);
    expect(r87.byDnMm.get(75)).toBe(1);

    const colAt84 = withRoute(dn75, makeRouteWithDeflection(84, 12));
    const r84 = countLateralBends90([colAt84], CENTROID);
    expect(r84.byDnMm.size).toBe(0);
  });

  it("T35-e: 2 colunas com DNs distintos (50 e 75), cada uma com 1 cotovelo → 2 entradas em byDnMm", () => {
    const [base50, base75] = makeRealColumns(2, 3);
    const route = makeRouteWithOneBend(12);
    const col50 = withRoute(forceDnMm(base50, 50), route);
    const col75 = withRoute(forceDnMm(base75, 75), route);

    const r = countLateralBends90([col50, col75], CENTROID);
    expect(r.byDnMm.get(50)).toBe(1);
    expect(r.byDnMm.get(75)).toBe(1);
    expect(r.indeterminate).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Integração via buildBOM
// ─────────────────────────────────────────────────────────────────────────────

describe("T35-f..h — buildBOM integração", () => {
  it("T35-f: coluna DN75 com 1 cotovelo → SKU 150174 (CURVA 90 LF DN75) precificado", () => {
    const [base] = makeRealColumns(1, 3);
    const col = withRoute(forceDnMm(base, 75), makeRouteWithOneBend(12));

    const bom = buildBOM(makeMinimalBOMInput({
      physicalColumns: [col],
    }));

    const curvaLF75 = bom.itens.find((i) => i.sku === "150174");
    expect(curvaLF75).toBeDefined();
    expect(curvaLF75!.quantidade).toBe(1);
    expect(curvaLF75!.precoUnitario).toBeGreaterThan(0);
    expect(curvaLF75!.descricao.toLowerCase()).toContain("laterais");

    expect(bom.meta.curvas90LateraisCount).toBe(1);
    expect(bom.meta.curvas90LateraisSemSkuCount).toBe(0);

    // Não deve aparecer pendência de "curva_90_lateral"
    const pend = bom.meta.conexoesFisicasPendentes.filter(
      (c) => c.tipo === "curva_90_lateral",
    );
    expect(pend.length).toBe(0);
  });

  it("T35-g: coluna DN50 com 1 cotovelo → BOMPendingConnection (curva_90_lateral, sku_nao_catalogado) + blocker 'BOM incompleta' contém 'curva 90° lateral'", () => {
    const [base] = makeRealColumns(1, 3);
    const col = withRoute(forceDnMm(base, 50), makeRouteWithOneBend(12));

    const bom = buildBOM(makeMinimalBOMInput({
      physicalColumns: [col],
    }));

    // Nenhum item precificado de curva LF DN50 (não existe SKU)
    const itemCurva50 = bom.itens.find(
      (i) => i.categoria === "CONEXAO" && i.descricao.toLowerCase().includes("ø50mm (laterais)"),
    );
    expect(itemCurva50).toBeUndefined();

    // 1 pendência explícita
    const pend = bom.meta.conexoesFisicasPendentes.filter(
      (c) => c.tipo === "curva_90_lateral",
    );
    expect(pend.length).toBe(1);
    expect(pend[0].dnMm).toBe(50);
    expect(pend[0].quantidade).toBe(1);
    expect(pend[0].motivoPendencia).toBe("sku_nao_catalogado");

    expect(bom.meta.curvas90LateraisCount).toBe(0);
    expect(bom.meta.curvas90LateraisSemSkuCount).toBe(1);

    // Blocker "BOM incompleta" mencionando "curva 90° lateral"
    const diag = generateProposalDiagnostics(makeMinimalLayout(), bom);
    const blockerInc = diag.blockers.find((b) => b.startsWith("BOM incompleta"));
    expect(blockerInc).toBeDefined();
    expect(blockerInc!).toContain("curva 90° lateral");
  });

  it("T35-h: projeto-like pós-TASK-046 (todas laterais retas) → 0 curvas, 0 pendência nova, totalGeral inalterado pela TASK-035", () => {
    // Baseline: caminho feliz default — todas as routeCoords têm length === 2.
    const bomBaseline = buildBOM(makeMinimalBOMInput());

    // Invariantes da TASK-035
    expect(bomBaseline.meta.curvas90LateraisCount).toBe(0);
    expect(bomBaseline.meta.curvas90LateraisSemSkuCount).toBe(0);

    // Nenhuma pendência nova do tipo curva_90_lateral
    const pend = bomBaseline.meta.conexoesFisicasPendentes.filter(
      (c) => c.tipo === "curva_90_lateral",
    );
    expect(pend.length).toBe(0);

    // Nenhum item de "curva ... (laterais)" em itens
    const itensCurvaLateral = bomBaseline.itens.filter((i) =>
      i.descricao.toLowerCase().includes("(laterais)"),
    );
    expect(itensCurvaLateral.length).toBe(0);

    // totalGeral idêntico ao recalculado — TASK-035 não introduziu efeito colateral.
    const recomputed = bomBaseline.itens.reduce((s, i) => s + i.total, 0);
    expect(bomBaseline.totalGeral).toBeCloseTo(recomputed, 4);

    // Diagnostics: blocker "BOM incompleta" (se existir) não cita "curva 90° lateral".
    const diag = generateProposalDiagnostics(makeMinimalLayout(), bomBaseline);
    const blockerInc = diag.blockers.find((b) => b.startsWith("BOM incompleta"));
    if (blockerInc) {
      expect(blockerInc).not.toContain("curva 90° lateral");
    }
  });
});
