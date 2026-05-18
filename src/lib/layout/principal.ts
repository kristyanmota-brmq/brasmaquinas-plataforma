import type { Lateral } from "./laterais";

const M_PER_DEG_LAT = 111320;

function metersPerDegLng(latRad: number): number {
  return 111320 * Math.cos(latRad);
}

function rotate(x: number, y: number, angleRad: number): [number, number] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [x * c - y * s, x * s + y * c];
}

export function generatePrincipalAndAdutora(
  waterSource: { lng: number; lat: number },
  laterais: Lateral[],
  centroid: { lng: number; lat: number },
  gridAngleDegrees: number,
  spacingMeters: number = 12,
): { principal: [number, number][]; adutora: [number, number][] } {
  if (laterais.length === 0) {
    return {
      principal: [
        [waterSource.lng, waterSource.lat],
        [centroid.lng, centroid.lat],
      ],
      adutora: [],
    };
  }

  const latRad = (centroid.lat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;
  const tolerance = spacingMeters * 0.5;

  const toLngLat = (x: number, y: number): [number, number] => {
    const [drx, dry] = rotate(x, y, angleRad);
    return [centroid.lng + drx / mPerLng, centroid.lat + dry / M_PER_DEG_LAT];
  };

  const toLocal = (lng: number, lat: number): [number, number] => {
    const dx = (lng - centroid.lng) * mPerLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return rotate(dx, dy, -angleRad);
  };

  // Captação no frame rotacionado — mesma base do grid de aspersores.
  const [wsLocalX, wsLocalY] = toLocal(waterSource.lng, waterSource.lat);

  // Projeta início (primeiro aspersor, min-Y) e fim (último aspersor, max-Y) de cada lateral.
  const localStartPts = laterais.map(({ derivacaoLngLat: [lng, lat] }) => toLocal(lng, lat));
  const localEndPts   = laterais.map(({ endLngLat:       [lng, lat] }) => toLocal(lng, lat));

  // Centro do campo em Y = mediana dos pontos médios de cada lateral.
  // Mais robusto que usar só os primeiros aspersores como referência.
  const midYs       = laterais.map((_, i) => (localStartPts[i][1] + localEndPts[i][1]) / 2);
  const midYsSorted = [...midYs].sort((a, b) => a - b);
  const fieldMidY   = midYsSorted[Math.floor(midYsSorted.length / 2)];
  const captacaoIsMinSide = wsLocalY <= fieldMidY;

  // principalY único global → linha reta.
  // Bug anterior: sempre usava derivacaoLngLat (primeiro aspersor, min-Y) mesmo quando
  // a captação está no lado max-Y → principal ficava no lado errado do campo.
  // Correção: usa endLngLat (último aspersor, max-Y) quando captação está no lado max-Y.
  const refYs     = captacaoIsMinSide
    ? localStartPts.map((p) => p[1])
    : localEndPts.map((p) => p[1]);
  const refYSorted = [...refYs].sort((a, b) => a - b);
  const principalY = captacaoIsMinSide
    ? refYSorted[0] - spacingMeters / 2
    : refYSorted[refYSorted.length - 1] + spacingMeters / 2;

  // Ordena por X (eixo ao longo da principal) usando startPts (mesmo X que endPts).
  localStartPts.sort((a, b) => a[0] - b[0]);

  // Colapsa pontos com X próximo (mesma coluna física, setores diferentes)
  const colunas: [number, number][][] = [];
  for (const pt of localStartPts) {
    const last = colunas[colunas.length - 1];
    if (last && Math.abs(pt[0] - last[0][0]) <= tolerance) {
      last.push(pt);
    } else {
      colunas.push([pt]);
    }
  }

  // X médio por coluna + principalY constante → linha reta.
  const colXs = colunas.map((col) => col.reduce((sum, p) => sum + p[0], 0) / col.length);
  const principal: [number, number][] = colXs.map((x) => toLngLat(x, principalY));

  // Adutora alinhada ao grid: perpendicular se captação está inline, endpoint mais próximo caso contrário.
  const xMin = colXs[0];
  const xMax = colXs[colXs.length - 1];
  const ws: [number, number] = [waterSource.lng, waterSource.lat];

  let connectionPt: [number, number];
  if (wsLocalX >= xMin && wsLocalX <= xMax) {
    connectionPt = toLngLat(wsLocalX, principalY);
  } else {
    const d0 = (ws[0] - principal[0][0]) ** 2 + (ws[1] - principal[0][1]) ** 2;
    const dN =
      (ws[0] - principal[principal.length - 1][0]) ** 2 +
      (ws[1] - principal[principal.length - 1][1]) ** 2;
    connectionPt = d0 <= dN ? principal[0] : principal[principal.length - 1];
  }

  return { principal, adutora: [ws, connectionPt] };
}
