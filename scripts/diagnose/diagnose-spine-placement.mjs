/** TASK-075 — diagnóstico do posicionamento do spine vs alternativa mediana (L1-ótima). */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const project = await prisma.project.findUnique({ where: { id: process.argv[2] ?? "cmpn1wlfv0004ulshuyu3armg" } });
await prisma.$disconnect();
const { calculateIrrigationProject } = await import("../../src/lib/layout/irrigation-project.ts");
const r = calculateIrrigationProject(project.data);
const secs = r.hydraulic?.secondaries ?? [];
const by = (k) => secs.filter((s) => s.kind === k);
const sum = (a) => a.reduce((t, s) => t + s.lengthM, 0);
console.log(`Projeto ${project.name} · setores ${r.layout.sectorization?.setoresCount}`);
console.log(`secundárias TOTAL: ${sum(secs).toFixed(0)} m  →  spine ${sum(by("spine")).toFixed(0)} m · spine_entry ${sum(by("spine_entry")).toFixed(0)} m · ribs ${sum(by("rib")).toFixed(0)} m`);

// Alternativa: spine na MEDIANA dos inlets do setor (minimiza Σ|inletY − spineY|)
const M = 111320, c = r.layout.centroid;
const mLng = M * Math.cos((c.lat * Math.PI) / 180);
const a = ((r.layout.sprinklers?.gridAngleDegrees ?? 0) * Math.PI) / 180;
const toL = ([lng, lat]) => {
  const dx = (lng - c.lng) * mLng, dy = (lat - c.lat) * M;
  return [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)];
};
// agrupar ribs por setor e medir: atual vs mediana
const ribsBySector = new Map();
for (const s of by("rib")) {
  const arr = ribsBySector.get(s.sectorId) ?? [];
  arr.push(s); ribsBySector.set(s.sectorId, arr);
}
let atualRibs = 0, medianaRibs = 0, atualEntry = 0, medianaEntry = 0;
for (const [sid, ribs] of ribsBySector) {
  const entry = by("spine_entry").find((s) => s.sectorId === sid);
  const spineY = toL(ribs[0].fromCoord)[1];
  const inletYs = ribs.map((s) => toL(s.toCoord)[1] + (toL(s.fromCoord)[1] - toL(s.toCoord)[1]) * 0); // toCoord = ponto na lateral
  // inlet real ~ toCoord atual (clamp); para estimar mediana usamos toCoord ys
  const ys = ribs.map((s) => toL(s.toCoord)[1]).sort((x, y) => x - y);
  const med = ys.length % 2 ? ys[(ys.length - 1) / 2] : (ys[ys.length / 2 - 1] + ys[ys.length / 2]) / 2;
  atualRibs += ribs.reduce((t, s) => t + s.lengthM, 0);
  medianaRibs += ys.reduce((t, y) => t + Math.abs(y - med), 0);
  if (entry) {
    atualEntry += entry.lengthM;
    const principalY = toL(entry.fromCoord)[1];
    medianaEntry += Math.abs(med - principalY);
  }
}
console.log(`\nALTERNATIVA spine na MEDIANA dos pontos de conexão:`);
console.log(`  ribs:    ${atualRibs.toFixed(0)} m → ${medianaRibs.toFixed(0)} m`);
console.log(`  entries: ${atualEntry.toFixed(0)} m → ${medianaEntry.toFixed(0)} m`);
console.log(`  Δ secundárias: ${(atualRibs + atualEntry - medianaRibs - medianaEntry).toFixed(0)} m a menos`);
