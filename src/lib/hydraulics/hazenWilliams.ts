/**
 * Hazen-Williams — perda de carga em tubulações.
 * Fórmula (SI): hf = 10.643 * Q^1.852 / (C^1.852 * D^4.87) * L
 *   hf [m]     — perda de carga distribuída
 *   Q  [m³/s]  — vazão
 *   C  [-]     — coeficiente do material (PVC = 145)
 *   D  [m]     — diâmetro interno
 *   L  [m]     — comprimento do trecho
 */

export interface TuboCandidato {
  sku: string;
  diametroMm: number;
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
    (10.643 * Math.pow(Q, 1.852) * comprimentoM) /
    (Math.pow(coefC, 1.852) * Math.pow(D, 4.87))
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

  for (const tubo of ordenados) {
    const hf = headLoss(vazaoM3h, comprimentoM, tubo.diametroMm, tubo.coefC);
    if (hf <= limitePerda) {
      return {
        tubo,
        perdaCargaM: hf,
        velocidadeMs: velocity(vazaoM3h, tubo.diametroMm),
        perdaCargaPercentual: hf / pressaoReferenciaMca,
      };
    }
  }

  const maior = ordenados[ordenados.length - 1];
  const hf = headLoss(vazaoM3h, comprimentoM, maior.diametroMm, maior.coefC);
  return {
    tubo: maior,
    perdaCargaM: hf,
    velocidadeMs: velocity(vazaoM3h, maior.diametroMm),
    perdaCargaPercentual: hf / pressaoReferenciaMca,
  };
}