import { describe, it, expect } from "vitest";
import {
  selectRegistroSecao,
  REGISTROS_SECAO_MANUAL,
  ASPERSOR_PADRAO,
  TUBOS_PVC_LF,
} from "@/lib/catalog/aspersores";
import { buildBOM } from "@/lib/bom";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import type { ConstructabilityReport, ControlPoint } from "@/lib/layout/constructability";

// ── Helpers ──────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM;

function makeGrid(cols: number, rows: number): [number, number][] {
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);
  const positions: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const xM = (c - (cols - 1) / 2) * SPACING;
      const yM = (r - (rows - 1) / 2) * SPACING;
      positions.push([CENTROID.lng + xM / mPerLng, CENTROID.lat + yM / 111320]);
    }
  }
  return positions;
}

function makeSectorIndices(cols: number, rows: number, nSectors: number): number[] {
  const indices: number[] = [];
  for (let c = 0; c < cols; c++) {
    const sectorId = Math.floor((c * Math.min(nSectors, cols)) / cols);
    for (let r = 0; r < rows; r++) indices.push(sectorId);
  }
  return indices;
}

function makeConstructabilityWithSV(
  sectionValveCount: number,
  physicalColumnId = "col-1",
): ConstructabilityReport {
  const sectionValves: ControlPoint[] = Array.from({ length: sectionValveCount }, (_, i) => ({
    id: `sv-${i}`,
    physicalColumnId,
    operationalSegmentId: "seg-1",
    sectorId: 0,
    coordinate: [-46.0, -12.0] as [number, number],
    type: "section_valve" as const,
    status: "pending" as const,
  }));
  const inlet: ControlPoint = {
    id: "inlet-0",
    physicalColumnId,
    operationalSegmentId: "seg-0",
    sectorId: 0,
    coordinate: [-46.0, -12.0],
    type: "lateral_inlet",
    status: "pending",
  };
  const controlPoints = [inlet, ...sectionValves];
  return {
    controlPoints,
    columnDiagnostics: [],
    controlPointsCount: controlPoints.length,
    pendingControlPointsCount: sectionValves.length,
    independentFeedRequiredCount: 0,
    constructabilityStatus: sectionValveCount > 0 ? "pending_control_validation" : "ok",
  };
}

function makeBOMInputWithSV(sectionValveCount: number) {
  const COLS = 3, ROWS = 4;
  const positions = makeGrid(COLS, ROWS);
  const sectorIndices = makeSectorIndices(COLS, ROWS, 2);
  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID,
    SPACING,
    { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  const vazaoPorSetor = ASPERSOR_PADRAO.vazaoM3PorHora * (COLS * ROWS) / 2;
  return {
    sprinklers: {
      count: positions.length,
      vazaoProjetoM3PorHora: positions.length * ASPERSOR_PADRAO.vazaoM3PorHora,
      espacamentoM: SPACING,
    },
    sectorization: { setoresCount: 2, sectorIndices, vazaoPorSetorM3PorHora: vazaoPorSetor },
    mainPipeline: { lengthMeters: (COLS - 1) * SPACING, segments: COLS - 1, adutora: undefined },
    physicalColumns: physCols,
    laterais: [],
    secondaries: [],
    constructability: makeConstructabilityWithSV(sectionValveCount),
  };
}

// ── Testes unitários: selectRegistroSecao ────────────────────────────────────

describe("selectRegistroSecao — seleção por diâmetro", () => {
  it("retorna SKU 4209000 (AZUL DN32) para diâmetro 32mm", () => {
    const r = selectRegistroSecao(32);
    expect(r?.sku).toBe("4209000");
  });

  it("retorna SKU 4208000 (AZUL DN35) para diâmetro 35mm", () => {
    const r = selectRegistroSecao(35);
    expect(r?.sku).toBe("4208000");
  });

  it("retorna SKU 1002326 (AZUL DN50) para diâmetro 50mm", () => {
    const r = selectRegistroSecao(50);
    expect(r?.sku).toBe("1002326");
  });

  it("retorna SKU 1001994 (AZUL DN75) para diâmetro 75mm", () => {
    const r = selectRegistroSecao(75);
    expect(r?.sku).toBe("1001994");
  });

  it("retorna SKU 1002327 (AZUL DN100) para diâmetro 100mm", () => {
    const r = selectRegistroSecao(100);
    expect(r?.sku).toBe("1002327");
  });

  it("retorna undefined para diâmetro sem match (200mm)", () => {
    expect(selectRegistroSecao(200)).toBeUndefined();
  });

  it("nunca retorna item com prioridade alternativa", () => {
    for (let d = 0; d <= 200; d++) {
      const r = selectRegistroSecao(d);
      if (r) expect(r.prioridade).toBe("primario");
    }
  });

  it("DN32 PREDIALL (alternativa) não é retornado por selectRegistroSecao", () => {
    const r = selectRegistroSecao(32);
    expect(r?.sku).not.toBe("1000962");
  });
});

// ── Testes de integridade do catálogo ────────────────────────────────────────

describe("REGISTROS_SECAO_MANUAL — integridade dos dados", () => {
  it("todos os itens têm classePressao PN80 e pressaoNominalMca 80", () => {
    for (const r of REGISTROS_SECAO_MANUAL) {
      expect(r.classePressao).toBe("PN80");
      expect(r.pressaoNominalMca).toBe(80);
    }
  });

  it("todos os itens têm fontePressao homologacao_interna_brasmaquinas", () => {
    for (const r of REGISTROS_SECAO_MANUAL) {
      expect(r.fontePressao).toBe("homologacao_interna_brasmaquinas");
    }
  });

  it("todos os itens têm margem positiva (precoVenda > custo)", () => {
    for (const r of REGISTROS_SECAO_MANUAL) {
      expect(r.precoVenda).toBeGreaterThan(r.custo);
    }
  });
});

// ── Testes de integração: buildBOM com section_valves ────────────────────────

describe("buildBOM — registros manuais de seção", () => {
  it("valvulasResolvidasCount = N quando todos section_valve têm coluna mapeada", () => {
    const bom = buildBOM(makeBOMInputWithSV(2));
    expect(bom.meta.valvulasResolvidasCount).toBe(2);
  });

  it("registrosManuaisSecaoCount = valvulasResolvidasCount", () => {
    const bom = buildBOM(makeBOMInputWithSV(2));
    expect(bom.meta.registrosManuaisSecaoCount).toBe(bom.meta.valvulasResolvidasCount);
  });

  it("itens de registro VIQUA aparecem na BOM com categoria CONEXAO", () => {
    const bom = buildBOM(makeBOMInputWithSV(2));
    const registerItems = bom.itens.filter((i) => i.marca === "VIQUA" && i.categoria === "CONEXAO");
    expect(registerItems.length).toBeGreaterThan(0);
  });

  it("totalGeral inclui o custo dos registros de seção", () => {
    const bomSem = buildBOM(makeBOMInputWithSV(0));
    const bomCom = buildBOM(makeBOMInputWithSV(2));
    expect(bomCom.totalGeral).toBeGreaterThan(bomSem.totalGeral);
  });
});
