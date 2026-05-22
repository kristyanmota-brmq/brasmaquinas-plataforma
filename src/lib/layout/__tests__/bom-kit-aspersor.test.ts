/**
 * TASK-023 — Testes do kit de ligação do aspersor 5022 por DN de lateral.
 *
 * Cobre:
 *   T23-a: Lateral DN50 → 3 itens de kit; tubo de subida 1 por aspersor; sem pending de kit
 *   T23-b: Lateral DN75 → 4 itens de kit; itens corretos por SKU
 *   T23-c: Lateral DN100 → blocker "BOM incompleta — DN de lateral não homologado..."
 *   T23-d: Mix DN50 + DN75 → itens agrupados por SKU (luva e tubo somados)
 *   T23-e: Mix DN50 + DN100 → resolvidos e não-homologados separados; blocker presente
 *   T23-f: Sem colunas físicas → sem itens de kit; sem blocker de kit
 */

import { describe, it, expect } from "vitest";
import { buildBOM, generateProposalDiagnostics } from "@/lib/bom";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import { generatePhysicalColumns, type PhysicalColumn } from "@/lib/layout/laterais";
import type { BOMInput } from "@/lib/bom";
import type { ConstructabilityReport } from "@/lib/layout/constructability";
import type { TuboCandidato, SelecaoTubo } from "@/lib/hydraulics/hazenWilliams";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING  = ASPERSOR_PADRAO.espacamentoPadraoM; // 12 m
const M_PER_LAT = 111320;
const M_PER_LNG = M_PER_LAT * Math.cos((-12.0 * Math.PI) / 180);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeGrid(cols: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      pts.push([
        CENTROID.lng + ((c - (cols - 1) / 2) * SPACING) / M_PER_LNG,
        CENTROID.lat + ((r - (rows - 1) / 2) * SPACING) / M_PER_LAT,
      ]);
    }
  }
  return pts;
}

const EMPTY_CONSTRUCTABILITY: ConstructabilityReport = {
  controlPoints: [],
  columnDiagnostics: [],
  controlPointsCount: 0,
  pendingControlPointsCount: 0,
  independentFeedRequiredCount: 0,
  constructabilityStatus: "ok",
};

