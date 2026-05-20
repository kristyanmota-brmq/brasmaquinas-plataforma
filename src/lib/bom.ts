import {
  ASPERSOR_PADRAO,
  ADESIVO_PVC,
  TUBO_SUBIDA_PVC_BR,
  TUBOS_PVC_LF,
  TUBOS_PVC_RIGIDO,
  TES_DERIVACAO_LATERAL,
  selectTubo,
  selectCurva,
  selectTe,
  calculatePipelineDiameterMm,
  selectRegistroSecao,
  type RegistroSecao,
} from "@/lib/catalog/aspersores";
import {
  generateLateraisLegacyForDebug,
  generatePhysicalColumns,
  type Lateral,
  type PhysicalColumn,
} from "@/lib/layout/laterais";
import {
  type ConstructabilityReport,
  type ConstructabilityStatus,
  buildConstructabilityReport,
} from "@/lib/layout/constructability";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";
import type { SizedSecondaryPipe } from "@/lib/layout/secondary-sizing";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";
import type {
  HydraulicSizingReport,
  HydraulicSolverStatus,
  PumpValidationStatus,
  HydraulicModelLimitations,
} from "@/lib/layout/hydraulic-sizing";

export interface BOMItem {
  sku: string;
  descricao: string;
  marca: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  categoria: "ASPERSOR" | "TUBO" | "CONEXAO" | "ACESSORIO";
}

export interface BOMResult {
  itens: BOMItem[];
  totalGeral: number;
  laterais: Lateral[];
  meta: {
    diametroPrincipalMm: number;
    diametroPrincipalCalculadoMm: number;
    barrasDeTubo: number;
    nCurvas90: number;
    nTes: number;
    /** Trechos operacionais = operationalSegments. Usado no memorial. */
    nLaterais: number;
    /** Laterais físicas = physicalColumns. Usado na proposta e BOM. */
    nColunasLaterais: number;
    comprimentoLateraisM: number;
    comprimentoAdutoraM: number;
    comprimentoSecundariasM: number;
    aspersoresPorSetorMin: number;
    aspersoresPorSetorMax: number;
    aspersoresPorSetorMedia: number;
    vazaoPorSetorMin: number;
    vazaoPorSetorMax: number;
    desbalanceamentoSetoresPercent: number;
    tees50Source: "physicalColumns";
    operationalSegmentsCount: number;
    physicalColumnsSplitCount: number;
    maxSegmentsPerPhysicalColumn: number;
    splitControlPointsCount: number;
    splitPointsCount: number;
    unresolvedOperationalSegmentsCount: number;
    controlPointsCount: number;
    pendingControlPointsCount: number;
    independentFeedRequiredCount: number;
    constructabilityStatus: ConstructabilityStatus;
    /** TASK-005: válvulas de seção identificadas pela construtibilidade. */
    valvulasCount: number;
    /** TASK-006B: válvulas resolvidas com SKU de registro manual de seção. */
    valvulasResolvidasCount: number;
    /** TASK-005: válvulas de seção sem SKU compatível — não entram na BOM precificada. */
    valvulasSemCatalogoCount: number;
    /** TASK-006B: itens de registro manual de seção incluídos na BOM (= valvulasResolvidasCount). */
    registrosManuaisSecaoCount: number;
  };
}

/** Alias de retrocompatibilidade. */
export type BOM = BOMResult;

// ─────────────────────────────────────────────────────────────────────────────
// Entrada da BOM — dados já calculados pela camada de domínio
// ─────────────────────────────────────────────────────────────────────────────

