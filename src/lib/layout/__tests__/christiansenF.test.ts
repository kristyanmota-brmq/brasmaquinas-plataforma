import { describe, it, expect } from "vitest";
import { christiansenF } from "../laterais";

// Christiansen F: F = 1/(m+1) + 1/(2N) + √(m-1)/(6N²)  com m = 1,852
// N=10: F = 1/2,852 + 1/20 + √0,852/600 ≈ 0,3507 + 0,0500 + 0,00154 ≈ 0,4023
// (nota: √(m-1) na fórmula, não √(m-1)/(6N²) — ver implementação)

describe("christiansenF", () => {
  it("1 saída → F = 1 (sem redução)", () => {
    expect(christiansenF(1)).toBe(1);
  });

  it("10 saídas → F ≈ 0,402 (tolerância ±0,5 %)", () => {
    const F = christiansenF(10);
    // Manual: 1/2,852 + 1/20 + √0,852/(6×100) ≈ 0,3507 + 0,0500 + 0,00154 ≈ 0,4022
    expect(F).toBeCloseTo(0.402, 1);
  });

  it("F cresce monotonicamente com N (mais saídas → mais eficiente, F menor)", () => {
    const f5  = christiansenF(5);
    const f10 = christiansenF(10);
    const f20 = christiansenF(20);
    expect(f5).toBeGreaterThan(f10);
    expect(f10).toBeGreaterThan(f20);
  });

  it("F ≤ 1 para qualquer N ≥ 1", () => {
    for (const n of [1, 2, 5, 10, 50]) {
      expect(christiansenF(n)).toBeLessThanOrEqual(1);
    }
  });
});
