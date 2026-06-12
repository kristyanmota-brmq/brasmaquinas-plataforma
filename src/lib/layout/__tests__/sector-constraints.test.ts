import { describe, it, expect } from "vitest";
import {
  vazaoMaxPorPotenciaM3h,
  minSetoresPorRestricoes,
  EFICIENCIA_CONJUNTO_PADRAO,
} from "../sector-constraints";

// T82 (TASK-082) — Restrições do local (RT em sessão): disponibilidade de
// vazão e potência reajustam automaticamente o número de setores.

describe("T82 — vazão máxima por potência (P = γQH/75η)", () => {
  it("T82-1: 30 cv @ 60 mca, η=0,55 → ~74,3 m³/h", () => {
    expect(vazaoMaxPorPotenciaM3h(30, 60, 0.55)).toBeCloseTo(74.25, 1);
  });

  it("T82-2: sem potência ou sem HMT → sem limite (Infinity)", () => {
    expect(vazaoMaxPorPotenciaM3h(0, 60)).toBe(Infinity);
    expect(vazaoMaxPorPotenciaM3h(30, 0)).toBe(Infinity);
    expect(vazaoMaxPorPotenciaM3h(NaN, 60)).toBe(Infinity);
  });
});

describe("T82 — mínimo de setores pelas restrições", () => {
  it("T82-3: outorga de 100 m³/h num projeto de 743 m³/h → mínimo 8 setores", () => {
    const r = minSetoresPorRestricoes(743, { vazaoDisponivelM3h: 100 });
    expect(r.nMinSetores).toBe(8);
    expect(r.motivos).toHaveLength(1);
  });

  it("T82-4: potência domina quando mais restritiva que a vazão", () => {
    // 743 m³/h · 25 cv @ 50 mca → Qmax = 25·270·0,55/50 = 74,25 → 11 setores
    const r = minSetoresPorRestricoes(
      743,
      { vazaoDisponivelM3h: 150, potenciaDisponivelCv: 25 },
      50,
    );
    expect(r.nMinSetores).toBe(Math.ceil(743 / 74.25));
    expect(r.motivos.length).toBeGreaterThanOrEqual(1);
  });

  it("T82-5: potência sem HMT disponível → ignorada nesta rodada (sem hidráulica ainda)", () => {
    const r = minSetoresPorRestricoes(743, { potenciaDisponivelCv: 25 });
    expect(r.nMinSetores).toBe(1);
    expect(r.motivos).toHaveLength(0);
  });

  it("T82-6: sem restrições ou valores inválidos → nMin = 1", () => {
    expect(minSetoresPorRestricoes(743, undefined).nMinSetores).toBe(1);
    expect(minSetoresPorRestricoes(743, {}).nMinSetores).toBe(1);
    expect(minSetoresPorRestricoes(0, { vazaoDisponivelM3h: 100 }).nMinSetores).toBe(1);
    expect(minSetoresPorRestricoes(743, { vazaoDisponivelM3h: -5 }).nMinSetores).toBe(1);
  });

  it("T82-7: η de praxe documentado (0,55) usado como default", () => {
    expect(EFICIENCIA_CONJUNTO_PADRAO).toBe(0.55);
    expect(vazaoMaxPorPotenciaM3h(30, 60)).toBeCloseTo(74.25, 1);
  });
});
