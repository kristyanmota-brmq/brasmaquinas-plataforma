/**
 * Testes de integração para calculateIrrigationProject.
 *
 * Critérios de aceitação (T8):
 *  1. calculateIrrigationProject retorna todos os blocos esperados
 *  2. Idempotência: dois resultados do mesmo layout são iguais (pureza)
 *  3. buildBOM não recalcula rede (BOMInput vem pronto do orquestrador)
 *  4. deriveLateraisFromNetwork não diverge das physicalColumns
 *  5. Layout antigo sem schemaVersion passa por migrateLayout
 *  6. Layout inválido retorna erro claro de validateLayout
 *  7. Snapshot projeto L: 444 asp, 14 setores, ≥ 26 laterais físicas
 *  8. Snapshot projeto P: 736 asp, 14 setores
 */

import { describe, it, expect } from "vitest";
import { calculateIrrigationProject, pdfEmissionBlockers } from "@/lib/layout/irrigation-project";
import { migrateLayout, validateLayout } from "@/app/projetos/[id]/layout-schema";
import { ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
const VAZ = ASPERSOR_PADRAO.vazaoM3PorHora;

function makeGrid(
  cols: number,
  rows: number,
  centroid = CENTROID,
): [number, number][] {
  const mPerLng = 111320 * Math.cos((centroid.lat * Math.PI) / 180);
  const out: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const xM = (c - (cols - 1) / 2) * SPACING;
      const yM = (r - (rows - 1) / 2) * SPACING;
      out.push([centroid.lng + xM / mPerLng, centroid.lat + yM / 111320]);
    }
  }
  return out;
}

/** Assigns one sector per column (clean vertical sectoring). */
function makeSectorsByColumn(cols: number, rows: number, nSectors: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < cols; c++) {
    const s = Math.floor((c * nSectors) / cols);
    for (let r = 0; r < rows; r++) out.push(s);
  }
  return out;
}

