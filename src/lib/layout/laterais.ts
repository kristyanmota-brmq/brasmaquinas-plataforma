import {
  headLoss,
  velocity,
  type TuboCandidato,
  type SelecaoTubo,
} from "@/lib/hydraulics/hazenWilliams";

/**
 * Gera as linhas laterais (rede secundária) a partir dos aspersores de cada setor.
 *
 * Modelo:
 *  - Cada SETOR é composto por uma ou mais COLUNAS de aspersores no frame rotacionado da malha.
 *  - Cada coluna vira UMA lateral: tubo PVC LF percorrendo os aspersores na vertical do grid.
 *  - O ponto de derivação na principal é o início da lateral (primeiro aspersor da coluna).
 *
 * Dimensionamento hidráulico:
 *  - Vazão de entrada da lateral = N × vazão_aspersor.
 *  - Perda de carga calculada por Hazen-Williams com correção de Christiansen (F).
 *  - Diâmetro selecionado: menor do catálogo que mantém ΔP ≤ 20% da pressão de serviço (regra V0.5-RC).
 */

export interface Lateral {
  sectorId: number;
  columnIndex: number;
  startLngLat: [number, number];
  endLngLat: [number, number];
  sprinklerCount: number;
  comprimentoM: number;
  vazaoM3h: number;
  selecao: SelecaoTubo;
  derivacaoLngLat: [number, number];
}

export interface AspersorMin {
  vazao: number;          // m³/h por aspersor
  pressaoServico: number; // mca — pressão de serviço (Naan 5022 ≈ 30 mca)
}

const M_PER_DEG_LAT = 111320;

function metersPerDegLng(latRad: number): number {
  return 111320 * Math.cos(latRad);
}

function rotate(x: number, y: number, angleRad: number): [number, number] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [x * c - y * s, x * s + y * c];
}

/**
 * Christiansen F factor para lateral com múltiplas saídas (Hazen-Williams, m = 1.852).
 * Reduz a perda calculada com a vazão de entrada para refletir a vazão decrescente ao longo da lateral.
 */
export function christiansenF(numOutlets: number): number {
  if (numOutlets <= 1) return 1;
  const m = 1.852;
  const N = numOutlets;
  return 1 / (m + 1) + 1 / (2 * N) + Math.sqrt(m - 1) / (6 * N * N);
}

export function generateLaterais(
  positions: [number, number][],
  sectorIds: number[],
  gridAngleDegrees: number,
  centroid: { lng: number; lat: number },
  spacingMeters: number,
  aspersor: AspersorMin,
  catalogoLF: readonly TuboCandidato[],
  maxPerdaPercentual: number = 0.20,
): Lateral[] {
  if (positions.length === 0) return [];

  const latRad = (centroid.lat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;

  type LocalPoint = { idx: number; sectorId: number; x: number; y: number };

  const localPoints: LocalPoint[] = positions.map((p, i) => {
    const dx = (p[0] - centroid.lng) * mPerLng;
    const dy = (p[1] - centroid.lat) * M_PER_DEG_LAT;
    const [xr, yr] = rotate(dx, dy, -angleRad);
    return { idx: i, sectorId: sectorIds[i] ?? 0, x: xr, y: yr };
  });

  const bySector = new Map<number, LocalPoint[]>();
  for (const lp of localPoints) {
    const arr = bySector.get(lp.sectorId);
    if (arr) arr.push(lp);
    else bySector.set(lp.sectorId, [lp]);
  }

  const tolerance = spacingMeters * 0.5;
  const limitePerda = aspersor.pressaoServico * maxPerdaPercentual;
  const catOrdenado = [...catalogoLF].sort((a, b) => a.diametroMm - b.diametroMm);
  const laterais: Lateral[] = [];

  const toLngLat = (x: number, y: number): [number, number] => {
    const [drx, dry] = rotate(x, y, angleRad);
    return [centroid.lng + drx / mPerLng, centroid.lat + dry / M_PER_DEG_LAT];
  };

  for (const [sectorId, points] of bySector.entries()) {
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

    const columns: LocalPoint[][] = [];
    for (const p of sorted) {
      const last = columns[columns.length - 1];
      if (last && Math.abs(p.x - last[0].x) <= tolerance) {
        last.push(p);
      } else {
        columns.push([p]);
      }
    }

    columns.forEach((col, colIdx) => {
      const colSorted = [...col].sort((a, b) => a.y - b.y);
      const first = colSorted[0];
      const last = colSorted[colSorted.length - 1];
      const n = colSorted.length;

      const comprimentoM = n * spacingMeters;
      const vazaoM3h = n * aspersor.vazao;
      const F = christiansenF(n);

      let selecionado: TuboCandidato = catOrdenado[catOrdenado.length - 1];
      let hfFinal = Infinity;

      for (const tubo of catOrdenado) {
        const hf = headLoss(vazaoM3h, comprimentoM, tubo.diametroMm, tubo.coefC) * F;
        if (hf <= limitePerda) {
          selecionado = tubo;
          hfFinal = hf;
          break;
        }
      }
      if (!isFinite(hfFinal)) {
        hfFinal = headLoss(vazaoM3h, comprimentoM, selecionado.diametroMm, selecionado.coefC) * F;
      }

      const selecao: SelecaoTubo = {
        tubo: selecionado,
        perdaCargaM: hfFinal,
        velocidadeMs: velocity(vazaoM3h, selecionado.diametroMm),
        perdaCargaPercentual: hfFinal / aspersor.pressaoServico,
      };

      const startLngLat = toLngLat(first.x, first.y);
      const endLngLat = toLngLat(last.x, last.y);

      laterais.push({
        sectorId,
        columnIndex: colIdx,
        startLngLat,
        endLngLat,
        sprinklerCount: n,
        comprimentoM,
        vazaoM3h,
        selecao,
        derivacaoLngLat: startLngLat,
      });
    });
  }

  return laterais;
}