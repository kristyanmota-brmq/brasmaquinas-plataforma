import { describe, it, expect } from "vitest";
import { tuneSectorizationForValidArchitecture, countSecondariesOutOfLimit } from "../architecture-auto-tune";
import { selectArchitectureByBom } from "../architecture-selector";
import { calculateIrrigationProject } from "../irrigation-project";
import { generatePhysicalColumns } from "../laterais";
import { buildSectorsByFlowWithColumnSplitting } from "../sectorization";
import { ASPERSOR_PADRAO, TUBOS_PVC_LF } from "@/lib/catalog/aspersores";
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";

// ─────────────────────────────────────────────────────────────────────────────
// Fixture T78: campo em RAMPA 16 colunas × 8 linhas = 128 aspersores (192 m³/h),
// cada coluna deslocada +6 m em Y (borda inclinada, como o caso real PPPP —
// num retângulo perfeito o candidato de borda abraça a linha dos inlets e
// fica sem secundárias para invalidar).
// Com 1 setor → 192 m³/h no sub-coletor: acima do que o maior tubo do catálogo
// comporta a 1,5 m/s → NENHUM candidato de arquitetura valida (cenário PPPP,
// onde HMT > 60 mca excluía o PN60 e o PN80 estourava velocidade).
// Com mais setores a vazão cai e os candidatos validam.
// ─────────────────────────────────────────────────────────────────────────────

const SPACING = ASPERSOR_PADRAO.espacamentoPadraoM;
const VAZ = ASPERSOR_PADRAO.vazaoM3PorHora;
const M_LAT = 111320;
const CENTROID = { lng: -45.5, lat: -12.5 };
const mPerLng = M_LAT * Math.cos((CENTROID.lat * Math.PI) / 180);

function makeLayoutT78(nSetores: number): ProjectLayout {
  const cols = 16;
  const rows = 8;
  const positions: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const xM = (c - (cols - 1) / 2) * SPACING;
      const yM = (r - (rows - 1) / 2) * SPACING + c * 6; // rampa (TASK-078)
      positions.push([CENTROID.lng + xM / mPerLng, CENTROID.lat + yM / M_LAT]);
    }
  }
  const n = positions.length;
  const physCols = generatePhysicalColumns(
    positions,
    0,
    CENTROID,
    SPACING,
    { vazao: VAZ, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );
  const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(
    physCols,
    nSetores,
    VAZ,
    n,
  );
  const yPrincipalM = -(rows / 2) * SPACING - 12;
  const principalStart: [number, number] = [
    CENTROID.lng - (10 * SPACING) / mPerLng,
    CENTROID.lat + yPrincipalM / M_LAT,
  ];
  const principalEnd: [number, number] = [
    CENTROID.lng + (10 * SPACING) / mPerLng,
    CENTROID.lat + yPrincipalM / M_LAT,
  ];
  const waterSource = {
    lng: CENTROID.lng - (12 * SPACING) / mPerLng,
    lat: CENTROID.lat + (yPrincipalM - 24) / M_LAT,
  };
  return {
    schemaVersion: "1",
    centroid: CENTROID,
    waterSource,
    sprinklers: {
      aspersorId: ASPERSOR_PADRAO.sku,
      positions,
      count: n,
      vazaoProjetoM3PorHora: n * VAZ,
      espacamentoM: SPACING,
      gridAngleDegrees: 0,
      angleMode: "auto",
    },
    sectorization: {
      jornadaHoras: 14,
      laminaMm: 10,
      setoresCount: nSetores,
      tempoPorSetorMinutos: Math.round((60 * 14) / nSetores),
      aspersoresPorSetor: Math.round(n / nSetores),
      vazaoPorSetorM3PorHora: Math.round(n / nSetores) * VAZ,
      sectorIndices,
    },
    mainPipeline: {
      coordinates: [principalStart, principalEnd],
      adutora: [
        [waterSource.lng, waterSource.lat],
        [principalStart[0], principalStart[1]],
      ],
      lengthMeters: 20 * SPACING,
      segments: 20,
      source: "auto",
    },
  };
}

function selectionFor(layout: ProjectLayout) {
  const r = calculateIrrigationProject(layout);
  return selectArchitectureByBom({
    waterSource: layout.waterSource!,
    physicalColumns: r.physical!.physicalColumns,
    centroid: layout.centroid!,
    gridAngleDegrees: 0,
    laterais: r.distribution!.laterais,
    operationalSegments: r.operational!.operationalSegments,
  });
}

describe("T78 — tuneSectorizationForValidArchitecture (ajuste do projetista)", () => {
  it("T78-1 (precondição da fixture): 1 setor de 192 m³/h → nenhum candidato válido", () => {
    const sel = selectionFor(makeLayoutT78(1));
    expect(sel.decision).toBe("no_valid_candidate");
  });

  it("T78-2: ajusta para o MENOR número de setores que valida e devolve seleção válida", () => {
    const tuned = tuneSectorizationForValidArchitecture(makeLayoutT78(1));
    expect(tuned).not.toBeNull();
    expect(tuned!.setoresCountOriginal).toBe(1);
    expect(tuned!.setoresCount).toBeGreaterThan(1);
    expect(tuned!.setoresCount).toBeLessThanOrEqual(7);
    expect(tuned!.selection.decision).not.toBe("no_valid_candidate");
    // Sectorization pronta para aplicar: índices cobrem todos os aspersores
    expect(tuned!.sectorization.sectorIndices).toHaveLength(128);
    expect(tuned!.sectorization.setoresCount).toBe(tuned!.setoresCount);
    // Vazão por setor caiu abaixo do nível que invalidava (192 m³/h)
    expect(tuned!.sectorization.vazaoPorSetorM3PorHora).toBeLessThan(192);
    // Aceitação OFICIAL: o layout ajustado passa limpo no solver (0 secundárias fora de limite)
    expect(countSecondariesOutOfLimit(tuned!.layoutAjustado)).toBe(0);
    expect(tuned!.layoutAjustado.mainPipeline?.source).toBe("auto");
  });

  it("T78-3: configuração já válida → null (nada a ajustar; não mexe no projeto)", () => {
    const layoutOk = makeLayoutT78(4); // 48 m³/h/setor — dentro dos limites do DN150
    expect(selectionFor(layoutOk).decision).not.toBe("no_valid_candidate");
    expect(tuneSectorizationForValidArchitecture(layoutOk)).toBeNull();
  });

  it("T78-4: limite de busca esgotado ou inválido → null (decisão volta ao humano)", () => {
    expect(
      tuneSectorizationForValidArchitecture(makeLayoutT78(1), { maxExtraSetores: 0 }),
    ).toBeNull();
  });
});
