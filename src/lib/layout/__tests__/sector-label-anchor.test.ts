import { describe, it, expect } from "vitest";
import { resolveSectorLabelAnchor } from "@/lib/layout/sector-label-anchor";
import type { PhysicalColumn } from "@/lib/layout/laterais";

// Stub mínimo de PhysicalColumn — apenas os campos usados pela função.
function col(
  columnIndex: number,
  sectorsTouched: number[],
  startLngLat: [number, number] = [-46 + columnIndex * 0.001, -12],
): PhysicalColumn {
  return {
    id: `col-${columnIndex}`,
    columnIndex,
    startLngLat,
    endLngLat: [-46, -11.999],
    comprimentoM: 100,
    sprinklerCount: 5,
    vazaoM3h: 1,
    selecao: { tubo: { sku: "T50", diametroMm: 50, diametroInternoMm: 46, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 }, perdaCargaM: 0, velocidadeMs: 0, perdaCargaPercentual: 0 },
    sectorsTouched,
    sprinklerIndices: [],
  };
}

describe("resolveSectorLabelAnchor", () => {
  it("T1: retorna startLngLat quando sectorsTouched[0] === sectorIdx (primary wins)", () => {
    const cols = [col(0, [2], [-46.1, -12.0])];
    expect(resolveSectorLabelAnchor(2, cols)).toEqual([-46.1, -12.0]);
  });

  it("T2: retorna startLngLat via sectorsTouched.includes quando não há primary", () => {
    const cols = [col(0, [1, 0], [-46.2, -12.0])];
    expect(resolveSectorLabelAnchor(0, cols)).toEqual([-46.2, -12.0]);
  });

  it("T3: retorna null quando nenhuma coluna toca o setor", () => {
    const cols = [col(0, [1]), col(1, [2])];
    expect(resolveSectorLabelAnchor(0, cols)).toBeNull();
  });

  it("T4: entre múltiplas candidates primary, seleciona a de menor columnIndex", () => {
    const anchor2 = [-46.2, -12.0] as [number, number];
    const anchor0 = [-46.0, -12.0] as [number, number];
    const cols = [col(2, [0], anchor2), col(0, [0], anchor0)];
    expect(resolveSectorLabelAnchor(0, cols)).toEqual(anchor0);
  });

  it("T5: primary (sectorsTouched[0]) vence secondary mesmo com columnIndex maior", () => {
    // col 0 é secondary (includes), col 5 é primary — primary vence
    const secondaryAnchor = [-46.0, -12.0] as [number, number];
    const primaryAnchor  = [-46.5, -12.0] as [number, number];
    const cols = [col(0, [1, 0], secondaryAnchor), col(5, [0], primaryAnchor)];
    expect(resolveSectorLabelAnchor(0, cols)).toEqual(primaryAnchor);
  });
});
