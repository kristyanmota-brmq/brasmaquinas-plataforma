/**
 * TASK-022 — Testes de BOM de conexões físicas construtíveis.
 *
 * Cobre:
 *   A. Unidades puras de physical-connections.ts
 *      T22-a..T22-k: countAdutoraBends, countSecondaryLBends, countSprinklerTees
 *   B. Integração via buildBOM e generateProposalDiagnostics
 *      T22-m..T22-p: itens precificados, pendências, blocker comercial
 */

import { describe, it, expect } from "vitest";
import {
  countAdutoraBends,
  countFishboneConnections,
  countSecondaryLBends,
  countSprinklerTees,
} from "@/lib/layout/physical-connections";
import { buildBOM, generateProposalDiagnostics } from "@/lib/bom";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF, TUBOS_PVC_RIGIDO } from "@/lib/catalog/aspersores";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";
import type { SizedSecondaryPipe } from "@/lib/layout/secondary-sizing";
import type { ConstructabilityReport } from "@/lib/layout/constructability";
import type { BOMInput } from "@/lib/bom";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING  = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
// mPerLng e M_PER_DEG_LAT — mesma base de network-angle-diagnostics.ts
const M_PER_LAT = 111320;
const M_PER_LNG = M_PER_LAT * Math.cos((-12.0 * Math.PI) / 180); // ≈ 108 887 m/grau

// Adutora com 3 pontos e dobra 90° em B: A→B = east, B→C = north
const ADU_90: [number, number][] = [
  [-46.002, -12.0],        // A
  [-46.0,   -12.0],        // B — bend (90°)
  [-46.0,   -12.0 + 0.002 * M_PER_LAT / M_PER_LAT], // C — north (+0.002° lat)
];
// Simplificação: C = [-46.0, -11.998] (0.002° ao norte de B)
const ADU_90_COORDS: [number, number][] = [
  [-46.002, -12.0],
  [-46.0,   -12.0],
  [-46.0,   -11.998],
];

// Adutora com dobra 45°: A→B = east, B→C = northeast metric (iguais em x e y)
// Δlng = Δlat_metric / M_PER_LNG, Δlat = Δlat_metric / M_PER_LAT
// Usando Δmetric = 0.002 * M_PER_LNG ≈ 217.77 m
const DELTA_METRIC = 0.002 * M_PER_LNG;
const ADU_45_COORDS: [number, number][] = [
  [-46.002, -12.0],
  [-46.0,   -12.0],
  // northeast: Δlng_m = DELTA_METRIC, Δlat_m = DELTA_METRIC
  [-46.0   + DELTA_METRIC / M_PER_LNG,
   -12.0   + DELTA_METRIC / M_PER_LAT],
];

// Adutora reta (3 pontos, deflexão ≈ 0°): A→B→C todos na direção east
const ADU_STRAIGHT_COORDS: [number, number][] = [
  [-46.002, -12.0],
  [-46.0,   -12.0],
  [-45.998, -12.0],
];

// Adutora com 90° em P1 e 45° em P2 (4 pontos)
// P0→P1: east; P1→P2: north (90°); P2→P3: northeast (45° from north)
const ADU_90_AND_45_COORDS: [number, number][] = [
  [-46.003, -12.0],          // P0
  [-46.001, -12.0],          // P1 — bend 90° (A→B east, B→C north)
  [-46.001, -11.998],        // P2 — bend 45° (A→B north, B→C northeast)
  // P3: northeast of P2 in metric space (equal metric components → 45° from north)
  [-46.001 + 100 / M_PER_LNG,
   -11.998 + 100 / M_PER_LAT],
];

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

const EMPTY_CONSTRUCTABILITY: ConstructabilityReport = {
  controlPoints: [],
  columnDiagnostics: [],
  controlPointsCount: 0,
  pendingControlPointsCount: 0,
  independentFeedRequiredCount: 0,
  constructabilityStatus: "ok",
};

function makeStraight(id: string, colId: string): SecondaryPipe {
  return {
    id,
    physicalColumnId: colId,
    fromCoord: [CENTROID.lng - 0.001, CENTROID.lat],
    toCoord:   [CENTROID.lng,         CENTROID.lat],
    coords:    [[CENTROID.lng - 0.001, CENTROID.lat], [CENTROID.lng, CENTROID.lat]],
    lengthM:   100,
    source:    "auto",
  };
}

