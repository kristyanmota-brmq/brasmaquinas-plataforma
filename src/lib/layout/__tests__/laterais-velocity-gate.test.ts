import { describe, it, expect } from "vitest";
import { velocity, headLoss, type TuboCandidato } from "@/lib/hydraulics/hazenWilliams";
import { TUBOS_PVC_LF, ASPERSOR_5022_SD_40X18 } from "@/lib/catalog/aspersores";
import {
  generatePhysicalColumns,
  generateLateraisLegacyForDebug,
  deriveLateraisFromNetwork,
  christiansenF,
  type PhysicalColumn,
} from "@/lib/layout/laterais";
import type { OperationalSegment } from "@/lib/layout/sectorization";

// ── Constantes ───────────────────────────────────────────────────────────────

// TASK-082: fixtures de física calibradas no 5022 bocal 4.0x1.8 (1,5 m³/h)
// — entrada PRESERVADA do catálogo; o padrão da empresa mudou para 3.0x1.8.
const PRESSAO_SERVICO = ASPERSOR_5022_SD_40X18.pressaoServicoMca;  // 30 mca
const MAX_VEL_LATERAL = 2.5;
const SPACING = 12;
const CENTROID = { lng: -46.0, lat: -12.0 };
const ASPERSOR_MIN = { vazao: ASPERSOR_5022_SD_40X18.vazaoM3PorHora, pressaoServico: PRESSAO_SERVICO };

// DN50 LF: Dint=46mm (fixture sintética) — com Q=15 m³/h → v = 2,508 m/s (> 2,5)
const DN50: TuboCandidato = { sku: "DN50", diametroMm: 50, diametroInternoMm: 46, coefC: 145, pressaoMca: 40, custo: 1, precoVenda: 1 };
// DN75 LF: Dint=69mm — com Q=15 m³/h → v = 1,114 m/s (< 2,5 → aprovado)
const DN75: TuboCandidato = { sku: "DN75", diametroMm: 75, diametroInternoMm: 69, coefC: 145, pressaoMca: 40, custo: 1, precoVenda: 1 };
const CATALOG_2: TuboCandidato[] = [DN50, DN75];

