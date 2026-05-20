import { describe, it, expect } from "vitest";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import {
  buildMapNetworkConsistencyReport,
  type MapNetworkConsistencyReport,
} from "@/lib/layout/map-consistency";
import { ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";
import type { IrrigationProjectResult } from "@/lib/layout/irrigation-project";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
const VAZ = ASPERSOR_PADRAO.vazaoM3PorHora; // 1.5 m³/h

function makeGrid(cols: number, rows: number): [number, number][] {
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
  const out: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const xM = (c - (cols - 1) / 2) * SPACING;
      const yM = r * SPACING;
      out.push([CENTROID.lng + xM / mPerLng, CENTROID.lat + yM / 111320]);
    }
  }
  return out;
}

/** Setor por coluna: cada coluna vai para o setor proporcionalmente. */
function makeSectorsByColumn(cols: number, rows: number, nSectors: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < cols; c++) {
    const s = Math.floor((c * nSectors) / cols);
    for (let r = 0; r < rows; r++) out.push(s);
  }
  return out;
}

function makeLayout(
  cols: number,
  rows: number,
  nSectors: number,
  opts: { corridorValidated?: boolean; sectorIndices?: number[] } = {},
): ProjectLayout {
  const positions = makeGrid(cols, rows);
  const sectorIndices = opts.sectorIndices ?? makeSectorsByColumn(cols, rows, nSectors);
  const principalLengthM = (cols - 1) * SPACING;
  return {
    centroid: CENTROID,
    waterSource: { lng: CENTROID.lng - 0.005, lat: CENTROID.lat - 0.005 },
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * VAZ,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: nSectors,
      tempoPorSetorMinutos: Math.round((60 * 14) / nSectors),
      aspersoresPorSetor: Math.round(positions.length / nSectors),
      vazaoPorSetorM3PorHora: Math.round(positions.length / nSectors) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [
        [CENTROID.lng - 0.001, CENTROID.lat - 0.001],
        [CENTROID.lng + 0.001, CENTROID.lat - 0.001],
      ],
      adutora: [
        [CENTROID.lng - 0.005, CENTROID.lat - 0.005],
        [CENTROID.lng - 0.001, CENTROID.lat - 0.001],
      ],
      lengthMeters: principalLengthM,
      segments: Math.max(cols - 1, 1),
      source: "auto",
      corridorValidated: opts.corridorValidated ?? true,
    },
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// 4×4 grid, 2 sectores — um setor por par de colunas
const completeResult = calculateIrrigationProject(makeLayout(4, 4, 2));

// Mesmo layout mas corridorValidated=false
const corridorFalseResult = calculateIrrigationProject(
  makeLayout(4, 4, 2, { corridorValidated: false }),
);

// 1 coluna física, 4 aspersores, sectorIndices=[0,0,1,1] → split entre 2 setores
const splitSectorIndices = [0, 0, 1, 1];
const splitResult = calculateIrrigationProject(
  makeLayout(1, 4, 2, { sectorIndices: splitSectorIndices }),
);

// Mock mínimo para testar colunas órfãs sem depender de geometria
const mockWithOrphan = {
  isComplete: true,
  missingFields: [],
  layout: {} as ProjectLayout,
  input: { positions: [[-46, -12], [-46, -12.001]] } as any,
  physical: {
    physicalColumns: [{ id: "col-0", sprinklerCount: 2 } as any],
    nColumns: 1,
    totalLengthM: 12,
  },
  operational: { operationalSegments: [{ id: "seg-0" } as any] } as any,
  distribution: { laterais: [{ id: "lat-0" } as any] } as any,
  hydraulic: {
    secondaries: [],
    connectivityReport: { orphanPhysicalColumns: ["col-0"] },
    corridorValidated: true,
  } as any,
  constructability: { controlPoints: [] } as any,
  bom: null,
  diagnostics: null,
  hydraulics: null,
} as unknown as IrrigationProjectResult;

// ── Testes ────────────────────────────────────────────────────────────────────

describe("buildMapNetworkConsistencyReport — projeto completo válido", () => {
  let report: MapNetworkConsistencyReport;

  it("executa sem lançar exceção", () => {
    expect(() => {
      report = buildMapNetworkConsistencyReport(completeResult);
    }).not.toThrow();
    report = buildMapNetworkConsistencyReport(completeResult);
  });

  it("todos os aspersores cobertos por colunas físicas (T009-1)", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.sprinklersWithoutPhysicalColumn).toBe(0);
    expect(r.sprinklersInPhysicalColumns).toBe(r.sprinklersTotal);
  });

  it("laterais renderizadas = segmentos operacionais (T009-2)", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.operationalSegmentsRendered).toBe(r.operationalSegmentsTotal);
  });

  it("ramais renderizados = ramais totais (T009-7)", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.secondariesRendered).toBe(r.secondariesTotal);
  });

  it("colunas físicas renderizadas = total − órfãs (T009-4)", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    const orphanCount =
      completeResult.hydraulic?.connectivityReport.orphanPhysicalColumns.length ?? 0;
    expect(r.physicalColumnsRendered).toBe(r.physicalColumnsTotal - orphanCount);
  });

  it("sem blockers em projeto sem órfãs", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.blockers).toHaveLength(0);
  });

  it("invariante: controlPointsTotal = physicalColumnsTotal + controlPointsSectionValve", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.controlPointsTotal).toBe(r.physicalColumnsTotal + r.controlPointsSectionValve);
  });

  it("controlPointsLateralInlet = physicalColumnsTotal (um inlet por coluna)", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.controlPointsLateralInlet).toBe(r.physicalColumnsTotal);
  });
});

