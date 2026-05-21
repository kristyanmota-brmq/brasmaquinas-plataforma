import {
  headLoss,
  velocity,
  type TuboCandidato,
  type SelecaoTubo,
} from "@/lib/hydraulics/hazenWilliams";
import type { OperationalSegment } from "@/lib/layout/sectorization";

// Deve estar alinhado com MAX_VEL_LATERAL_MS em hydraulic-sizing.ts.
// Não importamos de lá para evitar dependência circular (hydraulic-sizing importa laterais).
const MAX_VELOCITY_LATERAL_MS = 2.5;

/**
 * Seleciona o menor tubo do catálogo que passa simultaneamente em:
 *   1. perda de carga: `hf(Q, L, Dint, C) × F ≤ limitePerda`
 *   2. velocidade:     `v(Q, Dint) ≤ MAX_VELOCITY_LATERAL_MS`
 *
 * Usa diâmetro interno real (`diametroInternoMm`) para ambos os cálculos — espelhando
 * exatamente o que o solver hidráulico faz na validação final. Se nenhum tubo passar
 * nos dois gates, seleciona o maior como fallback técnico (o solver continuará gerando
 * blocker se os limites ainda forem violados; a falha não é mascarada).
 */
function selectLateralTube({
  vazaoM3h,
  comprimentoM,
  tubos,
  limitePerda,
  F,
}: {
  vazaoM3h: number;
  comprimentoM: number;
  tubos: TuboCandidato[];
  limitePerda: number;
  F: number;
}): { selecionado: TuboCandidato; hfFinal: number } {
  const catOrdenado = [...tubos].sort((a, b) => a.diametroMm - b.diametroMm);

  for (const tubo of catOrdenado) {
    const dIntMm = tubo.diametroInternoMm ?? tubo.diametroMm;
    const hf = headLoss(vazaoM3h, comprimentoM, dIntMm, tubo.coefC) * F;
    const vel = velocity(vazaoM3h, dIntMm);
    if (hf <= limitePerda && vel <= MAX_VELOCITY_LATERAL_MS) {
      return { selecionado: tubo, hfFinal: hf };
    }
  }

  // Fallback: maior tubo disponível — solver ainda bloqueará se limites forem violados.
  const maior = catOrdenado[catOrdenado.length - 1];
  const dMaiorMm = maior.diametroInternoMm ?? maior.diametroMm;
  return {
    selecionado: maior,
    hfFinal: headLoss(vazaoM3h, comprimentoM, dMaiorMm, maior.coefC) * F,
  };
}

/**
 * Constrói `SelecaoTubo` a partir do resultado de `selectLateralTube`,
 * garantindo que velocidade e perda de carga armazenadas usam diâmetro interno.
 */
function buildLateralSelecao(
  selecionado: TuboCandidato,
  hfFinal: number,
  vazaoM3h: number,
  pressaoServico: number,
): SelecaoTubo {
  const dIntMm = selecionado.diametroInternoMm ?? selecionado.diametroMm;
  return {
    tubo: selecionado,
    perdaCargaM: hfFinal,
    velocidadeMs: velocity(vazaoM3h, dIntMm),
    perdaCargaPercentual: hfFinal / pressaoServico,
  };
}

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
  /** ID da PhysicalColumn que originou esta lateral. Vazio em laterais legadas (generateLateraisLegacyForDebug). */
  physicalColumnId: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Coluna física
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Representa uma coluna física de aspersores — independente da setorização.
 *
 * Uma coluna física é o conjunto de todos os aspersores que compartilham a
 * mesma posição X no frame local (dentro de spacingMeters/2 de tolerância),
 * independentemente do setor ao qual cada aspersor foi atribuído.
 *
 * Uma coluna pode ser dividida em segmentos separados quando há gap
 * > 1.5 × spacingMeters entre aspersores consecutivos no eixo Y (obstáculo
 * ou área não irrigada).  Cada segmento torna-se uma PhysicalColumn separada.
 *
 * Usar esta estrutura para calcular comprimento de tubo evita a subestimativa
 * causada por colunas fragmentadas em sub-laterais curtas por setor.
 */
