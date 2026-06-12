/**
 * TASK-086 — Curva Q-H multiponto (helpers puros).
 *
 * A curva do fabricante é uma lista de pares [qM3h, hMca] com q estritamente
 * crescente e h estritamente decrescente (invariantes testados em T86-6).
 *
 * Semântica de `pumpHeadAtFlow`:
 * - q dentro da faixa publicada → interpolação LINEAR entre os dois pontos
 *   vizinhos (aproximação conservadora o suficiente para validação de
 *   projeto; a curva real é côncava mas o passo da tabela é pequeno);
 * - q abaixo da faixa → CLAMP em h(qMin): a curva real entrega altura ≥
 *   h(qMin) à esquerda (h decresce com q), então h(qMin) é cota inferior
 *   segura — nunca aprova mais do que a bomba entrega;
 * - q acima da faixa → `null`: a bomba não tem ponto publicado nessa vazão
 *   (vira `pump_insufficient_flow` na validação).
 */
import { getCurvaQHBomba, type CurvaQH } from "@/lib/catalog/aspersores";

export type { CurvaQH };

/** Altura disponível (mca) na vazão dada, ou null se q excede a curva. */
export function pumpHeadAtFlow(curva: CurvaQH, qM3h: number): number | null {
  if (curva.length === 0 || !Number.isFinite(qM3h) || qM3h <= 0) return null;
  const qMin = curva[0][0];
  const qMax = curva[curva.length - 1][0];
  if (qM3h > qMax) return null;
  if (qM3h <= qMin) return curva[0][1]; // clamp à esquerda (cota inferior segura)
  for (let i = 1; i < curva.length; i++) {
    const [q1, h1] = curva[i - 1];
    const [q2, h2] = curva[i];
    if (qM3h <= q2) {
      const t = (qM3h - q1) / (q2 - q1);
      return h1 + t * (h2 - h1);
    }
  }
  return curva[curva.length - 1][1];
}

/** Resolve a curva do fabricante pelo modelo registrado no layout (read-only). */
export function resolveCurvaByModelo(modelo: string | undefined): CurvaQH | undefined {
  if (!modelo) return undefined;
  return getCurvaQHBomba(modelo);
}
