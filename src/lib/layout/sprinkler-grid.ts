import * as turf from "@turf/turf";

/**
 * Encontra o ângulo (0–89°, inteiro) que minimiza a área do bounding box
 * do polígono rotacionado.  Ângulo menor = grade com maior preenchimento.
 *
 * Não recebe captação nem qualquer dado operacional — depende apenas do
 * polígono da área irrigada.
 */
export function findOptimalGridAngle(polygon: GeoJSON.Polygon): number {
  const polyFeature = turf.polygon(polygon.coordinates);
  const centroid = turf.centroid(polyFeature);
  let minArea = Infinity;
  let bestAngle = 0;

  for (let angle = 0; angle < 90; angle++) {
    const rotated = turf.transformRotate(polyFeature, -angle, {
      pivot: centroid,
    });
    const bbox = turf.bbox(rotated);
    const width = bbox[2] - bbox[0];
    const height = bbox[3] - bbox[1];
    const area = width * height;

    if (area < minArea) {
      minArea = area;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

/**
 * Gera a malha de posições de aspersores para um polígono e ângulo de grade.
 *
 * Algoritmo:
 *   1. Rotaciona o polígono por -angleDegrees (alinha com eixos).
 *   2. Gera grade retangular sobre o bbox do polígono rotacionado.
 *   3. Filtra pontos dentro do polígono rotacionado.
 *   4. Rotaciona os pontos de volta por +angleDegrees.
 *
 * Entradas:
 *   polygon       — área irrigada (GeoJSON.Polygon, coordenadas [lng, lat])
 *   spacingMeters — espaçamento entre aspersores (12 m no padrão Brasmáquinas)
 *   angleDegrees  — ângulo da grade em graus (tipicamente vindo de findOptimalGridAngle)
 *
 * Saída:
 *   Array de [lng, lat] — uma posição por aspersor, em coordenadas geográficas reais.
 *
 * A captação (waterSource) não é parâmetro.  A disposição dos aspersores depende
 * exclusivamente de polígono, espaçamento e ângulo.  A captação entra apenas em
 * etapas posteriores (principal, adutora, hidráulica).
 */
export function generateRotatedSprinklerGrid(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
  angleDegrees: number
): [number, number][] {
  const polyFeature = turf.polygon(polygon.coordinates);
  const centroid = turf.centroid(polyFeature);

  const rotatedPoly = turf.transformRotate(polyFeature, -angleDegrees, {
    pivot: centroid,
  });

  const bbox = turf.bbox(rotatedPoly);
  const grid = turf.pointGrid(bbox, spacingMeters / 1000, {
    units: "kilometers",
  });

  const inside = turf.pointsWithinPolygon(grid, rotatedPoly);

  const final = inside.features.map((f) =>
    turf.transformRotate(f, angleDegrees, { pivot: centroid })
  );

  return final.map(
    (f) => (f.geometry as GeoJSON.Point).coordinates as [number, number]
  );
}
