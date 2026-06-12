/**
 * TASK-082 — Restrições do local: vazão disponível e potência de energia.
 *
 * Solicitação do RT da Brasmáquinas (sessão 2026-06-12): o projetista informa
 * a DISPONIBILIDADE DE VAZÃO da fonte (outorga/teste de bombeamento) e a
 * POTÊNCIA DE ENERGIA disponível na propriedade — e o número de setores se
 * reajusta automaticamente para que a vazão simultânea (1 setor ativo, regra
 * rotativa TASK-052) caiba nas duas restrições.
 *
 * Física da potência: P(cv) = γ·Q·H / (75·η)  com Q em m³/s, H em mca →
 *   Q_max(m³/h) = P_cv · 75 · η · 3600 / (1000 · H) = P_cv · 270 · η / H
 *
 * η (eficiência global do conjunto moto-bomba) é premissa calibrável —
 * 0,55 é valor de praxe para conjuntos centrífugos comerciais de médio porte.
 */

export interface RestricoesLocal {
  /** Vazão disponível na fonte (m³/h) — outorga ou teste de bombeamento. */
  vazaoDisponivelM3h?: number;
  /** Potência elétrica disponível para o conjunto moto-bomba (cv). */
  potenciaDisponivelCv?: number;
}

/**
 * Eficiência global do conjunto moto-bomba.
 * TASK-085R (RT rev.2): "dimensionar pelo maior rendimento possível
 * encontrado" — η = 0,70 (bomba centrífuga de alto rendimento ~0,75 × motor
 * elétrico ~0,93). Recalibrável com dado de placa dos conjuntos reais.
 */
export const EFICIENCIA_CONJUNTO_PADRAO = 0.70;

/** Vazão máxima bombeável (m³/h) com a potência disponível na HMT dada. */
export function vazaoMaxPorPotenciaM3h(
  potenciaCv: number,
  hmtMca: number,
  eficiencia: number = EFICIENCIA_CONJUNTO_PADRAO,
): number {
  if (!Number.isFinite(potenciaCv) || potenciaCv <= 0) return Infinity;
  if (!Number.isFinite(hmtMca) || hmtMca <= 0) return Infinity;
  return (potenciaCv * 270 * eficiencia) / hmtMca;
}

export interface SectorConstraintResult {
  /** Mínimo de setores imposto pelas restrições (1 = sem restrição ativa). */
  nMinSetores: number;
  /** Explicações humanas de cada restrição ativa (vazia se nenhuma). */
  motivos: string[];
}

/**
 * Mínimo de setores para a vazão simultânea caber nas restrições do local.
 * HMT é necessária apenas para a restrição de potência — sem ela (projeto
 * ainda sem hidráulica), a potência é ignorada nesta rodada e reaplicada
 * no recálculo seguinte.
 */
export function minSetoresPorRestricoes(
  vazaoTotalProjetoM3h: number,
  restricoes: RestricoesLocal | undefined,
  hmtMca?: number,
  eficiencia: number = EFICIENCIA_CONJUNTO_PADRAO,
): SectorConstraintResult {
  const motivos: string[] = [];
  let nMin = 1;
  if (!restricoes || !Number.isFinite(vazaoTotalProjetoM3h) || vazaoTotalProjetoM3h <= 0) {
    return { nMinSetores: 1, motivos };
  }

  const { vazaoDisponivelM3h, potenciaDisponivelCv } = restricoes;

  if (Number.isFinite(vazaoDisponivelM3h) && (vazaoDisponivelM3h as number) > 0) {
    const n = Math.ceil(vazaoTotalProjetoM3h / (vazaoDisponivelM3h as number));
    if (n > nMin) nMin = n;
    if (n > 1) {
      motivos.push(
        `vazão disponível de ${(vazaoDisponivelM3h as number).toFixed(0)} m³/h limita o setor a ` +
        `${(vazaoDisponivelM3h as number).toFixed(0)} m³/h → mínimo ${n} setores`,
      );
    }
  }

  if (
    Number.isFinite(potenciaDisponivelCv) &&
    (potenciaDisponivelCv as number) > 0 &&
    Number.isFinite(hmtMca) &&
    (hmtMca as number) > 0
  ) {
    const qMax = vazaoMaxPorPotenciaM3h(potenciaDisponivelCv as number, hmtMca as number, eficiencia);
    const n = Math.ceil(vazaoTotalProjetoM3h / qMax);
    if (n > nMin) nMin = n;
    if (n > 1) {
      motivos.push(
        `${(potenciaDisponivelCv as number).toFixed(0)} cv @ HMT ${(hmtMca as number).toFixed(0)} mca ` +
        `(η ${eficiencia}) bombeia até ${qMax.toFixed(0)} m³/h → mínimo ${n} setores`,
      );
    }
  }

  return { nMinSetores: nMin, motivos };
}
