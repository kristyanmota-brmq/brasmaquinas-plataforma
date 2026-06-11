/**
 * Testes do classificador de blockers da sidebar (B-05 + W-08).
 *
 * Cobre a heurística que distingue mensagens de "Aguarda decisão técnica (RT)"
 * de "Bloqueio do projeto" exibidas em blocos visuais distintos no ProjectMap.
 */

import { describe, it, expect } from "vitest";
import {
  classifyBlocker,
  partitionBlockers,
} from "../blocker-classification";

describe("classifyBlocker — padrões rt-pending", () => {
  it("Construtibilidade angular → rt-pending", () => {
    const c = classifyBlocker(
      "Construtibilidade angular: 12 conexão(ões) com ângulo fora de 45°/90°/180° (12 em lateral). " +
      "Nenhuma conexão padrão disponível. Corrija o traçado da rede antes de emitir proposta.",
    );
    expect(c.category).toBe("rt-pending");
    expect(c.audienceHint).toMatch(/RT/);
  });

  it("Aspersor fora do eixo → rt-pending", () => {
    const c = classifyBlocker(
      "Aspersor fora do eixo da lateral física: 3 lateral(is) com desvio acima de 0.10 m (máx: 0.42 m). " +
      "O aspersor deve estar sobre a rede lateral, pois a vala da lateral é a mesma do aspersor.",
    );
    expect(c.category).toBe("rt-pending");
  });

  it("Lateral hidraulicamente insuficiente → rt-pending", () => {
    const c = classifyBlocker(
      "Lateral hidraulicamente insuficiente para o aspersor 5022: o maior DN homologado para " +
      "lateral é DN75, mas 4 coluna(s)/trecho(s) excedem perda de carga ou velocidade admissível.",
    );
    expect(c.category).toBe("rt-pending");
  });

  it("Pressão operacional excede o PN → rt-pending", () => {
    const c = classifyBlocker(
      "Pressão operacional excede o PN do tubo em um ou mais trechos (violação confirmada).",
    );
    expect(c.category).toBe("rt-pending");
  });

  it("Bomba insuficiente em vazão → rt-pending", () => {
    const c = classifyBlocker(
      "Bomba insuficiente em vazão: 30.0 m³/h < setor crítico 48.5 m³/h. Substituir bomba antes da emissão.",
    );
    expect(c.category).toBe("rt-pending");
  });

  it("Bomba insuficiente em HMT → rt-pending", () => {
    const c = classifyBlocker(
      "Bomba insuficiente em HMT: 25.0 mca < HMT mínima 42.4 mca. Substituir bomba antes da emissão.",
    );
    expect(c.category).toBe("rt-pending");
  });

  it("Válvulas/registros sem SKU → rt-pending", () => {
    const c = classifyBlocker(
      "Existem 4 válvulas/registros de seção sem SKU compatível no catálogo.",
    );
    expect(c.category).toBe("rt-pending");
  });

  it("Conexões físicas sem SKU → rt-pending", () => {
    const c = classifyBlocker(
      "BOM incompleta — 12 conexão(ões) física(s) necessária(s) sem SKU/custo homologado: derivação aspersor-lateral.",
    );
    expect(c.category).toBe("rt-pending");
  });

  it("DN de lateral não homologado para kit → rt-pending", () => {
    const c = classifyBlocker(
      "BOM incompleta — DN de lateral não homologado para kit do aspersor 5022: 2 aspersor(es) em lateral sem kit disponível.",
    );
    expect(c.category).toBe("rt-pending");
  });
});

describe("classifyBlocker — padrões data-block (default)", () => {
  it("HMT não computada → data-block", () => {
    const c = classifyBlocker(
      "Cálculo hidráulico incompleto: HMT total não computada ou inválida. Não é possível emitir proposta sem HMT.",
    );
    expect(c.category).toBe("data-block");
    expect(c.audienceHint).toMatch(/projeto/i);
  });

  it("Solver hidráulico inválido → data-block", () => {
    const c = classifyBlocker(
      "Solver hidráulico: segmentos com velocidade ou perda de carga inválidos.",
    );
    expect(c.category).toBe("data-block");
  });

  it("nLaterais maior que esperado → data-block", () => {
    const c = classifyBlocker(
      "nLaterais (50) > nColunasFísicas × setores (16 × 3 = 48). Provável fragmentação na setorização.",
    );
    expect(c.category).toBe("data-block");
  });

  it("Comprimento de ramais não contabilizado → data-block", () => {
    const c = classifyBlocker(
      "Comprimento de ramais/secundárias não contabilizado na BOM. Regenere a proposta ou atualize o schema.",
    );
    expect(c.category).toBe("data-block");
  });

  it("Mensagem genérica não classificada → data-block (default conservador)", () => {
    const c = classifyBlocker("Mensagem totalmente nova que ainda não foi mapeada.");
    expect(c.category).toBe("data-block");
  });
});

describe("partitionBlockers", () => {
  it("particiona lista mantendo ordem dentro de cada grupo", () => {
    const blockers = [
      "Construtibilidade angular: 5 conexões",          // rt-pending [0]
      "Cálculo hidráulico incompleto: HMT inválida",    // data-block [0]
      "Aspersor fora do eixo da lateral física: 2",     // rt-pending [1]
      "Solver hidráulico: segmentos inválidos",         // data-block [1]
      "Bomba insuficiente em vazão: 10 < 20",           // rt-pending [2]
    ];

    const { rtPending, dataBlock } = partitionBlockers(blockers);

    expect(rtPending).toHaveLength(3);
    expect(dataBlock).toHaveLength(2);

    // Ordem preservada
    expect(rtPending[0].message).toMatch(/Construtibilidade/);
    expect(rtPending[1].message).toMatch(/Aspersor fora/);
    expect(rtPending[2].message).toMatch(/Bomba insuficiente/);

    expect(dataBlock[0].message).toMatch(/HMT inv/);
    expect(dataBlock[1].message).toMatch(/Solver hidr/);
  });

  it("lista vazia → ambos grupos vazios", () => {
    const { rtPending, dataBlock } = partitionBlockers([]);
    expect(rtPending).toHaveLength(0);
    expect(dataBlock).toHaveLength(0);
  });

  it("apenas rt-pending → dataBlock vazio", () => {
    const { rtPending, dataBlock } = partitionBlockers([
      "Construtibilidade angular: 1",
      "Bomba insuficiente em HMT: 10 < 20",
    ]);
    expect(rtPending).toHaveLength(2);
    expect(dataBlock).toHaveLength(0);
  });

  it("audienceHint distinto entre categorias", () => {
    const { rtPending, dataBlock } = partitionBlockers([
      "Construtibilidade angular: 1",
      "HMT inválida no projeto",
    ]);
    expect(rtPending[0].audienceHint).not.toBe(dataBlock[0].audienceHint);
  });
});
