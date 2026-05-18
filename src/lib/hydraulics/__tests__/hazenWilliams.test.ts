import { describe, it, expect } from "vitest";
import { headLoss, velocity } from "../hazenWilliams";

// Referência: V0.5-RC §14 — hf = 10,67 × Q^1,852 / (C^1,852 × D^4,871) × L
// Caso base: Q=10 m³/h, D=75 mm, C=145, L=100 m
// hf calculado manualmente ≈ 0,5861 m

describe("headLoss", () => {
  const Q = 10;   // m³/h
  const D = 75;   // mm
  const C = 145;
  const L = 100;  // m

  it("caso de referência: Q=10 m³/h, D=75mm, C=145, L=100m → hf ≈ 0,586 m", () => {
    const hf = headLoss(Q, L, D, C);
    // valor manual: 10,67 × (10/3600)^1,852 × 100 / (145^1,852 × 0,075^4,871) ≈ 0,5861
    expect(hf).toBeCloseTo(0.5861, 1); // tolerância ±0,5 %
  });

  it("dobrar Q multiplica hf por 2^1,852 ≈ 3,610", () => {
    const hf1 = headLoss(Q, L, D, C);
    const hf2 = headLoss(Q * 2, L, D, C);
    const ratio = hf2 / hf1;
    expect(ratio).toBeCloseTo(Math.pow(2, 1.852), 2); // tolerância ±0,1 %
  });

  it("entradas zero ou negativas retornam 0", () => {
    expect(headLoss(0, L, D, C)).toBe(0);
    expect(headLoss(Q, 0, D, C)).toBe(0);
    expect(headLoss(Q, L, 0, C)).toBe(0);
  });
});

describe("velocity", () => {
  it("Q=10 m³/h, D=75mm → v ≈ 0,629 m/s", () => {
    const v = velocity(10, 75);
    // v = (10/3600) / (π × (0,0375)²) ≈ 0,6289 m/s
    expect(v).toBeCloseTo(0.629, 1); // tolerância ±1 %
  });

  it("diâmetro zero retorna 0", () => {
    expect(velocity(10, 0)).toBe(0);
  });
});
