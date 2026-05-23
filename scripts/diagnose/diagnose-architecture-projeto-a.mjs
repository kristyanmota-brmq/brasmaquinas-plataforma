#!/usr/bin/env node
/**
 * scripts/diagnose/diagnose-architecture-projeto-a.mjs
 *
 * Script MANUAL de diagnóstico — TASK-056.
 *
 * Carrega Projeto A (fixture local fixture-e06-9setores) via Prisma, executa
 * `selectArchitectureByBom()` sobre o estado real e imprime tabela comparativa
 * A0 / A2-min / A2-max / A3 com: BOM estimada preliminar, P1, P2, P3, P4,
 * scoreFinal, isValid, invalidReason, vencedor.
 *
 * IMPORTANTE: este script NÃO é parte da bateria de testes (`run-all.mjs`)
 * porque depende de banco local e ambiente. É executado manualmente:
 *
 *   $ node scripts/diagnose/diagnose-architecture-projeto-a.mjs \
 *       > docs/relatorios/evidencias/2026-05-23-TASK-056/diagnostico-projeto-a.txt
 *
 * Pré-requisitos:
 *   - Banco local com a fixture `fixture-e06-9setores`
 *   - DATABASE_URL definido
 *
 * Saída esperada: tabela em texto plano com 4 linhas (A0/A2-min/A2-max/A3),
 * acrescida do bloco "ESCOLHA FINAL" com vencedor + reason.
 */

import { PrismaClient } from "@prisma/client";

const PROJECT_ID = "fixture-e06-9setores";

function pad(s, n) {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return str + " ".repeat(n - str.length);
}

function padR(s, n) {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return " ".repeat(n - str.length) + str;
}

function fmt(n, decimals = 2) {
  if (typeof n !== "number") return "—";
  if (!Number.isFinite(n)) return "Inf";
  return n.toFixed(decimals);
}

async function main() {
  const prisma = new PrismaClient();
  const project = await prisma.project.findUnique({ where: { id: PROJECT_ID } });
  await prisma.$disconnect();

  if (!project || !project.data) {
    console.error("Projeto não encontrado — fixture-e06-9setores ausente do banco local");
    process.exit(1);
  }

  // Calcula estado completo do projeto via orquestrador oficial. Daqui extraímos
  // physicalColumns, laterais e operationalSegments necessários para chamar o motor
  // de seleção arquitetural manualmente.
  const { calculateIrrigationProject } = await import(
    "../../src/lib/layout/irrigation-project.ts"
  );
  const { selectArchitectureByBom } = await import(
    "../../src/lib/layout/architecture-selector.ts"
  );

  const layout = project.data;
  const result = calculateIrrigationProject(layout);

  const physicalColumns = result.physical?.physicalColumns ?? [];
  const laterais = result.physical?.laterais ?? [];
  const operationalSegments = result.physical?.operationalSegments ?? undefined;
  const centroid = layout.centroid;
  const gridAngleDegrees = layout.sprinklers?.gridAngleDegrees ?? 0;
  const waterSource = {
    lng: layout.waterSource?.lng ?? layout.captacao?.lng,
    lat: layout.waterSource?.lat ?? layout.captacao?.lat,
  };

  console.log("─".repeat(96));
  console.log(`DIAGNÓSTICO TASK-056 — selectArchitectureByBom sobre Projeto ${PROJECT_ID}`);
  console.log("─".repeat(96));
  console.log(`gridAngleDegrees: ${gridAngleDegrees}°`);
  console.log(`centroid:         (${centroid.lng}, ${centroid.lat})`);
  console.log(`waterSource:      (${waterSource.lng}, ${waterSource.lat})`);
  console.log(`physicalColumns:  ${physicalColumns.length}`);
  console.log(`laterais:         ${laterais.length}`);
  console.log(`operationalSegs:  ${operationalSegments?.length ?? "ausente"}`);
  console.log();

  const selection = selectArchitectureByBom({
    waterSource,
    physicalColumns,
    centroid,
    gridAngleDegrees,
    laterais,
    operationalSegments,
  });

  console.log("─".repeat(96));
  console.log("TABELA COMPARATIVA DE CANDIDATOS");
  console.log("─".repeat(96));
  const header = [
    pad("ID", 6),
    padR("BOM (R$)", 12),
    padR("P1", 6),
    padR("P2 (m)", 10),
    padR("P3", 6),
    padR("P4 (m)", 8),
    padR("Penal (R$)", 12),
    padR("Score (R$)", 14),
    pad("válido?", 8),
  ].join(" │ ");
  console.log(header);
  console.log("─".repeat(96));

  for (const e of selection.evaluations) {
    const row = [
      pad(e.candidate.id, 6),
      padR(fmt(e.bomEstimadaPreliminar, 2), 12),
      padR(fmt(e.p1_principalSplitsColumnsRatio, 3), 6),
      padR(fmt(e.p2_subCollectorDisconnectM, 1), 10),
      padR(String(e.p3_routeBreaksCount), 6),
      padR(fmt(e.p4_valveDispersionM, 1), 8),
      padR(fmt(e.operationalPenaltyR$, 2), 12),
      padR(fmt(e.scoreFinal, 2), 14),
      pad(e.isValid ? "sim" : "NÃO", 8),
    ].join(" │ ");
    console.log(row);
    if (!e.isValid) {
      console.log(`        ↳ invalidReason: ${e.invalidReason}`);
    }
  }

  console.log("─".repeat(96));
  console.log();
  console.log("ESCOLHA FINAL");
  console.log("─".repeat(96));
  console.log(`Vencedor:               ${selection.winner}`);
  console.log(`Decision:               ${selection.decision}`);
  console.log(`bomDeltaVsBaseline:     ${fmt(selection.bomDeltaVsBaseline, 2)} R$`);
  console.log(`Warnings:               ${selection.warnings.length === 0 ? "(nenhum)" : selection.warnings.join("; ")}`);
  console.log();
  console.log("Reason:");
  console.log(selection.reason);
  console.log("─".repeat(96));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
