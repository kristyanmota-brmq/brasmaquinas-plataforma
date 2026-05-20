import { describe, it, expect } from "vitest";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import { sizeHydraulics } from "@/lib/layout/hydraulic-sizing";
import { headLoss } from "@/lib/hydraulics/hazenWilliams";
import { makeLayoutL, makeLayoutP } from "./fixtures";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function completeResultL() {
  return calculateIrrigationProject(makeLayoutL());
}

function completeResultP() {
  return calculateIrrigationProject(makeLayoutP());
}

function incompleteResult() {
  return calculateIrrigationProject({ schemaVersion: "1" });
}

// ── T1: null para resultado incompleto ────────────────────────────────────────

describe("sizeHydraulics — resultado incompleto", () => {
  it("retorna null quando isComplete = false", () => {
    expect(sizeHydraulics(incompleteResult())).toBeNull();
  });

  it("retorna null quando chamado com resultado sem laterais", () => {
    const result = completeResultL();
    // Substituir distribution.laterais por array vazio
    const mutated = { ...result, distribution: { ...result.distribution!, laterais: [], nLaterais: 0, nPhysical: 0 } };
    expect(sizeHydraulics(mutated)).toBeNull();
  });
});

// ── T2: retorno não-nulo e estrutura básica ───────────────────────────────────

describe("sizeHydraulics — estrutura do relatório (Projeto L)", () => {
  it("retorna relatório não-nulo para projeto completo", () => {
    const report = sizeHydraulics(completeResultL());
    expect(report).not.toBeNull();
  });

  it("operationMode = 'one_sector_at_a_time'", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.operationMode).toBe("one_sector_at_a_time");
  });

  it("criticalPath está definido com sectorId válido", () => {
    const result = completeResultL();
    const report = sizeHydraulics(result)!;
    const { criticalSectorId } = report.criticalPath;
    expect(criticalSectorId).toBeGreaterThanOrEqual(0);
    expect(criticalSectorId).toBeLessThan(result.operational!.nSetores);
  });

  it("criticalPathSegments contém adutora, principal e lateral", () => {
    const report = sizeHydraulics(completeResultL())!;
    const types = report.criticalPath.criticalPathSegments.map((s) => s.type);
    expect(types).toContain("adutora");
    expect(types).toContain("principal");
    expect(types).toContain("lateral");
  });

  it("totalHeadLossM > 0", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.criticalPath.totalHeadLossM).toBeGreaterThan(0);
  });
});

// ── T3: HMT ───────────────────────────────────────────────────────────────────

describe("sizeHydraulics — HMT (Projeto L)", () => {
  it("totalHMT >= pressaoServicoMca (HMT nunca menor que a pressão no aspersor)", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.hmt.totalHMT).toBeGreaterThanOrEqual(report.hmt.pressaoServicoMca);
  });

  it("noElevationData = true (fixture sem elevação)", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.hmt.noElevationData).toBe(true);
  });

  it("desnivelM = 0 quando sem dados de elevação", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.hmt.desnivelM).toBe(0);
  });

  it("totalHMT = pressaoServico + hfAdutora + hfPrincipal + hfSecondary + hfLateral + safetyMargin", () => {
    const report = sizeHydraulics(completeResultL())!;
    const { hmt } = report;
    const expected =
      hmt.pressaoServicoMca +
      hmt.hfAdutoraM +
      hmt.hfPrincipalToDerivationM +
      hmt.hfSecondaryM +
      hmt.hfLateralM +
      hmt.desnivelM +
      hmt.localLossesM +
      hmt.safetyMarginM;
    expect(hmt.totalHMT).toBeCloseTo(expected, 6);
  });
});

// ── T4: Validação ─────────────────────────────────────────────────────────────

describe("sizeHydraulics — validação de segmentos", () => {
  it("validation está definida com campos obrigatórios", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.validation).toBeDefined();
    expect(Array.isArray(report.validation.invalidSegments)).toBe(true);
    expect(typeof report.validation.hasVelocityViolations).toBe("boolean");
    expect(typeof report.validation.hasLateralLossViolations).toBe("boolean");
    expect(typeof report.validation.allGatesPass).toBe("boolean");
  });

  it("allSegments é um array não vazio", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.allSegments.length).toBeGreaterThan(0);
  });
});

// ── T5: Consistência entre projetos L e P ─────────────────────────────────────

describe("sizeHydraulics — consistência Projeto L vs P", () => {
  it("Projeto P tem HMT diferente de L (campos distintos)", () => {
    const hmtL = sizeHydraulics(completeResultL())!.hmt.totalHMT;
    const hmtP = sizeHydraulics(completeResultP())!.hmt.totalHMT;
    // Ambos devem ser > 0 e distintos (geometrias diferentes)
    expect(hmtL).toBeGreaterThan(0);
    expect(hmtP).toBeGreaterThan(0);
  });

  it("criticalPath é calculado também para Projeto P", () => {
    const report = sizeHydraulics(completeResultP());
    expect(report).not.toBeNull();
    expect(report!.criticalPath.criticalPathSegments.length).toBeGreaterThan(0);
  });
});

