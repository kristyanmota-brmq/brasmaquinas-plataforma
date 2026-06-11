/**
 * TASK-056 — Métricas operacionais objetivas de qualidade de rede para o motor
 * de seleção arquitetural (`architecture-selector.ts`).
 *
 * Cada helper é puro, determinístico e testável isoladamente. As métricas P1–P4
 * complementam a função objetivo de BOM com proxies operacionais que evitam que
 * o motor escolha redes visualmente ruins apenas por terem BOM menor.
 *
 * Convenções:
 *   - Métricas geométricas usam frame métrico local (rotação por gridAngleDegrees
 *     em torno do centroide) para isolar a geometria da projeção geodética.
 *   - Conversão lng/lat ↔ metros usa cos(latRad) em torno do centroide.
 *   - Valores numéricos retornados são **proxies operacionais**, não medidas
 *     geométricas de área poligonal real (ver P1).
 *
 * Pesos e penalidades vivem em `architecture-selector.ts` (constantes
 * `PENALTY_*` e `WEIGHT_*`); helpers aqui retornam apenas o valor bruto.
 */

import type { PhysicalColumn } from "./laterais";
import type { SecondaryPipe } from "./hydraulic-connectivity";

const M_PER_DEG_LAT = 111320;

function metersPerDegLng(latRad: number): number {
  return M_PER_DEG_LAT * Math.cos(latRad);
}

function rotate(x: number, y: number, angleRad: number): [number, number] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [x * c - y * s, x * s + y * c];
}

