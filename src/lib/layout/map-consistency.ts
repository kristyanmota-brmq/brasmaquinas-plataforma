import type { IrrigationProjectResult } from "@/lib/layout/irrigation-project";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Relatório de consistência entre o que o motor calculou e o que o mapa renderiza.
 * Cada campo quantifica um subconjunto do projeto; `warnings` e `blockers` resumem
 * divergências encontradas.
 */
export interface MapNetworkConsistencyReport {
  sprinklersTotal: number;
  /** Aspersores cobertos por pelo menos uma PhysicalColumn. */
  sprinklersInPhysicalColumns: number;
  /** Aspersores sem coluna física correspondente — implica lacuna no cálculo de material. */
  sprinklersWithoutPhysicalColumn: number;

  physicalColumnsTotal: number;
  /** Colunas físicas conectadas à principal (total - órfãs). */
  physicalColumnsRendered: number;

  operationalSegmentsTotal: number;
  /** Laterais derivadas (deve ser igual a operationalSegmentsTotal em projeto válido). */
  operationalSegmentsRendered: number;

  secondariesTotal: number;
  /** Ramais renderizados (igual ao total — todos são renderizados quando presentes). */
  secondariesRendered: number;

  controlPointsTotal: number;
  /** Pontos de controle do tipo `section_valve` (válvulas de seção pendentes). */
  controlPointsSectionValve: number;
  /** Pontos de controle do tipo `lateral_inlet` (conexão natural lateral → principal). */
  controlPointsLateralInlet: number;

  /** Percentual do comprimento da principal fora do polígono. Indefinido se não calculado. */
  principalOutsidePolygonPercent?: number;
  /** `layout.mainPipeline.corridorValidated`. Indefinido quando mainPipeline não existe. */
  corridorValidated?: boolean;

  /**
   * Colunas físicas onde o `lateral_inlet` ControlPoint está no extremo oposto ao
   * `secondary.toCoord`. Após a correção de D2, deve ser 0 em qualquer projeto válido.
   */
  inletSideMismatchCount: number;