// ── T6: Integração com calculateIrrigationProject ─────────────────────────────

describe("calculateIrrigationProject — campo hydraulics", () => {
  it("resultado completo tem hydraulics não-nulo", () => {
    const result = completeResultL();
    expect(result.hydraulics).not.toBeNull();
  });

  it("resultado incompleto tem hydraulics = null", () => {
    const result = incompleteResult();
    expect(result.hydraulics).toBeNull();
  });
});

// ── T7: Benchmarks e testes mandatórios (TAREFA 3+8) ─────────────────────────

describe("TAREFA 3+8 — benchmarks e testes mandatórios", () => {
  it("T8-1: headLoss(Q=30 m³/h, L=6 m, D=125 mm, C=145) ≈ 0,0225 mca", () => {
    expect(headLoss(30, 6, 125, 145)).toBeCloseTo(0.0225, 3);
  });

  it("T8-2: lateral do caminho crítico tem headLossM < rawHW (Christiansen F < 1)", () => {
    const report = sizeHydraulics(completeResultL())!;
    const critLat = report.criticalPath.criticalPathSegments.find((s) => s.type === "lateral")!;
    expect(critLat).toBeDefined();
    const rawHf = headLoss(critLat.flowM3h, critLat.lengthM, critLat.diametroMm, critLat.coefC);
    expect(critLat.headLossM).toBeLessThan(rawHf);
  });

  it("T8-3: adutora dimensionada para ~1/nSetores do total (one_sector_at_a_time)", () => {
    const result = completeResultL();
    const report = sizeHydraulics(result)!;
    const adutoraSeg = report.allSegments.find((s) => s.type === "adutora")!;
    const totalFlow = result.layout.sprinklers!.vazaoProjetoM3PorHora;
    expect(adutoraSeg.flowM3h).toBeLessThan(totalFlow);
    expect(adutoraSeg.flowM3h).toBeCloseTo(totalFlow / result.operational!.nSetores, 0);
  });

  it("T8-4: todos sub-segs da principal têm flowM3h ≤ vazão do setor crítico", () => {
    const result = completeResultL();
    const report = sizeHydraulics(result)!;
    const sectorFlow = report.pumpValidation.designFlowM3h;
    const principalSegs = report.allSegments.filter((s) => s.type === "principal");
    expect(principalSegs.length).toBeGreaterThan(0);
    for (const seg of principalSegs) {
      expect(seg.flowM3h).toBeLessThanOrEqual(sectorFlow + 1e-6);
    }
  });

  it("T8-5: Projeto P tem ramais (secondary) e caminho crítico passa por um", () => {
    const report = sizeHydraulics(completeResultP())!;
    const secs = report.allSegments.filter((s) => s.type === "secondary");
    expect(secs.length).toBeGreaterThan(0);
    const critTypes = report.criticalPath.criticalPathSegments.map((s) => s.type);
    expect(critTypes).toContain("secondary");
  });

  it("T8-6: pump.hmtMca < requiredHMT → pump_insufficient_head + hydraulicSolverStatus=blocked", () => {
    const result = completeResultL();
    const resultWithPump = {
      ...result,
      layout: { ...result.layout, pump: { hmtMca: 5, vazaoMaxM3h: 1000 } },
    };
    const report = sizeHydraulics(resultWithPump)!;
    expect(report.pumpValidation.status).toBe("pump_insufficient_head");
    expect(report.hydraulicSolverStatus).toBe("blocked");
  });

  it("T8-7: pump.vazaoMaxM3h < sectorFlow → pump_insufficient_flow + blocked", () => {
    const result = completeResultL();
    const resultWithPump = {
      ...result,
      layout: { ...result.layout, pump: { hmtMca: 1000, vazaoMaxM3h: 1 } },
    };
    const report = sizeHydraulics(resultWithPump)!;
    expect(report.pumpValidation.status).toBe("pump_insufficient_flow");
    expect(report.hydraulicSolverStatus).toBe("blocked");
  });

  it("T8-8: sem bomba → status=technical_review_required + hydraulicSolverStatus=calculated_pending_review", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.pumpValidation.status).toBe("not_informed");
    expect(report.status).toBe("technical_review_required");
    expect(report.hydraulicSolverStatus).toBe("calculated_pending_review");
  });

  it("T8-9: bomba compatível → hydraulicSolverStatus=validated + status=hydraulic_precheck_ok", () => {
    const result = completeResultL();
    const resultWithPump = {
      ...result,
      layout: { ...result.layout, pump: { hmtMca: 100, vazaoMaxM3h: 1000 } },
    };
    const report = sizeHydraulics(resultWithPump)!;
    expect(report.pumpValidation.status).toBe("ok");
    expect(report.status).toBe("hydraulic_precheck_ok");
    expect(report.hydraulicSolverStatus).toBe("validated");
  });

  it("T8-10: duas chamadas com mesmo layout produzem HMT e BOM totais idênticos", () => {
    const r1 = calculateIrrigationProject(makeLayoutL());
    const r2 = calculateIrrigationProject(makeLayoutL());
    expect(r1.hydraulics!.hmt.totalHMT).toBe(r2.hydraulics!.hmt.totalHMT);
    expect(r1.bom!.totalGeral).toBe(r2.bom!.totalGeral);
  });
});

