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

function dist2(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
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

  // Projeta cada derivação no frame rotacionado
  const localPts = laterais.map(({ derivacaoLngLat: [lng, lat] }) => {
    const dx = (lng - centroid.lng) * mPerLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return rotate(dx, dy, -angleRad); // [x, y] em metros
  });

  // Ordena por X (eixo perpendicular às laterais)
  localPts.sort((a, b) => a[0] - b[0]);

  // Colapsa pontos com X próximo (mesma coluna física, setores diferentes)
  // para um único ponto representativo (menor Y = extremidade mais próxima da captação).
  const colunas: [number, number][][] = [];
  for (const pt of localPts) {
    const last = colunas[colunas.length - 1];
    if (last && Math.abs(pt[0] - last[0][0]) <= tolerance) {
      last.push(pt);
    } else {
      colunas.push([pt]);
    }
  }

  // Representante de cada coluna: ponto com menor Y absoluto
  const principal: [number, number][] = colunas.map((col) => {
    const rep = col.reduce((a, b) => (Math.abs(a[1]) < Math.abs(b[1]) ? a : b));
    return toLngLat(rep[0], rep[1]);
  });

  // Adutora: captação → extremidade da principal mais próxima
  const ws: [number, number] = [waterSource.lng, waterSource.lat];
  const nearestEndpoint =
    dist2(ws, principal[0]) <= dist2(ws, principal[principal.length - 1])
      ? principal[0]
      : principal[principal.length - 1];

  return { principal, adutora: [ws, nearestEndpoint] };
}
