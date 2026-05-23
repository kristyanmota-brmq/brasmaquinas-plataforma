#!/usr/bin/env node
/**
 * scripts/diagnose/verify-v12-projeto-a.mjs
 *
 * Verifica o output v12 PRODUÇÃO para Projeto A (fixture-e06-9setores).
 * Imprime: cada setor, suas secondaries com kind/from/to/lengthM, ângulo do spine
 * em global, ângulo do primeiro rib em global, e compara com direção do lateral.
 */

import { PrismaClient } from "@prisma/client";

const PROJECT_ID = "fixture-e06-9setores";

const M_PER_DEG_LAT = 111320;
function mPerLngAtLat(lat) {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function unitVecGlobal(a, b, latRef) {
  const mPerLng = mPerLngAtLat(latRef);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  const len = Math.sqrt(dx * dx + dy * dy);
  return [dx / len, dy / len];
}

function angleDegFromEast(vec) {
  return (Math.atan2(vec[1], vec[0]) * 180) / Math.PI;
}

async function main() {
  const prisma = new PrismaClient();
  const project = await prisma.project.findUnique({ where: { id: PROJECT_ID } });
  await prisma.$disconnect();

  if (!project || !project.data) {
    console.error("Projeto não encontrado");
    process.exit(1);
  }

  const { calculateIrrigationProject } = await import(
    "../../src/lib/layout/irrigation-project.ts"
  );
  const result = calculateIrrigationProject(project.data);

  console.log("─".repeat(80));
  console.log(`VERIFY v12 — Projeto ${PROJECT_ID}`);
  console.log("─".repeat(80));

  const layout = project.data;
  const gridAngleDegrees = layout.sprinklers?.gridAngleDegrees;
  console.log(`\ngridAngleDegrees = ${gridAngleDegrees}°`);
  console.log(`centroid = (${layout.centroid?.lng}, ${layout.centroid?.lat})`);

  const secondaries = result.hydraulic?.secondaries ?? [];
  const physicalColumns = result.physical?.physicalColumns ?? [];
  const colById = new Map(physicalColumns.map((c) => [c.id, c]));

  console.log(`\nTotal secondaries: ${secondaries.length}`);

  // Agrupa secondaries por sectorId
  const bySector = new Map();
  for (const sec of secondaries) {
    if (sec.sectorId == null) continue;
    if (!bySector.has(sec.sectorId)) bySector.set(sec.sectorId, []);
    bySector.get(sec.sectorId).push(sec);
  }

  const centroidLat = layout.centroid.lat;

  for (const [sectorId, secs] of [...bySector.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`\n── Setor ${sectorId} ──`);
    const spine = secs.find((s) => s.kind === "spine");
    const spineEntry = secs.find((s) => s.kind === "spine_entry");
    const ribs = secs.filter((s) => s.kind === "rib");
    const legacy = secs.filter((s) => s.kind === undefined);

    console.log(`  Total: ${secs.length} (spine=${spine ? 1 : 0}, spine_entry=${spineEntry ? 1 : 0}, ribs=${ribs.length}, legacy=${legacy.length})`);

    if (spine) {
      const spineDir = unitVecGlobal(spine.fromCoord, spine.toCoord, centroidLat);
      const spineAngle = angleDegFromEast(spineDir);
      console.log(`  spine: lengthM=${spine.lengthM.toFixed(2)} m, direção em global = ${spineAngle.toFixed(1)}° de leste`);
    }
    if (spineEntry) {
      const seDir = unitVecGlobal(spineEntry.fromCoord, spineEntry.toCoord, centroidLat);
      const seAngle = angleDegFromEast(seDir);
      console.log(`  spine_entry: lengthM=${spineEntry.lengthM.toFixed(2)} m, direção = ${seAngle.toFixed(1)}°`);
    }
    if (ribs.length > 0) {
      const firstRib = ribs[0];
      const ribDir = unitVecGlobal(firstRib.fromCoord, firstRib.toCoord, centroidLat);
      const ribAngle = angleDegFromEast(ribDir);
      console.log(`  rib[0]: lengthM=${firstRib.lengthM.toFixed(2)} m, direção = ${ribAngle.toFixed(1)}°`);

      // Compara com direção do lateral correspondente
      const colId = firstRib.physicalColumnIds?.[0];
      const col = colById.get(colId);
      if (col) {
        const latDir = unitVecGlobal(col.startLngLat, col.endLngLat, centroidLat);
        const latAngle = angleDegFromEast(latDir);
        console.log(`  lateral ${colId}: direção = ${latAngle.toFixed(1)}° (start→end)`);

        // Cálculo da deflexão na junção rib→lateral
        // (no inlet, lastVec = rib direction toward inlet; latVec = away from inlet into column)
        const inlet = firstRib.toCoord;
        const dStart = Math.hypot(
          (inlet[0] - col.startLngLat[0]) * mPerLngAtLat(centroidLat),
          (inlet[1] - col.startLngLat[1]) * M_PER_DEG_LAT,
        );
        const dEnd = Math.hypot(
          (inlet[0] - col.endLngLat[0]) * mPerLngAtLat(centroidLat),
          (inlet[1] - col.endLngLat[1]) * M_PER_DEG_LAT,
        );
        // lastVec do rib é (from → to) = (ribTop → inlet)
        const lastVec = ribDir;
        // latVec sai do inlet em direção ao outro extremo
        let latVec;
        if (dStart < dEnd) {
          // inlet ≈ start; latVec = start → end
          latVec = latDir;
        } else {
          // inlet ≈ end; latVec = end → start (reverso)
          latVec = [-latDir[0], -latDir[1]];
        }
        const dot = lastVec[0] * latVec[0] + lastVec[1] * latVec[1];
        const angleBetween = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
        const deflection = angleBetween;  // ângulo entre vetores (deflexão da junção)
        const flag = (Math.abs(deflection) < 5 || Math.abs(deflection - 90) < 5 || Math.abs(deflection - 180) < 5) ? "✓" : "❌";
        console.log(`  junção rib→lateral: deflexão = ${deflection.toFixed(1)}° ${flag}`);
      }
    }
  }

  console.log(`\n${"─".repeat(80)}`);
  console.log(`Análise: Spine direction em grid ${gridAngleDegrees}° deve estar a ~${gridAngleDegrees}° de leste`);
  console.log(`Rib direction deve estar a ~${(gridAngleDegrees + 90) % 180}° de leste (perpendicular ao spine)`);
  console.log(`Lateral direction deve estar a ~${(gridAngleDegrees + 90) % 180}° de leste (paralela aos ribs)`);
  console.log(`Deflexão rib→lateral deve ser 0° (luva) ou 180° (luva inversa) — ambos = construtibilidade OK`);
}

main().catch((err) => {
  console.error(err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
