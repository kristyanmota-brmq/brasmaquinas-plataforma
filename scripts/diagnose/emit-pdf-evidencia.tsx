/** TASK-062 — gera o PDF da proposta pelo mesmo caminho do servidor (evidência). */
import { PrismaClient } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "fs";
import React from "react";
import { calculateIrrigationProject, pdfEmissionBlockers } from "../../src/lib/layout/irrigation-project";
import { PropostaPDF } from "../../src/lib/pdf/PropostaPDF";
import { migrateLayout } from "../../src/app/projetos/[id]/layout-schema";

async function main() {
const prisma = new PrismaClient();
const project = await prisma.project.findUnique({ where: { id: "cmpn1wlfv0004ulshuyu3armg" } });
await prisma.$disconnect();
const layout = migrateLayout((project!.data as object) ?? {});
const result = calculateIrrigationProject(layout as Parameters<typeof calculateIrrigationProject>[0]);
const blockers = pdfEmissionBlockers(result);
console.log("isComplete:", result.isComplete, "| blockers:", blockers.length);
if (!result.isComplete || blockers.length > 0) process.exit(1);
const geradoEm = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const buf = await renderToBuffer(
  React.createElement(PropostaPDF, {
    projectName: project!.name,
    client: project!.client ?? undefined,
    city: project!.city ?? undefined,
    result,
    geradoEm,
    mapImage: null,
  }) as never,
);
const out = "docs/relatorios/evidencias/2026-06-11-TASK-062/proposta-fazenda-do-paulo-primeira-emissao.pdf";
writeFileSync(out, buf);
console.log("PDF gerado:", out, `(${(buf.length / 1024).toFixed(0)} KB)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
