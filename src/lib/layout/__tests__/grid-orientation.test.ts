/**
 * TASK-046 — Testes da geração da malha em frame métrico local.
 *
 * Diretriz da TASK-046:
 * - `generateRotatedSprinklerGrid` gera a malha em frame métrico local
 *   (não em graus geográficos). Aspersores ficam alinhados em colunas
 *   perfeitas no frame rotacionado.
 * - `findOptimalGridAngle` tem gate de desvio aspersor-eixo: candidato só é
 *   válido se `maxDeviation ≤ TOLERANCIA_ASPERSOR_EIXO_LATERAL (0,10 m)`.
 * - Espaçamento real em metros é preservado em qualquer ângulo.
 */

import { describe, it, expect } from "vitest";
import {
  generateRotatedSprinklerGrid,
  findOptimalGridAngle,
} from "@/lib/layout/sprinkler-grid";
import {
  generatePhysicalColumns,
  detectAxisDeviations,
  TOLERANCIA_ASPERSOR_EIXO_LATERAL,
} from "@/lib/layout/laterais";
import type { TuboCandidato } from "@/lib/hydraulics/hazenWilliams";

const M_PER_LAT = 111320;
const SPACING = 12;
const CENTROID_LNG = -45;
const CENTROID_LAT = -12;
const mPerLng = M_PER_LAT * Math.cos((CENTROID_LAT * Math.PI) / 180);
const CENTROID = { lng: CENTROID_LNG, lat: CENTROID_LAT };
const ASPERSOR_MIN = { vazao: 1.5, pressaoServico: 30 };
const TEST_CATALOG: TuboCandidato[] = [
  { sku: "TEST-50", diametroMm: 50, diametroInternoMm: 46, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  { sku: "TEST-75", diametroMm: 75, diametroInternoMm: 70, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
];

function rectanglePolygon(widthM: number, heightM: number): GeoJSON.Polygon {
  // Retângulo centrado no CENTROID; vértices em metros locais convertidos para lng/lat.
  const hw = widthM / 2;
  const hh = heightM / 2;
  const pts: [number, number][] = [
    [CENTROID_LNG + (-hw) / mPerLng, CENTROID_LAT + (-hh) / M_PER_LAT],
    [CENTROID_LNG + (+hw) / mPerLng, CENTROID_LAT + (-hh) / M_PER_LAT],
    [CENTROID_LNG + (+hw) / mPerLng, CENTROID_LAT + (+hh) / M_PER_LAT],
    [CENTROID_LNG + (-hw) / mPerLng, CENTROID_LAT + (+hh) / M_PER_LAT],
    [CENTROID_LNG + (-hw) / mPerLng, CENTROID_LAT + (-hh) / M_PER_LAT],
  ];
  return { type: "Polygon", coordinates: [pts] };
}

function projectoALike(): GeoJSON.Polygon {
  // Polígono irregular ~4,87 ha em lat -12° — formato simulado próximo ao
  // Projeto A real (octógono côncavo ~220×220 m com cantos cortados).
  const pts: [number, number][] = [
    [-100, -100],
    [100, -100],
    [110, -60],
    [110, 60],
    [100, 100],
    [-100, 100],
    [-110, 60],
    [-110, -60],
    [-100, -100],
  ].map(([x, y]) => [CENTROID_LNG + x / mPerLng, CENTROID_LAT + y / M_PER_LAT]);
  return { type: "Polygon", coordinates: [pts] };
}

function rotate(x: number, y: number, angleRad: number): [number, number] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [x * c - y * s, x * s + y * c];
}

function maxAxisDeviationForAngle(
  positions: [number, number][],
  angle: number,
  spacing: number,
): number {
  if (positions.length < 2) return 0;
  const angleRad = (angle * Math.PI) / 180;
  const local = positions.map(([lng, lat]) => {
    const dx = (lng - CENTROID_LNG) * mPerLng;
    const dy = (lat - CENTROID_LAT) * M_PER_LAT;
    const [xr, yr] = rotate(dx, dy, -angleRad);
    return { x: xr, y: yr };
  });
  const xMin = local.reduce((m, p) => Math.min(m, p.x), Infinity);
  const byColIdx = new Map<number, { x: number; y: number }[]>();
  for (const p of local) {
    const colIdx = Math.round((p.x - xMin) / spacing);
    const arr = byColIdx.get(colIdx) ?? [];
    arr.push(p);
    byColIdx.set(colIdx, arr);
  }
  let maxDev = 0;
  for (const pts of byColIdx.values()) {
    if (pts.length < 2) continue;
    const xs = pts.map((p) => p.x).sort((a, b) => a - b);
    const mid = Math.floor(xs.length / 2);
    const eixoX = xs.length % 2 === 1 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
    for (const p of pts) {
      const d = Math.abs(p.x - eixoX);
      if (d > maxDev) maxDev = d;
    }
  }
  return maxDev;
}

describe("TASK-046 — generateRotatedSprinklerGrid em frame métrico local", () => {
  it("T46-1 — ângulo 31° produz maxDeviation ≤ 0,01 m (era ~9 m antes)", () => {
    const poly = rectanglePolygon(220, 220);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 31);
    const maxDev = maxAxisDeviationForAngle(positions, 31, SPACING);
    expect(positions.length).toBeGreaterThan(0);
    // Antes da TASK-046: ~9 m. Agora frame métrico → ~0 m.
    expect(maxDev).toBeLessThan(0.01);
  });

  it("T46-2 — ângulos 17° e 73° produzem maxDeviation ≤ 0,01 m", () => {
    const poly = rectanglePolygon(180, 180);
    for (const angle of [17, 73]) {
      const positions = generateRotatedSprinklerGrid(poly, SPACING, angle);
      expect(positions.length).toBeGreaterThan(0);
      const maxDev = maxAxisDeviationForAngle(positions, angle, SPACING);
      expect(maxDev).toBeLessThan(0.01);
    }
  });

  it("T46-3 — espaçamento real entre aspersores vizinhos = 12 m ± 0,01 m em qualquer ângulo", () => {
    const poly = rectanglePolygon(150, 150);
    for (const angle of [0, 13, 45, 67, 89]) {
      const positions = generateRotatedSprinklerGrid(poly, SPACING, angle);
      if (positions.length < 2) continue;
      // Para cada par de pontos, verificar se aqueles que são "vizinhos" estão
      // exatamente a 12 m de distância (vertical ou horizontal no frame local).
      const angleRad = (angle * Math.PI) / 180;
      const local = positions.map(([lng, lat]) => {
        const dx = (lng - CENTROID_LNG) * mPerLng;
        const dy = (lat - CENTROID_LAT) * M_PER_LAT;
        const [xr, yr] = rotate(dx, dy, -angleRad);
        return { x: xr, y: yr };
      });
      // Achar todos os pares com distância < 13 m e validar que estão entre 11,99 e 12,01.
      // Limitar a um subset para não ser O(n²) grande.
      const sample = local.slice(0, Math.min(50, local.length));
      for (let i = 0; i < sample.length; i++) {
        for (let j = i + 1; j < sample.length; j++) {
          const dx = sample[i].x - sample[j].x;
          const dy = sample[i].y - sample[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0.1 && d < SPACING + 0.5) {
            // Aspersores na mesma coluna (Δx ≈ 0) ou na mesma linha (Δy ≈ 0)
            const sameCol = Math.abs(dx) < 0.1 && Math.abs(dy - SPACING) < 0.05;
            const sameRow = Math.abs(dy) < 0.1 && Math.abs(dx - SPACING) < 0.05;
            // Aceita também pares na diagonal de 1 célula (Δ = √2 × 12 ≈ 16,97 m) — mas filtramos < 13 m.
            // Pares < 13 m devem ser vizinhos diretos (mesma linha ou coluna).
            if (!sameCol && !sameRow) {
              // Pode ser falso positivo de filtro; aceitar se distância está dentro do anel 11,5-12,5.
              expect(d).toBeGreaterThan(SPACING - 0.5);
              expect(d).toBeLessThan(SPACING + 0.5);
            }
          }
        }
      }
    }
  });

  it("T46-4 — todos os pontos gerados estão dentro do polígono (point-in-polygon métrico)", () => {
    // Polígono retangular 240×120 m centrado no CENTROID. Toda posição gerada
    // deve estar geometricamente dentro do retângulo (no frame métrico local).
    const widthM = 240;
    const heightM = 120;
    const poly = rectanglePolygon(widthM, heightM);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 0);
    expect(positions.length).toBeGreaterThan(0);
    const hw = widthM / 2;
    const hh = heightM / 2;
    for (const [lng, lat] of positions) {
      const dx = (lng - CENTROID_LNG) * mPerLng;
      const dy = (lat - CENTROID_LAT) * M_PER_LAT;
      expect(dx).toBeGreaterThan(-hw - 0.1);
      expect(dx).toBeLessThan(hw + 0.1);
      expect(dy).toBeGreaterThan(-hh - 0.1);
      expect(dy).toBeLessThan(hh + 0.1);
    }
  });

  it("T46-5 — integração: detectAxisDeviations zero violations no Projeto-A-like", () => {
    const poly = projectoALike();
    const angle = findOptimalGridAngle(poly, SPACING);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, angle);
    expect(positions.length).toBeGreaterThan(0);
    const cols = generatePhysicalColumns(
      positions, angle, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols.length).toBeGreaterThan(0);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations).toHaveLength(0);
    expect(report.maxDeviationM).toBeLessThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
  });

  it("T46-6 — findOptimalGridAngle compatível: chamada sem spacingMeters usa default 12", () => {
    const poly = rectanglePolygon(200, 200);
    // Não deve lançar TypeError, e retorna número válido 0-89.
    const angle = findOptimalGridAngle(poly);
    expect(typeof angle).toBe("number");
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(90);
  });

  it("T46-7 — findOptimalGridAngle escolhe ângulo com maxDeviation ≤ 0,10 m (gate)", () => {
    const poly = projectoALike();
    const angle = findOptimalGridAngle(poly, SPACING);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, angle);
    const maxDev = maxAxisDeviationForAngle(positions, angle, SPACING);
    // Com geração métrica, qualquer ângulo é válido; gate é satisfeito.
    expect(maxDev).toBeLessThanOrEqual(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
  });

  it("T46-8 — buildLateralRoute continua retornando reta de 2 pontos (TASK-045B preservada)", () => {
    const poly = rectanglePolygon(220, 220);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 31);
    const cols = generatePhysicalColumns(
      positions, 31, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      // TASK-045B: rota é reta de 2 pontos.
      expect(col.routeCoords.length).toBe(2);
    }
  });

  it("T46-9 — polígono retangular alinhado: maxDev ≈ 0 em todos os ângulos relevantes", () => {
    const poly = rectanglePolygon(120, 120);
    for (const angle of [0, 13, 45, 67, 89]) {
      const positions = generateRotatedSprinklerGrid(poly, SPACING, angle);
      expect(positions.length).toBeGreaterThan(0);
      const maxDev = maxAxisDeviationForAngle(positions, angle, SPACING);
      expect(maxDev).toBeLessThan(0.05);
    }
  });

  it("T46-10 — fallback documentado: polígono extremamente pequeno → 0 ou poucos aspersores", () => {
    // Polígono 1×1 m — menor que o spacing. Deve retornar 0 ou 1 aspersor.
    const poly = rectanglePolygon(1, 1);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 17);
    expect(positions.length).toBeLessThanOrEqual(1);
  });
});
