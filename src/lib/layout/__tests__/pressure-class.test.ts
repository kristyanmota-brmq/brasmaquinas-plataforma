import { describe, it, expect } from "vitest";
import {
  annotatePressureClass,
  derivePressureClassModel,
  type HydraulicSegment,
  type HydraulicValidation,
} from "@/lib/layout/hydraulic-sizing";
import { generateProposalDiagnostics, type BOMResult } from "@/lib/bom";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSeg(
  type: HydraulicSegment["type"],
  pressaoNominalMca: number | undefined,
  headLossM: number = 2,
  derivation?: { cumPrincipalHfM: number; adutoraHfM: number },
): HydraulicSegment {
  return {
    id: `seg-${type}-${Math.random()}`,
    type,
    lengthM: 100,
    diametroMm: 75,
    coefC: 145,
    flowM3h: 10,
    headLossM,
    velocityMs: 1.0,
    velocityExceeds: false,
    pressaoNominalMca,
    ...(derivation ?? {}),
  };
}

// ── annotatePressureClass — testes unitários da função pura ──────────────────

describe("annotatePressureClass", () => {
  it("adutora — ok quando HMT ≤ PN", () => {
    const result = annotatePressureClass([makeSeg("adutora", 80, 5)], 60);
    expect(result[0].pressureClassCheck).toBe("ok");
    expect(result[0].pressaoOperacionalMaxMca).toBe(60);
  });

  it("adutora — violation_confirmed quando HMT > PN", () => {
    const result = annotatePressureClass([makeSeg("adutora", 80, 5)], 85);
    expect(result[0].pressureClassCheck).toBe("violation_confirmed");
    expect(result[0].pressaoOperacionalMaxMca).toBe(85);
  });

  it("principal — pressão de entrada decresce após hf da adutora", () => {
    const adutora = makeSeg("adutora", 80, 10);
    const principal = makeSeg("principal", 80, 3);
    const result = annotatePressureClass([adutora, principal], 60);
    expect(result[0].pressaoOperacionalMaxMca).toBe(60);
    expect(result[1].pressaoOperacionalMaxMca).toBe(50); // 60 - 10
    expect(result[1].pressureClassCheck).toBe("ok");
  });

  it("lateral PN40 — ok quando HMT ≤ 40", () => {
    const result = annotatePressureClass([makeSeg("lateral", 40, 2)], 38);
    expect(result[0].pressureClassCheck).toBe("ok");
    expect(result[0].pressaoOperacionalMaxMca).toBe(38);
  });

  it("lateral PN40 com HMT 45 — violation_conservative (não blocker confirmado)", () => {
    const result = annotatePressureClass([makeSeg("lateral", 40, 2)], 45);
    expect(result[0].pressureClassCheck).toBe("violation_conservative");
    expect(result[0].pressureClassCheck).not.toBe("violation_confirmed");
    expect(result[0].pressaoOperacionalMaxMca).toBe(45);
  });

  it("segmento sem pressaoNominalMca — retorna 'unknown', sem falso positivo", () => {
    const result = annotatePressureClass([makeSeg("secondary", undefined, 2)], 90);
    expect(result[0].pressureClassCheck).toBe("unknown");
  });

  it("adutora PN80 com HMT 85 — violation_confirmed", () => {
    const result = annotatePressureClass([makeSeg("adutora", 80, 5)], 85);
    expect(result[0].pressureClassCheck).toBe("violation_confirmed");
  });

  it("lateral PN40 com HMT 45 — conservative, não confirmed", () => {
    const result = annotatePressureClass([makeSeg("lateral", 40, 2)], 45);
    expect(result[0].pressureClassCheck).toBe("violation_conservative");
    expect(result[0].pressureClassCheck).not.toBe("violation_confirmed");
  });

  it("sequência adutora → principal → lateral: pressões calculadas corretamente", () => {
    const adutora = makeSeg("adutora", 80, 10);
    const principal = makeSeg("principal", 80, 5);
    const lateral = makeSeg("lateral", 40, 2);
    const result = annotatePressureClass([adutora, principal, lateral], 60);
    expect(result[0].pressaoOperacionalMaxMca).toBe(60);  // inlet adutora
    expect(result[1].pressaoOperacionalMaxMca).toBe(50);  // 60 - 10 (hf_adutora)
    expect(result[2].pressaoOperacionalMaxMca).toBe(60);  // conservativo = HMT
    expect(result[2].pressureClassCheck).toBe("violation_conservative"); // 60 > 40
  });

  it("ramal (secondary) usa HMT conservativo — ok quando HMT ≤ PN80", () => {
    const result = annotatePressureClass([makeSeg("secondary", 80, 3)], 75);
    expect(result[0].pressaoOperacionalMaxMca).toBe(75);
    expect(result[0].pressureClassCheck).toBe("ok");
  });

  it("allGatesPass só cai com violation_confirmed, não com violation_conservative", () => {
    const lateral = makeSeg("lateral", 40, 2);
    const annotated = annotatePressureClass([lateral], 45);
    const hasConfirmed = annotated.some((s) => s.pressureClassCheck === "violation_confirmed");
    expect(hasConfirmed).toBe(false); // conservative não é confirmed
  });

  it("não modifica a array original (pureza)", () => {
    const seg = makeSeg("adutora", 80, 5);
    const original = { ...seg };
    annotatePressureClass([seg], 60);
    expect(seg.pressureClassCheck).toBeUndefined();
    expect(seg.pressaoOperacionalMaxMca).toBeUndefined();
    expect(seg.pressaoNominalMca).toBe(original.pressaoNominalMca);
  });
});

