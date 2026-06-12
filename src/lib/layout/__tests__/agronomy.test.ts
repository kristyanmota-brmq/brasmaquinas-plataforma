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

// ─────────────────────────────────────────────────────────────────────────────
// TASK-060 — Família 5035 SD no catálogo + lâmina como input
// ─────────────────────────────────────────────────────────────────────────────

describe("T60 — catálogo 5035 SD (homologação provisória) × agronomia", () => {
  it("T60-1: getAspersorBySku resolve 5035 e faz fallback para o padrão", async () => {
    const { getAspersorBySku, ASPERSOR_PADRAO, ASPERSOR_5035_SD_50X25 } =
      await import("@/lib/catalog/aspersores");
    expect(getAspersorBySku("101080547")).toBe(ASPERSOR_5035_SD_50X25);
    expect(getAspersorBySku(undefined)).toBe(ASPERSOR_PADRAO);
    expect(getAspersorBySku("sku-inexistente")).toBe(ASPERSOR_PADRAO);
  });

  it("T60-2: 5035 SD 5,0×2,5 @ 18×18 reproduz a intensidade da proposta real (6,51 mm/h)", async () => {
    const { ASPERSOR_5035_SD_50X25 } = await import("@/lib/catalog/aspersores");
    const intensidade = computeApplicationIntensityMmH(
      ASPERSOR_5035_SD_50X25.vazaoM3PorHora,
      ASPERSOR_5035_SD_50X25.espacamentoPadraoM,
      ASPERSOR_5035_SD_50X25.espacamentoPadraoM,
    );
    expect(intensidade).toBeCloseTo(6.512, 2);
  });

  it("T60-3: espaçamento 18 ≤ raio molhado × 2 (sobreposição garantida) nos 3 aspersores novos", async () => {
    const { ASPERSORES, ASPERSOR_PADRAO } = await import("@/lib/catalog/aspersores");
    const novos = ASPERSORES.filter((a) => a !== ASPERSOR_PADRAO);
    expect(novos).toHaveLength(3);
    for (const a of novos) {
      expect(a.espacamentoPadraoM).toBeLessThanOrEqual(a.raioMolhadoM * 2);
      expect(a.custo).toBeGreaterThan(0);
      expect(a.precoVenda).toBeGreaterThan(a.custo);
    }
  });

  it("T60-4: ASPERSOR_PADRAO (5022) byte-idêntico — catálogo read-only preservado", async () => {
    const { ASPERSOR_PADRAO } = await import("@/lib/catalog/aspersores");
    expect(ASPERSOR_PADRAO.sku).toBe("101092");
    expect(ASPERSOR_PADRAO.vazaoM3PorHora).toBe(1.5);
    expect(ASPERSOR_PADRAO.espacamentoPadraoM).toBe(12);
    expect(ASPERSOR_PADRAO.precoVenda).toBe(32.0);
  });
});

