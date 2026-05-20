/**
 * Tipos do modelo de grafo hidráulico.
 *
 * Hierarquia física da rede:
 *   water_source → adutora → principal_node(s) → [secondary →] lateral_inlet → sprinklers
 *
 * Cada nó representa um ponto hidraulicamente significativo.
 * Cada aresta carrega um segmento de tubulação com comprimento e diâmetro.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Nós
// ─────────────────────────────────────────────────────────────────────────────

export type HydraulicNodeType =
  | "water_source"
  | "adutora_start"
  | "adutora_end"
  | "principal_node"
  | "secondary_start"
  | "secondary_end"
  | "lateral_inlet"
  | "control_point"
  | "sprinkler";

export interface HydraulicNode {
  id: string;
  type: HydraulicNodeType;
  coordinate: [number, number];
  physicalColumnId?: string;
  sectorId?: number;
  operationalSegmentId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arestas
// ─────────────────────────────────────────────────────────────────────────────

export type HydraulicEdgeType =
  | "adutora"
  | "principal"
  | "secondary"
  | "lateral"
  | "operational_segment";

export interface HydraulicEdge {
  id: string;
  type: HydraulicEdgeType;
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  diameterMm?: number;
  flowM3h?: number;
  source: "auto" | "manual";
}

// ─────────────────────────────────────────────────────────────────────────────
// Grafo completo
// ─────────────────────────────────────────────────────────────────────────────

export interface HydraulicGraph {
  nodes: Map<string, HydraulicNode>;
  edges: HydraulicEdge[];
}
