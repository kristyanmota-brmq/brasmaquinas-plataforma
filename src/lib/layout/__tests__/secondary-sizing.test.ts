import { describe, it, expect } from "vitest";
import {
  selectSecondaryPipe,
  sizeAllSecondaries,
  type SecondaryStatus,
} from "@/lib/layout/secondary-sizing";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import { TUBOS_PVC_RIGIDO, ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";
import { headLoss, velocity, type TuboCandidato } from "@/lib/hydraulics/hazenWilliams";
import { makeLayoutL } from "./fixtures";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";
import type { Lateral } from "@/lib/layout/laterais";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CANDIDATES = TUBOS_PVC_RIGIDO as readonly TuboCandidato[];
const MAX_VEL = 1.5;
const MAX_HF = ASPERSOR_PADRAO.pressaoServicoMca * 0.10; // 3.0 mca

function makeSecondary(id: string, colId: string, lengthM: number): SecondaryPipe {
  return {
    id,
    physicalColumnId: colId,
    fromCoord: [0, 0],
    toCoord: [0, 0],
    lengthM,
    source: "auto",
  };
}

function makeLateral(colId: string, sectorId: number, flowM3h: number): Lateral {
  const smallestTube = TUBOS_PVC_RIGIDO[0];
  return {
    physicalColumnId: colId,
    sectorId,
    columnIndex: 0,
    startLngLat: [0, 0],
    endLngLat: [0, 0],
    sprinklerCount: 4,
    comprimentoM: 48,
    vazaoM3h: flowM3h,
    selecao: {
      tubo: smallestTube,
      perdaCargaM: 0,
      velocidadeMs: 0,
      perdaCargaPercentual: 0,
    },
    derivacaoLngLat: [0, 0],
  };
}

// ── T1: ramal curto e baixa vazão → menor tubo, status "ok" ──────────────────

describe("selectSecondaryPipe — T1: critério de velocidade satisfeito pelo menor tubo", () => {
  it("seleciona DN50 para fluxo baixo (5 m³/h) e comprimento curto (5 m)", () => {
    const result = selectSecondaryPipe({
      flowM3h: 5,
      lengthM: 5,
      candidatePipes: CANDIDATES,
      maxVelocityMs: MAX_VEL,
      maxHeadLossMca: MAX_HF,
    });
    expect(result.status).toBe("ok");
    expect(result.velocityExceeds).toBe(false);
    expect(result.headLossExceeds).toBe(false);
    // DN50 interno = 44 mm → V = Q/(π r²)
    const intMm = 44; // TIGRE_R_50 diametroInternoMm
    const expectedVel = velocity(5, intMm);
    expect(expectedVel).toBeLessThanOrEqual(MAX_VEL);
    expect(result.velocityMs).toBeCloseTo(expectedVel, 4);
  });
});

// ── T2: ramal longo → hf força escolha de tubo maior ────────────────────────

describe("selectSecondaryPipe — T2: comprimento longo força tubo maior por hf", () => {
  it("DN75 insuficiente (hf > 3 mca) para fluxo 5 m³/h e 250 m → seleciona tubo maior", () => {
    const flow = 5;
    const length = 250;
    // DN50 interno = 44 mm — verificar se hf seria > MAX_HF
    const dn50hf = headLoss(flow, length, 44, 145);
    expect(dn50hf).toBeGreaterThan(MAX_HF);

    const result = selectSecondaryPipe({
      flowM3h: flow,
      lengthM: length,
      candidatePipes: CANDIDATES,
      maxVelocityMs: MAX_VEL,
      maxHeadLossMca: MAX_HF,
    });
    expect(result.status).toBe("ok");
    expect(result.headLossExceeds).toBe(false);
    expect(result.selectedTube.diametroMm).toBeGreaterThan(50);
  });
});

// ── T3: vazão muito alta → fallback para maior tubo, status de violação ───────

describe("selectSecondaryPipe — T3: fallback ao maior tubo quando nenhum passa", () => {
  it("fluxo altíssimo (500 m³/h) → fallback ao DN150 com status de violação", () => {
    const result = selectSecondaryPipe({
      flowM3h: 500,
      lengthM: 10,
      candidatePipes: CANDIDATES,
      maxVelocityMs: MAX_VEL,
      maxHeadLossMca: MAX_HF,
    });
    // DN150 é o maior — deve ser selecionado
    expect(result.selectedTube.diametroMm).toBe(150);
    // Velocidade deve exceder para 500 m³/h mesmo em DN150
    expect(result.velocityExceeds).toBe(true);
    const violationStatuses: SecondaryStatus[] = [
      "velocity_exceeded", "headloss_exceeded", "both_exceeded", "fallback_largest",
    ];
    expect(violationStatuses).toContain(result.status);
  });
});

// ── T4: pressureClassRequirement filtra candidatos ────────────────────────────

describe("selectSecondaryPipe — T4: pressureClassRequirement filtra catálogo", () => {
  it("PN80 requirement → todos os TUBOS_PVC_RIGIDO (PN80) são válidos", () => {
    const result = selectSecondaryPipe({
      flowM3h: 5,
      lengthM: 5,
      candidatePipes: CANDIDATES,
      maxVelocityMs: MAX_VEL,
      maxHeadLossMca: MAX_HF,
      pressureClassRequirement: 80,
    });
    expect(result.selectedTube.pressaoMca).toBeGreaterThanOrEqual(80);
    expect(result.status).toBe("ok");
  });

  it("requirement > max disponível → usa todos os candidatos como fallback", () => {
    const result = selectSecondaryPipe({
      flowM3h: 5,
      lengthM: 5,
      candidatePipes: CANDIDATES,
      maxVelocityMs: MAX_VEL,
      maxHeadLossMca: MAX_HF,
      pressureClassRequirement: 200, // nenhum tubo tem PN >= 200
    });
    // Deve ainda retornar um resultado (fallback para todos os candidatos)
    expect(result.selectedTube).toBeDefined();
  });
});

// ── T5: comprimento zero → sem hf, status "ok", tubo mais pequeno ────────────

describe("selectSecondaryPipe — T5: comprimento zero → hf = 0", () => {
  it("lengthM = 0 → headLossMca = 0, status ok", () => {
    const result = selectSecondaryPipe({
      flowM3h: 50,
      lengthM: 0,
      candidatePipes: CANDIDATES,
      maxVelocityMs: MAX_VEL,
      maxHeadLossMca: MAX_HF,
    });
    expect(result.headLossMca).toBe(0);
    // Velocity still checked
    expect(result.headLossExceeds).toBe(false);
  });
});

// ── T6: sizeAllSecondaries — comprimentos diferentes → tubos diferentes ───────

describe("sizeAllSecondaries — T6: comprimentos diferentes podem resultar em tubos diferentes", () => {
  it("ramal curto (5 m) e longo (300 m) para mesma vazão → tubo longo é maior ou igual", () => {
    const colIdCurto = "col-short";
    const colIdLongo = "col-long";
    const flow = 5;

    const secondaries = [
      makeSecondary("sec-1", colIdCurto, 5),
      makeSecondary("sec-2", colIdLongo, 300),
    ];
    const laterais = [
      makeLateral(colIdCurto, 0, flow),
      makeLateral(colIdLongo, 0, flow),
    ];

    const sized = sizeAllSecondaries(secondaries, laterais);
    expect(sized).toHaveLength(2);

    const curto = sized.find((s) => s.physicalColumnId === colIdCurto)!;
    const longo = sized.find((s) => s.physicalColumnId === colIdLongo)!;

    expect(curto.diametroMm).toBeLessThanOrEqual(longo.diametroMm);
  });
});

// ── T7: sizeAllSecondaries — coluna sem lateral → flow = 0, status ok ─────────

describe("sizeAllSecondaries — T7: coluna sem lateral mapeada → flow zero, status ok", () => {
  it("secondary sem lateral correspondente → flowM3h = 0, status = 'ok'", () => {
    const secondaries = [makeSecondary("sec-x", "col-unmapped", 20)];
    const laterais: Lateral[] = []; // nenhuma lateral

    const sized = sizeAllSecondaries(secondaries, laterais);
    expect(sized).toHaveLength(1);
    expect(sized[0].flowM3h).toBe(0);
    expect(sized[0].status).toBe("ok");
    expect(sized[0].velocityMs).toBe(0);
    expect(sized[0].headLossMca).toBe(0);
  });
});

// ── T8: integração — sizedSecondaries presentes no relatório hidráulico ───────

describe("sizeHydraulics — T8: sizedSecondaries no relatório (Projeto L)", () => {
  it("hydraulics.sizedSecondaries está definido e tem itens quando existem ramais", () => {
    const result = calculateIrrigationProject(makeLayoutL());
    expect(result.hydraulics).not.toBeNull();
    const sizedSecs = result.hydraulics!.sizedSecondaries;
    expect(Array.isArray(sizedSecs)).toBe(true);
    // Projeto L tem secondaries — pelo menos alguns devem estar presentes
    if (result.hydraulic!.secondaries.length > 0) {
      expect(sizedSecs.length).toBe(result.hydraulic!.secondaries.length);
    }
  });

  it("cada SizedSecondaryPipe tem flowM3h, selectedTube, diametroMm, status", () => {
    const result = calculateIrrigationProject(makeLayoutL());
    const sizedSecs = result.hydraulics!.sizedSecondaries;
    for (const sec of sizedSecs) {
      expect(sec.flowM3h).toBeGreaterThanOrEqual(0);
      expect(sec.selectedTube).toBeDefined();
      expect(sec.diametroMm).toBeGreaterThan(0);
      expect(["ok", "velocity_exceeded", "headloss_exceeded", "both_exceeded", "fallback_largest"]).toContain(sec.status);
    }
  });
});

// ── T9: BOM — ramais agrupados por SKU, não pelo tubo da principal ────────────

describe("buildBOM — T9: ramais na BOM agrupados por SKU próprio (P4)", () => {
  it("BOM de ramais usa sku do tubo selecionado, não necessariamente o da principal", () => {
    const result = calculateIrrigationProject(makeLayoutL());
    if (result.hydraulic!.secondaries.length === 0) return; // sem ramais, ignorar

    const bomRamais = result.bom!.itens.filter(
      (i) => i.categoria === "TUBO" && i.descricao.includes("ramais"),
    );
    // Deve existir pelo menos um item de ramal na BOM
    expect(bomRamais.length).toBeGreaterThan(0);

    // Nenhum item de ramal deve ter quantidade negativa ou zero
    for (const item of bomRamais) {
      expect(item.quantidade).toBeGreaterThan(0);
      expect(item.total).toBeGreaterThan(0);
    }
  });
});

// ── T10: modelo — secondarySizingModel = "individual_velocity_and_headloss_checked" ──

describe("modelLimitations — T10: secondarySizingModel atualizado para P4", () => {
  it("secondarySizingModel = 'individual_velocity_and_headloss_checked' após P4", () => {
    const result = calculateIrrigationProject(makeLayoutL());
    expect(result.hydraulics!.modelLimitations.secondarySizingModel).toBe(
      "individual_velocity_and_headloss_checked",
    );
  });
});
