#!/usr/bin/env node
/**
 * scripts/diagnose/diagnose-b03-rib-lateral.mjs — TASK-057
 *
 * Forense da anomalia B-03: junções rib→lateral com deflexão fora de [0°, 90°].
 * Para cada issue angular de elementType "lateral", imprime a geometria completa
 * da coluna no FRAME LOCAL (rotacionado por gridAngleDegrees): posições dos
 * aspersores, routeCoords, start/end, rib e vetores da junção.
 *
 * Uso: npx tsx scripts/diagnose/diagnose-b03-rib-lateral.mjs <projectId>
 * Pré-requisitos: banco local + DATABASE_URL.
 */

import { PrismaClient } from "@prisma/client";

const PROJECT_ID = process.argv[2] ?? "cmpn1wlfv0004ulshuyu3armg";
const M_PER_DEG_LAT = 111320;

async function main() {
  const prisma = new PrismaClient();
  const project = await prisma.project.findUnique({ where: { id: PROJECT_ID } });
  await prisma.$disconnect();
  if (!project?.data) {
    console.error(`Projeto ${PROJECT_ID} não encontrado`);
    process.exit(1);
  }

  const { calculateIrrigationProject } = await import("../../src/lib/layout/irrigation-project.ts");
  const layout = project.data;
  const result = calculateIrrigationProject(layout);

  const grid = layout.sprinklers?.gridAngleDegrees ?? 0;
  const centroid = layout.centroid;
  const mLng = M_PER_DEG_LAT * Math.cos((centroid.lat * Math.PI) / 180);
  const a = (grid * Math.PI) / 180;
  const cosA = Math.cos(a), sinA = Math.sin(a);
  const toLocal = ([lng, lat]) => {
    const dx = (lng - centroid.lng) * mLng;
    const dy = (lat - centroid.lat) * M_PER_DEG_LAT;
    return [dx * cosA + dy * sinA, -dx * sinA + dy * cosA];
  };
  const f = (n) => n.toFixed(2);
  const fp = (p) => `(${f(p[0])}, ${f(p[1])})`;

  const issues = (result.networkAngle?.issues ?? []).filter((i) => i.elementType === "lateral");
  const secs = result.hydraulic?.secondaries ?? [];
  const cols = result.physical?.physicalColumns ?? [];
  const colById = new Map(cols.map((c) => [c.id, c]));

  console.log(`Projeto ${PROJECT_ID} · grid ${grid}° · ${issues.length} junções rib→lateral anguladas de ${cols.length} colunas\n`);

  for (const issue of issues) {
    const ribId = issue.elementId.replace(/-at-lateral-.*$/, "");
    const rib = secs.find((s) => s.id === ribId);
    const col = rib ? colById.get(rib.physicalColumnId) : undefined;
    console.log(`■ ${issue.elementId} — deflexão ${issue.deflectionDeg}° (ângulo ${issue.angleDeg}°)`);
    if (!rib || !col) { console.log("  rib/coluna não resolvidos\n"); continue; }

    const ribFrom = toLocal(rib.fromCoord), ribTo = toLocal(rib.toCoord);
    console.log(`  rib  local: ${fp(ribFrom)} → ${fp(ribTo)}  (Δx=${f(ribTo[0]-ribFrom[0])}, Δy=${f(ribTo[1]-ribFrom[1])})`);
    const s = toLocal(col.startLngLat), e = toLocal(col.endLngLat);
    console.log(`  col ${col.id}: sprinklers=${col.sprinklerCount} comprimento=${f(col.comprimentoM)}m`);
    console.log(`  start local ${fp(s)} · end local ${fp(e)}  (Δx=${f(e[0]-s[0])}, Δy=${f(e[1]-s[1])})`);
    if (col.routeCoords?.length >= 2) {
      const r0 = toLocal(col.routeCoords[0]);
      const rn = toLocal(col.routeCoords[col.routeCoords.length - 1]);
      console.log(`  route local ${fp(r0)} → ${fp(rn)}  (${col.routeCoords.length} pts; Δx=${f(rn[0]-r0[0])}, Δy=${f(rn[1]-r0[1])})`);
    } else {
      console.log(`  route: AUSENTE/INVÁLIDA (${col.routeCoords?.length ?? 0} pts)`);
    }
    const dStart = Math.hypot(ribTo[0]-s[0], ribTo[1]-s[1]);
    const dEnd = Math.hypot(ribTo[0]-e[0], ribTo[1]-e[1]);
    console.log(`  dist ribTo→start=${f(dStart)}m · ribTo→end=${f(dEnd)}m (snap tol 1,0 m → ${dStart<=1||dEnd<=1 ? "OK usa rota" : "FALLBACK start→end!"})`);
    const positions = (col.sprinklerIds ?? []).length;
    console.log(`  sprinklerIds: ${positions}`);
    console.log();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
