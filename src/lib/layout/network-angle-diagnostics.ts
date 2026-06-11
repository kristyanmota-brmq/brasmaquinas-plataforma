/**
 * Diagnóstico de construtibilidade angular para toda a rede de irrigação.
 *
 * Regra: toda conexão, dobra ou junção da rede deve usar apenas ângulos construtíveis:
 *   - deflexão 0°  (ângulo 180°) → trecho reto / luva
 *   - deflexão 45°              → curva 45°
 *   - deflexão 90°              → curva 90° ou tê 90°
 *
 * O que é verificado:
 *   - Dobras internas da principal (segmentos consecutivos)
 *   - Dobras internas da adutora (segmentos consecutivos — endereça W-05 do diagnóstico 2026-05-24)
 *   - Junção ramal/secundária → principal
 *   - Junção ramal/secundária → lateral física
 *
 * O que NÃO é verificado nesta implementação:
 *   - Junção adutora → principal: a adutora sempre conecta na extremidade da principal
 *     (invariante I4 de generatePrincipalAndAdutora). Uma conexão de extremidade pode
 *     usar qualquer cotovelo — não é uma junção T com restrição de ângulo. Produziria
 *     falsos positivos em redes auto-geradas onde a captação está deslocada lateralmente.
 *   - OperationalSegments: sub-trechos de laterais retas; ângulo avaliado indiretamente
 *     pela lateral física.
 *   - ControlPoints (section_valve): pontos sobre a lateral reta; ângulo = 180° por
 *     construção — nenhuma verificação adicional necessária.
 *   - Rota interna da lateral: a lateral é definida como reta entre primeiro e último
 *     aspersor da coluna física (todos colíneos por construção). Micro-variações
 *     geodésicas não são tratadas como dobras reais.
 *
 * Tolerância angular: ±5° — PREMISSA_PROVISORIA_ENGENHARIA.
 * Documentada em docs/metodologia/12-premissas-provisorias-e-revisao-rt.md.
 */

import type { PhysicalColumn } from "@/lib/layout/laterais";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Um problema de ângulo detectado na rede física.
 *
 * Convenção de ângulos:
 *   deflectionDeg = desvio da reta (0°=luva, 45°=curva 45°, 90°=curva/tê 90°)
 *   angleDeg      = 180° − deflectionDeg (ângulo interior entre os dois trechos)
 *
 * nearestAllowedAngleDeg usa nomenclatura de conexão:
 *   180 = luva/trecho reto (deflexão 0°)
 *   90  = curva 90° ou tê 90° (deflexão 90°)
 *   45  = curva 45° (deflexão 45°)
 */
export interface NetworkAngleIssue {
  elementType: "lateral" | "secondary" | "principal" | "adutora";
  elementId: string;
  connectionType: "bend" | "junction";
  angleDeg: number;
  deflectionDeg: number;
  nearestAllowedAngleDeg: 45 | 90 | 180;
  requiredFitting: "luva" | "curva_45" | "curva_90" | "tee_90" | "unknown";
  severity: "blocker";
  reason: string;
}

