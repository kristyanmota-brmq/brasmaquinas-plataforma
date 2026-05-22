/**
 * TASK-028 — Construção da rota física da lateral (polilinha 0°/90°)
 *
 * Cobre:
 *  - buildLateralRoute(): rota reta, rota em L, polilinha zigue-zague.
 *  - Comprimento da polilinha vs. fórmula ideal (n-1)·s.
 *  - maxSprinklerAxisDeviationM(): caminho preferido (polilinha) e fallback (reta).
 *  - Invariante: ângulos consecutivos ∈ {0°, 90°, 180°}.
 *  - Invariante: primeiro segmento da rota é sempre vertical no frame local.
 */

import { describe, it, expect } from "vitest";
import {
  buildLateralRoute,
  generatePhysicalColumns,
  maxSprinklerAxisDeviationM,
  detectAxisDeviations,
  TOLERANCIA_ASPERSOR_EIXO_LATERAL,
  type PhysicalColumn,
} from "@/lib/layout/laterais";
import type { TuboCandidato, SelecaoTubo } from "@/lib/hydraulics/hazenWilliams";

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

/** Helper de teste: produz toLngLatFn identidade no frame local-eixos-cartesianos. */
function toLngLatId(): (x: number, y: number) => [number, number] {
  return localToLngLat;
}

/** Ângulo (graus) entre dois vetores 2D — usado para verificar 0°/90°/180°. */
function angleDeg(a: [number, number], b: [number, number]): number {
  const magA = Math.hypot(a[0], a[1]);
  const magB = Math.hypot(b[0], b[1]);
  if (magA < 1e-12 || magB < 1e-12) return 0;
  const cos = Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (magA * magB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

describe("T28-1 — buildLateralRoute: coluna alinhada → reta única no eixo (TASK-045B)", () => {
  it("3 aspersores no mesmo X local geram reta de 2 pontos no eixo X=0", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0, y: SPACING },
      { x: 0, y: 2 * SPACING },
    ];
    const { routeCoords, lengthM, anglesValid } = buildLateralRoute(pts, toLngLatId());
    // TASK-045B: reta de 2 pontos sempre — eixo único pela mediana.
    expect(routeCoords.length).toBe(2);
    expect(anglesValid).toBe(true);
    // Eixo na mediana (= 0); ambos os vértices em X=0.
    const local = routeCoords.map(([lng, lat]) => ({
      x: (lng - CENTROID.lng) * mPerLng,
      y: (lat - CENTROID.lat) * M_PER_LAT,
    }));
    for (const p of local) expect(Math.abs(p.x)).toBeLessThan(0.01);
    // Comprimento = yMax − yMin = 2 × SPACING (24 m) — reta vertical.
    expect(lengthM).toBeGreaterThan(2 * SPACING - 0.01);
    expect(lengthM).toBeLessThan(2 * SPACING + 0.01);
  });
});

describe("T28-2 — buildLateralRoute: aspersor outlier → reta no eixo, NÃO cotovelo (TASK-045B)", () => {
  // TASK-045B: a rota NÃO compensa aspersor desalinhado com cotovelo.
  // Aspersor outlier vira blocker via detectAxisDeviations em integração.
  // Aqui apenas validamos que buildLateralRoute retorna reta de 2 pontos no eixo.
  it("aspersor outlier 12 m de outro: reta de 2 pontos na mediana (sem cotovelo)", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: SPACING, y: SPACING },
    ];
    const { routeCoords, anglesValid } = buildLateralRoute(pts, toLngLatId());
    expect(routeCoords).toHaveLength(2);
    expect(anglesValid).toBe(true);

    const local = routeCoords.map(([lng, lat]) => ({
      x: (lng - CENTROID.lng) * mPerLng,
      y: (lat - CENTROID.lat) * M_PER_LAT,
    }));
    // Mediana de [0, 12] = 6. Ambos os vértices em X=6.
    expect(Math.abs(local[0].x - SPACING / 2)).toBeLessThan(0.01);
    expect(Math.abs(local[1].x - SPACING / 2)).toBeLessThan(0.01);
    // Sem ângulos intermediários (apenas 1 segmento).
    expect(local.length).toBe(2);
  });
});

