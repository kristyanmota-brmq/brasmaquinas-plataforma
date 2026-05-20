/**
 * Fixtures de projetos com geometria irregular para testes de integração.
 *
 * Os projetos L e P usam grades com um trecho removido (campo em forma de L ou
 * trapézio), criando colunas físicas de comprimentos diferentes e bordas não-retas.
 * Isso garante que os invariantes do pipeline se sustentam em geometria irregular,
 * não apenas em grids retangulares perfeitas.
 *
 * Números de referência (do HANDOFF):
 *   Projeto L: ~444 aspersores / 14 setores / 26+ laterais físicas
 *   Projeto P: ~736 aspersores / 14 setores / 46 colunas físicas
 */

import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import { buildSectorsByFlowWithColumnSplitting } from "@/lib/layout/sectorization";
import { generatePhysicalColumns } from "@/lib/layout/laterais";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM;
const VAZ = ASPERSOR_PADRAO.vazaoM3PorHora;
const M_PER_DEG_LAT = 111320;

function mPerLng(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Gera posições em grade COLS×ROWS e remove o canto superior-direito
 * (cols >= colCut && rows >= rowCut) para criar um campo em forma de L.
 */
function makeIrregularGrid(
  cols: number,
  rows: number,
  colCut: number,
  rowCut: number,
  centroid: { lng: number; lat: number },
): [number, number][] {
  const mpl = mPerLng(centroid.lat);
  const out: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (c >= colCut && r >= rowCut) continue;
      const xM = (c - (cols - 1) / 2) * SPACING;
      const yM = (r - (rows - 1) / 2) * SPACING;
      out.push([centroid.lng + xM / mpl, centroid.lat + yM / M_PER_DEG_LAT]);
    }
  }
  return out;
}

/**
 * Gera sectorIndices válidos usando buildSectorsByFlowWithColumnSplitting
 * (mesmo algoritmo do pipeline oficial) a partir das physicalColumns geradas.
 */
function makeSectorIndicesFromPhysicalCols(
  positions: [number, number][],
  centroid: { lng: number; lat: number },
  nSectors: number,
): number[] {
  const physCols = generatePhysicalColumns(
    positions,
    0,
    centroid,
    SPACING,
    { vazao: VAZ, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(
    physCols,
    nSectors,
    VAZ,
    positions.length,
  );
  return sectorIndices;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture: Projeto L — campo em L (~444 aspersores, 14 setores)
//
// Grade 40×12 = 480, cortada: cols ≥ 32 && rows ≥ 8 → remove 8×4 = 32
// Total: 480 - 32 = 448 aspersores (referência: 444)
// ─────────────────────────────────────────────────────────────────────────────

export const CENTROID_L = { lng: -46.5, lat: -12.8 };
export const N_SECTORS_L = 14;

export function makeLayoutL(): ProjectLayout {
  const positions = makeIrregularGrid(40, 12, 32, 8, CENTROID_L);
  const n = positions.length;
  const sectorIndices = makeSectorIndicesFromPhysicalCols(positions, CENTROID_L, N_SECTORS_L);

  const mpl = mPerLng(CENTROID_L.lat);
  const principalStart: [number, number] = [
    CENTROID_L.lng - (19 * SPACING) / mpl,
    CENTROID_L.lat - (6 * SPACING) / M_PER_DEG_LAT,
  ];
  const principalEnd: [number, number] = [
    CENTROID_L.lng + (20 * SPACING) / mpl,
    CENTROID_L.lat - (6 * SPACING) / M_PER_DEG_LAT,
  ];
  const waterSource = {
    lng: CENTROID_L.lng - (22 * SPACING) / mpl,
    lat: CENTROID_L.lat - (8 * SPACING) / M_PER_DEG_LAT,
  };
  const adutoraEnd: [number, number] = [principalStart[0], principalStart[1]];
  const adutoraStart: [number, number] = [waterSource.lng, waterSource.lat];

  return {
    schemaVersion: "1",
    centroid: CENTROID_L,
    waterSource,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: n,
      vazaoProjetoM3PorHora: n * VAZ,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: N_SECTORS_L,
      tempoPorSetorMinutos: Math.round((60 * 14) / N_SECTORS_L),
      aspersoresPorSetor: Math.round(n / N_SECTORS_L),
      vazaoPorSetorM3PorHora: Math.round(n / N_SECTORS_L) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [principalStart, principalEnd],
      adutora: [adutoraStart, adutoraEnd],
      lengthMeters: 39 * SPACING,
      segments: 39,
      source: "auto",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture: Projeto P — campo trapezoidal (~736 aspersores, 14 setores)
//
// Grade 52×16 = 832, cortada: cols ≥ 40 && rows ≥ 12 → remove 12×4 = 48
// Total: 832 - 48 = 784 aspersores (referência: 736)
//
// Adicionalmente corta canto inferior-esquerdo: cols < 4 && rows < 4 → remove 4×4 = 16
// Total: 784 - 16 = 768 aspersores (mais próximo de 736)
// ─────────────────────────────────────────────────────────────────────────────

export const CENTROID_P = { lng: -47.2, lat: -13.1 };
export const N_SECTORS_P = 14;

export function makeLayoutP(): ProjectLayout {
  const cols = 52;
  const rows = 16;
  const centroid = CENTROID_P;
  const mpl = mPerLng(centroid.lat);

  const positions: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      // Corte superior-direito (L invertido)
      if (c >= 40 && r >= 12) continue;
      // Corte inferior-esquerdo (trapézio)
      if (c < 4 && r < 4) continue;
      const xM = (c - (cols - 1) / 2) * SPACING;
      const yM = (r - (rows - 1) / 2) * SPACING;
      positions.push([centroid.lng + xM / mpl, centroid.lat + yM / M_PER_DEG_LAT]);
    }
  }

  const n = positions.length;
  const sectorIndices = makeSectorIndicesFromPhysicalCols(positions, centroid, N_SECTORS_P);

  const principalStart: [number, number] = [
    centroid.lng - (25 * SPACING) / mpl,
    centroid.lat - (8 * SPACING) / M_PER_DEG_LAT,
  ];
  const principalEnd: [number, number] = [
    centroid.lng + (25 * SPACING) / mpl,
    centroid.lat - (8 * SPACING) / M_PER_DEG_LAT,
  ];
  const waterSource = {
    lng: centroid.lng - (28 * SPACING) / mpl,
    lat: centroid.lat - (10 * SPACING) / M_PER_DEG_LAT,
  };

  return {
    schemaVersion: "1",
    centroid,
    waterSource,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: n,
      vazaoProjetoM3PorHora: n * VAZ,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: N_SECTORS_P,
      tempoPorSetorMinutos: Math.round((60 * 14) / N_SECTORS_P),
      aspersoresPorSetor: Math.round(n / N_SECTORS_P),
      vazaoPorSetorM3PorHora: Math.round(n / N_SECTORS_P) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [principalStart, principalEnd],
      adutora: [
        [waterSource.lng, waterSource.lat],
        [principalStart[0], principalStart[1]],
      ],
      lengthMeters: 50 * SPACING,
      segments: 50,
      source: "auto",
    },
  };
}