// ── TASK-004B: pressão real por derivação (cumPrincipalHfM + adutoraHfM) ─────

describe("TASK-004B — annotatePressureClass com pressão real por derivação", () => {
  it("T04B-1: lateral PN40 com derivação (cum=10, adu=5, hmt=45) → ok (vs antigo violation_conservative)", () => {
    const lateral = makeSeg("lateral", 40, 2, { cumPrincipalHfM: 10, adutoraHfM: 5 });
    const result = annotatePressureClass([lateral], 45);
    // 45 - 5 - 10 = 30 ≤ 40 ⇒ ok
    expect(result[0].pressaoOperacionalMaxMca).toBe(30);
    expect(result[0].pressureClassCheck).toBe("ok");
    expect(result[0].pressureClassCheck).not.toBe("violation_conservative");
  });

  it("T04B-2: lateral PN40 com derivação rasa (cum=2, adu=1, hmt=45) → violation_confirmed (vs antigo conservative)", () => {
    const lateral = makeSeg("lateral", 40, 2, { cumPrincipalHfM: 2, adutoraHfM: 1 });
    const result = annotatePressureClass([lateral], 45);
    // 45 - 1 - 2 = 42 > 40 ⇒ violation_confirmed (blocker real, não warning conservador)
    expect(result[0].pressaoOperacionalMaxMca).toBe(42);
    expect(result[0].pressureClassCheck).toBe("violation_confirmed");
    expect(result[0].pressureClassCheck).not.toBe("violation_conservative");
  });

  it("T04B-3: ramal PN80 com derivação (cum=5, adu=3, hmt=80) → ok", () => {
    const ramal = makeSeg("secondary", 80, 1, { cumPrincipalHfM: 5, adutoraHfM: 3 });
    const result = annotatePressureClass([ramal], 80);
    // 80 - 3 - 5 = 72 ≤ 80 ⇒ ok
    expect(result[0].pressaoOperacionalMaxMca).toBe(72);
    expect(result[0].pressureClassCheck).toBe("ok");
  });

  it("T04B-4: ramal sem cumPrincipalHfM (fallback legado) → violation_conservative quando HMT > PN", () => {
    // Sem o argumento `derivation` no helper, cumPrincipalHfM e adutoraHfM ficam undefined.
    // Fallback ativa: pressaoOperacionalMaxMca = hmtMca (conservativo).
    const ramal = makeSeg("secondary", 80, 1);
    const result = annotatePressureClass([ramal], 85);
    expect(result[0].pressaoOperacionalMaxMca).toBe(85);
    expect(result[0].pressureClassCheck).toBe("violation_conservative");
  });

  it("T04B-5: sequência adutora→principal→ramal→lateral com derivação — valores numéricos exatos", () => {
    const adutora = makeSeg("adutora", 80, 10);
    const principal = makeSeg("principal", 80, 5);
    const ramal = makeSeg("secondary", 80, 1, { cumPrincipalHfM: 5, adutoraHfM: 10 });
    const lateral = makeSeg("lateral", 40, 2, { cumPrincipalHfM: 5, adutoraHfM: 10 });
    const result = annotatePressureClass([adutora, principal, ramal, lateral], 60);
    // adutora: pressão = HMT = 60
    expect(result[0].pressaoOperacionalMaxMca).toBe(60);
    expect(result[0].pressureClassCheck).toBe("ok"); // 60 ≤ 80
    // principal: pressão = 60 - 10 = 50
    expect(result[1].pressaoOperacionalMaxMca).toBe(50);
    expect(result[1].pressureClassCheck).toBe("ok"); // 50 ≤ 80
    // ramal: pressão = 60 - 10 - 5 = 45
    expect(result[2].pressaoOperacionalMaxMca).toBe(45);
    expect(result[2].pressureClassCheck).toBe("ok"); // 45 ≤ 80
    // lateral: pressão = 60 - 10 - 5 = 45
    expect(result[3].pressaoOperacionalMaxMca).toBe(45);
    expect(result[3].pressureClassCheck).toBe("violation_confirmed"); // 45 > 40
  });

  it("T04B-6: lateral com apenas cumPrincipalHfM (sem adutoraHfM) → fallback legado", () => {
    // Ajuste TEC-004B-001: detecção exige AMBOS os campos. Apenas um → fallback conservador.
    const lateral: HydraulicSegment = {
      ...makeSeg("lateral", 40, 2),
      cumPrincipalHfM: 10,
      // adutoraHfM omitido propositalmente
    };
    const result = annotatePressureClass([lateral], 45);
    expect(result[0].pressaoOperacionalMaxMca).toBe(45); // fallback HMT
    expect(result[0].pressureClassCheck).toBe("violation_conservative");
  });
});