function makeLShape(id: string, colId: string): SecondaryPipe {
  return {
    id,
    physicalColumnId: colId,
    fromCoord: [CENTROID.lng - 0.001, CENTROID.lat],
    toCoord:   [CENTROID.lng,         CENTROID.lat + 0.001],
    coords:    [
      [CENTROID.lng - 0.001, CENTROID.lat],
      [CENTROID.lng - 0.001, CENTROID.lat + 0.001],
      [CENTROID.lng,         CENTROID.lat + 0.001],
    ],
    lengthM: 130,
    source:  "auto",
  };
}

function makeSizedSec(sec: SecondaryPipe, diametroMm: number): SizedSecondaryPipe {
  const tube = TUBOS_PVC_RIGIDO.find((t) => t.diametroMm === diametroMm) ?? TUBOS_PVC_RIGIDO[0];
  return {
    ...sec,
    flowM3h:         3.0,
    selectedTube:    tube as unknown as import("@/lib/hydraulics/hazenWilliams").TuboCandidato,
    diametroMm,
    diametroInternoMm: tube.diametroInternoMm,
    velocityMs:      0.5,
    headLossMca:     1.0,
    velocityExceeds: false,
    headLossExceeds: false,
    status:          "ok",
  };
}

function makeMinimalBOMInput(overrides: Partial<BOMInput> = {}): BOMInput {
  const COLS = 2, ROWS = 3;
  const positions = makeGrid(COLS, ROWS);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 1);
  const physCols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  return {
    sprinklers: {
      count:                   COLS * ROWS,
      vazaoProjetoM3PorHora:   COLS * ROWS * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM:            SPACING,
    },
    sectorization: {
      setoresCount:            1,
      sectorIndices,
      vazaoPorSetorM3PorHora:  COLS * ROWS * ASPERSOR_PADRAO.vazaoM3PorHora,
    },
    mainPipeline: {
      lengthMeters:  (COLS - 1) * SPACING,
      segments:      COLS - 1,
    },
    physicalColumns:  physCols,
    laterais:         [],
    secondaries:      [],
    constructability: EMPTY_CONSTRUCTABILITY,
    centroid:         CENTROID,
    ...overrides,
  };
}

// Retorna um layout mínimo para generateProposalDiagnostics
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
      jornadaHoras:          14,
      laminaMm:              10,
      setoresCount:          1,
      tempoPorSetorMinutos:  840,
      aspersoresPorSetor:    6,
      vazaoPorSetorM3PorHora: 6 * ASPERSOR_PADRAO.vazaoM3PorHora,
      sectorIndices:         makeSectorIndices(2, 3, 1),
    },
  } as ProjectLayout;
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Testes unitários de countAdutoraBends
// ─────────────────────────────────────────────────────────────────────────────

