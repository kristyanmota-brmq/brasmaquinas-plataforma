import { describe, it, expect } from "vitest";
import { velocity } from "@/lib/hydraulics/hazenWilliams";
import { selectTubo, ASPERSOR_5022_SD_40X18, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

// ── Constantes ───────────────────────────────────────────────────────────────

const MAX_VEL_PRINCIPAL_MS = 1.5;
const CENTROID = { lng: -46.0, lat: -12.0 };
const SPACING = ASPERSOR_5022_SD_40X18.espacamentoPadraoM;  // 12 m
const VAZ = ASPERSOR_5022_SD_40X18.vazaoM3PorHora;           // 1,5 m³/h

// Q = 23 × 1,5 = 34,5 m³/h — flow exato do caso reportado
const N_ASP = 23;
const Q_SETOR = N_ASP * VAZ;  // 34,5 m³/h

// Catálogo PVC Rígido — diâmetros internos reais
//   DN100: Dint = 88mm  → velocity(34.5, 88) = 1,576 m/s > 1,5 → deve ser rejeitado
//   DN125: Dint = 111mm → velocity(34.5, 111) = 0,990 m/s ≤ 1,5 → deve ser selecionado

// ── Dados (sem lógica de domínio) ────────────────────────────────────────────

describe("principal-velocity-gate — dados de referência", () => {
  it("velocity(34.5, Dint=88mm) > 1,5 m/s — DN100 falha com diâmetro interno", () => {
    expect(velocity(Q_SETOR, 88)).toBeGreaterThan(MAX_VEL_PRINCIPAL_MS);
  });

  it("velocity(34.5, Dint=111mm) ≤ 1,5 m/s — DN125 passa com diâmetro interno", () => {
    expect(velocity(Q_SETOR, 111)).toBeLessThanOrEqual(MAX_VEL_PRINCIPAL_MS);
  });
});

// ── selectTubo (BOM) ─────────────────────────────────────────────────────────

describe("selectTubo — seleção por diâmetro interno", () => {
  it("Q=34,5 → DN125 (DN100 Dint=88mm < D_min=90,2mm)", () => {
    expect(selectTubo(Q_SETOR).diametroMm).toBe(125);
  });

  it("Q=30 → DN100 ainda selecionado (Dint=88mm ≥ 84,1mm; v=1,37 ≤ 1,5)", () => {
    expect(selectTubo(30).diametroMm).toBe(100);
  });

  it("Q=0,1 → DN50 (fluxo mínimo — menor tubo do catálogo)", () => {
    expect(selectTubo(0.1).diametroMm).toBe(50);
  });

  it("Q=34,5 → velocity(Q, Dint do tubo selecionado) ≤ 1,5 m/s", () => {
    const tubo = selectTubo(Q_SETOR);
    expect(velocity(Q_SETOR, tubo.diametroInternoMm)).toBeLessThanOrEqual(MAX_VEL_PRINCIPAL_MS);
  });
});

// ── Integração: solver não bloqueia adutora/principal para Q=34,5 ────────────

function makeLayout34_5(): ProjectLayout {
  const mPerLng = 111320 * Math.cos((CENTROID.lat * Math.PI) / 180);

  // Coluna única de N_ASP aspersores → 1 setor → Q por setor = 34,5 m³/h
  const positions: [number, number][] = Array.from({ length: N_ASP }, (_, i) => [
    CENTROID.lng,
    CENTROID.lat + (i * SPACING) / 111320,
  ]);

  const waterSource: [number, number] = [
    CENTROID.lng - (5 * SPACING) / mPerLng,
    CENTROID.lat,
  ];
  const principalStart: [number, number] = [CENTROID.lng, CENTROID.lat];
  const principalEnd: [number, number] = [
    CENTROID.lng,
    CENTROID.lat + ((N_ASP - 1) * SPACING) / 111320,
  ];

  return {
    centroid: CENTROID,
    waterSource: { lng: waterSource[0], lat: waterSource[1] },
    sprinklers: {
      aspersorId: ASPERSOR_5022_SD_40X18.sku,
      positions,
      count: N_ASP,
      vazaoProjetoM3PorHora: N_ASP * VAZ,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: 1,
      tempoPorSetorMinutos: 60,
      aspersoresPorSetor: N_ASP,
      vazaoPorSetorM3PorHora: Q_SETOR,
      sectorIndices: Array(N_ASP).fill(0),
    },
    mainPipeline: {
      coordinates: [principalStart, principalEnd],
      adutora: [waterSource, principalStart],
      lengthMeters: (N_ASP - 1) * SPACING,
      segments: N_ASP - 1,
      source: "auto",
    },
  } as unknown as ProjectLayout;
}

describe("integração — solver não bloqueia adutora/principal para Q=34,5 m³/h", () => {
  const layout = makeLayout34_5();
  const result = calculateIrrigationProject(layout);

  it("resultado está completo (isComplete = true)", () => {
    expect(result.isComplete).toBe(true);
  });

  it("hydraulics calculado (não null)", () => {
    expect(result.hydraulics).not.toBeNull();
  });

  it("nenhum segmento adutora/principal em invalidSegments", () => {
    const invalids = result.hydraulics?.validation.invalidSegments ?? [];
    const principalOrAdutora = invalids.filter(
      (s) => s.type === "principal" || s.type === "adutora",
    );
    expect(principalOrAdutora).toHaveLength(0);
  });

  it("BOM usa o mesmo diâmetro que o solver — DN125 (diametroMm=125)", () => {
    // BOM: selectTubo(Q_SETOR)
    const bomTube = selectTubo(Q_SETOR);
    // Solver: segmento adutora — sempre presente e usa o mesmo tubo que a principal
    const adutoraSeg = result.hydraulics?.allSegments.find((s) => s.type === "adutora");
    expect(bomTube.diametroMm).toBe(125);
    expect(adutoraSeg?.diametroMm).toBe(125);
    expect(bomTube.diametroMm).toBe(adutoraSeg?.diametroMm);
  });
});
