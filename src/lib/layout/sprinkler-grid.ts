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

/**
 * Variante de generateRotatedSprinklerGrid com deslocamento da origem da grade.
 *
 * Desloca o padrão de grade por (offsetXm, offsetYm) metros no frame local rotacionado,
 * testando uma fase diferente da grade infinita 12×12 dentro do mesmo polígono.
 *
 * Invariante: offsetXm = 0 e offsetYm = 0 produz resultado equivalente a
 * generateRotatedSprinklerGrid(polygon, spacingMeters, angleDegrees).
 *
 * Os offsets devem estar em [0, spacingMeters) — valores maiores repetem padrões
 * já cobertos por outros candidatos (periodicidade = spacingMeters).
 *
 * A captação (waterSource) não é parâmetro — a disposição depende apenas de
 * polígono, espaçamento, ângulo e offset.
 */
export function generateRotatedSprinklerGridWithOffset(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
  angleDegrees: number,
  offsetXm: number,
  offsetYm: number,
): [number, number][] {
  const polyFeature = turf.polygon(polygon.coordinates);
  const centroid = turf.centroid(polyFeature);
  const centLat = (centroid.geometry.coordinates[1] * Math.PI) / 180;

  // Converter offset de metros para graus no espaço geográfico
  const offsetXdeg = offsetXm / (111320 * Math.cos(centLat)) / 1000;
  const offsetYdeg = offsetYm / 111320 / 1000;

  const rotatedPoly = turf.transformRotate(polyFeature, -angleDegrees, {
    pivot: centroid,
  });

  const bbox = turf.bbox(rotatedPoly);

  // Expandir o bbox mínimo pelo offset desloca o padrão de grade dentro do polígono.
  // Quando offsetXdeg = offsetYdeg = 0, shiftedBbox === bbox → comportamento idêntico
  // ao generateRotatedSprinklerGrid.
  const shiftedBbox: [number, number, number, number] = [
    bbox[0] - offsetXdeg,
    bbox[1] - offsetYdeg,
    bbox[2],
    bbox[3],
  ];

  const grid = turf.pointGrid(shiftedBbox, spacingMeters / 1000, {
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