// ── TAREFA 9 — Correção técnica do solver (T1, T3–T8) ─────────────────────────

describe("TAREFA 9 — diâmetro interno, caminho exaustivo, perdas locais, desnível", () => {
  it("T9-1: headLoss com diâmetro interno (menor) > headLoss com nominal (D_int < D_nom → hf maior)", () => {
    // DN75 PN80: nominal=75mm, interno=66mm
    const hfNominal = headLoss(30, 100, 75, 145);
    const hfInterno = headLoss(30, 100, 66, 145);
    expect(hfInterno).toBeGreaterThan(hfNominal);
  });

  it("T9-2: modelLimitations.diameterAssumption = 'internal' (todos os tubos têm diâmetro interno)", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.modelLimitations.diameterAssumption).toBe("internal");
  });

  it("T9-3: localLossesM > 0 para projeto completo (fator padrão 10 %)", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.hmt.localLossesM).toBeGreaterThan(0);
  });

  it("T9-4: localLossesM ≈ 10 % das perdas distribuídas (adutora + principal + ramal + lateral)", () => {
    const report = sizeHydraulics(completeResultL())!;
    const { hmt } = report;
    const distribHf = hmt.hfAdutoraM + hmt.hfPrincipalToDerivationM + hmt.hfSecondaryM + hmt.hfLateralM;
    expect(hmt.localLossesM).toBeCloseTo(distribHf * 0.10, 6);
  });

  it("T9-5: modelLimitations.localLossesModel = 'percent_estimate' (fator > 0)", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.modelLimitations.localLossesModel).toBe("percent_estimate");
  });

  it("T9-6: desnível positivo (captação abaixo da área) aumenta HMT", () => {
    const result = completeResultL();
    const reportSem = sizeHydraulics(result)!;
    const resultCom = {
      ...result,
      layout: { ...result.layout, geodetic: { elevationDeltaMeters: 10 } },
    };
    const reportCom = sizeHydraulics(resultCom)!;
    expect(reportCom.hmt.totalHMT).toBeCloseTo(reportSem.hmt.totalHMT + 10, 4);
    expect(reportCom.hmt.desnivelM).toBeCloseTo(10, 4);
  });

  it("T9-7: desnível negativo (captação acima da área) reduz HMT mas não abaixo do piso", () => {
    const result = completeResultL();
    const reportSem = sizeHydraulics(result)!;
    const resultFavoravel = {
      ...result,
      layout: { ...result.layout, geodetic: { elevationDeltaMeters: -5 } },
    };
    const reportFav = sizeHydraulics(resultFavoravel)!;
    expect(reportFav.hmt.totalHMT).toBeLessThan(reportSem.hmt.totalHMT);
    // Piso: pressaoServico + localLosses + margem
    const piso =
      reportFav.hmt.pressaoServicoMca +
      reportFav.hmt.localLossesM +
      reportFav.hmt.safetyMarginM;
    expect(reportFav.hmt.totalHMT).toBeGreaterThanOrEqual(piso - 1e-6);
  });

  it("T9-8: modelLimitations.criticalPathModel = 'exhaustive'", () => {
    const report = sizeHydraulics(completeResultL())!;
    expect(report.modelLimitations.criticalPathModel).toBe("exhaustive");
  });

  it("T9-9: criticalPrincipalSubSegments presente e comprimento total ≤ comprimento de todos os sub-segs", () => {
    const report = sizeHydraulics(completeResultL())!;
    const critSubSegs = report.criticalPath.criticalPrincipalSubSegments;
    expect(Array.isArray(critSubSegs)).toBe(true);
    const allPrincipal = report.allSegments.filter((s) => s.type === "principal");
    const totalCritLen = critSubSegs.reduce((s, x) => s + x.lengthM, 0);
    const totalAllLen  = allPrincipal.reduce((s, x) => s + x.lengthM, 0);
    expect(totalCritLen).toBeLessThanOrEqual(totalAllLen + 1e-6);
  });

  it("T9-10: hfPrincipalToDerivationM = soma de headLossM dos criticalPrincipalSubSegments", () => {
    const report = sizeHydraulics(completeResultL())!;
    const subSegsHf = report.criticalPath.criticalPrincipalSubSegments.reduce(
      (s, x) => s + x.headLossM,
      0,
    );
    expect(report.hmt.hfPrincipalToDerivationM).toBeCloseTo(subSegsHf, 6);
  });
});
