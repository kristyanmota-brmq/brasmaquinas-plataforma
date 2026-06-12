import { describe, it, expect } from "vitest";
import { latLngToUtm, utmToLatLng, utmZone, formatUtm } from "../utm";

// T81 (TASK-081) — Coordenadas UTM SIRGAS 2000 (correção do RT:
// "todas as coordenadas que aparecem para nós devem ser em UTM").

describe("T81 — fuso UTM", () => {
  it("T81-1: fusos do Brasil (Barreiras 23, Carinhanha 23, Salvador 24, Rio Branco 19)", () => {
    expect(utmZone(-45.0)).toBe(23);
    expect(utmZone(-43.77)).toBe(23);
    expect(utmZone(-38.5)).toBe(24);
    expect(utmZone(-67.8)).toBe(19);
  });
});

describe("T81 — invariantes da projeção", () => {
  it("T81-2: ponto sobre o meridiano central → E = 500.000 exato; hemisfério sul → N < 10.000.000", () => {
    // Meridiano central do fuso 23 = −45°
    const u = latLngToUtm(-12.0, -45.0);
    expect(u.zone).toBe(23);
    expect(u.hemisphere).toBe("S");
    expect(Math.abs(u.easting - 500000)).toBeLessThan(0.001);
    expect(u.northing).toBeLessThan(10000000);
    expect(u.northing).toBeGreaterThan(8000000); // lat -12 ≈ N 8.67 mi
  });

  it("T81-3: equador no hemisfério sul → N = 10.000.000 exato", () => {
    const u = latLngToUtm(-1e-9, -45.0);
    expect(Math.abs(u.northing - 10000000)).toBeLessThan(0.01);
  });

  it("T81-4: leste do meridiano central → E > 500.000; oeste → E < 500.000", () => {
    expect(latLngToUtm(-12, -44.5).easting).toBeGreaterThan(500000);
    expect(latLngToUtm(-12, -45.5).easting).toBeLessThan(500000);
  });

  it("T81-5: 1° de latitude ≈ 110,6 km de N no meridiano central (k0 aplicado)", () => {
    const a = latLngToUtm(-12.0, -45.0);
    const b = latLngToUtm(-13.0, -45.0);
    const dN = a.northing - b.northing;
    expect(dN).toBeGreaterThan(110000);
    expect(dN).toBeLessThan(111200);
  });
});

describe("T81 — ida e volta (forward ↔ inverse)", () => {
  it("T81-6: round-trip ≤ 1 mm nos pontos de projeto reais", () => {
    const pontos: [number, number][] = [
      [-12.0003, -45.0038], // Fazenda do Paulo (captação)
      [-14.3, -43.77],      // Carinhanha (Três Ilhas)
      [-13.1, -47.2],       // fixture P
      [-22.9, -43.2],       // Rio (borda de fuso)
      [-3.1, -60.0],        // Manaus
    ];
    for (const [lat, lng] of pontos) {
      const u = latLngToUtm(lat, lng);
      const back = utmToLatLng(u);
      const dLatM = Math.abs(back.lat - lat) * 111320;
      const dLngM = Math.abs(back.lng - lng) * 111320 * Math.cos((lat * Math.PI) / 180);
      expect(dLatM).toBeLessThan(0.001);
      expect(dLngM).toBeLessThan(0.001);
    }
  });
});

describe("T81 — formato de exibição brasileiro", () => {
  it("T81-7: 'E … m · N … m · 23S' com milhar pt-BR e resolução de 1 m", () => {
    const s = formatUtm(-12.0, -45.0);
    expect(s).toMatch(/^E 500\.000 m · N [\d.]+ m · 23S$/);
    expect(s).toContain("23S");
  });
});
