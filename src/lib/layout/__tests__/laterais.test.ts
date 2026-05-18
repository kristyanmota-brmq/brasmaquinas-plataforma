import { describe, it, expect } from "vitest";
import { selectDiameter } from "@/lib/hydraulics/hazenWilliams";
import { TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import { ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";

const catalogoLF = [...TUBOS_PVC_LF];
const pressaoServico = ASPERSOR_PADRAO.pressaoServicoMca; // 30 mca
const limitePerda = pressaoServico * 0.20;                // 6 mca

describe("selectDiameter — seleção de diâmetro de lateral", () => {
  it("lateral com alta vazão: diâmetro mínimo viola ΔP > 20% → seleciona o próximo", () => {
    // Q = 30 m³/h (20 aspersores × 1,5 m³/h), L = 228 m
    // Ø50mm hf ≈ muito alto; deve selecionar Ø75mm ou maior
    const resultado = selectDiameter(30, 228, pressaoServico, catalogoLF);
    expect(resultado.tubo.diametroMm).toBeGreaterThan(50);
    expect(resultado.perdaCargaPercentual).toBeLessThanOrEqual(0.20);
  });

  it("lateral curta com baixa vazão: todos os diâmetros respeitam ΔP → seleciona o menor", () => {
    // Q = 3 m³/h (2 aspersores), L = 12,5 m — claramente dentro do limite para qualquer Ø
    const resultado = selectDiameter(3, 12.5, pressaoServico, catalogoLF);
    expect(resultado.tubo.diametroMm).toBe(50); // menor do catálogo LF
    expect(resultado.perdaCargaM).toBeLessThan(limitePerda);
  });

  it("lateral extrema onde nenhum Ø atende: retorna o maior disponível", () => {
    // Q absurdamente alto para forçar falha em todos os candidatos
    const resultado = selectDiameter(200, 500, pressaoServico, catalogoLF);
    const maiorDiam = Math.max(...catalogoLF.map((t) => t.diametroMm));
    expect(resultado.tubo.diametroMm).toBe(maiorDiam);
  });
});
