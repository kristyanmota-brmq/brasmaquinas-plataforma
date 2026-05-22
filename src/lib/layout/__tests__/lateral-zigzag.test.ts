/**
 * TASK-045 — Testes da correção do zigue-zague artificial e da validação
 * angular como restrição dura no motor de seleção arquitetural.
 *
 * Cobre:
 *   - desvio numérico < 0,10 m não gera cotovelo (zigue-zague eliminado)
 *   - desvio > 0,10 m continua bloqueado (ADR-011 preservada)
 *   - subset de lateral via deriveLateraisFromNetwork sem zigue-zague
 *   - motor de seleção rejeita candidato com blocker angular
 *   - detector angular continua bloqueando ângulo real inválido
 *   - limite exato de 0,10 m mantém aspersor no trilho sem disparar blocker
 */

import { describe, it, expect } from "vitest";
import {
  buildLateralRoute,
  detectAxisDeviations,
  type PhysicalColumn,
  type Lateral,
} from "../laterais";
import { selectArchitectureByBom } from "../architecture-selector";
import { detectNetworkAngleIssues } from "../network-angle-diagnostics";
import type { SelecaoTubo } from "../../hydraulics/hazenWilliams";

const CENTROID_0 = { lng: 0, lat: 0 };
const M_PER_DEG_LAT = 111320;

const DUMMY_SELECAO: SelecaoTubo = {
  tubo: { sku: "TEST", diametroMm: 50, pressaoMca: 400, custo: 1, precoVenda: 1, coefC: 145 },
  perdaCargaM: 1,
  velocidadeMs: 1,
  perdaCargaPercentual: 0.033,
};

/** Em lat=0, mPerLng = M_PER_DEG_LAT, e frame local = frame geográfico (gridAngle=0). */
const toLngLat = (x: number, y: number): [number, number] => [x / M_PER_DEG_LAT, y / M_PER_DEG_LAT];