function makeCompleteLayout(
  cols: number,
  rows: number,
  nSectors: number,
): ProjectLayout {
  const positions = makeGrid(cols, rows);
  const sectorIndices = makeSectorsByColumn(cols, rows, nSectors);
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
      segments: cols - 1,
      source: "auto",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// T8.1 — calculateIrrigationProject retorna todos os blocos esperados
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.1 — calculateIrrigationProject retorna todos os blocos", () => {
  const layout = makeCompleteLayout(10, 10, 4);
  const result = calculateIrrigationProject(layout);

  it("isComplete = true", () => {
    expect(result.isComplete).toBe(true);
  });

  it("missingFields = []", () => {
    expect(result.missingFields).toHaveLength(0);
  });

  it("todos os blocos são não-nulos", () => {
    expect(result.input).not.toBeNull();
    expect(result.physical).not.toBeNull();
    expect(result.operational).not.toBeNull();
    expect(result.distribution).not.toBeNull();
    expect(result.hydraulic).not.toBeNull();
    expect(result.constructability).not.toBeNull();
    expect(result.bom).not.toBeNull();
    expect(result.diagnostics).not.toBeNull();
  });

  it("passthrough layout está presente", () => {
    expect(result.layout).toBe(layout);
  });

  it("physical.nColumns = 10", () => {
    expect(result.physical!.nColumns).toBe(10);
  });

  it("operational.nSetores = 4", () => {
    expect(result.operational!.nSetores).toBe(4);
  });

  it("distribution.nLaterais ≥ operational.operationalSegments.length", () => {
    expect(result.distribution!.nLaterais).toBe(
      result.operational!.operationalSegments.length,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8.2 — Idempotência: mesma entrada, mesmo resultado (pureza)
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.2 — idempotência (resultado puro)", () => {
  const layout = makeCompleteLayout(8, 8, 4);

  it("dois cálculos do mesmo layout produzem BOM idêntica", () => {
    const r1 = calculateIrrigationProject(layout);
    const r2 = calculateIrrigationProject(layout);
    expect(r1.bom!.totalGeral).toBe(r2.bom!.totalGeral);
    expect(r1.bom!.meta.nColunasLaterais).toBe(r2.bom!.meta.nColunasLaterais);
    expect(r1.bom!.meta.comprimentoLateraisM).toBe(r2.bom!.meta.comprimentoLateraisM);
  });

  it("dois cálculos produzem o mesmo nColunasLaterais", () => {
    const r1 = calculateIrrigationProject(layout);
    const r2 = calculateIrrigationProject(layout);
    expect(r1.physical!.nColumns).toBe(r2.physical!.nColumns);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8.3 — buildBOM não recalcula rede (recebe BOMInput pré-computado)
//
// O orquestrador computa physicalColumns, laterais e secondaries e passa para
// buildBOM. Se buildBOM recalculasse, os valores divergiriam de result.physical.
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.3 — buildBOM não recalcula rede", () => {
  const layout = makeCompleteLayout(6, 10, 3);
  const result = calculateIrrigationProject(layout);

  it("bom.meta.nColunasLaterais === physical.nColumns", () => {
    expect(result.bom!.meta.nColunasLaterais).toBe(result.physical!.nColumns);
  });

  it("bom.meta.comprimentoLateraisM === soma das colunas físicas", () => {
    const soma = result.physical!.physicalColumns.reduce(
      (s, c) => s + c.comprimentoM,
      0,
    );
    expect(result.bom!.meta.comprimentoLateraisM).toBeCloseTo(soma, 1);
  });

  it("bom.meta.nLaterais === distribution.nLaterais", () => {
    expect(result.bom!.meta.nLaterais).toBe(result.distribution!.nLaterais);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8.4 — deriveLateraisFromNetwork não diverge das physicalColumns
//
// Cada trecho operacional (Lateral) deve referenciar uma physicalColumn existente.
// A soma dos comprimentos por coluna física deve ser ≥ comprimentoM da physicalColumn.
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.4 — deriveLateraisFromNetwork consistente com physicalColumns", () => {
  const layout = makeCompleteLayout(5, 12, 3);
  const result = calculateIrrigationProject(layout);

  it("nLaterais = nOperationalSegments (todos os segmentos geraram uma lateral)", () => {
    expect(result.distribution!.nLaterais).toBe(
      result.operational!.operationalSegments.length,
    );
  });

  it("nLaterais ≥ nColunasLaterais (operacional ≥ físico)", () => {
    expect(result.distribution!.nLaterais).toBeGreaterThanOrEqual(
      result.physical!.nColumns,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8.5 — Layout antigo sem schemaVersion passa por migrateLayout
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.5 — migrateLayout: layout antigo sem schemaVersion", () => {
  const legacyData = {
    centroid: CENTROID,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions: makeGrid(2, 2),
      count: 4,
      vazaoProjetoM3PorHora: 4 * VAZ,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto" as const,
    },
  };

  it("migrateLayout adiciona schemaVersion quando ausente", () => {
    const migrated = migrateLayout(legacyData);
    expect(migrated.schemaVersion).toBeDefined();
    expect(migrated.schemaVersion).not.toBe("");
  });

  it("migrateLayout preserva os campos existentes", () => {
    const migrated = migrateLayout(legacyData);
    expect(migrated.centroid).toEqual(CENTROID);
    expect(migrated.sprinklers?.count).toBe(4);
  });

  it("migrateLayout aceita null sem lançar", () => {
    const migrated = migrateLayout(null);
    expect(migrated.schemaVersion).toBeDefined();
  });

  it("migrateLayout aceita string sem lançar", () => {
    const migrated = migrateLayout("garbage");
    expect(migrated.schemaVersion).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8.6 — Layout inválido retorna erro claro de validateLayout
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.6 — validateLayout: erros claros para entradas inválidas", () => {
  it("null → valid: false com erro descritivo", () => {
    const r = validateLayout(null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("array → valid: false", () => {
    const r = validateLayout([]);
    expect(r.valid).toBe(false);
  });

  it("sprinklers como string → valid: false", () => {
    const r = validateLayout({ sprinklers: "wrong" });
    expect(r.valid).toBe(false);
    if (!r.valid) {
      const msg = r.errors.join(" ");
      expect(msg.toLowerCase()).toContain("sprinklers");
    }
  });

  it("objeto vazio válido → valid: true (campos opcionais)", () => {
    const r = validateLayout({});
    expect(r.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8.7 — Snapshot projeto L: ~444 asp, 14 setores
//
// Grade 37 × 12 = 444 aspersores, 14 setores.
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.7 — snapshot projeto L: 444 asp / 14 setores", () => {
  const COLS = 37, ROWS = 12, SECTORS = 14;
  const layout = makeCompleteLayout(COLS, ROWS, SECTORS);
  const result = calculateIrrigationProject(layout);

  it("isComplete = true", () => {
    expect(result.isComplete).toBe(true);
  });

  it("physical.nColumns = 37 (uma por coluna de grade)", () => {
    expect(result.physical!.nColumns).toBe(COLS);
  });

  it("operational.nSetores = 14", () => {
    expect(result.operational!.nSetores).toBe(SECTORS);
  });

  it("distribution.nLaterais ≥ 37 (operacional ≥ físico)", () => {
    expect(result.distribution!.nLaterais).toBeGreaterThanOrEqual(COLS);
  });

  it("bom.meta.nColunasLaterais = 37", () => {
    expect(result.bom!.meta.nColunasLaterais).toBe(COLS);
  });

  it("comprimentoLateraisM = 37 × (12-1) × 12 + 0.5 por coluna = correto", () => {
    const expected = COLS * ((ROWS - 1) * SPACING + 0.5);
    expect(result.bom!.meta.comprimentoLateraisM).toBeCloseTo(expected, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8.8 — Snapshot projeto P: ~736 asp, 14 setores
//
// Grade 46 × 16 = 736 aspersores, 14 setores.
// ─────────────────────────────────────────────────────────────────────────────
describe("T8.8 — snapshot projeto P: 736 asp / 14 setores", () => {
  const COLS = 46, ROWS = 16, SECTORS = 14;
  const layout = makeCompleteLayout(COLS, ROWS, SECTORS);
  const result = calculateIrrigationProject(layout);

  it("isComplete = true", () => {
    expect(result.isComplete).toBe(true);
  });

  it("physical.nColumns = 46", () => {
    expect(result.physical!.nColumns).toBe(COLS);
  });

  it("operational.nSetores = 14", () => {
    expect(result.operational!.nSetores).toBe(SECTORS);
  });

  it("bom.meta.nColunasLaterais = 46", () => {
    expect(result.bom!.meta.nColunasLaterais).toBe(COLS);
  });

  it("sprinklersPerSector: todos os setores têm aspersores (nenhum setor vazio)", () => {
    const { sprinklersPerSector } = result.operational!;
    expect(sprinklersPerSector).toHaveLength(SECTORS);
    for (const n of sprinklersPerSector) {
      expect(n).toBeGreaterThan(0);
    }
  });

  it("bom.totalGeral > 0 (projeto tem custo calculado)", () => {
    expect(result.bom!.totalGeral).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T9 — Geometria irregular: invariantes se sustentam em campos não-retangulares
//
// Os fixtures makeLayoutL e makeLayoutP usam grades com cantos cortados.
// Isso testa que physicalColumns, operationalSegments e laterais são consistentes
// mesmo quando colunas têm comprimentos diferentes entre si.
// ─────────────────────────────────────────────────────────────────────────────
import { makeLayoutL, makeLayoutP, N_SECTORS_L, N_SECTORS_P } from "./fixtures";

describe("T9.1 — Projeto L irregular: invariantes do pipeline", () => {
  const layout = makeLayoutL();
  const result = calculateIrrigationProject(layout);

  it("isComplete = true", () => {
    expect(result.isComplete).toBe(true);
  });

  it("sprinklers > 400 (campo L com ~448 posições)", () => {
    expect(layout.sprinklers!.count).toBeGreaterThan(400);
  });

  it("operacional.nSetores = 14", () => {
    expect(result.operational!.nSetores).toBe(N_SECTORS_L);
  });

  it("todos os setores têm pelo menos um aspersor", () => {
    for (const n of result.operational!.sprinklersPerSector) {
      expect(n).toBeGreaterThan(0);
    }
  });

  it("nLaterais = nOperationalSegments (consistência operational ↔ distribution)", () => {
    expect(result.distribution!.nLaterais).toBe(
      result.operational!.operationalSegments.length,
    );
  });

  it("bom.meta.nColunasLaterais = physical.nColumns", () => {
    expect(result.bom!.meta.nColunasLaterais).toBe(result.physical!.nColumns);
  });

  it("colunas físicas têm comprimentos variados (geometria irregular detectada)", () => {
    const comprimentos = result.physical!.physicalColumns.map((c) => c.comprimentoM);
    const min = Math.min(...comprimentos);
    const max = Math.max(...comprimentos);
    // Campo em L tem colunas do lado cortado menores que as completas
    expect(max).toBeGreaterThan(min);
  });

  it("bom.totalGeral > 0", () => {
    expect(result.bom!.totalGeral).toBeGreaterThan(0);
  });

  it("constructability.controlPoints.length = nColunasLaterais + pendingCount (invariante)", () => {
    const nCols = result.physical!.nColumns;
    const pending = result.constructability!.controlPoints.filter(
      (cp) => cp.status === "pending",
    ).length;
    expect(result.constructability!.controlPoints.length).toBe(nCols + pending);
  });

  it("idempotência: dois cálculos do mesmo layout irregular produzem o mesmo totalGeral", () => {
    const r2 = calculateIrrigationProject(layout);
    expect(result.bom!.totalGeral).toBe(r2.bom!.totalGeral);
  });
});

describe("T9.2 — Projeto P irregular: invariantes do pipeline", () => {
  const layout = makeLayoutP();
  const result = calculateIrrigationProject(layout);

  it("isComplete = true", () => {
    expect(result.isComplete).toBe(true);
  });

  it("sprinklers > 700 (campo trapezoidal com ~768 posições)", () => {
    expect(layout.sprinklers!.count).toBeGreaterThan(700);
  });

  it("operacional.nSetores = 14", () => {
    expect(result.operational!.nSetores).toBe(N_SECTORS_P);
  });

  it("todos os setores têm pelo menos um aspersor", () => {
    for (const n of result.operational!.sprinklersPerSector) {
      expect(n).toBeGreaterThan(0);
    }
  });

  it("nLaterais = nOperationalSegments", () => {
    expect(result.distribution!.nLaterais).toBe(
      result.operational!.operationalSegments.length,
    );
  });

  it("bom.meta.nColunasLaterais = physical.nColumns", () => {
    expect(result.bom!.meta.nColunasLaterais).toBe(result.physical!.nColumns);
  });

  it("colunas físicas têm comprimentos variados (dois cantos cortados)", () => {
    const comprimentos = result.physical!.physicalColumns.map((c) => c.comprimentoM);
    const min = Math.min(...comprimentos);
    const max = Math.max(...comprimentos);
    expect(max).toBeGreaterThan(min);
  });

  it("bom.totalGeral > 0", () => {
    expect(result.bom!.totalGeral).toBeGreaterThan(0);
  });

  it("idempotência em campo trapezoidal", () => {
    const r2 = calculateIrrigationProject(layout);
    expect(result.bom!.totalGeral).toBe(r2.bom!.totalGeral);
    expect(result.physical!.nColumns).toBe(r2.physical!.nColumns);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T10 — Consistência mapa vs PDF
//
// Mapa e PDF usam calculateIrrigationProject(layout) como única fonte de verdade.
// Este teste valida que os valores exibidos no mapa e usados no PDF são idênticos:
// ambos derivam do mesmo IrrigationProjectResult para o mesmo layout.
// ─────────────────────────────────────────────────────────────────────────────
describe("T10 — consistência mapa vs PDF: mesmo IrrigationProjectResult", () => {
  const layout = makeLayoutL();

  it("calculateIrrigationProject é puro: dois resultados são bit-a-bit iguais nos campos chave", () => {
    const mapResult = calculateIrrigationProject(layout);
    const pdfResult = calculateIrrigationProject(layout);

    // Aspersores
    expect(pdfResult.physical!.nColumns).toBe(mapResult.physical!.nColumns);

    // Principal e adutora
    expect(pdfResult.bom!.meta.comprimentoLateraisM).toBe(mapResult.bom!.meta.comprimentoLateraisM);
    expect(pdfResult.bom!.meta.comprimentoAdutoraM).toBe(mapResult.bom!.meta.comprimentoAdutoraM);
    expect(pdfResult.bom!.meta.comprimentoSecundariasM).toBe(mapResult.bom!.meta.comprimentoSecundariasM);

    // Laterais
    expect(pdfResult.distribution!.nLaterais).toBe(mapResult.distribution!.nLaterais);
    expect(pdfResult.bom!.meta.nColunasLaterais).toBe(mapResult.bom!.meta.nColunasLaterais);

    // BOM total
    expect(pdfResult.bom!.totalGeral).toBe(mapResult.bom!.totalGeral);

    // Status de proposta
    expect(pdfResult.isComplete).toBe(mapResult.isComplete);
    expect(pdfResult.diagnostics!.constructabilityStatus).toBe(mapResult.diagnostics!.constructabilityStatus);
  });

  it("resultado é consistente entre layout L (irregular) e P (trapezoidal) — não há valor compartilhado entre projetos", () => {
    const resultL = calculateIrrigationProject(makeLayoutL());
    const resultP = calculateIrrigationProject(makeLayoutP());

    // Projetos diferentes devem ter BOM diferentes
    expect(resultP.bom!.totalGeral).not.toBe(resultL.bom!.totalGeral);
    expect(resultP.physical!.nColumns).not.toBe(resultL.physical!.nColumns);
  });

  it("bom.meta do PDF corresponde ao que o mapa exibe: nColunasLaterais e nLaterais", () => {
    const result = calculateIrrigationProject(layout);

    // Mapa exibe nLaterais como trechos operacionais
    const mapDisplayLaterais = result.distribution!.nLaterais;
    // PDF usa bom.meta.nColunasLaterais como laterais físicas
    const pdfBomColunasLaterais = result.bom!.meta.nColunasLaterais;
    // nLaterais operacional ≥ nColunasLaterais físicas (split gera mais trechos)
    expect(mapDisplayLaterais).toBeGreaterThanOrEqual(pdfBomColunasLaterais);
    // E os dois vêm do mesmo result — não há divergência mapa vs PDF
    expect(pdfBomColunasLaterais).toBe(result.physical!.nColumns);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T28 — Desvio aspersor → eixo lateral coberto pela rota física (TASK-028)
//
// Regra operacional Brasmáquinas: aspersor fora do eixo da lateral física é
// blocker (vala da lateral = vala do aspersor). TOLERANCIA = 0,10 m.
//
// Após a TASK-028: o motor gera a lateral como polilinha (routeCoords) que
// passa por todos os aspersores. O blocker continua existindo como fallback
// quando a rota não puder ser construída — testado em unidade (lateral-route.test.ts).
//
// T28-f: layout com positions[0] deslocado +0,15 m em X → rota cobre o aspersor
//   via dobra 90° → blocker NÃO dispara (mudança vs. T19-f original).
// T28-g: layout sem offset → continua sem blocker.
// T28-h: pdfEmissionBlockers não retorna o blocker quando a rota cobre.
// ─────────────────────────────────────────────────────────────────────────────

describe("T28 — desvio aspersor coberto pela rota física da lateral", () => {
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
  // Offset de 0,15 m em longitude no positions[0] da coluna 0.
  const xOffsetLng = 0.15 / mPerLng;

  function makeLayoutWithOffset(): ProjectLayout {
    const base = makeCompleteLayout(4, 5, 2);
    const positions = base.sprinklers!.positions.map<[number, number]>(
      (p, i) => (i === 0 ? [p[0] + xOffsetLng, p[1]] : p),
    );
    return {
      ...base,
      sprinklers: { ...base.sprinklers!, positions, count: positions.length },
    };
  }

  it("T28-f: posição deslocada 0,15 m → blocker DISPARA (TASK-045B emenda ADR-012)", () => {
    // TASK-045B: rota é reta no eixo; aspersor a 0,15 m > TOLERANCIA (0,10 m)
    // gera blocker. Comportamento esperado pós-emenda: detector volta a operar
    // como gate genuíno, sem polilinha "salvadora".
    const result = calculateIrrigationProject(makeLayoutWithOffset());
    expect(result.diagnostics).not.toBeNull();
    const hasAxisBlocker = result.diagnostics!.blockers.some(
      (b) => b.includes("Aspersor fora do eixo da lateral física"),
    );
    expect(hasAxisBlocker).toBe(true);
  });

  it("T28-g: grid correto → zero blockers de eixo (regressão)", () => {
    const result = calculateIrrigationProject(makeCompleteLayout(4, 5, 2));
    expect(result.diagnostics).not.toBeNull();
    const hasAxisBlocker = result.diagnostics!.blockers.some(
      (b) => b.includes("Aspersor fora do eixo da lateral física"),
    );
    expect(hasAxisBlocker).toBe(false);
  });

  it("T28-h: pdfEmissionBlockers retorna o blocker quando há desvio (TASK-045B)", () => {
    // TASK-045B: aspersor desalinhado >0,10 m gera blocker que bloqueia PDF.
    const result = calculateIrrigationProject(makeLayoutWithOffset());
    const blockers = pdfEmissionBlockers(result);
    const hasAxisBlocker = blockers.some(
      (b) => b.includes("Aspersor fora do eixo da lateral física"),
    );
    expect(hasAxisBlocker).toBe(true);
  });
});
