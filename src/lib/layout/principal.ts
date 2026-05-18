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

// Ponto da polilinha mais próximo de pt (em coordenadas geográficas).
function nearestPointOnPolyline(
  pt: [number, number],
  poly: [number, number][],
): [number, number] {
  let bestDist = Infinity;
  let best: [number, number] = poly[0];
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / len2));
    const proj: [number, number] = [a[0] + t * dx, a[1] + t * dy];
    const dist = (pt[0] - proj[0]) ** 2 + (pt[1] - proj[1]) ** 2;
    if (dist < bestDist) { bestDist = dist; best = proj; }
  }
  return best;
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

  const ws: [number, number] = [waterSource.lng, waterSource.lat];
  const [, wsLocalY] = toLocal(ws[0], ws[1]);

  // Para cada lateral, seleciona o extremo geograficamente mais próximo da captação.
  // Evita qualquer suposição sobre qual lado do frame rotacionado corresponde à captação,
  // tornando o cálculo correto para qualquer ângulo de grid.
  const captSideLocal = laterais.map((lat) => {
    const dStart =
      (lat.startLngLat[0] - ws[0]) ** 2 + (lat.startLngLat[1] - ws[1]) ** 2;
    const dEnd =
      (lat.endLngLat[0] - ws[0]) ** 2 + (lat.endLngLat[1] - ws[1]) ** 2;
    return toLocal(...(dStart <= dEnd ? lat.startLngLat : lat.endLngLat));
  });

  // principalY único: extremo dos pontos do lado da captação, deslocado spacing/2 na
  // direção da captação. Usa wsLocalY para saber em qual direção deslocar.
  const captSideYsSorted = [...captSideLocal.map((p) => p[1])].sort((a, b) => a - b);
  const captSideYMedian = captSideYsSorted[Math.floor(captSideYsSorted.length / 2)];
  const principalY =
    wsLocalY <= captSideYMedian
      ? captSideYsSorted[0] - spacingMeters / 2
      : captSideYsSorted[captSideYsSorted.length - 1] + spacingMeters / 2;

  // Ordena por X e colapsa em colunas físicas.
  captSideLocal.sort((a, b) => a[0] - b[0]);
  const colunas: [number, number][][] = [];
  for (const pt of captSideLocal) {
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

  // Adutora: ponto da principal geograficamente mais próximo da captação.
  // Quando a captação está alinhada com o centro da principal, conecta no centro;
  // quando está deslocada para uma extremidade, conecta nessa extremidade.
  const connectionPt = nearestPointOnPolyline(ws, principal);

  return { principal, adutora: [ws, connectionPt] };
}
