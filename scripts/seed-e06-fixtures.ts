/**
 * scripts/seed-e06-fixtures.ts
 *
 * TASK-049 — Seed de fixtures para validação visual de E06 (Mapa e Workspace).
 *
 * Cria 4 projetos fixtures no banco para habilitar re-execução dos cenários 2-5
 * NÃO EXECUTADOS na TASK-048. Layout do Projeto A pós-TASK-046 é usado como
 * template (read-only). Nenhuma alteração em src/. Nenhuma migração Prisma.
 *
 * Restrição estrutural descoberta: `setoresCount = jornadaHoras` (definido em
 * src/lib/layout/layout-use-cases.ts:154) e `jornadaHoras ∈ {9, 14, 21}`.
 * Logo, os fixtures de "múltiplos setores" cobrem 9, 14 e 21 — não 2/3/4
 * conforme o briefing original (decisão registrada em conjunto com o usuário).
 *
 * USO:
 *   npx tsx scripts/seed-e06-fixtures.ts            # cria/atualiza fixtures
 *   npx tsx scripts/seed-e06-fixtures.ts --clean    # remove os 4 fixtures
 *
 * INVARIANTES:
 *   - Projeto A (cmpfu7e4b0001ulshh0ni8jhd) NUNCA é alterado (snapshot + assert).
 *   - --clean usa whitelist explícita de 4 IDs; nunca deleta por prefixo amplo.
 *   - ownerId dos fixtures = ownerId do Projeto A (visibilidade na UI).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";
import { buildSectorizationForJornada } from "@/lib/layout/layout-use-cases";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const PROJETO_A_ID = "cmpfu7e4b0001ulshh0ni8jhd";

const FIXTURE_IDS = [
  "fixture-e06-blocker",
  "fixture-e06-9setores",
  "fixture-e06-14setores",
  "fixture-e06-21setores",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[seed-e06] ${msg}`);
}

function logErr(msg: string) {
  console.error(`[seed-e06] ✗ ${msg}`);
}

async function readProjectA() {
  const p = await prisma.project.findUnique({ where: { id: PROJETO_A_ID } });
  if (!p) throw new Error(`Projeto A (${PROJETO_A_ID}) não encontrado no banco`);
  if (!p.data) throw new Error("Projeto A sem campo data — não pode ser usado como template");
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo --clean
// ─────────────────────────────────────────────────────────────────────────────

async function cleanFixtures() {
  log(`Removendo fixtures por whitelist: ${FIXTURE_IDS.join(", ")}`);
  const result = await prisma.project.deleteMany({
    where: { id: { in: [...FIXTURE_IDS] } },
  });
  log(`✓ Removidos ${result.count} fixtures`);

  // Sanity check: Projeto A deve continuar existindo
  const projetoA = await prisma.project.findUnique({ where: { id: PROJETO_A_ID } });
  if (!projetoA) {
    logErr("PROJETO A NÃO ENCONTRADO APÓS --clean — investigar urgente");
    process.exit(1);
  }
  log(`✓ Projeto A continua existindo (id=${projetoA.id}, name="${projetoA.name}")`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo padrão — criar fixtures
// ─────────────────────────────────────────────────────────────────────────────

async function seedFixtures() {
  log(`Lendo Projeto A (${PROJETO_A_ID})…`);
  const projetoA = await readProjectA();

  const snapshot = {
    id: projetoA.id,
    updatedAt: projetoA.updatedAt,
  };
  const ownerId = projetoA.ownerId;
  const dataA = projetoA.data as unknown as ProjectLayout;

  if (!dataA.sectorization) {
    throw new Error("Projeto A sem sectorization — não pode ser usado como template");
  }
  if (!dataA.sprinklers) {
    throw new Error("Projeto A sem sprinklers — não pode ser usado como template");
  }

  const totalSprinklers = dataA.sprinklers.count;
  const vazaoPorAspersorM3h =
    totalSprinklers > 0
      ? dataA.sprinklers.vazaoProjetoM3PorHora / totalSprinklers
      : 1.5;
  const tempoPorSetorMinutos = dataA.sectorization.tempoPorSetorMinutos;

  log(
    `  ownerId=${ownerId} • sprinklers=${totalSprinklers} • ` +
      `vazaoPorAspersor=${vazaoPorAspersorM3h.toFixed(2)} m³/h • ` +
      `tempoPorSetor=${tempoPorSetorMinutos} min`,
  );

  // Calcula physicalColumns a partir do layout do Projeto A (read-only no orquestrador)
  log("Calculando physicalColumns via orquestrador (read-only)…");
  const resultA = calculateIrrigationProject(dataA);
  if (!resultA.physical) {
    throw new Error("calculateIrrigationProject não retornou physical (Projeto A inválido?)");
  }
  const physicalColumns = resultA.physical.physicalColumns;
  log(`  physicalColumns=${physicalColumns.length}`);

  // Constrói payloads dos 4 fixtures
  const fixtures: Array<{
    id: string;
    name: string;
    layout: ProjectLayout;
    expectedBlocker: boolean;
    expectedSetoresCount: number;
  }> = [];

  // ── Fixture 1: PDF bloqueado (bomba HMT insuficiente) ────────────────────
  fixtures.push({
    id: "fixture-e06-blocker",
    name: "FIXTURE E06 — PDF bloqueado",
    layout: {
      ...dataA,
      pump: { hmtMca: 5, vazaoMaxM3h: 5 },
    },
    expectedBlocker: true,
    expectedSetoresCount: dataA.sectorization.setoresCount,
  });

  // ── Fixtures 2-4: jornada 9/14/21 setores ────────────────────────────────
  // Restrição estrutural: setoresCount === jornadaHoras (line 154 do use case).
  // jornadaHoras é literal "9 | 14 | 21". Logo cobrimos esses 3 valores.
  for (const jornada of [9, 14, 21] as const) {
    const newSectorization = buildSectorizationForJornada(
      physicalColumns,
      jornada,
      totalSprinklers,
      vazaoPorAspersorM3h,
      tempoPorSetorMinutos,
    );

    fixtures.push({
      id: `fixture-e06-${jornada}setores`,
      name: `FIXTURE E06 — ${jornada} setores`,
      layout: {
        ...dataA,
        sectorization: newSectorization,
      },
      expectedBlocker: false,
      expectedSetoresCount: jornada,
    });
  }

  // ── Validação via orquestrador + gravação ────────────────────────────────
  log(`Validando e gravando ${fixtures.length} fixtures…`);

  for (const f of fixtures) {
    const r = calculateIrrigationProject(f.layout);
    const blockers = r.diagnostics?.blockers ?? [];
    const setoresReal = r.layout.sectorization?.setoresCount ?? 0;

    log(
      `  ${f.id}: setoresCount=${setoresReal} (esperado ${f.expectedSetoresCount}) • ` +
        `blockers=${blockers.length}`,
    );

    // Asserts de pré-gravação
    if (f.expectedBlocker && blockers.length === 0) {
      logErr(`Fixture ${f.id} deveria ter blocker mas não tem. Abortando.`);
      process.exit(1);
    }
    if (setoresReal !== f.expectedSetoresCount) {
      logErr(
        `Fixture ${f.id} tem setoresCount=${setoresReal}, esperado ${f.expectedSetoresCount}. Abortando.`,
      );
      process.exit(1);
    }

    // Gravar via upsert por ID explícito (nunca toca Projeto A)
    if (f.id === PROJETO_A_ID) {
      logErr(`ID do fixture colidiu com Projeto A — abortando`);
      process.exit(1);
    }

    await prisma.project.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        name: f.name,
        client: "Fixture E06",
        city: "Barreiras",
        state: "BA",
        status: "DRAFT",
        ownerId,
        data: f.layout as unknown as Prisma.InputJsonValue,
      },
      update: {
        name: f.name,
        client: "Fixture E06",
        city: "Barreiras",
        state: "BA",
        status: "DRAFT",
        data: f.layout as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ── Validação pós-execução: Projeto A inalterado ─────────────────────────
  const projetoAAfter = await prisma.project.findUnique({ where: { id: PROJETO_A_ID } });
  if (!projetoAAfter) {
    logErr("Projeto A não encontrado após criação dos fixtures — DRAMA");
    process.exit(1);
  }
  if (projetoAAfter.updatedAt.getTime() !== snapshot.updatedAt.getTime()) {
    logErr(
      `Projeto A foi alterado! updatedAt antes=${snapshot.updatedAt.toISOString()} ` +
        `após=${projetoAAfter.updatedAt.toISOString()}. ROLLBACK.`,
    );
    await prisma.project.deleteMany({
      where: { id: { in: [...FIXTURE_IDS] } },
    });
    process.exit(1);
  }

  log("✓ Projeto A inalterado (updatedAt preservado)");

  // ── Sanity de visibilidade ───────────────────────────────────────────────
  const visibles = await prisma.project.findMany({
    where: {
      ownerId,
      id: { in: [...FIXTURE_IDS] },
    },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
  });

  log(`✓ ${visibles.length}/${FIXTURE_IDS.length} fixtures visíveis para ownerId=${ownerId}:`);
  for (const v of visibles) {
    log(`    - ${v.id} | ${v.name} | ${v.status}`);
  }

  if (visibles.length !== FIXTURE_IDS.length) {
    logErr("Algum fixture não ficou visível para ownerId. Investigar.");
    process.exit(1);
  }

  log("✅ Seed completo");
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrada
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.POSTGRES_PRISMA_URL && !process.env.DATABASE_URL) {
    logErr(
      "Nenhuma variável de banco configurada (POSTGRES_PRISMA_URL ou DATABASE_URL). " +
        "Configure .env.local antes de executar.",
    );
    process.exit(1);
  }

  const isClean = process.argv.includes("--clean");
  if (isClean) {
    await cleanFixtures();
  } else {
    await seedFixtures();
  }
}

main()
  .catch((err) => {
    logErr(err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
