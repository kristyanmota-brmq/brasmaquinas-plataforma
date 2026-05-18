import { describe, it, expect } from "vitest";
import { generatePrincipalAndAdutora } from "../principal";
import type { Lateral } from "../laterais";
import type { SelecaoTubo } from "../../hydraulics/hazenWilliams";

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

function makeLateral(
  sectorId: number,
  columnIndex: number,
  startLngLat: [number, number],
  endLngLat: [number, number],
): Lateral {
  return {
    sectorId,
    columnIndex,
    startLngLat,
    endLngLat,
    sprinklerCount: 2,
    comprimentoM: 100,
    vazaoM3h: 1,
    selecao: DUMMY_SELECAO,
    derivacaoLngLat: startLngLat,
  };
}

/**
 * Verificador de invariantes §6: corre sobre o resultado de qualquer projeto.
 * Não verifica lateral.derivacaoLngLat porque em laterais.ts esse campo é sempre
 * startLngLat (extremo Y_min), independentemente do lado escolhido pelo algoritmo.
 */
function checkInvariants(
  principal: [number, number][],
  adutora: [number, number][],
  laterais: Lateral[],
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

  // I3: principal.length == laterais.length (um vértice por lateral)
  expect(principal).toHaveLength(laterais.length);

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
// Laterais: 3 colunas a lng = -0.001, 0, +0.001; cada coluna vai de lat=-0.001 a +0.001.
// Em frame local (identidade a 0°): X_local = lng*111320, Y_local = lat*111320.
//   Y_min_global = -111.32 m (= lat -0.001),  Y_max_global = +111.32 m
//   captação Y_local = -1113.2 m < Y_min_global → side="min"
// Derivações: cada coluna conecta em seu Y_min = lat -0.001
// Principal esperada: linha horizontal em lat = -0.001, lngs -0.001, 0, 0.001
// Adutora esperada: captação → principal[0] (equidistante de [0] e [2], desempate em [0])
// ──────────────────────────────────────────────────────────────────────────────
describe("T1 — 0° grid, captação ao sul", () => {
  const laterais = [
    makeLateral(0, 0, [-0.001, -0.001], [-0.001,  0.001]),
    makeLateral(1, 0, [ 0,    -0.001], [ 0,      0.001]),
    makeLateral(2, 0, [ 0.001,-0.001], [ 0.001,  0.001]),
  ];
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, laterais, CENTROID_0, 0,
  );

  it("principal tem 3 vértices — um por lateral", () => {
    expect(principal).toHaveLength(3);
  });

  it("principal é horizontal na borda inferior das laterais (lat ≈ -0.001)", () => {
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
    checkInvariants(principal, adutora, laterais, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T2: Mesmo projeto, captação deslocada para o sudoeste
//
// waterSource a (-0.01, -0.01): X_local = -1113.2 m < D1.X = -111.32 → entrada em D1
// Principal idêntica ao T1; adutora chega ao canto inferior-esquerdo (D1).
// ──────────────────────────────────────────────────────────────────────────────
describe("T2 — 0° grid, captação a sudoeste", () => {
  const laterais = [
    makeLateral(0, 0, [-0.001, -0.001], [-0.001,  0.001]),
    makeLateral(1, 0, [ 0,    -0.001], [ 0,      0.001]),
    makeLateral(2, 0, [ 0.001,-0.001], [ 0.001,  0.001]),
  ];
  const waterSource = { lng: -0.01, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, laterais, CENTROID_0, 0,
  );

  it("principal tem 3 vértices", () => {
    expect(principal).toHaveLength(3);
  });

  it("entrada é o canto inferior-esquerdo da principal (captação a SO de D1)", () => {
    expect(adutora[1][0]).toBeCloseTo(principal[0][0], 6);
    expect(adutora[1][1]).toBeCloseTo(principal[0][1], 6);
    // e *não* a extremidade direita
    expect(Math.abs(adutora[1][0] - principal[2][0])).toBeGreaterThan(0.001);
  });

  it("adutora parte de (-0.01, -0.01)", () => {
    expect(adutora[0]).toEqual([-0.01, -0.01]);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, laterais, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T3: Malha rotacionada 45°, captação a noroeste
//
// Laterais construídas a partir de coordenadas no frame local 45° convertidas para LngLat.
// Frame local L1: x=-111.32 m, y∈[-111.32, +111.32]
//   startLngLat (y=-111.32) = toLngLat(-111.32, -111.32, 45°) = (0, -SQ2*0.001)
//   endLngLat   (y=+111.32) = toLngLat(-111.32, +111.32, 45°) = (-SQ2*0.001, 0)
// waterSource a (-0.02, 0): X_local = -1574.3 m < D1.X → entrada em D1 (extremo NO)
// Principal corre em diagonal NE-SW: P1=(-SQ2*0.001, 0), P2=(-1/SQ2*0.001, +1/SQ2*0.001),
//   P3=(0, SQ2*0.001)
// ──────────────────────────────────────────────────────────────────────────────
describe("T3 — 45° grid, captação a noroeste", () => {
  const laterais = [
    // L1: x_local = -111.32, y_local ∈ [-111.32, +111.32]
    makeLateral(0, 0,
      [0,              -SQ2 * 0.001],  // startLngLat (y=-111.32)
      [-SQ2 * 0.001,   0],             // endLngLat   (y=+111.32)
    ),
    // L2: x_local = 0, y_local ∈ [-111.32, +111.32]
    makeLateral(1, 0,
      [0.001 / SQ2,  -0.001 / SQ2],   // startLngLat (y=-111.32)
      [-0.001 / SQ2,  0.001 / SQ2],   // endLngLat   (y=+111.32)
    ),
    // L3: x_local = +111.32, y_local ∈ [-111.32, +111.32]
    makeLateral(2, 0,
      [SQ2 * 0.001,   0],              // startLngLat (y=-111.32)
      [0,             SQ2 * 0.001],    // endLngLat   (y=+111.32)
    ),
  ];
  const waterSource = { lng: -0.02, lat: 0 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, laterais, CENTROID_0, 45,
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
    checkInvariants(principal, adutora, laterais, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T4: Projeto com 1 setor e 1 lateral (caso degenerado)
// ──────────────────────────────────────────────────────────────────────────────
describe("T4 — 1 lateral", () => {
  const laterais = [makeLateral(0, 0, [0, -0.001], [0, 0.001])];
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, laterais, CENTROID_0, 0,
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
    checkInvariants(principal, adutora, laterais, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T5: Captação coincide com um ponto de derivação → adutora de comprimento zero
// ──────────────────────────────────────────────────────────────────────────────
describe("T5 — captação coincide com ponto de derivação", () => {
  const laterais = [
    makeLateral(0, 0, [-0.001, -0.001], [-0.001, 0.001]),
    makeLateral(1, 0, [ 0.001, -0.001], [ 0.001, 0.001]),
  ];
  const waterSource = { lng: -0.001, lat: -0.001 }; // = L1.startLngLat
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, laterais, CENTROID_0, 0,
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
    checkInvariants(principal, adutora, laterais, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// T6: Projeto com 6 setores (6 laterais)
// ──────────────────────────────────────────────────────────────────────────────
describe("T6 — 6 setores", () => {
  const lngs: number[] = [-2.5e-3, -1.5e-3, -0.5e-3, 0.5e-3, 1.5e-3, 2.5e-3];
  const laterais = lngs.map((lng, i) =>
    makeLateral(i, 0, [lng, -0.001], [lng, 0.001]),
  );
  const waterSource = { lng: 0, lat: -0.01 };
  const { principal, adutora } = generatePrincipalAndAdutora(
    waterSource, laterais, CENTROID_0, 0,
  );

  it("principal tem exatamente 6 vértices — um por lateral", () => {
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

  it("todos os vértices têm lat ≈ -0.001 (borda inferior das laterais)", () => {
    for (const p of principal) {
      expect(p[1]).toBeCloseTo(-0.001, 6);
    }
  });

  it("nenhuma camada extra — adutora e principal são os únicos dois segmentos (I8)", () => {
    // verifica que a função retorna exatamente { principal, adutora } sem campos extras
    const result = generatePrincipalAndAdutora(waterSource, laterais, CENTROID_0, 0);
    expect(Object.keys(result).sort()).toEqual(["adutora", "principal"]);
  });

  it("invariantes I1-I4 passam", () => {
    checkInvariants(principal, adutora, laterais, waterSource);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Teste de invariantes: função checkInvariants sobre qualquer projeto
// ──────────────────────────────────────────────────────────────────────────────
describe("checkInvariants — função de validação estrutural", () => {
  it("qualquer resultado de generatePrincipalAndAdutora satisfaz todas as invariantes", () => {
    // usa T6 como projeto representativo
    const lngs: number[] = [-2.5e-3, -1.5e-3, -0.5e-3, 0.5e-3, 1.5e-3, 2.5e-3];
    const laterais = lngs.map((lng, i) =>
      makeLateral(i, 0, [lng, -0.001], [lng, 0.001]),
    );
    const waterSource = { lng: 0, lat: -0.01 };
    const { principal, adutora } = generatePrincipalAndAdutora(
      waterSource, laterais, CENTROID_0, 0,
    );
    // não deve lançar
    checkInvariants(principal, adutora, laterais, waterSource);
  });

  it("adutora[0] é sempre a captação — invariante I1", () => {
    const laterais = [makeLateral(0, 0, [0, -0.001], [0, 0.001])];
    const waterSource = { lng: -46.5, lat: -12.3 };
    const centroid = { lng: -46.5, lat: -12.2 };
    const { adutora } = generatePrincipalAndAdutora(waterSource, laterais, centroid, 0);
    expect(adutora[0]).toEqual([waterSource.lng, waterSource.lat]);
  });

  it("adutora[1] é sempre uma extremidade da principal — invariante I4", () => {
    const laterais = [
      makeLateral(0, 0, [-0.001, -0.001], [-0.001, 0.001]),
      makeLateral(1, 0, [0,     -0.001], [0,      0.001]),
      makeLateral(2, 0, [0.001, -0.001], [0.001,  0.001]),
    ];
    for (const ws of [
      { lng: 0,    lat: -0.02 }, // sul
      { lng: 0,    lat:  0.02 }, // norte
      { lng: -0.02, lat: 0   }, // oeste (dentro da faixa Y)
    ]) {
      const { principal, adutora } = generatePrincipalAndAdutora(
        ws, laterais, CENTROID_0, 0,
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