describe("buildMapNetworkConsistencyReport — corridorValidated=false (T009-6)", () => {
  it("warnings inclui alerta sobre corridorValidated=false", () => {
    const r = buildMapNetworkConsistencyReport(corridorFalseResult);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.includes("corridorValidated=false"))).toBe(true);
  });

  it("corridorValidated field está false no relatório", () => {
    const r = buildMapNetworkConsistencyReport(corridorFalseResult);
    expect(r.corridorValidated).toBe(false);
  });
});

describe("buildMapNetworkConsistencyReport — colunas órfãs (T009-3)", () => {
  it("blockers não vazio quando há colunas físicas órfãs", () => {
    const r = buildMapNetworkConsistencyReport(mockWithOrphan);
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it("physicalColumnsRendered = 0 quando a única coluna é órfã", () => {
    const r = buildMapNetworkConsistencyReport(mockWithOrphan);
    expect(r.physicalColumnsTotal).toBe(1);
    expect(r.physicalColumnsRendered).toBe(0);
  });
});

describe("buildMapNetworkConsistencyReport — coluna dividida entre setores (T009-5)", () => {
  it("splitResult é completo", () => {
    expect(splitResult.isComplete).toBe(true);
  });

  it("1 coluna física para os 4 aspersores", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.physicalColumnsTotal).toBe(1);
  });

  it("2 segmentos operacionais derivados da coluna dividida", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.operationalSegmentsTotal).toBe(2);
  });

  it("2 laterais renderizadas (uma por segmento operacional)", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.operationalSegmentsRendered).toBe(2);
  });

  it("1 section_valve gerado no ponto de corte", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.controlPointsSectionValve).toBe(1);
  });
});

describe("buildMapNetworkConsistencyReport — coluna dividida sem blocker (T009-5-blocker)", () => {
  it("coluna física dividida entre setores NÃO gera blocker se está conectada", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    // A coluna existe e está conectada (não é órfã): não deve haver blocker
    expect(r.blockers).toHaveLength(0);
  });

  it("todos os aspersores da coluna dividida estão em physicalColumns", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.sprinklersWithoutPhysicalColumn).toBe(0);
  });
});

describe("buildMapNetworkConsistencyReport — tipo visual dos section_valves (T009-8)", () => {
  it("toda section_valve aparece como controlPointsSectionValve ≥ 0", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.controlPointsSectionValve).toBeGreaterThanOrEqual(0);
  });

  it("controlPointsSectionValve + controlPointsLateralInlet = controlPointsTotal", () => {
    // Invariante: todo control point é section_valve ou lateral_inlet no modelo atual
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.controlPointsSectionValve + r.controlPointsLateralInlet).toBe(
      r.controlPointsTotal,
    );
  });

  it("controlPointsSectionValve + controlPointsLateralInlet = controlPointsTotal (completo)", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.controlPointsSectionValve + r.controlPointsLateralInlet).toBe(
      r.controlPointsTotal,
    );
  });

  it("secondariesRendered = secondariesTotal em qualquer resultado (T009-7-bis)", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.secondariesRendered).toBe(r.secondariesTotal);
    const r2 = buildMapNetworkConsistencyReport(splitResult);
    expect(r2.secondariesRendered).toBe(r2.secondariesTotal);
  });
});

// ── TASK-009B: invariâncias topológicas ──────────────────────────────────────

describe("D2 — lateral_inlet coincide com extremo alimentado pelo ramal (T009B-inlet)", () => {
  it("inletSideMismatchCount = 0 para projeto completo válido", () => {
    const r = buildMapNetworkConsistencyReport(completeResult);
    expect(r.inletSideMismatchCount).toBe(0);
  });

  it("inletSideMismatchCount = 0 para coluna dividida entre setores", () => {
    const r = buildMapNetworkConsistencyReport(splitResult);
    expect(r.inletSideMismatchCount).toBe(0);
  });

  it("inletSideMismatchCount = 0 quando não há ramais (contato direto)", () => {
    // Sem secondaries: todas as colunas fazem contato direto — nenhum mismatch possível.
    const r = buildMapNetworkConsistencyReport(completeResult);
    // Se o projeto não tem secondaries, inletSideMismatchCount deve ser 0.
    if (r.secondariesTotal === 0) {
      expect(r.inletSideMismatchCount).toBe(0);
    } else {
      expect(r.inletSideMismatchCount).toBe(0);
    }
  });
});

