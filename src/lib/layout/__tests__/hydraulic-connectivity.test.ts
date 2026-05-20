import { describe, it, expect } from "vitest";
import {
  generateSecondaries,
  validateHydraulicConnectivity,
} from "../hydraulic-connectivity";
import type { PhysicalColumn } from "../laterais";
import type { SelecaoTubo } from "@/lib/hydraulics/hazenWilliams";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const CENTROID = { lng: -46.0, lat: -12.0 };

// Principal: linha horizontal a lat = -12.01 (borda sul do campo).
// Vai de lng -46.02 até -45.98.
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
  };
}

// Coluna 1: startLngLat exatamente na borda sul (principal Y) → contato direto
const COL_DIRECT = makeCol("col-direct", [-46.005, -12.01], [-46.005, -11.995], 0);

// Coluna 2: inlet 10 m acima do principal (10 / 111320 ≈ 0.0000898 deg lat)
const GAP_10M = 10 / 111320;
const COL_GAP_10M = makeCol("col-gap10", [-46.0, -12.01 + GAP_10M], [-46.0, -11.995], 1);

// Coluna 3: inlet 50 m acima do principal
const GAP_50M = 50 / 111320;
const COL_GAP_50M = makeCol("col-gap50", [-45.995, -12.01 + GAP_50M], [-45.995, -11.99], 2);

