/**
 * Auditoria do modelo de coluna física (PhysicalColumn).
 *
 * P1 fix (TASK-013): startLngLat/endLngLat são endpoints do eixo canônico local
 * (xSegRep, yFirst/yLast) convertidos para geodésico — não posições reais dos
 * aspersores extremos. Garante que a reta startLngLat → endLngLat passe pelos
 * aspersores intermediários da coluna dentro de TOLERANCIA_ASPERSOR_EIXO_LATERAL.
 *
 * TASK-018: corrigido para usar xSegRep (média do segmento) em vez de
 * posições reais dos aspersores extremos, que podiam estar desalinhados do eixo.
 */
import { describe, it, expect } from "vitest";
import * as turf from "@turf/turf";
import {
  generatePhysicalColumns,
  maxSprinklerAxisDeviationM,
  detectAxisDeviations,
  TOLERANCIA_ASPERSOR_EIXO_LATERAL,
} from "@/lib/layout/laterais";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import type { TuboCandidato } from "@/lib/hydraulics/hazenWilliams";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
const ASPERSOR_MIN = {
  vazao: ASPERSOR_PADRAO.vazaoM3PorHora,
  pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca,
};
const TEST_CATALOG: TuboCandidato[] = [
  { sku: "T50", diametroMm: 50, diametroInternoMm: 46, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
];

function makeGrid(
  cols: number,
  rows: number,
  angleDeg: number,
): [number, number][] {
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
  const wDeg = ((cols - 1) * SPACING + SPACING * 1.6) / mPerLng;
  const hDeg = ((rows - 1) * SPACING + SPACING * 1.6) / 111320;
  const polygon: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [[
      [CENTROID.lng - wDeg / 2, CENTROID.lat - hDeg / 2],
      [CENTROID.lng + wDeg / 2, CENTROID.lat - hDeg / 2],
      [CENTROID.lng + wDeg / 2, CENTROID.lat + hDeg / 2],
      [CENTROID.lng - wDeg / 2, CENTROID.lat + hDeg / 2],
      [CENTROID.lng - wDeg / 2, CENTROID.lat - hDeg / 2],
    ]],
  };
  const polyFeature = turf.polygon(polygon.coordinates);
  const pivot = turf.centroid(polyFeature);
  const rotatedPoly = turf.transformRotate(polyFeature, -angleDeg, { pivot });
  const bbox = turf.bbox(rotatedPoly);
  const grid = turf.pointGrid(bbox, SPACING / 1000, { units: "kilometers" });
  const inside = turf.pointsWithinPolygon(grid, rotatedPoly);
  return inside.features.map((f) => {
    const rotated = turf.transformRotate(f, angleDeg, { pivot });
    return (rotated.geometry as GeoJSON.Point).coordinates as [number, number];
  });
}

/**
 * Gera grid cols×rows usando projeção plana (flat-earth) idêntica à usada em
 * generatePhysicalColumns. Todos os aspersores da mesma coluna têm X local exato —
 * sem distorção Haversine, adequado para verificar invariantes do eixo canônico.
 */
function makeGridFlat(
  cols: number,
  rows: number,
  angleDeg: number,
): [number, number][] {
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
  const angleRad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const positions: [number, number][] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = col * SPACING;
      const y = row * SPACING;
      const drx = x * c - y * s;
      const dry = x * s + y * c;
      positions.push([CENTROID.lng + drx / mPerLng, CENTROID.lat + dry / 111320]);
    }
  }
  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes de auditoria — P1 fix: startLngLat/endLngLat usam posição real
// ─────────────────────────────────────────────────────────────────────────────

