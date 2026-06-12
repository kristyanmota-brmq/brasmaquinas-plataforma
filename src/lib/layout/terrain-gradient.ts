/**
 * TASK-080 — Gradiente de terreno por ajuste de plano (altimetria).
 *
 * Regra canônica de layout de laterais em aspersão convencional (Bernardo,
 * Manual de Irrigação; Keller & Bliesner; NRCS Sprinkler Guide), apontada
 * pelo fundador na sessão de 2026-06-12:
 *
 *   1. LATERAIS EM NÍVEL — ao longo das curvas de nível (perpendiculares à
 *      maior declividade). É o que mantém a variação de pressão ao longo da
 *      lateral dentro do limite (~20% da pressão de serviço).
 *   2. PRINCIPAL no sentido do declive predominante.
 *   3. Em terreno PLANO (declividade < limiar), a planimetria comanda
 *      (divisa/linhas de plantio — TASK-079) e o vento desempata.
 *
 * Este módulo estima a declividade média do talhão a partir de amostras de
 * elevação (terreno Mapbox no cliente): ajuste de plano z = a·x + b·y + c
 * por mínimos quadrados. Função pura — recebe amostras em metros locais.
 */

export interface TerrainSample {
  /** Coordenadas métricas locais (qualquer origem consistente). */
  xM: number;
  yM: number;
  elevM: number;
}

export interface TerrainGradient {
  /**
   * Direção da MAIOR DECLIVIDADE em graus-de-leste, mod 180 (reta do
   * gradiente; sentido subida/descida é irrelevante para orientar laterais).
   */
  directionDeg: number;
  /** Declividade média ao longo dessa direção (%). */
  slopePercent: number;
}

/** Declividade mínima para a altimetria comandar a orientação (TASK-080). */
export const ALTIMETRIA_MIN_SLOPE_PCT = 2;

/** Mínimo de amostras válidas para confiar no ajuste. */
export const MIN_TERRAIN_SAMPLES = 8;

export function fitTerrainGradient(
  samples: readonly TerrainSample[],
): TerrainGradient | null {
  if (samples.length < MIN_TERRAIN_SAMPLES) return null;

  // Mínimos quadrados para z = a·x + b·y + c (equações normais).
  const n = samples.length;
  let sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
  for (const p of samples) {
    sx += p.xM; sy += p.yM; sz += p.elevM;
    sxx += p.xM * p.xM; syy += p.yM * p.yM; sxy += p.xM * p.yM;
    sxz += p.xM * p.elevM; syz += p.yM * p.elevM;
  }
  // Centrar para estabilidade numérica.
  const mx = sx / n, my = sy / n, mz = sz / n;
  const cxx = sxx - n * mx * mx;
  const cyy = syy - n * my * my;
  const cxy = sxy - n * mx * my;
  const cxz = sxz - n * mx * mz;
  const cyz = syz - n * my * mz;

  const det = cxx * cyy - cxy * cxy;
  // Amostras colineares/degeneradas (sem extensão 2D) → sem ajuste confiável.
  if (!Number.isFinite(det) || Math.abs(det) < 1e-6) return null;

  const a = (cxz * cyy - cyz * cxy) / det; // ∂z/∂x
  const b = (cyz * cxx - cxz * cxy) / det; // ∂z/∂y

  const slope = Math.hypot(a, b);
  if (!Number.isFinite(slope)) return null;

  let dir = (Math.atan2(b, a) * 180) / Math.PI; // graus-de-leste
  dir = ((dir % 180) + 180) % 180;

  return { directionDeg: dir, slopePercent: slope * 100 };
}