function lngLatDistM(
  a: [number, number],
  b: [number, number],
  mPerLng: number,
): number {
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─────────────────────────────────────────────────────────────────────────────
// P1 — principalSplitsColumnsRatio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * P1 — fração de colunas físicas que a principal "corta" pelo meio.
 *
 * **Proxy operacional, NÃO cálculo de área poligonal real.** Conta colunas onde
 * `principalY_local` cai estritamente entre `yMin_local` e `yMax_local` da coluna
 * no frame métrico rotacionado por `gridAngleDegrees`. Retorna fração ∈ [0, 1].
 *
 * Interpretação:
 *   - **0.0** = principal na borda (acima de todas as colunas OU abaixo de todas).
 *   - **1.0** = principal corta o eixo Y de TODAS as colunas (caso A3 central
 *     atravessando todo o talhão).
 *   - Valores intermediários = principal corta apenas algumas colunas (geometria
 *     irregular).
 *
 * **O que NÃO é:** isto não mede metros² de área irrigada cruzados pela principal.
 * Para isso seria preciso intersecção polígono-linha real. Aqui é apenas proxy
 * operacional baseado em quantas colunas físicas precisam ser "cortadas pela
 * vala da principal".
 */
export function computePrincipalSplitsColumnsRatio(
  principalCoords: [number, number][],
  physicalColumns: PhysicalColumn[],
  centroid: { lng: number; lat: number },
  gridAngleDegrees: number,
): number {
  if (physicalColumns.length === 0 || principalCoords.length === 0) return 0;

  const latRad = (centroid.lat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;

  const toLocal = (lng: number, lat: number): [number, number] => {
    const dx = (lng - centroid.lng) * mPerLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return rotate(dx, dy, -angleRad);
  };

  // Principal é uma reta no frame local rotacionado; pegamos o Y do primeiro vértice
  // como referência (todos os vértices compartilham o mesmo Y por construção em
  // principal.ts, linhas 127-137).
  const [px0, py0] = principalCoords[0];
  const principalLocal = toLocal(px0, py0);
  const principalYLocal = principalLocal[1];

  let crossedCount = 0;
  for (const col of physicalColumns) {
    const sLocal = toLocal(col.startLngLat[0], col.startLngLat[1]);
    const eLocal = toLocal(col.endLngLat[0], col.endLngLat[1]);
    const yMin = Math.min(sLocal[1], eLocal[1]);
    const yMax = Math.max(sLocal[1], eLocal[1]);
    if (principalYLocal > yMin && principalYLocal < yMax) {
      crossedCount += 1;
    }
  }

  return crossedCount / physicalColumns.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// P2 — subCollectorDisconnectM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * P2 — comprimento total (metros) dos `spine_entry` na topologia "espinha de
 * peixe SEMPRE sub-coletor" da TASK-053 v12.
 *
 * Cada spine_entry conecta a principal ao spine de um setor; quanto mais longo,
 * mais "desconectada" a espinha está da principal — proxy de fragmentação visual
 * dos sub-coletores.
 *
 * Retorna 0 quando não há entidades `kind === "spine_entry"` (topologia legado
 * 1:1; `kind === undefined`).
 */
export function computeSubCollectorDisconnectM(secondaries: SecondaryPipe[]): number {
  return secondaries
    .filter((s) => s.kind === "spine_entry")
    .reduce((sum, s) => sum + s.lengthM, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// P3 — routeBreaksCount
// ─────────────────────────────────────────────────────────────────────────────

/**
 * P3 — contagem de vértices internos (cotovelos) em principal + adutora +
 * spines + spine_entries.
 *
 * **Não conta vértices das ribs**: ribs são forçadas retas por construção em
 * `routeEspinhaDePeixe` (TASK-053 v12). Cotovelos internos em rib indicariam
 * bug — não devem aparecer em produção.
 *
 * Não conta laterais (forçadas retas por ADR-012, emenda TASK-045B = mediana
 * de X). Laterais com cotovelos indicariam bug em `buildLateralRoute`.
 *
 * Cada vértice interno representa uma luva-curva ou conexão extra na obra =
 * complexidade de montagem.
 */
export function computeRouteBreaksCount(
  principalCoords: [number, number][],
  adutoraCoords: [number, number][],
  secondaries: SecondaryPipe[],
): number {
  const principalBreaks = Math.max(0, principalCoords.length - 2);
  const adutoraBreaks = Math.max(0, adutoraCoords.length - 2);

  let secondaryBreaks = 0;
  for (const s of secondaries) {
    if (s.kind === "spine" || s.kind === "spine_entry" || s.kind === undefined) {
      // Para legacy (kind === undefined), contamos cotovelos pois pode haver
      // stair-step ou polilinhas L. Ribs e laterais excluídas (forçadas retas).
      const coordsLen = s.coords?.length ?? 0;
      secondaryBreaks += Math.max(0, coordsLen - 2);
    }
  }

  return principalBreaks + adutoraBreaks + secondaryBreaks;
}

// ─────────────────────────────────────────────────────────────────────────────
// P4 — valveDispersionM (exposto como helper; peso = 0 no score da TASK-056)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * P4 — média (metros) das distâncias entre cada section_valve e o spine_entry
 * mais próximo.
 *
 * **PESO = 0 no score da TASK-056.** O motivo está documentado em
 * `architecture-selector.ts` (constante `WEIGHT_VALVE_DISPERSION`): hoje os
 * `section_valves` são gerados em `constructability.ts` a partir de
 * `sectorIndices + positions[]` (arch-independente), então passar `controlPoints`
 * já calculados pelo orquestrador ao motor de seleção introduziria circularidade
 * estática (controlPoints podem estar baseados em uma arquitetura prévia).
 *
 * A relocação de `section_valve` para `spine_entry` é DEFERIDA para
 * TASK-053-valves; quando aquela task entregar, P4 vira meaningful e o peso
 * pode ser ativado em TASK-056B (calibração RT/campo).
 *
 * Por enquanto, o helper existe para testabilidade e diagnóstico, mas a
 * penalidade no score é 0.
 *
 * **W-02 (diagnóstico 2026-05-24):** o motor não recebe `controlPoints`
 * (`computeValveDispersionM([], ...)` em `architecture-selector.ts:450`), então
 * `CandidateEvaluation.p4_valveDispersionM` é estruturalmente `0` para A0/A2/A3
 * — não é "ruído". Teste de regressão observacional:
 * `architecture-selector.test.ts:T56-DIAG-W02`.
 *
 * Convenção: se não há section_valves (`controlPoints` vazio ou ausente) OU não
 * há spine_entries (topologia legado), retorna 0.
 */
export function computeValveDispersionM(
  controlPoints: ReadonlyArray<{ type: string; coordinate: [number, number] }>,
  secondaries: SecondaryPipe[],
  centroid: { lng: number; lat: number },
): number {
  const sectionValves = controlPoints.filter((cp) => cp.type === "section_valve");
  if (sectionValves.length === 0) return 0;

  const spineEntries = secondaries.filter((s) => s.kind === "spine_entry");
  if (spineEntries.length === 0) return 0;

  const latRad = (centroid.lat * Math.PI) / 180;
  const mPerLng = metersPerDegLng(latRad);

  // Para cada section_valve, calcula distância ao spine_entry mais próximo.
  // Usamos toCoord/fromCoord do spine_entry (vértices reais) — não vértices
  // internos, pois spine_entry é construído reto.
  let sumDistances = 0;
  for (const valve of sectionValves) {
    let minDist = Infinity;
    for (const se of spineEntries) {
      const d1 = lngLatDistM(valve.coordinate, se.fromCoord, mPerLng);
      const d2 = lngLatDistM(valve.coordinate, se.toCoord, mPerLng);
      const d = Math.min(d1, d2);
      if (d < minDist) minDist = d;
    }
    sumDistances += minDist;
  }

  return sumDistances / sectionValves.length;
}
