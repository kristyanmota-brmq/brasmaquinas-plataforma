/**
 * Conectividade hidráulica: secundárias e validação topológica.
 *
 * Modelo:
 *   - A principal é uma linha reta no frame local (principalY fixo, P1 fix).
 *   - Cada coluna física tem um "lateral_inlet" — a extremidade mais próxima
 *     da principal.
 *   - Se a distância entre o inlet e a principal > minGapM, é necessário um
 *     ramal/secundária explícito.
 *   - generateSecondaries() projeta cada inlet na principal e cria o ramal.
 *   - validateHydraulicConnectivity() verifica se todas as colunas físicas
 *     estão conectadas (diretamente ou via secundária).
 */

import type { PhysicalColumn } from "./laterais";
import type { OperationalSegment } from "./sectorization";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

/** Ramal de conexão entre um ponto da principal e os inlets de uma ou mais laterais físicas.
 *
 * TASK-053 v6 (espinha de peixe — 3 entidades lineares por setor com `gridAngleDegrees` + ≥2 cols):
 *   - `kind: "spine"` — barra paralela à principal, no Y mediana dos inlets do setor (estrutural;
 *     `physicalColumnIds` vazio). Polilinha LINEAR de 2 vértices.
 *   - `kind: "spine_entry"` — segmento perpendicular conectando principal ao spine (estrutural;
 *     `physicalColumnIds` vazio). Polilinha LINEAR de 2 vértices.
 *   - `kind: "rib"` — segmento perpendicular ao spine, 1 por coluna física do setor (ownership
 *     exclusiva: `physicalColumnIds` com 1 elemento). Polilinha LINEAR de 2 vértices.
 *
 * Fallback legado (`kind === undefined`):
 *   - Ramal individual 1:1 servindo uma única coluna física, comportamento preservado byte-a-byte.
 *   - Aplica-se a: (a) chamada sem `operationalSegments`; (b) grupo com 1 coluna isolada (1 setor);
 *     (c) chamada sem `gridAngleDegrees` (modo retrocompatível pré-v6).
 *
 * TASK-053 v3 (legado, mantido apenas em fallback): `routeSubColetorStairStep` para grupos
 * multi-coluna SEM `gridAngleDegrees` — preserva código histórico; em produção, sempre passamos
 * `gridAngleDegrees` desde v6, então o caminho stair-step não é mais exercitado por irrigation-project.ts.
 */
export interface SecondaryPipe {
  id: string;
  /**
   * ID da primeira PhysicalColumn alimentada por este ramal.
   * @deprecated TASK-053 — use `physicalColumnIds` para suporte a sub-coletor multi-coluna.
   *   Invariante mantida em ramais legados/ribs: `physicalColumnId === physicalColumnIds[0]`.
   *   Para spine/spine_entry (estruturais), `physicalColumnId` recebe string vazia "".
   */
  physicalColumnId: string;
  /**
   * TASK-053: IDs de TODAS as PhysicalColumns alimentadas por este ramal/sub-coletor.
   * Para ramais 1:1 legados / ribs: array com 1 elemento. Para sub-coletor stair-step (v3 legado):
   * lista em ordem natural (X crescente). Para spine/spine_entry (v6): array vazio (estrutural).
   *
   * Campo opcional para retrocompatibilidade de fixtures de teste e chamadores externos
   * que constroem `SecondaryPipe` manualmente sem este campo. Funções de produção
   * (`generateSecondaries`) sempre populam. Consumidores devem usar fallback
   * `secondary.physicalColumnIds ?? [secondary.physicalColumnId]` — para spine/spine_entry,
   * iteração sobre array vazio é no-op (correto: estruturais não declaram ownership de coluna).
   */
  physicalColumnIds?: readonly string[];
  /**
   * TASK-053 v6: Tipo arquitetural do ramal na espinha de peixe.
   *   - `undefined` — ramal legado 1:1 (retrocompatibilidade; mesma semântica pré-TASK-053).
   *   - `"spine"` — barra paralela à principal no Y mediana dos inlets do setor (estrutural).
   *   - `"spine_entry"` — segmento perpendicular conectando principal ao spine (estrutural).
   *   - `"rib"` — segmento perpendicular ao spine, 1 por coluna física do setor.
   *
   * Define ramificações em `sizeAllSecondaries` (vazão SUM para spine/spine_entry; max coluna
   * para rib; legado preservado byte-a-byte) e em `detectNetworkAngleIssues` (skip total para
   * spine; só principal para spine_entry; só lateral para rib; legado completo).
   */
  kind?: "spine" | "spine_entry" | "rib";
  /**
   * TASK-053 v6: Referência ao spine pai (em `spine_entry` e `rib`). Útil para validação
   * topológica e para futura agregação BOM por espinha. Ausente em legacy e em spine.
   */
  parentSpineId?: string;
  /**
   * TASK-053: Setor primário ao qual este sub-coletor pertence (regra determinística:
   * setor com mais colunas exclusivas; empate → menor `sectorId`). Ausente para chamadas
   * legadas que não fornecem `operationalSegments`.
   */
  sectorId?: number;
  /** Ponto de saída na principal (projeção do inlet). Preservado para retrocompatibilidade. */
  fromCoord: [number, number];
  /** Inlet da última lateral física (extremidade mais próxima da principal). Preservado para retrocompatibilidade. */
  toCoord: [number, number];
  /**
   * Polilinha completa do ramal (LngLat).
   * - Ausente: rota é [fromCoord, toCoord] (linha reta — caso legado ou caso padrão).
   * - Presente com length=2: linha reta explícita.
   * - Presente com length=3: rota em L com cotovelo 90°.
   * - TASK-053: presente com length ≥ 3 em sub-coletor multi-coluna stair-step (cotovelos internos
   *   onde inlets variam em Y).
   * coords[0] === fromCoord e coords[coords.length-1] === toCoord sempre.
   */
  coords?: [number, number][];
  lengthM: number;
  /** Sempre "auto" — gerado algoritmicamente a partir da geometria. */
  source: "auto";
}

