#!/usr/bin/env node
/**
 * scripts/diagnose/diagnose-espinha-projeto-a.mjs
 *
 * TASK-053 v9 — Diagnóstico da degenerescência visual de v6 em Projeto A.
 *
 * Carrega projeto fixture-e06-9setores via Prisma, extrai geometria, e
 * re-implementa o algoritmo v6 (frame rotacionado por gridAngleDegrees,
 * spine paralelo ao eixo X local = perpendicular aos laterais).
 *
 * Para cada setor, imprime:
 *   - Número de colunas servidas
 *   - Posições dos inlets em LngLat E em rotated frame (xLocal, yLocal)
 *   - xRange e yRange dos inlets no rotated frame
 *   - principalYLocal computado via projeção
 *   - spineYLocal (headland midpoint)
 *   - spineEntryXLocal (mediana xs)
 *   - xLeftLocal/xRightLocal (endpoints do spine)
 *   - spine.lengthM
 *   - ribs (colId, lengthM)
 *
 * Objetivo: identificar a causa raiz da degenerescência (spine.lengthM ≈ 0 ou
 * ribs sobrepostos) que motivou reprovação visual da v6 em 2026-05-23T01:35:00.
 *
 * USO: node scripts/diagnose/diagnose-espinha-projeto-a.mjs
 *
 * Saída: stdout. Não modifica nada.
 */

import { execSync } from "node:child_process";

const PROJECT_ID = "fixture-e06-9setores";

// ─── Constantes geométricas (replicadas de hydraulic-connectivity.ts) ────────
const M_PER_DEG_LAT = 111320;

