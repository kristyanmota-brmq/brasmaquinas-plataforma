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

  it("todos ribs com lengthM > 0.5m (sem ribs degenerados)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThan(0.5);
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

  it("nenhum rib com lengthM === 0 (fix da causa raiz v6)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThan(0);
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

  it("ribs todos com lengthM ≈ 3m (rib alcança inlet do spine a 3m)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThan(2.5);
      expect(rib.lengthM).toBeLessThan(3.5);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T53-25 (v12) — Todos afastados (gap > MIN_HEADLAND): formula natural sem fallback
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-25 (v12) — Todos afastados (gap=12m): formula midpoint sem fallback", () => {
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

  it("spine no midpoint entre principal e inlets (gap=12m → offset=6m)", () => {
    const spine = secs.find((s) => s.kind === "spine")!;
    const spineLat = spine.coords![0][1];
    // Spine deve estar entre -12.01 (principal) e -12.01 + 12m/111320 (inlets)
    const offsetM = (spineLat - (-12.01)) * 111320;
    expect(offsetM).toBeGreaterThan(5);
    expect(offsetM).toBeLessThan(7);
  });

  it("ribs todos com lengthM ≈ 6m (inlets a 12m da principal; spine no midpoint)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThan(5);
      expect(rib.lengthM).toBeLessThan(7);
    }
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

  it("spine_entry e rib têm lengthM > 0", () => {
    const spineEntry = secs.find((s) => s.kind === "spine_entry")!;
    const rib = secs.find((s) => s.kind === "rib")!;
    expect(spineEntry.lengthM).toBeGreaterThan(0);
    expect(rib.lengthM).toBeGreaterThan(0);
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
// T53-28 (v12) — Blocker angular esperado em spine_entry→principal em grid não-cardinal
// ─────────────────────────────────────────────────────────────────────────────
describe("T53-28 (v12) — Grid 59° + principal horizontal: blocker angular em spine_entry esperado", () => {
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

  it("topologia gerada corretamente (3 ribs + 1 spine + 1 spine_entry)", () => {
    expect(secs).toHaveLength(5);
  });

  it("blocker(s) angular(es) em spine_entry→principal são esperados", () => {
    const report = detectNetworkAngleIssues({
      physicalColumns: [c1, c2, c3],
      secondaries: secs,
      principalCoords: PRINCIPAL_SOUTH,
      adutoraCoords: [],
      centroid: CENTROID,
    });
    // Em grid não-cardinal: spine_entry→principal cai em ângulo arbitrário (não 0°/90°)
    // → blocker esperado.
    // Nota: rib→lateral também gera blockers neste teste porque a FIXTURE makeCol
    // gera colunas verticais (Y global) independente do gridAngleDegrees — em uso real,
    // colunas seguem o ângulo da grade e rib→lateral fica em 0° (luva). Cobertura
    // detalhada da junção 0° está em T53-20 (grid cardinal).
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

  it("ribs todos com lengthM > 0 (espinha NÃO degenera apesar de gap=0)", () => {
    const ribs = secs.filter((s) => s.kind === "rib");
    for (const rib of ribs) {
      expect(rib.lengthM).toBeGreaterThan(0);
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
