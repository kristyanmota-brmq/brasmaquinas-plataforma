/**
 * Testes de regressão para buildSectorsByFlow.
 *
 * Critérios:
 * 1. Agrupamento round-based em metros (não greedy em graus) — cada coluna de grade
 *    recebe exatamente um setor, independente da rotação.
 * 2. Distribuição balanceada por vazão acumulada para grade uniforme.
 * 3. Setores de borda não geram grande desbalanceamento mesmo com número ímpar de colunas.
 */

import { describe, it, expect } from "vitest";
import { buildSectorsByFlow } from "@/lib/layout/sectorization";
import { ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
const VAZ = ASPERSOR_PADRAO.vazaoM3PorHora;         // m³/h por aspersor

/** Grade de aspersores em frame local (column-major). */
function makeGrid(
  cols: number,
  rows: number,
  spacingM: number,
  centroid: { lng: number; lat: number },
  angleDeg = 0,
): [number, number][] {
  const mPerLng = 111320 * Math.cos((centroid.lat * Math.PI) / 180);
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const positions: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const xLocal = (c - (cols - 1) / 2) * spacingM;
      const yLocal = (r - (rows - 1) / 2) * spacingM;
      // Rotacionar de volta para LngLat (rotação inversa de generatePhysicalColumns)
      const xWorld = cosA * xLocal - sinA * yLocal;
      const yWorld = sinA * xLocal + cosA * yLocal;
      positions.push([centroid.lng + xWorld / mPerLng, centroid.lat + yWorld / 111320]);
    }
  }
  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Agrupamento round-based em metros
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste S1 — buildSectorsByFlow: agrupamento round-based em metros", () => {
  const COLS = 10, ROWS = 8, N = 4;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const result = buildSectorsByFlow(positions, N, 0, CENTROID, SPACING, VAZ);

  it("retorna sectorIndices com o mesmo comprimento das posições", () => {
    expect(result.sectorIndices).toHaveLength(positions.length);
  });

  it("todos os setores estão no intervalo [0, N)", () => {
    for (const s of result.sectorIndices) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(N);
    }
  });

  it("todos os N setores são usados", () => {
    const unique = new Set(result.sectorIndices);
    expect(unique.size).toBe(N);
  });

  it("posições da mesma coluna recebem o mesmo setor (setores contíguos por coluna)", () => {
    const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
    const xMin = Math.min(...positions.map(([lng]) => (lng - CENTROID.lng) * mPerLng));
    const colByPos = positions.map(([lng]) => {
      const x = (lng - CENTROID.lng) * mPerLng;
      return Math.round((x - xMin) / SPACING);
    });
    const uniqueCols = [...new Set(colByPos)].sort((a, b) => a - b);

    for (const c of uniqueCols) {
      const sectorsInCol = new Set(
        positions
          .map((_, i) => (colByPos[i] === c ? result.sectorIndices[i] : undefined))
          .filter((s): s is number => s !== undefined),
      );
      expect(sectorsInCol.size).toBe(1);
    }
  });

  it("grade rotacionada 15° produz o mesmo número de setores", () => {
    const posRot = makeGrid(COLS, ROWS, SPACING, CENTROID, 15);
    const res = buildSectorsByFlow(posRot, N, 15, CENTROID, SPACING, VAZ);
    const unique = new Set(res.sectorIndices);
    expect(unique.size).toBe(N);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Balanceamento de vazão para grade uniforme
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste S2 — buildSectorsByFlow: balanceamento de vazão (grade uniforme)", () => {
  const COLS = 20, ROWS = 10, N = 4;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const result = buildSectorsByFlow(positions, N, 0, CENTROID, SPACING, VAZ);

  it("soma de sprinklersPerSector = total de aspersores", () => {
    const total = result.sprinklersPerSector.reduce((s, c) => s + c, 0);
    expect(total).toBe(positions.length);
  });

  it("desbalanceamento < 20% para grade uniforme de 20 colunas", () => {
    expect(result.desbalanceamentoPercent).toBeLessThan(20);
  });

  it("cada setor tem vazão > 0", () => {
    for (const v of result.vazaoPorSetor) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it("vazaoPorSetor.length = N", () => {
    expect(result.vazaoPorSetor).toHaveLength(N);
  });

  it("vazão total = aspersores × VAZ por aspersor", () => {
    const totalVaz = result.vazaoPorSetor.reduce((s, v) => s + v, 0);
    expect(totalVaz).toBeCloseTo(positions.length * VAZ, 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Setores de borda com número ímpar de colunas
// ─────────────────────────────────────────────────────────────────────────────
describe("Teste S3 — buildSectorsByFlow: setores de borda com colunas ímpares", () => {
  // 11 colunas × 10 linhas, 3 setores → não divide igualmente
  const COLS = 11, ROWS = 10, N = 3;
  const positions = makeGrid(COLS, ROWS, SPACING, CENTROID);
  const result = buildSectorsByFlow(positions, N, 0, CENTROID, SPACING, VAZ);

  it("desbalanceamento ≤ 40% com 11 colunas e 3 setores (ótimo teórico: 4/4/3 → ~27%)", () => {
    // 11 colunas uniformes / 3 setores → ótimo possível é floor/ceil: 4/4/3 ≈ 27%
    // Verificar que o algoritmo não piora além de uma folga razoável.
    expect(result.desbalanceamentoPercent).toBeLessThan(40);
  });

  it("todos os N setores têm pelo menos um aspersor", () => {
    for (const c of result.sprinklersPerSector) {
      expect(c).toBeGreaterThan(0);
    }
  });

  it("n = 14 setores para 38 colunas: desbalanceamento ≤ 45% (ótimo teórico 3/3/2-mix → ~37%)", () => {
    // 38 colunas / 14 setores = 2,71 cols/setor → ótimo = mix 3-col e 2-col.
    // (3-2)/2,71 * 100 = 36,9 % — o algoritmo deve ficar próximo disso, nunca acima de 45 %.
    const pos38 = makeGrid(38, 18, SPACING, CENTROID);
    const res = buildSectorsByFlow(pos38, 14, 0, CENTROID, SPACING, VAZ);
    expect(res.desbalanceamentoPercent).toBeLessThan(45);
    // E deve ser melhor que o dobro do ótimo (não pode ser catastrófico)
    expect(res.desbalanceamentoPercent).toBeLessThan(70);
  });

  it("n > totalColumns: usa effectiveN = totalColumns", () => {
    const pos5 = makeGrid(5, 5, SPACING, CENTROID);
    const res = buildSectorsByFlow(pos5, 20, 0, CENTROID, SPACING, VAZ);
    // No máximo 5 setores distintos
    const unique = new Set(res.sectorIndices);
    expect(unique.size).toBeLessThanOrEqual(5);
  });

  it("grade vazia retorna arrays vazios", () => {
    const res = buildSectorsByFlow([], 4, 0, CENTROID, SPACING, VAZ);
    expect(res.sectorIndices).toHaveLength(0);
    expect(res.sprinklersPerSector).toHaveLength(0);
  });
});
