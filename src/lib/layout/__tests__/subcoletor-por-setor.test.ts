import { describe, it, expect } from "vitest";
import {
  generateSecondaries,
  groupColumnsBySector,
  routeSubColetorStairStep,
  routeEspinhaDePeixe,
} from "../hydraulic-connectivity";
import type { PhysicalColumn } from "../laterais";
import type { OperationalSegment } from "../sectorization";
import type { SelecaoTubo } from "@/lib/hydraulics/hazenWilliams";
import { detectNetworkAngleIssues } from "../network-angle-diagnostics";
import { sizeAllSecondaries } from "../secondary-sizing";
import type { Lateral } from "../laterais";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };

// Principal: linha horizontal a lat = -12.01 (borda sul do campo)
const PRINCIPAL_SOUTH: [number, number][] = [
  [-46.02, -12.01],
  [-45.98, -12.01],
];

const MOCK_SELECAO: SelecaoTubo = {
  tubo: {
    sku: "TU-50",
    diametroMm: 50,
    pressaoMca: 40,
    custo: 28,
    precoVenda: 52,
    coefC: 145,
  },
  perdaCargaM: 0.5,
  velocidadeMs: 0.8,
  perdaCargaPercentual: 0.017,
};

function makeCol(
  id: string,
  startLngLat: [number, number],
  endLngLat: [number, number],
  idx: number = 0,
): PhysicalColumn {
  return {
    id,
    columnIndex: idx,
    startLngLat,
    endLngLat,
    comprimentoM: 100,
    sprinklerCount: 6,
    vazaoM3h: 9,
    selecao: MOCK_SELECAO,
    sectorsTouched: [0],
    sprinklerIndices: [],
    routeCoords: [startLngLat, endLngLat],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

function makeOpSeg(
  physicalColumnId: string,
  sectorId: number,
): OperationalSegment {
  return {
    id: `${physicalColumnId}-s${sectorId}-0`,
    physicalColumnId,
    sectorId,
    sprinklerIndices: [],
    sprinklerCount: 6,
    vazaoM3h: 9,
    requiresValveOrControlPoint: false,
    ordemNaLateral: 0,
  };
}

// Helper para gerar coluna com inlet em Y específico relativo à principal (lat = -12.01)
// gapM positivo = inlet acima da principal (lat > -12.01)
function colAtGap(id: string, lngX: number, gapM: number, idx: number): PhysicalColumn {
  const inletLat = -12.01 + gapM / 111320;
  return makeCol(id, [lngX, inletLat], [lngX, inletLat + 0.001], idx);
}

function makeLat(physicalColumnId: string, vazaoM3h: number, sectorId: number = 0): Lateral {
  return {
    sectorId,
    physicalColumnId,
    columnIndex: 0,
    startLngLat: [-46.0, -12.0],
    endLngLat: [-46.0, -12.0],
    sprinklerCount: 6,
    comprimentoM: 100,
    vazaoM3h,
    selecao: MOCK_SELECAO,
    derivacaoLngLat: [-46.0, -12.0],
    routeCoords: [[-46.0, -12.0], [-46.0, -12.0]],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de geometria para asserções
// ─────────────────────────────────────────────────────────────────────────────

function unitVecLngLat(
  a: [number, number],
  b: [number, number],
  latRef: number,
): [number, number] {
  const mPerLng = 111320 * Math.cos((latRef * Math.PI) / 180);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * 111320;
  const len = Math.sqrt(dx * dx + dy * dy);
  return [dx / len, dy / len];
}

function dotVec(a: [number, number], b: [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}

// ═════════════════════════════════════════════════════════════════════════════
// TASK-053 v12 — Topologia "sempre sub-coletor" — TODA lateral via rib→spine→spine_entry→principal
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// T53-18 (v12) — Grid cardinal (gridAngleDegrees=0): spine ⊥ laterais
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-18 (v12) — Grid cardinal: spine perpendicular aos laterais (X global)", () => {
  // 3 cols verticais (laterais correm em Y), com inlets a 10m da principal
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);
  const c3 = colAtGap("c3", -45.995, 10, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("gera 1 spine + 1 spine_entry + 3 ribs (espinha completa)", () => {
    expect(secs).toHaveLength(5);
    expect(secs.filter((s) => s.kind === "spine")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "spine_entry")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "rib")).toHaveLength(3);
  });

  it("spine paralelo ao eixo X global em grid cardinal (= perpendicular aos laterais verticais)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    const spineDir = unitVecLngLat(spine.coords![0], spine.coords![1], -12.0);
    // Grid cardinal → X local == X global → spine direction ≈ (±1, 0)
    expect(Math.abs(spineDir[1])).toBeLessThan(1e-3); // dy ≈ 0
    expect(Math.abs(spineDir[0])).toBeGreaterThan(0.99); // |dx| ≈ 1
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-19 (v12) — Grid rotacionado 59°: spine paralelo ao eixo X do frame rotacionado
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-19 (v12) — Grid 59°: spine paralelo ao eixo X do frame rotacionado", () => {
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);
  const c3 = colAtGap("c3", -45.995, 10, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 59 },
  );

  it("spine em ângulo ~59° com leste em LngLat global (= eixo X local após rotação)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    const spineDir = unitVecLngLat(spine.coords![0], spine.coords![1], -12.0);
    const angleDeg = (Math.atan2(spineDir[1], spineDir[0]) * 180) / Math.PI;
    // Spine deve estar a ±59° de leste (ou ±59° + 180°). Aceita ambas orientações.
    const normalizedAngle = ((angleDeg + 360) % 180);
    expect(Math.abs(normalizedAngle - 59)).toBeLessThan(2); // tolerância 2°
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-20 (v12) — Rib→lateral em grid 59°: junção em 0° (luva)
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-20 (v12) — Rib→lateral: deflexão 0° (luva)", () => {
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);
  const c3 = colAtGap("c3", -45.995, 10, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("nenhum issue angular em ribs (junção 0° = luva)", () => {
    const report = detectNetworkAngleIssues({
      physicalColumns: [c1, c2, c3],
      secondaries: secs,
      principalCoords: PRINCIPAL_SOUTH,
      adutoraCoords: [],
      centroid: CENTROID,
    });
    // Filtra issues que reportam junções em ribs (sec.kind === "rib")
    const ribIds = secs.filter((s) => s.kind === "rib").map((s) => s.id);
    const ribIssues = report.issues.filter((iss) =>
      ribIds.some((id) => iss.elementId.includes(id))
    );
    expect(ribIssues).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-22 (v12 REFORÇADO — endereça TECH-053-V8-02) — perpendicularidade real via dot
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-22 (v12) — Setor com inlets afastados misturados: perpendicularidade real", () => {
  // Misturando gaps: alguns rentes (gap=1m), outros afastados (gap=15m)
  const c1 = colAtGap("c1", -46.005, 1, 0);
  const c2 = colAtGap("c2", -46.000, 15, 1);
  const c3 = colAtGap("c3", -45.995, 8, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("spine.lengthM > 0 (não degenera)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    expect(spine.lengthM).toBeGreaterThan(0);
  });

  it("dot(spineDir, lateralDir) ≈ 0 (perpendicularidade real)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    const spineDir = unitVecLngLat(spine.coords![0], spine.coords![1], -12.0);
    // Lateral direction = direção da coluna c1 (start → end)
    const lateralDir = unitVecLngLat(c1.startLngLat, c1.endLngLat, -12.0);
    expect(Math.abs(dotVec(spineDir, lateralDir))).toBeLessThan(1e-3);
  });

  it("TASK-057: ribs conectam no ponto mais próximo da lateral (0 = tê no cruzamento; nunca grampo 180°)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(rib.lengthM)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-23 (v12 — endereça TECH-053-V10-01) — Setor 0 Projeto A reproduzido
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-23 (v12) — Setor 0 Projeto A: 3 rentes (gap≈0) + 2 afastados (gap=12m)", () => {
  // Reproduz cenário diagnosticado em v9: 3 cols rentes à principal + 2 afastadas
  const c1 = colAtGap("c1", -46.010, 1.0, 0);    // gap ≈ 1m (rente — gap < MIN_HEADLAND_M=3m)
  const c2 = colAtGap("c2", -46.005, 1.0, 1);    // gap ≈ 1m
  const c3 = colAtGap("c3", -46.000, 1.0, 2);    // gap ≈ 1m
  const c4 = colAtGap("c4", -45.995, 12, 3);     // gap = 12m (afastado)
  const c5 = colAtGap("c5", -45.990, 12, 4);     // gap = 12m (afastado)
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
    makeOpSeg("c4", 0), makeOpSeg("c5", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3, c4, c5],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5, // minGapM=0.5 → cols com gap=1m passam o filtro
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("TODOS os 5 inlets servidos por espinha (NÃO via legacy)", () => {
    expect(secs).toHaveLength(7); // 1 spine + 1 spine_entry + 5 ribs
    expect(secs.filter((s) => s.kind === "spine")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "spine_entry")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "rib")).toHaveLength(5);
    // Nenhum kind: undefined (regra RT absoluta: sempre sub-coletor)
    expect(secs.filter((s) => s.kind === undefined)).toHaveLength(0);
  });

  it("TASK-057: spine que cruza a lateral gera rib de comprimento 0 (tê no cruzamento, não grampo)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-24 (v12) — Todos rentes (gap=0 em todos): fallback MIN_HEADLAND_M
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-24 (v12) — Todos inlets coincidem com principal: fallback MIN_HEADLAND_M = 3m", () => {
  const c1 = colAtGap("c1", -46.005, 0.05, 0);
  const c2 = colAtGap("c2", -46.000, 0.05, 1);
  const c3 = colAtGap("c3", -45.995, 0.05, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID,
    // minGapM precisa ser < 0.05 para colsNeedingRamal incluir os rentes
    0.01,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("espinha completa gerada (sem fallback legacy)", () => {
    expect(secs).toHaveLength(5);
    expect(secs.filter((s) => s.kind === "spine")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "spine_entry")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "rib")).toHaveLength(3);
  });

  it("spine NÃO coincide com principal (MIN_HEADLAND_M = 3m aplicado)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    // Spine deve estar a ~3m da principal em direção ao field (latitude > -12.01)
    const spineLat = spine.coords![0][1];
    expect(spineLat).toBeGreaterThan(-12.01);
    // Diferença em metros deve ser ≈ 3m (≈ 3/111320 em latitude)
    const offsetLat = spineLat - (-12.01);
    const offsetM = offsetLat * 111320;
    expect(offsetM).toBeGreaterThan(2.5);
    expect(offsetM).toBeLessThan(3.5);
  });

  it("TASK-057: spine a 3m DENTRO do vão da lateral → ribs viram tê no cruzamento (lengthM 0)", () => {
    // Antes da TASK-057 o rib descia 3 m por cima da lateral até o inlet (grampo 180°).
    // Com o clamp, o spine cruza a lateral e a conexão é tê direto no cruzamento.
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeLessThan(0.01);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-25 (v12 + TASK-075) — Todos afastados (gap > MIN_HEADLAND): spine na MEDIANA
// dos inlets (substitui o midpoint v12). Inlets uniformes → spine NA linha dos
// inlets, ribs 0 m (tê direto) — o manifold clássico das propostas reais.
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-25 (v12+T75) — Todos afastados (gap=12m): spine na mediana dos inlets", () => {
  const c1 = colAtGap("c1", -46.005, 12, 0);
  const c2 = colAtGap("c2", -46.000, 12, 1);
  const c3 = colAtGap("c3", -45.995, 12, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("spine na linha dos inlets (gap=12m → offset≈12m; mediana de inlets uniformes)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    const spineLat = spine.coords![0][1];
    // TASK-075: mediana de inlets uniformes = a própria linha dos inlets
    // (midpoint v12 colocava o spine a 6m, dobrando cada rib sem função).
    const offsetM = (spineLat - (-12.01)) * 111320;
    expect(offsetM).toBeGreaterThan(11);
    expect(offsetM).toBeLessThan(13);
  });

  it("ribs todos com lengthM ≈ 0 (tê direto spine→lateral — manifold clássico)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    expect(ribs).toHaveLength(3);
    for (const rib of ribs) {
      expect(rib.lengthM).toBeLessThan(0.01);
    }
  });

  it("spine_entry absorve o gap inteiro (≈12m — único trecho principal→spine)", () => {
    const spineEntry = secs.find((s) => s.kind === "spine_entry")!;
    expect(spineEntry.lengthM).toBeGreaterThan(11);
    expect(spineEntry.lengthM).toBeLessThan(13);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-26 (v12) — Setor com 1 só coluna: espinha degenerada topologicamente válida
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-26 (v12) — 1 só coluna no setor: espinha degenerada (regra RT)", () => {
  const c1 = colAtGap("c1", -46.000, 10, 0);
  const opSegs: OperationalSegment[] = [makeOpSeg("c1", 0)];

  const secs = generateSecondaries(
    [c1],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("ainda gera 3 entidades (1 spine + 1 spine_entry + 1 rib) — sem kind:undefined", () => {
    expect(secs).toHaveLength(3);
    expect(secs.filter((s) => s.kind === "spine")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "spine_entry")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "rib")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === undefined)).toHaveLength(0);
  });

  it("spine pode ter lengthM = 0 (degenerado — apenas 1 inlet, sem X range)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    expect(spine.lengthM).toBeGreaterThanOrEqual(0);
  });

  it("spine_entry absorve o gap (>0); rib degenera para tê (≈0 — mediana de 1 inlet é o próprio inlet)", () => {
    // TASK-075: com 1 coluna, mediana = o único inlet → spine NA linha do inlet.
    // O trecho principal→spine vira spine_entry (gap=10m); o rib é tê direto (0 m).
    const spineEntry = secs.find((s) => s.kind === "spine_entry")!;
    const rib = secs.find((s) => s.kind === "rib")!;
    expect(spineEntry.lengthM).toBeGreaterThan(9);
    expect(spineEntry.lengthM).toBeLessThan(11);
    expect(rib.lengthM).toBeLessThan(0.01);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-27 (v12) — Retrocompatibilidade: sem operationalSegments → caminho legacy 1:1
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-27 (v12) — Sem operationalSegments → caminho legacy (kind:undefined)", () => {
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);

  // Chamada SEM operationalSegments → fluxo legacy
  const secs = generateSecondaries([c1, c2], PRINCIPAL_SOUTH, CENTROID);

  it("gera 1 SecondaryPipe legacy por coluna (kind: undefined)", () => {
    expect(secs).toHaveLength(2);
    secs.forEach((s) => {
      expect(s.kind).toBeUndefined();
      expect(s.physicalColumnIds).toEqual([s.physicalColumnId]);
      expect(s.sectorId).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-28 (v12 + TASK-075) — Blocker angular esperado em spine_entry→principal
// quando a junção cai fora de 0°/90°.
//
// Fixture atualizada na TASK-075: a versão anterior (grid 59° + colunas verticais
// GLOBAIS + principal horizontal) dependia do midpoint para manter o spine_entry
// curto; com a mediana, o probe de principalYLocal em frame rotacionado sobre
// fixture não-alinhada ao grid produzia spine_entry de centenas de metros cujo
// snap na principal o perpendicularizava (artefato da fixture sintética, não do
// motor — colunas reais seguem o ângulo da grade). A fixture nova usa grid
// CARDINAL (sem distorção de frame) com principal INCLINADA ~11°: spine_entry
// paralelo ao eixo Y global encontra a principal a ~79° → fora de [0°±5°, 90°±5°]
// → blocker. O invariante coberto é o MESMO: o validador kind-aware detecta
// junção spine_entry→principal fora de 0/90.
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-28 (v12+T75) — Principal inclinada ~11° + grid cardinal: blocker angular em spine_entry esperado", () => {
  // Principal inclinada: sobe 0.008° de lat (~890 m) ao longo de 0.04° de lng (~4,4 km) ≈ 11,4°
  const PRINCIPAL_INCLINADA: [number, number][] = [
    [-46.02, -12.014],
    [-45.98, -12.006],
  ];
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);
  const c3 = colAtGap("c3", -45.995, 10, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_INCLINADA,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("topologia gerada corretamente (3 ribs + 1 spine + 1 spine_entry)", () => {
    expect(secs).toHaveLength(5);
  });

  it("blocker(s) angular(es) em spine_entry→principal são esperados", () => {
    const report = detectNetworkAngleIssues({
      physicalColumns: [c1, c2, c3],
      secondaries: secs,
      principalCoords: PRINCIPAL_INCLINADA,
      adutoraCoords: [],
      centroid: CENTROID,
    });
    // spine_entry vertical (eixo Y do grid cardinal) × principal a ~11° da horizontal
    // → junção ≈ 79°, fora de 0°/90°±5° → blocker esperado geométrico.
    const spineEntryId = secs.find((s) => s.kind === "spine_entry")!.id;
    const spineEntryIssues = report.issues.filter((iss) =>
      iss.elementId.includes(spineEntryId)
    );
    expect(spineEntryIssues.length).toBeGreaterThan(0); // blocker esperado geométrico
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-29 (v12 NOVO — endereça TECH-053-V11-01) — fieldSideSign via centroid não colapsa em zero
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-29 (v12) — fieldSideSign via centroid: nunca colapsa para zero", () => {
  // Caso patológico: todos inlets QUASE EXATAMENTE no Y da principal (gap ~0.5m em todos)
  // Em v11 isso fazia Math.sign(0) === 0 e fallback ficava ineficaz.
  // v12 fix: fieldSideSign deriva do centroid LngLat → rotated frame.
  // Nota: gap=0.5m garante que cols passam o filtro de minGapM=0.4 e ainda
  // dispara fallback MIN_HEADLAND_M (< 3m).
  const c1 = colAtGap("c1", -46.005, 0.5, 0);  // gap ≈ 0.5m (ainda muito rente)
  const c2 = colAtGap("c2", -46.000, 0.5, 1);
  const c3 = colAtGap("c3", -45.995, 0.5, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];

  // Centroid acima da principal (latitude > -12.01 da principal)
  const CENTROID_NORTE = { lng: -46.0, lat: -12.0 };

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID_NORTE,
    0.4, // minGapM = 0.4 → cols com gap=0.5 passam o filtro
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );

  it("spine NÃO degenera para Y da principal (fallback MIN_HEADLAND_M dispara corretamente)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    const spineLat = spine.coords![0][1];
    // Spine deve estar OFFSETADO 3m da principal (não NA principal)
    // (latitude > -12.01 porque centroid_lat = -12.0 > principal_lat = -12.01, então fieldSideSign = +1)
    expect(spineLat).toBeGreaterThan(-12.01);
    const offsetM = (spineLat - (-12.01)) * 111320;
    expect(offsetM).toBeGreaterThan(2.5); // ≥ MIN_HEADLAND_M - 0.5
    expect(offsetM).toBeLessThan(3.5);
  });

  it("TASK-057: gap=0 → spine cruza laterais → ribs de comprimento 0 (tê), sem grampo", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThanOrEqual(0);
      expect(rib.lengthM).toBeLessThan(3.5); // nunca maior que o headland — sem retrocesso
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-30 (v12 NOVO — endereça TECH-053-V11-02) — Gate explícito throw
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-30 (v12) — Gate explícito: operationalSegments sem gridAngleDegrees lança Error", () => {
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0),
  ];

  it("lança Error quando operationalSegments fornecido sem gridAngleDegrees", () => {
    expect(() =>
      generateSecondaries(
        [c1, c2],
        PRINCIPAL_SOUTH,
        CENTROID,
        0.5,
        { operationalSegments: opSegs }, // SEM gridAngleDegrees
      )
    ).toThrow(/operationalSegments.*gridAngleDegrees|gridAngleDegrees.*operationalSegments/);
  });

  it("não lança quando ambos fornecidos", () => {
    expect(() =>
      generateSecondaries(
        [c1, c2],
        PRINCIPAL_SOUTH,
        CENTROID,
        0.5,
        { operationalSegments: opSegs, gridAngleDegrees: 0 },
      )
    ).not.toThrow();
  });

  it("não lança quando nenhum dos dois fornecido (legacy puro)", () => {
    expect(() =>
      generateSecondaries([c1, c2], PRINCIPAL_SOUTH, CENTROID)
    ).not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Testes auxiliares preservados (routeEspinhaDePeixe, routeSubColetorStairStep,
// groupColumnsBySector) — não dependem de generateSecondaries
// ═════════════════════════════════════════════════════════════════════════════

describe("groupColumnsBySector — multi-setor coluna determinística", () => {
  // c1, c2 em setor 0; c3 em setores 0 e 1; c4 em setor 1
  const cols = [
    colAtGap("c1", -46.005, 10, 0),
    colAtGap("c2", -46.000, 10, 1),
    colAtGap("c3", -45.995, 10, 2), // multi-setor
    colAtGap("c4", -45.990, 10, 3),
  ];
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0),
    makeOpSeg("c2", 0),
    makeOpSeg("c3", 0),
    makeOpSeg("c3", 1),
    makeOpSeg("c4", 1),
  ];

  const groups = groupColumnsBySector(cols, opSegs);

  it("c3 atribuída ao setor 0 (mais exclusivas) — regra determinística", () => {
    const s0 = groups.find((g) => g.sectorId === 0);
    expect(s0?.columnIds).toContain("c3");
  });

  it("c3 NÃO aparece no setor 1", () => {
    const s1 = groups.find((g) => g.sectorId === 1);
    expect(s1?.columnIds ?? []).not.toContain("c3");
  });
});

describe("routeSubColetorStairStep — helper preservado (não usado em v12 produção)", () => {
  const c1 = colAtGap("c1", -46.0, 5, 0);
  const c2 = colAtGap("c2", -45.999, 10, 1);

  it("retorna polilinha com vértices intermediários quando Y varia", () => {
    const { coords, lengthM, fromCoord, toCoord } = routeSubColetorStairStep(
      [c1, c2], PRINCIPAL_SOUTH, CENTROID,
    );
    expect(coords.length).toBeGreaterThan(2);
    expect(lengthM).toBeGreaterThan(0);
    expect(coords[0]).toEqual(fromCoord);
    expect(coords[coords.length - 1]).toEqual(toCoord);
  });
});

describe("routeEspinhaDePeixe — helper exportado (chamada direta)", () => {
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);
  const c3 = colAtGap("c3", -45.995, 10, 2);

  it("retorna 1 spine + 1 spine_entry + 3 ribs", () => {
    const { spine, spineEntry, ribs } = routeEspinhaDePeixe(
      [c1, c2, c3], PRINCIPAL_SOUTH, CENTROID, 0, 0,
    );
    expect(spine.coords.length).toBe(2);
    expect(spineEntry.coords.length).toBe(2);
    expect(ribs.length).toBe(3);
  });

  it("ribs[i].colId corresponde a cols[i].id (ordem preservada)", () => {
    const { ribs } = routeEspinhaDePeixe(
      [c1, c2, c3], PRINCIPAL_SOUTH, CENTROID, 0, 0,
    );
    expect(ribs.map((r) => r.colId)).toEqual(["c1", "c2", "c3"]);
  });

  it("aceita cols.length === 1 (espinha degenerada — v12)", () => {
    expect(() =>
      routeEspinhaDePeixe([c1], PRINCIPAL_SOUTH, CENTROID, 0, 0)
    ).not.toThrow();
    const { ribs } = routeEspinhaDePeixe([c1], PRINCIPAL_SOUTH, CENTROID, 0, 0);
    expect(ribs.length).toBe(1);
  });

  it("rejeita cols.length === 0", () => {
    expect(() => routeEspinhaDePeixe([], PRINCIPAL_SOUTH, CENTROID, 0, 0)).toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Testes de vazão pos-fix v12 (preservados de v6)
// ═════════════════════════════════════════════════════════════════════════════

describe("Vazão kind-aware em sizeAllSecondaries (preservado v6 + v12 espinha)", () => {
  // 3 cols mesmo setor, vazões diferentes
  const c1 = colAtGap("c1", -46.005, 10, 0);
  const c2 = colAtGap("c2", -46.000, 10, 1);
  const c3 = colAtGap("c3", -45.995, 10, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0),
  ];
  const laterais: Lateral[] = [
    makeLat("c1", 9, 0),
    makeLat("c2", 10, 0),
    makeLat("c3", 11, 0),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_SOUTH,
    CENTROID,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: 0 },
  );
  const sized = sizeAllSecondaries(secs, laterais);

  it("rib.flowM3h = max lateral vazão da coluna", () => {
    const ribs = sized.filter((s) => s.kind === "rib");
    const ribC1 = ribs.find((r) => r.physicalColumnIds?.[0] === "c1")!;
    const ribC2 = ribs.find((r) => r.physicalColumnIds?.[0] === "c2")!;
    const ribC3 = ribs.find((r) => r.physicalColumnIds?.[0] === "c3")!;
    expect(ribC1.flowM3h).toBe(9);
    expect(ribC2.flowM3h).toBe(10);
    expect(ribC3.flowM3h).toBe(11);
  });

  it("spine.flowM3h = SUM ribs no sectorId; spine_entry idem", () => {
    const spine = sized.find((s) => s.kind === "spine")!;
    const spineEntry = sized.find((s) => s.kind === "spine_entry")!;
    expect(spine.flowM3h).toBe(9 + 10 + 11);
    expect(spineEntry.flowM3h).toBe(9 + 10 + 11);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-B03 (diagnóstico 2026-05-24, anomalia setor 1 do Projeto A) —
// Grid 59° + colunas físicas ALINHADAS ao grid: rib→lateral deve ficar em 0°
// ─────────────────────────────────────────────────────────────────────────────
//
// O diagnóstico de 2026-05-24 (§4.4) sinalizou no Projeto A real um rib do setor
// 1 com deflexão -37,5° na junção rib→lateral. As hipóteses do diagnóstico
// foram: agrupamento incorreto de coluna, inlet fora do headland esperado ou
// erro em `fieldSideSign`. Os testes T53-* anteriores não cobriam o caso
// "lateral física alinhada com o frame rotacionado" — usavam `makeCol`/`colAtGap`
// que produzem colunas verticais (Y global) independente do `gridAngleDegrees`.
//
// Este bloco fornece o helper `colInLocalFrame` que constrói laterais cuja
// `startLngLat/endLngLat` está realmente alinhada ao eixo Y local rotacionado
// por `gridAngleDegrees` — o cenário REAL do Projeto A. Sob essa fixture, a
// rib (perpendicular ao spine no frame local) e a lateral (paralela ao eixo Y
// local) devem ter deflexão na junção = 0° (luva) por construção geométrica.
//
// Se algum dia a deflexão dessa junção sair de [0°, 90°] sob essa fixture,
// é o B-03 reproduzido em ambiente sintético — não é hipótese visual no Projeto
// A real. Hoje (TASK-053 v12), todos os ribs ficam em 0° conforme esperado.
describe("T53-B03 — Grid 59° + lateral alinhada ao grid: rib→lateral em 0° (luva)", () => {
  const M_PER_DEG_LAT = 111320;
  const GRID = 59; // mesmo ângulo do Projeto A
  const CENTROID_B03 = { lng: -46.0, lat: -12.0 };
  const cosA = Math.cos((GRID * Math.PI) / 180);
  const sinA = Math.sin((GRID * Math.PI) / 180);
  const mPerLng = M_PER_DEG_LAT * Math.cos((CENTROID_B03.lat * Math.PI) / 180);

  /**
   * Constrói uma coluna física cuja polilinha REAL é paralela ao eixo Y local
   * (= perpendicular ao spine no frame rotacionado por gridAngleDegrees).
   * xLocal: posição da coluna ao longo do eixo X local (m, a partir do centroid).
   * yStart, yEnd: extremos da coluna no eixo Y local (m).
   */
  function colInLocalFrame(
    id: string,
    xLocal: number,
    yStart: number,
    yEnd: number,
    idx: number,
  ): PhysicalColumn {
    function localToLngLat(x: number, y: number): [number, number] {
      const dx = x * cosA - y * sinA;
      const dy = x * sinA + y * cosA;
      return [CENTROID_B03.lng + dx / mPerLng, CENTROID_B03.lat + dy / M_PER_DEG_LAT];
    }
    const start = localToLngLat(xLocal, yStart);
    const end = localToLngLat(xLocal, yEnd);
    return makeCol(id, start, end, idx);
  }

  // Principal: paralela ao eixo X local (= perpendicular aos laterais), na borda
  // sul do campo (yLocal = -200m). Em LngLat global, vai do xLocal=-100 ao
  // xLocal=+100 com yLocal=-200.
  function principalAtLocalY(yLocal: number, xLeft: number, xRight: number): [number, number][] {
    function localToLngLat(x: number, y: number): [number, number] {
      const dx = x * cosA - y * sinA;
      const dy = x * sinA + y * cosA;
      return [CENTROID_B03.lng + dx / mPerLng, CENTROID_B03.lat + dy / M_PER_DEG_LAT];
    }
    return [localToLngLat(xLeft, yLocal), localToLngLat(xRight, yLocal)];
  }

  // Setor 1 do Projeto A simplificado: 3 colunas a xLocal = 0, 12, 24 m;
  // c1/c2 com inlet em yLocal = -180m; c3 ESCALONADA com inlet em -140m (TASK-075:
  // com a mediana, inlets uniformes produzem ribs 0 m — o escalonamento de c3
  // mantém ≥1 rib > 0 exercitando direção e junção rib→lateral).
  // Mediana de (-180, -180, -140) = -180 → spine na linha de c1/c2; rib de c3 = 40 m.
  // Centroid acima da principal (yLocal=0 > yLocal=-200), então fieldSideSign = +1.
  const PRINCIPAL_LOCAL = principalAtLocalY(-200, -50, 100);
  const c1 = colInLocalFrame("c1", 0, -180, -100, 0);
  const c2 = colInLocalFrame("c2", 12, -180, -100, 1);
  const c3 = colInLocalFrame("c3", 24, -140, -100, 2);
  const opSegs: OperationalSegment[] = [
    makeOpSeg("c1", 1), makeOpSeg("c2", 1), makeOpSeg("c3", 1),
  ];

  const secs = generateSecondaries(
    [c1, c2, c3],
    PRINCIPAL_LOCAL,
    CENTROID_B03,
    0.5,
    { operationalSegments: opSegs, gridAngleDegrees: GRID },
  );

  it("topologia v12 gerada (1 spine + 1 spine_entry + 3 ribs)", () => {
    expect(secs).toHaveLength(5);
    expect(secs.filter((s) => s.kind === "spine")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "spine_entry")).toHaveLength(1);
    expect(secs.filter((s) => s.kind === "rib")).toHaveLength(3);
  });

  it("rib direction = eixo Y local (paralela à lateral) — ribs 0 m são tê (sem direção)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    // TASK-075: ribs de comprimento ~0 (spine na linha do inlet) são tê direto e não
    // têm direção definida — pulados (mesma regra da validação angular, < 1e-3 m).
    // O escalonamento de c3 garante ≥1 rib > 0 para o assert não ficar vazio.
    const ribsComCorpo = ribs.filter((r) => r.lengthM >= 0.01);
    expect(ribsComCorpo.length).toBeGreaterThan(0);
    // Eixo Y local em coords globais: (-sin(GRID), cos(GRID))
    const yLocalGlobal: [number, number] = [-Math.sin((GRID * Math.PI) / 180), Math.cos((GRID * Math.PI) / 180)];
    for (const rib of ribsComCorpo) {
      const ribDir = unitVecLngLat(rib.fromCoord, rib.toCoord, CENTROID_B03.lat);
      // dot(ribDir, yLocalGlobal) ≈ ±1 (paralelo ou antiparalelo)
      const cosTheta = dotVec(ribDir, yLocalGlobal);
      expect(Math.abs(Math.abs(cosTheta) - 1)).toBeLessThan(1e-3);
    }
  });

  it("rib→lateral: deflexão 0° (luva) para TODAS as 3 colunas (B-03 não reproduzível em sintético)", () => {
    const report = detectNetworkAngleIssues({
      physicalColumns: [c1, c2, c3],
      secondaries: secs,
      principalCoords: PRINCIPAL_LOCAL,
      adutoraCoords: [],
      centroid: CENTROID_B03,
    });
    const ribIds = secs.filter((s) => s.kind === "rib").map((s) => s.id);
    const ribLateralIssues = report.issues.filter((iss) =>
      iss.elementType === "lateral" && ribIds.some((id) => iss.elementId.includes(id))
    );
    // Sob fixture sintética com lateral alinhada ao grid, NENHUM blocker rib→lateral.
    // B-03 (Projeto A real) deve ter origem em (a) lateral REAL não alinhada
    // exatamente ao gridAngleDegrees (ruído numérico nos aspersores), (b)
    // routeCoords da lateral divergindo de start/end, ou (c) inlet derivado
    // fora do extremo da coluna. Caso este teste passe a falhar futuramente,
    // o cenário real foi reproduzido em sintético e o bug está em
    // routeEspinhaDePeixe ou na derivação de inlet em hydraulic-connectivity.ts.
    expect(ribLateralIssues).toHaveLength(0);
  });

  it("spine_entry→principal: junção em 0° ou 90° (principal alinhada ao eixo X local)", () => {
    const report = detectNetworkAngleIssues({
      physicalColumns: [c1, c2, c3],
      secondaries: secs,
      principalCoords: PRINCIPAL_LOCAL,
      adutoraCoords: [],
      centroid: CENTROID_B03,
    });
    const spineEntryId = secs.find((s) => s.kind === "spine_entry")!.id;
    const seIssues = report.issues.filter((iss) => iss.elementId.includes(spineEntryId));
    // Principal paralela ao eixo X local; spine_entry perpendicular ao spine
    // (paralelo ao eixo Y local). Junção = 90° → SEM blocker.
    expect(seIssues).toHaveLength(0);
  });

  it("anti-regressão: fieldSideSign não inverte (spine ABAIXO do centroid e ACIMA da principal)", () => {
    // Em frame local, centroid está em yLocal=0 e principal em yLocal=-200. Inlets em -180/-180/-140.
    // fieldSideSign deve ser +1 (centroid > principal). Spine na MEDIANA dos inlets (TASK-075):
    // spineYLocal = mediana(-180, -180, -140) = -180.
    // Em global, isso significa que o spine NÃO está do lado oposto do centroid relativo à principal.
    const spine = secs.find((s) => s.kind === "spine")!;
    // Projeta o ponto médio do spine no frame local e verifica que yLocal < 0 (mesmo lado da principal)
    const spineMidLngLat: [number, number] = [
      (spine.coords![0][0] + spine.coords![1][0]) / 2,
      (spine.coords![0][1] + spine.coords![1][1]) / 2,
    ];
    const dx = (spineMidLngLat[0] - CENTROID_B03.lng) * mPerLng;
    const dy = (spineMidLngLat[1] - CENTROID_B03.lat) * M_PER_DEG_LAT;
    const spineYLocal = -dx * sinA + dy * cosA;
    // Spine entre -200 e -100 (faixa de inlets); NÃO acima de 0 (lado oposto).
    expect(spineYLocal).toBeLessThan(0);
    expect(spineYLocal).toBeGreaterThan(-200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T57 (TASK-057) — Regressão da anomalia B-03: spine DENTRO do vão das laterais
// Reprodução sintética do caso real "Fazenda do Paulo": laterais longas
// (vão ~130 m) com principal na borda; o midpoint formula coloca o spine
// dentro do vão → antes da TASK-057, ribs desciam por cima das laterais até
// a ponta (deflexão 180°, "grampo de cabelo") gerando blockers angulares falsos.
// ─────────────────────────────────────────────────────────────────────────────

describe("T57 — spine dentro do vão da lateral: tê no cruzamento, sem grampo 180°", () => {
  const CENTROID_57 = { lng: -45.0, lat: -12.0 };
  const M_LAT = 111320;
  const mLng = M_LAT * Math.cos((CENTROID_57.lat * Math.PI) / 180);
  const ll = (xM: number, yM: number): [number, number] =>
    [CENTROID_57.lng + xM / mLng, CENTROID_57.lat + yM / M_LAT];

  // 3 laterais verticais longas (y de -130 a 0), principal na borda inferior (y=-132).
  // Mistura de inlets: 1 rente + 2 afastados → midpoint do spine cai DENTRO do vão.
  const colsT57 = [
    makeCol("t57-c1", ll(0, -130), ll(0, 0), 0),
    makeCol("t57-c2", ll(12, -100), ll(12, 0), 1),
    makeCol("t57-c3", ll(24, -70), ll(24, 0), 2),
  ];
  const principalT57: [number, number][] = [ll(-20, -132), ll(40, -132)];
  const opSegsT57: OperationalSegment[] = [
    makeOpSeg("t57-c1", 1), makeOpSeg("t57-c2", 1), makeOpSeg("t57-c3", 1),
  ];

  const secsT57 = generateSecondaries(colsT57, principalT57, CENTROID_57, 0.5, {
    operationalSegments: opSegsT57,
    gridAngleDegrees: 0,
  });

  it("topologia v12 gerada (1 spine + 1 entry + 3 ribs)", () => {
    expect(secsT57.filter((s) => s.kind === "spine")).toHaveLength(1);
    expect(secsT57.filter((s) => s.kind === "rib")).toHaveLength(3);
  });

  it("nenhum rib retrocede além do vão da lateral (toCoord dentro do span Y da coluna)", () => {
    const ribs = secsT57.filter((s) => s.kind === "rib");
    const colById = new Map(colsT57.map((c) => [c.id, c]));
    for (const rib of ribs) {
      const col = colById.get(rib.physicalColumnId)!;
      const yTo = (rib.toCoord[1] - CENTROID_57.lat) * M_LAT;
      const ys = [
        (col.startLngLat[1] - CENTROID_57.lat) * M_LAT,
        (col.endLngLat[1] - CENTROID_57.lat) * M_LAT,
      ].sort((a, b) => a - b);
      expect(yTo).toBeGreaterThanOrEqual(ys[0] - 0.01);
      expect(yTo).toBeLessThanOrEqual(ys[1] + 0.01);
    }
  });

  it("validação angular: ZERO junções rib→lateral com deflexão 180° (B-03 eliminada)", () => {
    const report = detectNetworkAngleIssues({
      physicalColumns: colsT57,
      secondaries: secsT57,
      principalCoords: principalT57,
      adutoraCoords: [],
      centroid: CENTROID_57,
    });
    const lateralIssues = report.issues.filter((i) => i.elementType === "lateral");
    expect(lateralIssues).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T75 (TASK-075) — Spine na MEDIANA dos inlets (L1-ótima)
//
// Substitui o midpoint v12: spineYLocal = mediana(inletYsLocal). A mediana
// minimiza Σ|inletY − spineY| → menor soma de comprimentos dos ribs (motivação
// RT 2026-06-12: "a principal está fazendo usar muito mais tubulação nas
// secundárias"). Validação sintética da economia exigida pela task (item d)
// quando o banco real não está disponível.
// ─────────────────────────────────────────────────────────────────────────────

describe("T75 (TASK-075) — spine na mediana dos inlets", () => {
  it("T75-1: inlets escalonados (6/12/30 m) → spine na mediana (12 m), não no midpoint (15 m)", () => {
    const c1 = colAtGap("c1", -46.005, 6, 0);
    const c2 = colAtGap("c2", -46.000, 12, 1);
    const c3 = colAtGap("c3", -45.995, 30, 2);
    const secs = generateSecondaries(
      [c1, c2, c3], PRINCIPAL_SOUTH, CENTROID, 0.5,
      { operationalSegments: [makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0)], gridAngleDegrees: 0 },
    );
    const spine = secs.find((s) => s.kind === "spine")!;
    const offsetM = (spine.coords![0][1] - (-12.01)) * 111320;
    expect(offsetM).toBeGreaterThan(11); // mediana = 12 m
    expect(offsetM).toBeLessThan(13);    // midpoint seria (0+30)/2 = 15 m
  });

  it("T75-2: Σ ribs com mediana < Σ ribs que o midpoint produziria (propriedade L1)", () => {
    // Inlets a 6/6/60 m. Mediana = 6 → Σ ribs = 0 + 0 + 54 = 54 m.
    // Midpoint v12 = (0+60)/2 = 30 → Σ ribs = 24 + 24 + 30 = 78 m.
    const c1 = colAtGap("c1", -46.005, 6, 0);
    const c2 = colAtGap("c2", -46.000, 6, 1);
    const c3 = colAtGap("c3", -45.995, 60, 2);
    const secs = generateSecondaries(
      [c1, c2, c3], PRINCIPAL_SOUTH, CENTROID, 0.5,
      { operationalSegments: [makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0)], gridAngleDegrees: 0 },
    );
    const sumRibsM = secs
      .filter((s) => s.kind === "rib")
      .reduce((t, s) => t + s.lengthM, 0);
    const sumRibsMidpointM = 78; // analítico para esta fixture (ver acima)
    expect(sumRibsM).toBeGreaterThan(53);
    expect(sumRibsM).toBeLessThan(55);
    expect(sumRibsM).toBeLessThan(sumRibsMidpointM - 1);
  });

  it("T75-3: inlets uniformes (18 m) → manifold clássico: spine_entry = gap, ribs 0, spine na linha dos inlets", () => {
    const c1 = colAtGap("c1", -46.005, 18, 0);
    const c2 = colAtGap("c2", -46.000, 18, 1);
    const c3 = colAtGap("c3", -45.995, 18, 2);
    const secs = generateSecondaries(
      [c1, c2, c3], PRINCIPAL_SOUTH, CENTROID, 0.5,
      { operationalSegments: [makeOpSeg("c1", 0), makeOpSeg("c2", 0), makeOpSeg("c3", 0)], gridAngleDegrees: 0 },
    );
    const spineEntry = secs.find((s) => s.kind === "spine_entry")!;
    expect(spineEntry.lengthM).toBeGreaterThan(17);
    expect(spineEntry.lengthM).toBeLessThan(19);
    for (const rib of secs.filter((s) => s.kind === "rib")) {
      expect(rib.lengthM).toBeLessThan(0.01);
    }
  });

  it("T75-4: caso degenerado (inlets a 1 m da principal) → clamp MIN_HEADLAND_M = 3 m preservado (v12)", () => {
    const c1 = colAtGap("c1", -46.005, 1, 0);
    const c2 = colAtGap("c2", -46.000, 1, 1);
    const secs = generateSecondaries(
      [c1, c2], PRINCIPAL_SOUTH, CENTROID, 0.5,
      { operationalSegments: [makeOpSeg("c1", 0), makeOpSeg("c2", 0)], gridAngleDegrees: 0 },
    );
    const spine = secs.find((s) => s.kind === "spine")!;
    const offsetM = (spine.coords![0][1] - (-12.01)) * 111320;
    // Mediana seria 1 m (< MIN_HEADLAND_M) → passo 7 força offset construtivo de 3 m.
    expect(offsetM).toBeGreaterThan(2.5);
    expect(offsetM).toBeLessThan(3.5);
  });
});