/** Constrói um PhysicalColumn mínimo com DN e contagem de aspersores especificados. */
function makePhysicalColumn(id: string, index: number, dnMm: number, sprinklerCount: number): PhysicalColumn {
  // Encontrar tubo no catálogo LF para o DN solicitado (pode ser qualquer DN, inclusive DN100)
  const tuboCat = TUBOS_PVC_LF.find((t) => t.diametroMm === dnMm);
  const tubo: TuboCandidato = tuboCat
    ? { ...tuboCat, custo: tuboCat.custo }
    : {
        // Fallback para DNs fora do catálogo LF (ex.: DN100 quando estamos testando edge cases)
        sku: `FAKE_LF_${dnMm}_PN40`,
        diametroMm: dnMm,
        diametroInternoMm: dnMm - 8,
        pressaoMca: 40,
        custo: 0,
        precoVenda: 0,
        coefC: 145,
      };

  const selecao: SelecaoTubo = {
    tubo,
    perdaCargaM: 1.0,
    velocidadeMs: 0.5,
    perdaCargaPercentual: 0.03,
  };

  const startLngLat: [number, number] = [CENTROID.lng, CENTROID.lat - 0.001];
  const endLngLat: [number, number] = [CENTROID.lng, CENTROID.lat + 0.001];
  return {
    id,
    columnIndex: index,
    startLngLat,
    endLngLat,
    comprimentoM: sprinklerCount * SPACING,
    sprinklerCount,
    vazaoM3h: sprinklerCount * ASPERSOR_PADRAO.vazaoM3PorHora,
    selecao,
    sectorsTouched: [0],
    sprinklerIndices: Array.from({ length: sprinklerCount }, (_, i) => i),
    routeCoords: [startLngLat, endLngLat],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

/** Monta BOMInput mínimo para um conjunto de PhysicalColumns fornecido. */
function makeBOMInput(physicalColumns: PhysicalColumn[]): BOMInput {
  const totalSprinklers = physicalColumns.reduce((s, c) => s + c.sprinklerCount, 0);
  const vazaoTotal = totalSprinklers * ASPERSOR_PADRAO.vazaoM3PorHora;
  return {
    sprinklers: {
      count: totalSprinklers,
      vazaoProjetoM3PorHora: vazaoTotal,
      espacamentoM: SPACING,
    },
    sectorization: {
      setoresCount: 1,
      sectorIndices: Array(totalSprinklers).fill(0),
      vazaoPorSetorM3PorHora: vazaoTotal,
    },
    mainPipeline: { lengthMeters: 100, segments: 2 },
    physicalColumns,
    laterais: [],
    secondaries: [],
    constructability: EMPTY_CONSTRUCTABILITY,
  };
}

function makeMinimalLayout(sprinklerCount = 6): ProjectLayout {
  return {
    schemaVersion: "1",
    sprinklers: {
      count: sprinklerCount,
      positions: [],
      gridAngleDegrees: 0,
      espacamentoM: SPACING,
      vazaoProjetoM3PorHora: sprinklerCount * ASPERSOR_PADRAO.vazaoM3PorHora,
    },
    sectorization: { setoresCount: 1, sectorIndices: [] },
    mainPipeline: { lengthMeters: 100, segments: 2 },
    centroid: CENTROID,
  } as unknown as ProjectLayout;
}

// ─────────────────────────────────────────────────────────────────────────────
// T23-a — Lateral DN50: 3 itens de kit; 1 tubo de subida por aspersor; sem pending de kit
// ─────────────────────────────────────────────────────────────────────────────

describe("T23-a — Lateral DN50: kit resolvido", () => {
  // Grid 2×3 = 6 aspersores, 2 colunas. Cada coluna: 3 asp × 1,5 m³/h = 4,5 m³/h → DN50 natural.
  const positions = makeGrid(2, 3);
  const physCols = generatePhysicalColumns(
    positions, 0, CENTROID, SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );

  const bom = buildBOM(makeBOMInput(physCols));

  it("kit DN50 presente: SKU 1819000 (luva)", () => {
    const item = bom.itens.find((i) => i.sku === "1819000");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(6);
    expect(item!.precoUnitario).toBe(6.00);
  });

  it("kit DN50 presente: SKU 1000843 (tubo de subida) — 1 por aspersor, não ceil(6/2)=3", () => {
    const item = bom.itens.find((i) => i.sku === "1000843");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(6); // 6 aspersores × 1 unid, não ceil/2
    expect(item!.precoUnitario).toBe(30.25);
  });

  it("kit DN50 presente: SKU 1000354 (tê DN50)", () => {
    const item = bom.itens.find((i) => i.sku === "1000354");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(6);
    expect(item!.precoUnitario).toBe(15.00);
  });

  it("sem pending tee_90_aspersor_lateral", () => {
    const teesPendentes = bom.meta.conexoesFisicasPendentes.filter(
      (c) => c.tipo === "tee_90_aspersor_lateral",
    );
    expect(teesPendentes.length).toBe(0);
  });

  it("kitAspersorResolvCount === 6; kitAspersorDnNaoHomologadoCount === 0", () => {
    expect(bom.meta.kitAspersorResolvCount).toBe(6);
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(0);
  });

  it("sem blocker de kit no diagnóstico", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(6), bom);
    const kitBlocker = diag.blockers.find((b) => b.includes("DN de lateral não homologado"));
    expect(kitBlocker).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T23-b — Lateral DN75: 4 itens de kit com SKUs corretos
// ─────────────────────────────────────────────────────────────────────────────

describe("T23-b — Lateral DN75: kit resolvido", () => {
  // Coluna DN75 com 7 aspersores (construída manualmente — força DN75)
  const physCols = [makePhysicalColumn("col-0", 0, 75, 7)];
  const bom = buildBOM(makeBOMInput(physCols));

  it("kit DN75 presente: SKU 1819000 (luva)", () => {
    const item = bom.itens.find((i) => i.sku === "1819000");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(7);
    expect(item!.precoUnitario).toBe(6.00);
  });

  it("kit DN75 presente: SKU 1000843 (tubo de subida)", () => {
    const item = bom.itens.find((i) => i.sku === "1000843");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(7);
  });

  it("kit DN75 presente: SKU 132789 (tê PTI DN75×1\")", () => {
    const item = bom.itens.find((i) => i.sku === "132789");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(7);
    expect(item!.precoUnitario).toBe(36.75);
  });

  it("kit DN75 presente: SKU 1464000 (bucha 1\"×3/4\")", () => {
    const item = bom.itens.find((i) => i.sku === "1464000");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(7);
    expect(item!.precoUnitario).toBe(5.70);
  });

  it("kitAspersorResolvCount === 7; sem blocker de kit", () => {
    expect(bom.meta.kitAspersorResolvCount).toBe(7);
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(0);
    const diag = generateProposalDiagnostics(makeMinimalLayout(7), bom);
    const kitBlocker = diag.blockers.find((b) => b.includes("DN de lateral não homologado"));
    expect(kitBlocker).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T23-c — Lateral DN100: blocker específico
// ─────────────────────────────────────────────────────────────────────────────

describe("T23-c — Lateral DN100: blocker de kit", () => {
  const physCols = [makePhysicalColumn("col-0", 0, 100, 5)];
  const bom = buildBOM(makeBOMInput(physCols));

  it("kitAspersorDnNaoHomologadoCount === 5; kitAspersorResolvCount === 0", () => {
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(5);
    expect(bom.meta.kitAspersorResolvCount).toBe(0);
  });

  it("sem SKU 1000354, 132789 ou 1464000 em itens (kit não resolvido)", () => {
    expect(bom.itens.find((i) => i.sku === "1000354")).toBeUndefined();
    expect(bom.itens.find((i) => i.sku === "132789")).toBeUndefined();
    expect(bom.itens.find((i) => i.sku === "1464000")).toBeUndefined();
  });

  it("blocker começa com 'BOM incompleta — DN de lateral não homologado para kit do aspersor 5022'", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(5), bom);
    const kitBlocker = diag.blockers.find((b) =>
      b.startsWith("BOM incompleta — DN de lateral não homologado para kit do aspersor 5022"),
    );
    expect(kitBlocker).toBeDefined();
    expect(kitBlocker).toContain("5 aspersor(es)");
  });

  it("blocker de kit é filtrado pelo optimizer (começa com 'BOM incompleta')", () => {
    // Verificar que o prefixo está correto para o filtro do optimizer
    const diag = generateProposalDiagnostics(makeMinimalLayout(5), bom);
    const kitBlocker = diag.blockers.find((b) =>
      b.includes("DN de lateral não homologado"),
    );
    expect(kitBlocker?.startsWith("BOM incompleta")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T23-d — Mix DN50 + DN75: itens agrupados por SKU
// ─────────────────────────────────────────────────────────────────────────────

describe("T23-d — Mix DN50 (3 asp) + DN75 (7 asp): agrupamento por SKU", () => {
  const physCols = [
    makePhysicalColumn("col-0", 0, 50, 3),
    makePhysicalColumn("col-1", 1, 75, 7),
  ];
  const bom = buildBOM(makeBOMInput(physCols));

  it("1819000 (luva) qty = 3 + 7 = 10", () => {
    const item = bom.itens.find((i) => i.sku === "1819000");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(10);
  });

  it("1000843 (tubo subida) qty = 3 + 7 = 10", () => {
    const item = bom.itens.find((i) => i.sku === "1000843");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(10);
  });

  it("1000354 (tê DN50) qty = 3", () => {
    const item = bom.itens.find((i) => i.sku === "1000354");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(3);
  });

  it("132789 (tê DN75 PTI) qty = 7", () => {
    const item = bom.itens.find((i) => i.sku === "132789");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(7);
  });

  it("1464000 (bucha DN75) qty = 7", () => {
    const item = bom.itens.find((i) => i.sku === "1464000");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(7);
  });

  it("kitAspersorResolvCount === 10; kitAspersorDnNaoHomologadoCount === 0; sem blocker de kit", () => {
    expect(bom.meta.kitAspersorResolvCount).toBe(10);
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(0);
    const diag = generateProposalDiagnostics(makeMinimalLayout(10), bom);
    expect(diag.blockers.find((b) => b.includes("DN de lateral não homologado"))).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T23-e — Mix DN50 (5 asp) + DN100 (3 asp): resolvidos e bloqueados separados
// ─────────────────────────────────────────────────────────────────────────────

describe("T23-e — Mix DN50 (5 asp) + DN100 (3 asp): parcialmente bloqueado", () => {
  const physCols = [
    makePhysicalColumn("col-0", 0, 50, 5),
    makePhysicalColumn("col-1", 1, 100, 3),
  ];
  const bom = buildBOM(makeBOMInput(physCols));

  it("kitAspersorResolvCount === 5 (DN50); kitAspersorDnNaoHomologadoCount === 3 (DN100)", () => {
    expect(bom.meta.kitAspersorResolvCount).toBe(5);
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(3);
  });

  it("1000354 (tê DN50) qty = 5 — apenas aspersores DN50 resolvidos", () => {
    const item = bom.itens.find((i) => i.sku === "1000354");
    expect(item).toBeDefined();
    expect(item!.quantidade).toBe(5);
  });

  it("blocker presente para DN100", () => {
    const diag = generateProposalDiagnostics(makeMinimalLayout(8), bom);
    const kitBlocker = diag.blockers.find((b) =>
      b.startsWith("BOM incompleta — DN de lateral não homologado"),
    );
    expect(kitBlocker).toBeDefined();
    expect(kitBlocker).toContain("3 aspersor(es)");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T23-f — Sem colunas físicas: sem itens de kit; sem blocker de kit
// ─────────────────────────────────────────────────────────────────────────────

describe("T23-f — Sem colunas físicas: edge case", () => {
  // physicalColumns vazio — sprinklers.count = 0 para consistência
  const bom = buildBOM({
    sprinklers: {
      count: 0,
      vazaoProjetoM3PorHora: 0,
      espacamentoM: SPACING,
    },
    sectorization: {
      setoresCount: 1,
      sectorIndices: [],
      vazaoPorSetorM3PorHora: 0,
    },
    mainPipeline: { lengthMeters: 100, segments: 2 },
    physicalColumns: [],
    laterais: [],
    secondaries: [],
    constructability: EMPTY_CONSTRUCTABILITY,
  });

  it("kitAspersorResolvCount === 0; kitAspersorDnNaoHomologadoCount === 0", () => {
    expect(bom.meta.kitAspersorResolvCount).toBe(0);
    expect(bom.meta.kitAspersorDnNaoHomologadoCount).toBe(0);
  });

  it("sem itens de kit em itens da BOM", () => {
    const kitSkus = ["1819000", "1000843", "1000354", "132789", "1464000"];
    for (const sku of kitSkus) {
      expect(bom.itens.find((i) => i.sku === sku)).toBeUndefined();
    }
  });

  it("sem blocker de kit no diagnóstico", () => {
    const layout = makeMinimalLayout(0);
    const diag = generateProposalDiagnostics(layout, bom);
    expect(diag.blockers.find((b) => b.includes("DN de lateral não homologado"))).toBeUndefined();
  });
});
