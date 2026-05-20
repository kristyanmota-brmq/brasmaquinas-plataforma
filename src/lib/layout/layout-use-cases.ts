/**
 * Use-cases de mutação de layout — camada entre UI (ProjectMap) e domínio.
 *
 * ProjectMap deve importar daqui, nunca diretamente de principal.ts ou sectorization.ts.
 */

import { generatePrincipalAndAdutora } from "./principal";
import { buildSectorsByFlowWithColumnSplitting } from "./sectorization";
import type { PhysicalColumn } from "./laterais";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

const LAMINA_MM = 10 as const;

const M_PER_DEG_LAT = 111320;

function lngLatDistM(a: [number, number], b: [number, number]): number {
  const mPerLng = M_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

function pipelineLength(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  return coords.slice(1).reduce((sum, pt, i) => sum + lngLatDistM(coords[i], pt), 0);
}

/**
 * Computes the auto-pipeline coordinates from the physical network.
 * Elevation values are queried separately in the UI and passed in.
 * Returns null when required fields are missing.
 */
export function buildAutoPipelineCoords(
  waterSource: { lng: number; lat: number },
  physicalColumns: PhysicalColumn[],
  centroid: { lng: number; lat: number },
  gridAngleDegrees: number,
): { principal: [number, number][]; adutora: [number, number][]; lengthMeters: number } {
  const fallback: [number, number][] = [
    [waterSource.lng, waterSource.lat],
    [centroid.lng, centroid.lat],
  ];

  const { principal, adutora } =
    physicalColumns.length > 0
      ? generatePrincipalAndAdutora(waterSource, physicalColumns, centroid, gridAngleDegrees)
      : { principal: fallback, adutora: [] as [number, number][] };

  return { principal, adutora, lengthMeters: pipelineLength(principal) };
}

/**
 * Returns the complete mainPipeline object from pre-computed coordinates.
 * Elevation values come from the map terrain API (UI concern).
 */
export function buildMainPipelineUpdate(
  principal: [number, number][],
  adutora: [number, number][],
  lengthMeters: number,
  elevationStartM: number | undefined,
  elevationEndM: number | undefined,
): NonNullable<ProjectLayout["mainPipeline"]> {
  const elevationDeltaM =
    elevationStartM !== undefined && elevationEndM !== undefined
      ? elevationEndM - elevationStartM
      : undefined;

  return {
    coordinates: principal,
    adutora,
    lengthMeters,
    segments: principal.length - 1,
    elevationStartM,
    elevationEndM,
    elevationDeltaM,
    source: "auto",
  };
}

/**
 * Returns the sectorization object for the given jornada.
 * Does not mutate layout — caller uses setLayout.
 */
export function buildSectorizationForJornada(
  physicalColumns: PhysicalColumn[],
  jornada: 9 | 14 | 21,
  totalSprinklerCount: number,
  vazaoM3PorHoraPerSprinkler: number,
  tempoPorSetorMinutos: number,
): NonNullable<ProjectLayout["sectorization"]> {
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(
    physicalColumns,
    jornada,
    vazaoM3PorHoraPerSprinkler,
    totalSprinklerCount,
  );
  const aspersoresPorSetor = Math.round(totalSprinklerCount / jornada);
  const vazaoPorSetorM3PorHora = aspersoresPorSetor * vazaoM3PorHoraPerSprinkler;

  return {
    jornadaHoras: jornada,
    laminaMm: LAMINA_MM,
    setoresCount: jornada,
    tempoPorSetorMinutos,
    aspersoresPorSetor,
    vazaoPorSetorM3PorHora,
    sectorIndices,
  };
}
