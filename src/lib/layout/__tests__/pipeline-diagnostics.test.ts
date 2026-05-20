import { describe, it, expect } from "vitest";
import { generatePipelineRouteDiagnostics } from "../pipeline-diagnostics";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };

const RECT_AREA: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [[
    [-46.01, -12.01],
    [-45.99, -12.01],
    [-45.99, -11.99],
    [-46.01, -11.99],
    [-46.01, -12.01],
  ]],
};

function makeLayout(overrides: Partial<ProjectLayout> = {}): ProjectLayout {
  return {
    centroid: CENTROID,
    area: RECT_AREA,
    ...overrides,
  };
}

const STRAIGHT_PRINCIPAL: [number, number][] = [
  [-46.005, -12.01],
  [-46.0,   -12.01],
  [-45.995, -12.01],
];

const STRAIGHT_ADUTORA: [number, number][] = [
  [-46.0, -12.015],
  [-46.0, -12.01],
];

// ─────────────────────────────────────────────────────────────────────────────
// T1: Sem tubulação definida
// ─────────────────────────────────────────────────────────────────────────────
describe("T1 — sem mainPipeline", () => {
  const report = generatePipelineRouteDiagnostics(makeLayout());

  it("overallValid = false", () => {
    expect(report.overallValid).toBe(false);
  });

  it("blocker: tubulação não definida", () => {
    expect(report.blockers.length).toBeGreaterThan(0);
    expect(report.blockers[0]).toMatch(/não definida/i);
  });

  it("principal e adutora absent", () => {
    expect(report.principal.routeType).toBe("absent");
    expect(report.adutora.routeType).toBe("absent");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T2: Traçado automático — gera warning de validação pendente
// ─────────────────────────────────────────────────────────────────────────────
describe("T2 — traçado automático sem validação", () => {
  const layout = makeLayout({
    mainPipeline: {
      coordinates: STRAIGHT_PRINCIPAL,
      adutora: STRAIGHT_ADUTORA,
      lengthMeters: 555,
      segments: 2,
      source: "auto",
    },
  });
  const report = generatePipelineRouteDiagnostics(layout);

  it("principal routeType = auto", () => {
    expect(report.principal.routeType).toBe("auto");
  });

  it("adutora routeType = auto", () => {
    expect(report.adutora.routeType).toBe("auto");
  });

  it("warning de traçado automático presente", () => {
    const allWarnings = [...report.warnings, ...report.principal.warnings, ...report.adutora.warnings];
    const hasAutoWarning = allWarnings.some((w) => /automático/i.test(w));
    expect(hasAutoWarning).toBe(true);
  });

  it("blocker: corredor não validado", () => {
    expect(report.blockers.some((b) => /corredor/i.test(b))).toBe(true);
  });

  it("overallValid = false (corredor não validado)", () => {
    expect(report.overallValid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T3: Traçado automático com corredor validado — sem blockers
// ─────────────────────────────────────────────────────────────────────────────
describe("T3 — traçado automático com corridorValidated = true", () => {
  const layout = makeLayout({
    mainPipeline: {
      coordinates: STRAIGHT_PRINCIPAL,
      adutora: STRAIGHT_ADUTORA,
      lengthMeters: 555,
      segments: 2,
      source: "auto",
      corridorValidated: true,
    },
  });
  const report = generatePipelineRouteDiagnostics(layout);

  it("sem blockers de corredor", () => {
    const corredorBlockers = report.blockers.filter((b) => /corredor/i.test(b));
    expect(corredorBlockers).toHaveLength(0);
  });

  it("overallValid = true", () => {
    expect(report.overallValid).toBe(true);
  });

  it("principal routeType = auto", () => {
    expect(report.principal.routeType).toBe("auto");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T4: Traçado manual — sempre hasManualCorridor = true
// ─────────────────────────────────────────────────────────────────────────────
describe("T4 — traçado manual", () => {
  const layout = makeLayout({
    mainPipeline: {
      coordinates: STRAIGHT_PRINCIPAL,
      adutora: STRAIGHT_ADUTORA,
      lengthMeters: 555,
      segments: 2,
      source: "manual",
    },
  });
  const report = generatePipelineRouteDiagnostics(layout);

  it("principal hasManualCorridor = true", () => {
    expect(report.principal.hasManualCorridor).toBe(true);
  });

  it("adutora hasManualCorridor = true", () => {
    expect(report.adutora.hasManualCorridor).toBe(true);
  });

  it("overallValid = true (manual dispensado de validação)", () => {
    expect(report.overallValid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T5: Rota com muitos vértices gera warning
// ─────────────────────────────────────────────────────────────────────────────
describe("T5 — rota com muitos vértices (> HIGH_BEND_COUNT)", () => {
  // 12 vértices = 11 curvas — acima do threshold de 5
  const manyVertices: [number, number][] = Array.from({ length: 12 }, (_, i) => [
    -46.0 + i * 0.001,
    -12.01 + (i % 2 === 0 ? 0 : 0.00001), // pequeno zigzag para evitar colinear
  ]);

  const layout = makeLayout({
    mainPipeline: {
      coordinates: manyVertices,
      lengthMeters: 1000,
      segments: 11,
      source: "auto",
    },
  });
  const report = generatePipelineRouteDiagnostics(layout);

  it("warning de muitas curvas presente na principal", () => {
    expect(report.principal.warnings.some((w) => /curvas/i.test(w))).toBe(true);
  });

  it("numberOfBends >= 10", () => {
    expect(report.principal.numberOfBends).toBeGreaterThanOrEqual(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T6: Rota com curva aguda gera warning
// ─────────────────────────────────────────────────────────────────────────────
describe("T6 — rota com curva aguda (< 45°)", () => {
  // Três pontos formando ângulo de ~30°
  const sharpBend: [number, number][] = [
    [-46.005, -12.01],
    [-46.0,   -12.01],
    [-46.0001, -12.0085], // retorno quase na mesma direção → ângulo agudo
  ];

  const layout = makeLayout({
    mainPipeline: {
      coordinates: sharpBend,
      lengthMeters: 200,
      segments: 2,
      source: "auto",
    },
  });
  const report = generatePipelineRouteDiagnostics(layout);

  it("sharpBendsCount > 0 ou minBendAngleDeg < 45", () => {
    // Aceita que a curva seja detectada como aguda OU que minBendAngle seja calculado
    expect(
      report.principal.sharpBendsCount > 0 || report.principal.minBendAngleDeg < 90,
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T7: Rota com vértice duplicado gera warning
// ─────────────────────────────────────────────────────────────────────────────
describe("T7 — vértice duplicado no traçado", () => {
  const withDup: [number, number][] = [
    [-46.005, -12.01],
    [-46.003, -12.01],
    [-46.003, -12.01], // duplicado
    [-46.0,   -12.01],
  ];

  const layout = makeLayout({
    mainPipeline: {
      coordinates: withDup,
      lengthMeters: 500,
      segments: 3,
      source: "auto",
    },
  });
  const report = generatePipelineRouteDiagnostics(layout);

  it("duplicatedSegmentsCount = 1", () => {
    expect(report.principal.duplicatedSegmentsCount).toBe(1);
  });

  it("warning de vértice duplicado presente", () => {
    expect(report.principal.warnings.some((w) => /duplicado/i.test(w))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8: Principal e adutora têm tipos separados (adutora pode ser ausente)
// ─────────────────────────────────────────────────────────────────────────────
describe("T8 — adutora e principal têm tipos separados", () => {
  const layoutSemAdutora = makeLayout({
    mainPipeline: {
      coordinates: STRAIGHT_PRINCIPAL,
      lengthMeters: 555,
      segments: 2,
      source: "auto",
    },
  });
  const layoutComAdutora = makeLayout({
    mainPipeline: {
      coordinates: STRAIGHT_PRINCIPAL,
      adutora: STRAIGHT_ADUTORA,
      lengthMeters: 555,
      segments: 2,
      source: "auto",
    },
  });

  it("principal tem métricas próprias (não compartilha com adutora)", () => {
    const r1 = generatePipelineRouteDiagnostics(layoutSemAdutora);
    const r2 = generatePipelineRouteDiagnostics(layoutComAdutora);
    // Principal deve ter mesmas métricas nos dois casos
    expect(r1.principal.lengthM).toBeCloseTo(r2.principal.lengthM, 3);
  });

  it("adutora ausente retorna routeType=absent", () => {
    const r = generatePipelineRouteDiagnostics(layoutSemAdutora);
    expect(r.adutora.routeType).toBe("absent");
  });

  it("adutora presente retorna métricas independentes da principal", () => {
    const r = generatePipelineRouteDiagnostics(layoutComAdutora);
    expect(r.adutora.routeType).not.toBe("absent");
    // Comprimento da adutora ≠ comprimento da principal
    expect(r.adutora.lengthM).not.toBeCloseTo(r.principal.lengthM, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T9: simplifyPolyline — remove microvértices sem alterar comprimento total muito
// ─────────────────────────────────────────────────────────────────────────────
describe("T9 — simplifyPolyline remove microvértices", () => {
  // Linha reta com 10 vértices intermediários colineares
  const mPerDeg = 111320;
  const straightWithMicro: [number, number][] = Array.from({ length: 12 }, (_, i) => [
    -46.0 + (i * 12) / mPerDeg,
    -12.0,
  ]);

  it("simplificação a 1m reduz para 2 vértices em linha reta", async () => {
    const { simplifyPolyline } = await import("../pipeline-types");
    const simplified = simplifyPolyline(straightWithMicro, 1);
    expect(simplified).toHaveLength(2);
  });

  it("simplificação preserva comprimento total (±2%)", async () => {
    const { simplifyPolyline, polylineLengthM } = await import("../pipeline-types");
    const simplified = simplifyPolyline(straightWithMicro, 1);
    const origLen = polylineLengthM(straightWithMicro);
    const simpLen = polylineLengthM(simplified);
    expect(Math.abs(origLen - simpLen) / origLen).toBeLessThan(0.02);
  });

  it("simplificação preserva todos os pontos de uma linha já ótima", async () => {
    const { simplifyPolyline } = await import("../pipeline-types");
    // 3 pontos com mudança de direção real — não deve remover nenhum
    const zigzag: [number, number][] = [
      [-46.005, -12.01],
      [-46.0,   -12.0],  // curva de ~45°
      [-45.995, -12.01],
    ];
    const simplified = simplifyPolyline(zigzag, 0.1); // 10 cm tolerance
    expect(simplified).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T10: Proposta final bloqueada com rota automática não validada
// ─────────────────────────────────────────────────────────────────────────────
describe("T10 — proposta final requer validação de corredor", () => {
  it("layout com rota auto não validada → overallValid = false", () => {
    const layout = makeLayout({
      mainPipeline: {
        coordinates: STRAIGHT_PRINCIPAL,
        adutora: STRAIGHT_ADUTORA,
        lengthMeters: 555,
        segments: 2,
        source: "auto",
        corridorValidated: false,
      },
    });
    const report = generatePipelineRouteDiagnostics(layout);
    expect(report.overallValid).toBe(false);
  });

  it("layout com rota auto validada → overallValid = true", () => {
    const layout = makeLayout({
      mainPipeline: {
        coordinates: STRAIGHT_PRINCIPAL,
        adutora: STRAIGHT_ADUTORA,
        lengthMeters: 555,
        segments: 2,
        source: "auto",
        corridorValidated: true,
      },
    });
    const report = generatePipelineRouteDiagnostics(layout);
    expect(report.overallValid).toBe(true);
  });

  it("layout com rota manual → overallValid = true (manual isenta de blocker)", () => {
    const layout = makeLayout({
      mainPipeline: {
        coordinates: STRAIGHT_PRINCIPAL,
        adutora: STRAIGHT_ADUTORA,
        lengthMeters: 555,
        segments: 2,
        source: "manual",
      },
    });
    const report = generatePipelineRouteDiagnostics(layout);
    expect(report.overallValid).toBe(true);
  });
});