describe("T60 — lâmina como input em buildSectorizationForJornada", () => {
  it("T60-5: default preserva comportamento legado (laminaMm = 10, cultura ausente)", async () => {
    const { buildSectorizationForJornada } = await import("@/lib/layout/layout-use-cases");
    const layout = makeLayoutL();
    const { generatePhysicalColumns } = await import("@/lib/layout/laterais");
    const { ASPERSOR_PADRAO, TUBOS_PVC_LF } = await import("@/lib/catalog/aspersores");
    const cols = generatePhysicalColumns(
      layout.sprinklers!.positions, layout.sprinklers!.gridAngleDegrees,
      layout.centroid!, layout.sprinklers!.espacamentoM,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
      TUBOS_PVC_LF,
    );
    const sec = buildSectorizationForJornada(cols, 9, layout.sprinklers!.positions.length, 1.5, 60);
    expect(sec.laminaMm).toBe(10);
    expect(sec.cultura).toBeUndefined();
  });

  it("T60-6: lâmina e cultura informadas fluem para a sectorization e o relatório agronômico", async () => {
    const { buildSectorizationForJornada } = await import("@/lib/layout/layout-use-cases");
    const layout = makeLayoutL();
    const { generatePhysicalColumns } = await import("@/lib/layout/laterais");
    const { ASPERSOR_PADRAO, TUBOS_PVC_LF } = await import("@/lib/catalog/aspersores");
    const cols = generatePhysicalColumns(
      layout.sprinklers!.positions, layout.sprinklers!.gridAngleDegrees,
      layout.centroid!, layout.sprinklers!.espacamentoM,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
      TUBOS_PVC_LF,
    );
    const sec = buildSectorizationForJornada(
      cols, 9, layout.sprinklers!.positions.length, 1.5, 60, 6.5, "pastagem",
    );
    expect(sec.laminaMm).toBe(6.5);
    expect(sec.cultura).toBe("pastagem");

    const result = calculateIrrigationProject({ ...layout, sectorization: sec });
    expect(result.agronomy).not.toBeNull();
    // lâmina 6,5 com 5022@12×12 (10,42 mm/h) → tempo/setor 0,624 h → floor(9/0,624) = 14
    expect(result.agronomy!.tempoPorSetorH).toBeCloseTo(6.5 / 10.4167, 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-061 — Wiring operationalSegments no fluxo de seleção arquitetural
// ─────────────────────────────────────────────────────────────────────────────

describe("T61 — buildSelectedPipelineCoords com operationalSegments (topologia v12)", () => {
  it("T61-1: seleção avalia os 3 candidatos e retorna vencedor com segments fornecidos", async () => {
    const { buildSelectedPipelineCoords } = await import("@/lib/layout/layout-use-cases");
    const layout = makeLayoutL();
    const full = calculateIrrigationProject(layout);
    expect(full.isComplete).toBe(true);
    const result = buildSelectedPipelineCoords(
      layout.waterSource!,
      full.physical!.physicalColumns,
      layout.centroid!,
      layout.sprinklers!.gridAngleDegrees,
      full.distribution!.laterais,
      full.operational!.operationalSegments,
    );
    expect(result.architectureSelection).not.toBeNull();
    expect(result.architectureSelection!.evaluations).toHaveLength(3);
    expect(["A0", "A2", "A3"]).toContain(result.architectureSelection!.winner);
    expect(result.principal.length).toBeGreaterThanOrEqual(2);
  });

  it("T61-2: retrocompat — sem operationalSegments continua funcionando (caminho legado)", async () => {
    const { buildSelectedPipelineCoords } = await import("@/lib/layout/layout-use-cases");
    const layout = makeLayoutL();
    const full = calculateIrrigationProject(layout);
    const result = buildSelectedPipelineCoords(
      layout.waterSource!,
      full.physical!.physicalColumns,
      layout.centroid!,
      layout.sprinklers!.gridAngleDegrees,
      full.distribution!.laterais,
    );
    expect(result.architectureSelection).not.toBeNull();
    expect(result.lengthMeters).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-065 — Catálogo de bombas (ponto nominal) × validatePump
// ─────────────────────────────────────────────────────────────────────────────

describe("T65 — bombas homologadas validam contra o projeto", () => {
  it("T65-1: catálogo são (Q>0, HMT>0, fonte declarada)", async () => {
    const { BOMBAS_HOMOLOGADAS } = await import("@/lib/catalog/aspersores");
    expect(BOMBAS_HOMOLOGADAS.length).toBeGreaterThanOrEqual(2);
    for (const b of BOMBAS_HOMOLOGADAS) {
      expect(b.vazaoMaxM3h).toBeGreaterThan(0);
      expect(b.hmtMca).toBeGreaterThan(0);
      expect(b.fonte.length).toBeGreaterThan(10);
    }
  });

  it("T65-2: IMBIL 65-160 (100 m³/h @ 60 mca) → pumpValidation ok no fixture L", async () => {
    const layout = { ...makeLayoutL(), pump: { hmtMca: 60, vazaoMaxM3h: 100, modelo: "IMBIL INI BLOC 65-160" } };
    const result = calculateIrrigationProject(layout as Parameters<typeof calculateIrrigationProject>[0]);
    expect(result.hydraulics?.pumpValidation.status).toBe("ok");
    expect(result.diagnostics?.warnings.some((w) => w.includes("Bomba não informada"))).toBe(false);
  });

  it("T65-3: bomba subdimensionada → status insuficiente (gate preservado)", async () => {
    const layout = { ...makeLayoutL(), pump: { hmtMca: 10, vazaoMaxM3h: 5 } };
    const result = calculateIrrigationProject(layout as Parameters<typeof calculateIrrigationProject>[0]);
    expect(result.hydraulics?.pumpValidation.status).toMatch(/pump_insufficient/);
  });
});
