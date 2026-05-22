/**
 * TASK-045B — Testes do novo contrato: lateral é reta única no eixo (mediana de X).
 *
 * Diretriz da TASK-045B:
 * - `buildLateralRoute` retorna **sempre reta de 2 pontos** no eixo único.
 * - Eixo é calculado pela **mediana de X** (robusto contra outliers).
 * - Aspersor fora de TOLERANCIA_ASPERSOR_EIXO_LATERAL (0,10 m) → blocker via
 *   `detectAxisDeviations` (ADR-011), NÃO compensação por cotovelo.
 * - Outlier NÃO mascarado pelo cálculo do eixo: mediana ignora outliers.
 */

import { describe, it, expect } from "vitest";
import {
  buildLateralRoute,
  generatePhysicalColumns,
  detectAxisDeviations,
  deriveLateraisFromNetwork,
  TOLERANCIA_ASPERSOR_EIXO_LATERAL,
  type PhysicalColumn,
  type Lateral,
} from "@/lib/layout/laterais";
import { detectNetworkAngleIssues } from "@/lib/layout/network-angle-diagnostics";
import { deriveOperationalSegments } from "@/lib/layout/sectorization";
import type { TuboCandidato } from "@/lib/hydraulics/hazenWilliams";

const SPACING = 12;
const CENTROID = { lng: -45, lat: -12 };
const ASPERSOR_MIN = { vazao: 1.5, pressaoServico: 30 };
const TEST_CATALOG: TuboCandidato[] = [
  { sku: "TEST-50", diametroMm: 50, diametroInternoMm: 46, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  { sku: "TEST-75", diametroMm: 75, diametroInternoMm: 70, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
];

const M_PER_LAT = 111320;
const mPerLng = M_PER_LAT * Math.cos((CENTROID.lat * Math.PI) / 180);

function localToLngLat(x: number, y: number): [number, number] {
  return [CENTROID.lng + x / mPerLng, CENTROID.lat + y / M_PER_LAT];
}

describe("TASK-045B — Lateral reta única no eixo (mediana de X)", () => {
  it("T45B-1 — pontos levemente desalinhados (≤ 0,01 m) geram routeCoords.length === 2", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.005, y: 12 },
      { x: -0.003, y: 24 },
      { x: 0.001, y: 36 },
    ];
    const result = buildLateralRoute(pts, localToLngLat);
    expect(result.routeCoords.length).toBe(2);
    expect(result.anglesValid).toBe(true);
  });

  it("T45B-2 — qualquer entrada com aspersores genuinamente alinhados produz reta de 2 pontos", () => {
    const cases = [
      [{ x: 0, y: 0 }, { x: 0, y: 12 }],
      [{ x: 0, y: 0 }, { x: 0, y: 12 }, { x: 0, y: 24 }],
      [{ x: 100, y: 0 }, { x: 100, y: 12 }, { x: 100, y: 24 }, { x: 100, y: 36 }, { x: 100, y: 48 }],
    ];
    for (const pts of cases) {
      const result = buildLateralRoute(pts, localToLngLat);
      expect(result.routeCoords.length).toBe(2);
      expect(result.anglesValid).toBe(true);
    }
  });

  it("T45B-3 — aspersor outlier (0,15 m do eixo) → dispara blocker via detectAxisDeviations", () => {
    // 4 aspersores: 3 alinhados em X=0; 1 outlier em X=0,15.
    // Mediana de [0, 0, 0, 0.15] = 0. Eixo em X=0. Outlier a 0,15 m → blocker.
    const positions: [number, number][] = [
      localToLngLat(0, 0),
      localToLngLat(0, SPACING),
      localToLngLat(0.15, 2 * SPACING),  // outlier
      localToLngLat(0, 3 * SPACING),
    ];
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols).toHaveLength(1);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    expect(report.maxDeviationM).toBeGreaterThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
  });

  it("T45B-4 — aspersor no limite exato 0,10 m do eixo: passa OU bloqueia (binário no limite)", () => {
    // Mediana de [0, 0, 0, 0.10] = 0. Aspersor X=0,10 fica a 0,10 m do eixo.
    // detectAxisDeviations usa `dev > TOLERANCIA` (estrito), então 0,10 exato NÃO viola.
    const positions: [number, number][] = [
      localToLngLat(0, 0),
      localToLngLat(0, SPACING),
      localToLngLat(0, 2 * SPACING),
      localToLngLat(0.10, 3 * SPACING),
    ];
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols).toHaveLength(1);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    // No limite exato: aceito (≤ TOLERANCIA, não estritamente >)
    expect(report.maxDeviationM).toBeLessThanOrEqual(TOLERANCIA_ASPERSOR_EIXO_LATERAL + 0.01);
  });

  it("T45B-5 — outlier NÃO mascarado pelo cálculo do eixo (mediana > média)", () => {
    // Com média: [0, 0, 0, 0, 0.50] → mean = 0.10. Aspersor 0,50 fica a 0,40 m do
    // eixo da média. Mas se eixo = 0,10, os outros 4 aspersores ficam a 0,10 do eixo.
    // Com mediana: [0, 0, 0, 0, 0.50] → median = 0. Outlier fica a 0,50 m do eixo.
    // Mediana é RESISTENTE a outliers: o eixo permanece sobre o conjunto principal.
    const pts = [
      { x: 0, y: 0 },
      { x: 0, y: SPACING },
      { x: 0, y: 2 * SPACING },
      { x: 0, y: 3 * SPACING },
      { x: 0.50, y: 4 * SPACING }, // outlier grande
    ];
    const result = buildLateralRoute(pts, localToLngLat);
    // Reta de 2 pontos
    expect(result.routeCoords.length).toBe(2);
    // Eixo na mediana = 0 (não em 0.10 que seria a média)
    const local = result.routeCoords.map(([lng, lat]) => ({
      x: (lng - CENTROID.lng) * mPerLng,
      y: (lat - CENTROID.lat) * M_PER_LAT,
    }));
    expect(Math.abs(local[0].x)).toBeLessThan(0.01);
    expect(Math.abs(local[1].x)).toBeLessThan(0.01);

    // Em integração: outlier a 0,50 m do eixo → blocker
    const positions: [number, number][] = pts.map((p) => localToLngLat(p.x, p.y));
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    expect(report.maxDeviationM).toBeGreaterThan(0.40);
  });

  it("T45B-6 — lengthM = yMax − yMin (distância vertical pura)", () => {
    const pts = [
      { x: 0.02, y: 0 },
      { x: -0.01, y: 12 },
      { x: 0.03, y: 24 },
      { x: 0, y: 36 },
    ];
    const result = buildLateralRoute(pts, localToLngLat);
    // yMax − yMin = 36 − 0 = 36 m. Sem dobras horizontais que somariam.
    expect(result.lengthM).toBeGreaterThan(36 - 0.05);
    expect(result.lengthM).toBeLessThan(36 + 0.05);
  });

  it("T45B-7 — anglesValid === true sempre (reta é geometricamente válida)", () => {
    const cases = [
      [{ x: 0, y: 0 }, { x: 0, y: 12 }],
      [{ x: 0, y: 0 }, { x: 100, y: 12 }, { x: 50, y: 24 }],
      [{ x: 0, y: 0 }],
      [],
    ];
    for (const pts of cases) {
      const result = buildLateralRoute(pts, localToLngLat);
      expect(result.anglesValid).toBe(true);
    }
  });

  it("T45B-8 — deriveLateraisFromNetwork não recria escada: laterais têm 2 pontos", () => {
    // 4 aspersores em coluna; setor único cobrindo todos.
    const positions: [number, number][] = [
      localToLngLat(0, 0),
      localToLngLat(0.03, SPACING),
      localToLngLat(-0.02, 2 * SPACING),
      localToLngLat(0.01, 3 * SPACING),
    ];
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    const sectorIds = [0, 0, 0, 0];
    const ops = deriveOperationalSegments(cols, sectorIds, ASPERSOR_MIN.vazao);
    const laterais: Lateral[] = deriveLateraisFromNetwork(
      cols, ops, positions, SPACING, ASPERSOR_MIN, TEST_CATALOG, 0, CENTROID,
    );
    // Toda lateral derivada tem routeCoords.length === 2 (reta pós-TASK-045B)
    for (const lat of laterais) {
      expect(lat.routeCoords.length).toBe(2);
    }
  });

  it("T45B-9 — splitByCapacity preserva laterais retas (cada sub-coluna é reta)", () => {
    // Coluna longa que dispara split: cada sub-coluna deve ter routeCoords.length === 2.
    const positions: [number, number][] = [];
    for (let i = 0; i < 30; i++) {
      positions.push(localToLngLat(0.02 * Math.sin(i), i * SPACING));
    }
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    // Pode haver split (mais que 1 coluna); cada uma deve ser reta.
    for (const col of cols) {
      expect(col.routeCoords.length).toBe(2);
    }
  });

  it("T45B-10 — detector angular continua ativo: dobra real 45° em principal vira blocker", () => {
    // Não-regressão: detector angular não é mascarado pelo novo algoritmo.
    const principal: [number, number][] = [
      [0, 0],
      [12 / M_PER_LAT, 0],
      [(12 + 8.485) / M_PER_LAT, 8.485 / M_PER_LAT],
    ];
    const report = detectNetworkAngleIssues({
      principalCoords: principal,
      adutoraCoords: [[0, 0], principal[0]],
      secondaries: [],
      physicalColumns: [],
      centroid: CENTROID,
    });
    expect(report.hasBlockers).toBe(true);
  });

  it("T45B-11 — Projeto-A-like com ruído de rotação NÃO gera zigue-zague", () => {
    // 16 colunas × 21 aspersores (cenário Projeto A em Barreiras com ruído numérico
    // típico de rotação Haversine). Cada coluna deve produzir lateral reta (2 pontos).
    const positions: [number, number][] = [];
    // Simular ruído de rotação Haversine em lat -12° com ângulo 31°.
    const angleRad = (31 * Math.PI) / 180;
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    for (let col = 0; col < 16; col++) {
      for (let row = 0; row < 21; row++) {
        // Posição ideal local: (col*SPACING, row*SPACING).
        // Aplicar rotação para gerar X global; depois "desrotacionar" introduz ruído.
        const xLocal = col * SPACING;
        const yLocal = row * SPACING;
        const xGlobal = xLocal * c - yLocal * s;
        const yGlobal = xLocal * s + yLocal * c;
        positions.push([
          CENTROID.lng + xGlobal / mPerLng,
          CENTROID.lat + yGlobal / M_PER_LAT,
        ]);
      }
    }
    const cols = generatePhysicalColumns(
      positions, 31, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols.length).toBeGreaterThanOrEqual(1);
    // Cada coluna gerada deve ter rota reta de 2 pontos (sem escada)
    for (const col of cols) {
      expect(col.routeCoords.length).toBe(2);
    }
    // Detector de eixo deve não disparar (aspersores alinhados após rotação)
    const report = detectAxisDeviations(cols, positions, CENTROID);
    expect(report.violations).toHaveLength(0);
  });
});