export interface PhysicalColumn {
  id: string;                    // identificador estável, ex.: "col-0", "col-1"
  columnIndex: number;           // índice 0-based no array de retorno
  startLngLat: [number, number]; // extremidade "start" (menor Y local)
  endLngLat: [number, number];   // extremidade "end" (maior Y local)
  comprimentoM: number;          // comprimento total do tubo da coluna
  sprinklerCount: number;        // número total de aspersores na coluna
  vazaoM3h: number;              // vazão de entrada (todos os aspersores do setor ativo)
  selecao: SelecaoTubo;
  sectorsTouched: number[];      // setores que possuem aspersores nesta coluna física
  /** Índices originais (em positions[]) dos aspersores desta coluna, ordenados por Y crescente. */
  sprinklerIndices: number[];
}

/**
 * Agrupa todos os aspersores em colunas FÍSICAS (sem considerar a setorização)
 * e calcula o comprimento real de cada tubo lateral.
 *
 * Regras de agrupamento:
 *   - Aspersores com |ΔX_local| ≤ spacingMeters/2 pertencem à mesma coluna física.
 *   - Dentro de uma coluna, aspersores com gap > 1.5 × spacingMeters no eixo Y
 *     são considerados segmentos físicos separados (obstáculo / área não irrigada).
 *
 * Usar isto para o cálculo de material (BOM) elimina a subestimativa que ocorre
 * quando `generateLaterais` fragmenta a mesma coluna física em múltiplos
 * sub-trechos de 2-3 aspersores por setor.
 *
 * @param sectorIds  Mapeamento posição[i] → setor.  Quando fornecido, cada
 *                   PhysicalColumn retornada terá `sectorsTouched` populado.
 */
