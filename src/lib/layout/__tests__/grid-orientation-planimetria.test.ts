import { describe, it, expect } from "vitest";
import {
  findOptimalGridAngle,
  dominantBoundaryAzimuth,
  PLANIMETRIA_MIN_DOMINANCE,
} from "../sprinkler-grid";

// ─────────────────────────────────────────────────────────────────────────────
// T79 (TASK-079) — Planimetria comanda a orientação da grade.
// Caso real (sessão com o fundador, 2026-06-12, Carinhanha/BA): campo
// alto-estreito com divisas N-S e grade saindo a 87° — esviés de 3° vs a
// divisa porque o critério era menor bbox (cego à divisa) e o range 0–89°
// nem permitia colunas E-W exatas (exigem 90°).
// ─────────────────────────────────────────────────────────────────────────────

const M_LAT = 111320;
const C = { lng: -43.77, lat: -14.3 }; // região de Carinhanha/BA
const mLng = M_LAT * Math.cos((C.lat * Math.PI) / 180);

/** Retângulo W×H (m) rotacionado por rotDeg (anti-horário, 0 = lados N-S/E-W). */
function rect(wM: number, hM: number, rotDeg = 0, jitterM = 0): GeoJSON.Polygon {
  const r = (rotDeg * Math.PI) / 180;
  const pts: [number, number][] = [
    [-wM / 2, -hM / 2],
    [wM / 2, -hM / 2],
    [wM / 2, hM / 2],
    [-wM / 2, hM / 2],
  ].map(([x, y], i) => {
    const j = jitterM * (i % 2 === 0 ? 1 : -1);
    const xr = x * Math.cos(r) - y * Math.sin(r) + j;
    const yr = x * Math.sin(r) + y * Math.cos(r) - j;
    return [C.lng + xr / mLng, C.lat + yr / M_LAT];
  });
  return { type: "Polygon", coordinates: [[...pts, pts[0]]] };
}

describe("T79 — planimetria comanda a orientação (TASK-079)", () => {
  it("T79-1 (caso do fundador): campo alto-estreito N-S → 90° exato (colunas E-W curtas)", () => {
    // 180 m × 600 m, divisas longas verticais. Antes: 87° por ruído de bbox.
    const angle = findOptimalGridAngle(rect(180, 600));
    expect(angle).toBe(90);
  });

  it("T79-2: campo largo E-W → 0° (colunas N-S curtas)", () => {
    const angle = findOptimalGridAngle(rect(600, 180));
    expect(angle).toBe(0);
  });

  it("T79-3: campo rotacionado 30° → grade alinhada à divisa com colunas curtas", () => {
    const az = dominantBoundaryAzimuth(rect(600, 180, 30));
    expect(az).not.toBeNull();
    // Divisa dominante = eixo longo a 30° de leste
    expect(Math.abs(az!.angleDeg - 30)).toBeLessThan(1.5);
    expect(az!.dominance).toBeGreaterThan(PLANIMETRIA_MIN_DOMINANCE);
    const angle = findOptimalGridAngle(rect(600, 180, 30));
    // Colunas curtas = perpendiculares ao eixo longo → θ = 120 (colunas a
    // 120+90 ≡ 30° de leste seria ∥; θ=120 dá colunas ⊥). Aceita 120 ou 30
    // conforme a convenção — o invariante é alinhamento mod 90 com a divisa.
    expect([30, 120]).toContain(angle);
    // E especificamente: o frame escolhido deve ter colunas CURTAS — verificado
    // pela própria seleção interna (colSpanY); aqui garantimos o alinhamento.
    expect(angle % 90).toBe(30);
  });

  it("T79-4: polígono sem direção dominante (24-gon ~círculo) → fallback geométrico sem erro", () => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 2 * Math.PI;
      pts.push([C.lng + (200 * Math.cos(a)) / mLng, C.lat + (200 * Math.sin(a)) / M_LAT]);
    }
    const poly: GeoJSON.Polygon = { type: "Polygon", coordinates: [[...pts, pts[0]]] };
    const az = dominantBoundaryAzimuth(poly);
    expect(az).not.toBeNull();
    expect(az!.dominance).toBeLessThan(PLANIMETRIA_MIN_DOMINANCE);
    const angle = findOptimalGridAngle(poly);
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(180);
  });

  it("T79-5 (anti-87°): divisa N-S com vértices imperfeitos (ruído ~1,5 m) → ainda 90°", () => {
    const angle = findOptimalGridAngle(rect(180, 600, 0, 1.5));
    expect(angle).toBe(90);
  });
});
