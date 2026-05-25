/**
 * B-05 + W-08 (diagnóstico 2026-05-24) — Classificação de blockers da sidebar.
 *
 * O diagnóstico de 2026-05-24 apontou que:
 *   - B-05: mensagens técnicas cruas (ex: "Construtibilidade angular: 12 conexão(ões) em
 *     lateral") apareciam diretamente na sidebar do vendedor sem distinguir nível.
 *   - W-08: sidebar única mistura blockers de naturezas diferentes (decisão RT vs erro
 *     corrigível) sem hierarquia visual.
 *
 * Esta classificação é **heurística no frontend** (não muda o contrato de
 * `IrrigationProjectResult.diagnostics.blockers: string[]`). A regra:
 *
 *   - "rt-pending"     — condição técnica que exige decisão RT/engenheiro/agrônomo
 *                        (não é "erro" do vendedor; é "aguarda revisão técnica")
 *   - "data-block"     — bloqueio acionável pelo projetista/vendedor (erro de dados,
 *                        BOM incompleta, geometria a corrigir)
 *
 * Quando o domínio entregar `blockers: Array<{ severity, audience, message }>`
 * estruturado em uma task futura (TASK-057 ou TASK-XXX), este helper deve ser
 * removido em favor do shape oficial.
 */

export type BlockerCategory = "rt-pending" | "data-block";

export interface ClassifiedBlocker {
  category: BlockerCategory;
  message: string;
  /**
   * Texto curto, amigável ao vendedor, explicando a natureza da pendência.
   * Aparece como prefixo/legenda; nunca substitui a mensagem técnica original.
   */
  audienceHint: string;
}

/**
 * Padrões que indicam pendência de decisão técnica (RT/engenheiro/agrônomo).
 * Ordem importa: o primeiro match ganha. Mantenha padrões mais específicos primeiro.
 *
 * Cada entrada associa um teste regex ao audienceHint exibido ao usuário.
 */
const RT_PENDING_PATTERNS: Array<{ pattern: RegExp; audienceHint: string }> = [
  {
    pattern: /construtibilidade angular/i,
    audienceHint: "Aguarda decisão do RT: ângulos da rede fora dos padrões construtíveis.",
  },
  {
    pattern: /aspersor fora do eixo/i,
    audienceHint: "Aguarda decisão do RT: geometria da lateral exige revisão.",
  },
  {
    pattern: /lateral hidraulicamente insuficiente/i,
    audienceHint: "Aguarda decisão do projetista/RT: o aspersor 5022 não cabe na lateral atual.",
  },
  {
    pattern: /press[ãa]o operacional excede o pn/i,
    audienceHint: "Aguarda decisão do RT: pressão do trecho ultrapassa o tubo escolhido.",
  },
  {
    pattern: /bomba insuficiente/i,
    audienceHint: "Aguarda decisão do projetista: a bomba selecionada não atende ao projeto.",
  },
  {
    pattern: /v[áa]lvulas?\/registros? de se[çc][ãa]o sem sku/i,
    audienceHint: "Aguarda homologação de catálogo: registros sem SKU compatível.",
  },
  {
    pattern: /conex\S+\s+f[íi]sic\S+.{0,40}sem sku/i,
    audienceHint: "Aguarda homologação de catálogo: conexões sem SKU homologado.",
  },
  {
    pattern: /dn de lateral n[ãa]o homologado para kit/i,
    audienceHint: "Aguarda decisão do RT: lateral com DN fora do subset homologado do aspersor.",
  },
];

/**
 * Classifica um único blocker. Sem match → "data-block" (default conservador:
 * vendedor vê em vermelho; quem souber lê e age).
 */
export function classifyBlocker(message: string): ClassifiedBlocker {
  for (const entry of RT_PENDING_PATTERNS) {
    if (entry.pattern.test(message)) {
      return { category: "rt-pending", message, audienceHint: entry.audienceHint };
    }
  }
  return {
    category: "data-block",
    message,
    audienceHint: "Bloqueio de projeto: corrigir os dados antes de emitir.",
  };
}

/**
 * Particiona uma lista de blockers em dois grupos preservando a ordem original
 * dentro de cada grupo. Útil para renderizar dois blocos visuais distintos sem
 * mexer no contrato `string[]`.
 */
export function partitionBlockers(blockers: readonly string[]): {
  rtPending: ClassifiedBlocker[];
  dataBlock: ClassifiedBlocker[];
} {
  const rtPending: ClassifiedBlocker[] = [];
  const dataBlock: ClassifiedBlocker[] = [];
  for (const b of blockers) {
    const c = classifyBlocker(b);
    if (c.category === "rt-pending") rtPending.push(c);
    else dataBlock.push(c);
  }
  return { rtPending, dataBlock };
}
