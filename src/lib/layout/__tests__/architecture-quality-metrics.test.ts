/**
 * TASK-056 — Testes dos helpers puros de métricas operacionais (P1–P4).
 *
 * Cenários sintéticos com `centroid = (0,0)` e `gridAngleDegrees = 0` para que
 * `frame local = frame geográfico` e a matemática seja direta.
 */

import { describe, it, expect } from "vitest";
import {
  computePrincipalSplitsColumnsRatio,
  computeSubCollectorDisconnectM,
  computeRouteBreaksCount,
  computeValveDispersionM,
} from "../architecture-quality-metrics";
import type { PhysicalColumn } from "../laterais";
import type { SecondaryPipe } from "../hydraulic-connectivity";
import type { SelecaoTubo } from "../../hydraulics/hazenWilliams";

const M_PER_DEG = 111320;
const CENTROID = { lng: 0, lat: 0 };

const DUMMY_SELECAO: SelecaoTubo = {
  tubo: { sku: "TEST", diametroMm: 50, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  perdaCargaM: 1,
  velocidadeMs: 1,
  perdaCargaPercentual: 0.033,
};

function mkColumn(id: string, xM: number, yMinM: number, yMaxM: number): PhysicalColumn {
  const start: [number, number] = [xM / M_PER_DEG, yMinM / M_PER_DEG];
  const end: [number, number] = [xM / M_PER_DEG, yMaxM / M_PER_DEG];
  return {
    id,
    columnIndex: parseInt(id.replace(/\D/g, ""), 10) || 0,
    startLngLat: start,
    endLngLat: end,
    comprimentoM: yMaxM - yMinM,
    sprinklerCount: 2,
    vazaoM3h: 3,
    selecao: DUMMY_SELECAO,
    sectorsTouched: [0],
    sprinklerIndices: [],
    routeCoords: [start, end],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

function principalAtYm(yMeters: number, xRangeM: [number, number]): [number, number][] {
  return [
    [xRangeM[0] / M_PER_DEG, yMeters / M_PER_DEG],
    [xRangeM[1] / M_PER_DEG, yMeters / M_PER_DEG],
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// T56-2 — computePrincipalSplitsColumnsRatio
// ─────────────────────────────────────────────────────────────────────────────

describe("TASK-056 — computePrincipalSplitsColumnsRatio (P1)", () => {
  it("T56-2a — principal na borda inferior (yMin) NÃO corta nenhuma coluna", () => {
    const cols = [
      mkColumn("c0", 0, 0, 60),
      mkColumn("c1", 12, 0, 60),
      mkColumn("c2", 24, 0, 60),
    ];
    const principal = principalAtYm(0, [0, 24]);
    const ratio = computePrincipalSplitsColumnsRatio(principal, cols, CENTROID, 0);
    expect(ratio).toBe(0);
  });

  it("T56-2b — principal na borda superior (yMax) NÃO corta nenhuma coluna", () => {
    const cols = [
      mkColumn("c0", 0, 0, 60),
      mkColumn("c1", 12, 0, 60),
      mkColumn("c2", 24, 0, 60),
    ];
    const principal = principalAtYm(60, [0, 24]);
    const ratio = computePrincipalSplitsColumnsRatio(principal, cols, CENTROID, 0);
    expect(ratio).toBe(0);
  });

  it("T56-2c — principal no meio (yMid) corta TODAS as colunas (ratio = 1.0)", () => {
    const cols = [
      mkColumn("c0", 0, 0, 60),
      mkColumn("c1", 12, 0, 60),
      mkColumn("c2", 24, 0, 60),
    ];
    const principal = principalAtYm(30, [0, 24]);
    const ratio = computePrincipalSplitsColumnsRatio(principal, cols, CENTROID, 0);
    expect(ratio).toBe(1);
  });

  it("T56-2d — geometria mista: principal em Y=20 corta apenas colunas com yMin < 20 < yMax", () => {
    const cols = [
      mkColumn("c0", 0, 0, 60),    // 0 < 20 < 60 → cortada
      mkColumn("c1", 12, 0, 60),   // 0 < 20 < 60 → cortada
      mkColumn("c2", 24, 30, 60),  // 20 < 30 → NÃO cortada
      mkColumn("c3", 36, 30, 60),  // 20 < 30 → NÃO cortada
    ];
    const principal = principalAtYm(20, [0, 36]);
    const ratio = computePrincipalSplitsColumnsRatio(principal, cols, CENTROID, 0);
    expect(ratio).toBe(0.5);
  });

  it("T56-2e — sem colunas → retorna 0 (sem divisão por zero)", () => {
    const principal = principalAtYm(0, [0, 10]);
    const ratio = computePrincipalSplitsColumnsRatio(principal, [], CENTROID, 0);
    expect(ratio).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T56-3 — computeSubCollectorDisconnectM
// ─────────────────────────────────────────────────────────────────────────────

describe("TASK-056 — computeSubCollectorDisconnectM (P2)", () => {
  function mkSpineEntry(id: string, lengthM: number): SecondaryPipe {
    return {
      id,
      sectorId: 0,
      physicalColumnId: "",
      physicalColumnIds: [],
      kind: "spine_entry",
      coords: [[0, 0], [0, 0]],
      lengthM,
      fromCoord: [0, 0],
      toCoord: [0, 0],
      source: "auto",
    };
  }

  function mkSpine(id: string, lengthM: number): SecondaryPipe {
    return {
      id,
      sectorId: 0,
      physicalColumnId: "",
      physicalColumnIds: [],
      kind: "spine",
      coords: [[0, 0], [0, 0]],
      lengthM,
      fromCoord: [0, 0],
      toCoord: [0, 0],
      source: "auto",
    };
  }

  it("T56-3a — soma comprimentos de spine_entries", () => {
    const secs: SecondaryPipe[] = [
      mkSpineEntry("se-1", 5),
      mkSpineEntry("se-2", 8),
      mkSpine("sp-1", 100), // NÃO entra (kind = spine)
    ];
    expect(computeSubCollectorDisconnectM(secs)).toBe(13);
  });

  it("T56-3b — sem spine_entry retorna 0 (legacy ou só ribs)", () => {
    const legacy: SecondaryPipe = {
      id: "leg-1",
      sectorId: 0,
      physicalColumnId: "c0",
      physicalColumnIds: ["c0"],
      coords: [[0, 0], [0, 0]],
      lengthM: 10,
      fromCoord: [0, 0],
      toCoord: [0, 0],
      source: "auto",
    };
    expect(computeSubCollectorDisconnectM([legacy])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T56-4 — computeRouteBreaksCount
// ─────────────────────────────────────────────────────────────────────────────

describe("TASK-056 — computeRouteBreaksCount (P3)", () => {
  it("T56-4a — principal reta + adutora reta = 0 quebras", () => {
    const principal: [number, number][] = [[0, 0], [1, 0]];
    const adutora: [number, number][] = [[-0.5, 0], [0, 0]];
    expect(computeRouteBreaksCount(principal, adutora, [])).toBe(0);
  });

  it("T56-4b — principal com 4 vértices = 2 cotovelos internos", () => {
    const principal: [number, number][] = [[0, 0], [1, 0], [1, 1], [2, 1]];
    const adutora: [number, number][] = [[-0.5, 0], [0, 0]];
    expect(computeRouteBreaksCount(principal, adutora, [])).toBe(2);
  });

  it("T56-4c — soma cotovelos de principal + adutora + spine/spine_entry; ribs excluídas", () => {
    const principal: [number, number][] = [[0, 0], [1, 0], [1, 1]];        // 1 cotovelo
    const adutora: [number, number][] = [[-0.5, 0], [-0.3, 0], [0, 0]];    // 1 cotovelo
    const spine: SecondaryPipe = {
      id: "sp",
      sectorId: 0,
      physicalColumnId: "",
      physicalColumnIds: [],
      kind: "spine",
      coords: [[0, 0], [0.5, 0], [1, 0]],  // 1 cotovelo interno
      lengthM: 10,
      fromCoord: [0, 0],
      toCoord: [1, 0],
      source: "auto",
    };
    const rib: SecondaryPipe = {
      id: "rb",
      sectorId: 0,
      physicalColumnId: "c0",
      physicalColumnIds: ["c0"],
      kind: "rib",
      coords: [[0, 0], [0.3, 0], [0.6, 0]],  // 1 cotovelo — NÃO conta (rib)
      lengthM: 5,
      fromCoord: [0, 0],
      toCoord: [0.6, 0],
      source: "auto",
    };
    expect(computeRouteBreaksCount(principal, adutora, [spine, rib])).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T56-5 — computeValveDispersionM (peso 0 no score, mas helper testado)
// ─────────────────────────────────────────────────────────────────────────────

describe("TASK-056 — computeValveDispersionM (P4)", () => {
  it("T56-5a — sem section_valves retorna 0", () => {
    expect(computeValveDispersionM([], [], CENTROID)).toBe(0);
  });

  it("T56-5b — sem spine_entries retorna 0", () => {
    const valves = [{ type: "section_valve" as const, coordinate: [0, 0] as [number, number] }];
    expect(computeValveDispersionM(valves, [], CENTROID)).toBe(0);
  });

  it("T56-5c — distância calculada via extremos de spine_entry", () => {
    // section_valve em (0, 0); spine_entry de (10m east, 0) até (10m east, 5m north)
    const valves = [
      { type: "section_valve" as const, coordinate: [0, 0] as [number, number] },
    ];
    const tenMeters = 10 / M_PER_DEG;
    const fiveMeters = 5 / M_PER_DEG;
    const spineEntry: SecondaryPipe = {
      id: "se",
      sectorId: 0,
      physicalColumnId: "",
      physicalColumnIds: [],
      kind: "spine_entry",
      coords: [[tenMeters, 0], [tenMeters, fiveMeters]],
      lengthM: 5,
      fromCoord: [tenMeters, 0],
      toCoord: [tenMeters, fiveMeters],
      source: "auto",
    };
    // Distância mínima é até (10m, 0) = 10m
    const result = computeValveDispersionM(valves, [spineEntry], CENTROID);
    expect(result).toBeGreaterThan(9.5);
    expect(result).toBeLessThan(10.5);
  });
});