export function generatePhysicalColumns(
  positions: [number, number][],
  gridAngleDegrees: number,
  centroid: { lng: number; lat: number },
  spacingMeters: number,
  aspersor: AspersorMin,
  catalogoLF: readonly TuboCandidato[],
  sectorIds?: number[],
  maxPerdaPercentual: number = 0.20,
): PhysicalColumn[] {
  if (positions.length === 0) return [];

  const latRad = (centroid.lat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;

  const toLngLat = (x: number, y: number): [number, number] => {
    const [drx, dry] = rotate(x, y, angleRad);
    return [centroid.lng + drx / mPerLng, centroid.lat + dry / M_PER_DEG_LAT];
  };

  // Converter todas as posições para frame local, mantendo o índice original
  type LocalPt = { x: number; y: number; origIdx: number };
  const localPts: LocalPt[] = positions.map((p, origIdx) => {
    const dx = (p[0] - centroid.lng) * mPerLng;
    const dy = (p[1] - centroid.lat) * M_PER_DEG_LAT;
    const [xr, yr] = rotate(dx, dy, -angleRad);
    return { x: xr, y: yr, origIdx };
  });

  // Agrupar por coluna física usando índice arredondado: colIdx = round((x − xMin) / spacing).
  // Robusto contra variações numéricas entre rotação Haversine (turf) e rotação plana (local frame),
  // que no algoritmo greedy anterior podiam criar micro-colunas espúrias.
  const gapThreshold = spacingMeters * 1.5;
  const xMin = localPts.reduce((m, p) => Math.min(m, p.x), Infinity);
  const byColIdx = new Map<number, LocalPt[]>();
  for (const p of localPts) {
    const colIdx = Math.round((p.x - xMin) / spacingMeters);
    const arr = byColIdx.get(colIdx) ?? [];
    arr.push(p);
    byColIdx.set(colIdx, arr);
  }
  const rawColumns = [...byColIdx.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, pts]) => ({ pts }));

  const limitePerda = aspersor.pressaoServico * maxPerdaPercentual;

  const result: PhysicalColumn[] = [];

  for (const col of rawColumns) {
    // Ordenar aspersores da coluna por Y crescente
    const ptsSorted = [...col.pts].sort((a, b) => a.y - b.y);

    // Detectar gaps e dividir em segmentos físicos separados
    const segments: LocalPt[][] = [[]];
    segments[0].push(ptsSorted[0]);
    for (let i = 1; i < ptsSorted.length; i++) {
      if (ptsSorted[i].y - ptsSorted[i - 1].y > gapThreshold) {
        segments.push([]);
      }
      segments[segments.length - 1].push(ptsSorted[i]);
    }

    for (const seg of segments) {
      const n = seg.length;
      const yFirst = seg[0].y;
      const yLast = seg[n - 1].y;
      // Eixo canônico do segmento: X médio de todos os aspersores do segmento.
      // Garante que a reta startLngLat → endLngLat passe pelos aspersores intermediários
      // dentro da tolerância métrica, independente de desvios individuais dos extremos.
      const xSegRep = seg.reduce((s, p) => s + p.x, 0) / n;

      const sectorsTouched = sectorIds
        ? [...new Set(seg.map((p) => sectorIds[p.origIdx]).filter((s): s is number => s !== undefined))]
        : [];

      const comprimentoM = (n - 1) * spacingMeters + 0.5;
      const vazaoM3h = n * aspersor.vazao;
      const F = christiansenF(n);

      const { selecionado, hfFinal } = selectLateralTube({
        vazaoM3h, comprimentoM, tubos: [...catalogoLF], limitePerda, F,
      });
      const selecao = buildLateralSelecao(selecionado, hfFinal, vazaoM3h, aspersor.pressaoServico);

      const colIdx = result.length;
      result.push({
        id: `col-${colIdx}`,
        columnIndex: colIdx,
        startLngLat: toLngLat(xSegRep, yFirst),
        endLngLat:   toLngLat(xSegRep, yLast),
        comprimentoM,
        sprinklerCount: n,
        vazaoM3h,
        selecao,
        sectorsTouched,
        sprinklerIndices: seg.map((p) => p.origIdx),
      });
    }
  }

  const avgN = result.length > 0 ? positions.length / result.length : 0;
  if (result.length > positions.length / 3) {
    console.warn(
      `[generatePhysicalColumns] Fragmentação excessiva: ${result.length} colunas para ` +
      `${positions.length} aspersores (média ${avgN.toFixed(1)}/coluna). ` +
      `Verifique se gridAngleDegrees=${gridAngleDegrees}° corresponde às posições armazenadas.`,
    );
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Laterais por setor (debug / compatibilidade com testes legados)
// ─────────────────────────────────────────────────────────────────────────────

export function generateLateraisLegacyForDebug(
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

      const comprimentoM = (n - 1) * spacingMeters + 0.5;
      const vazaoM3h = n * aspersor.vazao;
      const F = christiansenF(n);

      const { selecionado, hfFinal } = selectLateralTube({
        vazaoM3h, comprimentoM, tubos: [...catalogoLF], limitePerda, F,
      });
      const selecao = buildLateralSelecao(selecionado, hfFinal, vazaoM3h, aspersor.pressaoServico);

      const startLngLat = toLngLat(first.x, first.y);
      const endLngLat = toLngLat(last.x, last.y);

      laterais.push({
        sectorId,
        physicalColumnId: "",
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

/**
 * @deprecated Use deriveLateraisFromNetwork no pipeline oficial.
 * Produz contagem diferente em campos irregulares (supercontagem por sector-split).
 * Para debug, use generateLateraisLegacyForDebug explicitamente.
 */
export const generateLaterais = generateLateraisLegacyForDebug;

// ─────────────────────────────────────────────────────────────────────────────
// Laterais derivadas da rede física (sem algoritmo independente de agrupamento)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deriva as laterais diretamente de physicalColumns + operationalSegments.
 *
 * Garante que não há divergência em relação a generatePhysicalColumns:
 * cada Lateral corresponde exatamente a um OperationalSegment, com geometria
 * calculada a partir dos índices reais de aspersores da coluna física.
 *
 * Substitui generateLateraisLegacyForDebug para uso dentro do pipeline de cálculo oficial.
 * generateLateraisLegacyForDebug permanece disponível para debug; generateLaterais é alias depreciado.
 */
export function deriveLateraisFromNetwork(
  physicalColumns: PhysicalColumn[],
  operationalSegments: OperationalSegment[],
  positions: [number, number][],
  spacingM: number,
  aspersor: AspersorMin,
  catalogoLF: readonly TuboCandidato[],
  maxPerdaPercentual: number = 0.20,
): Lateral[] {
  if (physicalColumns.length === 0 || operationalSegments.length === 0) return [];

  const colById = new Map(physicalColumns.map((c) => [c.id, c]));
  const limitePerda = aspersor.pressaoServico * maxPerdaPercentual;

  // Contador por setor para atribuir columnIndex
  const colIndexBySector = new Map<number, number>();

  const laterais: Lateral[] = [];

  for (const seg of operationalSegments) {
    const col = colById.get(seg.physicalColumnId);
    if (!col || seg.sprinklerIndices.length === 0) continue;

    const n = seg.sprinklerCount;
    const comprimentoM = (n - 1) * spacingM + 0.5;
    const vazaoM3h = seg.vazaoM3h;
    const F = christiansenF(n);

    const { selecionado, hfFinal } = selectLateralTube({
      vazaoM3h, comprimentoM, tubos: [...catalogoLF], limitePerda, F,
    });
    const selecao = buildLateralSelecao(selecionado, hfFinal, vazaoM3h, aspersor.pressaoServico);

    const startLngLat = positions[seg.sprinklerIndices[0]] ?? col.startLngLat;
    const endLngLat = positions[seg.sprinklerIndices[seg.sprinklerIndices.length - 1]] ?? col.endLngLat;

    const colIdx = colIndexBySector.get(seg.sectorId) ?? 0;
    colIndexBySector.set(seg.sectorId, colIdx + 1);

    laterais.push({
      sectorId: seg.sectorId,
      physicalColumnId: seg.physicalColumnId,
      columnIndex: colIdx,
      startLngLat,
      endLngLat,
      sprinklerCount: n,
      comprimentoM,
      vazaoM3h,
      selecao,
      derivacaoLngLat: startLngLat,
    });
  }

  return laterais;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnóstico de qualidade do eixo canônico
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tolerância numérica/cartográfica para desvio aspersor → eixo da lateral.
 *
 * Regra operacional Brasmáquinas: a vala da lateral e o ponto do aspersor são
 * a mesma execução física. Aspersor fora do eixo exige segunda escavação —
 * projeto construtivamente inválido. A tolerância NÃO é permissão de campo.
 *
 * Valor 0,10 m: tolerância numérica provisória (PENDENTE_REVISAO_BRASMAQUINAS).
 * Documentada em docs/metodologia/12-premissas-provisorias-e-revisao-rt.md.
 */
export const TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0.10;

export interface AxisDeviationViolation {
  columnIndex: number;
  deviationM: number;
}

export interface AxisDeviationReport {
  violations: AxisDeviationViolation[];
  maxDeviationM: number;
}

/**
 * Calcula o desvio máximo, em metros, de qualquer aspersor da coluna em
 * relação ao eixo canônico `startLngLat → endLngLat`.
 *
 * Usa projeção plana (flat-earth) consistente com o restante do domínio.
 * Retorna 0 quando a coluna tem menos de 2 aspersores.
 *
 * Limiar de referência: TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m (blocker).
 * Documentada em docs/metodologia/12-premissas-provisorias-e-revisao-rt.md.
 */
export function maxSprinklerAxisDeviationM(
  col: PhysicalColumn,
  positions: [number, number][],
  centroid: { lng: number; lat: number },
): number {
  if (col.sprinklerIndices.length < 2) return 0;

  const latRad = (centroid.lat * Math.PI) / 180;
  const mLng = metersPerDegLng(latRad);

  const ax = col.startLngLat[0] * mLng;
  const ay = col.startLngLat[1] * M_PER_DEG_LAT;
  const bx = col.endLngLat[0] * mLng;
  const by = col.endLngLat[1] * M_PER_DEG_LAT;
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;

  let maxDev = 0;
  for (const idx of col.sprinklerIndices) {
    const pos = positions[idx];
    if (!pos) continue;
    const px = pos[0] * mLng;
    const py = pos[1] * M_PER_DEG_LAT;

    let dev: number;
    if (ab2 < 1e-20) {
      const dx = px - ax, dy = py - ay;
      dev = Math.sqrt(dx * dx + dy * dy);
    } else {
      const cross = (px - ax) * aby - (py - ay) * abx;
      dev = Math.abs(cross) / Math.sqrt(ab2);
    }
    if (dev > maxDev) maxDev = dev;
  }
  return maxDev;
}

/**
 * Detecta colunas físicas cujos aspersores excedem TOLERANCIA_ASPERSOR_EIXO_LATERAL.
 * Retornado pelo orquestrador e passado para generateProposalDiagnostics.
 */
export function detectAxisDeviations(
  cols: PhysicalColumn[],
  positions: [number, number][],
  centroid: { lng: number; lat: number },
): AxisDeviationReport {
  const violations: AxisDeviationViolation[] = [];
  let maxDeviationM = 0;
  for (const col of cols) {
    const dev = maxSprinklerAxisDeviationM(col, positions, centroid);
    if (dev > maxDeviationM) maxDeviationM = dev;
    if (dev > TOLERANCIA_ASPERSOR_EIXO_LATERAL) {
      violations.push({ columnIndex: col.columnIndex, deviationM: dev });
    }
  }
  return { violations, maxDeviationM };
}
