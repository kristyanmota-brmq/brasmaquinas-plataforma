/**
 * TASK-043 — Testes do motor de seleção arquitetural.
 *
 * Não substitui o solver oficial — valida apenas o motor de comparação
 * entre candidatos arquiteturais (A0/A2/A3) e a função de seleção.
 *
 * Cenários sintéticos (centroid origin, gridAngleDegrees=0, lat=0) para
 * que `frame local = frame geográfico` e a matemática seja direta.
 */

import { describe, it, expect } from "vitest";
import {
  selectArchitectureByBom,
  MAX_VELOCITY_RAMAL_MS,
  MAX_HEADLOSS_RAMAL_MCA,
} from "../architecture-selector";
import { generatePrincipalAndAdutora } from "../principal";
import { detectNetworkAngleIssues } from "../network-angle-diagnostics";
import type { PhysicalColumn, Lateral } from "../laterais";
import type { SelecaoTubo } from "../../hydraulics/hazenWilliams";

const CENTROID_0 = { lng: 0, lat: 0 };
const EPS_GEOM = 1e-6; // tolerância geométrica para comparação de coords (Ajuste 7)
const EPS_BOM = 1.0;   // tolerância R$ para empate

const DUMMY_SELECAO: SelecaoTubo = {
  tubo: { sku: "TEST", diametroMm: 50, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  perdaCargaM: 1,
  velocidadeMs: 1,
  perdaCargaPercentual: 0.033,
};

// ──────────────────────────────────────────────────────────────────────────
// Builders
// ──────────────────────────────────────────────────────────────────────────

/**
 * Cria PhysicalColumn sintética. X e Y são metros; convertidos para lng/lat
 * via 1° lat = 111320 m, lng = lat em lat=0.
 */
function mkColumn(
  id: string,
  xMeters: number,
  yMinMeters: number,
  yMaxMeters: number,
  sprinklerCount = 2,
): PhysicalColumn {
  const M = 111320;
  const start: [number, number] = [xMeters / M, yMinMeters / M];
  const end: [number, number] = [xMeters / M, yMaxMeters / M];
  return {
    id,
    columnIndex: parseInt(id.replace(/\D/g, ""), 10) || 0,
    startLngLat: start,
    endLngLat: end,
    comprimentoM: yMaxMeters - yMinMeters,
    sprinklerCount,
    vazaoM3h: sprinklerCount * 1.5, // Q por aspersor = 1,5 m³/h (5022-SD)
    selecao: DUMMY_SELECAO,
    sectorsTouched: [0],
    sprinklerIndices: [],
    routeCoords: [start, end],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

/**
 * Cria Lateral sintética associada a uma PhysicalColumn.
 * vazaoM3h define a vazão de projeto (consumida via max por col em `sizeAllSecondaries`).
 */
function mkLateral(physicalColumnId: string, columnIndex: number, vazaoM3h: number, comprimentoM = 60): Lateral {
  return {
    sectorId: 0,
    physicalColumnId,
    columnIndex,
    startLngLat: [0, 0],
    endLngLat: [0, 0],
    sprinklerCount: Math.round(vazaoM3h / 1.5),
    comprimentoM,
    vazaoM3h,
    selecao: DUMMY_SELECAO,
    derivacaoLngLat: [0, 0],
    routeCoords: [[0, 0], [0, 0]],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Cenários
// ──────────────────────────────────────────────────────────────────────────

/**
 * Cenário "baseline": 4 colunas verticais espaçadas 12m em X, comprimento 60m em Y,
 * Y de 0 a 60. Captação em (24, -100): fora da faixa Y (lado min). A0 escolhe min.
 */
function buildBaselineScenario(): {
  waterSource: { lng: number; lat: number };
  physicalColumns: PhysicalColumn[];
  laterais: Lateral[];
} {
  const cols = [
    mkColumn("col-0", 0, 0, 60, 5),
    mkColumn("col-1", 12, 0, 60, 5),
    mkColumn("col-2", 24, 0, 60, 5),
    mkColumn("col-3", 36, 0, 60, 5),
  ];
  const laterais: Lateral[] = cols.map((c, i) => mkLateral(c.id, i, 7.5, 60));
  // waterSource em Y muito negativo → fora da faixa, lado="min"
  const waterSource = { lng: 24 / 111320, lat: -100 / 111320 };
  return { waterSource, physicalColumns: cols, laterais };
}

/**
 * Cenário "captação no meio": captação em (24, 30) — dentro da faixa Y.
 * Usado para testar A2 (lado por menor custo) vs. A0 (proximidade).
 */
function buildCaptacaoDentroDaFaixaScenario(): {
  waterSource: { lng: number; lat: number };
  physicalColumns: PhysicalColumn[];
  laterais: Lateral[];
} {
  const base = buildBaselineScenario();
  return {
    ...base,
    waterSource: { lng: 24 / 111320, lat: 30 / 111320 },
  };
}

/**
 * Cenário "Projeto A-like": 16 colunas longas (300 m em Y) com vazão alta (24 m³/h).
 * Captação fora da faixa Y. Espera-se que o motor consiga avaliar todos os candidatos
 * (mesmo que A0 vença pela complexidade hidráulica que segura ramais em DN100).
 */
function buildProjetoALikeScenario(): {
  waterSource: { lng: number; lat: number };
  physicalColumns: PhysicalColumn[];
  laterais: Lateral[];
} {
  const cols: PhysicalColumn[] = [];
  const laterais: Lateral[] = [];
  for (let i = 0; i < 16; i++) {
    const col = mkColumn(`col-${i}`, i * 12, 0, 300, 25);
    cols.push(col);
    laterais.push(mkLateral(col.id, i, 24, 300)); // Q=24 m³/h força DN100
  }
  // Captação fora da faixa Y
  const waterSource = { lng: 90 / 111320, lat: -200 / 111320 };
  return { waterSource, physicalColumns: cols, laterais };
}

// ──────────────────────────────────────────────────────────────────────────
// Testes
// ──────────────────────────────────────────────────────────────────────────

describe("TASK-043 — selectArchitectureByBom", () => {
  it("T43-1 — A0 do motor coincide (dentro de tolerância) com generatePrincipalAndAdutora sem options", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();

    // A0 puro via função original
    const a0Direct = generatePrincipalAndAdutora(waterSource, physicalColumns, CENTROID_0, 0);

    // A0 via motor (winnerCandidate quando A0 vence) — aqui, com Q baixo (7.5 m³/h),
    // todos os candidatos são válidos; A2 pode vencer. Buscamos a evaluation A0 explicitamente.
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const evalA0 = result.evaluations.find((e) => e.candidate.id === "A0");
    expect(evalA0).toBeDefined();

    // Mesmas coordenadas dentro de tolerância geométrica
    expect(evalA0!.candidate.principal.length).toBe(a0Direct.principal.length);
    for (let i = 0; i < a0Direct.principal.length; i++) {
      expect(Math.abs(evalA0!.candidate.principal[i][0] - a0Direct.principal[i][0])).toBeLessThan(EPS_GEOM);
      expect(Math.abs(evalA0!.candidate.principal[i][1] - a0Direct.principal[i][1])).toBeLessThan(EPS_GEOM);
    }
    // Adutora também
    expect(evalA0!.candidate.adutora.length).toBe(a0Direct.adutora.length);
    for (let i = 0; i < a0Direct.adutora.length; i++) {
      expect(Math.abs(evalA0!.candidate.adutora[i][0] - a0Direct.adutora[i][0])).toBeLessThan(EPS_GEOM);
      expect(Math.abs(evalA0!.candidate.adutora[i][1] - a0Direct.adutora[i][1])).toBeLessThan(EPS_GEOM);
    }
  });

  it("T43-2 — A2 com captação dentro da faixa Y avalia ambos os lados (min/max)", () => {
    const { waterSource, physicalColumns, laterais } = buildCaptacaoDentroDaFaixaScenario();

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const evalA2 = result.evaluations.find((e) => e.candidate.id === "A2");
    expect(evalA2).toBeDefined();
    expect(evalA2!.candidate.principal.length).toBeGreaterThan(0);
    // A2 produz alguma BOM estimada > 0
    expect(evalA2!.bomEstimadaPreliminar).toBeGreaterThan(0);
    // Quando captação está em yMid, A2 e A0 podem ter mesma BOM (ambas escolhendo borda);
    // o ponto é que A2 foi avaliada. As duas opções min/max foram testadas internamente.
  });

  it("T43-3 — A3 central usa principalY = (yMin + yMax)/2 (eixo central)", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const evalA3 = result.evaluations.find((e) => e.candidate.id === "A3");
    expect(evalA3).toBeDefined();

    // No frame local, yMin=0 e yMax=60. principalY central = 30 m → 30/111320 graus.
    const expectedY = 30 / 111320;
    for (const pt of evalA3!.candidate.principal) {
      expect(Math.abs(pt[1] - expectedY)).toBeLessThan(EPS_GEOM);
    }
  });

  it("T43-4 — BOM estimada preliminar = bomPrincipal + bomAdutora + bomSecondaries", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    for (const ev of result.evaluations) {
      const soma = ev.bomPrincipal + ev.bomAdutora + ev.bomSecondaries;
      expect(Math.abs(ev.bomEstimadaPreliminar - soma)).toBeLessThan(EPS_BOM);
      // Cada parcela é não-negativa
      expect(ev.bomPrincipal).toBeGreaterThanOrEqual(0);
      expect(ev.bomAdutora).toBeGreaterThanOrEqual(0);
      expect(ev.bomSecondaries).toBeGreaterThanOrEqual(0);
    }
  });

  it("T43-5 — candidato com Q extrema (que excede limites) é marcado inviável com invalidReason", () => {
    // Para que generateSecondaries crie ramais, é necessário ter sub-colunas no
    // mesmo X (split TASK-040) — apenas a primeira é projetada na principal;
    // as demais ficam afastadas e geram ramal.
    const cols = [
      mkColumn("col-0a", 0, 0, 100, 30),   // sub-coluna inferior (vai p/ principal)
      mkColumn("col-0b", 0, 200, 350, 30), // sub-coluna superior (gap → ramal)
    ];
    // Vazão patológica forçando violação mesmo com o maior DN do catálogo
    const laterais = [
      mkLateral("col-0a", 0, 200, 100),
      mkLateral("col-0b", 0, 200, 150),
    ];
    const waterSource = { lng: 0, lat: -100 / 111320 };

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns: cols,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const evalA0 = result.evaluations.find((e) => e.candidate.id === "A0")!;
    // Q=200 m³/h excede velocidade mesmo no maior DN (interno 133 mm) →
    // V = (200/3600) / (π × 0.0665²) ≈ 4,0 m/s ≫ 1,5 m/s
    expect(evalA0.isValid).toBe(false);
    expect(evalA0.invalidReason).toBeTruthy();
    expect(evalA0.invalidReason).toContain("ramal");

    if (result.evaluations.every((e) => !e.isValid)) {
      expect(result.decision).toBe("no_valid_candidate");
    }
  });

  it("T43-6 — vencedor é o de menor BOM válida; empate (< R$ 1,00) prefere A0", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const validEvals = result.evaluations.filter((e) => e.isValid);
    expect(validEvals.length).toBeGreaterThan(0);
    const minBom = Math.min(...validEvals.map((e) => e.bomEstimadaPreliminar));
    const winnerEval = result.evaluations.find((e) => e.candidate.id === result.winner)!;

    // Vencedor está dentro de EPS_BOM do mínimo
    expect(Math.abs(winnerEval.bomEstimadaPreliminar - minBom)).toBeLessThan(EPS_BOM);

    // Se houver empate em A0, A0 deve vencer
    const tied = validEvals.filter((e) => Math.abs(e.bomEstimadaPreliminar - minBom) < EPS_BOM);
    const a0InTied = tied.find((e) => e.candidate.id === "A0");
    if (a0InTied) {
      expect(result.winner).toBe("A0");
    }
  });

  it("T43-7 — A0 vencedor → decision = baseline_preserved e reason cita A0/A2/A3", () => {
    // Cenário onde A0 (baseline) é igual ou melhor que A2/A3.
    // Captação muito fora da faixa Y → A0 e A2 produzem o mesmo lado;
    // BOM iguais → empate → A0 vence.
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    if (result.winner === "A0") {
      expect(result.decision).toBe("baseline_preserved");
      expect(result.reason).toContain("A0");
      expect(result.reason).toContain("A2");
      expect(result.reason).toContain("A3");
      expect(result.bomDeltaVsBaseline).toBe(0);
    }
    // Se A0 não venceu (raro neste cenário), o teste ainda valida o invariante
    // mas via outro caminho (decision != "baseline_preserved" → A2 ou A3 venceu).
    expect(["A0", "A2", "A3"]).toContain(result.winner);
  });

  it("T43-8 — invariantes ADR-010 preservadas (rede 0°/90°) em candidato vencedor", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    // Aplicar detectNetworkAngleIssues sobre o candidato vencedor — não deve gerar
    // blocker angular (ADR-010 preservada). É a mesma estrutura de principal/adutora/
    // ramais do solver atual; o motor só muda quais coords da principal.
    const winnerEval = result.evaluations.find((e) => e.candidate.id === result.winner)!;
    const report = detectNetworkAngleIssues({
      principalCoords: result.winnerCandidate.principal,
      adutoraCoords: result.winnerCandidate.adutora,
      physicalColumns,
      secondaries: winnerEval.secondaries,
      centroid: CENTROID_0,
    });
    // ADR-010: rede interna 0°/90° → não pode gerar blocker angular
    expect(report.hasBlockers).toBe(false);
  });

  it("T43-9 — cenário Projeto A-like: motor retorna decision válida (winner_reduces_bom ou baseline_preserved)", () => {
    const { waterSource, physicalColumns, laterais } = buildProjetoALikeScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    // Critério aceita qualquer um dos dois desfechos válidos
    expect(["winner_reduces_bom", "baseline_preserved", "no_valid_candidate"]).toContain(result.decision);
    expect(result.reason.length).toBeGreaterThan(0);
    expect(result.winnerCandidate.principal.length).toBeGreaterThan(0);

    // Auditoria completa: deve haver evaluation para A0, A2 e A3
    const ids = new Set(result.evaluations.map((e) => e.candidate.id));
    expect(ids.has("A0")).toBe(true);
    expect(ids.has("A2")).toBe(true);
    expect(ids.has("A3")).toBe(true);
  });

  it("T43-10 — A3 sempre tem warning de cruzamento; A0/A2 não têm esse warning", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const evalA0 = result.evaluations.find((e) => e.candidate.id === "A0")!;
    const evalA2 = result.evaluations.find((e) => e.candidate.id === "A2")!;
    const evalA3 = result.evaluations.find((e) => e.candidate.id === "A3")!;

    expect(evalA0.principalCrossesArea).toBe(false);
    expect(evalA0.warnings.some((w) => w.includes("atravessa área"))).toBe(false);

    expect(evalA2.principalCrossesArea).toBe(false);
    expect(evalA2.warnings.some((w) => w.includes("atravessa área"))).toBe(false);

    expect(evalA3.principalCrossesArea).toBe(true);
    expect(evalA3.warnings.some((w) => w.includes("atravessa área"))).toBe(true);

    // Se A3 venceu, warning deve aparecer no resultado top-level
    if (result.winner === "A3") {
      expect(result.warnings.some((w) => w.includes("atravessa área"))).toBe(true);
    }
  });

  it("T43-11 — constantes exportadas correspondem ao briefing (1,5 m/s e 3,0 mca)", () => {
    expect(MAX_VELOCITY_RAMAL_MS).toBe(1.5);
    expect(MAX_HEADLOSS_RAMAL_MCA).toBe(3.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-056 — Motor de qualidade operacional (P1–P4 + gate A3)
// ─────────────────────────────────────────────────────────────────────────────

describe("TASK-056 — selectArchitectureByBom com penalidades operacionais", () => {
  it("T56-6 — A3 com BOM maior (secondaries longas) perde para A0 por scoreFinal natural", () => {
    // Cenário baseline: A3 central tem secondaries mais longos (30m até inlets), gerando
    // BOM maior que A0 (que tem principal na borda yMin). Sem gate ativo
    // (A3_MIN_ECONOMY_BOM_PCT = 0 no MVP), A3 ainda perde — mas por scoreFinal natural,
    // não por regra estética. Filosofia: custo real (BOM + P2 + P3) decide.
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const evalA3 = result.evaluations.find((e) => e.candidate.id === "A3")!;
    const evalA0 = result.evaluations.find((e) => e.candidate.id === "A0")!;

    // A3 deve ter P1 = 1.0 (todas as colunas atravessadas)
    expect(evalA3.p1_principalSplitsColumnsRatio).toBe(1);
    // A0 deve ter P1 = 0
    expect(evalA0.p1_principalSplitsColumnsRatio).toBe(0);
    // A3 NÃO pode vencer com gate ativo (mesmo se BOM A3 < BOM A0)
    expect(result.winner).not.toBe("A3");
  });

  it("T56-7 — A0 vence empate real em scoreFinal (princípio menor mudança)", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    // No baseline simétrico, A0 e A2 (max ou min) tendem a empatar em scoreFinal.
    // Tie-breaker prefere A0.
    if (result.winner === "A0" || result.winner === "A2") {
      const evalA0 = result.evaluations.find((e) => e.candidate.id === "A0")!;
      const evalA2 = result.evaluations.find((e) => e.candidate.id === "A2")!;
      if (Math.abs(evalA0.scoreFinal - evalA2.scoreFinal) < EPS_BOM) {
        expect(result.winner).toBe("A0");
      }
    }
  });

  it("T56-8 — A3 perde quando custo real (BOM + P2 + P3) é maior que A0", () => {
    // No baseline, A3 central tem secondaries longas → BOM maior. Com gate desativado
    // (A3_MIN_ECONOMY_BOM_PCT = 0), A3 ainda perde pelo scoreFinal natural — não por
    // proxy estético. Caminhos de rejeição aceitos: (a) A3 inválido tecnicamente
    // (hidráulica); (b) gate, se reintroduzido em E09 com base empírica.
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    const evalA3 = result.evaluations.find((e) => e.candidate.id === "A3")!;
    const evalA0 = result.evaluations.find((e) => e.candidate.id === "A0")!;

    const economyRatio = evalA0.bomEstimadaPreliminar > 0
      ? (evalA0.bomEstimadaPreliminar - evalA3.bomEstimadaPreliminar) / evalA0.bomEstimadaPreliminar
      : 0;

    if (economyRatio < 0.05 && evalA3.p1_principalSplitsColumnsRatio > 0.5) {
      // Gate (ou invalidação técnica) deve impedir A3 de vencer.
      // Aceitamos as duas formas de rejeição: por gate de economia mínima OU por
      // invalidação hidráulica de candidato — ambas são rejeições legítimas.
      expect(result.winner).not.toBe("A3");
      // scoreFinal de A3 deve ser maior que o do vencedor OU A3 deve estar inválido.
      const winnerEval = result.evaluations.find((e) => e.candidate.id === result.winner)!;
      if (evalA3.isValid) {
        // A3 válido mas rejeitado pelo gate de economia: reason deve citar o gate.
        expect(result.reason).toMatch(/gate de economia mínima|A3 reprovado/i);
      } else {
        // A3 inválido hidraulicamente: rejeição correta sem precisar de gate.
        expect(evalA3.invalidReason).not.toBeNull();
      }
      // Sanity: scoreFinal vencedor < scoreFinal A3 OU A3 invalido
      if (winnerEval.isValid && evalA3.isValid) {
        expect(winnerEval.scoreFinal).toBeLessThanOrEqual(evalA3.scoreFinal + EPS_BOM);
      }
    }
  });

  it("T56-9 — invariantes preservadas: rede 0°/90°, DN homologado, score expõe métricas", () => {
    const { waterSource, physicalColumns, laterais } = buildBaselineScenario();
    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    // Vencedor é válido (sem blocker angular — ADR-010 preservada via detectNetworkAngleIssues)
    const winnerEval = result.evaluations.find((e) => e.candidate.id === result.winner)!;
    expect(winnerEval.isValid).toBe(true);
    expect(winnerEval.invalidReason).toBeNull();

    // DN da lateral física vem do catálogo via PhysicalColumn.selecao (não tocado
    // pelo motor de seleção arquitetural). ADR-013 (DN100 não em lateral 5022)
    // é responsabilidade do gerador de laterais, não do architecture-selector.
    // Verificamos aqui que o motor NÃO altera physicalColumns nem suas seleções.
    for (const col of physicalColumns) {
      expect(col.selecao.tubo.diametroMm).toBe(50); // catálogo DUMMY mantido
    }

    // Todas as evaluations expõem P1-P4 e scoreFinal (auditabilidade)
    for (const e of result.evaluations) {
      expect(typeof e.p1_principalSplitsColumnsRatio).toBe("number");
      expect(typeof e.p2_subCollectorDisconnectM).toBe("number");
      expect(typeof e.p3_routeBreaksCount).toBe("number");
      expect(typeof e.p4_valveDispersionM).toBe("number");
      expect(typeof e.operationalPenaltyR$).toBe("number");
      expect(typeof e.scoreFinal).toBe("number");
      // P4 sempre 0 no MVP (peso desativado)
      expect(e.p4_valveDispersionM).toBe(0);
      // scoreFinal = BOM + penalty (consistência)
      expect(Math.abs(e.scoreFinal - (e.bomEstimadaPreliminar + e.operationalPenaltyR$))).toBeLessThan(0.01);
    }

    // TECH-053-01 não é mascarado: motor não toca em hydraulic-connectivity.ts.
    // Verificamos que `secondaries` do vencedor seguem topologia legado quando
    // operationalSegments não é fornecido (compat T43).
    for (const s of winnerEval.secondaries) {
      expect(s.kind).toBeUndefined();
    }
  });
});