describe("TASK-004B — derivePressureClassModel", () => {
  it("retorna 'hmt_conservative_inlet' quando não há ramais/laterais", () => {
    const segs = [
      makeSeg("adutora", 80, 5),
      makeSeg("principal", 80, 3),
    ];
    expect(derivePressureClassModel(segs)).toBe("hmt_conservative_inlet");
  });

  it("retorna 'exact_per_derivation' quando TODOS ramais/laterais têm ambos os campos", () => {
    const segs: HydraulicSegment[] = [
      makeSeg("adutora", 80, 5),
      makeSeg("principal", 80, 3),
      makeSeg("secondary", 80, 1, { cumPrincipalHfM: 5, adutoraHfM: 5 }),
      makeSeg("lateral", 40, 2, { cumPrincipalHfM: 5, adutoraHfM: 5 }),
    ];
    expect(derivePressureClassModel(segs)).toBe("exact_per_derivation");
  });

  it("retorna 'hmt_conservative_inlet' quando ALGUM ramal/lateral não tem ambos os campos", () => {
    const segs: HydraulicSegment[] = [
      makeSeg("secondary", 80, 1, { cumPrincipalHfM: 5, adutoraHfM: 5 }),
      // lateral sem derivação — força fallback
      makeSeg("lateral", 40, 2),
    ];
    expect(derivePressureClassModel(segs)).toBe("hmt_conservative_inlet");
  });

  it("retorna 'hmt_conservative_inlet' quando ramal tem cumPrincipalHfM mas falta adutoraHfM (Opção A do GPT)", () => {
    const segs: HydraulicSegment[] = [
      {
        ...makeSeg("secondary", 80, 1),
        cumPrincipalHfM: 5,
        // adutoraHfM omitido
      },
    ];
    expect(derivePressureClassModel(segs)).toBe("hmt_conservative_inlet");
  });
});

// ── generateProposalDiagnostics — integração com violação de PN ──────────────

function makeMinimalLayout(): ProjectLayout {
  return {
    schemaVersion: "1",
    sprinklers: {
      count: 10,
      positions: [],
      gridAngleDegrees: 0,
      espacamentoM: 18,
      vazaoProjetoM3PorHora: 1.0,
    },
    sectorization: { setoresCount: 2, sectorIndices: [] },
    mainPipeline: { lengthMeters: 100, segments: 2 },
    centroid: { lng: -42.5, lat: -14.2 },
  } as unknown as ProjectLayout;
}

