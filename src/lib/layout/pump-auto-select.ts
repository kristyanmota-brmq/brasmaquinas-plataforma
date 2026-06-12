/**
 * TASK-077 — Seleção automática de conjunto moto-bomba.
 *
 * TASK-086: bombas com curva Q-H transcrita são julgadas pela ALTURA REAL
 * na vazão de projeto (interpolação na tabela do fabricante); bombas sem
 * curva seguem o ponto nominal retangular original.
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
import { pumpHeadAtFlow, resolveCurvaByModelo } from "@/lib/layout/pump-curve";

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
    let slack: number;
    const curva = resolveCurvaByModelo(b.modelo);
    if (curva && curva.length > 0) {
      // TASK-086 — curva Q-H: candidata se a vazão de projeto cabe na faixa
      // publicada E a altura disponível NESSA vazão cobre a HMT requerida.
      // Folga = excessos relativos usando a altura REAL no ponto (não a
      // nominal) e a vazão máxima da curva (faixa restante de operação).
      const qMax = curva[curva.length - 1][0];
      const available = pumpHeadAtFlow(curva, requiredFlowM3h);
      if (available === null || available < requiredHmtMca) continue;
      slack =
        (qMax - requiredFlowM3h) / requiredFlowM3h +
        (available - requiredHmtMca) / requiredHmtMca;
    } else {
      // Caminho legado (TASK-077) — ponto nominal retangular.
      if (b.vazaoMaxM3h < requiredFlowM3h) continue;
      if (b.hmtMca < requiredHmtMca) continue;
      // Folga normalizada (adimensional) — soma dos excessos relativos.
      slack =
        (b.vazaoMaxM3h - requiredFlowM3h) / requiredFlowM3h +
        (b.hmtMca - requiredHmtMca) / requiredHmtMca;
    }
    if (slack < bestSlack) {
      bestSlack = slack;
      best = b;
    }
  }
  return best;
}
