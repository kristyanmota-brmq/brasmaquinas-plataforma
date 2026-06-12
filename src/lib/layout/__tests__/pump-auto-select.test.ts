import { describe, it, expect } from "vitest";
import { selectBombaAutomatica } from "../pump-auto-select";
import type { BombaCatalogo } from "@/lib/catalog/aspersores";

const CAT: BombaCatalogo[] = [
  { modelo: "P-100/60", marca: "X", vazaoMaxM3h: 100, hmtMca: 60, fonte: "t" },
  { modelo: "P-67/73", marca: "X", vazaoMaxM3h: 67, hmtMca: 73, fonte: "t" },
  { modelo: "P-200/90", marca: "X", vazaoMaxM3h: 200, hmtMca: 90, fonte: "t" },
];

describe("T77 — selectBombaAutomatica (bomba automática, menor folga)", () => {
  it("T77-1: escolhe a bomba que atende vazão+HMT com MENOR folga (não a maior)", () => {
    // 90 m³/h @ 50 mca: P-100/60 atende justa; P-200/90 atende com folga enorme.
    const b = selectBombaAutomatica(CAT, 90, 50);
    expect(b?.modelo).toBe("P-100/60");
  });

  it("T77-2: descarta bombas que não atendem um dos dois requisitos", () => {
    // 60 m³/h @ 70 mca: P-100/60 falha em HMT (60<70); P-67/73 atende.
    const b = selectBombaAutomatica(CAT, 60, 70);
    expect(b?.modelo).toBe("P-67/73");
  });

  it("T77-3: nenhuma bomba atende → null (decisão volta ao humano; gate preservado)", () => {
    expect(selectBombaAutomatica(CAT, 300, 60)).toBeNull();
    expect(selectBombaAutomatica(CAT, 100, 120)).toBeNull();
  });

  it("T77-4: entradas inválidas ou não-positivas → null (sem auto-seleção espúria)", () => {
    expect(selectBombaAutomatica(CAT, 0, 50)).toBeNull();
    expect(selectBombaAutomatica(CAT, 50, 0)).toBeNull();
    expect(selectBombaAutomatica(CAT, NaN, 50)).toBeNull();
    expect(selectBombaAutomatica([], 50, 50)).toBeNull();
  });
});