function makeMinimalBOM(): BOMResult {
  return {
    itens: [],
    totalGeral: 0,
    laterais: [],
    meta: {
      diametroPrincipalMm: 75,
      diametroPrincipalCalculadoMm: 75,
      barrasDeTubo: 5,
      nCurvas90: 2,
      nTes: 1,
      nLaterais: 5,
      nColunasLaterais: 5,
      comprimentoLateraisM: 100,
      comprimentoAdutoraM: 0,
      comprimentoSecundariasM: 50,
      aspersoresPorSetorMin: 5,
      aspersoresPorSetorMax: 5,
      aspersoresPorSetorMedia: 5,
      vazaoPorSetorMin: 0.5,
      vazaoPorSetorMax: 0.5,
      desbalanceamentoSetoresPercent: 0,
      tees50Source: "physicalColumns",
      operationalSegmentsCount: 5,
      physicalColumnsSplitCount: 0,
      maxSegmentsPerPhysicalColumn: 1,
      splitControlPointsCount: 0,
      splitPointsCount: 0,
      unresolvedOperationalSegmentsCount: 0,
      controlPointsCount: 0,
      pendingControlPointsCount: 0,
      independentFeedRequiredCount: 0,
      constructabilityStatus: "ok",
      valvulasCount: 0,
      valvulasResolvidasCount: 0,
      valvulasSemCatalogoCount: 0,
      registrosManuaisSecaoCount: 0,
      conexoesFisicasPendentes: [],
      conexoesFisicasSemSkuCount: 0,
      curvas90RamaisLCount: 0,
      curvas90AdutoraCount: 0,
      curvas45AdutoraCount: 0,
      curvas90LateraisCount: 0,
      curvas90LateraisSemSkuCount: 0,
      kitAspersorResolvCount: 0,
      kitAspersorDnNaoHomologadoCount: 0,
    },
  };
}

function makeHydraulicsWithPN(
  hasPressureClassViolations: boolean,
  hasConservativePressureClassWarnings: boolean,
): Parameters<typeof generateProposalDiagnostics>[2] {
  const validation: HydraulicValidation = {
    invalidSegments: [],
    hasVelocityViolations: false,
    hasLateralLossViolations: false,
    hasSecondaryLossViolations: false,
    hasPressureClassViolations,
    hasConservativePressureClassWarnings,
    allGatesPass: !hasPressureClassViolations,
  };
  return {
    operationMode: "one_sector_at_a_time",
    criticalPath: {} as never,
    hmt: { totalHMT: 45 } as never,
    validation,
    pumpValidation: { status: "not_informed", designFlowM3h: 5, requiredHMT: 45 },
    modelLimitations: {} as never,
    status: hasPressureClassViolations ? "blocked_invalid_segments" : "technical_review_required",
    hydraulicSolverStatus: hasPressureClassViolations ? "blocked" : "calculated_pending_review",
    warnings: [],
    allSegments: [],
    sizedSecondaries: [],
  };
}

describe("generateProposalDiagnostics — verificação de PN", () => {
  it("violation_confirmed gera blocker", () => {
    const diag = generateProposalDiagnostics(
      makeMinimalLayout(),
      makeMinimalBOM(),
      makeHydraulicsWithPN(true, false),
    );
    expect(diag.blockers.some((b) => b.toLowerCase().includes("pn"))).toBe(true);
  });

  it("violation_conservative gera warning, não blocker", () => {
    const diag = generateProposalDiagnostics(
      makeMinimalLayout(),
      makeMinimalBOM(),
      makeHydraulicsWithPN(false, true),
    );
    expect(diag.warnings.some((w) => w.toLowerCase().includes("pn") || w.toLowerCase().includes("conserv"))).toBe(true);
    expect(diag.blockers.some((b) => b.toLowerCase().includes("pn"))).toBe(false);
  });

  it("sem violação — sem blocker de PN", () => {
    const diag = generateProposalDiagnostics(
      makeMinimalLayout(),
      makeMinimalBOM(),
      makeHydraulicsWithPN(false, false),
    );
    expect(diag.blockers.some((b) => b.toLowerCase().includes("pn"))).toBe(false);
  });
});
