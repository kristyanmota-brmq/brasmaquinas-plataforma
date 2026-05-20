import { describe, it, expect } from "vitest";
import * as turf from "@turf/turf";
import {
  findBestSprinklerLayout,
  runTopKHydraulicValidation,
  OPTIMIZER_PARAMS,
  type LayoutScore,
} from "@/lib/layout/sprinkler-grid-optimizer";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SPACING = 12; // m
const CENTER_LNG = -46.0;
const CENTER_LAT = -12.0;
const DEG_PER_M_LAT = 1 / 111320;
const DEG_PER_M_LNG = 1 / (111320 * Math.cos((CENTER_LAT * Math.PI) / 180));

function rectPolygon(widthM: number, heightM: number): GeoJSON.Polygon {
  const dLng = (widthM / 2) * DEG_PER_M_LNG;
  const dLat = (heightM / 2) * DEG_PER_M_LAT;
  const ring: [number, number][] = [
    [CENTER_LNG - dLng, CENTER_LAT - dLat],
    [CENTER_LNG + dLng, CENTER_LAT - dLat],
    [CENTER_LNG + dLng, CENTER_LAT + dLat],
    [CENTER_LNG - dLng, CENTER_LAT + dLat],
    [CENTER_LNG - dLng, CENTER_LAT - dLat],
  ];
  return { type: "Polygon", coordinates: [ring] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes estruturais: constantes de calibração pendentes
// ─────────────────────────────────────────────────────────────────────────────

describe("OPTIMIZER_PARAMS — constantes pendentes de calibração", () => {
  it("OPTIMIZER_PARAMS é exportado e contém todos os parâmetros pendentes", () => {
    // Garante que nenhum peso/limite técnico foi incorporado silenciosamente
    // sem documentação. Qualquer novo parâmetro deve aparecer aqui.
    expect(typeof OPTIMIZER_PARAMS.N_MIN_COLUMN).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.N_ANGLE_NEIGHBORS).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.ANGLE_STEP_DEG).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.N_OFFSET_STEPS).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_SHORT_COLUMN).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_EDGE).toBe("number");
  });

  it("espaço de candidatos é limitado (entre 10 e 200)", () => {
    // Verifica que a combinação de ângulos × offsets não explode.
    // 7 ângulos × 4×4 offsets = 112 candidatos no máximo.
    const maxAngles = 2 * OPTIMIZER_PARAMS.N_ANGLE_NEIGHBORS + 1;
    const offsetCombos =
      OPTIMIZER_PARAMS.N_OFFSET_STEPS * OPTIMIZER_PARAMS.N_OFFSET_STEPS;
    const maxCandidates = maxAngles * offsetCombos;

    expect(maxCandidates).toBeGreaterThanOrEqual(10);
    expect(maxCandidates).toBeLessThanOrEqual(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// findBestSprinklerLayout — comportamento geral
// ─────────────────────────────────────────────────────────────────────────────

describe("findBestSprinklerLayout", () => {
  it("retorna pelo menos 1 candidato válido para retângulo 120×60", () => {
    const poly = rectPolygon(120, 60);
    const result = findBestSprinklerLayout(poly, SPACING);

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.best).toBeDefined();
    expect(isFinite(result.best.score.total)).toBe(true);
  });

  it("melhor candidato tem fillingRatio > 0,5", () => {
    // Um campo 120×60 com grade 12×12 deve preencher mais de metade da área teórica.
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);

    expect(best.score.fillingRatio).toBeGreaterThan(0.5);
  });

  it("melhor candidato tem shortColumnRatio < 0,4", () => {
    // A penalidade de colunas curtas deve excluir candidatos muito fragmentados.
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);

    expect(best.score.shortColumnRatio).toBeLessThan(0.4);
  });

  it("score inclui edgeQualityScore e edgePenalty", () => {
    // Verifica que a métrica de borda está presente e é numérica (PENDENTE_CALIBRACAO_RT_CAMPO).
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);
    const sc: LayoutScore = best.score;

    expect(typeof sc.edgeQualityScore).toBe("number");
    expect(typeof sc.edgePenalty).toBe("number");
    expect(sc.edgeQualityScore).toBeGreaterThanOrEqual(0);
    expect(sc.edgeQualityScore).toBeLessThanOrEqual(1);
    expect(sc.edgePenalty).toBeCloseTo(1 - sc.edgeQualityScore, 8);
  });

  it("campos pendentes de setorização e hidráulica permanecem null", () => {
    // Garante que o motor geométrico NÃO preenche métricas que requerem
    // setorização (TASK-010C) ou solver hidráulico.
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);
    const sc: LayoutScore = best.score;

    expect(sc.sectionValveCount).toBeNull();
    expect(sc.fragmentedLateralRatio).toBeNull();
    expect(sc.secondaryLengthM).toBeNull();
    expect(sc.hydraulicBlockers).toBeNull();
  });

  it("posições do melhor candidato estão dentro do polígono", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);

    expect(best.positions.length).toBeGreaterThan(0);

    const polyFeature = turf.polygon(poly.coordinates);
    for (const [lng, lat] of best.positions) {
      expect(turf.booleanPointInPolygon(turf.point([lng, lat]), polyFeature)).toBe(true);
    }
  });

  it("motor é determinístico — mesmo polígono produz o mesmo best", () => {
    // Reprodutibilidade: chamadas repetidas retornam o mesmo candidato.
    const poly = rectPolygon(120, 60);
    const a = findBestSprinklerLayout(poly, SPACING);
    const b = findBestSprinklerLayout(poly, SPACING);

    expect(a.best.angleDegrees).toBe(b.best.angleDegrees);
    expect(a.best.offsetXm).toBe(b.best.offsetXm);
    expect(a.best.offsetYm).toBe(b.best.offsetYm);
    expect(a.best.score.sprinklerCount).toBe(b.best.score.sprinklerCount);
  });

  it("candidatos com offsets distintos têm posições distintas", () => {
    // O motor avalia múltiplos offsets e os candidatos devem ser diferentes entre si.
    const poly = rectPolygon(120, 60);
    const { candidates } = findBestSprinklerLayout(poly, SPACING);

    // Filtra dois candidatos com mesmo ângulo mas offsets diferentes
    const sameAngle = candidates.filter(
      (c) => c.angleDegrees === candidates[0].angleDegrees,
    );

    expect(sameAngle.length).toBeGreaterThan(1);

    // Pelo menos dois deles devem ter contagens de aspersores diferentes,
    // ou posições diferentes — confirma que offset realmente varia a grade.
    const counts = sameAngle.map((c) => c.score.sprinklerCount);
    const hasDifferentCounts = new Set(counts).size > 1;
    const hasDifferentOffsets =
      sameAngle.some(
        (c) => c.offsetXm !== sameAngle[0].offsetXm || c.offsetYm !== sameAngle[0].offsetYm,
      );

    // Um desses dois critérios deve ser verdadeiro.
    expect(hasDifferentCounts || hasDifferentOffsets).toBe(true);
  });

  it("selectionReason contém ângulo, aspersores, fillingRatio e aviso de calibração", () => {
    // O relatório deve ser informativo e incluir o aviso de que não é homologado.
    const poly = rectPolygon(120, 60);
    const { selectionReason, best } = findBestSprinklerLayout(poly, SPACING);

    expect(selectionReason).toBeTruthy();
    expect(selectionReason.length).toBeGreaterThan(50);

    // Deve mencionar o ângulo escolhido.
    expect(selectionReason).toContain(`${best.angleDegrees}°`);

    // Deve mencionar a contagem de aspersores.
    expect(selectionReason).toContain(`${best.score.sprinklerCount}`);

    // Deve conter aviso de calibração pendente.
    expect(selectionReason).toContain("PENDENTE_CALIBRACAO_RT_CAMPO");

    // Deve deixar claro que não é homologado.
    expect(selectionReason).toContain("geometricamente melhor");
    expect(selectionReason).toContain("não homologado");
  });

  it("motor não recebe waterSource e não expõe campos de solver ou BOM", () => {
    // Asserção estrutural: findBestSprinklerLayout recebe apenas polygon + spacingMeters.
    // O resultado não contém campos que seriam produzidos pelo solver ou BOM.
    const poly = rectPolygon(120, 60);

    // A chamada compila sem waterSource — garantido pelo TypeScript.
    // Em runtime, verificamos que o resultado não tem campos do solver.
    const result = findBestSprinklerLayout(poly, SPACING);

    expect("hydraulics" in result).toBe(false);
    expect("bom" in result).toBe(false);
    expect("sectorization" in result).toBe(false);
    expect("waterSource" in result).toBe(false);
    expect("mainPipeline" in result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Métricas operacionais de setorização (TASK-010D)
// ─────────────────────────────────────────────────────────────────────────────

describe("findBestSprinklerLayout — métricas operacionais com nSetores", () => {
  const N_SETORES = 9;

  it("com nSetores válido, sectionValveCount é número (não null)", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, N_SETORES);

    expect(best.score.sectionValveCount).not.toBeNull();
    expect(typeof best.score.sectionValveCount).toBe("number");
  });

  it("com nSetores válido, fragmentedLateralRatio está em [0, 1]", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, N_SETORES);

    expect(best.score.fragmentedLateralRatio).not.toBeNull();
    expect(best.score.fragmentedLateralRatio!).toBeGreaterThanOrEqual(0);
    expect(best.score.fragmentedLateralRatio!).toBeLessThanOrEqual(1);
  });

  it("com nSetores válido, desbalanceamentoPercent >= 0", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, N_SETORES);

    expect(best.score.desbalanceamentoPercent).not.toBeNull();
    expect(best.score.desbalanceamentoPercent!).toBeGreaterThanOrEqual(0);
  });

  it("com nSetores válido, sectionValveCount <= operationalSegmentsCount", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, N_SETORES);
    const sc = best.score;

    expect(sc.sectionValveCount).not.toBeNull();
    expect(sc.operationalSegmentsCount).not.toBeNull();
    expect(sc.sectionValveCount!).toBeLessThanOrEqual(sc.operationalSegmentsCount!);
  });

  it("com nSetores válido, operationalSegmentsCount >= nSetores", () => {
    // Cada setor precisa de pelo menos 1 segmento operacional.
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, N_SETORES);

    expect(best.score.operationalSegmentsCount!).toBeGreaterThanOrEqual(N_SETORES);
  });

  it("sem nSetores, métricas operacionais permanecem null (retrocompatibilidade)", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);
    const sc = best.score;

    expect(sc.sectionValveCount).toBeNull();
    expect(sc.fragmentedLateralRatio).toBeNull();
    expect(sc.operationalSegmentsCount).toBeNull();
    expect(sc.fragmentedColumnCount).toBeNull();
    expect(sc.maxSegmentsPerColumn).toBeNull();
    expect(sc.desbalanceamentoPercent).toBeNull();
  });

  it("nSetores inválido (0) mantém métricas null e não lança exceção", () => {
    const poly = rectPolygon(120, 60);
    expect(() => findBestSprinklerLayout(poly, SPACING, 0)).not.toThrow();
    const { best } = findBestSprinklerLayout(poly, SPACING, 0);

    expect(best.score.sectionValveCount).toBeNull();
    expect(best.score.fragmentedLateralRatio).toBeNull();
  });

  it("nSetores inválido (não inteiro) mantém métricas null e não lança exceção", () => {
    const poly = rectPolygon(120, 60);
    expect(() => findBestSprinklerLayout(poly, SPACING, 2.5)).not.toThrow();
    const { best } = findBestSprinklerLayout(poly, SPACING, 2.5);

    expect(best.score.sectionValveCount).toBeNull();
  });

  it("selectionReason com nSetores menciona registros de seção e fragmentação", () => {
    const poly = rectPolygon(120, 60);
    const { selectionReason } = findBestSprinklerLayout(poly, SPACING, N_SETORES);

    expect(selectionReason).toContain("Registros de seção");
    expect(selectionReason).toContain("Colunas fragmentadas");
    expect(selectionReason).toContain("PENDENTE_CALIBRACAO_RT_CAMPO");
    expect(selectionReason).toContain("não substituem validação hidráulica");
  });

  it("selectionReason sem nSetores menciona jornada pendente", () => {
    const poly = rectPolygon(120, 60);
    const { selectionReason } = findBestSprinklerLayout(poly, SPACING);

    expect(selectionReason).toContain("selecione uma jornada");
  });

  it("OPTIMIZER_PARAMS contém WEIGHT_SECTION_VALVE, WEIGHT_FRAGMENTATION, WEIGHT_IMBALANCE", () => {
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_SECTION_VALVE).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_FRAGMENTATION).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_IMBALANCE).toBe("number");
  });

  it("com nSetores, resultado é determinístico", () => {
    const poly = rectPolygon(120, 60);
    const a = findBestSprinklerLayout(poly, SPACING, N_SETORES);
    const b = findBestSprinklerLayout(poly, SPACING, N_SETORES);

    expect(a.best.angleDegrees).toBe(b.best.angleDegrees);
    expect(a.best.score.sectionValveCount).toBe(b.best.score.sectionValveCount);
    expect(a.best.score.fragmentedLateralRatio).toBe(b.best.score.fragmentedLateralRatio);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Métricas de comprimento de laterais (TASK-010E-A)
// Geométricas puras — NÃO incluem principal, adutora nem ramais até captação.
// Ramais/secundárias dependem de waterSource + principalCoords → TASK-010E-B.
// ─────────────────────────────────────────────────────────────────────────────

describe("findBestSprinklerLayout — métricas de comprimento de laterais", () => {
  it("totalLateralLengthM é número positivo", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);

    expect(typeof best.score.totalLateralLengthM).toBe("number");
    expect(best.score.totalLateralLengthM).toBeGreaterThan(0);
  });

  it("avgLateralLengthM = totalLateralLengthM / physicalColumnCount", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);
    const sc = best.score;

    expect(sc.avgLateralLengthM).toBeCloseTo(
      sc.totalLateralLengthM / sc.physicalColumnCount,
      6,
    );
  });

  it("maxLateralLengthM >= avgLateralLengthM", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);

    expect(best.score.maxLateralLengthM).toBeGreaterThanOrEqual(
      best.score.avgLateralLengthM,
    );
  });

  it("lateralLengthPerSprinklerM = totalLateralLengthM / sprinklerCount", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);
    const sc = best.score;

    expect(sc.lateralLengthPerSprinklerM).toBeCloseTo(
      sc.totalLateralLengthM / sc.sprinklerCount,
      6,
    );
  });

  it("lateralLengthPerHectareM > 0", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);

    expect(best.score.lateralLengthPerHectareM).toBeGreaterThan(0);
  });

  it("polígono maior tem totalLateralLengthM maior", () => {
    // Verifica sensibilidade ao tamanho: área dobrada → mais laterais.
    const small = rectPolygon(60, 60);
    const large = rectPolygon(120, 120);
    const { best: bestSmall } = findBestSprinklerLayout(small, SPACING);
    const { best: bestLarge } = findBestSprinklerLayout(large, SPACING);

    expect(bestLarge.score.totalLateralLengthM).toBeGreaterThan(
      bestSmall.score.totalLateralLengthM,
    );
  });

  it("secondaryLengthM permanece null — ramais requerem waterSource (TASK-010E-B)", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);

    expect(best.score.secondaryLengthM).toBeNull();
  });

  it("selectionReason menciona comprimento de laterais e não inclui ramais", () => {
    const poly = rectPolygon(120, 60);
    const { selectionReason } = findBestSprinklerLayout(poly, SPACING);

    expect(selectionReason).toContain("Comprimento de laterais");
    expect(selectionReason).toContain("Não inclui principal");
    expect(selectionReason).toContain("ramais até captação");
    expect(selectionReason).toContain("PENDENTE_CALIBRACAO_RT_CAMPO");
  });

  it("OPTIMIZER_PARAMS contém WEIGHT_LATERAL_LENGTH documentado como inativo", () => {
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_LATERAL_LENGTH).toBe("number");
    // Inativo nesta tarefa — normalização pendente de calibração.
    expect(OPTIMIZER_PARAMS.WEIGHT_LATERAL_LENGTH).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Métricas de rede de distribuição (TASK-010E-B)
// Requerem waterSource. Comprimentos geométricos preliminares.
// Penalidades: PREMISSA_PROVISORIA_MERCADO
// ─────────────────────────────────────────────────────────────────────────────

// Captação fora do polígono, sul da área irrigada.
const WATER_SOURCE_SOUTH = {
  lng: CENTER_LNG,
  lat: CENTER_LAT - 5 * DEG_PER_M_LAT * 100, // ~500 m ao sul
};
const WATER_SOURCE_NORTH = {
  lng: CENTER_LNG,
  lat: CENTER_LAT + 5 * DEG_PER_M_LAT * 100, // ~500 m ao norte
};

describe("findBestSprinklerLayout — métricas de rede de distribuição", () => {
  it("com waterSource, secondaryLengthM é número >= 0", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, null, WATER_SOURCE_SOUTH);

    expect(best.score.secondaryLengthM).not.toBeNull();
    expect(best.score.secondaryLengthM!).toBeGreaterThanOrEqual(0);
  });

  it("com waterSource, principalLengthM > 0", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, null, WATER_SOURCE_SOUTH);

    expect(best.score.principalLengthM).not.toBeNull();
    expect(best.score.principalLengthM!).toBeGreaterThan(0);
  });

  it("com waterSource, adutoraLengthM >= 0", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, null, WATER_SOURCE_SOUTH);

    expect(best.score.adutoraLengthM).not.toBeNull();
    expect(best.score.adutoraLengthM!).toBeGreaterThanOrEqual(0);
  });

  it("totalNetworkLengthM fecha com a soma das partes", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, null, WATER_SOURCE_SOUTH);
    const sc = best.score;

    expect(sc.totalNetworkLengthM).not.toBeNull();
    const expected =
      sc.totalLateralLengthM
      + sc.principalLengthM!
      + sc.adutoraLengthM!
      + sc.secondaryLengthM!;
    expect(sc.totalNetworkLengthM!).toBeCloseTo(expected, 3);
  });

  it("distributionLengthRatio = (principal + adutora + ramais) / totalLateralLengthM", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING, null, WATER_SOURCE_SOUTH);
    const sc = best.score;

    const expectedRatio =
      (sc.principalLengthM! + sc.adutoraLengthM! + sc.secondaryLengthM!)
      / Math.max(sc.totalLateralLengthM, 1);
    expect(sc.distributionLengthRatio!).toBeCloseTo(expectedRatio, 6);
  });

  it("sem waterSource, métricas de rede ficam null", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);
    const sc = best.score;

    expect(sc.secondaryLengthM).toBeNull();
    expect(sc.principalLengthM).toBeNull();
    expect(sc.adutoraLengthM).toBeNull();
    expect(sc.totalNetworkLengthM).toBeNull();
    expect(sc.avgSecondaryLengthM).toBeNull();
    expect(sc.maxSecondaryLengthM).toBeNull();
    expect(sc.distributionLengthRatio).toBeNull();
  });

  it("score difere entre captação próxima e captação distante", () => {
    // Captação próxima (dentro do polígono) vs. muito distante → adutoraLengthM distintos.
    const poly = rectPolygon(120, 60);
    const wsClose = { lng: CENTER_LNG, lat: CENTER_LAT }; // centroide = distância zero
    const wsFar = WATER_SOURCE_SOUTH; // ~500 m ao sul

    const { best: bestClose } = findBestSprinklerLayout(poly, SPACING, null, wsClose);
    const { best: bestFar } = findBestSprinklerLayout(poly, SPACING, null, wsFar);

    // Captação distante deve ter adutoraLengthM maior.
    expect(bestFar.score.adutoraLengthM!).toBeGreaterThan(bestClose.score.adutoraLengthM!);
    // E score total menor (maior penalidade de rede).
    expect(bestFar.score.total).toBeLessThan(bestClose.score.total);
  });

  it("OPTIMIZER_PARAMS contém WEIGHT_SECONDARY_LENGTH e WEIGHT_TOTAL_NETWORK_LENGTH provisórios", () => {
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_SECONDARY_LENGTH).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_TOTAL_NETWORK_LENGTH).toBe("number");
    // Pesos provisórios ativos — PREMISSA_PROVISORIA_MERCADO.
    expect(OPTIMIZER_PARAMS.WEIGHT_SECONDARY_LENGTH).toBeGreaterThan(0);
    expect(OPTIMIZER_PARAMS.WEIGHT_TOTAL_NETWORK_LENGTH).toBeGreaterThan(0);
  });

  it("selectionReason menciona rede de distribuição quando waterSource fornecido", () => {
    const poly = rectPolygon(120, 60);
    const { selectionReason } = findBestSprinklerLayout(poly, SPACING, null, WATER_SOURCE_SOUTH);

    expect(selectionReason).toContain("Rede de distribuição");
    expect(selectionReason).toContain("Principal");
    expect(selectionReason).toContain("Adutora");
    expect(selectionReason).toContain("Ramais");
    expect(selectionReason).toContain("PREMISSA_PROVISORIA_MERCADO");
  });

  it("selectionReason menciona defina a captação quando waterSource ausente", () => {
    const poly = rectPolygon(120, 60);
    const { selectionReason } = findBestSprinklerLayout(poly, SPACING);

    expect(selectionReason).toContain("defina a captação");
  });

  it("chamadas sem waterSource continuam funcionando (retrocompat)", () => {
    const poly = rectPolygon(120, 60);
    expect(() => findBestSprinklerLayout(poly, SPACING)).not.toThrow();
    expect(() => findBestSprinklerLayout(poly, SPACING, 9)).not.toThrow();
    expect(() => findBestSprinklerLayout(poly, SPACING, null, null)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// runTopKHydraulicValidation — validação hidráulica via solver oficial
// ─────────────────────────────────────────────────────────────────────────────

describe("runTopKHydraulicValidation — validação hidráulica Top K", () => {
  const POLY = rectPolygon(120, 60);
  const WS = WATER_SOURCE_SOUTH;
  const N_SETORES = 3;
  // Bomba adequada: HMT muito alta, vazão muito alta → sem blockers de bomba
  const PUMP_OK = { hmtMca: 500, vazaoMaxM3h: 500 };
  // Bomba insuficiente: vazão mínima → blocker pump_insufficient_flow
  const PUMP_BAD = { hmtMca: 500, vazaoMaxM3h: 0.001 };

  it("sem waterSource → todos os candidatos têm status not_evaluated_missing_waterSource", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: null,
      pump: PUMP_OK,
      nSetores: N_SETORES,
    });
    expect(result.candidates.every(
      (c) => c.score.hydraulicEvaluationStatus === "not_evaluated_missing_waterSource",
    )).toBe(true);
  });

  it("sem pump → todos os candidatos têm status not_evaluated_missing_pump", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: null,
      nSetores: N_SETORES,
    });
    expect(result.candidates.every(
      (c) => c.score.hydraulicEvaluationStatus === "not_evaluated_missing_pump",
    )).toBe(true);
  });

  it("no máximo TOP_K_HYDRAULIC_CANDIDATES candidatos têm avaliação hidráulica", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_OK,
      nSetores: N_SETORES,
    });

    const evaluated = result.candidates.filter(
      (c) => c.score.hydraulicEvaluationStatus !== "not_evaluated_not_in_top_k",
    );
    expect(evaluated.length).toBeLessThanOrEqual(OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES);
  });

  it("candidatos fora do Top K têm status not_evaluated_not_in_top_k", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_OK,
      nSetores: N_SETORES,
    });

    const nonTopK = result.candidates.slice(OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES);
    expect(nonTopK.every(
      (c) => c.score.hydraulicEvaluationStatus === "not_evaluated_not_in_top_k",
    )).toBe(true);
  });

  it("candidato com bomba adequada recebe hydraulicBlockers = [] e status evaluated_no_blockers", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_OK,
      nSetores: N_SETORES,
    });

    // Pelo menos um dos Top K deve ter sido avaliado sem blockers
    const evaluated = result.candidates.slice(0, OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES);
    const noBlockers = evaluated.filter(
      (c) => c.score.hydraulicEvaluationStatus === "evaluated_no_blockers",
    );
    expect(noBlockers.length).toBeGreaterThan(0);
    noBlockers.forEach((c) => {
      expect(c.score.hydraulicBlockers).toEqual([]);
    });
  });

  it("candidato com bomba insuficiente recebe hydraulicBlockers.length > 0 e status evaluated_has_blockers", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_BAD,
      nSetores: N_SETORES,
    });

    const evaluated = result.candidates.slice(0, OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES);
    const hasBlockers = evaluated.filter(
      (c) => c.score.hydraulicEvaluationStatus === "evaluated_has_blockers",
    );
    expect(hasBlockers.length).toBeGreaterThan(0);
    hasBlockers.forEach((c) => {
      expect(c.score.hydraulicBlockers!.length).toBeGreaterThan(0);
    });
  });

  it("candidato com blocker sofre penalidade de score = WEIGHT_HYDRAULIC_BLOCKER", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const originalTopFirst = sel.candidates[0].score.total;

    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_BAD,
      nSetores: N_SETORES,
    });

    const penalized = result.candidates
      .slice(0, OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES)
      .filter((c) => c.score.hydraulicEvaluationStatus === "evaluated_has_blockers");

    expect(penalized.length).toBeGreaterThan(0);
    penalized.forEach((c, i) => {
      // Score original do mesmo índice na seleção preliminar
      const originalScore = sel.candidates
        .find((orig) =>
          orig.angleDegrees === c.angleDegrees &&
          orig.offsetXm === c.offsetXm &&
          orig.offsetYm === c.offsetYm,
        )?.score.total ?? originalTopFirst;
      expect(c.score.total).toBeCloseTo(
        originalScore - OPTIMIZER_PARAMS.WEIGHT_HYDRAULIC_BLOCKER, 6,
      );
    });
  });

  it("hydraulicHmtRequiredMca > 0 quando candidato avaliado pelo solver", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_OK,
      nSetores: N_SETORES,
    });

    const evaluated = result.candidates
      .slice(0, OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES)
      .filter((c) =>
        c.score.hydraulicEvaluationStatus === "evaluated_no_blockers" ||
        c.score.hydraulicEvaluationStatus === "evaluated_has_blockers",
      );

    expect(evaluated.length).toBeGreaterThan(0);
    evaluated.forEach((c) => {
      expect(c.score.hydraulicHmtRequiredMca).not.toBeNull();
      expect(c.score.hydraulicHmtRequiredMca!).toBeGreaterThan(0);
    });
  });

  it("best é sempre um dos candidatos Top K — candidatos não avaliados não podem ser best", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_BAD,  // Todos os Top K sofrem penalidade
      nSetores: N_SETORES,
    });

    // best não deve ter status not_evaluated_not_in_top_k
    expect(result.best.score.hydraulicEvaluationStatus).not.toBe("not_evaluated_not_in_top_k");
  });

  it("selectionReason menciona 'solver oficial' e 'Top K' após validação", () => {
    const sel = findBestSprinklerLayout(POLY, SPACING, N_SETORES, WS);
    const result = runTopKHydraulicValidation(sel, {
      polygon: POLY,
      spacingMeters: SPACING,
      waterSource: WS,
      pump: PUMP_OK,
      nSetores: N_SETORES,
    });

    expect(result.selectionReason).toContain("solver oficial");
    expect(result.selectionReason).toContain("Top K");
  });

  it("função estimateHydraulicBlockers não existe no módulo", async () => {
    const mod = await import("@/lib/layout/sprinkler-grid-optimizer");
    expect("estimateHydraulicBlockers" in mod).toBe(false);
  });

  it("chamadas antigas sem runTopKHydraulicValidation continuam funcionando", () => {
    const poly = rectPolygon(120, 60);
    const { best } = findBestSprinklerLayout(poly, SPACING);
    expect(best.score.hydraulicBlockers).toBeNull();
    expect(best.score.hydraulicEvaluationStatus).toBeNull();
  });

  it("OPTIMIZER_PARAMS contém TOP_K_HYDRAULIC_CANDIDATES e WEIGHT_HYDRAULIC_BLOCKER provisórios", () => {
    expect(typeof OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES).toBe("number");
    expect(typeof OPTIMIZER_PARAMS.WEIGHT_HYDRAULIC_BLOCKER).toBe("number");
    expect(OPTIMIZER_PARAMS.TOP_K_HYDRAULIC_CANDIDATES).toBeGreaterThan(0);
    expect(OPTIMIZER_PARAMS.WEIGHT_HYDRAULIC_BLOCKER).toBeGreaterThan(0);
  });
});
