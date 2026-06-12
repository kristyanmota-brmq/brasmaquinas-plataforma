// ─────────────────────────────────────────────────────────────────────────────
// Schema do ProjectLayout — tipos e utilitários de migração.
//
// NÃO tem "use server". Pode ser importado por client components,
// server components e funções de domínio.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENT_LAYOUT_SCHEMA_VERSION = "1";

/**
 * Migra dados brutos (possivelmente de schema antigo) para ProjectLayout atual.
 * Adiciona schemaVersion quando ausente. Seguro para qualquer entrada.
 */
export function migrateLayout(data: unknown): ProjectLayout {
  if (data === null || typeof data !== "object") {
    return { schemaVersion: CURRENT_LAYOUT_SCHEMA_VERSION };
  }
  const raw = data as Record<string, unknown>;
  return {
    ...(raw as ProjectLayout),
    schemaVersion: CURRENT_LAYOUT_SCHEMA_VERSION,
  };
}

/**
 * Valida se os dados podem ser usados como ProjectLayout.
 * Não valida campos opcionais — apenas rejeita tipos fundamentalmente errados.
 */
export function validateLayout(
  data: unknown,
): { valid: true; layout: ProjectLayout } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  if (data === null || data === undefined) {
    errors.push("layout é nulo ou indefinido");
    return { valid: false, errors };
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    errors.push(`layout deve ser um objeto, recebeu ${Array.isArray(data) ? "array" : typeof data}`);
    return { valid: false, errors };
  }
  const raw = data as Record<string, unknown>;
  if (raw.sprinklers !== undefined && typeof raw.sprinklers !== "object") {
    errors.push("sprinklers deve ser um objeto");
  }
  if (raw.sectorization !== undefined && typeof raw.sectorization !== "object") {
    errors.push("sectorization deve ser um objeto");
  }
  if (raw.mainPipeline !== undefined && typeof raw.mainPipeline !== "object") {
    errors.push("mainPipeline deve ser um objeto");
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, layout: migrateLayout(data) };
}

export interface ProjectLayout {
  schemaVersion?: string;
  area?: GeoJSON.Polygon;
  areaHectares?: number;
  perimeterMeters?: number;
  centroid?: { lng: number; lat: number };
  waterSource?: { lng: number; lat: number; elevation?: number };
  pumpLocation?: { lng: number; lat: number; elevation?: number } | null;
  pumpSeparate?: boolean;
  areaElevation?: number;
  geodetic?: {
    distanceSourceToAreaMeters?: number;
    elevationDeltaMeters?: number;
  };
  geocoded?: {
    city?: string;
    state?: string;
    fullAddress?: string;
  };
  sprinklers?: {
    aspersorId: string;
    positions: [number, number][];
    count: number;
    vazaoProjetoM3PorHora: number;
    espacamentoM: number;
    gridAngleDegrees: number;
    /**
     * "auto"      — ângulo ótimo pelo bbox mínimo (fluxo padrão)
     * "manual"    — ajustado manualmente pelo slider
     * "optimizer" — candidato geométrico preliminar (não homologado tecnicamente)
     */
    angleMode: "auto" | "manual" | "optimizer";
  };
  sectorization?: {
    jornadaHoras: 9 | 14 | 21;
    /** TASK-060: lâmina desejada (mm/dia) — input do projetista; default 10. */
    laminaMm: number;
    /** TASK-060: cultura informada pelo projetista (opcional; ex.: pastagem, capim). */
    cultura?: string;
    setoresCount: number;
    tempoPorSetorMinutos: number;
    aspersoresPorSetor: number;
    vazaoPorSetorM3PorHora: number;
    sectorIndices: number[];
  };
  mainPipeline?: {
    coordinates: [number, number][];
    adutora?: [number, number][];
    lengthMeters: number;
    segments: number;
    elevationStartM?: number;
    elevationEndM?: number;
    elevationDeltaM?: number;
    source: "auto" | "manual";
    /**
     * true quando o engenheiro validou o corredor de instalação.
     * Requisito para geração de proposta final quando source === "auto".
     */
    corridorValidated?: boolean;
  };
  center?: { lng: number; lat: number; zoom: number };
  /** Bomba selecionada. Quando ausente, HMT é calculada mas sem validação contra curva Q-H. */
  pump?: { hmtMca: number; vazaoMaxM3h: number; /** TASK-065: modelo do catálogo de bombas. */ modelo?: string };
}
