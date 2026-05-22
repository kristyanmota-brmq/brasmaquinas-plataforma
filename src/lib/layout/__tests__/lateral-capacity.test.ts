/**
 * TASK-031 — Restrição de seleção de lateral a DN50/DN75 (subset homologado
 * para aspersor 5022) + blocker técnico quando DN75 não atende.
 *
 * Testes pela superfície pública (ajuste 8 do plano):
 *   - getCatalogoLateraisHomologadas5022
 *   - generatePhysicalColumns (com subset filtrado)
 *   - deriveLateraisFromNetwork
 *   - detectLateralCapacityViolations
 *   - generateProposalDiagnostics (texto exato do blocker)
 *   - pdfEmissionBlockers (gate)
 *
 * NÃO testa `selectLateralTube` diretamente (privada — interface pública o cobre).
 */

import { describe, it, expect } from "vitest";
import {
  generatePhysicalColumns,
  deriveLateraisFromNetwork,
  detectLateralCapacityViolations,
  getCatalogoLateraisHomologadas5022,
  type PhysicalColumn,
} from "@/lib/layout/laterais";
import { TUBOS_PVC_LF, ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";
import type { SelecaoTubo } from "@/lib/hydraulics/hazenWilliams";
import { deriveOperationalSegments } from "@/lib/layout/sectorization";
import { generateProposalDiagnostics, buildBOM, type BOMInput } from "@/lib/bom";
import {
  calculateIrrigationProject,
  pdfEmissionBlockers,
} from "@/lib/layout/irrigation-project";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

// TEST_CATALOG usado em T31-5 para construir SelecaoTubo sintético.
const TEST_CATALOG = [
  { sku: "TEST-50",  diametroMm: 50,  diametroInternoMm: 46, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  { sku: "TEST-75",  diametroMm: 75,  diametroInternoMm: 69, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
];

const SPACING = 12;
const CENTROID = { lng: -45, lat: -12 };
const ASPERSOR_MIN = {
  vazao: ASPERSOR_PADRAO.vazaoM3PorHora,
  pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca,
};

const M_PER_LAT = 111320;
const mPerLng = M_PER_LAT * Math.cos((CENTROID.lat * Math.PI) / 180);
function localToLngLat(x: number, y: number): [number, number] {
  return [CENTROID.lng + x / mPerLng, CENTROID.lat + y / M_PER_LAT];
}

function makeColumn(n: number, xLocal = 0): [number, number][] {
  const positions: [number, number][] = [];
  for (let i = 0; i < n; i++) positions.push(localToLngLat(xLocal, i * SPACING));
  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// T31-1: subset homologado contém apenas DN ≤ 75
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-1 — getCatalogoLateraisHomologadas5022 contém apenas DN ≤ 75", () => {
  it("nenhum tubo do subset tem DN > 75", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    expect(subset.length).toBeGreaterThan(0);
    for (const tubo of subset) {
      expect(tubo.diametroMm).toBeLessThanOrEqual(75);
    }
  });

  it("subset NÃO inclui DN100 (presente no catálogo global)", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const dn100 = subset.find((t) => t.diametroMm === 100);
    expect(dn100).toBeUndefined();
    // Mas DN100 continua presente no catálogo global.
    const dn100Global = TUBOS_PVC_LF.find((t) => t.diametroMm === 100);
    expect(dn100Global).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-2: generatePhysicalColumns com subset filtrado → nunca DN > 75
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-2 — generatePhysicalColumns com subset filtrado nunca produz DN > 75", () => {
  it("coluna n=10 com subset homologado → DN ≤ 75", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(10);
    const cols = generatePhysicalColumns(
      positions,
      0,
      CENTROID,
      SPACING,
      ASPERSOR_MIN,
      subset,
    );
    expect(cols).toHaveLength(1);
    expect(cols[0].selecao.tubo.diametroMm).toBeLessThanOrEqual(75);
  });

  it("coluna grande (n=30) ainda escolhe DN ≤ 75 — fallback fica em DN75 do subset", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(30);
    const cols = generatePhysicalColumns(
      positions,
      0,
      CENTROID,
      SPACING,
      ASPERSOR_MIN,
      subset,
    );
    for (const col of cols) {
      expect(col.selecao.tubo.diametroMm).toBeLessThanOrEqual(75);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-3: caso ok (n=10 cabe em DN50/DN75) → lateralCapacity.ok = true
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-3 — n=10 em DN homologado → lateralCapacity.ok=true", () => {
  it("coluna leve não excede limites; capacity ok", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(10);
    const cols = generatePhysicalColumns(
      positions,
      0,
      CENTROID,
      SPACING,
      ASPERSOR_MIN,
      subset,
    );
    expect(cols).toHaveLength(1);
    expect(cols[0].lateralCapacity.ok).toBe(true);
    expect(cols[0].lateralCapacity.hfM).toBeGreaterThan(0);
    expect(cols[0].lateralCapacity.velMs).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-4: caso falha (n grande) → lateralCapacity.ok = false com reason
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-4 / TASK-040 — coluna n grande é dividida automaticamente; sub-colunas têm ok=true", () => {
  it("n=40 com subset DN50/DN75 → split automático → todas sub-colunas com ok=true", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(40);
    const cols = generatePhysicalColumns(
      positions,
      0,
      CENTROID,
      SPACING,
      ASPERSOR_MIN,
      subset,
    );
    // TASK-040: 1 coluna original n=40 é dividida em ≥ 2 sub-colunas
    expect(cols.length).toBeGreaterThan(1);
    // Todas as sub-colunas resultantes cabem em DN75 (ok=true)
    for (const c of cols) {
      expect(c.lateralCapacity.ok).toBe(true);
      expect(c.selecao.tubo.diametroMm).toBeLessThanOrEqual(75);
    }
    // Rastreabilidade: todas têm originalColumnIndex === 0 (vieram da mesma coluna raw)
    for (const c of cols) {
      expect(c.originalColumnIndex).toBe(0);
    }
    // splitIndex sequencial
    const splitIndices = cols.map((c) => c.splitIndex).sort();
    expect(splitIndices).toEqual([...Array(cols.length).keys()]);
    // Nenhum aspersor perdido nem duplicado
    const allIndices = cols.flatMap((c) => c.sprinklerIndices).sort((a, b) => a - b);
    expect(allIndices).toEqual([...Array(40).keys()]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-5: detectLateralCapacityViolations agrega violations com payload
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-5 — detectLateralCapacityViolations gera report completo (PhysicalColumn sintético)", () => {
  // Após TASK-040, n=40 via generatePhysicalColumns é dividido em sub-colunas ok.
  // Para validar o report quando alguma coluna tem `ok=false`, construímos
  // PhysicalColumn manualmente (caminho patológico/fallback que continua valid).
  it("violations contêm columnIndex, sprinklerCount, dnMm, hfM, velMs, reason", () => {
    const dummySelecao: SelecaoTubo = {
      tubo: TEST_CATALOG[1], // DN75
      perdaCargaM: 33.10,
      velocidadeMs: 3.57,
      perdaCargaPercentual: 0,
    };
    const start: [number, number] = [CENTROID.lng, CENTROID.lat];
    const end: [number, number] = [CENTROID.lng, CENTROID.lat + 0.005];
    const violatingCol: PhysicalColumn = {
      id: "col-0",
      columnIndex: 0,
      startLngLat: start,
      endLngLat: end,
      comprimentoM: 432.5,
      sprinklerCount: 37,
      vazaoM3h: 55.5,
      selecao: dummySelecao,
      sectorsTouched: [0],
      sprinklerIndices: Array.from({ length: 37 }, (_, i) => i),
      routeCoords: [start, end],
      lateralCapacity: { ok: false, reason: "both", hfM: 33.10, velMs: 3.57 },
    };
    const report = detectLateralCapacityViolations([violatingCol]);
    expect(report.hasBlockers).toBe(true);
    expect(report.violations).toHaveLength(1);
    const v = report.violations[0];
    expect(v.columnIndex).toBe(0);
    expect(v.sprinklerCount).toBe(37);
    expect(v.dnMm).toBe(75);
    expect(v.hfM).toBeCloseTo(33.10, 1);
    expect(v.velMs).toBeCloseTo(3.57, 1);
    expect(v.reason).toBe("both");
    expect(report.maxHfM).toBeCloseTo(33.10, 1);
    expect(report.maxVelMs).toBeCloseTo(3.57, 1);
  });

  it("colunas todas ok → report sem violations e hasBlockers=false", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(8);
    const cols = generatePhysicalColumns(
      positions,
      0,
      CENTROID,
      SPACING,
      ASPERSOR_MIN,
      subset,
    );
    const report = detectLateralCapacityViolations(cols);
    expect(report.hasBlockers).toBe(false);
    expect(report.violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-6: generateProposalDiagnostics emite blocker técnico
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-6 — generateProposalDiagnostics emite blocker técnico quando há violations (sintético)", () => {
  // Após TASK-040, n=40 via generatePhysicalColumns é dividido automaticamente.
  // Para validar o texto do blocker quando há violations (cenário fallback),
  // alimentamos `generateProposalDiagnostics` com um LateralCapacityReport sintético.
  it("blocker tem texto operacional explícito + 5 ações sugeridas", () => {
    const layout = {
      sprinklers: { positions: [], count: 0, gridAngleDegrees: 0, espacamentoM: SPACING, vazaoProjetoM3PorHora: 0 },
      centroid: CENTROID,
      sectorization: { setoresCount: 1, sectorIndices: [], jornadaHoras: 21 as const, laminaMm: 10 as const, vazaoPorSetorM3PorHora: 0 },
    } as unknown as ProjectLayout;
    const dummySelecao: SelecaoTubo = {
      tubo: TEST_CATALOG[1], perdaCargaM: 0, velocidadeMs: 0, perdaCargaPercentual: 0,
    };
    const bomInput: BOMInput = {
      sprinklers: { count: 0, vazaoProjetoM3PorHora: 0, espacamentoM: SPACING },
      sectorization: { setoresCount: 1, sectorIndices: [], vazaoPorSetorM3PorHora: 0 },
      mainPipeline: { lengthMeters: 100, segments: 1 },
      physicalColumns: [],
      laterais: [],
      secondaries: [],
      constructability: {
        controlPoints: [], columnDiagnostics: [], controlPointsCount: 0,
        pendingControlPointsCount: 0, independentFeedRequiredCount: 0, constructabilityStatus: "ok" as const,
      },
      centroid: CENTROID,
    };
    const bom = buildBOM(bomInput);

    // Report sintético com 8 violations (espelho do que TASK-033 observou).
    const syntheticReport = {
      violations: Array.from({ length: 8 }, (_, i) => ({
        columnIndex: i,
        physicalColumnId: `col-${i}`,
        sprinklerCount: 37,
        vazaoM3h: 55.5,
        dnMm: 75,
        hfM: 33.10,
        velMs: 3.57,
        reason: "both" as const,
      })),
      hasBlockers: true,
      maxHfM: 33.10,
      maxVelMs: 3.57,
    };

    const diagnostics = generateProposalDiagnostics(
      layout, bom, null, null, null, syntheticReport,
    );
    const txt = diagnostics.blockers.join("\n");
    expect(txt).toMatch(/Lateral hidraulicamente insuficiente para o aspersor 5022/);
    expect(txt).toMatch(/maior DN homologado para lateral é DN75/);
    expect(txt).toMatch(/excedem perda de carga ou velocidade admissível/);
    expect(txt).toMatch(/8 coluna\(s\)\/trecho\(s\)/);
    // Ações sugeridas (não apenas "mais setores"):
    expect(txt).toMatch(/reduzir aspersores por trecho operacional/);
    expect(txt).toMatch(/revisar comprimento das laterais/);
    expect(txt).toMatch(/dividir alimentação/);
    expect(txt).toMatch(/reposicionar principal\/corredor/);
    expect(txt).toMatch(/escalar para projetista\/RT/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-7: caminho normal (n pequeno) — blocker antigo NÃO dispara
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-7 — blocker antigo do kit 5022 NÃO dispara no caminho normal", () => {
  it("subset homologado → kitAspersorDnNaoHomologadoCount = 0", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions = makeColumn(8);
    const cols = generatePhysicalColumns(
      positions,
      0,
      CENTROID,
      SPACING,
      ASPERSOR_MIN,
      subset,
    );
    const ops = deriveOperationalSegments(cols, positions.map(() => 0), ASPERSOR_MIN.vazao);
    const laterais = deriveLateraisFromNetwork(
      cols, ops, positions, SPACING, ASPERSOR_MIN, subset, 0, CENTROID,
    );
    const bomInput: BOMInput = {
      sprinklers: {
        count: positions.length,
        vazaoProjetoM3PorHora: positions.length * ASPERSOR_MIN.vazao,
        espacamentoM: SPACING,
      },
      sectorization: {
        setoresCount: 1,
        sectorIndices: positions.map(() => 0),
        vazaoPorSetorM3PorHora: positions.length * ASPERSOR_MIN.vazao,
      },
      mainPipeline: { lengthMeters: 100, segments: 1 },
      physicalColumns: cols,
      laterais,
      secondaries: [],
      constructability: {
        controlPoints: [],
        columnDiagnostics: [],
        controlPointsCount: 0,
        pendingControlPointsCount: 0,
        independentFeedRequiredCount: 0,
        constructabilityStatus: "ok" as const,
      },
      centroid: CENTROID,
    };
    const bom = buildBOM(bomInput);
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-8: pdfEmissionBlockers retorna o blocker técnico via calculateIrrigationProject
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-8 / TASK-040 — projeto com coluna n=40 é resolvido pelo split (blocker não dispara)", () => {
  it("n=40 via calculateIrrigationProject → split funciona; blocker técnico ausente", () => {
    // Após TASK-040, o split por capacidade hidráulica é aplicado em
    // generatePhysicalColumns. Uma coluna n=40 é dividida em sub-colunas que
    // cabem em DN75. O blocker técnico só dispararia em caso patológico.
    const n = 40;
    const positions = makeColumn(n);
    const sectorIndices = positions.map(() => 0);
    const layout: ProjectLayout = {
      sprinklers: {
        positions,
        count: positions.length,
        gridAngleDegrees: 0,
        espacamentoM: SPACING,
        vazaoProjetoM3PorHora: positions.length * ASPERSOR_MIN.vazao,
      },
      centroid: CENTROID,
      sectorization: {
        setoresCount: 1,
        sectorIndices,
        jornadaHoras: 21,
        laminaMm: 10,
        vazaoPorSetorM3PorHora: positions.length * ASPERSOR_MIN.vazao,
      },
      mainPipeline: {
        coordinates: [
          [CENTROID.lng - 0.001, CENTROID.lat - 0.001],
          [CENTROID.lng, CENTROID.lat],
        ],
        lengthMeters: 150,
        segments: 1,
        source: "auto",
        corridorValidated: false,
        adutora: [],
      },
      waterSource: { lng: CENTROID.lng - 0.001, lat: CENTROID.lat - 0.001, elevation: 450 },
    } as unknown as ProjectLayout;

    const result = calculateIrrigationProject(layout);
    // TASK-040: split resolve → nenhum blocker de capacidade
    expect(result.lateralCapacity?.hasBlockers).toBe(false);
    const blockers = pdfEmissionBlockers(result);
    const found = blockers.some((b) =>
      b.includes("Lateral hidraulicamente insuficiente para o aspersor 5022"),
    );
    expect(found).toBe(false);
    // Múltiplas sub-colunas existem (split dividiu a coluna original)
    expect(result.physical!.physicalColumns.length).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T31-9: cenário projeto-tipo Barreiras — nenhuma coluna DN > 75
// ─────────────────────────────────────────────────────────────────────────────

describe("T31-9 — projeto sintético tipo Barreiras: nenhuma coluna DN100 LF", () => {
  it("grid 16 cols × 21 rows (~336 aspersores) — todas laterais ≤ DN75", () => {
    const subset = getCatalogoLateraisHomologadas5022();
    const positions: [number, number][] = [];
    for (let c = 0; c < 16; c++) {
      for (let r = 0; r < 21; r++) {
        positions.push(localToLngLat(c * SPACING, r * SPACING));
      }
    }
    const cols = generatePhysicalColumns(
      positions,
      0,
      CENTROID,
      SPACING,
      ASPERSOR_MIN,
      subset,
    );
    expect(cols.length).toBeGreaterThan(0);
    for (const col of cols) {
      expect(col.selecao.tubo.diametroMm).toBeLessThanOrEqual(75);
    }
  });
});
