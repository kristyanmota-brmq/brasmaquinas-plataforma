import * as turf from "@turf/turf";

import { TOLERANCIA_ASPERSOR_EIXO_LATERAL } from "./laterais";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers geométricos (frame métrico local — TASK-046)
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;

function metersPerDegLng(latRad: number): number {
  return 111320 * Math.cos(latRad);
}

function rotate(x: number, y: number, angleRad: number): [number, number] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [x * c - y * s, x * s + y * c];
}

interface PointXY {
  x: number;
  y: number;
}

/** Ray-casting point-in-polygon em coordenadas métricas (frame local). */
function pointInPolygonXY(p: PointXY, ring: PointXY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Converte o anel externo do polígono em frame métrico local rotacionado.
 *
 * Frame local (TASK-046): origem no centroide; eixos em metros; rotação plana
 * por -angleDegrees alinha a grade com o eixo X. Não usa rotação Haversine,
 * eliminando a distorção métrica que `turf.transformRotate` introduz em
 * ângulos não-cardinais.
 */
function polygonToLocalFrame(
  polygon: GeoJSON.Polygon,
  centroidLng: number,
  centroidLat: number,
  angleDegrees: number,
): PointXY[] {
  const latRad = (centroidLat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (angleDegrees * Math.PI) / 180;

  // Apenas o anel externo (polygon.coordinates[0]). Buracos não suportados.
  return polygon.coordinates[0].map(([lng, lat]) => {
    const dx = (lng - centroidLng) * mPerLng;
    const dy = (lat - centroidLat) * M_PER_DEG_LAT;
    const [xr, yr] = rotate(dx, dy, -angleRad);
    return { x: xr, y: yr };
  });
}

function localToLngLat(
  x: number,
  y: number,
  centroidLng: number,
  centroidLat: number,
  angleDegrees: number,
): [number, number] {
  const latRad = (centroidLat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (angleDegrees * Math.PI) / 180;
  // Rotação inversa (+angleRad) para voltar do frame rotacionado ao global.
  const [drx, dry] = rotate(x, y, angleRad);
  return [centroidLng + drx / mPerLng, centroidLat + dry / M_PER_DEG_LAT];
}

function getCentroid(polygon: GeoJSON.Polygon): { lng: number; lat: number } {
  const polyFeature = turf.polygon(polygon.coordinates);
  const c = turf.centroid(polyFeature);
  return {
    lng: c.geometry.coordinates[0],
    lat: c.geometry.coordinates[1],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração da malha (TASK-046 — frame métrico local)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera a malha de posições de aspersores para um polígono e ângulo de grade.
 *
 * Algoritmo (TASK-046 — frame métrico local):
 *   1. Calcular centroide do polígono em lng/lat.
 *   2. Converter cada vértice do polígono para frame métrico local rotacionado
 *      por -angleDegrees (eixos em metros, origem no centroide).
 *   3. Calcular bbox em metros do polígono rotacionado.
 *   4. Gerar grade uniforme em metros (spacingMeters × spacingMeters) sobre o bbox.
 *   5. Filtrar pontos dentro do polígono rotacionado (point-in-polygon métrico).
 *   6. Aplicar rotação plana inversa (+angleDegrees) e converter de volta para lng/lat.
 *
 * Mudança vs. TASK-010A: a versão anterior usava `turf.transformRotate` (Haversine)
 * sobre `turf.pointGrid` (graus geográficos), produzindo distorção métrica em
 * ângulos não-cardinais (0°, 45°). Para ângulos como 17°, 31°, 73°, aspersores
 * de colunas longas ficavam até 7-10 m fora do eixo do frame local → blocker
 * ADR-011. A geração em frame métrico local elimina essa distorção: para qualquer
 * ângulo, aspersores ficam alinhados em colunas perfeitas (desvio ≤ erro numérico).
 *
 * Entradas:
 *   polygon       — área irrigada (GeoJSON.Polygon, coordenadas [lng, lat])
 *   spacingMeters — espaçamento entre aspersores (12 m no padrão Brasmáquinas)
 *   angleDegrees  — ângulo da grade em graus (tipicamente vindo de findOptimalGridAngle)
 *
 * Saída:
 *   Array de [lng, lat] — uma posição por aspersor, em coordenadas geográficas reais.
 *
 * A captação (waterSource) não é parâmetro. A disposição dos aspersores depende
 * exclusivamente de polígono, espaçamento e ângulo.
 */
export function generateRotatedSprinklerGrid(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
  angleDegrees: number,
): [number, number][] {
  return generateRotatedSprinklerGridWithOffset(
    polygon,
    spacingMeters,
    angleDegrees,
    0,
    0,
  );
}

/**
 * Variante com deslocamento da origem da grade.
 *
 * Desloca o padrão de grade por (offsetXm, offsetYm) metros no frame local
 * rotacionado, testando uma fase diferente da grade infinita dentro do mesmo
 * polígono. Invariante: offsetXm = offsetYm = 0 ⇒ resultado igual a
 * `generateRotatedSprinklerGrid`.
 *
 * Os offsets devem estar em [0, spacingMeters) — valores maiores repetem
 * padrões já cobertos por outros candidatos (periodicidade = spacingMeters).
 *
 * TASK-046: geração em frame métrico local (igual à `generateRotatedSprinklerGrid`).
 */
export function generateRotatedSprinklerGridWithOffset(
  polygon: GeoJSON.Polygon,
  spacingMeters: number,
  angleDegrees: number,
  offsetXm: number,
  offsetYm: number,
): [number, number][] {
  const centroid = getCentroid(polygon);
  const ringLocal = polygonToLocalFrame(polygon, centroid.lng, centroid.lat, angleDegrees);
  if (ringLocal.length < 3) return [];

  // Bbox em metros no frame local rotacionado.
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of ringLocal) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }

  // Origem da grade: ajustada pelo offset (mesma fase mod spacingMeters).
  // Garante grade alinhada ao múltiplo inteiro de spacing a partir de xMin/yMin
  // (deslocada por offsetXm/offsetYm).
  const startX = xMin - offsetXm;
  const startY = yMin - offsetYm;

  // Número de pontos em cada direção (+1 para incluir o último alinhado).
  const nCols = Math.floor((xMax - startX) / spacingMeters) + 1;
  const nRows = Math.floor((yMax - startY) / spacingMeters) + 1;

  const result: [number, number][] = [];
  for (let i = 0; i < nCols; i++) {
    for (let j = 0; j < nRows; j++) {
      const x = startX + i * spacingMeters;
      const y = startY + j * spacingMeters;
      if (pointInPolygonXY({ x, y }, ringLocal)) {
        const lngLat = localToLngLat(x, y, centroid.lng, centroid.lat, angleDegrees);
        result.push(lngLat);
      }
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// findOptimalGridAngle (TASK-046 — gate de desvio aspersor-eixo)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encontra o ângulo (0–89°, inteiro) ótimo para a grade.
 *
 * Algoritmo (TASK-046):
 *   1. Avaliar todos os ângulos 0–89°.
 *   2. Para cada ângulo, gerar a malha (frame métrico local — TASK-046) e
 *      calcular o desvio máximo aspersor → eixo (mediana de X) por coluna.
 *   3. **Gate dura**: candidato válido só se `maxDeviation ≤ 0,10 m` (ADR-011).
 *   4. Entre candidatos válidos, escolher o de menor área de bbox.
 *   5. Se nenhum válido (cenário patológico), retorna o de menor desvio máximo
 *      e emite `console.warn` — blocker de eixo dispara como gate final.
 *
 * Com a correção da geração da malha em frame métrico local (TASK-046),
 * espera-se que **todos os ângulos** sejam tecnicamente válidos
 * (`maxDeviation ≈ 0`). Este gate fica como defesa secundária.
 *
 * Não recebe captação nem dado operacional — depende apenas do polígono e do
 * espaçamento.
 *
 * @param spacingMeters Espaçamento entre aspersores (default 12 m, padrão Brasmáquinas).
 */
export function findOptimalGridAngle(
  polygon: GeoJSON.Polygon,
  spacingMeters: number = 12,
): number {
  const centroid = getCentroid(polygon);

  let bestValidAngle: number | null = null;
  let bestValidBboxArea = Infinity;
  let bestFallbackAngle = 0;
  let bestFallbackDev = Infinity;

  for (let angle = 0; angle < 90; angle++) {
    const positions = generateRotatedSprinklerGrid(polygon, spacingMeters, angle);
    if (positions.length === 0) continue;

    // Reaplicar rotação inversa para medir desvio no frame local rotacionado
    // (mesma lógica de generatePhysicalColumns + buildLateralRoute via mediana).
    const latRad = (centroid.lat * Math.PI) / 180;
    const mPerLng = metersPerDegLng(latRad);
    const angleRad = (angle * Math.PI) / 180;

    const local = positions.map(([lng, lat]) => {
      const dx = (lng - centroid.lng) * mPerLng;
      const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
      const [xr, yr] = rotate(dx, dy, -angleRad);
      return { x: xr, y: yr };
    });

    // Agrupamento Math.round (espelha `generatePhysicalColumns`).
    const xMin = local.reduce((m, p) => Math.min(m, p.x), Infinity);
    const byColIdx = new Map<number, { x: number; y: number }[]>();
    for (const p of local) {
      const colIdx = Math.round((p.x - xMin) / spacingMeters);
      const arr = byColIdx.get(colIdx) ?? [];
      arr.push(p);
      byColIdx.set(colIdx, arr);
    }

    // Desvio máximo por coluna usando mediana de X (TASK-045B).
    let maxDev = 0;
    for (const pts of byColIdx.values()) {
      if (pts.length < 2) continue;
      const xs = pts.map((p) => p.x).sort((a, b) => a - b);
      const mid = Math.floor(xs.length / 2);
      const eixoX = xs.length % 2 === 1 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
      let colMax = 0;
      for (const p of pts) {
        const d = Math.abs(p.x - eixoX);
        if (d > colMax) colMax = d;
      }
      if (colMax > maxDev) maxDev = colMax;
    }

    // Bbox area no frame local (já calculado implicitamente — ringLocal).
    const ringLocal = polygonToLocalFrame(polygon, centroid.lng, centroid.lat, angle);
    let rxMin = Infinity, rxMax = -Infinity, ryMin = Infinity, ryMax = -Infinity;
    for (const p of ringLocal) {
      if (p.x < rxMin) rxMin = p.x;
      if (p.x > rxMax) rxMax = p.x;
      if (p.y < ryMin) ryMin = p.y;
      if (p.y > ryMax) ryMax = p.y;
    }
    const bboxArea = (rxMax - rxMin) * (ryMax - ryMin);

    const isValid = maxDev <= TOLERANCIA_ASPERSOR_EIXO_LATERAL;
    if (isValid) {
      if (bestValidAngle === null || bboxArea < bestValidBboxArea) {
        bestValidAngle = angle;
        bestValidBboxArea = bboxArea;
      }
    } else if (maxDev < bestFallbackDev) {
      bestFallbackAngle = angle;
      bestFallbackDev = maxDev;
    }
  }

  if (bestValidAngle !== null) return bestValidAngle;

  // Fallback: nenhum ângulo atinge o gate. Blocker dispara como defesa final.
  console.warn(
    `[findOptimalGridAngle] Nenhum ângulo 0-89° produz aspersores dentro de ${TOLERANCIA_ASPERSOR_EIXO_LATERAL} m do eixo. ` +
      `Retornando ${bestFallbackAngle}° (menor desvio: ${bestFallbackDev.toFixed(2)} m). ` +
      `Blocker de eixo (detectAxisDeviations) dispara como gate final — corrigir polígono ou tolerância.`,
  );
  return bestFallbackAngle;
}
