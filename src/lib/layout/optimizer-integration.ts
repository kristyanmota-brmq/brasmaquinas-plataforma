/**
 * Mapeamento puro entre LayoutCandidate (motor geométrico) e o formato
 * ProjectLayout["sprinklers"] esperado pelo ProjectMap e pelo banco.
 *
 * Isolado aqui para ser testável sem depender de React ou estado de UI.
 */

import type { LayoutCandidate } from "@/lib/layout/sprinkler-grid-optimizer";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

/**
 * Converte um candidato geométrico em um objeto `sprinklers` compatível
 * com `ProjectLayout`, marcando `angleMode = "optimizer"`.
 *
 * Não chama solver, BOM nem setorização.
 * `waterSource` não é parâmetro.
 */
export function candidateToSprinklers(
  candidate: LayoutCandidate,
  aspersorId: string,
  spacingM: number,
  vazaoM3PorHoraPerSprinkler: number,
): NonNullable<ProjectLayout["sprinklers"]> {
  const count = candidate.positions.length;
  return {
    aspersorId,
    positions: candidate.positions,
    count,
    vazaoProjetoM3PorHora: count * vazaoM3PorHoraPerSprinkler,
    espacamentoM: spacingM,
    gridAngleDegrees: candidate.angleDegrees,
    angleMode: "optimizer",
  };
}
