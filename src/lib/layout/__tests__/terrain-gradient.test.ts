import { describe, it, expect } from "vitest";
import {
  fitTerrainGradient,
  ALTIMETRIA_MIN_SLOPE_PCT,
  MIN_TERRAIN_SAMPLES,
  type TerrainSample,
} from "../terrain-gradient";
import { findOptimalGridAngle } from "../sprinkler-grid";

// ─────────────────────────────────────────────────────────────────────────────
// T80 (TASK-080) — Altimetria comanda as laterais (regra canônica apontada
// pelo fundador): laterais EM NÍVEL (ao longo das curvas de nível); a
// planimetria (TASK-079) só comanda em terreno plano.
// ─────────────────────────────────────────────────────────────────────────────

/** Amostras num plano z = sx·x + sy·y (declividades em fração). */
function plane(sx: number, sy: number, noise = 0): TerrainSample[] {
  const pts: TerrainSample[] = [];
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      const x = i * 50 - 100;
      const y = j * 50 - 100;
      const jitter = noise * ((i * 7 + j * 13) % 5 - 2);
      pts.push({ xM: x, yM: y, elevM: 450 + sx * x + sy * y + jitter });
    }
  }
  return pts;
}

const M_LAT = 111320;
const C = { lng: -43.77, lat: -14.3 };
const mLng = M_LAT * Math.cos((C.lat * Math.PI) / 180);
function rectNS(): GeoJSON.Polygon {
  // Campo alto-estreito N-S (o caso do fundador): planimetria pediria 90°.
  const pts: [number, number][] = [
    [-90, -300], [90, -300], [90, 300], [-90, 300],
  ].map(([x, y]) => [C.lng + x / mLng, C.lat + y / M_LAT]);
  return { type: "Polygon", coordinates: [[...pts, pts[0]]] };
}

describe("T80 — fitTerrainGradient (ajuste de plano)", () => {
  it("T80-1: plano com 5% de declividade para LESTE → direção ≈ 0°, slope ≈ 5%", () => {
    const g = fitTerrainGradient(plane(0.05, 0));
    expect(g).not.toBeNull();
    expect(Math.abs(g!.directionDeg - 0)).toBeLessThan(1);
    expect(g!.slopePercent).toBeGreaterThan(4.5);
    expect(g!.slopePercent).toBeLessThan(5.5);
  });

  it("T80-2: plano com 4% para NORDESTE (45°) com ruído → direção ≈ 45°", () => {
    const s = 0.04 / Math.SQRT2;
    const g = fitTerrainGradient(plane(s, s, 0.05));
    expect(g).not.toBeNull();
    expect(Math.abs(g!.directionDeg - 45)).toBeLessThan(3);
  });

  it("T80-3: terreno plano → slope ~0 (abaixo do limiar de comando)", () => {
    const g = fitTerrainGradient(plane(0.001, 0.001, 0.02));
    expect(g).not.toBeNull();
    expect(g!.slopePercent).toBeLessThan(ALTIMETRIA_MIN_SLOPE_PCT);
  });

  it("T80-4: amostras insuficientes ou degeneradas → null", () => {
    expect(fitTerrainGradient(plane(0.05, 0).slice(0, MIN_TERRAIN_SAMPLES - 1))).toBeNull();
    // Colineares (sem extensão 2D)
    const line: TerrainSample[] = Array.from({ length: 10 }, (_, i) => ({
      xM: i * 10, yM: 0, elevM: 450 + i,
    }));
    expect(fitTerrainGradient(line)).toBeNull();
  });
});

describe("T80 — hierarquia altimetria → planimetria → geometria", () => {
  it("T80-5 (regra do fundador): declive 5% para LESTE em campo N-S → laterais EM NÍVEL (θ=0), vencendo a planimetria (que pediria 90°)", () => {
    // Curvas de nível correm N-S → laterais N-S → θ = direção do gradiente = 0.
    const angle = findOptimalGridAngle(rectNS(), 12, {
      terrainGradientDeg: 0,
      terrainSlopePercent: 5,
    });
    expect(angle).toBe(0);
    // Sem altimetria, a planimetria escolhe 90 (colunas curtas) — o conflito é real:
    expect(findOptimalGridAngle(rectNS(), 12)).toBe(90);
  });

  it("T80-6: declive abaixo do limiar (1%) → planimetria mantém o comando (90°)", () => {
    const angle = findOptimalGridAngle(rectNS(), 12, {
      terrainGradientDeg: 0,
      terrainSlopePercent: 1,
    });
    expect(angle).toBe(90);
  });

  it("T80-7: gradiente a 30° → θ = 30 (laterais ao longo da curva de nível a 120°)", () => {
    const angle = findOptimalGridAngle(rectNS(), 12, {
      terrainGradientDeg: 30.4,
      terrainSlopePercent: 3,
    });
    expect(angle).toBe(30);
  });
});