describe("Auditoria P1 — PhysicalColumn.startLngLat e endLngLat", () => {
  const positions = makeGrid(5, 6, 0);
  const cols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("P1a: startLngLat === positions[sprinklerIndices[0]] em todas as colunas", () => {
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      const firstIdx = col.sprinklerIndices[0];
      expect(col.startLngLat[0]).toBeCloseTo(positions[firstIdx][0], 10);
      expect(col.startLngLat[1]).toBeCloseTo(positions[firstIdx][1], 10);
    }
  });

  it("P1b: endLngLat === positions[sprinklerIndices[last]] em todas as colunas", () => {
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      const lastIdx = col.sprinklerIndices[col.sprinklerIndices.length - 1];
      expect(col.endLngLat[0]).toBeCloseTo(positions[lastIdx][0], 10);
      expect(col.endLngLat[1]).toBeCloseTo(positions[lastIdx][1], 10);
    }
  });

  it("P1c: sprinklerIndices estão em ordem de Y ascendente (lat crescente para ângulo 0°)", () => {
    for (const col of cols) {
      const lats = col.sprinklerIndices.map((i) => positions[i][1]);
      for (let k = 1; k < lats.length; k++) {
        expect(lats[k]).toBeGreaterThanOrEqual(lats[k - 1] - 1e-9);
      }
    }
  });

  it("P1d: todo aspersor pertence a exatamente uma coluna física", () => {
    const seen = new Set<number>();
    for (const col of cols) {
      for (const idx of col.sprinklerIndices) {
        expect(seen.has(idx)).toBe(false);
        seen.add(idx);
      }
    }
    expect(seen.size).toBe(positions.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 fix com grid inclinado (30°) — verificar robustez
// ─────────────────────────────────────────────────────────────────────────────

describe("Auditoria P1 — grid inclinado 30° (flat-earth)", () => {
  // makeGridFlat usa a mesma projeção plana de generatePhysicalColumns:
  // todos os aspersores da mesma coluna têm X local idêntico, logo
  // toLngLat(xSegRep, yFirst/yLast) = posição real do 1°/último aspersor exatamente.
  const positions30 = makeGridFlat(4, 5, 30);
  const cols30 = generatePhysicalColumns(
    positions30, 30, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("P1e: startLngLat === posição real do 1° aspersor (flat-earth, grid 30°)", () => {
    expect(cols30.length).toBeGreaterThan(0);
    for (const col of cols30) {
      const firstIdx = col.sprinklerIndices[0];
      expect(col.startLngLat[0]).toBeCloseTo(positions30[firstIdx][0], 10);
      expect(col.startLngLat[1]).toBeCloseTo(positions30[firstIdx][1], 10);
    }
  });

  it("P1f: endLngLat === posição real do último aspersor (flat-earth, grid 30°)", () => {
    for (const col of cols30) {
      const lastIdx = col.sprinklerIndices[col.sprinklerIndices.length - 1];
      expect(col.endLngLat[0]).toBeCloseTo(positions30[lastIdx][0], 10);
      expect(col.endLngLat[1]).toBeCloseTo(positions30[lastIdx][1], 10);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lateral física — backbone reta de 2 pontos (TASK-017)
// Antes da correção, ProjectMap usava sprinklerIndices.map(idx → positions[idx])
// gerando N pontos com micro-desvios — zigzag visível no mapa.
// Após a correção: [startLngLat, endLngLat] — LineString reta de 2 pontos exatos.
// ─────────────────────────────────────────────────────────────────────────────

describe("Lateral física — backbone reta de 2 pontos", () => {
  const positions = makeGrid(4, 5, 0);
  const cols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("P1g: backbone da lateral física tem exatamente 2 pontos (startLngLat e endLngLat)", () => {
    for (const col of cols.filter((c) => c.sprinklerIndices.length >= 2)) {
      const coords = [col.startLngLat, col.endLngLat];
      expect(coords).toHaveLength(2);
      // ponto 0 = startLngLat = endpoint do eixo canônico (≈ posição real para grids pequenos)
      const firstIdx = col.sprinklerIndices[0];
      expect(coords[0][0]).toBeCloseTo(positions[firstIdx][0], 10);
      expect(coords[0][1]).toBeCloseTo(positions[firstIdx][1], 10);
      // ponto 1 = endLngLat = endpoint do eixo canônico (≈ posição real para grids pequenos)
      const lastIdx = col.sprinklerIndices[col.sprinklerIndices.length - 1];
      expect(coords[1][0]).toBeCloseTo(positions[lastIdx][0], 10);
      expect(coords[1][1]).toBeCloseTo(positions[lastIdx][1], 10);
    }
  });

  // Tolerância 0,5 m: desvio numérico esperado na conversão geodésico ↔ frame local.
  // Sprinklers devem ser colineares por construção do grid — esta verificação confirma
  // que o ruído numérico é pequeno o suficiente para que o backbone de 2 pontos
  // represente fielmente o tubo sem perda visual significativa.
  // Não é regra técnica nova — não requer premissa provisória RT.
  it("P1g_col: aspersores intermediários estão a < 0,5 m do eixo start→end", () => {
    for (const col of cols.filter((c) => c.sprinklerIndices.length >= 3)) {
      const line = turf.lineString([col.startLngLat, col.endLngLat]);
      for (const idx of col.sprinklerIndices.slice(1, -1)) {
        const pt = turf.point(positions[idx]);
        const distM = turf.pointToLineDistance(pt, line, { units: "meters" });
        expect(distM).toBeLessThan(0.5);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Compatibilidade com catálogo real (TUBOS_PVC_LF)
// ─────────────────────────────────────────────────────────────────────────────

describe("Auditoria P1 com catálogo real TUBOS_PVC_LF", () => {
  const positions = makeGrid(5, 6, 0);
  const cols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TUBOS_PVC_LF,
  );

  it("P1h: startLngLat com catálogo real ≈ positions[sprinklerIndices[0]] (0° grid)", () => {
    // Para grid 0°, eixo canônico = posição real exatamente (round-trip flat-earth sem erro).
    for (const col of cols) {
      const firstIdx = col.sprinklerIndices[0];
      expect(col.startLngLat[0]).toBeCloseTo(positions[firstIdx][0], 10);
      expect(col.startLngLat[1]).toBeCloseTo(positions[firstIdx][1], 10);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-018 — Eixo canônico da lateral física
// Verifica que startLngLat → endLngLat é o eixo canônico (xSegRep)
// e que todos os aspersores ficam dentro de TOLERANCIA_ASPERSOR_EIXO_LATERAL.
// ─────────────────────────────────────────────────────────────────────────────

describe("T18-a: grid 30° flat-earth — todos os aspersores < 0,01 m do eixo canônico", () => {
  // makeGridFlat garante X local idêntico por coluna — desvio é apenas ruído numérico.
  const positions = makeGridFlat(4, 8, 30);
  const cols = generatePhysicalColumns(
    positions, 30, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("maxSprinklerAxisDeviationM < 0,01 m em todas as colunas", () => {
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      const dev = maxSprinklerAxisDeviationM(col, positions, CENTROID);
      expect(dev).toBeLessThan(0.01);
    }
  });
});

describe("T18-b: grid 45° flat-earth — todos os aspersores < 0,01 m do eixo canônico", () => {
  const positions = makeGridFlat(4, 8, 45);
  const cols = generatePhysicalColumns(
    positions, 45, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("maxSprinklerAxisDeviationM < 0,01 m em todas as colunas", () => {
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      const dev = maxSprinklerAxisDeviationM(col, positions, CENTROID);
      expect(dev).toBeLessThan(0.01);
    }
  });
});

describe("T18-c: eixo canônico supera linha entre extremos reais quando X diverge", () => {
  // Coluna sintética: 5 aspersores em grid 30°.
  // Extremos têm X ±2 m do X canônico; intermediários estão no X canônico.
  // O eixo canônico (xSegRep = xCanon) passa exatamente pelos intermediários;
  // a linha entre os extremos reais ficaria até ~1 m fora dos intermediários.
  const M_PER_LAT = 111320;
  const mPerLng = M_PER_LAT * Math.cos((-12 * Math.PI) / 180);
  const angleRad = (30 * Math.PI) / 180;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);

  function localToLngLat(x: number, y: number): [number, number] {
    const drx = x * c - y * s;
    const dry = x * s + y * c;
    return [CENTROID.lng + drx / mPerLng, CENTROID.lat + dry / M_PER_LAT];
  }

  const xCanon = 100; // 100 m do centróide no frame local
  const offset = 2;   // 2 m de desvio nos extremos
  const yStep = SPACING;

  const positions: [number, number][] = [
    localToLngLat(xCanon + offset, 0),           // 1° aspersor: X+2 m
    localToLngLat(xCanon,          yStep),        // intermediário 1
    localToLngLat(xCanon,      2 * yStep),        // intermediário 2
    localToLngLat(xCanon,      3 * yStep),        // intermediário 3
    localToLngLat(xCanon - offset, 4 * yStep),   // último aspersor: X-2 m
  ];

  const cols = generatePhysicalColumns(
    positions, 30, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("gera exatamente 1 coluna com 5 aspersores", () => {
    expect(cols).toHaveLength(1);
    expect(cols[0].sprinklerIndices).toHaveLength(5);
  });

  it("startLngLat NÃO é idêntico à posição real do 1° aspersor (eixo canônico ≠ extremo real)", () => {
    const col = cols[0];
    const firstIdx = col.sprinklerIndices[0];
    // xSegRep = xCanon; posição real do 1° aspersor tem x = xCanon+2.
    // Diferença geodésica: ~2 m → >> 1e-6° → detectável com precisão 5.
    const sameAsFirst =
      Math.abs(col.startLngLat[0] - positions[firstIdx][0]) < 1e-6 &&
      Math.abs(col.startLngLat[1] - positions[firstIdx][1]) < 1e-6;
    expect(sameAsFirst).toBe(false);
  });

  it("aspersores intermediários estão a < 0,1 m do eixo canônico", () => {
    const col = cols[0];
    const line = turf.lineString([col.startLngLat, col.endLngLat]);
    // intermediários = sprinklerIndices[1..3]
    for (const idx of col.sprinklerIndices.slice(1, -1)) {
      const pt = turf.point(positions[idx]);
      const distM = turf.pointToLineDistance(pt, line, { units: "meters" });
      expect(distM).toBeLessThan(0.1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-019 — detectAxisDeviations
// Verifica que colunas com desvio acima de TOLERANCIA_ASPERSOR_EIXO_LATERAL
// (0,10 m) geram violations; colunas dentro da tolerância não geram.
// Tolerância é numérica/cartográfica — regra operacional Brasmáquinas.
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_LAT_T19 = 111320;
const mPerLngT19 = M_PER_LAT_T19 * Math.cos((-12 * Math.PI) / 180);

function localToLngLat0(x: number, y: number): [number, number] {
  return [CENTROID.lng + x / mPerLngT19, CENTROID.lat + y / M_PER_LAT_T19];
}

describe("T19-a: detectAxisDeviations — grid flat 4×8 a 30° → violations = []", () => {
  const positions = makeGridFlat(4, 8, 30);
  const cols = generatePhysicalColumns(
    positions, 30, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("nenhuma coluna viola a tolerância em grid flat correto", () => {
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations).toHaveLength(0);
    expect(report.maxDeviationM).toBeLessThan(0.01);
  });
});

describe("T19-b: detectAxisDeviations — desvio 0,04 m < 0,10 m → sem blocker", () => {
  // 3 aspersores: X₁=100.03, X₂=99.97, X₃=99.97 → xSegRep≈99.99, dev_X₁≈0.04 m
  const positions: [number, number][] = [
    localToLngLat0(100.03, 0),
    localToLngLat0(99.97, SPACING),
    localToLngLat0(99.97, 2 * SPACING),
  ];
  const cols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("desvio abaixo da tolerância não gera violation", () => {
    expect(cols).toHaveLength(1);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations).toHaveLength(0);
    expect(report.maxDeviationM).toBeLessThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
  });
});

describe("T19-c: detectAxisDeviations — desvio 0,40 m > 0,10 m → blocker", () => {
  // 3 aspersores: X₁=100.30, X₂=99.70, X₃=99.70 → xSegRep≈99.90, dev_X₁≈0.40 m
  const positions: [number, number][] = [
    localToLngLat0(100.30, 0),
    localToLngLat0(99.70, SPACING),
    localToLngLat0(99.70, 2 * SPACING),
  ];
  const cols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("desvio acima da tolerância gera exactly 1 violation", () => {
    expect(cols).toHaveLength(1);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].columnIndex).toBe(0);
    expect(report.violations[0].deviationM).toBeGreaterThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
    expect(report.maxDeviationM).toBeGreaterThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
  });
});

describe("T19-d: detectAxisDeviations — 2 colunas, 1 violadora, 1 ok", () => {
  // Coluna 0 (X≈0 m): 3 aspersores alinhados → ok
  // Coluna 1 (X≈12 m): X₁=12.30, X₂=11.70, X₃=11.70 → violation
  const posCol0: [number, number][] = [
    localToLngLat0(0, 0),
    localToLngLat0(0, SPACING),
    localToLngLat0(0, 2 * SPACING),
  ];
  const posCol1: [number, number][] = [
    localToLngLat0(SPACING + 0.30, 0),
    localToLngLat0(SPACING - 0.30, SPACING),
    localToLngLat0(SPACING - 0.30, 2 * SPACING),
  ];
  const positions = [...posCol0, ...posCol1];
  const cols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("exatamente 1 violation na coluna desalinhada", () => {
    expect(cols).toHaveLength(2);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations).toHaveLength(1);
  });
});

describe("T19-e: detectAxisDeviations — coluna com 1 aspersor → dev = 0", () => {
  const positions: [number, number][] = [
    localToLngLat0(0, 0),
  ];
  const cols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
  );

  it("coluna com 1 aspersor não gera violation", () => {
    expect(cols).toHaveLength(1);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations).toHaveLength(0);
    expect(report.maxDeviationM).toBe(0);
  });
});