export interface HydraulicConnectivityReport {
  isConnected: boolean;
  /** IDs de colunas físicas sem caminho hidráulico até a captação. */
  orphanPhysicalColumns: string[];
  /** IDs de trechos operacionais derivados de colunas órfãs. */
  orphanOperationalSegments: string[];
  /** IDs de colunas que precisam de ramal mas não têm um na lista fornecida. */
  missingSecondaryConnections: string[];
  /** Ramais calculados por generateSecondaries. */
  secondaries: SecondaryPipe[];
  totalSecondaryLengthM: number;
  connectedColumnsCount: number;
  disconnectedColumnsCount: number;
  warnings: string[];
  blockers: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes e helpers geométricos
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;

/** Tolerância angular para classificar deflexão como 0° ou 90° (graus). */
const ROUTING_TOL_DEG = 5;

function mPerLngAtLat(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Distância euclidiana entre dois pontos em metros. */
function distM(
  a: [number, number],
  b: [number, number],
  mPerLng: number,
): number {
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Helpers de roteamento (L-shape 90°) ─────────────────────────────────────

function toMetricPt(p: [number, number], mPerLng: number): [number, number] {
  return [p[0] * mPerLng, p[1] * M_PER_DEG_LAT];
}

function fromMetricPt(m: [number, number], mPerLng: number): [number, number] {
  return [m[0] / mPerLng, m[1] / M_PER_DEG_LAT];
}

function euclidM(a: [number, number], b: [number, number]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

function unitVecM(a: [number, number], b: [number, number]): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return [1, 0];
  return [dx / len, dy / len];
}

function perpCCW(v: [number, number]): [number, number] {
  return [-v[1], v[0]];
}

function angleBetweenDegM(va: [number, number], vb: [number, number]): number {
  const dot = va[0] * vb[0] + va[1] * vb[1];
  return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
}

/**
 * Direção (unit vector) do segmento da polilinha mais próximo ao ponto (em espaço métrico).
 */
function nearestSegDirM(
  point: [number, number],
  polyline: [number, number][],
  mPerLng: number,
): [number, number] {
  if (polyline.length < 2) return [1, 0];
  const px = point[0] * mPerLng;
  const py = point[1] * M_PER_DEG_LAT;
  let bestDist = Infinity;
  let bestDir: [number, number] = [1, 0];
  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i][0] * mPerLng;
    const ay = polyline[i][1] * M_PER_DEG_LAT;
    const bx = polyline[i + 1][0] * mPerLng;
    const by = polyline[i + 1][1] * M_PER_DEG_LAT;
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    if (len2 < 1e-20) continue;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
    const d = Math.sqrt((px - (ax + t * abx)) ** 2 + (py - (ay + t * aby)) ** 2);
    if (d < bestDist) {
      bestDist = d;
      const len = Math.sqrt(len2);
      bestDir = [abx / len, aby / len];
    }
  }
  return bestDir;
}

/**
 * Interseção de duas retas: A + s*dA = B + t*dB.
 * Retorna o ponto de interseção em espaço métrico, ou null se paralelas.
 */
function intersectRaysM(
  A: [number, number], dA: [number, number],
  B: [number, number], dB: [number, number],
): [number, number] | null {
  // det = dA[1]*dB[0] - dA[0]*dB[1]
  const det = dA[1] * dB[0] - dA[0] * dB[1];
  if (Math.abs(det) < 1e-10) return null;
  const bax = B[0] - A[0];
  const bay = B[1] - A[1];
  const s = (bay * dB[0] - bax * dB[1]) / det;
  return [A[0] + s * dA[0], A[1] + s * dA[1]];
}

/**
 * Calcula a rota construtível de um ramal.
 *
 * Regra da rede interna: apenas deflexões 0° (luva) e 90° (curva/tê) são permitidas.
 *
 * - α ≈ 0° (principal ⊥ lateral): rota reta [F, T] — caso padrão.
 * - α ≈ 90° (principal ∥ lateral): rota em L [F, M, T] com cotovelo 90°.
 * - Outro α (incluindo 45°): rota reta mantida; diagnóstico emitirá blocker.
 *
 * @param F  fromCoord (ponto na principal)
 * @param T  toCoord (inlet da lateral)
 * @param col  PhysicalColumn — fornece direção da lateral
 * @param principalCoords  Polilinha da principal
 * @param mPerLng  Metros por grau de longitude na latitude local
 */
function routeSecondary(
  F: [number, number],
  T: [number, number],
  col: PhysicalColumn,
  principalCoords: [number, number][],
  mPerLng: number,
): { coords: [number, number][]; lengthM: number } {
  const Fm = toMetricPt(F, mPerLng);
  const Tm = toMetricPt(T, mPerLng);
  const directLen = euclidM(Fm, Tm);

  if (directLen < 1e-3) {
    return { coords: [F, T], lengthM: directLen };
  }

  const principalDir = nearestSegDirM(F, principalCoords, mPerLng);
  const latStart = toMetricPt(col.startLngLat, mPerLng);
  const latEnd   = toMetricPt(col.endLngLat,   mPerLng);
  const lateralDir = unitVecM(latStart, latEnd);

  // Perpendicular à principal, apontando para T.
  let perpDir = perpCCW(principalDir);
  if (perpDir[0] * (Tm[0] - Fm[0]) + perpDir[1] * (Tm[1] - Fm[1]) < 0) {
    perpDir = [-perpDir[0], -perpDir[1]];
  }

  const alpha = angleBetweenDegM(perpDir, lateralDir);

  if (alpha <= ROUTING_TOL_DEG) {
    // perpDir ∥ lateralDir → principal ⊥ lateral → rota reta (caso padrão).
    return { coords: [F, T], lengthM: directLen };
  }

  if (Math.abs(alpha - 90) <= ROUTING_TOL_DEG) {
    // perpDir ⊥ lateralDir → principal ∥ lateral → rota em L 90°.
    const Mm = intersectRaysM(Fm, perpDir, Tm, lateralDir);
    if (Mm === null) {
      return { coords: [F, T], lengthM: directLen };
    }
    const lenFM = euclidM(Fm, Mm);
    const lenMT = euclidM(Mm, Tm);
    if (lenFM < 1e-3 || lenMT < 1e-3) {
      return { coords: [F, T], lengthM: directLen };
    }
    const M = fromMetricPt(Mm, mPerLng);
    return { coords: [F, M, T], lengthM: lenFM + lenMT };
  }

  // Ângulo não construtível (ex.: 45°, 30°, 60°): manter rota reta.
  // detectNetworkAngleIssues emitirá blocker para este ramal.
  return { coords: [F, T], lengthM: directLen };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Projeta um ponto na polilinha mais próxima.
 * Retorna o ponto projetado (em LngLat) e a distância em metros.
 */
function projectOnPolyline(
  point: [number, number],
  polyline: [number, number][],
  mPerLng: number,
): { coord: [number, number]; distM: number } {
  if (polyline.length === 0) return { coord: point, distM: 0 };
  if (polyline.length === 1) {
    return { coord: polyline[0], distM: distM(point, polyline[0], mPerLng) };
  }

  let bestDist = Infinity;
  let bestCoord: [number, number] = polyline[0];

  const px = point[0] * mPerLng;
  const py = point[1] * M_PER_DEG_LAT;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const ax = a[0] * mPerLng;
    const ay = a[1] * M_PER_DEG_LAT;
    const bx = b[0] * mPerLng;
    const by = b[1] * M_PER_DEG_LAT;

    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;

    if (len2 < 1e-20) {
      const d = Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
      if (d < bestDist) { bestDist = d; bestCoord = a; }
      continue;
    }

    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
    const projX = ax + t * abx;
    const projY = ay + t * aby;
    const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);

    if (d < bestDist) {
      bestDist = d;
      bestCoord = [projX / mPerLng, projY / M_PER_DEG_LAT];
    }
  }

