/**
 * TASK-069 — Validação E09 passo 3 (roteiro §11.2): reproduz o projeto HISTÓRICO
 * real de 12,7 ha (capim, NAAN 5035 @ 18×18, corpus 2026-06-11) e compara o
 * output do motor com a proposta real da Brasmáquinas.
 * Uso: npx tsx scripts/diagnose/validar-projeto-historico-jaiba.tsx
 */
import { generateRotatedSprinklerGrid } from "../../src/lib/layout/sprinkler-grid";
import {
  buildSectorizationAgronomica,
  buildSelectedPipelineCoords,
  buildMainPipelineUpdate,
} from "../../src/lib/layout/layout-use-cases";
import { generatePhysicalColumns } from "../../src/lib/layout/laterais";
import { calculateIrrigationProject } from "../../src/lib/layout/irrigation-project";
import { getAspersorBySku, TUBOS_PVC_LF, ASPERSOR_5035_SD_50X25 } from "../../src/lib/catalog/aspersores";

async function main() {
  // ── Geometria: retângulo de 12,7 ha (504 × 252 m) em Jaíba-MG ──
  const centroid = { lng: -43.67, lat: -15.34 };
  const M_LAT = 111320;
  const mLng = M_LAT * Math.cos((centroid.lat * Math.PI) / 180);
  const halfX = 252, halfY = 126; // 504 × 252 m = 12,70 ha
  const corner = (dx: number, dy: number): [number, number] =>
    [centroid.lng + dx / mLng, centroid.lat + dy / M_LAT];
  const area = {
    type: "Polygon" as const,
    coordinates: [[corner(-halfX, -halfY), corner(halfX, -halfY), corner(halfX, halfY), corner(-halfX, halfY), corner(-halfX, -halfY)]],
  };
  const asp = ASPERSOR_5035_SD_50X25;
  const positions = generateRotatedSprinklerGrid(area as never, asp.espacamentoPadraoM, 0);
  const waterSource = { lng: corner(-halfX - 100, -halfY - 60)[0], lat: corner(-halfX - 100, -halfY - 60)[1] };

  const physCols = generatePhysicalColumns(
    positions, 0, centroid, asp.espacamentoPadraoM,
    { vazao: asp.vazaoM3PorHora, pressaoServico: asp.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  // Jornada 14 h (real: 13 h disponíveis — sistema oferece 9/14/21; delta documentado)
  const sectorization = buildSectorizationAgronomica(
    physCols, 14, positions.length, asp.vazaoM3PorHora, asp.espacamentoPadraoM, 10, "capim",
  );
  const pipe = buildSelectedPipelineCoords(
    waterSource, physCols, centroid, 0,
    [], // laterais ainda não derivadas — fallback A0 é aceitável para o traçado inicial
  );
  const layout = {
    area, centroid, waterSource,
    areaHectares: 12.7,
    sprinklers: {
      aspersorId: asp.sku, positions, count: positions.length,
      vazaoProjetoM3PorHora: positions.length * asp.vazaoM3PorHora,
      espacamentoM: asp.espacamentoPadraoM, gridAngleDegrees: 0, angleMode: "auto" as const,
    },
    sectorization,
    mainPipeline: { ...buildMainPipelineUpdate(pipe.principal, pipe.adutora, pipe.lengthMeters, 452, 450), coordinates: pipe.principal },
    pump: { hmtMca: 60, vazaoMaxM3h: 100, modelo: "IMBIL INI BLOC 65-160" },
  };

  const r = calculateIrrigationProject(layout as never);
  const real = { // proposta REAL do corpus (12,7 ha capim, NAAN 5035 2110 l/h, 18×18, 13 h)
    aspersores: 392, setores: 8, tempoSetorH: 1.5355, vazaoSetor: 100, // m³/h máx operação
    hmt: 60, bomba: "IMBIL INI BLOC 65-160 (100 m³/h @ 60 mca)",
    intensidade: 6.512,
  };
  console.log("════ VALIDAÇÃO HISTÓRICA — 12,7 ha capim (Jaíba) ════");
  console.log(`isComplete: ${r.isComplete} · blockers: ${r.diagnostics?.blockers.length}`);
  r.diagnostics?.blockers.forEach((b) => console.log("  BLOCKER:", b.slice(0, 110)));
  const f = (x: number | undefined, d = 2) => x?.toFixed(d) ?? "—";
  console.log("\n┌──────────────────────────┬───────────── REAL ─────┬───────── MOTOR ─────────┐");
  console.log(`  Aspersores                │ ${real.aspersores}            │ ${r.layout.sprinklers?.count}`);
  console.log(`  Setores                   │ ${real.setores} (13 h disp.) │ ${r.layout.sectorization?.setoresCount} (14 h)`);
  console.log(`  Tempo por setor (h)       │ ${real.tempoSetorH}        │ ${f((r.layout.sectorization?.tempoPorSetorMinutos ?? 0) / 60, 3)}`);
  console.log(`  Intensidade (mm/h)        │ ${real.intensidade}         │ ${f(r.agronomy?.intensidadeAplicacaoMmH, 3)}`);
  console.log(`  Vazão por setor (m³/h)    │ ≈${real.vazaoSetor}          │ ${f(r.layout.sectorization?.vazaoPorSetorM3PorHora, 1)}`);
  console.log(`  HMT requerida (mca)       │ ${real.hmt} (bomba)    │ ${f(r.hydraulics?.hmt.totalHMT, 1)}`);
  console.log(`  Bomba                     │ ${real.bomba} │ ${r.layout.pump?.modelo} → ${r.hydraulics?.pumpValidation.status}`);
  console.log("\nBOM (motor) — resumo de tubos/conexões:");
  const porCat = new Map<string, number>();
  for (const i of r.bom?.itens ?? []) porCat.set(i.categoria, (porCat.get(i.categoria) ?? 0) + i.total);
  for (const [c, t] of porCat) console.log(`  ${c}: R$ ${t.toFixed(2)}`);
  console.log(`  TOTAL: R$ ${r.bom?.totalGeral.toFixed(2)}`);
  const tubos = (r.bom?.itens ?? []).filter((i) => i.categoria === "TUBO");
  tubos.forEach((t) => console.log(`    ${t.descricao.slice(0, 52)} × ${t.quantidade}`));
}
main().catch((e) => { console.error(e); process.exit(1); });