// ─────────────────────────────────────────────────────────────────────────────
// T1 — Coluna diretamente sobre a principal: nenhum ramal gerado
// ─────────────────────────────────────────────────────────────────────────────
describe("T1 — coluna diretamente na principal → sem secundária", () => {
  const secs = generateSecondaries([COL_DIRECT], PRINCIPAL_SOUTH, CENTROID);

  it("nenhum ramal gerado", () => {
    expect(secs).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T2 — Coluna com gap de 10 m: ramal gerado com comprimento correto
// ─────────────────────────────────────────────────────────────────────────────
describe("T2 — coluna com gap de 10 m → ramal gerado", () => {
  const secs = generateSecondaries([COL_GAP_10M], PRINCIPAL_SOUTH, CENTROID);

  it("exatamente 1 ramal gerado", () => {
    expect(secs).toHaveLength(1);
  });

  it("ramal pertence à coluna correta", () => {
    expect(secs[0].physicalColumnId).toBe("col-gap10");
  });

  it("comprimento do ramal ≈ 10 m (±5%)", () => {
    expect(secs[0].lengthM).toBeGreaterThan(9.5);
    expect(secs[0].lengthM).toBeLessThan(10.5);
  });

  it("fromCoord está sobre a principal (lat ≈ -12.01)", () => {
    expect(secs[0].fromCoord[1]).toBeCloseTo(-12.01, 4);
  });

  it("toCoord é o inlet da coluna (startLngLat)", () => {
    const [lng, lat] = secs[0].toCoord;
    expect(lng).toBeCloseTo(COL_GAP_10M.startLngLat[0], 5);
    expect(lat).toBeCloseTo(COL_GAP_10M.startLngLat[1], 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T3 — Comprimento total de ramais = soma das distâncias individuais (BOM)
// ─────────────────────────────────────────────────────────────────────────────
describe("T3 — comprimento total de ramais consistente", () => {
  const secs = generateSecondaries(
    [COL_DIRECT, COL_GAP_10M, COL_GAP_50M],
    PRINCIPAL_SOUTH,
    CENTROID,
  );

  it("apenas colunas com gap geram ramal", () => {
    expect(secs).toHaveLength(2);
  });

  it("comprimento total ≈ 60 m (10 + 50)", () => {
    const total = secs.reduce((s, r) => s + r.lengthM, 0);
    expect(total).toBeGreaterThan(57);
    expect(total).toBeLessThan(63);
  });

  it("cada ramal tem source = 'auto'", () => {
    for (const s of secs) expect(s.source).toBe("auto");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T4 — Toda physicalColumn tem caminho até water_source após gerar ramais
// ─────────────────────────────────────────────────────────────────────────────
describe("T4 — rede conectada após generateSecondaries", () => {
  const cols = [COL_DIRECT, COL_GAP_10M, COL_GAP_50M];
  const secs = generateSecondaries(cols, PRINCIPAL_SOUTH, CENTROID);
  const report = validateHydraulicConnectivity(cols, PRINCIPAL_SOUTH, secs, CENTROID);

  it("isConnected = true", () => {
    expect(report.isConnected).toBe(true);
  });

  it("disconnectedColumnsCount = 0", () => {
    expect(report.disconnectedColumnsCount).toBe(0);
  });

  it("connectedColumnsCount = 3", () => {
    expect(report.connectedColumnsCount).toBe(3);
  });

  it("sem blockers de conectividade", () => {
    expect(report.blockers).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T5 — Principal simplificada sem ramais → coluna com gap é órfã
// ─────────────────────────────────────────────────────────────────────────────
describe("T5 — sem ramais → coluna com gap reporta desconexão", () => {
  const report = validateHydraulicConnectivity(
    [COL_DIRECT, COL_GAP_10M],
    PRINCIPAL_SOUTH,
    [], // nenhum ramal fornecido
    CENTROID,
  );

  it("isConnected = false", () => {
    expect(report.isConnected).toBe(false);
  });

  it("col-gap10 está em orphanPhysicalColumns", () => {
    expect(report.orphanPhysicalColumns).toContain("col-gap10");
  });

  it("col-direct NÃO está em orphanPhysicalColumns", () => {
    expect(report.orphanPhysicalColumns).not.toContain("col-direct");
  });

  it("disconnectedColumnsCount = 1", () => {
    expect(report.disconnectedColumnsCount).toBe(1);
  });

  it("blockers contêm texto sobre laterais desconectadas", () => {
    expect(report.blockers.some((b) => /lateral/i.test(b))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T6 — Sem principal definida → todas as colunas são órfãs
// ─────────────────────────────────────────────────────────────────────────────
describe("T6 — sem principal → todas as colunas órfãs", () => {
  const cols = [COL_DIRECT, COL_GAP_10M];
  const report = validateHydraulicConnectivity(cols, null, [], CENTROID);

  it("isConnected = false", () => {
    expect(report.isConnected).toBe(false);
  });

  it("disconnectedColumnsCount = nColunasTotal", () => {
    expect(report.disconnectedColumnsCount).toBe(cols.length);
  });

  it("blocker menciona principal não definida", () => {
    expect(report.blockers.some((b) => /principal/i.test(b))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T7 — P1 fix: principal em linha reta + ramais cobrem todos os inlets
// ─────────────────────────────────────────────────────────────────────────────
describe("T7 — campo irregular: principal reta + ramais = cobertura total", () => {
  // Simula campo com 4 colunas em posições Y diferentes (borda irregular sul)
  const cols = [
    makeCol("c0", [-46.010, -12.01],            [-46.010, -11.995], 0), // gap 0
    makeCol("c1", [-46.005, -12.01 + GAP_10M],  [-46.005, -11.995], 1), // gap 10m
    makeCol("c2", [-46.000, -12.01 + GAP_50M],  [-46.000, -11.995], 2), // gap 50m
    makeCol("c3", [-45.995, -12.01],            [-45.995, -11.990], 3), // gap 0
  ];

  const secs = generateSecondaries(cols, PRINCIPAL_SOUTH, CENTROID);
  const report = validateHydraulicConnectivity(cols, PRINCIPAL_SOUTH, secs, CENTROID);

  it("exatamente 2 ramais gerados (c1 e c2)", () => {
    expect(secs).toHaveLength(2);
  });

  it("rede completamente conectada após ramais", () => {
    expect(report.isConnected).toBe(true);
  });

  it("comprimento total dos ramais ≈ 60 m", () => {
    expect(report.totalSecondaryLengthM).toBeGreaterThan(57);
    expect(report.totalSecondaryLengthM).toBeLessThan(63);
  });

  it("warning de ramais gerados presente no relatório", () => {
    expect(report.warnings.some((w) => /ramal/i.test(w))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8 — missingSecondaryConnections só lista colunas sem ramal explícito
// ─────────────────────────────────────────────────────────────────────────────
describe("T8 — missingSecondaryConnections lista apenas lacunas reais", () => {
  // c0 direto, c1 com gap, c2 com gap — fornecemos ramal só para c1
  const cols = [COL_DIRECT, COL_GAP_10M, COL_GAP_50M];
  const secForC1 = generateSecondaries([COL_GAP_10M], PRINCIPAL_SOUTH, CENTROID);
  const report = validateHydraulicConnectivity(cols, PRINCIPAL_SOUTH, secForC1, CENTROID);

  it("col-gap50 está em missingSecondaryConnections", () => {
    expect(report.missingSecondaryConnections).toContain("col-gap50");
  });

  it("col-direct NÃO está em missingSecondaryConnections", () => {
    expect(report.missingSecondaryConnections).not.toContain("col-direct");
  });

  it("col-gap10 NÃO está em missingSecondaryConnections (tem ramal)", () => {
    expect(report.missingSecondaryConnections).not.toContain("col-gap10");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T9 — Rede com lateral órfã gera blocker
// ─────────────────────────────────────────────────────────────────────────────
describe("T9 — lateral órfã gera blocker e impede proposta", () => {
  const report = validateHydraulicConnectivity(
    [COL_GAP_10M, COL_GAP_50M],
    PRINCIPAL_SOUTH,
    [], // nenhum ramal
    CENTROID,
  );

  it("blockers.length > 0", () => {
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it("blocker cita o número de laterais desconectadas", () => {
    const allBlockers = report.blockers.join(" ");
    expect(allBlockers).toMatch(/2/);
  });

  it("isConnected = false", () => {
    expect(report.isConnected).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T10 — Proposta final bloqueada com desconexão hidráulica
// ─────────────────────────────────────────────────────────────────────────────
describe("T10 — proposta final não aprovada com desconexão", () => {
  it("validateHydraulicConnectivity → blockers impedem proposta (cols sem ramal)", () => {
    const report = validateHydraulicConnectivity(
      [COL_GAP_10M],
      PRINCIPAL_SOUTH,
      [],
      CENTROID,
    );
    expect(report.isConnected).toBe(false);
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it("validateHydraulicConnectivity → sem blockers quando rede está conectada", () => {
    const secs = generateSecondaries([COL_GAP_10M], PRINCIPAL_SOUTH, CENTROID);
    const report = validateHydraulicConnectivity(
      [COL_GAP_10M],
      PRINCIPAL_SOUTH,
      secs,
      CENTROID,
    );
    expect(report.isConnected).toBe(true);
    expect(report.blockers).toHaveLength(0);
  });

  it("generateSecondaries com campo regular (todos diretos) retorna lista vazia", () => {
    // Campo retangular: todos os inlets na borda sul (principalY) → sem ramais
    const colsAlinhados = [
      makeCol("a0", [-46.005, -12.01], [-46.005, -11.99], 0),
      makeCol("a1", [-46.000, -12.01], [-46.000, -11.99], 1),
      makeCol("a2", [-45.995, -12.01], [-45.995, -11.99], 2),
    ];
    const secs = generateSecondaries(colsAlinhados, PRINCIPAL_SOUTH, CENTROID);
    expect(secs).toHaveLength(0);
  });
});
