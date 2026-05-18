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

// Ponto médio de uma polilinha por comprimento de arco.
function midpointPolyline(pts: [number, number][]): [number, number] {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.sqrt((pts[i][0] - pts[i - 1][0]) ** 2 + (pts[i][1] - pts[i - 1][1]) ** 2);
  }
  const half = total / 2;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.sqrt(
      (pts[i][0] - pts[i - 1][0]) ** 2 + (pts[i][1] - pts[i - 1][1]) ** 2,
    );
    if (acc + seg >= half) {
      const t = (half - acc) / seg;
      return [
        pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]),
        pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]),
      ];
    }
    acc += seg;
  }
  return pts[pts.length - 1];
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

  // Determina o lado da captação no frame local para posicionar a principal corretamente.
  const wsDx = (waterSource.lng - centroid.lng) * mPerLng;
  const wsDy = (waterSource.lat - centroid.lat) * M_PER_DEG_LAT;
  const [, wsLocalY] = rotate(wsDx, wsDy, -angleRad);

  // Projeta cada derivação no frame rotacionado
  const localPts = laterais.map(({ derivacaoLngLat: [lng, lat] }) => {
    const dx = (lng - centroid.lng) * mPerLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return rotate(dx, dy, -angleRad);
  });

  // sortedY contém todos os Y das derivações — usado para mediana e extremos globais.
  const sortedY = [...localPts.map((p) => p[1])].sort((a, b) => a - b);
  const medianY = sortedY[Math.floor(sortedY.length / 2)];
  // A principal fica no lado da captação (min-Y se captação abaixo, max-Y se acima).
  const captacaoIsMinSide = wsLocalY <= medianY;

  // Y único global para toda a principal — garante linha reta independente da forma do talhão.
  // Posicionada a spacing/2 além do aspersor extremo no lado da captação.
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

  // X representativo = média dos X da coluna; Y fixo = principalY → principal reta.
  const principal: [number, number][] = colunas.map((col) => {
    const xRep = col.reduce((sum, p) => sum + p[0], 0) / col.length;
    return toLngLat(xRep, principalY);
  });

  // Critério 1 (terreno plano): adutora conecta no ponto médio da principal.
  // Minimiza a diferença de pressão entre o setor mais próximo e o mais distante.
  // Para terreno inclinado, o chamador pode sobrescrever o ponto de conexão com
  // base na elevação das extremidades (extremidade mais alta = menor AMT).
  const midPt = midpointPolyline(principal);
  return { principal, adutora: [[waterSource.lng, waterSource.lat], midPt] };
}