export interface NetworkAngleReport {
  issues: NetworkAngleIssue[];
  hasBlockers: boolean;
  /** Número de junções/dobras efetivamente avaliadas. */
  checkedElements: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes e helpers geométricos (flat-earth, mesma base do resto do domínio)
// ─────────────────────────────────────────────────────────────────────────────

const M_PER_DEG_LAT = 111320;

/** Metros por grau de longitude na latitude dada. */
function mPerLngAtLat(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Vetor plano em metros de A para B, usando a escala local. */
function metricVec(
  a: [number, number],
  b: [number, number],
  mLng: number,
): [number, number] {
  return [(b[0] - a[0]) * mLng, (b[1] - a[1]) * M_PER_DEG_LAT];
}

/**
 * Ângulo entre dois vetores planos, em graus [0°, 180°].
 * Vetores nulos (comprimento < ε) retornam 0° — tratados como colineares.
 */
function angleBetweenDeg(va: [number, number], vb: [number, number]): number {
  const magA = Math.sqrt(va[0] ** 2 + va[1] ** 2);
  const magB = Math.sqrt(vb[0] ** 2 + vb[1] ** 2);
  if (magA < 1e-6 || magB < 1e-6) return 0;
  const dot = va[0] * vb[0] + va[1] * vb[1];
  const cos = Math.max(-1, Math.min(1, dot / (magA * magB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de classificação de ângulos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deflexões permitidas na REDE INTERNA (principal, ramais, laterais, trechos operacionais,
 * registros e junções internas).
 * Regra oficial: apenas 0° (luva/trecho reto) e 90° (curva/tê 90°).
 * 45° é PROIBIDO na rede interna.
 */
export const ALLOWED_DEFLECTIONS_INTERNAL = [0, 90] as const;

/**
 * Deflexões permitidas na ADUTORA.
 * A adutora aceita 45°, 90° e 180° (deflexão 0°/45°/90°).
 */
export const ALLOWED_DEFLECTIONS_ADUTORA = [0, 45, 90] as const;

/**
 * Retorna true se a deflexão está dentro da tolerância de um ângulo interno permitido.
 * Rede interna: apenas 0° e 90°. 45° é inválido para principal, ramais e laterais.
 * toleranceDeg = 5° — PREMISSA_PROVISORIA_ENGENHARIA | PENDENTE_REVISAO_BRASMAQUINAS.
 */
export function isAllowedDeflection(deflectionDeg: number, toleranceDeg = 5): boolean {
  return ALLOWED_DEFLECTIONS_INTERNAL.some((d) => Math.abs(deflectionDeg - d) <= toleranceDeg);
}

/**
 * Retorna true se a deflexão está dentro da tolerância de um ângulo permitido na adutora.
 * Adutora: 0°, 45° e 90° (ADR-010).
 * toleranceDeg = 5° — mesma PREMISSA_PROVISORIA_ENGENHARIA da rede interna.
 *
 * W-05 (diagnóstico 2026-05-24): antes do nightly 2026-05-25 esta função não existia
 * e dobras internas da adutora não eram validadas em runtime — `ALLOWED_DEFLECTIONS_ADUTORA`
 * estava declarada mas era cosmética.
 */
export function isAllowedDeflectionAdutora(deflectionDeg: number, toleranceDeg = 5): boolean {
  return ALLOWED_DEFLECTIONS_ADUTORA.some((d) => Math.abs(deflectionDeg - d) <= toleranceDeg);
}

/**
 * Retorna o ângulo de conexão permitido mais próximo da deflexão dada.
 * Usa a convenção de nomenclatura de conexões:
 *   180 = trecho reto / luva (deflexão 0°)
 *   90  = curva/tê 90° (deflexão 90°)
 *   45  = curva 45° (deflexão 45°)
 */
function nearestAllowedFitting(deflectionDeg: number): 45 | 90 | 180 {
  const d0 = Math.abs(deflectionDeg - 0);
  const d45 = Math.abs(deflectionDeg - 45);
  const d90 = Math.abs(deflectionDeg - 90);
  if (d0 <= d45 && d0 <= d90) return 180;
  if (d45 <= d90) return 45;
  return 90;
}

/** Mapeia deflexão + tipo de conexão para o nome da conexão construtível. */
function fittingName(
  deflectionDeg: number,
  connectionType: "bend" | "junction",
  tol: number,
): "luva" | "curva_45" | "curva_90" | "tee_90" | "unknown" {
  if (Math.abs(deflectionDeg - 0) <= tol) return "luva";
  if (Math.abs(deflectionDeg - 45) <= tol) return "curva_45";
  if (Math.abs(deflectionDeg - 90) <= tol)
    return connectionType === "junction" ? "tee_90" : "curva_90";
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: direção do segmento da polilinha mais próximo de um ponto
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o vetor de direção (normalizado, em metros) do segmento da polilinha
 * mais próximo ao ponto dado. Retorna null se a polilinha tiver menos de 2 pontos.
 */
function nearestSegmentDir(
  point: [number, number],
  polyline: [number, number][],
  mLng: number,
): [number, number] | null {
  if (polyline.length < 2) return null;

  const px = point[0] * mLng;
  const py = point[1] * M_PER_DEG_LAT;

  let bestDist = Infinity;
  let bestDir: [number, number] = [1, 0];

  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i][0] * mLng;
    const ay = polyline[i][1] * M_PER_DEG_LAT;
    const bx = polyline[i + 1][0] * mLng;
    const by = polyline[i + 1][1] * M_PER_DEG_LAT;

    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx ** 2 + aby ** 2;
    if (len2 < 1e-20) continue;

    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
    const projX = ax + t * abx;
    const projY = ay + t * aby;
    const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);

    if (d < bestDist) {
      bestDist = d;
      const len = Math.sqrt(len2);
      bestDir = [abx / len, aby / len];
    }
  }

  return bestDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// Função principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta violações de construtibilidade angular em toda a rede de irrigação.
 *
 * @param toleranceDeg Tolerância angular em graus.
 *   Padrão 5° — PREMISSA_PROVISORIA_ENGENHARIA | PENDENTE_REVISAO_BRASMAQUINAS.
 *   Documentada em docs/metodologia/12-premissas-provisorias-e-revisao-rt.md.
 */
export function detectNetworkAngleIssues(params: {
  physicalColumns: PhysicalColumn[];
  secondaries: SecondaryPipe[];
  principalCoords: [number, number][];
  adutoraCoords: [number, number][];
  centroid: { lng: number; lat: number };
  toleranceDeg?: number;
}): NetworkAngleReport {
  const {
    physicalColumns,
    secondaries,
    principalCoords,
    adutoraCoords,
    centroid,
    toleranceDeg = 5,
  } = params;

  const mLng = mPerLngAtLat(centroid.lat);
  const issues: NetworkAngleIssue[] = [];
  let checkedElements = 0;

  // ── 1. Dobras internas da principal ────────────────────────────────────────
  // Avalia cada ponto interno (B) em [A, B, C]: deflexão = ângulo entre A→B e B→C.
  for (let i = 1; i < principalCoords.length - 1; i++) {
    const A = principalCoords[i - 1];
    const B = principalCoords[i];
    const C = principalCoords[i + 1];

    const vIn = metricVec(A, B, mLng);   // A → B (direção de chegada)
    const vOut = metricVec(B, C, mLng);  // B → C (direção de saída)

    const deflection = angleBetweenDeg(vIn, vOut);
    checkedElements++;

    if (!isAllowedDeflection(deflection, toleranceDeg)) {
      const angle = 180 - deflection;
      issues.push({
        elementType: "principal",
        elementId: `principal-bend-${i}`,
        connectionType: "bend",
        angleDeg: Math.round(angle * 10) / 10,
        deflectionDeg: Math.round(deflection * 10) / 10,
        nearestAllowedAngleDeg: nearestAllowedFitting(deflection),
        requiredFitting: "unknown",
        severity: "blocker",
        reason:
          `Dobra na principal no ponto ${i}: deflexão ${deflection.toFixed(1)}° fora dos padrões ` +
          `construtíveis (0°/45°/90°). Nenhuma conexão padrão disponível.`,
      });
    }
  }

  // ── 1.5. Dobras internas da adutora (W-05 diagnóstico 2026-05-24) ─────────
  // Mesma lógica de §1 (principal) mas com tolerância ALLOWED_DEFLECTIONS_ADUTORA = [0°, 45°, 90°].
  // A junção adutora→principal continua não verificada (ver docstring topo do arquivo).
  // Aqui só validamos dobras internas da polilinha da adutora.
  for (let i = 1; i < adutoraCoords.length - 1; i++) {
    const A = adutoraCoords[i - 1];
    const B = adutoraCoords[i];
    const C = adutoraCoords[i + 1];

    const vIn = metricVec(A, B, mLng);
    const vOut = metricVec(B, C, mLng);

    const lenIn = Math.sqrt(vIn[0] ** 2 + vIn[1] ** 2);
    const lenOut = Math.sqrt(vOut[0] ** 2 + vOut[1] ** 2);
    if (lenIn < 1e-3 || lenOut < 1e-3) continue;

    const deflection = angleBetweenDeg(vIn, vOut);
    checkedElements++;

    if (!isAllowedDeflectionAdutora(deflection, toleranceDeg)) {
      const angle = 180 - deflection;
      issues.push({
        elementType: "adutora",
        elementId: `adutora-bend-${i}`,
        connectionType: "bend",
        angleDeg: Math.round(angle * 10) / 10,
        deflectionDeg: Math.round(deflection * 10) / 10,
        nearestAllowedAngleDeg: nearestAllowedFitting(deflection),
        requiredFitting: fittingName(deflection, "bend", toleranceDeg),
        severity: "blocker",
        reason:
          `Dobra na adutora no ponto ${i}: deflexão ${deflection.toFixed(1)}° fora dos padrões ` +
          `construtíveis da adutora (0°/45°/90°). Nenhuma conexão padrão disponível.`,
      });
    }
  }

  // ── 2. Ramais: junção com a principal e com a lateral física ─────────────
  const colById = new Map(physicalColumns.map((c) => [c.id, c]));

  for (const sec of secondaries) {
    // TASK-053 v6: skip total para spine (estrutural — junções rib↔spine e spine_entry↔spine
    // garantidas por construção em routeEspinhaDePeixe via ortogonalidade no frame rotacionado).
    // Spines NÃO conectam principal nem lateral diretamente — não há junções para validar.
    if (sec.kind === "spine") continue;

    // Usar coords da rota se disponível; caso contrário, fallback para [fromCoord, toCoord].
    const routeCoords = sec.coords ?? [sec.fromCoord, sec.toCoord];
    const n = routeCoords.length;

    // Vetor do primeiro segmento (junção na principal) e do último (junção na lateral).
    const firstVec = metricVec(routeCoords[0], routeCoords[1], mLng);
    const lastVec  = metricVec(routeCoords[n - 2], routeCoords[n - 1], mLng);

    const firstLen = Math.sqrt(firstVec[0] ** 2 + firstVec[1] ** 2);

    // Ramais de comprimento zero (inlet toca a principal) não geram ângulo de junção.
    if (firstLen < 1e-3) continue;

    // TASK-053 v6: branch kind-aware. Define quais junções validar:
    //   - undefined (legado/v3): valida junção→principal + cotovelos internos + junção→lateral
    //   - "spine_entry": valida APENAS junção→principal (não conecta lateral)
    //   - "rib": valida APENAS junção→lateral (não conecta principal — conecta spine via construção)
    const validatePrincipalJunction = sec.kind === undefined || sec.kind === "spine_entry";
    const validateInternalBends = sec.kind === undefined;
    const validateLateralJunction = sec.kind === undefined || sec.kind === "rib";

    // 2a. Junção ramal → principal (usando primeiro segmento da rota)
    if (validatePrincipalJunction && principalCoords.length >= 2) {
      const principalDir = nearestSegmentDir(sec.fromCoord, principalCoords, mLng);
      if (principalDir) {
        const deflection = angleBetweenDeg(firstVec, principalDir);
        checkedElements++;

        if (!isAllowedDeflection(deflection, toleranceDeg)) {
          const angle = 180 - deflection;
          issues.push({
            elementType: "secondary",
            elementId: `${sec.id}-at-principal`,
            connectionType: "junction",
            angleDeg: Math.round(angle * 10) / 10,
            deflectionDeg: Math.round(deflection * 10) / 10,
            nearestAllowedAngleDeg: nearestAllowedFitting(deflection),
            requiredFitting: fittingName(deflection, "junction", toleranceDeg),
            severity: "blocker",
            reason:
              `Ramal ${sec.id} conecta à principal com deflexão ${deflection.toFixed(1)}° ` +
              `(rede interna: apenas 90°/180° permitidos).`,
          });
        }
      }
    }

    // 2a-bis (TASK-053): Cotovelos internos do sub-coletor stair-step (v3 legado).
    // Para sub-coletor multi-coluna com geometria stair-step, a polilinha pode ter
    // vértices intermediários (cotovelos 90°) entre fromCoord e toCoord. Cada cotovelo
    // interno deve ter deflexão 0°/90° conforme ALLOWED_DEFLECTIONS_INTERNAL.
    // Para ramais legados 1:1 (n ≤ 3), o loop não executa nenhuma iteração — preserva comportamento.
    // v6: spine_entry e rib têm polilinhas 2 vértices por construção (n === 2; loop não executa
    // de qualquer forma). validateInternalBends explicita a intenção arquitetural.
    if (validateInternalBends) for (let v = 1; v < n - 1; v++) {
      const A = routeCoords[v - 1];
      const B = routeCoords[v];
      const C = routeCoords[v + 1];
      const vIn = metricVec(A, B, mLng);
      const vOut = metricVec(B, C, mLng);
      const lenIn = Math.sqrt(vIn[0] ** 2 + vIn[1] ** 2);
      const lenOut = Math.sqrt(vOut[0] ** 2 + vOut[1] ** 2);
      if (lenIn < 1e-3 || lenOut < 1e-3) continue;
      const deflectionInternal = angleBetweenDeg(vIn, vOut);
      checkedElements++;
      if (!isAllowedDeflection(deflectionInternal, toleranceDeg)) {
        const angleInternal = 180 - deflectionInternal;
        issues.push({
          elementType: "secondary",
          elementId: `${sec.id}-internal-bend-${v}`,
          connectionType: "bend",
          angleDeg: Math.round(angleInternal * 10) / 10,
          deflectionDeg: Math.round(deflectionInternal * 10) / 10,
          nearestAllowedAngleDeg: nearestAllowedFitting(deflectionInternal),
          requiredFitting: fittingName(deflectionInternal, "bend", toleranceDeg),
          severity: "blocker",
          reason:
            `Sub-coletor ${sec.id} tem cotovelo interno no ponto ${v} com deflexão ` +
            `${deflectionInternal.toFixed(1)}° fora dos padrões construtíveis da rede interna ` +
            `(apenas 0°/90° permitidos).`,
        });
      }
    }

    // 2b. Junção ramal → lateral (usando último segmento da rota)
    // v6: spine_entry NÃO valida junção→lateral (não conecta lateral); rib SIM valida.
    const col = validateLateralJunction ? colById.get(sec.physicalColumnId) : undefined;
    if (col) {
      // latVec aponta do inlet real para a extremidade oposta (direção do fluxo).
      // Corrige falso positivo de 180° quando sec.toCoord ≈ col.endLngLat:
      // sem a correção, start→end ficaria antiparalelo ao lastVec → deflexão 180° falsa.
      // Tolerância de snap: 1.0 m (cobre imprecisão de ponto flutuante e offsets de teste).
      //
      // TASK-028 ajuste 1: quando `col.routeCoords` existir, usar o vetor do
      // PRIMEIRO segmento real da rota (inlet ≈ start) ou do ÚLTIMO segmento
      // (inlet ≈ end). Isso evita falso blocker angular quando a lateral é
      // polilinha com dobras 90° — start→end não representa mais o trecho
      // que efetivamente sai do inlet.
      const INLET_SNAP_TOL_M = 1.0;
      const vecToStart = metricVec(sec.toCoord, col.startLngLat, mLng);
      const vecToEnd   = metricVec(sec.toCoord, col.endLngLat,   mLng);
      const dToStart = Math.sqrt(vecToStart[0] ** 2 + vecToStart[1] ** 2);
      const dToEnd   = Math.sqrt(vecToEnd[0]   ** 2 + vecToEnd[1]   ** 2);
      const route = col.routeCoords && col.routeCoords.length >= 2 ? col.routeCoords : null;
      let latVec: [number, number];
      if (dToStart <= INLET_SNAP_TOL_M) {
        // Inlet ≈ start: vetor do primeiro segmento real da rota (saindo do inlet).
        latVec = route
          ? metricVec(route[0], route[1], mLng)
          : metricVec(col.startLngLat, col.endLngLat, mLng);
      } else if (dToEnd <= INLET_SNAP_TOL_M) {
        // Inlet ≈ end: vetor do último segmento real, na ordem reversa (saindo do inlet).
        latVec = route
          ? metricVec(route[route.length - 1], route[route.length - 2], mLng)
          : metricVec(col.endLngLat, col.startLngLat, mLng);
      } else {
        // sec.toCoord não coincide com nenhum extremo — inconsistência geométrica.
        // Fallback conservador: start→end (comportamento original).
        // TODO(TASK futura): emitir diagnóstico de geometria inconsistente.
        latVec = metricVec(col.startLngLat, col.endLngLat, mLng);
      }
      const deflection = angleBetweenDeg(lastVec, latVec);
      checkedElements++;

      if (!isAllowedDeflection(deflection, toleranceDeg)) {
        const angle = 180 - deflection;
        issues.push({
          elementType: "lateral",
          elementId: `${sec.id}-at-lateral-${col.id}`,
          connectionType: "junction",
          angleDeg: Math.round(angle * 10) / 10,
          deflectionDeg: Math.round(deflection * 10) / 10,
          nearestAllowedAngleDeg: nearestAllowedFitting(deflection),
          requiredFitting: fittingName(deflection, "junction", toleranceDeg),
          severity: "blocker",
          reason:
            `Ramal ${sec.id} chega à lateral ${col.id} com deflexão ${deflection.toFixed(1)}° ` +
            `fora dos padrões construtíveis da rede interna (apenas 90°/180°).`,
        });
      }
    }
  }

  return {
    issues,
    hasBlockers: issues.length > 0,
    checkedElements,
  };
}