export interface BOMInput {
  sprinklers: {
    count: number;
    vazaoProjetoM3PorHora: number;
    espacamentoM: number;
  };
  sectorization: {
    setoresCount: number;
    sectorIndices: number[];
    vazaoPorSetorM3PorHora: number;
  };
  mainPipeline: {
    lengthMeters: number;
    segments: number;
    adutora?: [number, number][];
  };
  physicalColumns: PhysicalColumn[];
  laterais: Lateral[];
  secondaries: SecondaryPipe[];
  /** P4: ramais dimensionados individualmente. Quando presente, BOM agrupa por SKU. */
  sizedSecondaries?: SizedSecondaryPipe[];
  constructability: ConstructabilityReport;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnóstico geométrico — função de debug (mantida para compatibilidade)
// ─────────────────────────────────────────────────────────────────────────────

export interface GeometryDiagnostics {
  spacingMeters: number;
  sprinklersCount: number;
  theoreticalSprinklers: number;
  physicalColumnsCount: number;
  avgSprinklersPerPhysicalColumn: number;
  minSprinklersPerPhysicalColumn: number;
  maxSprinklersPerPhysicalColumn: number;
  oneSprinklerColumnsCount: number;
  twoSprinklerColumnsCount: number;
  lateralTrechosOperacionaisCount: number;
  lateralTotalLengthM: number;
  principalLengthM: number;
  adutoraLengthM: number;
  adutoraBomBars: number;
  principalBomBars: number;
}

export function generateGeometryDiagnostics(layout: ProjectLayout): GeometryDiagnostics | null {
  if (!layout.sprinklers || !layout.sectorization || !layout.mainPipeline || !layout.centroid) {
    return null;
  }

  const { sprinklers, sectorization, mainPipeline } = layout;
  const vazaoPorAspersorM3h = sprinklers.vazaoProjetoM3PorHora / sprinklers.count;

  const physicalCols = generatePhysicalColumns(
    sprinklers.positions,
    sprinklers.gridAngleDegrees,
    layout.centroid,
    sprinklers.espacamentoM,
    { vazao: vazaoPorAspersorM3h, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );

  const laterais = generateLateraisLegacyForDebug(
    sprinklers.positions,
    sectorization.sectorIndices,
    sprinklers.gridAngleDegrees,
    layout.centroid,
    sprinklers.espacamentoM,
    { vazao: vazaoPorAspersorM3h, pressaoServico: ASPERSOR_PADRAO.pressaoServicoMca },
    TUBOS_PVC_LF,
  );

  const counts = physicalCols.map((c) => c.sprinklerCount);
  const adutoraCoords = mainPipeline.adutora ?? [];
  const adutoraLengthM =
    adutoraCoords.length >= 2
      ? adutoraCoords.slice(1).reduce((sum, pt, i) => sum + lngLatDistM(adutoraCoords[i], pt), 0)
      : 0;

  const tubo = selectTubo(sectorization.vazaoPorSetorM3PorHora);
  const theoreticalSprinklers = sprinklers.count;

  return {
    spacingMeters: sprinklers.espacamentoM,
    sprinklersCount: sprinklers.count,
    theoreticalSprinklers,
    physicalColumnsCount: physicalCols.length,
    avgSprinklersPerPhysicalColumn:
      physicalCols.length > 0 ? sprinklers.count / physicalCols.length : 0,
    minSprinklersPerPhysicalColumn: counts.length > 0 ? Math.min(...counts) : 0,
    maxSprinklersPerPhysicalColumn: counts.length > 0 ? Math.max(...counts) : 0,
    oneSprinklerColumnsCount: counts.filter((n) => n === 1).length,
    twoSprinklerColumnsCount: counts.filter((n) => n === 2).length,
    lateralTrechosOperacionaisCount: laterais.length,
    lateralTotalLengthM: physicalCols.reduce((s, c) => s + c.comprimentoM, 0),
    principalLengthM: mainPipeline.lengthMeters,
    adutoraLengthM,
    adutoraBomBars: adutoraLengthM > 0 ? Math.ceil(adutoraLengthM / tubo.metrosPorBarra) : 0,
    principalBomBars: Math.ceil(mainPipeline.lengthMeters / tubo.metrosPorBarra),
  };
}

// Distância euclidiana simples entre dois pontos LngLat (válida para trechos curtos).
function lngLatDistM(a: [number, number], b: [number, number]): number {
  const mPerLng = 111320 * Math.cos((a[1] * Math.PI) / 180);
  const dx = (b[0] - a[0]) * mPerLng;
  const dy = (b[1] - a[1]) * 111320;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Transforma rede pré-computada em itens de material (BOM).
 *
 * Não gera rede, setorização, secundárias ou construtibilidade.
 * Recebe o resultado já calculado por calculateIrrigationProject.
 */
export function buildBOM(input: BOMInput): BOMResult {
  const { sprinklers, sectorization, mainPipeline, physicalColumns, laterais, secondaries, sizedSecondaries, constructability } = input;

  const itens: BOMItem[] = [];
  const vazaoPorAspersorM3h = sprinklers.vazaoProjetoM3PorHora / sprinklers.count;

  // ── Aspersores ─────────────────────────────────────────────────────────────
  itens.push({
    sku: ASPERSOR_PADRAO.sku,
    descricao: ASPERSOR_PADRAO.descricao,
    marca: ASPERSOR_PADRAO.marca,
    unidade: ASPERSOR_PADRAO.unidade,
    quantidade: sprinklers.count,
    precoUnitario: ASPERSOR_PADRAO.precoVenda,
    total: sprinklers.count * ASPERSOR_PADRAO.precoVenda,
    categoria: "ASPERSOR",
  });

  // ── Tubo de subida (riser) ─────────────────────────────────────────────────
  const barrasSubida = Math.ceil(sprinklers.count / TUBO_SUBIDA_PVC_BR.aspersoresPorBarra);
  itens.push({
    sku: TUBO_SUBIDA_PVC_BR.sku,
    descricao: TUBO_SUBIDA_PVC_BR.descricao,
    marca: TUBO_SUBIDA_PVC_BR.marca,
    unidade: TUBO_SUBIDA_PVC_BR.unidade,
    quantidade: barrasSubida,
    precoUnitario: TUBO_SUBIDA_PVC_BR.precoVenda,
    total: barrasSubida * TUBO_SUBIDA_PVC_BR.precoVenda,
    categoria: "TUBO",
  });

  // ── Laterais — comprimento por coluna FÍSICA (não por trecho operacional) ──
  type TuboLFEntry = (typeof TUBOS_PVC_LF)[number];
  const lateraisPorSku = new Map<string, { tubo: TuboLFEntry; comprimentoTotal: number }>();
  for (const col of physicalColumns) {
    const sku = col.selecao.tubo.sku;
    const tuboCat = TUBOS_PVC_LF.find((t) => t.sku === sku);
    if (!tuboCat) continue;
    const entry = lateraisPorSku.get(sku) ?? { tubo: tuboCat, comprimentoTotal: 0 };
    entry.comprimentoTotal += col.comprimentoM;
    lateraisPorSku.set(sku, entry);
  }

  let comprimentoLateraisM = 0;
  for (const { tubo, comprimentoTotal } of lateraisPorSku.values()) {
    comprimentoLateraisM += comprimentoTotal;
    const barras = Math.ceil(comprimentoTotal / tubo.metrosPorBarra);
    itens.push({
      sku: tubo.sku,
      descricao: tubo.descricao,
      marca: tubo.marca,
      unidade: tubo.unidade,
      quantidade: barras,
      precoUnitario: tubo.precoVenda,
      total: barras * tubo.precoVenda,
      categoria: "TUBO",
    });
  }

  // ── Tês de derivação lateral — 1 por coluna física ─────────────────────────
  const tesPorDiam = new Map<number, number>();
  for (const col of physicalColumns) {
    const d = col.selecao.tubo.diametroMm;
    tesPorDiam.set(d, (tesPorDiam.get(d) ?? 0) + 1);
  }
  for (const [diam, qtd] of tesPorDiam.entries()) {
    const teCat =
      TES_DERIVACAO_LATERAL.find((t) => t.diametroMm === diam) ??
      TES_DERIVACAO_LATERAL[TES_DERIVACAO_LATERAL.length - 1];
    itens.push({
      sku: teCat.sku,
      descricao: teCat.descricao,
      marca: teCat.marca,
      unidade: teCat.unidade,
      quantidade: qtd,
      precoUnitario: teCat.precoVenda,
      total: qtd * teCat.precoVenda,
      categoria: "CONEXAO",
    });
  }

  // ── Tubulação principal ────────────────────────────────────────────────────
  const diametroCalc = calculatePipelineDiameterMm(sectorization.vazaoPorSetorM3PorHora);
  const tubo = selectTubo(sectorization.vazaoPorSetorM3PorHora);

  const comprimentoPrincipalM = mainPipeline.lengthMeters;
  const barrasPrincipal = Math.ceil(comprimentoPrincipalM / tubo.metrosPorBarra);
  itens.push({
    sku: tubo.sku,
    descricao: tubo.descricao,
    marca: tubo.marca,
    unidade: tubo.unidade,
    quantidade: barrasPrincipal,
    precoUnitario: tubo.precoVenda,
    total: barrasPrincipal * tubo.precoVenda,
    categoria: "TUBO",
  });

  // ── Adutora ────────────────────────────────────────────────────────────────
  const adutoraCoords = mainPipeline.adutora ?? [];
  const comprimentoAdutoraM =
    adutoraCoords.length >= 2
      ? adutoraCoords.slice(1).reduce(
          (sum, pt, i) => sum + lngLatDistM(adutoraCoords[i], pt),
          0,
        )
      : 0;

  if (comprimentoAdutoraM > 0) {
    const barrasAdutora = Math.ceil(comprimentoAdutoraM / tubo.metrosPorBarra);
    itens.push({
      sku: tubo.sku,
      descricao: `${tubo.descricao} (adutora)`,
      marca: tubo.marca,
      unidade: tubo.unidade,
      quantidade: barrasAdutora,
      precoUnitario: tubo.precoVenda,
      total: barrasAdutora * tubo.precoVenda,
      categoria: "TUBO",
    });
  }

  // ── Secundárias / Ramais ───────────────────────────────────────────────────
  const comprimentoSecundariasM = secondaries.reduce((s, r) => s + r.lengthM, 0);
  if (comprimentoSecundariasM > 0) {
    if (sizedSecondaries && sizedSecondaries.length > 0) {
      // P4: agrupar por SKU do tubo selecionado individualmente
      const secBySku = new Map<string, {
        descricao: string; marca: string; unidade: string;
        precoVenda: number; metrosPorBarra: number; comprimentoTotal: number;
      }>();
      for (const sec of sizedSecondaries) {
        const sku = sec.selectedTube.sku;
        const tuboCat = TUBOS_PVC_RIGIDO.find((t) => t.sku === sku);
        if (!tuboCat) continue;
        const entry = secBySku.get(sku) ?? {
          descricao: tuboCat.descricao, marca: tuboCat.marca, unidade: tuboCat.unidade,
          precoVenda: tuboCat.precoVenda, metrosPorBarra: tuboCat.metrosPorBarra,
          comprimentoTotal: 0,
        };
        entry.comprimentoTotal += sec.lengthM;
        secBySku.set(sku, entry);
      }
      for (const [sku, { descricao, marca, unidade, precoVenda, metrosPorBarra, comprimentoTotal }] of secBySku.entries()) {
        const barras = Math.ceil(comprimentoTotal / metrosPorBarra);
        itens.push({
          sku,
          descricao: `${descricao} (ramais)`,
          marca,
          unidade,
          quantidade: barras,
          precoUnitario: precoVenda,
          total: barras * precoVenda,
          categoria: "TUBO",
        });
      }
    } else {
      // Fallback legado: todos os ramais com o tubo da principal
      const barrasSecundarias = Math.ceil(comprimentoSecundariasM / tubo.metrosPorBarra);
      itens.push({
        sku: tubo.sku,
        descricao: `${tubo.descricao} (ramais)`,
        marca: tubo.marca,
        unidade: tubo.unidade,
        quantidade: barrasSecundarias,
        precoUnitario: tubo.precoVenda,
        total: barrasSecundarias * tubo.precoVenda,
        categoria: "TUBO",
      });
    }
  }

  // ── Conexões da principal ──────────────────────────────────────────────────
  const verticesIntermediarios = Math.max(0, mainPipeline.segments - 1);
  const nCurvas = Math.max(2, verticesIntermediarios);
  const curva = selectCurva(tubo.diametroNominalMm);
  itens.push({
    sku: curva.sku,
    descricao: curva.descricao,
    marca: curva.marca,
    unidade: curva.unidade,
    quantidade: nCurvas,
    precoUnitario: curva.precoVenda,
    total: nCurvas * curva.precoVenda,
    categoria: "CONEXAO",
  });

  const te = selectTe(tubo.diametroNominalMm);
  const nTesPrincipal = 1;
  itens.push({
    sku: te.sku,
    descricao: te.descricao,
    marca: te.marca,
    unidade: te.unidade,
    quantidade: nTesPrincipal,
    precoUnitario: te.precoVenda,
    total: nTesPrincipal * te.precoVenda,
    categoria: "CONEXAO",
  });

  // ── Adesivo PVC ────────────────────────────────────────────────────────────
  const totalTubulacaoM = comprimentoPrincipalM + comprimentoAdutoraM + comprimentoSecundariasM + comprimentoLateraisM;
  const nAdesivos = Math.max(1, Math.ceil(totalTubulacaoM / 30));
  itens.push({
    sku: ADESIVO_PVC.sku,
    descricao: ADESIVO_PVC.descricao,
    marca: ADESIVO_PVC.marca,
    unidade: ADESIVO_PVC.unidade,
    quantidade: nAdesivos,
    precoUnitario: ADESIVO_PVC.precoVenda,
    total: nAdesivos * ADESIVO_PVC.precoVenda,
    categoria: "ACESSORIO",
  });

  // ── Estatísticas de distribuição por setor ────────────────────────────────
  const sectCount = sectorization.setoresCount;
  const spPerSector = new Array<number>(sectCount).fill(0);
  for (const s of sectorization.sectorIndices) {
    if (s >= 0 && s < sectCount) spPerSector[s]++;
  }
  const aspMin = Math.min(...spPerSector);
  const aspMax = Math.max(...spPerSector);
  const aspMedia = sprinklers.count / sectCount;
  const vazPorSetor = spPerSector.map((c) => c * vazaoPorAspersorM3h);
  const vMin = Math.min(...vazPorSetor);
  const vMax = Math.max(...vazPorSetor);
  const vMedia = sprinklers.vazaoProjetoM3PorHora / sectCount;
  const desbalPercent = vMedia > 0 ? ((vMax - vMin) / vMedia) * 100 : 0;

  // ── Estatísticas de divisão operacional ──────────────────────────────────
  const splitCols = physicalColumns.filter((c) => c.sectorsTouched.length > 1);
  const physicalColumnsSplitCount = splitCols.length;
  const maxSegmentsPerPhysicalColumn =
    physicalColumns.length > 0
      ? Math.max(...physicalColumns.map((c) => Math.max(1, c.sectorsTouched.length)))
      : 1;
  const splitControlPointsCount = splitCols.reduce(
    (s, c) => s + (c.sectorsTouched.length - 1),
    0,
  );

  // ── TASK-006B: Registros manuais de seção ────────────────────────────────────
  const valvulasCount = constructability.controlPoints.filter(
    (cp) => cp.type === "section_valve",
  ).length;

  // Mapa physicalColumnId → diâmetro lateral (fonte primária) ou ramal (fallback)
  const colDiamMap = new Map<string, number>();
  for (const col of physicalColumns) {
    colDiamMap.set(col.id, col.selecao.tubo.diametroMm);
  }
  if (sizedSecondaries) {
    for (const sec of sizedSecondaries) {
      if (!colDiamMap.has(sec.physicalColumnId)) {
        colDiamMap.set(sec.physicalColumnId, sec.diametroMm);
      }
    }
  }

  // Seleciona registro por diâmetro e agrupa por SKU
  const registroBySkuQty = new Map<string, { registro: RegistroSecao; qty: number }>();
  let valvulasResolvidasCount = 0;

  for (const cp of constructability.controlPoints) {
    if (cp.type !== "section_valve") continue;
    const diamMm = colDiamMap.get(cp.physicalColumnId);
    if (diamMm === undefined) continue;
    const registro = selectRegistroSecao(diamMm);
    if (!registro) continue;
    valvulasResolvidasCount++;
    const entry = registroBySkuQty.get(registro.sku);
    if (entry) {
      entry.qty++;
    } else {
      registroBySkuQty.set(registro.sku, { registro, qty: 1 });
    }
  }

  for (const { registro, qty } of registroBySkuQty.values()) {
    itens.push({
      sku: registro.sku,
      descricao: registro.descricao,
      marca: registro.marca,
      unidade: registro.unidade,
      quantidade: qty,
      precoUnitario: registro.precoVenda,
      total: qty * registro.precoVenda,
      categoria: "CONEXAO",
    });
  }

  const valvulasSemCatalogoCount = valvulasCount - valvulasResolvidasCount;
  const registrosManuaisSecaoCount = valvulasResolvidasCount;

  const totalGeral = itens.reduce((sum, item) => sum + item.total, 0);

  return {
    itens,
    totalGeral,
    laterais,
    meta: {
      diametroPrincipalMm: tubo.diametroNominalMm,
      diametroPrincipalCalculadoMm: diametroCalc,
      barrasDeTubo: barrasPrincipal,
      nCurvas90: nCurvas,
      nTes: nTesPrincipal + tesPorDiam.size,
      nLaterais: laterais.length,
      nColunasLaterais: physicalColumns.length,
      comprimentoLateraisM,
      comprimentoAdutoraM,
      comprimentoSecundariasM,
      aspersoresPorSetorMin: aspMin,
      aspersoresPorSetorMax: aspMax,
      aspersoresPorSetorMedia: aspMedia,
      vazaoPorSetorMin: vMin,
      vazaoPorSetorMax: vMax,
      desbalanceamentoSetoresPercent: desbalPercent,
      tees50Source: "physicalColumns",
      operationalSegmentsCount: physicalColumns.length + splitControlPointsCount,
      physicalColumnsSplitCount,
      maxSegmentsPerPhysicalColumn,
      splitControlPointsCount,
      splitPointsCount: constructability.pendingControlPointsCount,
      unresolvedOperationalSegmentsCount: constructability.pendingControlPointsCount,
      controlPointsCount: constructability.controlPointsCount,
      pendingControlPointsCount: constructability.pendingControlPointsCount,
      independentFeedRequiredCount: constructability.independentFeedRequiredCount,
      constructabilityStatus: constructability.constructabilityStatus,
      valvulasCount,
      valvulasResolvidasCount,
      valvulasSemCatalogoCount,
      registrosManuaisSecaoCount,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnóstico de proposta
// ─────────────────────────────────────────────────────────────────────────────

export interface ProposalDiagnostics {
  areaHa: number | undefined;
  sprinklersCount: number;
  spacingMeters: number;
  physicalColumnsCount: number;
  avgSprinklersPerPhysicalColumn: number;
  sectorsCount: number;
  sprinklersPerSectorMin: number;
  sprinklersPerSectorMax: number;
  vazaoPorSetorMin: number;
  vazaoPorSetorMax: number;
  vazaoPorSetorAvg: number;
  desbalanceamentoSetoresPercent: number;
  maxMinRatio: number;
  lateralLengthM: number;
  principalLengthM: number;
  adutoraLengthM: number;
  secundariasLengthM: number;
  principalBars: number;
  adutoraBars: number;
  tees50Count: number;
  tees50Source: "physicalColumns" | "operationalLaterals" | "unknown";
  operationalSegmentsCount: number;
  physicalColumnsSplitCount: number;
  maxSegmentsPerPhysicalColumn: number;
  avgSegmentsPerPhysicalColumn: number;
  splitControlPointsCount: number;
  pendingControlConnections: number;
  constructabilityStatus: ConstructabilityStatus;
  controlPointsCount: number;
  pendingControlPointsCount: number;
  independentFeedRequiredCount: number;
  warnings: string[];
  blockers: string[];
  hydraulicSolverStatus: HydraulicSolverStatus;
  pumpValidationStatus: PumpValidationStatus;
  hydraulicModelLimitations: HydraulicModelLimitations | null;
}

export function generateProposalDiagnostics(
  layout: ProjectLayout,
  bom: BOMResult,
  hydraulics?: HydraulicSizingReport | null,
): ProposalDiagnostics {
  const physCols = bom.meta.nColunasLaterais;
  const nLaterais = bom.meta.nLaterais;

  const totalTees = bom.itens
    .filter((i) => i.categoria === "CONEXAO" && i.descricao.toLowerCase().startsWith("tê pvc lf"))
    .reduce((s, i) => s + i.quantidade, 0);

  const tees50Source: ProposalDiagnostics["tees50Source"] =
    totalTees === physCols
      ? "physicalColumns"
      : totalTees === nLaterais
        ? "operationalLaterals"
        : "unknown";

  const adutoraItem = bom.itens.find(
    (i) => i.categoria === "TUBO" && i.descricao.toLowerCase().includes("adutora"),
  );
  const adutoraBars = adutoraItem?.quantidade ?? 0;

  const warnings: string[] = [];
  const blockers: string[] = [];

  const { physicalColumnsSplitCount, splitControlPointsCount, maxSegmentsPerPhysicalColumn } =
    bom.meta;
  const avgSegmentsPerPhysicalColumn =
    physCols > 0 ? bom.meta.operationalSegmentsCount / physCols : 1;

  const vAvg =
    layout.sprinklers && layout.sectorization
      ? bom.meta.aspersoresPorSetorMedia *
        (layout.sprinklers.vazaoProjetoM3PorHora / layout.sprinklers.count)
      : 0;
  const maxMinRatio =
    vAvg > 0 ? bom.meta.vazaoPorSetorMax / Math.max(bom.meta.vazaoPorSetorMin, 0.001) : 1;

  if (physicalColumnsSplitCount > 0) {
    warnings.push(
      `Há ${physicalColumnsSplitCount} lateral${physicalColumnsSplitCount > 1 ? "is" : ""} ` +
      `física${physicalColumnsSplitCount > 1 ? "s" : ""} dividida${physicalColumnsSplitCount > 1 ? "s" : ""} ` +
      `entre setores (${splitControlPointsCount} ponto${splitControlPointsCount > 1 ? "s" : ""} de controle). ` +
      `Validar necessidade de válvula ou interrupção operacional.`,
    );
  }

  if (bom.meta.desbalanceamentoSetoresPercent > 10) {
    warnings.push(
      `Desbalanceamento de vazão entre setores: ` +
      `${bom.meta.desbalanceamentoSetoresPercent.toFixed(1)}% ` +
      `(min ${bom.meta.vazaoPorSetorMin.toFixed(1)} — ` +
      `máx ${bom.meta.vazaoPorSetorMax.toFixed(1)} m³/h, limite: 10%). ` +
      `Revisar setorização.`,
    );
  }

  if (maxMinRatio > 1.25) {
    warnings.push(
      `Razão máx/mín de vazão entre setores: ${maxMinRatio.toFixed(2)} ` +
      `(acima de 1,25 — risco de subdimensionamento operacional).`,
    );
  }

  if (hydraulics && hydraulics.sizedSecondaries.length > 0) {
    const violated = hydraulics.sizedSecondaries.filter(
      (s) => s.velocityExceeds || s.headLossExceeds,
    );
    if (violated.length > 0) {
      const velN = violated.filter((s) => s.velocityExceeds).length;
      const hfN  = violated.filter((s) => s.headLossExceeds).length;
      const parts: string[] = [];
      if (velN > 0) parts.push(`${velN} com velocidade acima de 1,5 m/s`);
      if (hfN  > 0) parts.push(`${hfN} com perda > 10 % da pressão de serviço`);
      warnings.push(
        `${violated.length} ramal(is) fora dos limites de dimensionamento: ${parts.join("; ")}. ` +
        "Avaliar reposicionamento da principal ou redução do comprimento de ramal.",
      );
    }
  }

  if (hydraulics?.validation.hasPressureClassViolations) {
    blockers.push(
      "Pressão operacional excede o PN do tubo em um ou mais trechos (violação confirmada). " +
      "Substituir tubo por classe de pressão superior antes da emissão.",
    );
  }

  if (hydraulics?.validation.hasConservativePressureClassWarnings) {
    warnings.push(
      "Pressão máxima conservadora (HMT) pode exceder o PN em um ou mais trechos de ramal/lateral. " +
      "Validar pressão real no ponto de derivação antes da emissão.",
    );
  }

  if (hydraulics?.hydraulicSolverStatus === "blocked") {
    if (hydraulics.pumpValidation.status === "pump_insufficient_flow") {
      blockers.push(
        `Bomba insuficiente em vazão: ${hydraulics.pumpValidation.pump!.vazaoMaxM3h.toFixed(1)} m³/h ` +
        `< setor crítico ${hydraulics.pumpValidation.designFlowM3h.toFixed(1)} m³/h. ` +
        "Substituir bomba antes da emissão.",
      );
    } else if (hydraulics.pumpValidation.status === "pump_insufficient_head") {
      blockers.push(
        `Bomba insuficiente em HMT: ${hydraulics.pumpValidation.pump!.hmtMca.toFixed(1)} mca ` +
        `< HMT mínima ${hydraulics.pumpValidation.requiredHMT.toFixed(1)} mca. ` +
        "Substituir bomba antes da emissão.",
      );
    } else {
      blockers.push(
        "Solver hidráulico: segmentos com velocidade ou perda de carga inválidos. " +
        "Revisar dimensionamento antes da emissão.",
      );
    }
  } else if (hydraulics?.hydraulicSolverStatus === "calculated_pending_review") {
    warnings.push(
      `HMT mínima calculada: ${hydraulics.hmt.totalHMT.toFixed(1)} mca. ` +
      "Bomba não informada — selecionar e validar contra curva Q-H antes da emissão.",
    );
  }

  if (physicalColumnsSplitCount > 0) {
    warnings.push(
      "Setorização operacional com divisão de laterais físicas. " +
      "Controle hidráulico nos pontos de corte ainda sem modelagem de válvulas na BOM.",
    );
  }

  const { pendingControlPointsCount, independentFeedRequiredCount, constructabilityStatus } =
    bom.meta;
  if (pendingControlPointsCount > 0) {
    warnings.push(
      `Existem ${pendingControlPointsCount} ponto${pendingControlPointsCount > 1 ? "s" : ""} de controle ` +
      `pendente${pendingControlPointsCount > 1 ? "s" : ""} de validação. ` +
      `A proposta deve ser revisada tecnicamente antes da emissão final.`,
    );
  }

  if (independentFeedRequiredCount > 0) {
    blockers.push(
      `Existem ${independentFeedRequiredCount} trecho${independentFeedRequiredCount > 1 ? "s" : ""} operacional${independentFeedRequiredCount > 1 ? "is" : ""} ` +
      `sem alimentação física modelada (independent_feed_required). ` +
      `Exige ramal próprio, válvula de alimentação independente ou redesenho da setorização.`,
    );
  }

  // ── TASK-006B: Registros manuais de seção ────────────────────────────────────
  const { valvulasSemCatalogoCount, valvulasResolvidasCount } = bom.meta;
  if (valvulasResolvidasCount > 0) {
    warnings.push(
      `Registros manuais de seção incluídos na BOM. Controle automático não contemplado.`,
    );
  }
  if (valvulasSemCatalogoCount > 0) {
    blockers.push(
      `Existem ${valvulasSemCatalogoCount} válvula${valvulasSemCatalogoCount > 1 ? "s" : ""}/registro${valvulasSemCatalogoCount > 1 ? "s" : ""} de seção sem SKU compatível no catálogo. ` +
      `A proposta final não deve ser emitida até inclusão manual ou homologação.`,
    );
  }

  if (tees50Source === "operationalLaterals") {
    warnings.push(
      `Tê derivação lateral (${totalTees} un) = nLaterais (${nLaterais}), não nColunasFísicas (${physCols}). ` +
      `Corrija a origem do Tê na BOM — deve ser derivado de physicalCols.`,
    );
  }

  if (bom.meta.comprimentoSecundariasM > 0 && !bom.itens.some((i) => i.descricao.includes("ramais"))) {
    blockers.push(
      "Comprimento de ramais/secundárias não contabilizado na BOM. " +
      "Regenere a proposta ou atualize o schema.",
    );
  }

  const maxEsperado = physCols * (layout.sectorization?.setoresCount ?? 1);
  if (nLaterais > maxEsperado) {
    blockers.push(
      `nLaterais (${nLaterais}) > nColunasFísicas × setores ` +
      `(${physCols} × ${layout.sectorization?.setoresCount} = ${maxEsperado}). ` +
      `Provável fragmentação na setorização.`,
    );
  }

  return {
    areaHa: layout.areaHectares,
    sprinklersCount: layout.sprinklers?.count ?? 0,
    spacingMeters: layout.sprinklers?.espacamentoM ?? 0,
    physicalColumnsCount: physCols,
    avgSprinklersPerPhysicalColumn: physCols > 0 ? (layout.sprinklers?.count ?? 0) / physCols : 0,
    sectorsCount: layout.sectorization?.setoresCount ?? 0,
    sprinklersPerSectorMin: bom.meta.aspersoresPorSetorMin,
    sprinklersPerSectorMax: bom.meta.aspersoresPorSetorMax,
    vazaoPorSetorMin: bom.meta.vazaoPorSetorMin,
    vazaoPorSetorMax: bom.meta.vazaoPorSetorMax,
    vazaoPorSetorAvg: vAvg,
    desbalanceamentoSetoresPercent: bom.meta.desbalanceamentoSetoresPercent,
    maxMinRatio,
    lateralLengthM: bom.meta.comprimentoLateraisM,
    principalLengthM: layout.mainPipeline?.lengthMeters ?? 0,
    adutoraLengthM: bom.meta.comprimentoAdutoraM,
    secundariasLengthM: bom.meta.comprimentoSecundariasM,
    principalBars: bom.meta.barrasDeTubo,
    adutoraBars,
    tees50Count: totalTees,
    tees50Source,
    operationalSegmentsCount: bom.meta.operationalSegmentsCount,
    physicalColumnsSplitCount,
    maxSegmentsPerPhysicalColumn,
    avgSegmentsPerPhysicalColumn,
    splitControlPointsCount,
    pendingControlConnections: splitControlPointsCount,
    constructabilityStatus,
    controlPointsCount: bom.meta.controlPointsCount,
    pendingControlPointsCount,
    independentFeedRequiredCount,
    warnings,
    blockers,
    hydraulicSolverStatus: hydraulics?.hydraulicSolverStatus ?? "not_calculated",
    pumpValidationStatus: hydraulics?.pumpValidation.status ?? "not_informed",
    hydraulicModelLimitations: hydraulics?.modelLimitations ?? null,
  };
}
