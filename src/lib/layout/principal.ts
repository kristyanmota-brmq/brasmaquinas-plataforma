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

  // Captação no frame rotacionado — mesma base do grid de aspersores.
  const wsDx = (waterSource.lng - centroid.lng) * mPerLng;
  const wsDy = (waterSource.lat - centroid.lat) * M_PER_DEG_LAT;
  const [wsLocalX, wsLocalY] = rotate(wsDx, wsDy, -angleRad);

  // Projeta cada derivação no frame rotacionado
  const localPts = laterais.map(({ derivacaoLngLat: [lng, lat] }) => {
    const dx = (lng - centroid.lng) * mPerLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return rotate(dx, dy, -angleRad);
  });

  // sortedY: mediana define o lado interior; extremo define onde assenta a principal.
  const sortedY = [...localPts.map((p) => p[1])].sort((a, b) => a - b);
  const medianY = sortedY[Math.floor(sortedY.length / 2)];
  const captacaoIsMinSide = wsLocalY <= medianY;

  // Y único global → principal reta independente da forma do talhão.
  const principalY = captacaoIsMinSide
    ? sortedY[0] - spacingMeters / 2
    : sortedY[sortedY.length - 1] + spacingMeters / 2;

  // Ordena por X (eixo ao longo da principal)
  localPts.sort((a, b) => a[0] - b[0]);

  // Colapsa pontos com X próximo (mesma coluna física, setores diferentes)
  const colunas: [number, number][][] = [];
  for (const pt of localPts) {
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

  // Adutora alinhada com o grid: projeta a captação no eixo X da principal
  // (paralela às laterais, mesma lógica do grid de aspersores).
  // Se a captação estiver fora do alcance X, conecta à extremidade mais próxima.
  const xMin = colXs[0];
  const xMax = colXs[colXs.length - 1];
  const connectionX = Math.max(xMin, Math.min(xMax, wsLocalX));
  const connectionPt = toLngLat(connectionX, principalY);

  return { principal, adutora: [[waterSource.lng, waterSource.lat], connectionPt] };
}