  /** Divergências não bloqueantes — projeto pode ser emitido, mas requer atenção visual. */
  warnings: string[];
  /** Inconsistências graves — projeto não deve ser emitido sem resolução. */
  blockers: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Função pura
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Audita a consistência entre `IrrigationProjectResult` e o que o mapa renderiza.
 *
 * Função pura: não altera o resultado, não acessa o DOM, não produz efeitos.
 * Deve ser chamada em qualquer ponto após `calculateIrrigationProject`.
 */
export function buildMapNetworkConsistencyReport(
  result: IrrigationProjectResult,
): MapNetworkConsistencyReport {
  const physicalColumns = result.physical?.physicalColumns ?? [];
  const operationalSegments = result.operational?.operationalSegments ?? [];
  const laterais = result.distribution?.laterais ?? [];
  const controlPoints = result.constructability?.controlPoints ?? [];
  const orphanIds = result.hydraulic?.connectivityReport.orphanPhysicalColumns ?? [];
  const corridorValidated = result.hydraulic?.corridorValidated;

  // ── Aspersores ───────────────────────────────────────────────────────────────

  const sprinklersTotal =
    result.input?.positions.length ?? result.layout.sprinklers?.count ?? 0;

  const sprinklersInPhysicalColumns = physicalColumns.reduce(
    (sum, col) => sum + col.sprinklerCount,
    0,
  );
  const sprinklersWithoutPhysicalColumn = sprinklersTotal - sprinklersInPhysicalColumns;

  // ── Colunas físicas ──────────────────────────────────────────────────────────

  const physicalColumnsTotal = physicalColumns.length;
  const orphanCount = orphanIds.length;
  const physicalColumnsRendered = physicalColumnsTotal - orphanCount;

  // ── Rede operacional / laterais ──────────────────────────────────────────────

  const operationalSegmentsTotal = operationalSegments.length;
  const operationalSegmentsRendered = laterais.length;

  // ── Ramais / secundárias ─────────────────────────────────────────────────────

  const secondaries = result.hydraulic?.secondaries ?? [];
  const secondariesTotal = secondaries.length;
  const secondariesRendered = secondariesTotal;

  // ── Pontos de controle ───────────────────────────────────────────────────────

  const controlPointsTotal = controlPoints.length;
  const controlPointsSectionValve = controlPoints.filter(
    (cp) => cp.type === "section_valve",
  ).length;
  const controlPointsLateralInlet = controlPoints.filter(
    (cp) => cp.type === "lateral_inlet",
  ).length;

  // ── Mismatch de inlet: lateral_inlet vs secondary.toCoord ───────────────────

  // TASK-053: mapa de TODAS as colunas servidas (via physicalColumnIds), incluindo sub-coletor multi-coluna.
  // Para SecondaryPipe legado 1:1: mapeia apenas physicalColumnId (comportamento idêntico ao anterior).
  const secondaryByColId = new Map<string, SecondaryPipe>();
  for (const s of secondaries) {
    const colIds = s.physicalColumnIds ?? [s.physicalColumnId];
    for (const colId of colIds) {
      secondaryByColId.set(colId, s);
    }
  }
  const centroid = result.input?.centroid;
  const mPerLng = centroid
    ? 111320 * Math.cos((centroid.lat * Math.PI) / 180)
    : 111320;

  let inletSideMismatchCount = 0;
  for (const col of physicalColumns) {
    const sec = secondaryByColId.get(col.id);
    if (!sec) continue; // contato direto com a principal — sem ramal, sem conflito possível

    const inletCp = controlPoints.find(
      (cp) => cp.physicalColumnId === col.id && cp.type === "lateral_inlet",
    );
    if (!inletCp) continue;

    // TASK-053: para sub-coletor multi-coluna (physicalColumnIds.length > 1), a polilinha do sec
    // toca múltiplos inlets em vértices internos — sec.toCoord só é o inlet da ÚLTIMA coluna.
    // Para a coluna corrente, o vértice "alimentado" pode estar em qualquer ponto da polilinha.
    // Estratégia: comparar inletCp contra o vértice MAIS PRÓXIMO da polilinha do sec.
    // Para sub-coletor 1:1 legado (physicalColumnIds.length === 1): polilinha = [from, to] e
    // o vértice mais próximo é toCoord — comportamento idêntico ao anterior.
    const polyline = sec.coords ?? [sec.fromCoord, sec.toCoord];
    let bestDistM = Infinity;
    for (const v of polyline) {
      const dx = (inletCp.coordinate[0] - v[0]) * mPerLng;
      const dy = (inletCp.coordinate[1] - v[1]) * 111320;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDistM) bestDistM = d;
    }

    if (bestDistM > 1.0) {
      inletSideMismatchCount++;
    }
  }

  // ── Warnings e blockers ──────────────────────────────────────────────────────

  const warnings: string[] = [];
  const blockers: string[] = [];

  if (corridorValidated === false) {
    warnings.push(
      "corridorValidated=false — principal não validada: verifique alinhamento com o polígono",
    );
  }

  if (operationalSegmentsRendered !== operationalSegmentsTotal) {
    warnings.push(
      `operationalSegmentsRendered (${operationalSegmentsRendered}) ≠ operationalSegmentsTotal (${operationalSegmentsTotal}) — laterais faltando`,
    );
  }

  if (sprinklersWithoutPhysicalColumn > 0) {
    blockers.push(
      `${sprinklersWithoutPhysicalColumn} aspersor(es) sem coluna física — lacuna no cálculo de material`,
    );
  }

  if (orphanCount > 0) {
    blockers.push(
      `${orphanCount} coluna(s) física(s) órfã(s) — falha de conectividade hidráulica`,
    );
  }

  return {
    sprinklersTotal,
    sprinklersInPhysicalColumns,
    sprinklersWithoutPhysicalColumn,
    physicalColumnsTotal,
    physicalColumnsRendered,
    operationalSegmentsTotal,
    operationalSegmentsRendered,
    secondariesTotal,
    secondariesRendered,
    controlPointsTotal,
    controlPointsSectionValve,
    controlPointsLateralInlet,
    corridorValidated,
    inletSideMismatchCount,
    warnings,
    blockers,
  };
}
