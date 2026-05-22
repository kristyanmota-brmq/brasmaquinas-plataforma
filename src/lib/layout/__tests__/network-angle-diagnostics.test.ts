/**
 * Testes do módulo network-angle-diagnostics.
 *
 * Cada teste constrói uma geometria sintética mínima e verifica que
 * detectNetworkAngleIssues retorna o comportamento esperado.
 *
 * Convenção usada nos comentários:
 *   "deflexão 0°"  = trecho reto (luva)
 *   "deflexão 45°" = curva 45°
 *   "deflexão 90°" = curva 90° / tê 90°
 */
import { describe, it, expect } from "vitest";
import {
  detectNetworkAngleIssues,
  isAllowedDeflection,
  type NetworkAngleIssue,
} from "@/lib/layout/network-angle-diagnostics";
import type { PhysicalColumn } from "@/lib/layout/laterais";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";
import type { SelecaoTubo } from "@/lib/hydraulics/hazenWilliams";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de geometria sintética (plana, lat≈−12° para mPerLng realista)
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: 0, lat: -12.0 };

/**
 * Converte (Δlng_deg, Δlat_deg) em metros — útil para conferir manualmente
 * que os ângulos nos testes batem com os valores esperados.
 *   mPerLng ≈ 108 886 m/° @ lat −12°
 *   mPerLat ≈ 111 320 m/°
 */
function lngLatToMeters(dlng: number, dlat: number): [number, number] {
  const mPerLng = 111320 * Math.cos((-12 * Math.PI) / 180);
  return [dlng * mPerLng, dlat * 111320];
}

