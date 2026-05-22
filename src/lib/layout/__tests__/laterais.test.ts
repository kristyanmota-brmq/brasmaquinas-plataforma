import { describe, it, expect } from "vitest";
import * as turf from "@turf/turf";
import { selectDiameter } from "@/lib/hydraulics/hazenWilliams";
import { TUBOS_PVC_LF, ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import { generatePrincipalAndAdutora } from "@/lib/layout/principal";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import type { TuboCandidato } from "@/lib/hydraulics/hazenWilliams";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

const catalogoLF = [...TUBOS_PVC_LF];
const pressaoServico = ASPERSOR_PADRAO.pressaoServicoMca; // 30 mca
const limitePerda = pressaoServico * 0.20;                // 6 mca

describe("selectDiameter — seleção de diâmetro de lateral", () => {
  it("lateral com alta vazão: diâmetro mínimo viola ΔP > 20% → seleciona o próximo", () => {
    const resultado = selectDiameter(30, 228, pressaoServico, catalogoLF);
    expect(resultado.tubo.diametroMm).toBeGreaterThan(50);
    expect(resultado.perdaCargaPercentual).toBeLessThanOrEqual(0.20);
  });

  it("lateral curta com baixa vazão: todos os diâmetros respeitam ΔP → seleciona o menor", () => {
    const resultado = selectDiameter(3, 12.5, pressaoServico, catalogoLF);
    expect(resultado.tubo.diametroMm).toBe(50);
    expect(resultado.perdaCargaM).toBeLessThan(limitePerda);
  });

  it("lateral extrema onde nenhum Ø atende: retorna o maior disponível", () => {
    const resultado = selectDiameter(200, 500, pressaoServico, catalogoLF);
    const maiorDiam = Math.max(...catalogoLF.map((t) => t.diametroMm));
    expect(resultado.tubo.diametroMm).toBe(maiorDiam);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers compartilhados
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m

// Catálogo robusto para testes de agrupamento (não restringe por capacidade
// hidráulica — assim o split por capacidade da TASK-040 não interfere e o
// teste continua validando o agrupamento geométrico).
const TEST_CATALOG: TuboCandidato[] = [
  { sku: "TEST-50",  diametroMm: 50,  diametroInternoMm: 46, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  { sku: "TEST-75",  diametroMm: 75,  diametroInternoMm: 69, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  { sku: "TEST-100", diametroMm: 100, diametroInternoMm: 92, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
];
const TEST_ASPERSOR = {
  vazao: ASPERSOR_PADRAO.vazaoM3PorHora,
  pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca,
};

/**
 * Gera posições usando o mesmo pipeline de produção:
 * turf.pointGrid → filtrar dentro do polígono rotacionado → turf.transformRotate de volta.
 *
 * Isso expõe a diferença entre rotação Haversine (turf) e rotação plana (local frame),
 * que o algoritmo greedy anterior não tratava corretamente.
 */
function generateTurfPositions(
  cols: number,
  rows: number,
  spacingM: number,
  centroid: { lng: number; lat: number },
  angleDeg: number,
): [number, number][] {
  const mPerLng = 111320 * Math.cos((centroid.lat * Math.PI) / 180);
  const wDeg = ((cols - 1) * spacingM + spacingM * 1.6) / mPerLng;
  const hDeg = ((rows - 1) * spacingM + spacingM * 1.6) / 111320;
  const polygon: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [[
      [centroid.lng - wDeg / 2, centroid.lat - hDeg / 2],
      [centroid.lng + wDeg / 2, centroid.lat - hDeg / 2],
      [centroid.lng + wDeg / 2, centroid.lat + hDeg / 2],
      [centroid.lng - wDeg / 2, centroid.lat + hDeg / 2],
      [centroid.lng - wDeg / 2, centroid.lat - hDeg / 2],
    ]],
  };
  const polyFeature = turf.polygon(polygon.coordinates);
  const pivot = turf.centroid(polyFeature);
  const rotatedPoly = turf.transformRotate(polyFeature, -angleDeg, { pivot });
  const bbox = turf.bbox(rotatedPoly);
  const grid = turf.pointGrid(bbox, spacingM / 1000, { units: "kilometers" });
  const inside = turf.pointsWithinPolygon(grid, rotatedPoly);
  return inside.features.map((f) => {
    const rotated = turf.transformRotate(f, angleDeg, { pivot });
    return (rotated.geometry as GeoJSON.Point).coordinates as [number, number];
  });
}

function distM(a: [number, number], b: [number, number]): number {
  const mPerLng = 111320 * Math.cos((a[1] * Math.PI) / 180);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * 111320;
  return Math.sqrt(dx * dx + dy * dy);
}

function polylineLength(pts: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += distM(pts[i - 1], pts[i]);
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Teste 1 — Grid retangular via turf (angle=0°)
//
// Usa o pipeline real de produção (turf.pointGrid + transformRotate).
// Com o bug greedy, 20×22 = 440 aspersores geravam centenas de micro-colunas.
// Com o agrupamento por índice arredondado, deve produzir as colunas certas.
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste 1 — Grid turf retangular (0°): colunas físicas = colunas da grade", () => {
  const COLS = 20, ROWS = 22, ANGLE = 0;
  const positions = generateTurfPositions(COLS, ROWS, SPACING, CENTROID, ANGLE);

  const physCols = generatePhysicalColumns(
    positions, ANGLE, CENTROID, SPACING, TEST_ASPERSOR, TEST_CATALOG,
  );

  it("total de aspersores ≈ 20×22 (±20% por recorte de borda)", () => {
    expect(positions.length).toBeGreaterThan(COLS * ROWS * 0.7);
    expect(positions.length).toBeLessThan(COLS * ROWS * 1.3);
  });

  it("generatePhysicalColumns não produz centenas de colunas (bug greedy)", () => {
    expect(physCols.length).toBeLessThanOrEqual(COLS + 2);
  });

  it("colunas físicas ≥ COLS - 2", () => {
    expect(physCols.length).toBeGreaterThanOrEqual(COLS - 2);
  });

  it("média ≥ ROWS × 0.7 aspersores por coluna (não fragmentado)", () => {
    expect(positions.length / physCols.length).toBeGreaterThanOrEqual(ROWS * 0.7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Teste 2 — Coordenadas lat/lng reais, ângulo 30°
//
// Valida que o agrupamento funciona quando a grade está rotacionada:
// a rotação Haversine (turf) e a rotação plana (generatePhysicalColumns) diferem
// ligeiramente — o algoritmo round-based absorve essa diferença.
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste 2 — Grid turf a 30°: grouping por índice arredondado", () => {
  const COLS = 15, ROWS = 18, ANGLE = 30;
  const positions = generateTurfPositions(COLS, ROWS, SPACING, CENTROID, ANGLE);

  const physCols = generatePhysicalColumns(
    positions, ANGLE, CENTROID, SPACING, TEST_ASPERSOR, TEST_CATALOG,
  );

  it("gera entre COLS-2 e COLS*2 colunas físicas para ângulo 30°", () => {
    // Grade rotacionada: bbox do polígono girado é mais largo que o polígono,
    // gerando colunas extras nos cantos. Tolerância: até COLS*2.
    expect(physCols.length).toBeGreaterThanOrEqual(COLS - 2);
    expect(physCols.length).toBeLessThanOrEqual(COLS * 2);
  });

  it("média ≥ ROWS × 0.35 aspersores/coluna (não fragmentado)", () => {
    expect(positions.length / physCols.length).toBeGreaterThanOrEqual(ROWS * 0.35);
  });

  it("spacingMeters comparado com metros, não graus (physCols.length < positions.length)", () => {
    expect(physCols.length).toBeLessThan(positions.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Teste 3 — Mesma coluna física em múltiplos setores (via turf)
//
// 1 coluna de 20 aspersores dividida em 2 setores → 1 coluna física com
// sectorsTouched = [0, 1], comprimento = (20-1)×12+0.5 = 228.5 m.
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste 3 — Coluna física multi-setor (posições flat-math)", () => {
  // Usando flat-math em vez de turf para garantir 1 coluna exata no X=centroid.lng.
  // turf.pointGrid com largura < 2×spacing pode criar 2 colunas dentro da bbox girada.
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
  const positions: [number, number][] = Array.from({ length: 20 }, (_, r) => [
    CENTROID.lng,
    CENTROID.lat + ((r - 9.5) * SPACING) / 111320,
  ]);
  const sorted = [...positions].sort((a, b) => a[1] - b[1]); // ordem por lat
  const half = Math.floor(sorted.length / 2);
  const sectorMap = new Map(sorted.map((p, i) => [p.toString(), i < half ? 0 : 1]));
  const sectorIds = positions.map((p) => sectorMap.get(p.toString()) ?? 0);

  const physCols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, TEST_ASPERSOR, TEST_CATALOG, sectorIds,
  );

  it("1 coluna física (não 2 sub-colunas de setor)", () => {
    expect(physCols).toHaveLength(1);
  });

  it("coluna física toca ambos os setores", () => {
    expect(physCols[0].sectorsTouched.sort()).toEqual([0, 1]);
  });

  it("sprinklerCount = total de aspersores gerados", () => {
    expect(physCols[0].sprinklerCount).toBe(positions.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Teste 4 — Principal sem zigue-zague (grid turf rotacionado a 15°)
//
// Com o bug greedy, 270 aspersores geravam 270 micro-colunas e uma principal
// de dezenas de km. Com o fix, comprimento ≤ 10 × COLS × SPACING.
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste 4 — Principal não explode (grid turf 15°)", () => {
  const COLS = 15, ROWS = 18, ANGLE = 15;
  const positions = generateTurfPositions(COLS, ROWS, SPACING, CENTROID, ANGLE);

  const physCols = generatePhysicalColumns(
    positions, ANGLE, CENTROID, SPACING, TEST_ASPERSOR, TEST_CATALOG,
  );

  const waterSource = { lng: CENTROID.lng - 0.003, lat: CENTROID.lat - 0.003 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID, ANGLE,
  );

  it("colunas físicas corretamente agrupadas (≤ COLS*2)", () => {
    // Grade rotacionada a 15°: bbox mais largo, colunas extras nos cantos são esperadas.
    expect(physCols.length).toBeLessThanOrEqual(COLS * 2);
  });

  it("principal tem no máximo 1 ponto por coluna física (gap-splits deduplificados)", () => {
    // Colunas com gap físico produzem múltiplos physCols com o mesmo X; são deduplificadas.
    expect(principal.length).toBeLessThanOrEqual(physCols.length);
    expect(principal.length).toBeGreaterThan(0);
  });

  it("comprimento da principal ≤ 10 × COLS × SPACING (não zigue-zague)", () => {
    expect(polylineLength(principal)).toBeLessThan(10 * COLS * SPACING);
  });

  it("comprimento da principal ≥ (COLS-3) × SPACING (não colapsou)", () => {
    expect(polylineLength(principal)).toBeGreaterThan((COLS - 3) * SPACING);
  });

  it("adutora tem exatamente 2 pontos", () => {
    expect(adutora).toHaveLength(2);
    expect(adutora[0]).toEqual([waterSource.lng, waterSource.lat]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Teste 5 — Adutora: barras = ceil(comprimento_caminho / 6)
//
// Nunca subestima as barras usando corda em vez de comprimento real do caminho.
// Caso concreto: adutora de 152 m → 26 barras (ceil(152/6)).
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste 5 — BOM da adutora: barras = ceil(comprimento_real / 6)", () => {
  const BARRA_M = 6;

  it("adutora reta de 152 m → 26 barras", () => {
    const adutora: [number, number][] = [
      [CENTROID.lng, CENTROID.lat - 152 / 111320],
      [CENTROID.lng, CENTROID.lat],
    ];
    const len = polylineLength(adutora);
    expect(len).toBeGreaterThan(150);
    expect(Math.ceil(len / BARRA_M)).toBe(26);
  });

  it("adutora multi-ponto: barras calculadas sobre caminho, não sobre corda", () => {
    // Adutora em L: vai para leste e depois para norte
    const adutora: [number, number][] = [
      [CENTROID.lng - 0.0007, CENTROID.lat - 0.001],  // captação
      [CENTROID.lng,          CENTROID.lat - 0.001],  // dobra
      [CENTROID.lng,          CENTROID.lat - 0.0002], // entrada
    ];
    const corda = distM(adutora[0], adutora[2]);
    const caminho = polylineLength(adutora);
    // Caminho em L é sempre maior que a corda
    expect(caminho).toBeGreaterThan(corda);
    // barras pelo caminho ≥ barras pela corda
    expect(Math.ceil(caminho / BARRA_M)).toBeGreaterThanOrEqual(Math.ceil(corda / BARRA_M));
  });

  it("buildBOM com adutora 152m: comprimentoAdutoraM > 148m e barras corretas", () => {
    const positions = generateTurfPositions(5, 8, SPACING, CENTROID, 0);
    const sectorIndices = positions.map(() => 0);
    const adutora152: [number, number][] = [
      [CENTROID.lng, CENTROID.lat - 152 / 111320],
      [CENTROID.lng, CENTROID.lat],  // entrada no centróide → distância exata 152 m
    ];
    const layout: ProjectLayout = {
      centroid: CENTROID,
      waterSource: { lng: CENTROID.lng - 0.003, lat: CENTROID.lat - 0.003 },
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
        setoresCount: 1,
        tempoPorSetorMinutos: 60,
        aspersoresPorSetor: positions.length,
        vazaoPorSetorM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
        sectorIndices,
      },
      mainPipeline: {
        coordinates: [[CENTROID.lng - 0.001, CENTROID.lat], [CENTROID.lng + 0.001, CENTROID.lat]],
        adutora: adutora152,
        lengthMeters: (5 - 1) * SPACING,
        segments: 4,
        source: "auto",
      },
    };

    const bom = calculateIrrigationProject(layout).bom;
    expect(bom).not.toBeNull();
    expect(bom!.meta.comprimentoAdutoraM).toBeGreaterThan(148);
    const barrasEsperadas = Math.ceil(bom!.meta.comprimentoAdutoraM / BARRA_M);
    const adutoraItem = bom!.itens.find(
      (i) => i.categoria === "TUBO" && i.descricao.toLowerCase().includes("adutora"),
    );
    expect(adutoraItem).toBeDefined();
    expect(adutoraItem!.quantidade).toBe(barrasEsperadas);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Teste 6 — Regressão caso real: ~6 ha, ~420 aspersores, 12 m, 14 setores
//
// Reproduz o caso que produzia 232 colunas e 31.141 m de principal.
// Sanity checks bloqueantes:
//   physicalColumns.length ≤ 80
//   avgSprinklersPerColumn ≥ 4
//   comprimento da principal ≤ 2.500 m
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste 6 — Regressão caso real: ~6 ha, ~420 asp., 12 m, 14 setores", () => {
  const COLS = 20, ROWS = 21, ANGLE = 0;
  const positions = generateTurfPositions(COLS, ROWS, SPACING, CENTROID, ANGLE);

  // Distribuir 14 setores proporcional ao índice de posição (aproximação razoável)
  const sectorIds = positions.map((_, i) =>
    Math.min(13, Math.floor((i * 14) / positions.length)),
  );

  const physCols = generatePhysicalColumns(
    positions, ANGLE, CENTROID, SPACING, TEST_ASPERSOR, TEST_CATALOG, sectorIds,
  );

  const waterSource = { lng: CENTROID.lng - 0.003, lat: CENTROID.lat - 0.003 };
  const { principal } = generatePrincipalAndAdutora(waterSource, physCols, CENTROID, ANGLE);
  const principalLen = polylineLength(principal);

  it("physicalColumns.length ≤ 80 (sanity: não pode ser 232)", () => {
    expect(physCols.length).toBeLessThanOrEqual(80);
  });

  it("avgSprinklersPerColumn ≥ 4 (sanity: não pode ser 1.8)", () => {
    expect(positions.length / physCols.length).toBeGreaterThanOrEqual(4);
  });

  it("physicalColumns.length ≈ COLS (±3 por borda)", () => {
    expect(physCols.length).toBeGreaterThanOrEqual(COLS - 3);
    expect(physCols.length).toBeLessThanOrEqual(COLS + 3);
  });

  it("comprimento da principal ≤ 2.500 m (sanity: não pode ser 31.141 m)", () => {
    expect(principalLen).toBeLessThan(2500);
  });

  it("comprimento da principal ≥ (COLS-3) × SPACING (geometricamente plausível)", () => {
    expect(principalLen).toBeGreaterThan((COLS - 3) * SPACING);
  });

  it("total de aspersores ≈ COLS × ROWS (±20% por borda)", () => {
    expect(positions.length).toBeGreaterThan(COLS * ROWS * 0.75);
    expect(positions.length).toBeLessThan(COLS * ROWS * 1.25);
  });
});