/** Coluna única de n aspersores espaçados por SPACING m no eixo lat. */
function makePositions(n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => [
    CENTROID.lng,
    CENTROID.lat + (i * SPACING) / 111320,
  ]);
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe("selectLateralTube — gate de velocidade com diâmetro interno", () => {
  it("n=10 (TASK-083): 15 m³/h não cabe em DN50 (fixture Dint 46) → coluna DIVIDE em 2 laterais DN50 válidas", () => {
    const positions = makePositions(10);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    // Lateral única DN50 PN40 (ordem do RT): sem upgrade de diâmetro — o
    // sistema responde dividindo a coluna em laterais que cabem.
    expect(cols.length).toBeGreaterThanOrEqual(2);
    for (const c of cols) {
      expect(c.selecao.tubo.sku).toBe("DN50");
      expect(c.lateralCapacity.ok).toBe(true);
      expect(c.selecao.velocidadeMs).toBeLessThanOrEqual(MAX_VEL_LATERAL);
    }
  });

  it("n=5: Q=7,5 m³/h — DN50 Dint=46mm passa nos dois gates → DN50 permanece", () => {
    const positions = makePositions(5);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    expect(cols[0].selecao.tubo.sku).toBe("DN50");
  });

  it("velocidadeMs armazenada usa Dint, não diâmetro nominal", () => {
    const n = 5; // TASK-083: sem split (cabe em DN50) — invariante Dint puro
    const positions = makePositions(n);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    const col = cols[0];
    // TASK-083: DN50 sempre — Dint=46mm ≠ nominal 50mm
    const velComDint     = velocity(col.vazaoM3h, 46);
    const velComNominal  = velocity(col.vazaoM3h, 50);
    expect(col.selecao.velocidadeMs).toBeCloseTo(velComDint, 4);
    expect(col.selecao.velocidadeMs).not.toBeCloseTo(velComNominal, 3);
  });

  it("perdaCargaM armazenada usa Dint, não diâmetro nominal", () => {
    const n = 5; // TASK-083: sem split (cabe em DN50)
    const positions = makePositions(n);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    const col = cols[0];
    const comprimentoM = col.comprimentoM;
    const F = christiansenF(col.sprinklerCount);
    const hfComDint    = headLoss(col.vazaoM3h, comprimentoM, 46, DN50.coefC) * F;
    const hfComNominal = headLoss(col.vazaoM3h, comprimentoM, 50, DN50.coefC) * F;
    // TASK-083: telescopia revogada — perdaCargaM = cálculo Dint puro do DN50.
    expect(col.selecao.perdaCargaM).toBeCloseTo(hfComDint, 4);
    expect(col.selecao.perdaCargaM).not.toBeCloseTo(hfComNominal, 3);
  });

  it("velocidadeMs do tubo selecionado ≤ 2,5 m/s quando a lateral CABE (n=5)", () => {
    const positions = makePositions(5);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    expect(cols[0].selecao.velocidadeMs).toBeLessThanOrEqual(MAX_VEL_LATERAL);
  });

  it("generateLateraisLegacyForDebug n=5 → mesmo tubo que generatePhysicalColumns", () => {
    // TASK-083: n=5 cabe em DN50 sem split — caminho legacy não divide colunas.
    const positions = makePositions(5);
    const sectorIds = positions.map(() => 0);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    const laterais = generateLateraisLegacyForDebug(
      positions, sectorIds, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    expect(laterais[0].selecao.tubo.sku).toBe(cols[0].selecao.tubo.sku);
    expect(laterais[0].selecao.velocidadeMs).toBeCloseTo(cols[0].selecao.velocidadeMs, 4);
  });

  it("deriveLateraisFromNetwork n=5 → mesmo tubo e mesmos valores que generatePhysicalColumns", () => {
    const n = 5; // TASK-083: sem split
    const positions = makePositions(n);
    const sprinklerIndices = Array.from({ length: n }, (_, i) => i);

    const physCol: PhysicalColumn = {
      id: "col-0",
      columnIndex: 0,
      startLngLat: positions[0],
      endLngLat: positions[n - 1],
      comprimentoM: (n - 1) * SPACING + 0.5,
      sprinklerCount: n,
      vazaoM3h: n * ASPERSOR_MIN.vazao,
      selecao: { tubo: DN50, perdaCargaM: 0, velocidadeMs: 0, perdaCargaPercentual: 0 },
      sectorsTouched: [0],
      sprinklerIndices,
      routeCoords: [positions[0], positions[n - 1]],
      lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
    };

    const seg: OperationalSegment = {
      id: "col-0-s0-0",
      physicalColumnId: "col-0",
      sectorId: 0,
      sprinklerIndices,
      sprinklerCount: n,
      vazaoM3h: n * ASPERSOR_MIN.vazao,
      requiresValveOrControlPoint: false,
      ordemNaLateral: 0,
    };

    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    const laterais = deriveLateraisFromNetwork(
      [physCol], [seg], positions, SPACING, ASPERSOR_MIN, CATALOG_2, 0, CENTROID,
    );

    expect(laterais[0].selecao.tubo.sku).toBe(cols[0].selecao.tubo.sku);
    expect(laterais[0].selecao.velocidadeMs).toBeCloseTo(cols[0].selecao.velocidadeMs, 4);
    expect(laterais[0].selecao.perdaCargaM).toBeCloseTo(cols[0].selecao.perdaCargaM, 4);
  });

  it("com TUBOS_PVC_LF real e 5022 4.0x1.8 (1,5 m³/h): n=12 divide e TODAS as laterais são DN50 (TASK-083/084)", () => {
    // TASK-084: Dint REAL do DN50 PN40 = 48,1 mm → capacidade ~16,3 m³/h a
    // 2,5 m/s; n=12 (18 m³/h) não cabe → divide; nenhuma lateral sobe de DN.
    const positions = makePositions(12);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING,
      { vazao: ASPERSOR_5022_SD_40X18.vazaoM3PorHora, pressaoServico: ASPERSOR_5022_SD_40X18.pressaoServicoMca },
      TUBOS_PVC_LF,
    );
    expect(cols.length).toBeGreaterThanOrEqual(2);
    for (const c of cols) {
      expect(c.selecao.tubo.diametroMm).toBe(50);
      expect(c.selecao.velocidadeMs).toBeLessThanOrEqual(MAX_VEL_LATERAL);
    }
  });
});