const DUMMY_SELECAO: SelecaoTubo = {
  tubo: { sku: "T50", diametroMm: 50, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  perdaCargaM: 0,
  velocidadeMs: 0,
  perdaCargaPercentual: 0,
};

function makeCol(
  start: [number, number],
  end: [number, number],
  id = "col-0",
): PhysicalColumn {
  return {
    id,
    columnIndex: 0,
    startLngLat: start,
    endLngLat: end,
    comprimentoM: 100,
    sprinklerCount: 5,
    vazaoM3h: 1,
    selecao: DUMMY_SELECAO,
    sectorsTouched: [0],
    sprinklerIndices: [0, 1, 2, 3, 4],
    routeCoords: [start, end],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

function makeSec(
  id: string,
  from: [number, number],
  to: [number, number],
  colId = "col-0",
): SecondaryPipe {
  const mPerLng = 111320 * Math.cos((-12 * Math.PI) / 180);
  const dx = (to[0] - from[0]) * mPerLng;
  const dy = (to[1] - from[1]) * 111320;
  return { id, physicalColumnId: colId, fromCoord: from, toCoord: to, lengthM: Math.sqrt(dx ** 2 + dy ** 2), source: "auto" };
}

// ─────────────────────────────────────────────────────────────────────────────
// isAllowedDeflection (unitário)
// ─────────────────────────────────────────────────────────────────────────────

describe("isAllowedDeflection", () => {
  it("0° → allowed (trecho reto)", () => {
    expect(isAllowedDeflection(0)).toBe(true);
  });

  it("45° → NOT allowed (proibido na rede interna — TASK-015)", () => {
    expect(isAllowedDeflection(45)).toBe(false);
  });

  it("90° → allowed (curva/tê 90°)", () => {
    expect(isAllowedDeflection(90)).toBe(true);
  });

  it("60° → NOT allowed", () => {
    expect(isAllowedDeflection(60)).toBe(false);
  });

  it("dentro da tolerância ±5°: 87° → allowed", () => {
    expect(isAllowedDeflection(87)).toBe(true);
  });

  it("fora da tolerância: 96° → NOT allowed", () => {
    expect(isAllowedDeflection(96)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T1 — principal reta (3 pontos colíneos) → sem issues
// ─────────────────────────────────────────────────────────────────────────────

describe("T1 — principal reta (deflexão 0°) → sem issues", () => {
  // Principal: 3 pontos E-O alinhados. Deflexão em B = 0°.
  const principalCoords: [number, number][] = [
    [0, -12.001],
    [0.001, -12.001],
    [0.002, -12.001],
  ];
  const adutoraCoords: [number, number][] = [[0, -12.002], [0, -12.001]];

  const report = detectNetworkAngleIssues({
    physicalColumns: [],
    secondaries: [],
    principalCoords,
    adutoraCoords,
    centroid: CENTROID,
  });

  it("hasBlockers = false", () => {
    expect(report.hasBlockers).toBe(false);
  });

  it("0 issues", () => {
    expect(report.issues).toHaveLength(0);
  });

  it("checkedElements = 1 (1 dobra interna da principal)", () => {
    expect(report.checkedElements).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T2 — dobra 90° na principal → sem issues
// ─────────────────────────────────────────────────────────────────────────────

describe("T2 — dobra 90° na principal → sem issues", () => {
  // A → B → C com curva 90°: A-B vai para E, B-C vai para N.
  // Deflexão em B = 90°.
  const mPerLng = 111320 * Math.cos((-12 * Math.PI) / 180);
  const d = 0.001; // ≈ 108.9 m
  const principalCoords: [number, number][] = [
    [0, -12.001],
    [d, -12.001],
    [d, -12.001 + d * (mPerLng / 111320)], // mesma distância mas para Norte
  ];

  const report = detectNetworkAngleIssues({
    physicalColumns: [],
    secondaries: [],
    principalCoords,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false para dobra 90°", () => {
    expect(report.hasBlockers).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T3 — dobra 60° na principal → blocker
// ─────────────────────────────────────────────────────────────────────────────

describe("T3 — dobra 60° na principal → blocker", () => {
  // A → B vai para E. B → C vai a 60° de A→B (NE a 60° do leste).
  // Deflexão em B = 60° → NOT allowed.
  const d = 0.001;
  // B→C em 60° a partir do vetor A→B (eastward):
  // Em metros: (cos(60°), sin(60°)) = (0.5, 0.866)
  // Convertido para graus: dlng = 0.5*d = 0.0005 ; dlat = 0.866*d = 0.000866
  const principalCoords: [number, number][] = [
    [0, -12.001],
    [d, -12.001],
    [d + 0.5 * d, -12.001 + 0.866 * d],
  ];

  const report = detectNetworkAngleIssues({
    physicalColumns: [],
    secondaries: [],
    principalCoords,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = true para dobra 60°", () => {
    expect(report.hasBlockers).toBe(true);
  });

  it("1 issue com elementType='principal'", () => {
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].elementType).toBe("principal");
  });

  it("severity = 'blocker'", () => {
    expect(report.issues[0].severity).toBe("blocker");
  });

  it("deflexão reportada está entre 50° e 70° (cerca de 60° com distorção geodésica)", () => {
    expect(report.issues[0].deflectionDeg).toBeGreaterThan(50);
    expect(report.issues[0].deflectionDeg).toBeLessThan(70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T6 — ramal perpendicular à principal → sem issues (tê 90°)
// ─────────────────────────────────────────────────────────────────────────────

describe("T6 — ramal perpendicular à principal → sem issues", () => {
  // Principal: E-O. Ramal: N-S (perpendicular).
  const principal: [number, number][] = [[-0.001, -12.001], [0.001, -12.001]];
  const col = makeCol([0, -12.000], [0, -11.999]);
  const sec = makeSec("sec-0", [0, -12.001], [0, -12.000]);

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false para ramal perpendicular", () => {
    expect(report.hasBlockers).toBe(false);
  });

  it("checkedElements = 2 (ramal→principal + ramal→lateral)", () => {
    expect(report.checkedElements).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T7 — ramal colínear com a lateral → sem issues (luva)
// ─────────────────────────────────────────────────────────────────────────────

describe("T7 — ramal colínear com lateral (deflexão 0°) → sem issues", () => {
  // Ramal e lateral ambos apontam para Norte. Deflexão = 0° → luva ✓.
  // Isto ocorre na rede auto-gerada quando principal ⊥ laterais.
  const principal: [number, number][] = [[-0.001, -12.001], [0.001, -12.001]];
  // Lateral: vertical N-S, início ao sul
  const col = makeCol([0, -12.001], [0, -11.998]);
  // Ramal: de principal (sul) para inlet da lateral (também sul)
  const sec = makeSec("sec-0", [0, -12.001], [0, -12.001]);
  // Ramal de comprimento zero — deve ser ignorado

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false (ramal comprimento zero é ignorado)", () => {
    expect(report.hasBlockers).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8 — ramal em ângulo não-padrão na lateral → blocker
// ─────────────────────────────────────────────────────────────────────────────

describe("T8 — ramal chega à lateral em ângulo 60° → blocker", () => {
  // Lateral N-S. Ramal de SE para NW chega à lateral a 60°.
  // ramalDir ≈ (−sin60°, cos60°) = (−0.866, 0.5) → 60° da norte
  // lateralDir = (0, 1) norte
  // deflexão = angleBetween(ramalDir, lateralDir) ≈ 60°
  const mPerLng = 111320 * Math.cos((-12 * Math.PI) / 180);
  const d = 0.001;
  const inlet: [number, number] = [0, -12.001];
  // ramalFrom: 100 m a SE do inlet
  const ramalFrom: [number, number] = [
    inlet[0] + (0.866 * 100) / mPerLng,
    inlet[1] - (0.5 * 100) / 111320,
  ];
  const principal: [number, number][] = [
    [inlet[0] - d, inlet[1] - d],
    [inlet[0] + d, inlet[1] - d],
  ];
  const col = makeCol(inlet, [0, -12.000]);
  const sec = makeSec("sec-nonstd", ramalFrom, inlet);

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = true", () => {
    expect(report.hasBlockers).toBe(true);
  });

  it("existe issue com elementType = 'lateral'", () => {
    const lateralIssue = report.issues.find((i) => i.elementType === "lateral");
    expect(lateralIssue).toBeDefined();
  });

  it("severity = 'blocker' para junção não-padrão na lateral", () => {
    const lateralIssue = report.issues.find(
      (i): i is NetworkAngleIssue => i.elementType === "lateral",
    );
    expect(lateralIssue?.severity).toBe("blocker");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T9 — rede vazia → relatório limpo
// ─────────────────────────────────────────────────────────────────────────────

describe("T9 — rede vazia → hasBlockers false", () => {
  const report = detectNetworkAngleIssues({
    physicalColumns: [],
    secondaries: [],
    principalCoords: [],
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false", () => {
    expect(report.hasBlockers).toBe(false);
  });

  it("issues = []", () => {
    expect(report.issues).toHaveLength(0);
  });

  it("checkedElements = 0", () => {
    expect(report.checkedElements).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T16 — Falso positivo de 180° na junção ramal → lateral (TASK-016)
//
// Bug: quando sec.toCoord ≈ col.endLngLat, o código antigo usava latVec=start→end,
// ficando antiparalelo ao lastVec → deflexão 180° → falso blocker.
// Fix: latVec = inlet → extremidade oposta (aponta na direção do fluxo real).
// ─────────────────────────────────────────────────────────────────────────────

const M_LNG_T16 = 111320 * Math.cos((-12 * Math.PI) / 180); // ≈ 108 886 m/°
const M_LAT_T16 = 111320;

// T16-A — inlet em startLngLat, ramal colínear → sem blocker (regressão)
describe("T16-A — inlet em startLngLat, ramal colínear → sem blocker (regressão)", () => {
  // Principal ao sul (y = -12.002). Lateral N-S: start = sul (inlet), end = norte.
  // Ramal: de principal(sul) para inlet(startLngLat = sul), direção norte.
  // latVec = start→end = norte. lastVec = norte. angle = 0° ✓.
  const principal: [number, number][] = [[-0.001, -12.002], [0.001, -12.002]];
  const col = makeCol([0, -12.001], [0, -11.999]); // start = south (inlet), end = north
  const sec: SecondaryPipe = {
    id: "sec-t16a",
    physicalColumnId: "col-0",
    fromCoord: [0, -12.002],
    toCoord: [0, -12.001], // inlet = startLngLat
    coords: [[0, -12.002], [0, -12.001]],
    lengthM: 0.001 * M_LAT_T16,
    source: "auto",
  };

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false (regressão: comportamento correto não deve mudar)", () => {
    expect(report.hasBlockers).toBe(false);
  });

  it("sem issue de lateral", () => {
    expect(report.issues.find((i) => i.elementType === "lateral")).toBeUndefined();
  });
});

// T16-B — inlet em endLngLat, ramal colínear → sem blocker (fix do falso positivo)
describe("T16-B — inlet em endLngLat, ramal colínear → sem blocker (fix)", () => {
  // Principal ao sul (y = -12.002). Lateral N-S: start = norte (far), end = sul (inlet).
  // Ramal: de principal(sul) para inlet(endLngLat = sul), direção norte.
  // Bug antigo: latVec = start→end = sul → antiparalelo ao lastVec(norte) → 180° → falso blocker.
  // Fix: latVec = end→start = norte → angle 0° → sem blocker.
  const principal: [number, number][] = [[-0.001, -12.002], [0.001, -12.002]];
  const col = makeCol([0, -11.999], [0, -12.001]); // start = north (far), end = south (inlet)
  const sec: SecondaryPipe = {
    id: "sec-t16b",
    physicalColumnId: "col-0",
    fromCoord: [0, -12.002],
    toCoord: [0, -12.001], // inlet = endLngLat
    coords: [[0, -12.002], [0, -12.001]],
    lengthM: 0.001 * M_LAT_T16,
    source: "auto",
  };

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false — fix: 180° semântico em inlet endLngLat não é violação", () => {
    expect(report.hasBlockers).toBe(false);
  });

  it("sem issue de lateral", () => {
    expect(report.issues.find((i) => i.elementType === "lateral")).toBeUndefined();
  });
});

// T16-C — inlet em endLngLat, ramal perpendicular (90°) → sem blocker
describe("T16-C — inlet em endLngLat, ramal 90° → sem blocker", () => {
  // Lateral N-S: start = norte (far), end = sul (inlet). Ramal E-O vindo do oeste.
  // latVec (fix) = end→start = norte. lastVec = leste. angle(leste, norte) = 90° → tê 90° ✓.
  // Principal N-S ao oeste, para que junção ramal→principal também seja 90°.
  const col = makeCol([0, -11.999], [0, -12.001]); // start = north, end = south (inlet)
  const inlet: [number, number] = [0, -12.001]; // = col.endLngLat
  const fromW: [number, number] = [inlet[0] - 100 / M_LNG_T16, inlet[1]];
  const sec: SecondaryPipe = {
    id: "sec-t16c",
    physicalColumnId: "col-0",
    fromCoord: fromW,
    toCoord: inlet,
    coords: [fromW, inlet],
    lengthM: 100,
    source: "auto",
  };
  // Principal N-S através de fromW → junção ramal(E-O) ⊥ principal(N-S) = 90° ✓
  const principal: [number, number][] = [[fromW[0], -12.003], [fromW[0], -11.997]];

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false para tê 90° com inlet em endLngLat", () => {
    expect(report.hasBlockers).toBe(false);
  });
});

// T16-D — inlet em endLngLat, ramal em 45° → blocker (fix não deve relaxar 45°)
describe("T16-D — inlet em endLngLat, ramal 45° → blocker", () => {
  // Lateral N-S: start = norte, end = sul (inlet). Ramal de sudoeste para nordeste.
  // latVec (fix) = end→start = norte. lastVec ≈ nordeste.
  // angle(NE, N) = 45° → proibido na rede interna → blocker.
  const col = makeCol([0, -11.999], [0, -12.001]); // start = north, end = south (inlet)
  const inlet: [number, number] = [0, -12.001]; // = col.endLngLat
  const fromSW: [number, number] = [
    inlet[0] - (Math.sin(Math.PI / 4) * 100) / M_LNG_T16, // 100 m a SW
    inlet[1] - (Math.cos(Math.PI / 4) * 100) / M_LAT_T16,
  ];
  const sec: SecondaryPipe = {
    id: "sec-t16d",
    physicalColumnId: "col-0",
    fromCoord: fromSW,
    toCoord: inlet,
    coords: [fromSW, inlet],
    lengthM: 100,
    source: "auto",
  };
  const principal: [number, number][] = [
    [fromSW[0] - 0.001, fromSW[1]],
    [fromSW[0] + 0.001, fromSW[1]],
  ];

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = true — 45° real continua bloqueado mesmo com inlet em endLngLat", () => {
    expect(report.hasBlockers).toBe(true);
  });

  it("issue de lateral existe com deflexão ≈ 45°", () => {
    const issue = report.issues.find((i) => i.elementType === "lateral");
    expect(issue).toBeDefined();
    expect(issue!.deflectionDeg).toBeGreaterThan(40);
    expect(issue!.deflectionDeg).toBeLessThan(50);
  });
});

// T16-E — inlet em endLngLat, ramal em 30° → blocker
describe("T16-E — inlet em endLngLat, ramal 30° → blocker", () => {
  // Lateral N-S: start = norte, end = sul (inlet). Ramal de sul-sudoeste para norte-nordeste.
  // latVec (fix) = end→start = norte. angle(ramal, norte) ≈ 30° → proibido → blocker.
  const col = makeCol([0, -11.999], [0, -12.001]); // start = north, end = south (inlet)
  const inlet: [number, number] = [0, -12.001]; // = col.endLngLat
  const fromSSW: [number, number] = [
    inlet[0] - (Math.sin(Math.PI / 6) * 100) / M_LNG_T16, // sin30° = 0.5
    inlet[1] - (Math.cos(Math.PI / 6) * 100) / M_LAT_T16, // cos30° = 0.866
  ];
  const sec: SecondaryPipe = {
    id: "sec-t16e",
    physicalColumnId: "col-0",
    fromCoord: fromSSW,
    toCoord: inlet,
    coords: [fromSSW, inlet],
    lengthM: 100,
    source: "auto",
  };
  const principal: [number, number][] = [
    [fromSSW[0] - 0.001, fromSSW[1]],
    [fromSSW[0] + 0.001, fromSSW[1]],
  ];

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = true — 30° real continua bloqueado com inlet em endLngLat", () => {
    expect(report.hasBlockers).toBe(true);
  });

  it("issue de lateral existe com deflexão ≈ 30°", () => {
    const issue = report.issues.find((i) => i.elementType === "lateral");
    expect(issue).toBeDefined();
    expect(issue!.deflectionDeg).toBeGreaterThan(25);
    expect(issue!.deflectionDeg).toBeLessThan(35);
  });
});

// T16-F — sec.toCoord offset ≤ 1 m de endLngLat → tratado como inlet em endLngLat
describe("T16-F — toCoord offset ≤1 m de endLngLat → snap correto, sem falso blocker", () => {
  // sec.toCoord está 0,5 m ao norte de col.endLngLat — dentro da tolerância INLET_SNAP_TOL_M = 1,0 m.
  // Deve ser reconhecido como inlet em endLngLat → latVec = end→start → sem falso positivo.
  const col = makeCol([0, -11.999], [0, -12.001]); // start = north, end = south (inlet nominal)
  const toCoordOffset: [number, number] = [0, -12.001 + 0.5 / M_LAT_T16]; // 0,5 m ao norte de endLngLat
  const sec: SecondaryPipe = {
    id: "sec-t16f",
    physicalColumnId: "col-0",
    fromCoord: [0, -12.002],
    toCoord: toCoordOffset,
    coords: [[0, -12.002], toCoordOffset],
    lengthM: 0.001 * M_LAT_T16 + 0.5,
    source: "auto",
  };
  const principal: [number, number][] = [[-0.001, -12.002], [0.001, -12.002]];

  const report = detectNetworkAngleIssues({
    physicalColumns: [col],
    secondaries: [sec],
    principalCoords: principal,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = false — offset ≤ 1 m de endLngLat é reconhecido como inlet", () => {
    expect(report.hasBlockers).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T10 — principal com dobra 45° → BLOCKER (rede interna proíbe 45° — TASK-015)
// ─────────────────────────────────────────────────────────────────────────────

describe("T10 — dobra 45° na principal → blocker (nova regra rede interna)", () => {
  const d = 0.001;
  // A → B: eastward; B → C: 45° do vetor A→B (NE diagonal).
  // Deflexão em B = 45° → PROIBIDO na rede interna.
  const principalCoords: [number, number][] = [
    [0, -12.001],
    [d, -12.001],
    [d + d * Math.cos(Math.PI / 4) * (111320 / 111320), -12.001 + d * Math.sin(Math.PI / 4)],
  ];

  const report = detectNetworkAngleIssues({
    physicalColumns: [],
    secondaries: [],
    principalCoords,
    adutoraCoords: [],
    centroid: CENTROID,
  });

  it("hasBlockers = true para dobra 45° na principal (rede interna usa apenas 90°/180°)", () => {
    expect(report.hasBlockers).toBe(true);
  });

  it("issue com elementType = 'principal'", () => {
    expect(report.issues.some((i) => i.elementType === "principal")).toBe(true);
  });
});
