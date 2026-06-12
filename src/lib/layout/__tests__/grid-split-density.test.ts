/**
 * TASK-040 — Split automático por capacidade hidráulica em `generatePhysicalColumns`.
 *
 * Testes pela superfície pública:
 *   - generatePhysicalColumns (com e sem split disparado)
 *   - detectLateralCapacityViolations (report após split)
 *   - getCatalogoLateraisHomologadas5022 (subset DN50/DN75)
 *
 * Cobertura conforme ajuste 7 do plano aprovado:
 *   - DN75 já atende → não há split (caminho feliz)
 *   - Split em 2 resolve
 *   - Split recursivo (mais de 2 partes) é necessário
 *   - Caso patológico: mesmo split mínimo não resolve → blocker permanece
 *   - Nenhum aspersor some nem duplica
 *   - routeCoords preservado em cada sub-lateral
 *   - DN100 continua proibido para lateral 5022
 */

import { describe, it, expect } from "vitest";
import {
  generatePhysicalColumns,
  detectLateralCapacityViolations,
  getCatalogoLateraisHomologadas5022,
} from "@/lib/layout/laterais";
import { ASPERSOR_5022_SD_40X18 } from "@/lib/catalog/aspersores";

const SPACING = 12;
const CENTROID = { lng: -45, lat: -12 };
const ASPERSOR_MIN = {
  vazao: ASPERSOR_5022_SD_40X18.vazaoM3PorHora,
  pressaoServico: ASPERSOR_5022_SD_40X18.pressaoServicoMca,
};
const M_PER_LAT = 111320;
const mPerLng = M_PER_LAT * Math.cos((CENTROID.lat * Math.PI) / 180);
function localToLngLat(x: number, y: number): [number, number] {
  return [CENTROID.lng + x / mPerLng, CENTROID.lat + y / M_PER_LAT];
}
function makeColumn(n: number, xLocal = 0): [number, number][] {
  const positions: [number, number][] = [];
  for (let i = 0; i < n; i++) positions.push(localToLngLat(xLocal, i * SPACING));
  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// T40-1: caminho feliz — DN75 já atende; sem split
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-1 — caminho feliz (n=9): lateral única DN50 atende; nenhum split (TASK-083)", () => {
  it("n=9 → 1 coluna física, lateralCapacity.ok=true, splitIndex=0 (não dividida)", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(9); // 13,5 m³/h — cabe em DN50 (v=2,26; hf ok)
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    expect(cols).toHaveLength(1);
    expect(cols[0].lateralCapacity.ok).toBe(true);
    expect(cols[0].selecao.tubo.diametroMm).toBe(50); // TASK-083: lateral única DN50
    expect(cols[0].splitIndex).toBe(0);
    expect(cols[0].originalColumnIndex).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-2: split em 2 resolve (caso n=25)
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-2 — split em 2 resolve (n=25)", () => {
  it("n=25 → split em 2 sub-colunas; ambas com ok=true", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(25);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    expect(cols.length).toBeGreaterThanOrEqual(2);
    for (const c of cols) {
      expect(c.lateralCapacity.ok).toBe(true);
      expect(c.selecao.tubo.diametroMm).toBeLessThanOrEqual(75);
    }
    // Rastreabilidade: todas com originalColumnIndex = 0
    for (const c of cols) {
      expect(c.originalColumnIndex).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-3: split recursivo (n=80 pode precisar de mais que 2 partes)
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-3 — split recursivo em mais de 2 partes (n=80)", () => {
  it("n=80 → 3+ sub-colunas, todas com ok=true", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(80);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    // Bisseção: 80 → 40+40; cada 40 ainda excede → 20+20+20+20 = 4 sub-colunas
    expect(cols.length).toBeGreaterThanOrEqual(3);
    for (const c of cols) {
      expect(c.lateralCapacity.ok).toBe(true);
    }
    expect(detectLateralCapacityViolations(cols).hasBlockers).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-4: caso patológico — blocker permanece como fallback
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-4 — caso patológico (vazão extrema por aspersor): blocker permanece", () => {
  it("aspersor com vazão alta → 1 aspersor já excede DN75 → ok=false mantido", () => {
    // Aspersor sintético com vazão extrema: 50 m³/h/asp (vs. 1.5 do 5022 real).
    // Mesmo n=1: V em DN75 = 50/3600 / 0.003739 ≈ 3.71 m/s > 2.5 m/s.
    // Split mínimo (n=1) ainda excede → blocker técnico permanece (fallback).
    const subset = getCatalogoLateraisHomologadas5022();
    const extremeAspersor = { vazao: 50, pressaoServico: 30 };
    const positions = makeColumn(2);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, extremeAspersor, subset,
    );
    // Ao menos uma sub-coluna com ok=false (split mínimo não resolve)
    const someViolating = cols.some((c) => !c.lateralCapacity.ok);
    expect(someViolating).toBe(true);
    const report = detectLateralCapacityViolations(cols);
    expect(report.hasBlockers).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-5: nenhum aspersor some nem duplica após split
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-5 — preservação de aspersores após split", () => {
  it("n=40 → todos os 40 índices presentes exatamente uma vez", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(40);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    const allIndices = cols.flatMap((c) => c.sprinklerIndices).sort((a, b) => a - b);
    expect(allIndices).toEqual([...Array(40).keys()]);
    // Cada índice aparece exatamente uma vez (sem duplicação)
    const uniqueCount = new Set(allIndices).size;
    expect(uniqueCount).toBe(40);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-6: routeCoords preservado em cada sub-lateral
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-6 — routeCoords preservado em cada sub-lateral", () => {
  it("cada sub-coluna tem routeCoords ≥ 2 pontos; endpoints batem com start/end", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(40);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    expect(cols.length).toBeGreaterThan(1);
    for (const c of cols) {
      expect(c.routeCoords.length).toBeGreaterThanOrEqual(2);
      expect(c.routeCoords[0]).toEqual(c.startLngLat);
      expect(c.routeCoords[c.routeCoords.length - 1]).toEqual(c.endLngLat);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-7: DN100 continua proibido em lateral 5022
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-7 — DN100 nunca aparece em lateral 5022 após split", () => {
  it("subset homologado DN50/DN75 + split → nenhuma coluna com DN > 75", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(60);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    for (const c of cols) {
      expect(c.selecao.tubo.diametroMm).toBeLessThanOrEqual(75);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-8: cenário projeto-tipo Barreiras (337 asp em ~16 colunas)
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-8 — projeto-tipo Barreiras: sem violations após split", () => {
  it("grid 16 cols × 21 row → nenhuma sub-coluna excede DN75", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions: [number, number][] = [];
    for (let c = 0; c < 16; c++) {
      for (let r = 0; r < 21; r++) {
        positions.push(localToLngLat(c * SPACING, r * SPACING));
      }
    }
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    expect(cols.length).toBeGreaterThan(0);
    const report = detectLateralCapacityViolations(cols);
    expect(report.hasBlockers).toBe(false);
    expect(report.violations).toHaveLength(0);
    // Confirmação: total de aspersores = 16 × 21 = 336
    const totalAsp = cols.reduce((s, c) => s + c.sprinklerCount, 0);
    expect(totalAsp).toBe(336);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T40-9: split mínimo necessário (TASK-083: n=10 → 2 sub-colunas, não mais)
// ─────────────────────────────────────────────────────────────────────────────

describe("T40-9 — split mínimo necessário", () => {
  it("n=12 (acima do limite DN50 Dint 48,1) → exatamente 2 sub-colunas", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(12); // 18 m³/h > 16,3 (cap. 2,5 m/s em 48,1 mm)
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, subset,
    );
    // Caso limítrofe (lateral única DN50, Dint real 48,1): n=12 → 18 m³/h → v=2,75 > 2,5; split mínimo = 2.
    expect(cols).toHaveLength(2);
    for (const c of cols) {
      expect(c.lateralCapacity.ok).toBe(true);
    }
  });
});
