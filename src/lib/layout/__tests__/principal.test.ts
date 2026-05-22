import { describe, it, expect } from "vitest";
import { generatePrincipalAndAdutora } from "../principal";
import { generatePhysicalColumns, type PhysicalColumn } from "../laterais";
import type { SelecaoTubo, TuboCandidato } from "../../hydraulics/hazenWilliams";

// Todos os testes usam centroid na origem e lat=0 para simplificar o math.
// Em lat=0: mPerLng = M_PER_DEG_LAT = 111320 m/grau.
// Com gridAngleDegrees=0, frame local = frame geográfico (sem rotação).

const SQ2 = Math.sqrt(2);
const CENTROID_0 = { lng: 0, lat: 0 };

const DUMMY_SELECAO: SelecaoTubo = {
  tubo: { sku: "TEST-50", diametroMm: 50, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  perdaCargaM: 1,
  velocidadeMs: 1,
  perdaCargaPercentual: 0.033,
};

/** Catálogo mínimo para testes de integração que chamam generatePhysicalColumns. */
// Catálogo robusto para testes de agrupamento (TASK-040: split por capacidade
// hidráulica não deve interferir nestes testes — eles validam invariantes
// de agrupamento geométrico, não capacidade do DN).
const TEST_CATALOG: TuboCandidato[] = [
  { sku: "TEST-50",  diametroMm: 50,  diametroInternoMm: 46, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  { sku: "TEST-75",  diametroMm: 75,  diametroInternoMm: 69, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  { sku: "TEST-100", diametroMm: 100, diametroInternoMm: 92, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
];
const TEST_ASPERSOR = { vazao: 1, pressaoServico: 30 };

function makePhysicalColumn(
  startLngLat: [number, number],
  endLngLat: [number, number],
  sectorsTouched: number[] = [],
): PhysicalColumn {
  const idx = 0;
  return {
    id: `col-${startLngLat[0]}-${startLngLat[1]}`,
    columnIndex: idx,
    startLngLat,
    endLngLat,
    comprimentoM: 100,
    sprinklerCount: 2,
    vazaoM3h: 1,
    selecao: DUMMY_SELECAO,
    sectorsTouched,
    sprinklerIndices: [],
    routeCoords: [startLngLat, endLngLat],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

/**
 * Verificador de invariantes §6.
 * principal.length === physicalColumns.length — com PhysicalColumn[] como input não há
 * deduplicação em generatePrincipalAndAdutora: cada coluna física gera exatamente 1 ponto.
 */
function checkInvariants(
  principal: [number, number][],
  adutora: [number, number][],
  physicalColumns: PhysicalColumn[],
  captacao: { lng: number; lat: number },
): void {
  const cap: [number, number] = [captacao.lng, captacao.lat];
  const eps = 1e-9;

  // I1: adutora tem 2 vértices, primeiro é a captação
  expect(adutora).toHaveLength(2);
  expect(adutora[0]).toEqual(cap);

  // I4: adutora[1] é uma das extremidades da principal
  const N = principal.length;
  const connIsP0 =
    Math.abs(adutora[1][0] - principal[0][0]) < eps &&
    Math.abs(adutora[1][1] - principal[0][1]) < eps;
  const connIsPN =
    Math.abs(adutora[1][0] - principal[N - 1][0]) < eps &&
    Math.abs(adutora[1][1] - principal[N - 1][1]) < eps;
  expect(connIsP0 || connIsPN).toBe(true);

  // Cada PhysicalColumn gera exatamente 1 ponto de derivação — sem deduplicação residual
  expect(principal.length).toBe(physicalColumns.length);

  // I3: sem pontos duplicados consecutivos na principal
  for (let i = 1; i < principal.length; i++) {
    const dup =
      Math.abs(principal[i][0] - principal[i - 1][0]) < eps &&
      Math.abs(principal[i][1] - principal[i - 1][1]) < eps;
    expect(dup).toBe(false);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// T1: Projeto retangular alinhado ao norte (gridAngleDegrees=0), captação ao sul
//
// Colunas: 3 colunas a lng = -0.001, 0, +0.001; cada coluna vai de lat=-0.001 a +0.001.
// Em frame local (identidade a 0°): X_local = lng*111320, Y_local = lat*111320.
//   Y_min_global = -111.32 m (= lat -0.001),  Y_max_global = +111.32 m
//   captação Y_local = -1113.2 m < Y_min_global → side="min"
// Derivações: cada coluna conecta em seu Y_min = lat -0.001
// Principal esperada: linha horizontal em lat = -0.001, lngs -0.001, 0, 0.001
// ──────────────────────────────────────────────────────────────────────────────
describe("T1 — 0° grid, captação ao sul", () => {
  const physCols = [
    makePhysicalColumn([-0.001, -0.001], [-0.001,  0.001]),
    makePhysicalColumn([ 0,    -0.001], [ 0,      0.001]),
    makePhysicalColumn([ 0.001,-0.001], [ 0.001,  0.001]),
  ];
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("principal tem 3 vértices — um por coluna física", () => {
    expect(principal).toHaveLength(3);
  });

  it("principal é horizontal na borda inferior das colunas (lat ≈ -0.001)", () => {
    for (const p of principal) {
      expect(p[1]).toBeCloseTo(-0.001, 6);
    }
  });

  it("lngs da principal ordenados de oeste para leste", () => {
    expect(principal[0][0]).toBeCloseTo(-0.001, 6);
    expect(principal[1][0]).toBeCloseTo(0,      6);
    expect(principal[2][0]).toBeCloseTo( 0.001, 6);
  });

  it("adutora parte da captação e chega à extremidade da principal", () => {
    expect(adutora).toHaveLength(2);
    expect(adutora[0]).toEqual([0, -0.01]);
    // equidistante: desempate em d1 (primeiro)
    expect(adutora[1][0]).toBeCloseTo(principal[0][0], 6);
    expect(adutora[1][1]).toBeCloseTo(principal[0][1], 6);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T2: Mesmo projeto, captação deslocada para o sudoeste
// ──────────────────────────────────────────────────────────────────────────────
describe("T2 — 0° grid, captação a sudoeste", () => {
  const physCols = [
    makePhysicalColumn([-0.001, -0.001], [-0.001,  0.001]),
    makePhysicalColumn([ 0,    -0.001], [ 0,      0.001]),
    makePhysicalColumn([ 0.001,-0.001], [ 0.001,  0.001]),
  ];
  const waterSource = { lng: -0.01, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("principal tem 3 vértices", () => {
    expect(principal).toHaveLength(3);
  });

  it("entrada é o canto inferior-esquerdo da principal (captação a SO de D1)", () => {
    expect(adutora[1][0]).toBeCloseTo(principal[0][0], 6);
    expect(adutora[1][1]).toBeCloseTo(principal[0][1], 6);
    expect(Math.abs(adutora[1][0] - principal[2][0])).toBeGreaterThan(0.001);
  });

  it("adutora parte de (-0.01, -0.01)", () => {
    expect(adutora[0]).toEqual([-0.01, -0.01]);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T3: Malha rotacionada 45°, captação a noroeste
// ──────────────────────────────────────────────────────────────────────────────
describe("T3 — 45° grid, captação a noroeste", () => {
  const physCols = [
    // L1: x_local = -111.32, y_local ∈ [-111.32, +111.32]
    makePhysicalColumn(
      [0,              -SQ2 * 0.001],
      [-SQ2 * 0.001,   0],
    ),
    // L2: x_local = 0
    makePhysicalColumn(
      [0.001 / SQ2,  -0.001 / SQ2],
      [-0.001 / SQ2,  0.001 / SQ2],
    ),
    // L3: x_local = +111.32
    makePhysicalColumn(
      [SQ2 * 0.001,   0],
      [0,             SQ2 * 0.001],
    ),
  ];
  const waterSource = { lng: -0.02, lat: 0 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 45,
  );

  it("principal tem 3 vértices", () => {
    expect(principal).toHaveLength(3);
  });

  it("principal corre em diagonal NE-SW (lng e lat crescem de P1 a P3)", () => {
    expect(principal[0][0]).toBeLessThan(principal[1][0]);
    expect(principal[1][0]).toBeLessThan(principal[2][0]);
    expect(principal[0][1]).toBeLessThan(principal[1][1]);
    expect(principal[1][1]).toBeLessThan(principal[2][1]);
  });

  it("extremidade noroeste da principal (P1) fica em (-SQ2*0.001, 0)", () => {
    expect(principal[0][0]).toBeCloseTo(-SQ2 * 0.001, 5);
    expect(principal[0][1]).toBeCloseTo(0,            5);
  });

  it("adutora liga captação NO à extremidade NO da principal", () => {
    expect(adutora[0]).toEqual([-0.02, 0]);
    expect(adutora[1][0]).toBeCloseTo(principal[0][0], 5);
    expect(adutora[1][1]).toBeCloseTo(principal[0][1], 5);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T4: Projeto com 1 coluna física (caso degenerado)
// ──────────────────────────────────────────────────────────────────────────────
describe("T4 — 1 coluna física", () => {
  const physCols = [makePhysicalColumn([0, -0.001], [0, 0.001])];
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("principal tem 1 ponto — sem erro no caso degenerado", () => {
    expect(principal).toHaveLength(1);
  });

  it("adutora tem 2 pontos e liga captação ao único ponto de derivação", () => {
    expect(adutora).toHaveLength(2);
    expect(adutora[0]).toEqual([0, -0.01]);
    expect(adutora[1][0]).toBeCloseTo(0,      6);
    expect(adutora[1][1]).toBeCloseTo(-0.001, 6);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T5: Captação coincide com um ponto de derivação → adutora de comprimento zero
// ──────────────────────────────────────────────────────────────────────────────
describe("T5 — captação coincide com ponto de derivação", () => {
  const physCols = [
    makePhysicalColumn([-0.001, -0.001], [-0.001, 0.001]),
    makePhysicalColumn([ 0.001, -0.001], [ 0.001, 0.001]),
  ];
  const waterSource = { lng: -0.001, lat: -0.001 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("adutora tem comprimento zero (os dois pontos são idênticos)", () => {
    expect(adutora).toHaveLength(2);
    expect(adutora[0][0]).toBeCloseTo(adutora[1][0], 9);
    expect(adutora[0][1]).toBeCloseTo(adutora[1][1], 9);
  });

  it("principal renderiza normalmente com 2 pontos", () => {
    expect(principal).toHaveLength(2);
  });

  it("invariantes I1-I4 passam (adutora com comprimento zero é aceito)", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T6: Projeto com 6 colunas físicas
// ──────────────────────────────────────────────────────────────────────────────
describe("T6 — 6 colunas físicas", () => {
  const lngs: number[] = [-2.5e-3, -1.5e-3, -0.5e-3, 0.5e-3, 1.5e-3, 2.5e-3];
  const physCols = lngs.map((lng) =>
    makePhysicalColumn([lng, -0.001], [lng, 0.001]),
  );
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("principal tem exatamente 6 vértices — um por coluna física", () => {
    expect(principal).toHaveLength(6);
  });

  it("adutora tem exatamente 2 pontos", () => {
    expect(adutora).toHaveLength(2);
  });

  it("nenhum vértice consecutivo da principal é duplicado", () => {
    const eps = 1e-9;
    for (let i = 1; i < principal.length; i++) {
      const dup =
        Math.abs(principal[i][0] - principal[i - 1][0]) < eps &&
        Math.abs(principal[i][1] - principal[i - 1][1]) < eps;
      expect(dup).toBe(false);
    }
  });

  it("todos os vértices têm lat ≈ -0.001 (borda inferior das colunas)", () => {
    for (const p of principal) {
      expect(p[1]).toBeCloseTo(-0.001, 6);
    }
  });

  it("nenhuma camada extra — retorna exatamente { principal, adutora }", () => {
    const result = generatePrincipalAndAdutora(waterSource, physCols, CENTROID_0, 0);
    expect(Object.keys(result).sort()).toEqual(["adutora", "principal"]);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Teste de invariantes: função checkInvariants sobre qualquer projeto
// ──────────────────────────────────────────────────────────────────────────────
describe("checkInvariants — função de validação estrutural", () => {
  it("qualquer resultado satisfaz todas as invariantes (T6 como representativo)", () => {
    const lngs: number[] = [-2.5e-3, -1.5e-3, -0.5e-3, 0.5e-3, 1.5e-3, 2.5e-3];
    const physCols = lngs.map((lng) =>
      makePhysicalColumn([lng, -0.001], [lng, 0.001]),
    );
    const waterSource = { lng: 0, lat: -0.01 };
    const { principal, adutora } = generatePrincipalAndAdutora(
      waterSource, physCols, CENTROID_0, 0,
    );
    checkInvariants(principal, adutora, physCols, waterSource);
  });

  it("adutora[0] é sempre a captação — invariante I1", () => {
    const physCols = [makePhysicalColumn([0, -0.001], [0, 0.001])];
    const waterSource = { lng: -46.5, lat: -12.3 };
    const centroid = { lng: -46.5, lat: -12.2 };
    const { adutora } = generatePrincipalAndAdutora(waterSource, physCols, centroid, 0);
    expect(adutora[0]).toEqual([waterSource.lng, waterSource.lat]);
  });

  it("adutora[1] é sempre uma extremidade da principal — invariante I4", () => {
    const physCols = [
      makePhysicalColumn([-0.001, -0.001], [-0.001, 0.001]),
      makePhysicalColumn([0,     -0.001], [0,      0.001]),
      makePhysicalColumn([0.001, -0.001], [0.001,  0.001]),
    ];
    for (const ws of [
      { lng: 0,    lat: -0.02 },
      { lng: 0,    lat:  0.02 },
      { lng: -0.02, lat: 0   },
    ]) {
      const { principal, adutora } = generatePrincipalAndAdutora(
        ws, physCols, CENTROID_0, 0,
      );
      const N = principal.length;
      const eps = 1e-9;
      const connIsP0 =
        Math.abs(adutora[1][0] - principal[0][0]) < eps &&
        Math.abs(adutora[1][1] - principal[0][1]) < eps;
      const connIsPN =
        Math.abs(adutora[1][0] - principal[N - 1][0]) < eps &&
        Math.abs(adutora[1][1] - principal[N - 1][1]) < eps;
      expect(connIsP0 || connIsPN).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T7: Integração — coluna física não fragmentada por setor
//
// Uma coluna física de 20 aspersores distribuída entre 2 setores (10 cada).
// generatePhysicalColumns deve retornar 1 coluna física (não 2 sub-colunas).
// generatePrincipalAndAdutora com essa 1 coluna deve retornar 1 ponto de derivação.
// ──────────────────────────────────────────────────────────────────────────────
describe("T7 — integração: coluna física não fragmentada por setor", () => {
  const SPACING = 12;
  const lat = SPACING / 111320; // 12 m em graus

  // 1 coluna física (lng=0), 20 aspersores uniformes
  const positions: [number, number][] = Array.from({ length: 20 }, (_, r) => [
    0,
    (r - 9.5) * lat,
  ]);
  // Setor 0: aspersores inferiores (0-9); setor 1: aspersores superiores (10-19)
  const sectorIds = positions.map((_, i) => (i < 10 ? 0 : 1));

  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID_0,
    SPACING,
    TEST_ASPERSOR,
    TEST_CATALOG,
    sectorIds,
  );

  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("generatePhysicalColumns retorna 1 coluna física (não 2 sub-colunas de setor)", () => {
    expect(physCols).toHaveLength(1);
  });

  it("coluna física toca os 2 setores", () => {
    expect(physCols[0].sectorsTouched.sort()).toEqual([0, 1]);
  });

  it("coluna física tem 20 aspersores", () => {
    expect(physCols[0].sprinklerCount).toBe(20);
  });

  it("principal tem 1 ponto de derivação (não 2)", () => {
    expect(principal).toHaveLength(1);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T8: Integração — principal não explode por zigzag em grade com múltiplos setores
//
// Grade 2 colunas × 12 linhas, cada coluna fragmentada em 3 setores.
// Comprimento esperado da principal ≈ distância entre as 2 colunas (~111m).
// Com o bug antigo (sub-laterais por setor): a principal zigzaguearia por
// diferentes Y de cada sub-lateral, inflando o comprimento para >> 200m.
// ──────────────────────────────────────────────────────────────────────────────
describe("T8 — integração: comprimento da principal não explode com múltiplos setores", () => {
  const SPACING = 12;
  const lat = SPACING / 111320;
  const lngStep = 0.001; // ≈ 111m entre colunas

  // 2 colunas × 12 linhas = 24 aspersores
  const positions: [number, number][] = [];
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < 12; r++) {
      positions.push([c * lngStep, (r - 5.5) * lat]);
    }
  }
  // 3 setores: cada 8 aspersores (interleaved por coluna)
  const sectorIds = positions.map((_, i) => Math.floor(i / 8) % 3);

  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID_0,
    SPACING,
    TEST_ASPERSOR,
    TEST_CATALOG,
    sectorIds,
  );

  const waterSource = { lng: 0, lat: -0.01 };
  const { principal } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("2 colunas físicas (não fragmentadas por setor)", () => {
    expect(physCols).toHaveLength(2);
  });

  it("principal tem 2 pontos de derivação", () => {
    expect(principal).toHaveLength(2);
  });

  it("comprimento da principal ≈ 111m (não explode por zigzag)", () => {
    const [p0, p1] = principal;
    const mPerLng = 111320;
    const dx = (p1[0] - p0[0]) * mPerLng;
    const dy = (p1[1] - p0[1]) * 111320;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(80);
    expect(dist).toBeLessThan(200);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T9: Campo irregular — colunas com diferentes yMin (borda sul irregular)
//
// Antes do fix P1: a principal zigzagueava seguindo o yMin de cada coluna.
// Depois do fix: todos os pontos de derivação ficam em principalY = yMinGlobal,
// formando uma linha reta.
// ──────────────────────────────────────────────────────────────────────────────
describe("T9 — campo irregular: principal permanece reta com yMin variável por coluna", () => {
  // 4 colunas com yMin diferentes (borda sul irregular)
  const physCols = [
    makePhysicalColumn([-0.003, -0.001], [-0.003,  0.002]),  // yMin = -0.001
    makePhysicalColumn([-0.001, -0.003], [-0.001,  0.002]),  // yMin = -0.003 (mais ao sul)
    makePhysicalColumn([ 0.001, -0.002], [ 0.001,  0.002]),  // yMin = -0.002
    makePhysicalColumn([ 0.003, -0.001], [ 0.003,  0.002]),  // yMin = -0.001
  ];
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, physCols, CENTROID_0, 0,
  );

  it("principal tem 4 vértices — um por coluna física", () => {
    expect(principal).toHaveLength(4);
  });

  it("todos os vértices da principal ficam em lat ≈ yMinGlobal = -0.003 (linha reta)", () => {
    // yMinGlobal = -0.003 (menor yMin de todas as colunas)
    for (const p of principal) {
      expect(p[1]).toBeCloseTo(-0.003, 5);
    }
  });

  it("nenhum vértice da principal está em lat -0.001 ou -0.002 (não por coluna)", () => {
    for (const p of principal) {
      expect(Math.abs(p[1] - (-0.001))).toBeGreaterThan(1e-5);
      expect(Math.abs(p[1] - (-0.002))).toBeGreaterThan(1e-5);
    }
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, physCols, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T10: Gap-split — coluna física dividida por gap não duplica ponto na principal
//
// Quando um campo tem um obstáculo no meio de uma coluna, generatePhysicalColumns
// divide a coluna em dois segmentos (gap > 1.5 × spacing). Ambos os segmentos
// têm o mesmo xRep → mesmo xLateral. Após P1 fix, ambos gerariam o mesmo ponto
// em (xLateral, principalY). generatePrincipalAndAdutora deve deduplificar e
// retornar apenas 1 ponto de derivação para essa coluna.
// ──────────────────────────────────────────────────────────────────────────────
describe("T10 — gap-split: coluna dividida em 2 segmentos gera 1 ponto na principal", () => {
  // Simula duas PhysicalColumn com o mesmo xLateral (mesmo xRep de gap-split)
  // mas diferentes yMin (segmento inferior e superior).
  // Em degrees, xRep = 0 para ambos, mas yMin difere por ~200m.
  const xLng = 0;
  const lat1 = 0.001; // segment 1: y ∈ [-0.001, 0.001]
  const lat2 = 0.003; // segment 2: y ∈ [0.003, 0.005] — gap de ~0.002° ≈ 222m >> 18m
  const physColsGap = [
    makePhysicalColumn([-0.002, -0.001], [-0.002, 0.001]),
    // Dois segmentos da mesma coluna X=0 (simulando gap-split)
    makePhysicalColumn([xLng, -lat1], [xLng, lat1]),
    makePhysicalColumn([xLng, lat2],  [xLng, lat2 + 0.002]),
    makePhysicalColumn([ 0.002, -0.001], [ 0.002, 0.001]),
  ];
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal } = generatePrincipalAndAdutora(
    waterSource, physColsGap, CENTROID_0, 0,
  );

  it("principal tem 3 pontos (4 physCols com 2 co-localizadas → 3 X únicos)", () => {
    expect(principal).toHaveLength(3);
  });

  it("sem pontos consecutivos duplicados (I3)", () => {
    const eps = 1e-9;
    for (let i = 1; i < principal.length; i++) {
      const dup =
        Math.abs(principal[i][0] - principal[i - 1][0]) < eps &&
        Math.abs(principal[i][1] - principal[i - 1][1]) < eps;
      expect(dup).toBe(false);
    }
  });
});
