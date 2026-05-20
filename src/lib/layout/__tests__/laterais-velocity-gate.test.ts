import { describe, it, expect } from "vitest";
import { velocity, headLoss, type TuboCandidato } from "@/lib/hydraulics/hazenWilliams";
import { TUBOS_PVC_LF, ASPERSOR_PADRAO } from "@/lib/catalog/aspersores";
import {
  generatePhysicalColumns,
  generateLateraisLegacyForDebug,
  deriveLateraisFromNetwork,
  christiansenF,
  type PhysicalColumn,
} from "@/lib/layout/laterais";
import type { OperationalSegment } from "@/lib/layout/sectorization";

// ── Constantes ───────────────────────────────────────────────────────────────

const PRESSAO_SERVICO = ASPERSOR_PADRAO.pressaoServicoMca;  // 30 mca
const MAX_VEL_LATERAL = 2.5;
const SPACING = 12;
const CENTROID = { lng: -46.0, lat: -12.0 };
const ASPERSOR_MIN = { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: PRESSAO_SERVICO };

// DN50 LF: Dint=46mm — com Q=15 m³/h → v = 2,508 m/s (> 2,5 → gate rejeita)
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
  it("n=10: velocidade DN50 com Dint=46mm = 2,508 m/s > 2,5 → seleciona DN75", () => {
    const positions = makePositions(10);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    expect(cols[0].selecao.tubo.sku).toBe("DN75");
  });

  it("n=5: Q=7,5 m³/h — DN50 Dint=46mm passa nos dois gates → DN50 permanece", () => {
    const positions = makePositions(5);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    expect(cols[0].selecao.tubo.sku).toBe("DN50");
  });

  it("velocidadeMs armazenada usa Dint, não diâmetro nominal", () => {
    const n = 10;
    const positions = makePositions(n);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    const col = cols[0];
    // DN75 selecionado: Dint=69mm ≠ nominal 75mm
    const velComDint     = velocity(col.vazaoM3h, 69);
    const velComNominal  = velocity(col.vazaoM3h, 75);
    expect(col.selecao.velocidadeMs).toBeCloseTo(velComDint, 4);
    expect(col.selecao.velocidadeMs).not.toBeCloseTo(velComNominal, 3);
  });

  it("perdaCargaM armazenada usa Dint, não diâmetro nominal", () => {
    const n = 10;
    const positions = makePositions(n);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    const col = cols[0];
    const comprimentoM = (n - 1) * SPACING + 0.5;
    const F = christiansenF(n);
    const hfComDint    = headLoss(col.vazaoM3h, comprimentoM, 69, DN75.coefC) * F;
    const hfComNominal = headLoss(col.vazaoM3h, comprimentoM, 75, DN75.coefC) * F;
    expect(col.selecao.perdaCargaM).toBeCloseTo(hfComDint, 4);
    expect(col.selecao.perdaCargaM).not.toBeCloseTo(hfComNominal, 3);
  });

  it("velocidadeMs do tubo selecionado ≤ 2,5 m/s (gate passa)", () => {
    const positions = makePositions(10);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING, ASPERSOR_MIN, CATALOG_2,
    );
    expect(cols[0].selecao.velocidadeMs).toBeLessThanOrEqual(MAX_VEL_LATERAL);
  });

  it("generateLateraisLegacyForDebug n=10 → mesmo tubo que generatePhysicalColumns", () => {
    const positions = makePositions(10);
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

  it("deriveLateraisFromNetwork n=10 → mesmo tubo e mesmos valores que generatePhysicalColumns", () => {
    const n = 10;
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
      [physCol], [seg], positions, SPACING, ASPERSOR_MIN, CATALOG_2,
    );

    expect(laterais[0].selecao.tubo.sku).toBe(cols[0].selecao.tubo.sku);
    expect(laterais[0].selecao.velocidadeMs).toBeCloseTo(cols[0].selecao.velocidadeMs, 4);
    expect(laterais[0].selecao.perdaCargaM).toBeCloseTo(cols[0].selecao.perdaCargaM, 4);
  });

  it("com TUBOS_PVC_LF real e ASPERSOR_PADRAO: n=10 seleciona diâmetro ≥ 75mm", () => {
    // DN50 real (Dint=46mm) → v = 2,508 m/s → rejeitado; espera DN75 ou maior
    const positions = makePositions(10);
    const cols = generatePhysicalColumns(
      positions, 0, CENTROID, SPACING,
      { vazao: ASPERSOR_PADRAO.vazaoM3PorHora, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
      TUBOS_PVC_LF,
    );
    expect(cols[0].selecao.tubo.diametroMm).toBeGreaterThanOrEqual(75);
    expect(cols[0].selecao.velocidadeMs).toBeLessThanOrEqual(MAX_VEL_LATERAL);
  });
});
