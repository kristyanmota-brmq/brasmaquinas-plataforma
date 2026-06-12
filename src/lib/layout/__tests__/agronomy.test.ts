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

  it("T60-3: espaçamento ≤ raio molhado × 2 (sobreposição garantida) nos aspersores não-padrão", async () => {
    const { ASPERSORES, ASPERSOR_PADRAO } = await import("@/lib/catalog/aspersores");
    // TASK-082: + entrada preservada 5022 4.0x1.8; TASK-084: 5035 3,5×2,5 REMOVIDO (RT)
    const novos = ASPERSORES.filter((a) => a !== ASPERSOR_PADRAO);
    expect(novos).toHaveLength(3);
    for (const a of novos) {
      expect(a.espacamentoPadraoM).toBeLessThanOrEqual(a.raioMolhadoM * 2);
      expect(a.custo).toBeGreaterThan(0);
      expect(a.precoVenda).toBeGreaterThan(a.custo);
    }
  });

  it("T60-4 (atualizado TASK-082): padrão = 5022 3.0x1.8 do RT; entrada 4.0x1.8 preservada byte-idêntica", async () => {
    const { ASPERSOR_PADRAO, ASPERSOR_5022_SD_40X18 } = await import("@/lib/catalog/aspersores");
    // Especificação OFICIAL ditada pelo RT em sessão (2026-06-12):
    // 5022 12×12, bocal 3,0×1,8 mm, 760 L/h, pressão nominal 25 mca.
    expect(ASPERSOR_PADRAO.sku).toBe("101092-3018");
    expect(ASPERSOR_PADRAO.bocal).toBe("3.0 x 1.8 mm");
    expect(ASPERSOR_PADRAO.vazaoM3PorHora).toBe(0.76);
    expect(ASPERSOR_PADRAO.pressaoServicoMca).toBe(25);
    expect(ASPERSOR_PADRAO.espacamentoPadraoM).toBe(12);
    // Catálogo read-only: a entrada antiga segue intacta (projetos salvos resolvem por SKU).
    expect(ASPERSOR_5022_SD_40X18.sku).toBe("101092");
    expect(ASPERSOR_5022_SD_40X18.vazaoM3PorHora).toBe(1.5);
    expect(ASPERSOR_5022_SD_40X18.pressaoServicoMca).toBe(30);
    expect(ASPERSOR_5022_SD_40X18.precoVenda).toBe(32.0);
  });
});