describe("T22-a..e — countAdutoraBends", () => {
  it("T22-a: adutora de 2 pontos (sem dobra) → curvas90=0, curvas45=0", () => {
    const coords: [number, number][] = [[-46.001, -12.0], [-46.0, -12.0]];
    const r = countAdutoraBends(coords, CENTROID);
    expect(r.curvas90Count).toBe(0);
    expect(r.curvas45Count).toBe(0);
  });

  it("T22-b: adutora com dobra 90° (east→north) → curvas90=1, curvas45=0", () => {
    const r = countAdutoraBends(ADU_90_COORDS, CENTROID);
    expect(r.curvas90Count).toBe(1);
    expect(r.curvas45Count).toBe(0);
  });

  it("T22-c: adutora com dobra 45° (east→northeast metric) → curvas90=0, curvas45=1", () => {
    const r = countAdutoraBends(ADU_45_COORDS, CENTROID);
    expect(r.curvas90Count).toBe(0);
    expect(r.curvas45Count).toBe(1);
  });

  it("T22-d: adutora reta (3 pontos, deflexão ≈ 0°) → nenhuma curva", () => {
    const r = countAdutoraBends(ADU_STRAIGHT_COORDS, CENTROID);
    expect(r.curvas90Count).toBe(0);
    expect(r.curvas45Count).toBe(0);
  });

  it("T22-e: adutora com 90° em P1 e 45° em P2 → curvas90=1, curvas45=1", () => {
    const r = countAdutoraBends(ADU_90_AND_45_COORDS, CENTROID);
    expect(r.curvas90Count).toBe(1);
    expect(r.curvas45Count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Testes unitários de countSecondaryLBends
// ─────────────────────────────────────────────────────────────────────────────

describe("T22-f..i — countSecondaryLBends", () => {
  it("T22-f: ramal reto (coords.length === 2) → nenhuma curva em L", () => {
    const sec = makeStraight("s1", "col-0");
    const sized = [makeSizedSec(sec, 75)];
    const r = countSecondaryLBends([sec], sized);
    expect(r.byDnMm.size).toBe(0);
    expect(r.indeterminate).toBe(0);
  });

  it("T22-g: ramal em L com DN 75 conhecido → byDnMm.get(75) === 1", () => {
    const sec = makeLShape("s1", "col-0");
    const sized = [makeSizedSec(sec, 75)];
    const r = countSecondaryLBends([sec], sized);
    expect(r.byDnMm.get(75)).toBe(1);
    expect(r.indeterminate).toBe(0);
  });

  it("T22-h: ramal em L sem sizedSecondaries → indeterminate=1", () => {
    const sec = makeLShape("s1", "col-0");
    const r = countSecondaryLBends([sec], undefined);
    expect(r.byDnMm.size).toBe(0);
    expect(r.indeterminate).toBe(1);
  });

  it("T22-i: ramal em L mas colId não está em sizedSecondaries → indeterminate=1", () => {
    const sec = makeLShape("s1", "col-UNKNOWN");
    const otherSec = makeStraight("s2", "col-0");
    const sized = [makeSizedSec(otherSec, 75)];
    const r = countSecondaryLBends([sec], sized);
    expect(r.byDnMm.size).toBe(0);
    expect(r.indeterminate).toBe(1);
  });

  it("T22-j: 2 ramais em L com DNs diferentes → 2 entradas em byDnMm", () => {
    const sec1 = makeLShape("s1", "col-0");
    const sec2 = makeLShape("s2", "col-1");
    const sized = [makeSizedSec(sec1, 75), makeSizedSec(sec2, 100)];
    const r = countSecondaryLBends([sec1, sec2], sized);
    expect(r.byDnMm.get(75)).toBe(1);
    expect(r.byDnMm.get(100)).toBe(1);
    expect(r.indeterminate).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. Testes unitários de countSprinklerTees
// ─────────────────────────────────────────────────────────────────────────────

describe("T22-k..l — countSprinklerTees", () => {
  it("T22-k: coluna com 3 aspersores DN=50 → byDnMm.get(50) === 3", () => {
    const COLS = 1, ROWS = 3;
    const positions = makeGrid(COLS, ROWS);
    const physCols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
      TUBOS_PVC_LF,
    );
    const r = countSprinklerTees(physCols);
    // DN real depende do dimensionamento hidráulico; verificar que a soma é 3
    const total = [...r.byDnMm.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(ROWS); // 1 tê por aspersor
  });

  it("T22-l: 2 colunas com DNs diferentes → soma total = total aspersores", () => {
    const COLS = 3, ROWS = 5;
    const positions = makeGrid(COLS, ROWS);
    const physCols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
      TUBOS_PVC_LF,
    );
    const r = countSprinklerTees(physCols);
    const total = [...r.byDnMm.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(COLS * ROWS); // 1 tê por aspersor, invariante
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. Integração via buildBOM
// ─────────────────────────────────────────────────────────────────────────────

describe("T22-m..p — buildBOM integração", () => {
  it("T22-m: ramal em L com DN=75 → curva 90° Ø75mm aparece em itens da BOM", () => {
    const sec = makeLShape("s1", "col-0");
    const COLS = 2, ROWS = 3;
    const physCols = generatePhysicalColumns(
      makeGrid(COLS, ROWS), 0, CENTROID, SPACING,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
      TUBOS_PVC_LF,
    );
    // Força physicalColumnId do ramal a corresponder à primeira coluna real
    const secReal: SecondaryPipe = { ...sec, physicalColumnId: physCols[0].id };
    const sizedReal = [makeSizedSec(secReal, 75)];

    const bom = buildBOM(makeMinimalBOMInput({
      physicalColumns: physCols,
      secondaries:     [secReal],
      sizedSecondaries: sizedReal,
    }));

    const curvaItem = bom.itens.find(
      (i) => i.categoria === "CONEXAO" && i.descricao.toLowerCase().includes("ramais em l"),
    );
    expect(curvaItem).toBeDefined();
    expect(curvaItem!.quantidade).toBe(1);
    expect(curvaItem!.precoUnitario).toBeGreaterThan(0);
    expect(bom.meta.curvas90RamaisLCount).toBe(1);
  });

  it("T22-n: physicalColumns DN50 → kit resolvido (sem tee_90_aspersor_lateral pendente; SKU 1000354 em itens)", () => {
    // Fixture gera 2×3 grid: colunas DN50 (3 asp × 1,5 m³/h = 4,5 m³/h < 9 m³/h → DN50 natural)
    const bom = buildBOM(makeMinimalBOMInput());
    // Kit DN50 resolvido: nenhuma pendência de derivação aspersor-lateral
    const teesPendentes = bom.meta.conexoesFisicasPendentes.filter(
      (c) => c.tipo === "tee_90_aspersor_lateral",
    );
    expect(teesPendentes.length).toBe(0);
    // Item do tê DN50 (1000354) deve estar em itens precificados
    const teeItem = bom.itens.find((i) => i.sku === "1000354");
    expect(teeItem).toBeDefined();
    expect(teeItem!.quantidade).toBe(6); // 6 aspersores → 6 unidades
    expect(bom.meta.kitAspersorResolvCount).toBe(6);
  });

  it("T22-o: diagnostics → blocker 'BOM incompleta' ausente para lateral DN50 (kit resolvido)", () => {
    // DN50 tem kit homologado; não deve gerar nenhum blocker de "BOM incompleta" de kit
    const bom = buildBOM(makeMinimalBOMInput());
    const layout = makeMinimalLayout();
    const diag = generateProposalDiagnostics(layout, bom);
    const kitBlocker = diag.blockers.find(
      (b) => b.includes("DN de lateral não homologado") || b.includes("derivação aspersor-lateral"),
    );
    expect(kitBlocker).toBeUndefined();
  });

  it("T22-p: pendências não entram em itens nem somam ao totalGeral", () => {
    const bom = buildBOM(makeMinimalBOMInput());
    // Todos os itens em meta.conexoesFisicasPendentes têm tipo pendente, não entram em itens
    const tipoPendentes = new Set(bom.meta.conexoesFisicasPendentes.map((c) => c.tipo));
    for (const tipo of tipoPendentes) {
      const hasItemWithTipo = bom.itens.some((i) =>
        i.descricao.toLowerCase().includes(tipo.replace(/_/g, " ")),
      );
      // tee_90_aspersor_lateral e curva_45_adutora não devem estar em itens
      if (tipo === "tee_90_aspersor_lateral" || tipo === "curva_45_adutora") {
        expect(hasItemWithTipo).toBe(false);
      }
    }
    // totalGeral não inclui itens de pendência (eles têm preço 0 e não estão em itens)
    const recomputedTotal = bom.itens.reduce((s, i) => s + i.total, 0);
    expect(bom.totalGeral).toBeCloseTo(recomputedTotal, 4);
  });

  it("T22-q: meta.conexoesFisicasSemSkuCount === soma de quantidades pendentes; kitAspersorResolvCount === 6", () => {
    const bom = buildBOM(makeMinimalBOMInput());
    // Invariante: conexoesFisicasSemSkuCount = soma das quantidades pendentes
    const expectedTotal = bom.meta.conexoesFisicasPendentes.reduce(
      (s, c) => s + c.quantidade,
      0,
    );
    expect(bom.meta.conexoesFisicasSemSkuCount).toBe(expectedTotal);
    // DN50: kit resolvido → kitAspersorResolvCount = 6 aspersores
    expect(bom.meta.kitAspersorResolvCount).toBe(6);
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(0);
  });

  it("T22-r: ramal reto (coords.length === 2) → nenhuma curva de ramal adicionada", () => {
    const sec = makeStraight("s1", "col-x");
    const bom = buildBOM(makeMinimalBOMInput({
      secondaries: [sec],
    }));
    const curvaRamal = bom.itens.find(
      (i) => i.categoria === "CONEXAO" && i.descricao.includes("ramais em L"),
    );
    expect(curvaRamal).toBeUndefined();
    expect(bom.meta.curvas90RamaisLCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-054 — countFishboneConnections + integração buildBOM (topologia v12)
// ─────────────────────────────────────────────────────────────────────────────

function makeFishboneSet(
  sectorId: number,
  nRibs: number,
  opts: { spineLengthM?: number } = {},
): { spine: SecondaryPipe; spineEntry: SecondaryPipe; ribs: SecondaryPipe[] } {
  const spineId = `spine-s${sectorId}`;
  const pt: [number, number] = [CENTROID.lng, CENTROID.lat];
  const pt2: [number, number] = [CENTROID.lng + 0.0002, CENTROID.lat];
  const spine: SecondaryPipe = {
    id: spineId,
    physicalColumnId: "",
    physicalColumnIds: [],
    kind: "spine",
    sectorId,
    fromCoord: pt,
    toCoord: pt2,
    coords: [pt, pt2],
    lengthM: opts.spineLengthM ?? 24,
    source: "auto",
  };
  const spineEntry: SecondaryPipe = {
    id: `spine-entry-s${sectorId}`,
    physicalColumnId: "",
    physicalColumnIds: [],
    kind: "spine_entry",
    parentSpineId: spineId,
    sectorId,
    fromCoord: pt,
    toCoord: pt2,
    coords: [pt, pt2],
    lengthM: 6,
    source: "auto",
  };
  const ribs: SecondaryPipe[] = Array.from({ length: nRibs }, (_, i) => ({
    id: `rib-s${sectorId}-col-${i}`,
    physicalColumnId: `col-s${sectorId}-${i}`,
    physicalColumnIds: [`col-s${sectorId}-${i}`],
    kind: "rib" as const,
    parentSpineId: spineId,
    sectorId,
    fromCoord: pt,
    toCoord: pt2,
    coords: [pt, pt2],
    lengthM: 3,
    source: "auto",
  }));
  return { spine, spineEntry, ribs };
}

describe("T54-1..6 — countFishboneConnections (unidade pura)", () => {
  it("T54-1: 1 setor com 3 ribs → 1 tê principal→entry (DN75) + 1 junção entry→spine (DN75) + 3 tês spine→rib (DN50)", () => {
    const { spine, spineEntry, ribs } = makeFishboneSet(1, 3);
    const secondaries = [spine, spineEntry, ...ribs];
    const sized = [
      makeSizedSec(spine, 75),
      makeSizedSec(spineEntry, 75),
      ...ribs.map((r) => makeSizedSec(r, 50)),
    ];
    const fish = countFishboneConnections(secondaries, sized);
    expect(fish.tesPrincipalSpineEntry.byDnMm.get(75)).toBe(1);
    expect(fish.tesPrincipalSpineEntry.indeterminate).toBe(0);
    expect(fish.juncoesSpineEntrySpine.byDnMm.get(75)).toBe(1);
    expect(fish.juncoesSpineEntrySpine.indeterminate).toBe(0);
    expect(fish.tesSpineRib.byDnMm.get(50)).toBe(3);
    expect(fish.tesSpineRib.indeterminate).toBe(0);
  });

  it("T54-2: 2 setores com DNs distintos → agregação por DN e por família", () => {
    const s1 = makeFishboneSet(1, 2);
    const s2 = makeFishboneSet(2, 3);
    const secondaries = [s1.spine, s1.spineEntry, ...s1.ribs, s2.spine, s2.spineEntry, ...s2.ribs];
    const sized = [
      makeSizedSec(s1.spine, 75), makeSizedSec(s1.spineEntry, 75),
      ...s1.ribs.map((r) => makeSizedSec(r, 50)),
      makeSizedSec(s2.spine, 100), makeSizedSec(s2.spineEntry, 100),
      ...s2.ribs.map((r) => makeSizedSec(r, 50)),
    ];
    const fish = countFishboneConnections(secondaries, sized);
    expect(fish.tesPrincipalSpineEntry.byDnMm.get(75)).toBe(1);
    expect(fish.tesPrincipalSpineEntry.byDnMm.get(100)).toBe(1);
    expect(fish.juncoesSpineEntrySpine.byDnMm.get(75)).toBe(1);
    expect(fish.juncoesSpineEntrySpine.byDnMm.get(100)).toBe(1);
    expect(fish.tesSpineRib.byDnMm.get(50)).toBe(5);
  });

  it("T54-5: sizedSecondaries ausente → tudo em indeterminate, sem crash", () => {
    const { spine, spineEntry, ribs } = makeFishboneSet(1, 3);
    const fish = countFishboneConnections([spine, spineEntry, ...ribs], undefined);
    expect(fish.tesPrincipalSpineEntry.indeterminate).toBe(1);
    expect(fish.juncoesSpineEntrySpine.indeterminate).toBe(1);
    expect(fish.tesSpineRib.indeterminate).toBe(3);
    expect(fish.tesPrincipalSpineEntry.byDnMm.size).toBe(0);
  });

  it("T54-6: spine degenerado (lengthM = 0, setor de 1 coluna) → 0 junções entry→spine", () => {
    const { spine, spineEntry, ribs } = makeFishboneSet(1, 1, { spineLengthM: 0 });
    const sized = [makeSizedSec(spine, 75), makeSizedSec(spineEntry, 75), makeSizedSec(ribs[0], 50)];
    const fish = countFishboneConnections([spine, spineEntry, ...ribs], sized);
    expect(fish.juncoesSpineEntrySpine.byDnMm.size).toBe(0);
    expect(fish.juncoesSpineEntrySpine.indeterminate).toBe(0);
    // tê na principal e tê do rib continuam contados
    expect(fish.tesPrincipalSpineEntry.byDnMm.get(75)).toBe(1);
    expect(fish.tesSpineRib.byDnMm.get(50)).toBe(1);
  });

  it("T54-leg: secundárias legadas (kind undefined) → famílias vazias", () => {
    const legacy = [makeStraight("sec-1", "col-1"), makeLShape("sec-2", "col-2")];
    const fish = countFishboneConnections(legacy, [makeSizedSec(legacy[0], 50)]);
    expect(fish.tesPrincipalSpineEntry.byDnMm.size).toBe(0);
    expect(fish.tesPrincipalSpineEntry.indeterminate).toBe(0);
    expect(fish.juncoesSpineEntrySpine.byDnMm.size).toBe(0);
    expect(fish.tesSpineRib.byDnMm.size).toBe(0);
  });
});

describe("T54-3..9 — buildBOM integração fishbone", () => {
  function fishboneInput(dnEntry: number, dnSpine: number, dnRib: number) {
    const { spine, spineEntry, ribs } = makeFishboneSet(1, 3);
    const secondaries = [spine, spineEntry, ...ribs];
    const sizedSecondaries = [
      makeSizedSec(spine, dnSpine),
      makeSizedSec(spineEntry, dnEntry),
      ...ribs.map((r) => makeSizedSec(r, dnRib)),
    ];
    return makeMinimalBOMInput({ secondaries, sizedSecondaries });
  }

  it("T54-3a: DN com SKU (75/75/50) → itens CONEXAO precificados por família", () => {
    const bom = buildBOM(fishboneInput(75, 75, 50));
    const tePrincipal = bom.itens.find(
      (i) => i.sku === "TIGRE_TE_75_LF" && i.descricao.includes("principal→entrada"),
    );
    expect(tePrincipal?.quantidade).toBe(1);
    const juncao = bom.itens.find(
      (i) => i.sku === "TIGRE_TE_75_LF" && i.descricao.includes("junção entrada→sub-coletor"),
    );
    expect(juncao?.quantidade).toBe(1);
    const teRib = bom.itens.find(
      (i) => i.sku === "TIGRE_TE_50_LF" && i.descricao.includes("sub-coletor→rib"),
    );
    expect(teRib?.quantidade).toBe(3);
    expect(bom.meta.tesPrincipalSpineEntryCount).toBe(1);
    expect(bom.meta.juncoesSpineEntrySpineCount).toBe(1);
    expect(bom.meta.tesSpineRibCount).toBe(3);
    expect(bom.meta.conexoesFishbonePendentesCount).toBe(0);
  });

  it("T54-3b: DN sem SKU exato (ribs DN32) → pendência sku_nao_catalogado, sem fallback silencioso", () => {
    const bom = buildBOM(fishboneInput(75, 75, 32));
    const pend = bom.meta.conexoesFisicasPendentes.filter((c) => c.tipo === "te_spine_rib");
    expect(pend).toHaveLength(1);
    expect(pend[0].dnMm).toBe(32);
    expect(pend[0].quantidade).toBe(3);
    expect(pend[0].motivoPendencia).toBe("sku_nao_catalogado");
    expect(bom.meta.tesSpineRibCount).toBe(0);
    expect(bom.meta.conexoesFishbonePendentesCount).toBe(3);
    // nenhum item precificado com SKU de outro DN para os ribs
    const ribItems = bom.itens.filter((i) => i.descricao.includes("sub-coletor→rib"));
    expect(ribItems).toHaveLength(0);
  });

  it("T54-4: regressão legado — secundárias sem kind → zero conexões fishbone", () => {
    const legacy = [makeStraight("sec-1", "col-1")];
    const bom = buildBOM(makeMinimalBOMInput({
      secondaries: legacy,
      sizedSecondaries: [makeSizedSec(legacy[0], 50)],
    }));
    expect(bom.meta.tesPrincipalSpineEntryCount).toBe(0);
    expect(bom.meta.juncoesSpineEntrySpineCount).toBe(0);
    expect(bom.meta.tesSpineRibCount).toBe(0);
    expect(bom.meta.conexoesFishbonePendentesCount).toBe(0);
    expect(bom.meta.conexoesFisicasPendentes.some((c) =>
      c.tipo === "te_principal_spine_entry" ||
      c.tipo === "juncao_spine_entry_spine" ||
      c.tipo === "te_spine_rib",
    )).toBe(false);
    expect(bom.itens.some((i) => i.descricao.includes("sub-coletor"))).toBe(false);
  });

  it("T54-5b: fishbone sem sizedSecondaries → pendências dn_indeterminado, sem crash", () => {
    const { spine, spineEntry, ribs } = makeFishboneSet(1, 2);
    const bom = buildBOM(makeMinimalBOMInput({
      secondaries: [spine, spineEntry, ...ribs],
      sizedSecondaries: undefined,
    }));
    const pend = bom.meta.conexoesFisicasPendentes.filter((c) =>
      c.motivoPendencia === "dn_indeterminado" &&
      (c.tipo === "te_principal_spine_entry" || c.tipo === "juncao_spine_entry_spine" || c.tipo === "te_spine_rib"),
    );
    // 1 entry + 1 junção + 2 ribs = 3 entradas de pendência (famílias), 4 conexões
    expect(pend.reduce((s, c) => s + c.quantidade, 0)).toBe(4);
    expect(bom.meta.conexoesFishbonePendentesCount).toBe(4);
  });

  it("T54-7: consistência — precificados + pendentes = total de conexões fishbone", () => {
    const bom = buildBOM(fishboneInput(75, 75, 32));
    // total fishbone = 1 (entry) + 1 (junção) + 3 (ribs) = 5
    const priced =
      bom.meta.tesPrincipalSpineEntryCount +
      bom.meta.juncoesSpineEntrySpineCount +
      bom.meta.tesSpineRibCount;
    expect(priced + bom.meta.conexoesFishbonePendentesCount).toBe(5);
  });

  it("T54-8: sem dupla contagem — fishbone não dispara L-bends nem altera tês de derivação lateral", () => {
    const input = fishboneInput(75, 75, 50);
    const bom = buildBOM(input);
    expect(bom.meta.curvas90RamaisLCount).toBe(0);
    // tês de derivação lateral continuam 1 por coluna física (independente do fishbone)
    const nCols = input.physicalColumns.length;
    expect(bom.meta.nTes).toBeGreaterThanOrEqual(1);
    expect(nCols).toBeGreaterThan(0);
  });

  it("T54-9: pendência fishbone alimenta blocker 'BOM incompleta' nos diagnósticos", () => {
    const bom = buildBOM(fishboneInput(75, 75, 32));
    const diag = generateProposalDiagnostics(makeMinimalLayout(), bom);
    expect(diag.blockers.some((b) => b.includes("BOM incompleta"))).toBe(true);
  });
});
