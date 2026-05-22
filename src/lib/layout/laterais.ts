import {
  headLoss,
  velocity,
  type TuboCandidato,
  type SelecaoTubo,
} from "@/lib/hydraulics/hazenWilliams";
import { TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import type { OperationalSegment } from "@/lib/layout/sectorization";

// Deve estar alinhado com MAX_VEL_LATERAL_MS em hydraulic-sizing.ts.
// Não importamos de lá para evitar dependência circular (hydraulic-sizing importa laterais).
const MAX_VELOCITY_LATERAL_MS = 2.5;

/**
 * Subset do catálogo PVC LF homologado como **lateral do aspersor 5022**.
 *
 * Regra operacional Brasmáquinas (confirmada na TASK-023 e materializada
 * no seletor pela TASK-031): laterais que atendem o aspersor 5022 usam
 * **apenas DN50 e DN75**. DN100 não tem kit de ligação homologado para esse
 * aspersor — ver `KIT_ASPERSOR_5022` em `src/lib/catalog/aspersores.ts`.
 *
 * Esta função **não substitui** `TUBOS_PVC_LF` (catálogo global) — apenas
 * restringe o contexto de uso "seleção de lateral para aspersor 5022".
 * DN100 LF permanece válido em outros contextos no futuro.
 *
 * Quando DN50/DN75 não atenderem perda de carga ou velocidade da lateral,
 * o seletor emite `capacityOk: false` em vez de cair para DN100 silenciosamente
 * — gerando blocker técnico em `generateProposalDiagnostics`.
 */
export function getCatalogoLateraisHomologadas5022(): readonly TuboCandidato[] {
  return TUBOS_PVC_LF.filter((t) => t.diametroMm <= 75);
}

/** Motivo da falha de capacidade da lateral, propagado para diagnóstico. */
export type LateralCapacityReason = "headloss_exceeded" | "velocity_exceeded" | "both";

/**
 * Status de capacidade hidráulica da lateral física dentro do subset homologado.
 * Quando `ok: false`, o seletor selecionou o maior DN do subset (DN75) como
 * tentativa máxima, mas perda ou velocidade excede os limites — usuário
 * recebe blocker técnico explícito.
 */
export interface LateralCapacityInfo {
  ok: boolean;
  reason?: LateralCapacityReason;
  /** Perda de carga calculada com o DN selecionado (mca). */
  hfM: number;
  /** Velocidade calculada com o DN selecionado (m/s). */
  velMs: number;
}

/**
 * Seleciona o menor tubo do catálogo que passa simultaneamente em:
 *   1. perda de carga: `hf(Q, L, Dint, C) × F ≤ limitePerda`
 *   2. velocidade:     `v(Q, Dint) ≤ MAX_VELOCITY_LATERAL_MS`
 *
 * Usa diâmetro interno real (`diametroInternoMm`) para ambos os cálculos — espelhando
 * exatamente o que o solver hidráulico faz na validação final.
 *
 * Quando nenhum tubo do catálogo recebido atende, retorna o **maior do subset**
 * (continua um tubo válido para o solver rodar) mas com `capacityOk: false` e
 * `reason` indicando se a falha foi por perda, velocidade ou ambas. A
 * **restrição de DN homologado é responsabilidade do chamador** (TASK-031):
 * para o aspersor 5022, o catálogo passado é `getCatalogoLateraisHomologadas5022()`.
 *
 * `lateralCapacity` é propagado para `PhysicalColumn`/`Lateral` e consumido por
 * `detectLateralCapacityViolations` para gerar blocker técnico no diagnóstico.
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
}): {
  selecionado: TuboCandidato;
  hfFinal: number;
  lateralCapacity: LateralCapacityInfo;
} {
  const catOrdenado = [...tubos].sort((a, b) => a.diametroMm - b.diametroMm);

  for (const tubo of catOrdenado) {
    const dIntMm = tubo.diametroInternoMm ?? tubo.diametroMm;
    const hf = headLoss(vazaoM3h, comprimentoM, dIntMm, tubo.coefC) * F;
    const vel = velocity(vazaoM3h, dIntMm);
    if (hf <= limitePerda && vel <= MAX_VELOCITY_LATERAL_MS) {
      return {
        selecionado: tubo,
        hfFinal: hf,
        lateralCapacity: { ok: true, hfM: hf, velMs: vel },
      };
    }
  }

  // Fallback: maior tubo do subset — atende a regra "lateral 5022 ≤ DN75" mas
  // sinaliza incapacidade hidráulica via `capacityOk: false`. O solver hidráulico
  // continua rodando com os números do DN75; o blocker técnico é emitido em
  // `generateProposalDiagnostics` a partir do report agregado.
  const maior = catOrdenado[catOrdenado.length - 1];
  const dMaiorMm = maior.diametroInternoMm ?? maior.diametroMm;
  const hfMaior = headLoss(vazaoM3h, comprimentoM, dMaiorMm, maior.coefC) * F;
  const velMaior = velocity(vazaoM3h, dMaiorMm);
  const hfExceeded = hfMaior > limitePerda;
  const velExceeded = velMaior > MAX_VELOCITY_LATERAL_MS;
  const reason: LateralCapacityReason =
    hfExceeded && velExceeded ? "both" : hfExceeded ? "headloss_exceeded" : "velocity_exceeded";
  return {
    selecionado: maior,
    hfFinal: hfMaior,
    lateralCapacity: { ok: false, reason, hfM: hfMaior, velMs: velMaior },
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
  /**
   * Polilinha física da lateral, passando por todos os aspersores do subset operacional.
   * Sempre tem ≥ 2 pontos; `startLngLat === routeCoords[0]` e `endLngLat === routeCoords[n-1]`.
   * Ângulos entre segmentos consecutivos ∈ {0°, 90°, 180°} (rede interna).
   */
  routeCoords: [number, number][];
  /**
   * Status de capacidade hidráulica da lateral dentro do subset DN homologado
   * para o aspersor 5022 (TASK-031). Quando `ok: false`, o seletor escolheu o
   * maior DN disponível mas perda/velocidade excede limites — gera blocker técnico
   * em `generateProposalDiagnostics`.
   */
  lateralCapacity: LateralCapacityInfo;
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
// Construção da rota da lateral (polilinha 0°/90°)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated TASK-045B — substituída pelo algoritmo de eixo único (mediana de X)
 * em `buildLateralRoute`. Constante mantida apenas para compatibilidade de
 * assinatura pública (terceiro parâmetro de `buildLateralRoute`); não tem
 * efeito no algoritmo novo.
 *
 * Histórico:
 * - TASK-028: criada com valor 0,05 m. Decidia trilho por par de aspersores
 *   greedy → cotovelos por desvios numéricos pequenos.
 * - TASK-045: ajustada para 0,10 m (alinhar com `TOLERANCIA_ASPERSOR_EIXO_LATERAL`).
 *   Eliminou blocker angular mas escada visual persistiu no Projeto A real.
 * - TASK-045B: descontinuada. Algoritmo passou a usar **mediana de X** dos
 *   aspersores como eixo único da lateral (`routeCoords` = reta de 2 pontos).
 *   Aspersor fora de 0,10 m do eixo continua disparando blocker via
 *   `detectAxisDeviations` (ADR-011) — sem cotovelo de compensação.
 */
const ROUTE_BUILD_TOL_X_M = 0.10;

/** Soma de comprimentos métricos de uma polilinha em coords geográficas. */
function polylineLengthM(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  const latRad = (coords[0][1] * Math.PI) / 180;
  const mLng = metersPerDegLng(latRad);
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = (coords[i][0] - coords[i - 1][0]) * mLng;
    const dy = (coords[i][1] - coords[i - 1][1]) * M_PER_DEG_LAT;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

interface LocalPt { x: number; y: number }

/**
 * TASK-045B — Constrói a rota da lateral como **reta única no eixo da coluna**.
 *
 * **Mudança vs. TASK-028 (algoritmo greedy ponto-a-ponto):**
 * - Antes: polilinha em L com cotovelos para cada aspersor "fora do trilho".
 * - Agora: reta de 2 pontos `[(eixoX, yMin), (eixoX, yMax)]` no eixo único
 *   calculado pela **mediana de X** dos aspersores (robusto contra outliers).
 *
 * **Por que mediana e não média:**
 * - Um aspersor outlier (ex.: 0,20 m fora do eixo real) puxaria a média;
 *   o blocker `detectAxisDeviations` então não dispararia (eixo "passa" pelo
 *   outlier). Mediana é insensível a outliers — o eixo continua sobre o
 *   conjunto principal e o aspersor desalinhado é detectado pelo blocker.
 *
 * **Aspersor fora da tolerância (`TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m`):**
 * - Não é compensado com cotovelo. `detectAxisDeviations` dispara blocker
 *   (ADR-011 preservada). Sistema/usuário precisa corrigir orientação ou
 *   agrupamento (escopo de tasks futuras).
 *
 * **Invariantes garantidas:**
 * - `routeCoords.length === 2` quando `pts.length >= 1`.
 * - Reta sempre tem ângulos válidos (0°/90°/180° por geometria).
 * - Primeiro segmento é vertical (eixo X constante) — preserva contrato de
 *   `network-angle-diagnostics` para junção ramal↔lateral.
 *
 * @param tolXMeters Parâmetro mantido por compatibilidade de assinatura.
 *   No algoritmo novo NÃO tem efeito — substituído por eixo único + blocker
 *   de `TOLERANCIA_ASPERSOR_EIXO_LATERAL`.
 */
export function buildLateralRoute(
  pts: LocalPt[],
  toLngLatFn: (x: number, y: number) => [number, number],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tolXMeters: number = ROUTE_BUILD_TOL_X_M,
): { routeCoords: [number, number][]; lengthM: number; anglesValid: boolean } {
  if (pts.length === 0) {
    return { routeCoords: [], lengthM: 0, anglesValid: true };
  }
  if (pts.length === 1) {
    const single = toLngLatFn(pts[0].x, pts[0].y);
    return { routeCoords: [single, single], lengthM: 0, anglesValid: true };
  }

  // Calcular EIXO via MEDIANA de X — robusto contra outliers.
  // Outlier > 0,10 m do eixo real NÃO puxa a mediana (diferente de mean),
  // então continua sendo detectado pelo blocker em `detectAxisDeviations`.
  const xs = pts.map((p) => p.x).sort((a, b) => a - b);
  const midIdx = Math.floor(xs.length / 2);
  const eixoX =
    xs.length % 2 === 1
      ? xs[midIdx]
      : (xs[midIdx - 1] + xs[midIdx]) / 2;

  // Y dos extremos da lateral (defensivamente ordena).
  const sortedY = [...pts].sort((a, b) => a.y - b.y);
  const yMin = sortedY[0].y;
  const yMax = sortedY[sortedY.length - 1].y;

  const localRoute: [number, number][] = [
    [eixoX, yMin],
    [eixoX, yMax],
  ];

  // Reta sempre tem ângulos válidos (single segment — ângulos só são checados
  // entre 3 pontos consecutivos, que não existem em uma polilinha de 2 pontos).
  const anglesValid = true;

  const routeCoords = localRoute.map(([x, y]) => toLngLatFn(x, y));
  const lengthM = polylineLengthM(routeCoords);

  return { routeCoords, lengthM, anglesValid };
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
  /**
   * Polilinha física da lateral, passando por todos os aspersores da coluna.
   * Sempre tem ≥ 2 pontos; `startLngLat === routeCoords[0]` e `endLngLat === routeCoords[n-1]`.
   * Ângulos entre segmentos consecutivos ∈ {0°, 90°, 180°} (rede interna).
   * Primeiro segmento é sempre vertical no frame local (mantém compatibilidade
   * com `network-angle-diagnostics` ao calcular vetor da lateral no inlet).
   */
  routeCoords: [number, number][];
  /**
   * Status de capacidade hidráulica da lateral dentro do subset DN homologado
   * para o aspersor 5022 (TASK-031). Quando `ok: false`, o seletor escolheu o
   * maior DN disponível mas perda/velocidade excede limites — gera blocker técnico
   * em `generateProposalDiagnostics`.
   */
  lateralCapacity: LateralCapacityInfo;
  /**
   * Quando a coluna original foi dividida por capacidade hidráulica (TASK-040),
   * estes campos preservam a rastreabilidade. Indefinidos em colunas que não
   * sofreram split (caso default). `originalColumnIndex` é o índice da coluna
   * antes do pós-processamento; `splitIndex` é 0, 1, 2... para as sub-colunas.
   */
  originalColumnIndex?: number;
  splitIndex?: number;
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

  /**
   * Constrói uma `PhysicalColumn` parcial (sem `id`/`columnIndex`/rastreabilidade)
   * a partir de um array de pontos locais. Centraliza o cálculo da rota, vazão,
   * comprimento e seleção do tubo para reuso pelo split por capacidade (TASK-040).
   */
  type ColumnDraft = Omit<PhysicalColumn, "id" | "columnIndex" | "originalColumnIndex" | "splitIndex">;
  const buildColumnDraft = (seg: LocalPt[]): ColumnDraft => {
    const n = seg.length;
    const sectorsTouched = sectorIds
      ? [...new Set(seg.map((p) => sectorIds[p.origIdx]).filter((s): s is number => s !== undefined))]
      : [];
    const { routeCoords, lengthM: routeLengthM } = buildLateralRoute(
      seg.map((p) => ({ x: p.x, y: p.y })),
      toLngLat,
    );
    const comprimentoM = routeLengthM + 0.5;
    const vazaoM3h = n * aspersor.vazao;
    const F = christiansenF(n);
    const { selecionado, hfFinal, lateralCapacity } = selectLateralTube({
      vazaoM3h, comprimentoM, tubos: [...catalogoLF], limitePerda, F,
    });
    const selecao = buildLateralSelecao(selecionado, hfFinal, vazaoM3h, aspersor.pressaoServico);
    const startLngLat = routeCoords[0];
    const endLngLat = routeCoords[routeCoords.length - 1];
    return {
      startLngLat,
      endLngLat,
      comprimentoM,
      sprinklerCount: n,
      vazaoM3h,
      selecao,
      sectorsTouched,
      sprinklerIndices: seg.map((p) => p.origIdx),
      routeCoords,
      lateralCapacity,
    };
  };

  /**
   * TASK-040: split por capacidade hidráulica.
   *
   * Recebe um segmento (LocalPt[] ordenado por Y) cuja coluna correspondente
   * não atende DN75. Tenta dividir pelo Y mediano até que cada sub-segmento
   * tenha `lateralCapacity.ok === true` (via `selectLateralTube` real, sem
   * threshold hardcoded). Mínimo split necessário (bisseção recursiva).
   *
   * Quando um sub-segmento tem apenas 1 aspersor, não há como dividir mais —
   * retorna como está e o blocker técnico dispara como fallback (TASK-031).
   *
   * Retorna a lista plana de `ColumnDraft` resultantes. Cada draft já tem
   * `routeCoords`, comprimento e seleção recalculados pelo subset.
   */
  const splitByCapacity = (seg: LocalPt[]): ColumnDraft[] => {
    const draft = buildColumnDraft(seg);
    if (draft.lateralCapacity.ok || seg.length <= 1) {
      return [draft];
    }
    // Bisseção pelo índice mediano (preserva continuidade espacial em Y).
    const mid = Math.floor(seg.length / 2);
    const left = seg.slice(0, mid);
    const right = seg.slice(mid);
    if (left.length === 0 || right.length === 0) {
      return [draft]; // segurança defensiva — não deveria ocorrer com seg.length >= 2
    }
    return [...splitByCapacity(left), ...splitByCapacity(right)];
  };

  // Coleta drafts mantendo a rastreabilidade da coluna original (rawColumns).
  const drafts: { draft: ColumnDraft; originalColumnIndex: number; splitIndex: number }[] = [];

  rawColumns.forEach((col, rawIdx) => {
    // Ordenar aspersores da coluna por Y crescente
    const ptsSorted = [...col.pts].sort((a, b) => a.y - b.y);

    // Detectar gaps geográficos (> 1.5 × spacing) e dividir em segmentos físicos separados.
    // (Critério geográfico anterior à TASK-040; permanece como split por obstáculo.)
    const segments: LocalPt[][] = [[]];
    segments[0].push(ptsSorted[0]);
    for (let i = 1; i < ptsSorted.length; i++) {
      if (ptsSorted[i].y - ptsSorted[i - 1].y > gapThreshold) {
        segments.push([]);
      }
      segments[segments.length - 1].push(ptsSorted[i]);
    }

    // Para cada segmento geográfico, aplicar split por capacidade hidráulica (TASK-040).
    // Drafts derivados de um mesmo `rawIdx` recebem `splitIndex` sequencial.
    let splitIdx = 0;
    for (const seg of segments) {
      const subDrafts = splitByCapacity(seg);
      for (const draft of subDrafts) {
        drafts.push({ draft, originalColumnIndex: rawIdx, splitIndex: splitIdx++ });
      }
    }
  });

  // Atribuir id/columnIndex sequenciais (renumeração final).
  // Quando uma coluna não foi dividida (1 draft por rawColumn), `originalColumnIndex`
  // e `splitIndex` ainda são populados para rastreabilidade uniforme.
  const result: PhysicalColumn[] = drafts.map(({ draft, originalColumnIndex, splitIndex }, idx) => ({
    id: `col-${idx}`,
    columnIndex: idx,
    originalColumnIndex,
    splitIndex,
    ...draft,
  }));

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

      const { selecionado, hfFinal, lateralCapacity } = selectLateralTube({
        vazaoM3h, comprimentoM, tubos: [...catalogoLF], limitePerda, F,
      });
      const selecao = buildLateralSelecao(selecionado, hfFinal, vazaoM3h, aspersor.pressaoServico);

      // Legacy/debug: usa rota trivial (start→end). Pipeline oficial usa
      // deriveLateraisFromNetwork que reconstrói rota do subset operacional.
      const { routeCoords } = buildLateralRoute(
        colSorted.map((p) => ({ x: p.x, y: p.y })),
        toLngLat,
      );
      const startLngLat = routeCoords[0];
      const endLngLat = routeCoords[routeCoords.length - 1];

      laterais.push({
        sectorId,
        physicalColumnId: "",
        columnIndex: colIdx,
        startLngLat,
        endLngLat,
        sprinklerCount: n,
        comprimentoM,
        vazaoM3h,
        lateralCapacity,
        selecao,
        derivacaoLngLat: startLngLat,
        routeCoords,
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
  gridAngleDegrees: number,
  centroid: { lng: number; lat: number },
  maxPerdaPercentual: number = 0.20,
): Lateral[] {
  if (physicalColumns.length === 0 || operationalSegments.length === 0) return [];

  const colById = new Map(physicalColumns.map((c) => [c.id, c]));
  const limitePerda = aspersor.pressaoServico * maxPerdaPercentual;

  // Frame local rotacionado (mesmo de generatePhysicalColumns).
  const latRad = (centroid.lat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;
  const toLocal = (p: [number, number]): [number, number] => {
    const dx = (p[0] - centroid.lng) * mPerLng;
    const dy = (p[1] - centroid.lat) * M_PER_DEG_LAT;
    return rotate(dx, dy, -angleRad);
  };
  const toLngLat = (x: number, y: number): [number, number] => {
    const [drx, dry] = rotate(x, y, angleRad);
    return [centroid.lng + drx / mPerLng, centroid.lat + dry / M_PER_DEG_LAT];
  };

  // Contador por setor para atribuir columnIndex
  const colIndexBySector = new Map<number, number>();

  const laterais: Lateral[] = [];

  for (const seg of operationalSegments) {
    const col = colById.get(seg.physicalColumnId);
    if (!col || seg.sprinklerIndices.length === 0) continue;

    const n = seg.sprinklerCount;

    // TASK-028 ajuste 4: rota reconstruída do SUBSET operacional, não da coluna inteira.
    const subsetLocal: LocalPt[] = seg.sprinklerIndices
      .map((idx) => positions[idx])
      .filter((p): p is [number, number] => p !== undefined)
      .map((p) => {
        const [xr, yr] = toLocal(p);
        return { x: xr, y: yr };
      });

    let routeCoords: [number, number][];
    let routeLengthM: number;
    if (subsetLocal.length >= 1) {
      const built = buildLateralRoute(subsetLocal, toLngLat);
      routeCoords = built.routeCoords;
      routeLengthM = built.lengthM;
    } else {
      // Fallback defensivo: rota trivial start→end da coluna.
      routeCoords = [col.startLngLat, col.endLngLat];
      routeLengthM = polylineLengthM(routeCoords);
    }

    // Comprimento real da polilinha do subset + margem de extremidade.
    const comprimentoM = routeLengthM + 0.5;
    const vazaoM3h = seg.vazaoM3h;
    const F = christiansenF(n);

    const { selecionado, hfFinal, lateralCapacity } = selectLateralTube({
      vazaoM3h, comprimentoM, tubos: [...catalogoLF], limitePerda, F,
    });
    const selecao = buildLateralSelecao(selecionado, hfFinal, vazaoM3h, aspersor.pressaoServico);

    // Invariante TASK-028 ajuste 3: endpoints derivados da rota real.
    const startLngLat = routeCoords[0];
    const endLngLat = routeCoords[routeCoords.length - 1];

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
      routeCoords,
      lateralCapacity,
    });
  }

  return laterais;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnóstico de capacidade hidráulica da lateral (TASK-031)
// ─────────────────────────────────────────────────────────────────────────────

export interface LateralCapacityViolation {
  columnIndex: number;
  /** ID da PhysicalColumn (ex.: "col-0"). */
  physicalColumnId: string;
  sprinklerCount: number;
  vazaoM3h: number;
  /** DN selecionado (sempre o maior do subset homologado quando ok=false). */
  dnMm: number;
  hfM: number;
  velMs: number;
  reason: LateralCapacityReason;
}

export interface LateralCapacityReport {
  violations: LateralCapacityViolation[];
  /** Mesma semântica do `NetworkAngleReport.hasBlockers`. */
  hasBlockers: boolean;
  /** Maior perda de carga (mca) entre todas as colunas avaliadas. */
  maxHfM: number;
  /** Maior velocidade (m/s) entre todas as colunas avaliadas. */
  maxVelMs: number;
}

/**
 * Detecta colunas físicas cuja capacidade hidráulica excede os limites do
 * subset homologado para o aspersor 5022 (DN50/DN75) — TASK-031.
 *
 * Quando uma coluna sai do seletor com `lateralCapacity.ok === false`, ela
 * está usando o maior DN disponível (DN75) mas a perda ou velocidade real
 * ainda excede o limite construtível. O blocker técnico é emitido em
 * `generateProposalDiagnostics` a partir deste report.
 */
export function detectLateralCapacityViolations(
  cols: PhysicalColumn[],
): LateralCapacityReport {
  const violations: LateralCapacityViolation[] = [];
  let maxHfM = 0;
  let maxVelMs = 0;
  for (const col of cols) {
    const cap = col.lateralCapacity;
    if (cap.hfM > maxHfM) maxHfM = cap.hfM;
    if (cap.velMs > maxVelMs) maxVelMs = cap.velMs;
    if (!cap.ok) {
      violations.push({
        columnIndex: col.columnIndex,
        physicalColumnId: col.id,
        sprinklerCount: col.sprinklerCount,
        vazaoM3h: col.vazaoM3h,
        dnMm: col.selecao.tubo.diametroMm,
        hfM: cap.hfM,
        velMs: cap.velMs,
        reason: cap.reason ?? "headloss_exceeded",
      });
    }
  }
  return { violations, hasBlockers: violations.length > 0, maxHfM, maxVelMs };
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
 * Distância mínima, em metros, de um ponto até qualquer segmento da polilinha.
 */
function pointToPolylineDistM(
  px: number,
  py: number,
  polyMetric: { x: number; y: number }[],
): number {
  if (polyMetric.length === 0) return Infinity;
  if (polyMetric.length === 1) {
    const dx = px - polyMetric[0].x;
    const dy = py - polyMetric[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  let best = Infinity;
  for (let i = 0; i < polyMetric.length - 1; i++) {
    const ax = polyMetric[i].x;
    const ay = polyMetric[i].y;
    const bx = polyMetric[i + 1].x;
    const by = polyMetric[i + 1].y;
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    let dev: number;
    if (len2 < 1e-20) {
      const dx = px - ax;
      const dy = py - ay;
      dev = Math.sqrt(dx * dx + dy * dy);
    } else {
      const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
      const projX = ax + t * abx;
      const projY = ay + t * aby;
      const dx = px - projX;
      const dy = py - projY;
      dev = Math.sqrt(dx * dx + dy * dy);
    }
    if (dev < best) best = dev;
  }
  return best;
}

/**
 * Calcula o desvio máximo, em metros, de qualquer aspersor da coluna em
 * relação à rota física da lateral.
 *
 * Quando `col.routeCoords` existe e tem ≥ 2 pontos (caso default após TASK-028),
 * o desvio é medido contra a polilinha real (mínimo entre as distâncias a cada
 * segmento). Como a rota é construída para passar por todos os aspersores, o
 * desvio é zero (até erro numérico) em projetos bem construídos.
 *
 * Quando `col.routeCoords` está ausente ou inválido (fallback), o cálculo
 * usa o eixo canônico reto `startLngLat → endLngLat`. Nesse caso, aspersores
 * fora do eixo geram blocker pela mesma lógica de antes da TASK-028.
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

  // Caminho preferido (TASK-028): distância à polilinha real da lateral.
  if (col.routeCoords && col.routeCoords.length >= 2) {
    const polyMetric = col.routeCoords.map(([lng, lat]) => ({
      x: lng * mLng,
      y: lat * M_PER_DEG_LAT,
    }));

    let maxDev = 0;
    for (const idx of col.sprinklerIndices) {
      const pos = positions[idx];
      if (!pos) continue;
      const px = pos[0] * mLng;
      const py = pos[1] * M_PER_DEG_LAT;
      const dev = pointToPolylineDistM(px, py, polyMetric);
      if (dev > maxDev) maxDev = dev;
    }
    return maxDev;
  }

  // Fallback: distância à reta start→end (comportamento pré-TASK-028).
  // Permanece como segurança quando routeCoords está ausente/inválido.
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
