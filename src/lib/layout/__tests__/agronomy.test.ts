/**
 * TASK-059 — Motor agronômico mínimo (diagnóstico-only).
 *
 * T59-1 valida o módulo contra os NÚMEROS REAIS de uma proposta Brasmáquinas
 * (12,7 ha capim, NAAN 5035 2.110 L/h, 18×18, lâmina 10 mm/dia, 13 h
 * disponíveis, 8 setores) — ver docs/relatorios/2026-06-11-analise-propostas-reais.md.
 */

import { describe, it, expect } from "vitest";
import {
  computeApplicationIntensityMmH,
  computeSectorTimeH,
  deriveRecommendedSectorCount,
  computeAgronomyReport,
} from "@/lib/layout/agronomy";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import { makeLayoutL } from "./fixtures";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

describe("T59 — helpers puros", () => {
  it("T59-2: intensidade do 5022-SD em 12×12 = 10,42 mm/h", () => {
    expect(computeApplicationIntensityMmH(1.5, 12, 12)).toBeCloseTo(10.4167, 3);
  });

  it("T59-5a: guards — vazão/espacamento/lâmina inválidos → 0", () => {
    expect(computeApplicationIntensityMmH(0, 12, 12)).toBe(0);
    expect(computeApplicationIntensityMmH(1.5, 0, 12)).toBe(0);
    expect(computeSectorTimeH(0, 10)).toBe(0);
    expect(computeSectorTimeH(10, 0)).toBe(0);
    expect(deriveRecommendedSectorCount(0, 1)).toBe(0);
    expect(deriveRecommendedSectorCount(13, 0)).toBe(0);
  });
});

describe("T59-1 — validação contra proposta real (capim 12,7 ha, NAAN 5035, 18×18)", () => {
  const report = computeAgronomyReport({
    vazaoEmissorM3h: 2.11,
    espacamentoLinhasM: 18,
    espacamentoEmissoresM: 18,
    laminaMmDia: 10,
    tempoDisponivelH: 13,
    setoresCountAtual: 8,
  });

  it("intensidade = 6,51 mm/h (proposta real: 6,512)", () => {
    expect(report.intensidadeAplicacaoMmH).toBeCloseTo(6.512, 2);
  });

  it("tempo por setor = 1,54 h (proposta real: 1,5355)", () => {
    expect(report.tempoPorSetorH).toBeCloseTo(1.5355, 2);
  });

  it("setores recomendados = 8 (proposta real: 8)", () => {
    expect(report.setoresRecomendados).toBe(8);
  });

  it("tempo total = 12,28 h ≤ 13 h (proposta real: 12,284)", () => {
    expect(report.tempoTotalAtualH).toBeCloseTo(12.284, 2);
    expect(report.jornadaInsuficienteParaLamina).toBe(false);
  });

  it("setorização real coincide com a derivada → sem warning de divergência", () => {
    expect(report.divergeDaSetorizacaoAtual).toBe(false);
    expect(report.warnings.some((w) => w.includes("diverge") || w.includes("Setorização agronômica"))).toBe(false);
    // warning de lâmina default sempre presente
    expect(report.warnings.some((w) => w.includes("premissa default"))).toBe(true);
  });
});

describe("T59-3 — divergência e jornada insuficiente", () => {
  it("setorização = jornada (14) com arranjo 18×18 → diverge e não repõe lâmina", () => {
    const report = computeAgronomyReport({
      vazaoEmissorM3h: 2.11,
      espacamentoLinhasM: 18,
      espacamentoEmissoresM: 18,
      laminaMmDia: 10,
      tempoDisponivelH: 14,
      setoresCountAtual: 14,
    });
    expect(report.setoresRecomendados).toBe(9); // floor(14 / 1,5355)
    expect(report.divergeDaSetorizacaoAtual).toBe(true);
    expect(report.jornadaInsuficienteParaLamina).toBe(true); // 14×1,5355 = 21,5 h > 14 h
    expect(report.warnings.some((w) => w.includes("Setorização agronômica"))).toBe(true);
    expect(report.warnings.some((w) => w.includes("Jornada insuficiente"))).toBe(true);
  });

  it("T59-5b: entradas inválidas → report neutro (sem divergência falsa)", () => {
    const report = computeAgronomyReport({
      vazaoEmissorM3h: 0,
      espacamentoLinhasM: 12,
      espacamentoEmissoresM: 12,
      laminaMmDia: 10,
      tempoDisponivelH: 14,
      setoresCountAtual: 14,
    });
    expect(report.intensidadeAplicacaoMmH).toBe(0);
    expect(report.setoresRecomendados).toBe(0);
    expect(report.divergeDaSetorizacaoAtual).toBe(false);
    expect(report.jornadaInsuficienteParaLamina).toBe(false);
  });
});

describe("T59-4 — integração com calculateIrrigationProject", () => {
  it("layout completo (fixture L) → result.agronomy presente e consistente", () => {
    const result = calculateIrrigationProject(makeLayoutL());
    expect(result.agronomy).not.toBeNull();
    expect(result.agronomy!.intensidadeAplicacaoMmH).toBeGreaterThan(0);
    expect(result.agronomy!.warnings.length).toBeGreaterThan(0);
  });

  it("warnings agronômicos propagados para diagnostics.warnings", () => {
    const result = calculateIrrigationProject(makeLayoutL());
    expect(result.diagnostics).not.toBeNull();
    expect(
      result.diagnostics!.warnings.some((w) => w.includes("premissa default")),
    ).toBe(true);
  });

  it("layout sem sectorization → agronomy null (sem crash)", () => {
    const layout = { ...makeLayoutL(), sectorization: undefined } as unknown as ProjectLayout;
    const result = calculateIrrigationProject(layout);
    expect(result.agronomy).toBeNull();
  });
});