  return { coord: bestCoord, distM: bestDist };
}

/**
 * Retorna a extremidade da coluna física mais próxima da principal.
 */
function columnInletCoord(
  col: PhysicalColumn,
  principalCoords: [number, number][],
  mPerLng: number,
): [number, number] {
  const dStart = projectOnPolyline(col.startLngLat, principalCoords, mPerLng).distM;
  const dEnd   = projectOnPolyline(col.endLngLat,   principalCoords, mPerLng).distM;
  return dStart <= dEnd ? col.startLngLat : col.endLngLat;
}

/**
 * API pública: extremidade da coluna física mais próxima da principal.
 *
 * Fonte única de verdade compartilhada entre generateSecondaries (ramais) e
 * generateControlPoints (lateral_inlet). Aceita centroid em vez de mPerLng
 * pré-calculado para facilitar o uso em pontos de entrada externos.
 */
export function columnPhysicalInlet(
  col: PhysicalColumn,
  principalCoords: [number, number][],
  centroid: { lng: number; lat: number },
): [number, number] {
  return columnInletCoord(col, principalCoords, mPerLngAtLat(centroid.lat));
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

// ── TASK-053: Sub-coletor por setor com geometria stair-step ─────────────────

/**
 * Resultado do agrupamento de colunas físicas por setor.
 *
 * Cada grupo representa um futuro sub-coletor (ou ramal individual se `columnIds.length === 1`).
 */
export interface SectorColumnGroup {
  /** ID do setor primário (regra determinística para colunas multi-setor). */
  sectorId: number;
  /** IDs das colunas físicas servidas por este grupo, em ordem de criação. */
  columnIds: string[];
}

/**
 * Agrupa colunas físicas por setor para formar sub-coletores (TASK-053).
 *
 * Regra para colunas multi-setor (uma coluna física dividida entre N setores por
 * `ADR-014` — split por capacidade hidráulica): cada coluna é atribuída a EXATAMENTE
 * UM setor — o setor com mais colunas exclusivas (apenas-suas); empate resolve pelo
 * menor `sectorId`. Garante que cada inlet físico é alimentado por exatamente UM
 * sub-coletor, sem redundância de tubulação.
 *
 * Função pura. Retorna grupos ordenados por `sectorId` crescente; cada grupo tem
 * `columnIds.length >= 1`. Colunas sem nenhum `OperationalSegment` associado são
 * silenciosamente ignoradas (sem grupo).
 */
export function groupColumnsBySector(
  columns: readonly PhysicalColumn[],
  operationalSegments: readonly OperationalSegment[],
): SectorColumnGroup[] {
  // Passo 1: para cada coluna, conjunto de setores que ela atende
  const colToSectors = new Map<string, Set<number>>();
  for (const seg of operationalSegments) {
    let set = colToSectors.get(seg.physicalColumnId);
    if (!set) {
      set = new Set();
      colToSectors.set(seg.physicalColumnId, set);
    }
    set.add(seg.sectorId);
  }

  // Passo 2: separar colunas mono-setor (exclusivas) de multi-setor
  const sectorToExclusiveCols = new Map<number, string[]>();
  const multiSectorCols: Array<{ colId: string; sectors: number[] }> = [];

  for (const col of columns) {
    const sectors = colToSectors.get(col.id);
    if (!sectors || sectors.size === 0) continue;
    if (sectors.size === 1) {
      const sectorId = [...sectors][0];
      let list = sectorToExclusiveCols.get(sectorId);
      if (!list) {
        list = [];
        sectorToExclusiveCols.set(sectorId, list);
      }
      list.push(col.id);
    } else {
      multiSectorCols.push({
        colId: col.id,
        sectors: [...sectors].sort((a, b) => a - b),
      });
    }
  }

  // Passo 3: atribuir cada coluna multi-setor deterministicamente
  for (const { colId, sectors } of multiSectorCols) {
    const candidates = sectors.map((s) => ({
      sectorId: s,
      exclusiveCount: sectorToExclusiveCols.get(s)?.length ?? 0,
    }));
    candidates.sort((a, b) => {
      if (b.exclusiveCount !== a.exclusiveCount) return b.exclusiveCount - a.exclusiveCount;
      return a.sectorId - b.sectorId;
    });
    const winner = candidates[0].sectorId;
    let list = sectorToExclusiveCols.get(winner);
    if (!list) {
      list = [];
      sectorToExclusiveCols.set(winner, list);
    }
    list.push(colId);
  }

  // Passo 4: serializar grupos ordenados por sectorId
  const groups: SectorColumnGroup[] = [];
  for (const [sectorId, columnIds] of sectorToExclusiveCols) {
    if (columnIds.length > 0) {
      groups.push({ sectorId, columnIds });
    }
  }
  groups.sort((a, b) => a.sectorId - b.sectorId);
  return groups;
}

/**
 * Constrói a polilinha stair-step de um sub-coletor multi-coluna (TASK-053).
 *
 * Topologia:
 *   - Sai de um ponto na principal (projeção do primeiro inlet)
 *   - Vai até o primeiro inlet (segmento perpendicular à principal, deflexão 90° na principal)
 *   - Conecta cada par consecutivo de inlets:
 *     - Se Y é igual (dentro de tolerância): segmento reto
 *     - Se Y difere: segmento horizontal até X do próximo inlet + cotovelo 90° + segmento vertical
 *   - Termina no último inlet
 *
 * Todas as deflexões internas são 0° (continuação reta) ou 90° (cotovelo), portanto
 * a polilinha resultante é construtível conforme ADR-010 (rede interna [0°, 90°]).
 *
 * Função pura.
 */
export function routeSubColetorStairStep(
  cols: readonly PhysicalColumn[],
  principalCoords: [number, number][],
  centroid: { lng: number; lat: number },
): { coords: [number, number][]; lengthM: number; fromCoord: [number, number]; toCoord: [number, number] } {
  if (cols.length === 0) {
    throw new Error("routeSubColetorStairStep: cols vazio");
  }

  const mPerLng = mPerLngAtLat(centroid.lat);

  // 1. Para cada coluna, obter inlet
  const inlets = cols.map((col) => columnInletCoord(col, principalCoords, mPerLng));

  // 2. Ordenar por X (longitude) — direção natural da principal
  const sorted = inlets
    .map((inlet, idx) => ({ inlet, originalIdx: idx }))
    .sort((a, b) => a.inlet[0] - b.inlet[0])
    .map((x) => x.inlet);

  // 3. Saída da principal: projeção do primeiro inlet
  const firstInlet = sorted[0];
  const { coord: fromCoord } = projectOnPolyline(firstInlet, principalCoords, mPerLng);

  // 4. Construir polilinha
  const coords: [number, number][] = [fromCoord, firstInlet];

  // Tolerância em metros para considerar Y igual
  const Y_TOL_M = 0.1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    // dy em metros
    const dyM = (curr[1] - prev[1]) * M_PER_DEG_LAT;
    if (Math.abs(dyM) > Y_TOL_M) {
      // Cotovelo intermediário em (curr.lng, prev.lat) — anda em X primeiro, depois sobe/desce em Y
      coords.push([curr[0], prev[1]]);
    }
    coords.push(curr);
  }

  // 5. Calcular comprimento total
  let lengthM = 0;
  for (let i = 1; i < coords.length; i++) {
    lengthM += distM(coords[i - 1], coords[i], mPerLng);
  }

  return {
    coords,
    lengthM,
    fromCoord,
    toCoord: sorted[sorted.length - 1],
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constrói a espinha de peixe de um setor com ≥1 coluna física (TASK-053 v12).
 *
 * Topologia "sempre sub-coletor" (regra RT absoluta — nenhuma lateral conecta diretamente à
 * principal): TODA lateral conecta via `rib` → `spine` → `spine_entry` → `principal`.
 *
 * Modela 3 entidades distintas, cada uma com polilinha LINEAR de 2 vértices (sem retracing):
 *   - 1 `spine`: paralelo ao eixo X do frame rotacionado por `gridAngleDegrees` (= perpendicular
 *     aos laterais que correm em Y local), posicionado no headland entre principal e fileira de
 *     inlets. Para `cols.length === 1`: spine degenerado (lengthM = 0).
 *   - 1 `spine_entry`: perpendicular ao spine, conectando principal ao spine.
 *   - N `ribs`: 1 por coluna; perpendicular ao spine, conectando spine ao inlet da coluna.
 *     Direção naturalmente paralela aos laterais (junção rib↔lateral em 0° = luva).
 *
 * Spine Y position formula (v12):
 *   spineYLocal = (principalYLocal + farthestInletYLocal) / 2
 *
 * Fallback offset mínimo (v12) — quando todos inlets coincidem com principal (gap ≈ 0):
 *   se |spineYLocal − principalYLocal| < MIN_HEADLAND_M, força
 *   spineYLocal = principalYLocal + fieldSideSign * MIN_HEADLAND_M.
 *
 * `fieldSideSign` derivado do `centroid` LngLat (v12 fix MET-053-V11-01) — independente do range
 * dos inlets (que pode colapsar em zero quando todos inlets coincidem com principal). Fallback
 * hardcode +1 se centroidLocal[1] === principalYLocal (garantia construtiva TASK-046).
 *
 * @param gridAngleDegrees Ângulo da grade (em graus). OBRIGATÓRIO em v12 — caller (`generateSecondaries`)
 *   garante via gate explícito que esta função nunca é chamada sem ele em modo espinha.
 *
 * Função pura. Garante: ribs.length === cols.length.
 */
export function routeEspinhaDePeixe(
  cols: readonly PhysicalColumn[],
  principalCoords: [number, number][],
  centroid: { lng: number; lat: number },
  gridAngleDegrees: number,
  sectorId: number,
): {
  spine: { id: string; fromCoord: [number, number]; toCoord: [number, number]; coords: [number, number][]; lengthM: number };
  spineEntry: { id: string; fromCoord: [number, number]; toCoord: [number, number]; coords: [number, number][]; lengthM: number };
  ribs: Array<{ colId: string; fromCoord: [number, number]; toCoord: [number, number]; coords: [number, number][]; lengthM: number }>;
} {
  if (cols.length < 1) {
    throw new Error("routeEspinhaDePeixe: requer ≥1 coluna");
  }
  if (principalCoords.length < 2) {
    throw new Error("routeEspinhaDePeixe: principalCoords deve ter ≥2 vértices");
  }

  const mPerLng = mPerLngAtLat(centroid.lat);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // ── Helpers locais: LngLat <-> frame local rotacionado por -gridAngleDegrees ──
  // Mesma técnica de TASK-046 (sprinkler-grid.ts): origem no centroide, rotação alinha grade com eixo X.
  function toLocal(p: [number, number]): [number, number] {
    const dx = (p[0] - centroid.lng) * mPerLng;
    const dy = (p[1] - centroid.lat) * M_PER_DEG_LAT;
    return [dx * cosA + dy * sinA, -dx * sinA + dy * cosA];
  }
  function fromLocal(xy: [number, number]): [number, number] {
    const drx = xy[0] * cosA - xy[1] * sinA;
    const dry = xy[0] * sinA + xy[1] * cosA;
    return [centroid.lng + drx / mPerLng, centroid.lat + dry / M_PER_DEG_LAT];
  }
  function dist2D(a: [number, number], b: [number, number]): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  const MIN_HEADLAND_M = 3.0;

  // ── 1. Inlets em LngLat e frame local ──
  const inletsLngLat = cols.map((col) => columnInletCoord(col, principalCoords, mPerLng));
  const inletsLocal = inletsLngLat.map(toLocal);

  // ── 2. X range e mid (eixo da spine no frame rotacionado) ──
  const xsLocal = inletsLocal.map((p) => p[0]);
  const xLeftLocal = Math.min(...xsLocal);
  const xRightLocal = Math.max(...xsLocal);
  const sortedX = [...xsLocal].sort((a, b) => a - b);
  const midX = Math.floor(sortedX.length / 2);
  const spineEntryXLocal = sortedX.length % 2 === 0
    ? (sortedX[midX - 1] + sortedX[midX]) / 2
    : sortedX[midX];

  // ── 3. principalYLocal via probe DESLOCADO do range dos inlets ──
  // Evita o bug v6: probe central caía sobre a principal quando inlets coincidiam com ela.
  // Deslocamento de 1000m no eixo Y local garante que o probe está LONGE da principal,
  // forçando projectOnPolyline a retornar o ponto REAL da principal.
  const ysLocal = inletsLocal.map((p) => p[1]);
  const yMidInlets = (Math.min(...ysLocal) + Math.max(...ysLocal)) / 2;
  const probeLocal: [number, number] = [spineEntryXLocal, yMidInlets + 1000];
  const probeLngLat = fromLocal(probeLocal);
  const { coord: probeOnPrincipal } = projectOnPolyline(probeLngLat, principalCoords, mPerLng);
  const principalYLocal = toLocal(probeOnPrincipal)[1];

  // ── 4. fieldSideSign via CENTROID (v12 fix MET-053-V11-01) ──
  // Derivado de fonte INDEPENDENTE do range dos inlets para evitar Math.sign(0) === 0.
  // Garantia construtiva TASK-046: campo está SEMPRE do lado interior da principal.
  const centroidLocal = toLocal([centroid.lng, centroid.lat]);
  let fieldSideSign = Math.sign(centroidLocal[1] - principalYLocal);
  if (fieldSideSign === 0) fieldSideSign = 1; // safety hardcode (caso degenerado extremo)

  // ── 5. yMaxInletsLocal = inlet mais distante da principal (no sentido fieldSideSign) ──
  // Para fieldSideSign > 0: farthest é max(ys); para fieldSideSign < 0: farthest é min(ys).
  const farthestInletY = fieldSideSign > 0 ? Math.max(...ysLocal) : Math.min(...ysLocal);

  // ── 6. spineYLocal via midpoint formula (v12) ──
  let spineYLocal = (principalYLocal + farthestInletY) / 2;

  // ── 7. Fallback offset mínimo (v12) ──
  // Quando |spineYLocal − principalYLocal| < MIN_HEADLAND_M, força offset construtivo.
  if (Math.abs(spineYLocal - principalYLocal) < MIN_HEADLAND_M) {
    spineYLocal = principalYLocal + fieldSideSign * MIN_HEADLAND_M;
  }

  // ── 8. Spine endpoints no frame local ──
  // Spine paralelo ao eixo X local (= perpendicular aos laterais que correm em Y local).
  const spineFromLocal: [number, number] = [xLeftLocal, spineYLocal];
  const spineToLocal: [number, number] = [xRightLocal, spineYLocal];
  const spineFromLngLat = fromLocal(spineFromLocal);
  const spineToLngLat = fromLocal(spineToLocal);
  const spineLengthM = dist2D(spineFromLocal, spineToLocal);

  const spineId = `spine-s${sectorId}`;

  // ── 9. Spine_entry: perpendicular ao spine (= paralelo ao eixo Y local) ──
  // spine_entry top: (spineEntryXLocal, spineYLocal) — sobre a spine no X central
  // spine_entry bottom analítico: (spineEntryXLocal, principalYLocal) — sobre a linha da principal
  // Projeta o bottom na polilinha REAL da principal (snap para tratar bends/finitude).
  const spineEntryTopLocal: [number, number] = [spineEntryXLocal, spineYLocal];
  const spineEntryBottomAnalyticLocal: [number, number] = [spineEntryXLocal, principalYLocal];
  const spineEntryTopLngLat = fromLocal(spineEntryTopLocal);
  const spineEntryBottomLngLatRaw = fromLocal(spineEntryBottomAnalyticLocal);
  const { coord: spineEntryBottomLngLat } = projectOnPolyline(
    spineEntryBottomLngLatRaw,
    principalCoords,
    mPerLng,
  );
  const spineEntryBottomLocalProjected = toLocal(spineEntryBottomLngLat);
  const spineEntryLengthM = dist2D(spineEntryBottomLocalProjected, spineEntryTopLocal);

  // ── 10. Ribs: 1 por coluna, perpendicular ao spine (= paralelo ao eixo Y local) ──
  // Cada rib conecta o inlet à spine na mesma X local do inlet (perpendicular geométrica).
  // Direção do rib = paralelo aos laterais (Y local) → junção rib↔lateral em 0° (luva).
  const ribs = cols.map((col, idx) => {
    const inletLngLat = inletsLngLat[idx];
    const inletLocal = inletsLocal[idx];
    const ribTopLocal: [number, number] = [inletLocal[0], spineYLocal];
    const ribTopLngLat = fromLocal(ribTopLocal);
    const ribLengthM = dist2D(ribTopLocal, inletLocal);
    return {
      colId: col.id,
      fromCoord: ribTopLngLat,
      toCoord: inletLngLat,
      coords: [ribTopLngLat, inletLngLat] as [number, number][],
      lengthM: ribLengthM,
    };
  });

  return {
    spine: {
      id: spineId,
      fromCoord: spineFromLngLat,
      toCoord: spineToLngLat,
      coords: [spineFromLngLat, spineToLngLat],
      lengthM: spineLengthM,
    },
    spineEntry: {
      id: `spine-entry-s${sectorId}`,
      fromCoord: spineEntryBottomLngLat,
      toCoord: spineEntryTopLngLat,
      coords: [spineEntryBottomLngLat, spineEntryTopLngLat],
      lengthM: spineEntryLengthM,
    },
    ribs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opções estendidas de `generateSecondaries` (TASK-053).
 */
export interface GenerateSecondariesOptions {
  /**
   * TASK-053: Quando fornecido, ativa agrupamento por setor — colunas físicas
   * de um mesmo setor são servidas por sub-coletor único.
   * Sem este parâmetro, o comportamento legado 1:1 é preservado (retrocompatibilidade).
   */
  operationalSegments?: readonly OperationalSegment[];
  /**
   * TASK-053 v6: Quando fornecido junto com `operationalSegments`, ativa modelagem em
   * espinha de peixe (3 entidades: spine + spine_entry + ribs) no frame local rotacionado.
   * Sem este parâmetro, fallback para v3 stair-step (`routeSubColetorStairStep`) — preservado
   * como caminho histórico para retrocompatibilidade de chamadores que não passam o ângulo.
   */
  gridAngleDegrees?: number;
}

/**
 * Gera ramais (secundárias) para colunas físicas cujo inlet não toca a principal.
 *
 * Comportamento padrão (1:1, legado): para cada coluna, projeta o inlet na principal.
 * Se a distância for maior que minGapM, cria um ramal individual do ponto projetado
 * até o inlet via `routeSecondary`.
 *
 * Comportamento TASK-053 (1:N, quando `options.operationalSegments` é fornecido):
 * agrupa colunas por setor via `groupColumnsBySector` (regra determinística para
 * colunas multi-setor) e gera UM sub-coletor por setor via `routeSubColetorStairStep`.
 * Colunas isoladas (grupo com 1 elemento) usam fallback `routeSecondary` legado.
 *
 * Funciona tanto com principal automática quanto manual.
 *
 * @param minGapM  Tolerância de contato direto (padrão 0.5 m).
 * @param options  TASK-053: dados opcionais para agrupamento por setor.
 */
export function generateSecondaries(
  physicalColumns: PhysicalColumn[],
  principalCoords: [number, number][],
  centroid: { lng: number; lat: number },
  minGapM: number = 0.5,
  options?: GenerateSecondariesOptions,
): SecondaryPipe[] {
  if (physicalColumns.length === 0 || principalCoords.length === 0) return [];

  const mPerLng = mPerLngAtLat(centroid.lat);

  // Filtrar colunas que precisam de ramal (gap > minGapM)
  const colsNeedingRamal = physicalColumns.filter((col) => {
    const inlet = columnInletCoord(col, principalCoords, mPerLng);
    return projectOnPolyline(inlet, principalCoords, mPerLng).distM > minGapM;
  });

  if (colsNeedingRamal.length === 0) return [];

  // TASK-053 v12: agrupamento por setor quando operationalSegments fornecido
  if (options?.operationalSegments && options.operationalSegments.length > 0) {
    // Gate explícito v12 (fix TECH-053-V11-02): regra arquitetural absoluta exige gridAngleDegrees
    // junto com operationalSegments. Topologia "sempre sub-coletor" (nenhuma lateral conecta
    // diretamente à principal) depende do frame rotacionado para construir espinha perpendicular
    // aos laterais. Sem gridAngleDegrees, não há como construir espinha → lançar erro programático.
    if (options.gridAngleDegrees == null) {
      throw new Error(
        "generateSecondaries: operationalSegments fornecido sem gridAngleDegrees — " +
        "regra arquitetural v12 (TASK-053) exige espinha de peixe (sempre sub-coletor), " +
        "que requer gridAngleDegrees. Forneça gridAngleDegrees ou remova operationalSegments."
      );
    }
    const gridAngleDegrees = options.gridAngleDegrees;

    const groups = groupColumnsBySector(colsNeedingRamal, options.operationalSegments);
    const secondaries: SecondaryPipe[] = [];

    for (const group of groups) {
      const cols = group.columnIds
        .map((id) => colsNeedingRamal.find((c) => c.id === id))
        .filter((c): c is PhysicalColumn => c != null);

      if (cols.length === 0) continue;

      // v12: SEMPRE espinha (incluindo cols.length === 1 → espinha degenerada com lengthM=0 no spine).
      // Regra RT absoluta: nenhuma lateral conecta diretamente à principal.
      const { spine, spineEntry, ribs } = routeEspinhaDePeixe(
        cols,
        principalCoords,
        centroid,
        gridAngleDegrees,
        group.sectorId,
      );
      secondaries.push({
        id: spine.id,
        physicalColumnId: "",
        physicalColumnIds: [],
        kind: "spine",
        sectorId: group.sectorId,
        fromCoord: spine.fromCoord,
        toCoord: spine.toCoord,
        coords: spine.coords,
        lengthM: spine.lengthM,
        source: "auto",
      });
      secondaries.push({
        id: spineEntry.id,
        physicalColumnId: "",
        physicalColumnIds: [],
        kind: "spine_entry",
        parentSpineId: spine.id,
        sectorId: group.sectorId,
        fromCoord: spineEntry.fromCoord,
        toCoord: spineEntry.toCoord,
        coords: spineEntry.coords,
        lengthM: spineEntry.lengthM,
        source: "auto",
      });
      for (const rib of ribs) {
        secondaries.push({
          id: `rib-s${group.sectorId}-${rib.colId}`,
          physicalColumnId: rib.colId,
          physicalColumnIds: [rib.colId],
          kind: "rib",
          parentSpineId: spine.id,
          sectorId: group.sectorId,
          fromCoord: rib.fromCoord,
          toCoord: rib.toCoord,
          coords: rib.coords,
          lengthM: rib.lengthM,
          source: "auto",
        });
      }
    }

    return secondaries;
  }

  // Comportamento legado 1:1 (retrocompatibilidade quando operationalSegments não é fornecido)
  const secondaries: SecondaryPipe[] = [];
  for (const col of colsNeedingRamal) {
    const inlet = columnInletCoord(col, principalCoords, mPerLng);
    const { coord: projCoord } = projectOnPolyline(inlet, principalCoords, mPerLng);
    const { coords, lengthM } = routeSecondary(
      projCoord, inlet, col, principalCoords, mPerLng,
    );
    secondaries.push({
      id: `sec-${col.id}`,
      physicalColumnId: col.id,
      physicalColumnIds: [col.id],
      fromCoord: projCoord,
      toCoord: inlet,
      coords,
      lengthM,
      source: "auto",
    });
  }

  return secondaries;
}

/**
 * Valida a conectividade hidráulica da rede.
 *
 * Determina quais colunas físicas estão conectadas à principal (diretamente ou
 * via ramal na lista `secondaries`) e quais estão órfãs.
 *
 * Uma coluna está conectada quando:
 *   - gap até a principal ≤ minGapM (contato direto), OU
 *   - existe uma SecondaryPipe em `secondaries` com physicalColumnId === col.id.
 *
 * @param secondaries  Lista gerada por generateSecondaries().
 *                     Pode ser vazia para testar o estado sem ramais.
 * @param minGapM      Mesma tolerância usada em generateSecondaries().
 */
export function validateHydraulicConnectivity(
  physicalColumns: PhysicalColumn[],
  principalCoords: [number, number][] | null | undefined,
  secondaries: SecondaryPipe[],
  centroid: { lng: number; lat: number },
  minGapM: number = 0.5,
): HydraulicConnectivityReport {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!principalCoords || principalCoords.length === 0) {
    const allIds = physicalColumns.map((c) => c.id);
    blockers.push("Principal não definida. Todas as laterais físicas estão desconectadas.");
    return {
      isConnected: false,
      orphanPhysicalColumns: allIds,
      orphanOperationalSegments: [],
      missingSecondaryConnections: allIds,
      secondaries: [],
      totalSecondaryLengthM: 0,
      connectedColumnsCount: 0,
      disconnectedColumnsCount: physicalColumns.length,
      warnings,
      blockers,
    };
  }

  const mPerLng = mPerLngAtLat(centroid.lat);
  // TASK-053: mapa de TODAS as colunas servidas (via physicalColumnIds), não apenas a primeira.
  // Para SecondaryPipes legados (1:1), physicalColumnIds tem 1 elemento; comportamento idêntico ao anterior.
  // Para sub-coletores multi-coluna (TASK-053), cada coluna servida é registrada.
  const secondaryByColId = new Map<string, SecondaryPipe>();
  for (const s of secondaries) {
    const colIds = s.physicalColumnIds ?? [s.physicalColumnId];
    for (const colId of colIds) {
      secondaryByColId.set(colId, s);
    }
  }
  const totalSecondaryLengthM = secondaries.reduce((s, r) => s + r.lengthM, 0);

  // TASK-053: contar topologias multi-coluna que tornam BOM imprecisa:
  //   - v3 stair-step: physicalColumnIds.length > 1 (preservado para retrocompatibilidade)
  //   - v6 espinha de peixe: presença de spine (estrutural — espinha tem N+2 entidades por setor)
  let multiColSubColetorCount = 0;
  for (const s of secondaries) {
    const n = s.physicalColumnIds?.length ?? 1;
    if (n > 1) multiColSubColetorCount++;
    else if (s.kind === "spine") multiColSubColetorCount++;
  }

  const orphanPhysicalColumns: string[] = [];
  const missingSecondaryConnections: string[] = [];
  let connectedCount = 0;

  for (const col of physicalColumns) {
    const inlet = columnInletCoord(col, principalCoords, mPerLng);
    const gap = projectOnPolyline(inlet, principalCoords, mPerLng).distM;
    const hasSecondary = secondaryByColId.has(col.id);

    const isConnected = gap <= minGapM || hasSecondary;
    if (isConnected) {
      connectedCount++;
    } else {
      orphanPhysicalColumns.push(col.id);
      // Se precisa de ramal mas não tem, reporta como missing
      if (gap > minGapM) missingSecondaryConnections.push(col.id);
    }
  }

  const disconnectedCount = orphanPhysicalColumns.length;

  if (disconnectedCount > 0) {
    blockers.push(
      `Existem ${disconnectedCount} lateral${disconnectedCount > 1 ? "is" : ""} física${disconnectedCount > 1 ? "s" : ""} ` +
      `sem conexão hidráulica com a principal.`,
    );
  }

  if (missingSecondaryConnections.length > 0) {
    blockers.push(
      `Existem ${missingSecondaryConnections.length} lateral${missingSecondaryConnections.length > 1 ? "is" : ""} ` +
      `que exigem ramais/secundárias não modelados.`,
    );
  }

  if (totalSecondaryLengthM > 0 && secondaries.length > 0) {
    warnings.push(
      `${secondaries.length} ramal${secondaries.length > 1 ? "is" : ""} de conexão gerado${secondaries.length > 1 ? "s" : ""} ` +
      `(total: ${totalSecondaryLengthM.toFixed(0)} m). ` +
      `Inclua na BOM e valide em campo.`,
    );
  }

  // TASK-053 (ajuste TECH-053-01): warning sobre BOM provisória quando há sub-coletor multi-coluna
  // ou espinha de peixe (TASK-053 v6: 1 spine + 1 spine_entry + N ribs por setor).
  // INV-LAYOUT-INSTAVEL-COMERCIAL respeitada: sinaliza textualmente sem alterar src/lib/bom.ts.
  if (multiColSubColetorCount > 0) {
    warnings.push(
      `Layout usa ${multiColSubColetorCount} sub-coletor${multiColSubColetorCount > 1 ? "es" : ""} ` +
      `por setor (TASK-053 — topologia espinha de peixe ou stair-step multi-coluna). A BOM atual ` +
      `mantém contagem legada (1 tê por coluna) e PODE ESTAR IMPRECISA para esta topologia até ` +
      `TASK-054 sucessora ajustar a contagem de tês/cotovelos. NÃO usar BOM comercial sem revisão técnica.`,
    );
  }

  const orphanOperationalSegments: string[] = [];

  return {
    isConnected: disconnectedCount === 0,
    orphanPhysicalColumns,
    orphanOperationalSegments,
    missingSecondaryConnections,
    secondaries,
    totalSecondaryLengthM,
    connectedColumnsCount: connectedCount,
    disconnectedColumnsCount: disconnectedCount,
    warnings,
    blockers,
  };
}