describe("T28-3 — buildLateralRoute: outliers múltiplos → reta na mediana (TASK-045B)", () => {
  it("aspersores alternando X=0/X=2: reta no eixo da mediana (X=0)", () => {
    // Mediana de [0, 2, 0, 2, 0] sorted [0,0,0,2,2] → mediana = 0
    const pts = [
      { x: 0, y: 0 },
      { x: 2, y: SPACING },
      { x: 0, y: 2 * SPACING },
      { x: 2, y: 3 * SPACING },
      { x: 0, y: 4 * SPACING },
    ];
    const { routeCoords, anglesValid } = buildLateralRoute(pts, toLngLatId());
    expect(anglesValid).toBe(true);
    // TASK-045B: sempre reta de 2 pontos
    expect(routeCoords.length).toBe(2);

    const local = routeCoords.map(([lng, lat]) => ({
      x: (lng - CENTROID.lng) * mPerLng,
      y: (lat - CENTROID.lat) * M_PER_LAT,
    }));
    // Eixo na mediana = 0
    expect(Math.abs(local[0].x)).toBeLessThan(0.01);
    expect(Math.abs(local[1].x)).toBeLessThan(0.01);
    // Aspersores em X=2 ficariam a 2 m do eixo → seriam blockers em integração
    // (detectAxisDeviations) — testado em outro lugar.
  });
});

describe("T28-4 — buildLateralRoute: comprimento = soma dos segmentos", () => {
  it("lengthM iguala a soma das distâncias entre vértices consecutivos", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 3, y: SPACING },
      { x: 0, y: 2 * SPACING },
    ];
    const { routeCoords, lengthM } = buildLateralRoute(pts, toLngLatId());

    // Soma manual em metros usando frame local.
    let sum = 0;
    const local = routeCoords.map(([lng, lat]) => [
      (lng - CENTROID.lng) * mPerLng,
      (lat - CENTROID.lat) * M_PER_LAT,
    ]);
    for (let i = 1; i < local.length; i++) {
      const dx = local[i][0] - local[i - 1][0];
      const dy = local[i][1] - local[i - 1][1];
      sum += Math.sqrt(dx * dx + dy * dy);
    }
    expect(lengthM).toBeCloseTo(sum, 2);
    // Sanidade: a polilinha é maior que a reta start→end (porque tem dobras).
    const dxEnd = local[local.length - 1][0] - local[0][0];
    const dyEnd = local[local.length - 1][1] - local[0][1];
    const straight = Math.sqrt(dxEnd * dxEnd + dyEnd * dyEnd);
    expect(sum).toBeGreaterThan(straight - 0.01);
  });
});

describe("T28-5 — maxSprinklerAxisDeviationM com aspersores genuinamente alinhados (TASK-045B)", () => {
  it("desvio é ≤ erro numérico para aspersores alinhados dentro de ~0,01 m", () => {
    // TASK-045B: rota é reta na mediana; aspersores alinhados em ~0,01 m do eixo
    // têm desvio ≤ erro numérico. Aspersores genuinamente desalinhados (≥ 0,10 m)
    // viram blocker — testado em T28-c-violation.
    const positions: [number, number][] = [
      localToLngLat(100.00, 0),
      localToLngLat(100.01, SPACING),
      localToLngLat(99.99, 2 * SPACING),
      localToLngLat(100.00, 3 * SPACING),
      localToLngLat(100.01, 4 * SPACING),
    ];
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols).toHaveLength(1);
    const dev = maxSprinklerAxisDeviationM(cols[0], positions, CENTROID);
    expect(dev).toBeLessThan(0.05);
  });
});

