/**
 * TASK-085 — Expansão do catálogo de bombas (THEBE THS-18 / R-20 / RL-20B +
 * EBARA normalizadas GS/GSD 3500 rpm) a partir do catálogo oficial do
 * fabricante (Cat. Produtos Superfície 60Hz 2025 EBAS).
 *
 * Convenção do ponto nominal: ponto MEDIANO da tabela vazão×altura do
 * fabricante (doc 12 — premissa TASK-085, PENDENTE_CONFIRMACAO_RT).
 */
import { describe, it, expect } from "vitest";
import { BOMBAS_HOMOLOGADAS } from "@/lib/catalog/aspersores";
import { selectBombaAutomatica } from "../pump-auto-select";

describe("T85 — catálogo de bombas expandido (fabricante)", () => {
  it("T85-1: modelos são únicos (ProjectMap resolve bomba por string exata)", () => {
    const modelos = BOMBAS_HOMOLOGADAS.map((b) => b.modelo);
    expect(new Set(modelos).size).toBe(modelos.length);
  });

  it("T85-2: as 2 entradas originais (TASK-065) estão preservadas com valores exatos", () => {
    const imbil = BOMBAS_HOMOLOGADAS.find((b) => b.modelo === "IMBIL INI BLOC 65-160");
    expect(imbil).toMatchObject({ marca: "IMBIL", vazaoMaxM3h: 100, hmtMca: 60 });
    const megabloc = BOMBAS_HOMOLOGADAS.find((b) => b.modelo === "EBARA GSD MEGABLOC (30 CV)");
    expect(megabloc).toMatchObject({ marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 67, hmtMca: 73 });
  });

  it("T85-3: toda entrada nova de fabricante cita catálogo + página e tem potência", () => {
    const novas = BOMBAS_HOMOLOGADAS.filter((b) => b.fonte.includes("Cat. Produtos Superfície"));
    expect(novas.length).toBeGreaterThanOrEqual(97);
    for (const b of novas) {
      expect(b.fonte).toMatch(/pág\. \d+/);
      expect(b.potenciaCv).toBeGreaterThan(0);
      expect(b.marca === "THEBE" || b.marca === "EBARA").toBe(true);
    }
  });

  it("T85-4: sanidade física — eficiência implícita η = Q·H/(270·cv) plausível", () => {
    // Pega erro de transcrição de tabela: dígito/coluna trocada explode ou
    // derruba η. Faixa: 0,40 (motor folgado em fim de curva) a 0,88 (BEP de
    // bomba normalizada de alta eficiência).
    for (const b of BOMBAS_HOMOLOGADAS) {
      if (!b.potenciaCv) continue;
      const eta = (b.vazaoMaxM3h * b.hmtMca) / 270 / b.potenciaCv;
      expect(eta, `${b.modelo}: η=${eta.toFixed(2)}`).toBeGreaterThanOrEqual(0.4);
      expect(eta, `${b.modelo}: η=${eta.toFixed(2)}`).toBeLessThanOrEqual(0.88);
    }
  });

  it("T85-5: cobertura do envelope — pontos canônicos do corpus acham bomba com folga sã", () => {
    // (vazão do setor crítico, HMT) de projetos reais validados (TASK-065/067/078).
    const pontos: Array<[number, number]> = [
      [67, 73],
      [90, 50],
      [100, 60],
      [55, 35],
      [40, 45],
    ];
    for (const [q, h] of pontos) {
      const b = selectBombaAutomatica(BOMBAS_HOMOLOGADAS, q, h);
      expect(b, `sem bomba para ${q} m³/h @ ${h} mca`).not.toBeNull();
      const folga = (b!.vazaoMaxM3h - q) / q + (b!.hmtMca - h) / h;
      expect(folga, `${b!.modelo} folga excessiva p/ ${q}@${h}`).toBeLessThanOrEqual(0.5);
    }
  });

  it("T85-6: catálogo são (Q>0, HMT>0, fonte declarada) — invariante T65-1 preservada", () => {
    for (const b of BOMBAS_HOMOLOGADAS) {
      expect(b.vazaoMaxM3h).toBeGreaterThan(0);
      expect(b.hmtMca).toBeGreaterThan(0);
      expect(b.fonte.length).toBeGreaterThan(10);
    }
  });
});
