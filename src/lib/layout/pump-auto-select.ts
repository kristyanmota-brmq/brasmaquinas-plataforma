/**
 * TASK-077 — Seleção automática de conjunto moto-bomba (ponto nominal).
 *
 * Regra: entre as bombas homologadas que atendem SIMULTANEAMENTE a vazão
 * requerida (vazaoMaxM3h ≥ vazão do setor crítico) e a altura manométrica
 * (hmtMca ≥ HMT requerida), escolhe a de MENOR folga total — o conjunto
 * mais ajustado ao ponto de operação (evita superdimensionar potência).
 * Retorna null quando nenhuma bomba do catálogo atende (decisão fica com o
 * humano; gate de bomba insuficiente do solver permanece o guardião).
 *
 * Função pura — não conhece UI nem catálogo concreto (recebe a lista).
 */
import type { BombaCatalogo } from "@/lib/catalog/aspersores";

export function selectBombaAutomatica(
  bombas: readonly BombaCatalogo[],
  requiredFlowM3h: number,
  requiredHmtMca: number,
): BombaCatalogo | null {
  if (!Number.isFinite(requiredFlowM3h) || !Number.isFinite(requiredHmtMca)) {
    return null;
  }
  if (requiredFlowM3h <= 0 || requiredHmtMca <= 0) return null;

  let best: BombaCatalogo | null = null;
  let bestSlack = Infinity;
  for (const b of bombas) {
    if (b.vazaoMaxM3h < requiredFlowM3h) continue;
    if (b.hmtMca < requiredHmtMca) continue;
    // Folga normalizada (adimensional) — soma dos excessos relativos.
    const slack =
      (b.vazaoMaxM3h - requiredFlowM3h) / requiredFlowM3h +
      (b.hmtMca - requiredHmtMca) / requiredHmtMca;
    if (slack < bestSlack) {
      bestSlack = slack;
      best = b;
    }
  }
  return best;
}