describe("T28-6 — Fallback do blocker quando routeCoords está ausente (sintético)", () => {
  // Constrói uma PhysicalColumn manualmente onde routeCoords aponta para uma
  // RETA que NÃO passa por um dos aspersores (caso fallback). O cálculo deve
  // usar a polilinha para medir desvio e disparar violation.
  it("aspersor fora da rota gera violation via detectAxisDeviations", () => {
    const dummySelecao: SelecaoTubo = {
      tubo: TEST_CATALOG[0],
      perdaCargaM: 0,
      velocidadeMs: 0,
      perdaCargaPercentual: 0,
    };
    const positions: [number, number][] = [
      localToLngLat(0, 0),
      localToLngLat(0, SPACING),
      localToLngLat(5, 2 * SPACING), // aspersor real está a 5 m do eixo X=0
    ];
    // routeCoords intencionalmente NÃO cobre o aspersor 2 (rota reta vertical em X=0).
    const start = localToLngLat(0, 0);
    const end = localToLngLat(0, 2 * SPACING);
    const col: PhysicalColumn = {
      id: "col-0",
      columnIndex: 0,
      startLngLat: start,
      endLngLat: end,
      comprimentoM: 2 * SPACING,
      sprinklerCount: 3,
      vazaoM3h: 4.5,
      selecao: dummySelecao,
      sectorsTouched: [0],
      sprinklerIndices: [0, 1, 2],
      routeCoords: [start, end],
      lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
    };
    const dev = maxSprinklerAxisDeviationM(col, positions, CENTROID);
    expect(dev).toBeGreaterThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);

    const report = detectAxisDeviations([col], positions, CENTROID);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].columnIndex).toBe(0);
    expect(report.violations[0].deviationM).toBeGreaterThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
  });
});

describe("T28-7 — generatePhysicalColumns: comprimentoM = comprimento da reta no eixo (TASK-045B)", () => {
  it("coluna alinhada: comprimentoM = (yMax − yMin) + 0,5 (sem dobras)", () => {
    // TASK-045B: rota é reta no eixo (mediana). Comprimento = yMax − yMin + 0,5
    // independente de pequenos desvios em X (que viram blocker se > 0,10 m).
    const positions: [number, number][] = [
      localToLngLat(0, 0),
      localToLngLat(0.02, SPACING),
      localToLngLat(0, 2 * SPACING),
      localToLngLat(0, 3 * SPACING),
    ];
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols).toHaveLength(1);
    // Comprimento ideal: 3·12 + 0.5 = 36.5 m
    const idealLen = 3 * SPACING + 0.5;
    // Tolerância pequena para ruído numérico (mas SEM as dobras espúrias antigas).
    expect(cols[0].comprimentoM).toBeGreaterThan(idealLen - 0.05);
    expect(cols[0].comprimentoM).toBeLessThan(idealLen + 0.05);
  });
});

describe("T28-8 — Cenário S-suave: aspersores fora do eixo GERAM blocker (TASK-045B emenda ADR-012)", () => {
  it("S-suave ±0,40 m: detector dispara blocker; rota não compensa com cotovelos", () => {
    // TASK-045B: a rota não é mais usada para "salvar" aspersores desalinhados.
    // Aspersores a 0,40 m do eixo (mediana = 0) → blocker dispara.
    // Comportamento esperado pós-emenda da ADR-012: rota reta + blocker se fora.
    const positions: [number, number][] = [
      localToLngLat(0.40, 0),
      localToLngLat(-0.40, SPACING),
      localToLngLat(0.40, 2 * SPACING),
      localToLngLat(-0.40, 3 * SPACING),
      localToLngLat(0.40, 4 * SPACING),
      localToLngLat(-0.40, 5 * SPACING),
    ];
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
    );
    expect(cols).toHaveLength(1);
    const report = detectAxisDeviations(cols, positions, CENTROID);
    // 0,40 m > TOLERANCIA_ASPERSOR_EIXO_LATERAL (0,10 m) → violation
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    expect(report.maxDeviationM).toBeGreaterThan(TOLERANCIA_ASPERSOR_EIXO_LATERAL);
  });
});

describe("T28-9 — Endpoints da rota: startLngLat === routeCoords[0] e endLngLat === routeCoords[last]", () => {
  it("invariante de endpoints preservada em colunas com e sem dobras", () => {
    const positionsAlignedSet: [number, number][] = [
      localToLngLat(0, 0),
      localToLngLat(0, SPACING),
      localToLngLat(0, 2 * SPACING),
    ];
    const positionsDobrasSet: [number, number][] = [
      localToLngLat(0, 0),
      localToLngLat(2, SPACING),
      localToLngLat(2, 2 * SPACING),
    ];
    for (const positions of [positionsAlignedSet, positionsDobrasSet]) {
      const cols = generatePhysicalColumns(
        positions, 0, CENTROID, SPACING, ASPERSOR_MIN, TEST_CATALOG,
      );
      expect(cols).toHaveLength(1);
      const col = cols[0];
      expect(col.routeCoords[0]).toEqual(col.startLngLat);
      expect(col.routeCoords[col.routeCoords.length - 1]).toEqual(col.endLngLat);
    }
  });
});