function mPerLngAtLat(lat) {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

// ─── Algoritmo v6 (re-implementado para diagnóstico) ─────────────────────────
function routeEspinhaDePeixeV6(cols, principalCoords, centroid, gridAngleDegrees, sectorId) {
  if (cols.length < 2) {
    return { error: "menos de 2 colunas, não aplicável" };
  }

  const mPerLng = mPerLngAtLat(centroid.lat);
  const angleRad = (gridAngleDegrees * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  function toLocal(p) {
    const dx = (p[0] - centroid.lng) * mPerLng;
    const dy = (p[1] - centroid.lat) * M_PER_DEG_LAT;
    return [dx * cosA + dy * sinA, -dx * sinA + dy * cosA];
  }
  function fromLocal(xy) {
    const drx = xy[0] * cosA - xy[1] * sinA;
    const dry = xy[0] * sinA + xy[1] * cosA;
    return [centroid.lng + drx / mPerLng, centroid.lat + dry / M_PER_DEG_LAT];
  }
  function dist2D(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Projeção 2D — encontra ponto mais próximo na polilinha
  function projectOnPolyline(point, polyline) {
    let bestDist = Infinity;
    let bestCoord = polyline[0];
    const px = point[0] * mPerLng;
    const py = point[1] * M_PER_DEG_LAT;
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
      const projX = ax + t * abx;
      const projY = ay + t * aby;
      const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
      if (d < bestDist) {
        bestDist = d;
        bestCoord = [projX / mPerLng, projY / M_PER_DEG_LAT];
      }
    }
    return bestCoord;
  }

  function columnInletCoord(col) {
    const dStart = (() => {
      const proj = projectOnPolyline(col.startLngLat, principalCoords);
      return dist2D(toLocal(col.startLngLat), toLocal(proj));
    })();
    const dEnd = (() => {
      const proj = projectOnPolyline(col.endLngLat, principalCoords);
      return dist2D(toLocal(col.endLngLat), toLocal(proj));
    })();
    return dStart <= dEnd ? col.startLngLat : col.endLngLat;
  }

  // ── 1. Inlets ──
  const inletsLngLat = cols.map((col) => columnInletCoord(col));
  const inletsLocal = inletsLngLat.map(toLocal);

  // ── 2. Y mediana dos inlets ──
  const ysSorted = [...inletsLocal.map((p) => p[1])].sort((a, b) => a - b);
  const midY = Math.floor(ysSorted.length / 2);
  const inletYMedianLocal = ysSorted.length % 2 === 0
    ? (ysSorted[midY - 1] + ysSorted[midY]) / 2
    : ysSorted[midY];

  // ── 3. X range dos inlets ──
  const xs = inletsLocal.map((p) => p[0]);
  const xLeftLocal = Math.min(...xs);
  const xRightLocal = Math.max(...xs);
  const sortedX = [...xs].sort((a, b) => a - b);
  const midX = Math.floor(sortedX.length / 2);
  const spineEntryXLocal = sortedX.length % 2 === 0
    ? (sortedX[midX - 1] + sortedX[midX]) / 2
    : sortedX[midX];

  // ── 4. Principal Y local via probe ──
  const probeLngLat = fromLocal([spineEntryXLocal, inletYMedianLocal]);
  const probeOnPrincipal = projectOnPolyline(probeLngLat, principalCoords);
  const principalYLocal = toLocal(probeOnPrincipal)[1];

  // ── 5. Spine Y headland midpoint ──
  const spineYLocal = (inletYMedianLocal + principalYLocal) / 2;

  // ── 6. Spine geometry ──
  const spineFromLocal = [xLeftLocal, spineYLocal];
  const spineToLocal = [xRightLocal, spineYLocal];
  const spineLengthM = dist2D(spineFromLocal, spineToLocal);

  // ── 7. Ribs ──
  const ribs = cols.map((col, idx) => {
    const inletLocal = inletsLocal[idx];
    const ribTopLocal = [inletLocal[0], spineYLocal];
    return {
      colId: col.id,
      inletLngLat: inletsLngLat[idx],
      inletLocal,
      ribTopLocal,
      ribLengthM: dist2D(ribTopLocal, inletLocal),
    };
  });

  return {
    sectorId,
    colCount: cols.length,
    inlets: inletsLocal.map((p, i) => ({
      colId: cols[i].id,
      lngLat: inletsLngLat[i],
      local: { x: p[0], y: p[1] },
    })),
    inletYMedianLocal,
    spineEntryXLocal,
    principalYLocal,
    spineYLocal,
    xLeftLocal,
    xRightLocal,
    xRange: xRightLocal - xLeftLocal,
    yRange: Math.max(...inletsLocal.map((p) => p[1])) - Math.min(...inletsLocal.map((p) => p[1])),
    spineFromLocal,
    spineToLocal,
    spineLengthM,
    ribs: ribs.map((r) => ({
      colId: r.colId,
      ribLengthM: r.ribLengthM,
      ribTopLocal: r.ribTopLocal,
      inletLocal: r.inletLocal,
    })),
  };
}

// ─── Carrega projeto via Prisma ──────────────────────────────────────────────

async function loadProject() {
  // Importação dinâmica para suportar ESM
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const p = await prisma.project.findUnique({ where: { id: PROJECT_ID } });
    if (!p) throw new Error(`Projeto ${PROJECT_ID} não encontrado`);
    if (!p.data) throw new Error(`Projeto ${PROJECT_ID} sem campo data`);
    return p.data;
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Pipeline de cálculo (chama orquestrador de produção) ────────────────────

async function calculate(layout) {
  // O orquestrador está em TS — vamos importar via tsx (transpiled on-the-fly)
  const { calculateIrrigationProject } = await import(
    "../../src/lib/layout/irrigation-project.ts"
  );
  return calculateIrrigationProject(layout);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("─".repeat(80));
  console.log(`DIAGNÓSTICO TASK-053 v9 — Projeto ${PROJECT_ID}`);
  console.log("─".repeat(80));

  const layout = await loadProject();
  console.log(`\n✓ Layout carregado: ${layout.sprinklers?.count ?? "?"} aspersores`);
  console.log(`  gridAngleDegrees=${layout.sprinklers?.gridAngleDegrees ?? "?"}°`);
  console.log(`  centroid=(${layout.centroid?.lng}, ${layout.centroid?.lat})`);
  console.log(`  setoresCount=${layout.sectorization?.setoresCount ?? "?"}`);

  const result = await calculate(layout);
  console.log(`\n✓ Pipeline executado. Hidráulica computada.`);

  const physicalColumns = result.physical?.physicalColumns ?? [];
  const principalCoords = result.hydraulic?.principalCoords ?? [];
  const operationalSegments = result.operational?.operationalSegments ?? [];
  const gridAngleDegrees = layout.sprinklers?.gridAngleDegrees ?? 0;
  const centroid = layout.centroid;

  console.log(`\n✓ Estruturas extraídas:`);
  console.log(`  physicalColumns: ${physicalColumns.length}`);
  console.log(`  principalCoords: ${principalCoords.length} vértices`);
  console.log(`  operationalSegments: ${operationalSegments.length}`);

  if (principalCoords.length > 0) {
    console.log(`  principal start: (${principalCoords[0][0].toFixed(6)}, ${principalCoords[0][1].toFixed(6)})`);
    console.log(`  principal end:   (${principalCoords[principalCoords.length - 1][0].toFixed(6)}, ${principalCoords[principalCoords.length - 1][1].toFixed(6)})`);
  }

  // Agrupar colunas por setor (replicando groupColumnsBySector simplificadamente)
  const colsBySector = new Map();
  for (const seg of operationalSegments) {
    if (!colsBySector.has(seg.sectorId)) colsBySector.set(seg.sectorId, new Set());
    colsBySector.get(seg.sectorId).add(seg.physicalColumnId);
  }

  const colById = new Map(physicalColumns.map((c) => [c.id, c]));

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DIAGNÓSTICO POR SETOR (algoritmo v6 simulado)`);
  console.log(`${"═".repeat(80)}`);

  const sectorIds = [...colsBySector.keys()].sort((a, b) => a - b);

  for (const sectorId of sectorIds) {
    const colIds = [...colsBySector.get(sectorId)];
    const cols = colIds.map((id) => colById.get(id)).filter(Boolean);

    console.log(`\n── Setor ${sectorId} ──`);
    console.log(`  Colunas (${cols.length}): ${cols.map((c) => c.id).join(", ")}`);

    if (cols.length < 2) {
      console.log(`  (Setor com < 2 colunas → fallback routeSecondary, não aplicável a routeEspinhaDePeixe v6)`);
      continue;
    }

    const diag = routeEspinhaDePeixeV6(cols, principalCoords, centroid, gridAngleDegrees, sectorId);

    if (diag.error) {
      console.log(`  ERRO: ${diag.error}`);
      continue;
    }

    console.log(`  Inlets em rotated frame (xLocal, yLocal):`);
    for (const inlet of diag.inlets) {
      console.log(`    ${inlet.colId}: x=${inlet.local.x.toFixed(2)}m, y=${inlet.local.y.toFixed(2)}m`);
    }
    console.log(`  xRange = ${diag.xRange.toFixed(2)} m, yRange = ${diag.yRange.toFixed(2)} m`);
    console.log(`  inletYMedianLocal = ${diag.inletYMedianLocal.toFixed(2)} m`);
    console.log(`  principalYLocal   = ${diag.principalYLocal.toFixed(2)} m`);
    console.log(`  spineYLocal       = ${diag.spineYLocal.toFixed(2)} m`);
    console.log(`  spineEntryXLocal  = ${diag.spineEntryXLocal.toFixed(2)} m`);
    console.log(`  xLeftLocal        = ${diag.xLeftLocal.toFixed(2)} m`);
    console.log(`  xRightLocal       = ${diag.xRightLocal.toFixed(2)} m`);
    console.log(`  SPINE length      = ${diag.spineLengthM.toFixed(2)} m  ${diag.spineLengthM < 1 ? "⚠️ DEGENERADO" : "✓"}`);
    console.log(`  spine_entry length= |${diag.principalYLocal.toFixed(2)} - ${diag.spineYLocal.toFixed(2)}| = ${Math.abs(diag.principalYLocal - diag.spineYLocal).toFixed(2)} m`);
    console.log(`  Ribs (${diag.ribs.length}):`);
    let allRibsZero = true;
    for (const rib of diag.ribs) {
      const flag = rib.ribLengthM < 0.5 ? "⚠️ MUITO CURTO" : "✓";
      if (rib.ribLengthM >= 0.5) allRibsZero = false;
      console.log(`    ${rib.colId}: length=${rib.ribLengthM.toFixed(2)} m ${flag}`);
    }
    if (allRibsZero) {
      console.log(`    ⚠️⚠️ TODOS RIBS DEGENERADOS — todos inlets na mesma Y que spine (spine sobre a linha dos inlets, não no headland)`);
    }
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`CONCLUSÃO DO DIAGNÓSTICO`);
  console.log(`${"═".repeat(80)}`);
  console.log(`\nProcure pelos sinalizadores:`);
  console.log(`  ⚠️ DEGENERADO em SPINE length      → xLeftLocal ≈ xRightLocal (inlets empilhados em X)`);
  console.log(`  ⚠️ MUITO CURTO em ribs             → spine_y muito próximo de inlet_y (spine não está no headland)`);
  console.log(`  ⚠️⚠️ TODOS RIBS DEGENERADOS         → bug estrutural no spine_y calculation`);
  console.log(``);
  console.log(`Se XRange é grande (≥ 50 m por setor típico) mas SPINE length é zero ⇒ bug no min/max calculation.`);
  console.log(`Se principalYLocal ≈ inletYMedianLocal ⇒ spine_y degenera para sobre os inlets, ribs colapsam.`);
  console.log(`Se principalYLocal estiver longe (gap grande) mas ribs ainda curtos ⇒ bug no spineYLocal formula.`);
}

main().catch((err) => {
  console.error(`✗ Erro: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