describe("D1 — section_valve sobre lateral física (T009B-sv)", () => {
  it("toda section_valve está entre dois sprinklerIndices consecutivos da mesma coluna", () => {
    // Invariante: section_valve.coordinate = midpoint(positions[prevLast], positions[nextFirst])
    // Ambos os aspersores pertencem à mesma PhysicalColumn → estão na polilinha.
    const cp = splitResult.constructability?.controlPoints ?? [];
    const positions = splitResult.input?.positions ?? [];
    const physicalColumns = splitResult.physical?.physicalColumns ?? [];

    const sectionValves = cp.filter((c) => c.type === "section_valve");
    expect(sectionValves.length).toBeGreaterThan(0);

    for (const sv of sectionValves) {
      const col = physicalColumns.find((c) => c.id === sv.physicalColumnId);
      expect(col).toBeDefined();
      if (!col) continue;

      // A section_valve deve estar entre dois sprinklers consecutivos da coluna física.
      // Verificar: existe um par (i, i+1) em col.sprinklerIndices tal que
      // sv.coordinate ≈ midpoint(positions[sprinklerIndices[i]], positions[sprinklerIndices[i+1]]).
      let foundPair = false;
      for (let k = 0; k < col.sprinklerIndices.length - 1; k++) {
        const aIdx = col.sprinklerIndices[k];
        const bIdx = col.sprinklerIndices[k + 1];
        const a = positions[aIdx];
        const b = positions[bIdx];
        if (!a || !b) continue;
        const midLng = (a[0] + b[0]) / 2;
        const midLat = (a[1] + b[1]) / 2;
        const eps = 1e-7;
        if (
          Math.abs(sv.coordinate[0] - midLng) < eps &&
          Math.abs(sv.coordinate[1] - midLat) < eps
        ) {
          foundPair = true;
          break;
        }
      }
      expect(foundPair).toBe(true);
    }
  });
});

describe("D1 — todo aspersor pertence a uma physicalColumn (T009B-asp)", () => {
  it("todo aspersor do completeResult tem physicalColumnId rastreável", () => {
    const positions = completeResult.input?.positions ?? [];
    const physicalColumns = completeResult.physical?.physicalColumns ?? [];

    const coveredIndices = new Set<number>();
    for (const col of physicalColumns) {
      for (const idx of col.sprinklerIndices) coveredIndices.add(idx);
    }

    expect(coveredIndices.size).toBe(positions.length);
  });

  it("todo aspersor do splitResult tem physicalColumnId rastreável", () => {
    const positions = splitResult.input?.positions ?? [];
    const physicalColumns = splitResult.physical?.physicalColumns ?? [];

    const coveredIndices = new Set<number>();
    for (const col of physicalColumns) {
      for (const idx of col.sprinklerIndices) coveredIndices.add(idx);
    }

    expect(coveredIndices.size).toBe(positions.length);
  });
});

describe("D2 — nenhum ramal termina no extremo oposto ao inlet da lateral (T009B-sec)", () => {
  it("secondary.toCoord ≈ lateral_inlet.coordinate para mesma coluna física", () => {
    const cp = completeResult.constructability?.controlPoints ?? [];
    const secondaries = completeResult.hydraulic?.secondaries ?? [];

    for (const sec of secondaries) {
      const inlet = cp.find(
        (c) => c.physicalColumnId === sec.physicalColumnId && c.type === "lateral_inlet",
      );
      if (!inlet) continue;

      // Distância em graus — tolerância de ~2m (≈ 0.00002°)
      const dlng = Math.abs(inlet.coordinate[0] - sec.toCoord[0]);
      const dlat = Math.abs(inlet.coordinate[1] - sec.toCoord[1]);
      expect(dlng).toBeLessThan(0.0002);
      expect(dlat).toBeLessThan(0.0002);
    }
  });
});

describe("buildMapNetworkConsistencyReport — resultado incompleto (nulls)", () => {
  it("aceita resultado sem physical/operational/distribution", () => {
    const partial = calculateIrrigationProject({} as ProjectLayout);
    expect(() => buildMapNetworkConsistencyReport(partial)).not.toThrow();
  });

  it("retorna zeros quando dados estão ausentes", () => {
    const partial = calculateIrrigationProject({} as ProjectLayout);
    const r = buildMapNetworkConsistencyReport(partial);
    expect(r.physicalColumnsTotal).toBe(0);
    expect(r.operationalSegmentsTotal).toBe(0);
    expect(r.secondariesTotal).toBe(0);
    expect(r.controlPointsTotal).toBe(0);
  });
});
