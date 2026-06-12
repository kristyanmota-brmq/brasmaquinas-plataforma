/**
 * TASK-059 — Motor agronômico mínimo (diagnóstico-only).
 *
 * Implementa a equação agronômica praticada nas propostas reais da Brasmáquinas
 * (corpus analisado em docs/relatorios/2026-06-11-analise-propostas-reais.md §1):
 *
 *   intensidade (mm/h)   = vazão do emissor (L/h) / (esp. linhas × esp. emissores)
 *   tempo/setor (h)      = lâmina desejada (mm/dia) / intensidade (mm/h)
 *   setores recomendados = floor(tempo disponível (h) / tempo por setor (h))
 *
 * Validação com proposta real (12,7 ha capim, NAAN 5035 2.110 L/h, 18×18,
 * lâmina 10 mm/dia, 13 h disponíveis): intensidade 6,51 mm/h · 1,54 h/setor ·
 * 8 setores · 12,28 h totais — números reproduzidos nos testes T59.
 *
 * IMPORTANTE: este módulo NÃO altera a setorização vigente (setoresCount =
 * jornadaHoras, ver layout-use-cases.ts). Ele produz um relatório comparativo
 * que vira warning em generateProposalDiagnostics quando a setorização atual
 * diverge da derivada. Substituir o critério de setorização é decisão RT
 * (premissa registrada em docs/metodologia/12-premissas-provisorias-e-revisao-rt.md).
 */

export interface AgronomyInput {
  /** Vazão de UM emissor (m³/h). Ex.: 5022-SD = 1,5; NAAN 5035 = 2,11. */
  vazaoEmissorM3h: number;
  /** Espaçamento entre linhas de emissores (m). */
  espacamentoLinhasM: number;
  /** Espaçamento entre emissores na linha (m). */
  espacamentoEmissoresM: number;
  /** Lâmina desejada (mm/dia). Hoje sempre o default 10 do schema. */
  laminaMmDia: number;
  /** Tempo disponível de operação por dia (h) — jornadaHoras. */
  tempoDisponivelH: number;
  /** Nº de setores da setorização vigente (para comparação). */
  setoresCountAtual: number;
}

export interface AgronomyReport {
  /** Intensidade de aplicação do arranjo (mm/h). */
  intensidadeAplicacaoMmH: number;
  /** Tempo de rega necessário por setor para repor a lâmina (h). */
  tempoPorSetorH: number;
  /** Nº de setores que cabe no tempo disponível (floor). 0 quando nem 1 setor cabe. */
  setoresRecomendados: number;
  /** Tempo total de irrigação com a setorização ATUAL (h). */
  tempoTotalAtualH: number;
  /** true quando a setorização vigente diverge da derivada agronomicamente. */
  divergeDaSetorizacaoAtual: boolean;
  /**
   * true quando tempoPorSetorH × setoresCountAtual excede o tempo disponível —
   * a jornada não comporta repor a lâmina em todos os setores atuais.
   */
  jornadaInsuficienteParaLamina: boolean;
  /** Avisos prontos para generateProposalDiagnostics (nunca blockers). */
  warnings: string[];
}

/** intensidade (mm/h) = vazão (m³/h → L/h) / área por emissor (m²). */
export function computeApplicationIntensityMmH(
  vazaoEmissorM3h: number,
  espacamentoLinhasM: number,
  espacamentoEmissoresM: number,
): number {
  const areaM2 = espacamentoLinhasM * espacamentoEmissoresM;
  if (vazaoEmissorM3h <= 0 || areaM2 <= 0) return 0;
  return (vazaoEmissorM3h * 1000) / areaM2;
}

/** tempo por setor (h) = lâmina desejada (mm/dia) / intensidade (mm/h). */
export function computeSectorTimeH(
  laminaMmDia: number,
  intensidadeMmH: number,
): number {
  if (laminaMmDia <= 0 || intensidadeMmH <= 0) return 0;
  return laminaMmDia / intensidadeMmH;
}

/** setores que cabem no tempo disponível = floor(disponível / tempo por setor). */
export function deriveRecommendedSectorCount(
  tempoDisponivelH: number,
  tempoPorSetorH: number,
): number {
  if (tempoDisponivelH <= 0 || tempoPorSetorH <= 0) return 0;
  return Math.floor(tempoDisponivelH / tempoPorSetorH);
}

export function computeAgronomyReport(input: AgronomyInput): AgronomyReport {
  const intensidade = computeApplicationIntensityMmH(
    input.vazaoEmissorM3h,
    input.espacamentoLinhasM,
    input.espacamentoEmissoresM,
  );
  const tempoPorSetorH = computeSectorTimeH(input.laminaMmDia, intensidade);
  const setoresRecomendados = deriveRecommendedSectorCount(
    input.tempoDisponivelH,
    tempoPorSetorH,
  );
  const tempoTotalAtualH = tempoPorSetorH * input.setoresCountAtual;

  const diverge =
    setoresRecomendados > 0 && setoresRecomendados !== input.setoresCountAtual;
  const jornadaInsuficiente =
    tempoPorSetorH > 0 && tempoTotalAtualH > input.tempoDisponivelH;

  const warnings: string[] = [];
  if (diverge) {
    warnings.push(
      `Setorização agronômica: com lâmina de ${input.laminaMmDia.toFixed(1)} mm/dia e ` +
        `intensidade de ${intensidade.toFixed(2)} mm/h, cada setor precisa de ` +
        `${tempoPorSetorH.toFixed(2)} h — cabem ${setoresRecomendados} setor(es) na jornada de ` +
        `${input.tempoDisponivelH} h, mas a setorização atual usa ${input.setoresCountAtual}. ` +
        `Validar critério com RT (setores hoje = jornada em horas).`,
    );
  }
  if (jornadaInsuficiente) {
    warnings.push(
      `Jornada insuficiente para a lâmina: irrigar os ${input.setoresCountAtual} setor(es) ` +
        `atuais leva ${tempoTotalAtualH.toFixed(2)} h, acima das ${input.tempoDisponivelH} h ` +
        `disponíveis — a lâmina de ${input.laminaMmDia.toFixed(1)} mm/dia não é reposta.`,
    );
  }
  // A lâmina hoje é SEMPRE o default do schema (laminaMm: 10 literal) — não há
  // input do usuário. Faixa observada nas propostas reais: 6,5–10 mm/dia.
  warnings.push(
    `Lâmina de ${input.laminaMmDia.toFixed(1)} mm/dia é premissa default (não informada pelo ` +
      `cliente). Confirmar demanda da cultura com RT/agrônomo antes da proposta.`,
  );

  return {
    intensidadeAplicacaoMmH: intensidade,
    tempoPorSetorH,
    setoresRecomendados,
    tempoTotalAtualH,
    divergeDaSetorizacaoAtual: diverge,
    jornadaInsuficienteParaLamina: jornadaInsuficiente,
    warnings,
  };
}
