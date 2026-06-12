/**
 * Hazen-Williams — perda de carga em tubulações.
 * V0.5-RC §14 / Manual Técnico §14:
 *   hf = 10,67 × Q^1,852 / (C^1,852 × D^4,871) × L
 *   hf [m]     — perda de carga distribuída
 *   Q  [m³/s]  — vazão
 *   C  [-]     — coeficiente do material (PVC V0.5-RC = 145)
 *   D  [m]     — diâmetro interno
 *   L  [m]     — comprimento do trecho
 */

export interface TuboCandidato {
  sku: string;
  diametroMm: number;
  /** Diâmetro interno real (mm). Quando presente, Hazen-Williams deve usar este valor. */
  diametroInternoMm?: number;
  pressaoMca: number;
  custo: number;
  precoVenda: number;
  coefC: number;
}

export interface SelecaoTubo {
  tubo: TuboCandidato;
  perdaCargaM: number;
  velocidadeMs: number;
  perdaCargaPercentual: number;
  /**
   * TASK-074: cascata de DN na lateral (telescopia 75→50 — decisão RT 2026-06-12:
   * nunca cascatear abaixo de DN50). Presente quando a cauda da lateral pode rodar
   * em DN50 mantendo hf combinada ≤ limite e velocidade ≤ máx. `tubo` continua sendo
   * o da CABECEIRA (DN75) — consumidores que ignoram telescopia permanecem corretos
   * (conservadores).
   */
  telescopia?: {
    tuboCauda: TuboCandidato;
    comprimentoCabeceiraM: number;
    comprimentoCaudaM: number;
    sprinklersCabeceira: number;
    sprinklersCauda: number;
    /** hf da lateral telescopada (decomposição: hf75(total) − hf75(cauda) + hf50(cauda)). */
    hfTotalMca: number;
  };
}

export function headLoss(
  vazaoM3h: number,
  comprimentoM: number,
  diametroMm: number,
  coefC: number
): number {
  const Q = vazaoM3h / 3600;
  const D = diametroMm / 1000;
  if (Q <= 0 || D <= 0 || comprimentoM <= 0) return 0;
  return (
    // V0.5-RC §14: constante 10,67; expoente de D = 4,871
    (10.67 * Math.pow(Q, 1.852) * comprimentoM) /
    (Math.pow(coefC, 1.852) * Math.pow(D, 4.871))
  );
}

export function velocity(vazaoM3h: number, diametroMm: number): number {
  const Q = vazaoM3h / 3600;
  const A = Math.PI * Math.pow(diametroMm / 2000, 2);
  return A > 0 ? Q / A : 0;
}

export function selectDiameter(
  vazaoM3h: number,
  comprimentoM: number,
  pressaoReferenciaMca: number,
  candidatos: readonly TuboCandidato[],
  maxPerdaPercentual: number = 0.20
): SelecaoTubo {
  const ordenados = [...candidatos].sort((a, b) => a.diametroMm - b.diametroMm);
  const limitePerda = pressaoReferenciaMca * maxPerdaPercentual;

  // TASK-058 (ADR-002): cálculos HW e de velocidade usam o diâmetro INTERNO real
  // quando disponível. Usar o nominal subestima hf em ~(Dn/Di)^4,871 (≈47% em DN50).
  for (const tubo of ordenados) {
    const dInternoMm = tubo.diametroInternoMm ?? tubo.diametroMm;
    const hf = headLoss(vazaoM3h, comprimentoM, dInternoMm, tubo.coefC);
    if (hf <= limitePerda) {
      return {
        tubo,
        perdaCargaM: hf,
        velocidadeMs: velocity(vazaoM3h, dInternoMm),
        perdaCargaPercentual: hf / pressaoReferenciaMca,
      };
    }
  }

  const maior = ordenados[ordenados.length - 1];
  const dInternoMaiorMm = maior.diametroInternoMm ?? maior.diametroMm;
  const hf = headLoss(vazaoM3h, comprimentoM, dInternoMaiorMm, maior.coefC);
  return {
    tubo: maior,
    perdaCargaM: hf,
    velocidadeMs: velocity(vazaoM3h, dInternoMaiorMm),
    perdaCargaPercentual: hf / pressaoReferenciaMca,
  };
}