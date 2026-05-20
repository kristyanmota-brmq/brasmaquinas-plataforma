import type { PhysicalColumn } from "./laterais";

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

/**
 * Gera principal (polilinha) e adutora (segmento captação → principal) de forma bottom-up.
 *
 * Recebe PhysicalColumn[] — a rede física já deduplicada, independente da setorização.
 * Cada PhysicalColumn gera exatamente um ponto de derivação na principal:
 * a extremidade da coluna que fica no lado da captação (yMin ou yMax no frame local).
 *
 * Separa fisico de operacional:
 *   - A principal é construída a partir de colunas físicas únicas.
 *   - Setores não fragmentam essa geração; múltiplos setores na mesma coluna física
 *     resultam em um único ponto de derivação.
 *
 * Invariantes validados antes de retornar:
 *   I1: adutora tem exatamente 2 vértices, adutora[0] = captação.
 *   I2: principal tem pelo menos 1 vértice.
 *   I3: sem pontos consecutivos duplicados na principal.
 *   I4: adutora[1] é uma das extremidades da principal.
 */
export function generatePrincipalAndAdutora(
  waterSource: { lng: number; lat: number },
  physicalColumns: PhysicalColumn[],
  centroid: { lng: number; lat: number },
  gridAngleDegrees: number,
): { principal: [number, number][]; adutora: [number, number][] } {
  const captacaoLngLat: [number, number] = [waterSource.lng, waterSource.lat];

  if (physicalColumns.length === 0) {
    return { principal: [captacaoLngLat], adutora: [captacaoLngLat, captacaoLngLat] };
  }

  const latRad = (centroid.lat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;

  // Passo A — frame local: rotacionar por -gridAngleDegrees em torno do centroide.
  // No frame local as laterais correm em Y e a principal corre em X.
  const toLocal = (lng: number, lat: number): [number, number] => {
    const dx = (lng - centroid.lng) * mPerLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return rotate(dx, dy, -angleRad);
  };

  const toLngLat = (x: number, y: number): [number, number] => {
    const [drx, dry] = rotate(x, y, angleRad);
    return [centroid.lng + drx / mPerLng, centroid.lat + dry / M_PER_DEG_LAT];
  };

  const wsLocal = toLocal(waterSource.lng, waterSource.lat);

  // Passo A — converter extremos de cada coluna física para o frame local.
  // startLngLat e endLngLat diferem apenas em Y (mesma X no frame local).
  const physColsLocal = physicalColumns.map((col) => {
    const sLocal = toLocal(col.startLngLat[0], col.startLngLat[1]);
    const eLocal = toLocal(col.endLngLat[0], col.endLngLat[1]);
    return {
      xLateral: sLocal[0], // X idêntico em start e end por construção
      yMin: Math.min(sLocal[1], eLocal[1]),
      yMax: Math.max(sLocal[1], eLocal[1]),
    };
  });

  // Passo B — de que lado da malha a captação fica (comparando Y local).
  const yMinGlobal = Math.min(...physColsLocal.map((l) => l.yMin));
  const yMaxGlobal = Math.max(...physColsLocal.map((l) => l.yMax));

  let side: "min" | "max";
  if (wsLocal[1] <= yMinGlobal) {
    side = "min";
  } else if (wsLocal[1] >= yMaxGlobal) {
    side = "max";
  } else {
    const distToMin = Math.abs(wsLocal[1] - yMinGlobal);
    const distToMax = Math.abs(wsLocal[1] - yMaxGlobal);
    side = distToMin <= distToMax ? "min" : "max";
    console.warn("[principal] Captação dentro da faixa Y da malha — adutora cruza a área irrigada.");
  }

  // Passo C — ponto de derivação de cada coluna física.
  // Todos os pontos compartilham o mesmo Y (principalY) para que a principal seja
  // uma linha reta no frame local — não um degrau por coluna.
  //
  // Ordenação: X crescente; empate em X (colunas com gap físico = mesmo xRep)
  // resolve pelo Y mais próximo da captação, para que a primeira ocorrência seja
  // o segmento diretamente conectado à principal.
  const principalY = side === "min" ? yMinGlobal : yMaxGlobal;
  physColsLocal.sort((a, b) => {
    const dx = a.xLateral - b.xLateral;
    if (Math.abs(dx) > 1e-6) return dx;
    const aY = side === "min" ? a.yMin : a.yMax;
    const bY = side === "min" ? b.yMin : b.yMax;
    return side === "min" ? aY - bY : bY - aY;
  });

  // Deduplicar: segmentos de gap-split compartilham o mesmo xLateral (xRep idêntico).
  // A principal conecta a cada posição X exatamente uma vez.
  const EPS_X = 1e-6; // 1 µm — sub-milimétrico, menor que qualquer gap real entre colunas
  const derivacoesLocal: [number, number][] = physColsLocal
    .filter(
      (col, i) =>
        i === 0 || Math.abs(col.xLateral - physColsLocal[i - 1].xLateral) > EPS_X,
    )
    .map((col) => [col.xLateral, principalY]);

  // Passo E — ponto de entrada da principal (extremidade mais próxima da captação).
  const d1 = derivacoesLocal[0];
  const dN = derivacoesLocal[derivacoesLocal.length - 1];

  let entryLocal: [number, number];
  if (wsLocal[0] <= d1[0]) {
    entryLocal = d1;
  } else if (wsLocal[0] >= dN[0]) {
    entryLocal = dN;
  } else {
    entryLocal = dist2(wsLocal, d1) <= dist2(wsLocal, dN) ? d1 : dN;
  }

  // Passo F — rotacionar de volta para LngLat.
  const principal: [number, number][] = derivacoesLocal.map(([x, y]) => toLngLat(x, y));
  const entryLngLat = toLngLat(entryLocal[0], entryLocal[1]);
  const adutora: [number, number][] = [captacaoLngLat, entryLngLat];

  // Passo G — validar invariantes antes de retornar.
  validateInvariants(principal, adutora, captacaoLngLat);

  return { principal, adutora };
}

function validateInvariants(
  principal: [number, number][],
  adutora: [number, number][],
  captacao: [number, number],
): void {
  // I1: adutora com exatamente 2 vértices, primeiro é a captação
  if (adutora.length !== 2) {
    throw new Error(`Topologia inválida (I1): adutora deve ter 2 vértices, tem ${adutora.length}`);
  }
  if (adutora[0][0] !== captacao[0] || adutora[0][1] !== captacao[1]) {
    throw new Error("Topologia inválida (I1): adutora[0] não é a captação");
  }
  // I2: principal com pelo menos 1 vértice
  if (principal.length < 1) {
    throw new Error("Topologia inválida (I2): principal sem vértices");
  }
  // I4: adutora[1] é uma das extremidades da principal
  const eps = 1e-9;
  const p0 = principal[0];
  const pN = principal[principal.length - 1];
  const connIsP0 =
    Math.abs(adutora[1][0] - p0[0]) < eps && Math.abs(adutora[1][1] - p0[1]) < eps;
  const connIsPN =
    Math.abs(adutora[1][0] - pN[0]) < eps && Math.abs(adutora[1][1] - pN[1]) < eps;
  if (!connIsP0 && !connIsPN) {
    throw new Error("Topologia inválida (I4): ponto de entrada não é extremidade da principal");
  }
  // I3: sem pontos duplicados consecutivos na principal
  for (let i = 1; i < principal.length; i++) {
    if (
      Math.abs(principal[i][0] - principal[i - 1][0]) < eps &&
      Math.abs(principal[i][1] - principal[i - 1][1]) < eps
    ) {
      throw new Error(
        `Topologia inválida (I3): pontos duplicados na principal no índice ${i}`,
      );
    }
  }
}