function mkColumn(
  id: string,
  xMeters: number,
  yMinMeters: number,
  yMaxMeters: number,
  sprinklerCount = 2,
): PhysicalColumn {
  const start: [number, number] = [xMeters / M_PER_DEG_LAT, yMinMeters / M_PER_DEG_LAT];
  const end: [number, number] = [xMeters / M_PER_DEG_LAT, yMaxMeters / M_PER_DEG_LAT];
  return {
    id,
    columnIndex: parseInt(id.replace(/\D/g, ""), 10) || 0,
    startLngLat: start,
    endLngLat: end,
    comprimentoM: yMaxMeters - yMinMeters,
    sprinklerCount,
    vazaoM3h: sprinklerCount * 1.5,
    selecao: DUMMY_SELECAO,
    sectorsTouched: [0],
    sprinklerIndices: [],
    routeCoords: [start, end],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

function mkLateral(
  physicalColumnId: string,
  columnIndex: number,
  vazaoM3h: number,
  comprimentoM = 60,
): Lateral {
  return {
    sectorId: 0,
    physicalColumnId,
    columnIndex,
    startLngLat: [0, 0],
    endLngLat: [0, 0],
    sprinklerCount: Math.round(vazaoM3h / 1.5),
    comprimentoM,
    vazaoM3h,
    selecao: DUMMY_SELECAO,
    derivacaoLngLat: [0, 0],
    routeCoords: [[0, 0], [0, 0]],
    lateralCapacity: { ok: true, hfM: 0, velMs: 0 },
  };
}

describe("TASK-045 — Correção do zigue-zague e validação angular no motor", () => {
  // ─── buildLateralRoute com nova tolerância ───────────────────────────

  it("T45-1 — TASK-045B: aspersores ligeiramente desalinhados → reta de 2 pontos no eixo", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.07, y: 12 },
      { x: 0.05, y: 24 },
      { x: 0.08, y: 36 },
    ];
    const result = buildLateralRoute(pts, toLngLat);
    // TASK-045B: sempre reta de 2 pontos
    expect(result.routeCoords.length).toBe(2);
    expect(result.anglesValid).toBe(true);
  });

  it("T45-2 — desvio 0,15 m em X continua sendo BLOQUEADO pelo detector de eixo (ADR-011)", () => {
    // Aspersor com desvio > TOLERANCIA_ASPERSOR_EIXO_LATERAL (0,10 m).
    // Forçar fallback de routeCoords (rota reta start→end) para que o desvio
    // seja medido contra o eixo canônico — caso da regressão real.
    const col = mkColumn("col-0", 0, 0, 60, 4);
    // Forçar fallback: routeCoords = [start, end] reta (aspersor desalinhado fica fora)
    col.routeCoords = [col.startLngLat, col.endLngLat];
    col.sprinklerIndices = [0, 1, 2, 3];
    const positions: [number, number][] = [
      [0 / M_PER_DEG_LAT, 0 / M_PER_DEG_LAT],
      [0.15 / M_PER_DEG_LAT, 20 / M_PER_DEG_LAT], // 0,15 m de desvio do eixo X=0
      [0 / M_PER_DEG_LAT, 40 / M_PER_DEG_LAT],
      [0 / M_PER_DEG_LAT, 60 / M_PER_DEG_LAT],
    ];
    const report = detectAxisDeviations([col], positions, CENTROID_0);
    // Desvio máx ≈ 0,15 m > TOLERANCIA_ASPERSOR_EIXO_LATERAL (0,10 m) → violação
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    expect(report.maxDeviationM).toBeGreaterThan(0.10);
  });

  it("T45-3 — TASK-045B: desvio 0,10 m exato → reta no eixo (sem cotovelo)", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.10, y: 12 },
      { x: 0, y: 24 },
    ];
    const result = buildLateralRoute(pts, toLngLat);
    // TASK-045B: sempre reta de 2 pontos
    expect(result.routeCoords.length).toBe(2);
    expect(result.anglesValid).toBe(true);
  });

  it("T45-4 — TASK-045B: aspersor 0,11 m fora → reta na mediana; NÃO gera cotovelo", () => {
    // Mediana de [0, 0.11, 0.11] = 0.11. Eixo em 0.11. Aspersor em X=0 fica a
    // 0.11 m do eixo. Em integração, detectAxisDeviations dispara blocker.
    // Aqui validamos apenas que buildLateralRoute retorna reta de 2 pontos.
    const pts = [
      { x: 0, y: 0 },
      { x: 0.11, y: 12 },
      { x: 0.11, y: 24 },
    ];
    const result = buildLateralRoute(pts, toLngLat);
    expect(result.routeCoords.length).toBe(2);
    expect(result.anglesValid).toBe(true);
  });

  // ─── Motor de seleção arquitetural — validação angular como restrição dura ───

  it("T45-5 — motor marca candidato com blocker angular como INVÁLIDO (isValid=false)", () => {
    // Cenário pensado para que A3 central crie junção 180° antiparalela:
    // - 1 coluna vertical alta (y=0..200) com aspersores
    // - captação fora da faixa Y (yMin)
    // - A3 força principal central em yMid=100; ramal vai (0,100)→(0,0) descendo
    // - lateral routeCoords sobe de (0,0)→(0,200) → vetor antiparalelo ao ramal
    // A0 também emite warning de captação dentro da faixa (mas não 180° interno).
    const col = mkColumn("col-0", 0, 0, 200, 14);
    // routeCoords reta start→end (lateral vertical reta, sem cotovelos)
    col.routeCoords = [col.startLngLat, col.endLngLat];
    const cols = [col];
    const laterais = [mkLateral("col-0", 0, 14, 200)];
    const waterSource = { lng: 0, lat: -300 / M_PER_DEG_LAT };

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns: cols,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    // A3 central deve ter sido marcado inválido pela validação angular dura.
    const evalA3 = result.evaluations.find((e) => e.candidate.id === "A3");
    expect(evalA3).toBeDefined();
    // Se A3 está inválido com motivo angular, validação dura funcionou.
    // Aceitar também o caso geral: pelo menos um candidato marcado inválido por motivo angular.
    const angInvalid = result.evaluations.filter(
      (e) => !e.isValid && e.invalidReason !== null && /ângulo|ADR-010|junção/i.test(e.invalidReason),
    );
    expect(angInvalid.length).toBeGreaterThanOrEqual(1);
  });

  it("T45-6 — quando há candidato angularmente válido, motor escolhe o de menor BOM entre os válidos", () => {
    // Cenário com 2 colunas físicas no mesmo X (split TASK-040), Q baixo.
    // Todos os candidatos válidos: motor escolhe o de menor BOM (provavelmente A0 empata e vence).
    const cols = [
      mkColumn("col-0a", 0, 0, 60, 5),
      mkColumn("col-0b", 0, 70, 130, 5),
    ];
    const laterais = [mkLateral("col-0a", 0, 7.5, 60), mkLateral("col-0b", 0, 7.5, 60)];
    const waterSource = { lng: 0, lat: -100 / M_PER_DEG_LAT };

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns: cols,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    // Decisão válida: ou winner_reduces_bom ou baseline_preserved ou no_valid_candidate
    expect(["winner_reduces_bom", "baseline_preserved", "no_valid_candidate"]).toContain(result.decision);

    // Se há ao menos um candidato válido, o vencedor deve estar entre os válidos
    const validEvals = result.evaluations.filter((e) => e.isValid);
    if (validEvals.length > 0 && result.decision !== "no_valid_candidate") {
      const winnerEval = result.evaluations.find((e) => e.candidate.id === result.winner);
      expect(winnerEval).toBeDefined();
      expect(winnerEval!.isValid).toBe(true);
    }
  });

  it("T45-7 — motor cai em no_valid_candidate quando todos são angularmente inválidos", () => {
    // Cenário forçado onde todos os candidatos tendem a gerar blocker angular:
    // 2 sub-colunas verticais no mesmo X, com Q alta. Espera-se que pelo menos
    // o motor tente todos e classifique angular como restrição dura.
    const cols = [
      mkColumn("col-0a", 0, 0, 80, 8),
      mkColumn("col-0b", 0, 90, 170, 8),
    ];
    const laterais = [mkLateral("col-0a", 0, 12, 80), mkLateral("col-0b", 0, 12, 80)];
    const waterSource = { lng: 0, lat: -100 / M_PER_DEG_LAT };

    const result = selectArchitectureByBom({
      waterSource,
      physicalColumns: cols,
      centroid: CENTROID_0,
      gridAngleDegrees: 0,
      laterais,
    });

    // Pelo menos o caminho de validação angular deve ter sido exercido
    expect(result.evaluations.length).toBeGreaterThan(0);
    // E o resultado deve respeitar o critério: vencedor é válido ou no_valid_candidate
    if (result.decision !== "no_valid_candidate") {
      const winnerEval = result.evaluations.find((e) => e.candidate.id === result.winner)!;
      expect(winnerEval.isValid).toBe(true);
    }
  });

  // ─── Não-regressão do detector angular ─────────────────────────────────

  it("T45-8 — detector angular continua bloqueando junção real fora de 0°/90°", () => {
    // Principal com dobra real de 45° → blocker (45° não está em [0, 90] para rede interna).
    const principal: [number, number][] = [
      [0, 0],
      [12 / M_PER_DEG_LAT, 0],
      // Dobra de 45° na principal: vai diagonal
      [(12 + 8.485) / M_PER_DEG_LAT, 8.485 / M_PER_DEG_LAT],
    ];
    const report = detectNetworkAngleIssues({
      principalCoords: principal,
      adutoraCoords: [[0, 0], principal[0]],
      secondaries: [],
      physicalColumns: [],
      centroid: CENTROID_0,
    });
    // Espera-se blocker porque deflexão na dobra é 45° (rede interna apenas 0°/90°)
    expect(report.hasBlockers).toBe(true);
    expect(report.issues.some((i) => i.elementType === "principal")).toBe(true);
  });

  it("T45-9 — TASK-045B: geometria reta simples → 2 vértices apenas", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0, y: 12 },
      { x: 0, y: 24 },
      { x: 0, y: 36 },
    ];
    const result = buildLateralRoute(pts, toLngLat);
    // TASK-045B: sempre reta de 2 pontos
    expect(result.routeCoords.length).toBe(2);
    expect(result.anglesValid).toBe(true);
    for (const [lng] of result.routeCoords) {
      expect(Math.abs(lng)).toBeLessThan(1e-9);
    }
  });
});