describe("T60 — lâmina como input em buildSectorizationForJornada", () => {
  it("T60-5: default oficial do RT (laminaMm = 8, cultura ausente)", async () => {
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
    expect(sec.laminaMm).toBe(8);
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
    // lâmina 6,5 com 5022 3.0x1.8 @12×12 (5,278 mm/h) → tempo/setor 1,232 h → floor(9/0,624) = 14
    expect(result.agronomy!.tempoPorSetorH).toBeCloseTo(6.5 / 5.2778, 3);
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

// ─────────────────────────────────────────────────────────────────────────────
// TASK-066 — Custos de aquisição no catálogo (margem habilitada)
// ─────────────────────────────────────────────────────────────────────────────

describe("T66 — catálogo sem custo zero nas famílias core", () => {
  it("T66-1: tubos, conexões e kit têm custo > 0 e custo < precoVenda", async () => {
    const cat = await import("@/lib/catalog/aspersores");
    const familias = [
      ...cat.TUBOS_PVC, ...cat.TUBOS_PVC_LF, ...cat.TUBOS_PVC_RIGIDO,
      ...cat.CURVAS_90, ...cat.CURVAS_90_RIGIDAS, ...cat.TES,
      ...cat.TES_DERIVACAO_LATERAL, ...cat.ASPERSORES, ...cat.REGISTROS_SECAO_MANUAL,
    ];
    expect(familias.length).toBeGreaterThan(30);
    for (const item of familias) {
      expect(item.custo, `custo zero em ${item.sku}`).toBeGreaterThan(0);
      expect(item.custo, `custo ≥ venda em ${item.sku}`).toBeLessThan(item.precoVenda);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-067/069 — Setorização agronômica derivada, validada contra caso histórico
// ─────────────────────────────────────────────────────────────────────────────

describe("T67 — buildSectorizationAgronomica (validação histórica 12,7 ha)", () => {
  it("T67-1: 5035@18×18, lâmina 10, jornada 14 h → 9 setores derivados (caso real: 8 em 13 h, mesma equação)", async () => {
    const { buildSectorizationAgronomica } = await import("@/lib/layout/layout-use-cases");
    const { generatePhysicalColumns } = await import("@/lib/layout/laterais");
    const { ASPERSOR_5035_SD_50X25, TUBOS_PVC_LF } = await import("@/lib/catalog/aspersores");
    const layout = makeLayoutL();
    const cols = generatePhysicalColumns(
      layout.sprinklers!.positions, 0, layout.centroid!, 18,
      { vazao: ASPERSOR_5035_SD_50X25.vazaoM3PorHora, pressaoServico: 30 },
      TUBOS_PVC_LF,
    );
    const sec = buildSectorizationAgronomica(
      cols, 14, layout.sprinklers!.positions.length,
      ASPERSOR_5035_SD_50X25.vazaoM3PorHora, 18, 10, "capim",
    );
    expect(sec.setoresCount).toBe(9); // floor(14 / 1,5355)
    expect(sec.setoresMode).toBe("agronomico");
    expect(sec.tempoPorSetorMinutos).toBe(92); // 1,533 h
  });

  it("T67-2: legado intocado — buildSectorizationForJornada mantém setores = jornada e marca o modo", async () => {
    const { buildSectorizationForJornada } = await import("@/lib/layout/layout-use-cases");
    const { generatePhysicalColumns } = await import("@/lib/layout/laterais");
    const { ASPERSOR_PADRAO, TUBOS_PVC_LF } = await import("@/lib/catalog/aspersores");
    const layout = makeLayoutL();
    const cols = generatePhysicalColumns(
      layout.sprinklers!.positions, 0, layout.centroid!, 12,
      { vazao: 1.5, pressaoServico: 30 }, TUBOS_PVC_LF,
    );
    const sec = buildSectorizationForJornada(cols, 9, layout.sprinklers!.positions.length, 1.5, 60);
    expect(sec.setoresCount).toBe(9);
    expect(sec.setoresMode).toBe("jornada");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-070/073 — PN60 no catálogo + margem bruta na BOM
// ─────────────────────────────────────────────────────────────────────────────

describe("T70/T73 — PN60 e margem", () => {
  it("T70-1: PN60 DN100/150 existem com custo real e são preferidos quando pressão ≤ 60", async () => {
    const { TUBOS_PVC_RIGIDO } = await import("@/lib/catalog/aspersores");
    const { selectSecondaryPipe } = await import("@/lib/layout/secondary-sizing");
    const pn60 = TUBOS_PVC_RIGIDO.filter((t) => t.pressaoMca === 60);
    expect(pn60.map((t) => t.diametroMm).sort()).toEqual([100, 150]);
    for (const t of pn60) expect(t.custo).toBeGreaterThan(0);
    // vazão que exige DN100: com requisito 50 mca → PN60 escolhido; com 70 mca → PN80
    const sel60 = selectSecondaryPipe({ flowM3h: 60, lengthM: 50, candidatePipes: TUBOS_PVC_RIGIDO, maxVelocityMs: 3.0, pressureClassRequirement: 50 });
    const sel80 = selectSecondaryPipe({ flowM3h: 60, lengthM: 50, candidatePipes: TUBOS_PVC_RIGIDO, maxVelocityMs: 3.0, pressureClassRequirement: 70 });
    expect(sel60.selectedTube.pressaoMca).toBe(60);
    expect(sel80.selectedTube.pressaoMca).toBeGreaterThanOrEqual(70);
    // Nota T70: os preços PN80 atuais são placeholders ABAIXO da lista real
    // (DEFOFO PN80 real: 209,35/323,57) — a vantagem econômica do PN60 se
    // materializa quando a conferência TASK-066 atualizar os rígidos.
  });

  it("T73-1: BOM expõe custo total e margem bruta coerentes", async () => {
    const result = calculateIrrigationProject(makeLayoutL());
    const meta = result.bom!.meta;
    expect(meta.custoTotalAquisicaoR$).toBeGreaterThan(0);
    expect(meta.margemBrutaR$).toBeCloseTo(result.bom!.totalGeral - meta.custoTotalAquisicaoR$, 2);
    expect(meta.margemBrutaR$).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-074 — Telescopia de lateral 75→50 (decisão RT: nunca abaixo de DN50)
// ─────────────────────────────────────────────────────────────────────────────

describe("T74 (REVOGADA pela TASK-083) — lateral única DN50 PN40, sem telescopia", () => {
  // Ordem do RT (2026-06-12): "não teremos mais telescopia nas linhas
  // laterais. Será somente tubo de 50mm PN40." Estes testes protegem a regra
  // NOVA: nenhuma lateral sobe de diâmetro, nenhuma telescopia, nenhum tê de
  // redução 75×50 na BOM. Colunas que não cabem em DN50 são DIVIDIDAS.
  it("T74-1 (nova regra): coluna longa divide; TODAS as laterais saem DN50 sem telescopia", async () => {
    const { generatePhysicalColumns } = await import("@/lib/layout/laterais");
    const { ASPERSOR_PADRAO, TUBOS_PVC_LF } = await import("@/lib/catalog/aspersores");
    const M = 111320, C = { lng: -45.0, lat: -12.0 };
    const positions: [number, number][] = Array.from({ length: 20 }, (_, i) =>
      [C.lng, C.lat + (i * 12) / M] as [number, number]);
    const cols = generatePhysicalColumns(positions, 0, C, 12,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca }, TUBOS_PVC_LF);
    expect(cols.length).toBeGreaterThanOrEqual(1);
    let totalAsp = 0;
    for (const c of cols) {
      totalAsp += c.sprinklerCount;
      expect(c.selecao.tubo.diametroMm).toBe(50);
      expect(c.selecao.tubo.pressaoMca).toBe(40); // PN40
      expect(c.selecao.telescopia).toBeUndefined();
      expect(c.lateralCapacity.ok).toBe(true);
    }
    expect(totalAsp).toBe(20);
  });

  it("T74-2 (nova regra): BOM de laterais é 100% DN50 — sem DN75, sem tê de redução 75×50", async () => {
    const { generatePhysicalColumns } = await import("@/lib/layout/laterais");
    const { ASPERSOR_PADRAO, TUBOS_PVC_LF } = await import("@/lib/catalog/aspersores");
    const { buildBOM } = await import("@/lib/bom");
    const M = 111320, C = { lng: -45.0, lat: -12.0 };
    const longPos: [number, number][] = Array.from({ length: 20 }, (_, i) =>
      [C.lng, C.lat + (i * 12) / M] as [number, number]);
    const colsLong = generatePhysicalColumns(longPos, 0, C, 12,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca }, TUBOS_PVC_LF);
    const nAsp = colsLong.reduce((t, c) => t + c.sprinklerCount, 0);
    const bom = buildBOM({
      sprinklers: { count: nAsp, vazaoProjetoM3PorHora: nAsp * ASPERSOR_PADRAO.vazaoM3PorHora, espacamentoM: 12 },
      sectorization: { setoresCount: 1, sectorIndices: new Array(nAsp).fill(0), vazaoPorSetorM3PorHora: nAsp * ASPERSOR_PADRAO.vazaoM3PorHora },
      mainPipeline: { lengthMeters: 12, segments: 1 },
      physicalColumns: colsLong,
      laterais: [],
      secondaries: [],
      constructability: { controlPoints: [], columnDiagnostics: [], controlPointsCount: 0, pendingControlPointsCount: 0, independentFeedRequiredCount: 0, constructabilityStatus: "ok" },
    } as never);
    expect(bom.meta.colunasTelescopadasCount ?? 0).toBe(0);
    const skusLF = bom.itens.filter((i) => i.categoria === "TUBO" && String(i.sku).includes("LF")).map((i) => i.sku);
    expect(skusLF).toContain("TIGRE_LF_50_PN40");
    expect(skusLF).not.toContain("TIGRE_LF_75_PN40");
    const te = bom.itens.find((i) => i.sku === "2090612");
    expect(te).toBeUndefined(); // tê de redução 75×50 não existe mais
  });
});
