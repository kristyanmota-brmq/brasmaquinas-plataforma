import {
  ASPERSOR_PADRAO,
  getAspersorBySku,
  ADESIVO_PVC,
  TUBOS_PVC_LF,
  TUBOS_PVC_RIGIDO,
  CURVAS_90,
  CURVAS_90_RIGIDAS,
  TES,
  TES_DERIVACAO_LATERAL,
  TE_REDUCAO_TELESCOPIA_75_50,
  selectTubo,
  selectCurva,
  selectTe,
  calculatePipelineDiameterMm,
  selectRegistroSecao,
  selectKitAspersor5022,
  type RegistroSecao,
  type KitAspersor5022Item,
} from "@/lib/catalog/aspersores";
import {
  countAdutoraBends,
  countFishboneConnections,
  countLateralBends90,
  type FishboneConnectionFamily,
  countSecondaryLBends,
} from "@/lib/layout/physical-connections";
import { type AgronomyReport } from "@/lib/layout/agronomy";
import {
  generateLateraisLegacyForDebug,
  generatePhysicalColumns,
  TOLERANCIA_ASPERSOR_EIXO_LATERAL,
  type AxisDeviationReport,
  type Lateral,
  type LateralCapacityReport,
  type PhysicalColumn,
} from "@/lib/layout/laterais";
import {
  type ConstructabilityReport,
  type ConstructabilityStatus,
  buildConstructabilityReport,
} from "@/lib/layout/constructability";
import type { SecondaryPipe } from "@/lib/layout/hydraulic-connectivity";
import type { SizedSecondaryPipe } from "@/lib/layout/secondary-sizing";
import type { NetworkAngleReport } from "@/lib/layout/network-angle-diagnostics";
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
  /** TASK-073: custo de aquisição unitário (uso interno — margem). */
  custoUnitario?: number;
  total: number;
  categoria: "ASPERSOR" | "TUBO" | "CONEXAO" | "ACESSORIO";
}

/**
 * Conexão física necessária para a rede, mas sem SKU/custo homologado no catálogo.
 * Não entra em `BOMResult.itens` nem em `totalGeral`.
 * Gera blocker comercial "BOM incompleta" em generateProposalDiagnostics.
 */
export interface BOMPendingConnection {
  tipo:
    | "tee_90_aspersor_lateral"
    | "curva_90_ramal_l"
    | "curva_90_adutora"
    | "curva_45_adutora"
    | "curva_90_lateral"
    | "te_principal_spine_entry"
    | "juncao_spine_entry_spine"
    | "te_spine_rib";
  descricao: string;
  /** DN em mm; 0 quando indeterminado. */
  dnMm: number;
  quantidade: number;
  motivoPendencia:
    | "sku_nao_catalogado"
    | "dn_indeterminado"
    | "criterio_contagem_nao_definido";
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
    /** TASK-022: conexões físicas necessárias sem SKU/custo homologado. */
    conexoesFisicasPendentes: BOMPendingConnection[];
    /** TASK-022: soma das quantidades de todas as conexões pendentes. */
    conexoesFisicasSemSkuCount: number;
    /** TASK-022: curvas 90° de ramais em L adicionadas à BOM (itens precificados). */
    curvas90RamaisLCount: number;
    /** TASK-022: curvas 90° da adutora adicionadas à BOM (itens precificados). */
    curvas90AdutoraCount: number;
    /** TASK-022: curvas 45° da adutora (sem SKU — entram em conexoesFisicasPendentes). */
    curvas45AdutoraCount: number;
    /** TASK-035: curvas 90° de laterais físicas com SKU LF homologado (item precificado). */
    curvas90LateraisCount: number;
    /** TASK-035: curvas 90° de laterais sem SKU LF homologado (DN50 hoje — pendência). */
    curvas90LateraisSemSkuCount: number;
    /** TASK-023: aspersores cujo kit foi resolvido (lateral DN50 ou DN75). */
    kitAspersorResolvCount: number;
    /** TASK-023: aspersores em lateral com DN não homologado para kit 5022 (gera blocker). */
    kitAspersorDnNaoHomologadoCount: number;
    /** TASK-054: tês principal→spine_entry precificados (topologia v12 fishbone). */
    tesPrincipalSpineEntryCount: number;
    /** TASK-054: junções spine_entry→spine precificadas (topologia v12 fishbone). */
    juncoesSpineEntrySpineCount: number;
    /** TASK-054: tês spine→rib precificados (topologia v12 fishbone). */
    tesSpineRibCount: number;
    /** TASK-054: conexões fishbone sem SKU/DN (subconjunto de conexoesFisicasPendentes). */
    conexoesFishbonePendentesCount: number;
    /** TASK-073 (E08): custo total de aquisição (uso interno). */
    custoTotalAquisicaoR$: number;
    /** TASK-073 (E08): margem bruta = totalGeral − custo (uso interno). */
    margemBrutaR$: number;
    /** TASK-074: colunas com lateral telescopada 75→50. */
    colunasTelescopadasCount: number;
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
    /** TASK-064: SKU do aspersor do projeto. Ausente → ASPERSOR_PADRAO (5022). */
    aspersorSku?: string;
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
  /** TASK-022: necessário para calcular dobras na adutora. Opcional — sem centroid, adutora é ignorada. */
  centroid?: { lat: number; lng: number };
  /**
   * TASK-085R (RT rev.2): HMT requerida (mca) — quando presente, a classe de
   * pressão da principal/adutora é CALCULADA (menor classe que cobre a HMT).
   */
  hmtMca?: number;
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
  // TASK-064: aspersor do projeto (fallback 5022 preserva legado)
  const aspersorDoProjeto = getAspersorBySku(sprinklers.aspersorSku);
  itens.push({
    sku: aspersorDoProjeto.sku,
    descricao: aspersorDoProjeto.descricao,
    marca: aspersorDoProjeto.marca,
    unidade: aspersorDoProjeto.unidade,
    quantidade: sprinklers.count,
    precoUnitario: aspersorDoProjeto.precoVenda,
      custoUnitario: aspersorDoProjeto.custo,
    total: sprinklers.count * aspersorDoProjeto.precoVenda,
    categoria: "ASPERSOR",
  });

  // Tubo de subida (riser) — substituído pelo kit por DN da lateral (TASK-023).
  // A emissão dos itens de kit ocorre na seção C, após iterar physicalColumns.

  // ── Laterais — comprimento por coluna FÍSICA (não por trecho operacional) ──
  type TuboLFEntry = (typeof TUBOS_PVC_LF)[number];
  const lateraisPorSku = new Map<string, { tubo: TuboLFEntry; comprimentoTotal: number }>();
  // TASK-074: telescopia 75→50 — cabeceira e cauda agrupadas em SKUs próprios;
  // 1 tê de redução soldável 75×50 por coluna telescopada (na quebra).
  let colunasTelescopadasCount = 0;
  const addLateralLen = (sku: string, lenM: number) => {
    const tuboCat = TUBOS_PVC_LF.find((t) => t.sku === sku);
    if (!tuboCat) return;
    const entry = lateraisPorSku.get(sku) ?? { tubo: tuboCat, comprimentoTotal: 0 };
    entry.comprimentoTotal += lenM;
    lateraisPorSku.set(sku, entry);
  };
  for (const col of physicalColumns) {
    const tel = col.selecao.telescopia;
    if (tel) {
      colunasTelescopadasCount++;
      addLateralLen(col.selecao.tubo.sku, tel.comprimentoCabeceiraM);
      addLateralLen(tel.tuboCauda.sku, tel.comprimentoCaudaM);
    } else {
      addLateralLen(col.selecao.tubo.sku, col.comprimentoM);
    }
  }
  if (colunasTelescopadasCount > 0) {
    itens.push({
      sku: TE_REDUCAO_TELESCOPIA_75_50.sku,
      descricao: `${TE_REDUCAO_TELESCOPIA_75_50.descricao} (transição da lateral telescopada)`,
      marca: TE_REDUCAO_TELESCOPIA_75_50.marca,
      unidade: TE_REDUCAO_TELESCOPIA_75_50.unidade,
      quantidade: colunasTelescopadasCount,
      precoUnitario: TE_REDUCAO_TELESCOPIA_75_50.precoVenda,
      custoUnitario: TE_REDUCAO_TELESCOPIA_75_50.custo,
      total: colunasTelescopadasCount * TE_REDUCAO_TELESCOPIA_75_50.precoVenda,
      categoria: "CONEXAO",
    });
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
      custoUnitario: tubo.custo,
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
      custoUnitario: teCat.custo,
      total: qtd * teCat.precoVenda,
      categoria: "CONEXAO",
    });
  }

  // ── Tubulação principal ────────────────────────────────────────────────────
  const diametroCalc = calculatePipelineDiameterMm(sectorization.vazaoPorSetorM3PorHora);
  const tubo = selectTubo(sectorization.vazaoPorSetorM3PorHora, input.hmtMca);

  const comprimentoPrincipalM = mainPipeline.lengthMeters;
  const barrasPrincipal = Math.ceil(comprimentoPrincipalM / tubo.metrosPorBarra);
  itens.push({
    sku: tubo.sku,
    descricao: tubo.descricao,
    marca: tubo.marca,
    unidade: tubo.unidade,
    quantidade: barrasPrincipal,
    precoUnitario: tubo.precoVenda,
      custoUnitario: tubo.custo,
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
      custoUnitario: tubo.custo,
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
        // TASK-075: rib de 0 m (spine na mediana cruza a lateral → tê direto) não é
        // material — sem este skip a BOM emitia item de tubo com quantidade 0.
        if (sec.lengthM < 0.01) continue;
        const sku = sec.selectedTube.sku;
        // TASK-084: rede secundária PN40 — SKUs vêm da família LF
        const tuboCat = [...TUBOS_PVC_LF, ...TUBOS_PVC_RIGIDO].find((t) => t.sku === sku);
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
          descricao: `${descricao} (secundárias)`,
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
        descricao: `${tubo.descricao} (secundárias)`,
        marca: tubo.marca,
        unidade: tubo.unidade,
        quantidade: barrasSecundarias,
        precoUnitario: tubo.precoVenda,
      custoUnitario: tubo.custo,
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
      custoUnitario: curva.custo,
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
      custoUnitario: te.custo,
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
      custoUnitario: ADESIVO_PVC.custo,
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
      custoUnitario: registro.custo,
      total: qty * registro.precoVenda,
      categoria: "CONEXAO",
    });
  }

  const valvulasSemCatalogoCount = valvulasCount - valvulasResolvidasCount;
  const registrosManuaisSecaoCount = valvulasResolvidasCount;

  // ── TASK-022: Conexões físicas construtíveis ──────────────────────────────
  const conexoesFisicasPendentes: BOMPendingConnection[] = [];
  let curvas90RamaisLCount = 0;
  let curvas90AdutoraCount = 0;
  let curvas45AdutoraCount = 0;

  // A. Curvas 90° em ramais em L
  const lBends = countSecondaryLBends(secondaries, sizedSecondaries);

  for (const [dn, qty] of lBends.byDnMm.entries()) {
    const curva = CURVAS_90_RIGIDAS.find((c) => c.diametroMm === dn);
    if (curva) {
      curvas90RamaisLCount += qty;
      itens.push({
        sku: curva.sku,
        descricao: `${curva.descricao} (secundárias em L)`,
        marca: curva.marca,
        unidade: curva.unidade,
        quantidade: qty,
        precoUnitario: curva.precoVenda,
      custoUnitario: curva.custo,
        total: qty * curva.precoVenda,
        categoria: "CONEXAO",
      });
    } else {
      // SKU não encontrado para esse DN — item pendente
      conexoesFisicasPendentes.push({
        tipo: "curva_90_ramal_l",
        descricao: `Curva 90° PVC rígido Ø${dn}mm (ramal em L)`,
        dnMm: dn,
        quantidade: qty,
        motivoPendencia: "sku_nao_catalogado",
      });
    }
  }

  if (lBends.indeterminate > 0) {
    conexoesFisicasPendentes.push({
      tipo: "curva_90_ramal_l",
      descricao: "Curva 90° ramal em L (DN indeterminado — sizedSecondaries ausente)",
      dnMm: 0,
      quantidade: lBends.indeterminate,
      motivoPendencia: "dn_indeterminado",
    });
  }

  // A2. TASK-054: conexões da topologia v12 espinha de peixe (fishbone).
  // Só ativa quando há secundárias com `kind` (spine/spine_entry/rib) — caminho
  // legado (`kind: undefined`) preservado byte-a-byte (countFishboneConnections
  // retorna famílias vazias para secundárias legadas).
  // DN exato no catálogo → item precificado; sem SKU exato → pendência (nunca
  // fallback silencioso para SKU de outro DN).
  let tesPrincipalSpineEntryCount = 0;
  let juncoesSpineEntrySpineCount = 0;
  let tesSpineRibCount = 0;
  let conexoesFishbonePendentesCount = 0;

  if (secondaries.some((s) => s.kind != null)) {
    const fishbone = countFishboneConnections(secondaries, sizedSecondaries);

    const emitFishboneFamily = (
      family: FishboneConnectionFamily,
      tipo: BOMPendingConnection["tipo"],
      label: string,
    ): number => {
      let priced = 0;
      for (const [dn, qty] of family.byDnMm.entries()) {
        // TASK-062: resolução por DN exato em DUAS famílias — primeiro os tês LF
        // de derivação lateral (DN 50/75/100, linha LF dos ribs), com fallback
        // para a família TES soldável irrigação (DN 75/100/125/150 — inclui os
        // PN80 de 125/150 usados em spine/spine_entry da linha rígida).
        // Nunca aproxima DN: sem match exato → pendência.
        const teCat =
          TES_DERIVACAO_LATERAL.find((t) => t.diametroMm === dn) ??
          TES.find((t) => t.diametroMm === dn);
        if (teCat) {
          priced += qty;
          itens.push({
            sku: teCat.sku,
            descricao: `${teCat.descricao} (${label})`,
            marca: teCat.marca,
            unidade: teCat.unidade,
            quantidade: qty,
            precoUnitario: teCat.precoVenda,
      custoUnitario: teCat.custo,
            total: qty * teCat.precoVenda,
            categoria: "CONEXAO",
          });
        } else {
          conexoesFishbonePendentesCount += qty;
          conexoesFisicasPendentes.push({
            tipo,
            descricao: `Tê PVC Ø${dn}mm (${label})`,
            dnMm: dn,
            quantidade: qty,
            motivoPendencia: "sku_nao_catalogado",
          });
        }
      }
      if (family.indeterminate > 0) {
        conexoesFishbonePendentesCount += family.indeterminate;
        conexoesFisicasPendentes.push({
          tipo,
          descricao: `Tê ${label} (DN indeterminado — sizedSecondaries ausente)`,
          dnMm: 0,
          quantidade: family.indeterminate,
          motivoPendencia: "dn_indeterminado",
        });
      }
      return priced;
    };

    tesPrincipalSpineEntryCount = emitFishboneFamily(
      fishbone.tesPrincipalSpineEntry,
      "te_principal_spine_entry",
      "derivação principal→entrada do sub-coletor",
    );
    juncoesSpineEntrySpineCount = emitFishboneFamily(
      fishbone.juncoesSpineEntrySpine,
      "juncao_spine_entry_spine",
      "junção entrada→sub-coletor",
    );
    tesSpineRibCount = emitFishboneFamily(
      fishbone.tesSpineRib,
      "te_spine_rib",
      "derivação sub-coletor→rib",
    );
  }

  // B. Curvas 90° e 45° na adutora
  if (input.centroid && adutoraCoords.length >= 3) {
    const adutoraBends = countAdutoraBends(adutoraCoords, input.centroid);
    const dnAdutora = tubo.diametroNominalMm;

    if (adutoraBends.curvas90Count > 0) {
      const curva = CURVAS_90_RIGIDAS.find((c) => c.diametroMm === dnAdutora);
      if (curva) {
        curvas90AdutoraCount = adutoraBends.curvas90Count;
        itens.push({
          sku: curva.sku,
          descricao: `${curva.descricao} (adutora)`,
          marca: curva.marca,
          unidade: curva.unidade,
          quantidade: adutoraBends.curvas90Count,
          precoUnitario: curva.precoVenda,
      custoUnitario: curva.custo,
          total: adutoraBends.curvas90Count * curva.precoVenda,
          categoria: "CONEXAO",
        });
      } else {
        conexoesFisicasPendentes.push({
          tipo: "curva_90_adutora",
          descricao: `Curva 90° PVC rígido Ø${dnAdutora}mm (adutora)`,
          dnMm: dnAdutora,
          quantidade: adutoraBends.curvas90Count,
          motivoPendencia: "sku_nao_catalogado",
        });
      }
    }

    if (adutoraBends.curvas45Count > 0) {
      curvas45AdutoraCount = adutoraBends.curvas45Count;
      conexoesFisicasPendentes.push({
        tipo: "curva_45_adutora",
        descricao: `Curva 45° PVC rígido Ø${dnAdutora}mm (adutora)`,
        dnMm: dnAdutora,
        quantidade: adutoraBends.curvas45Count,
        motivoPendencia: "sku_nao_catalogado",
      });
    }
  }

  // ── TASK-035: Curvas 90° em laterais físicas (sub-laterais) ─────────────────
  // Fonte de verdade: PhysicalColumn.routeCoords (uma coluna física = uma vala).
  // Pós-TASK-045B/TASK-046, routeCoords é reta de 2 pontos no caminho feliz
  // → byDnMm vazio → 0 curvas adicionadas. Detecção é defensiva para o caso de
  // alguma sub-rota futura introduzir vértice intermediário real.
  // Catálogo: apenas CURVAS_90 (família LF). CURVAS_90_RIGIDAS não é usado em
  // lateral LF — mistura de famílias/classes de pressão sem homologação RT.
  const lateralBends = countLateralBends90(
    physicalColumns,
    input.centroid ?? { lat: 0, lng: 0 },
  );
  let curvas90LateraisCount = 0;
  let curvas90LateraisSemSkuCount = 0;

  for (const [dn, qty] of lateralBends.byDnMm.entries()) {
    const curvaLF = CURVAS_90.find((c) => c.diametroMm === dn);
    if (curvaLF) {
      curvas90LateraisCount += qty;
      itens.push({
        sku: curvaLF.sku,
        descricao: `${curvaLF.descricao} (laterais)`,
        marca: curvaLF.marca,
        unidade: curvaLF.unidade,
        quantidade: qty,
        precoUnitario: curvaLF.precoVenda,
      custoUnitario: curvaLF.custo,
        total: qty * curvaLF.precoVenda,
        categoria: "CONEXAO",
      });
    } else {
      curvas90LateraisSemSkuCount += qty;
      conexoesFisicasPendentes.push({
        tipo: "curva_90_lateral",
        descricao: `Curva 90° PVC LF Ø${dn}mm (lateral)`,
        dnMm: dn,
        quantidade: qty,
        motivoPendencia: "sku_nao_catalogado",
      });
    }
  }

  if (lateralBends.indeterminate > 0) {
    curvas90LateraisSemSkuCount += lateralBends.indeterminate;
    conexoesFisicasPendentes.push({
      tipo: "curva_90_lateral",
      descricao: "Curva 90° lateral (DN indeterminado)",
      dnMm: 0,
      quantidade: lateralBends.indeterminate,
      motivoPendencia: "dn_indeterminado",
    });
  }

  // C. Kit de ligação do aspersor 5022 por DN da lateral (TASK-023)
  // DN50 e DN75: kit homologado → itens precificados agrupados por SKU.
  // Outros DNs: sem kit → blocker via kitAspersorDnNaoHomologadoCount.
  let kitAspersorResolvCount = 0;
  let kitAspersorDnNaoHomologadoCount = 0;
  const kitBySku = new Map<string, { item: KitAspersor5022Item; quantidade: number }>();

  // TASK-074: coluna telescopada divide o kit por DN (cabeceira DN75 / cauda DN50 —
  // o tee de derivação do riser acompanha o DN do trecho onde o aspersor está).
  const addKit = (dn: number, count: number) => {
    if (count <= 0) return;
    const kit = selectKitAspersor5022(dn);
    if (kit) {
      kitAspersorResolvCount += count;
      for (const item of kit) {
        const entry = kitBySku.get(item.sku);
        if (entry) entry.quantidade += count;
        else kitBySku.set(item.sku, { item, quantidade: count });
      }
    } else {
      kitAspersorDnNaoHomologadoCount += count;
    }
  };
  for (const col of physicalColumns) {
    const tel = col.selecao.telescopia;
    if (tel) {
      addKit(col.selecao.tubo.diametroMm, tel.sprinklersCabeceira);
      addKit(tel.tuboCauda.diametroMm, tel.sprinklersCauda);
    } else {
      addKit(col.selecao.tubo.diametroMm, col.sprinklerCount);
    }
  }

  for (const { item, quantidade } of kitBySku.values()) {
    itens.push({
      sku: item.sku,
      descricao: item.descricao,
      marca: item.marca,
      unidade: item.unidade,
      quantidade,
      precoUnitario: item.precoVenda,
      custoUnitario: item.custo,
      total: quantidade * item.precoVenda,
      categoria: "CONEXAO",
    });
  }

  const conexoesFisicasSemSkuCount = conexoesFisicasPendentes.reduce(
    (sum, c) => sum + c.quantidade,
    0,
  );

  const totalGeral = itens.reduce((sum, item) => sum + item.total, 0);
  // TASK-073 (E08): custo total de aquisição e margem bruta — uso INTERNO
  // (sidebar do vendedor); nunca renderizado no PDF do cliente.
  const custoTotalAquisicao = itens.reduce((sum, item) => sum + (item.custoUnitario ?? 0) * item.quantidade, 0);

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
      conexoesFisicasPendentes,
      conexoesFisicasSemSkuCount,
      curvas90RamaisLCount,
      curvas90AdutoraCount,
      curvas45AdutoraCount,
      curvas90LateraisCount,
      curvas90LateraisSemSkuCount,
      kitAspersorResolvCount,
      kitAspersorDnNaoHomologadoCount,
      tesPrincipalSpineEntryCount,
      juncoesSpineEntrySpineCount,
      tesSpineRibCount,
      conexoesFishbonePendentesCount,
      custoTotalAquisicaoR$: custoTotalAquisicao,
      margemBrutaR$: totalGeral - custoTotalAquisicao,
      colunasTelescopadasCount,
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
  networkAngleReport?: NetworkAngleReport | null,
  axisDeviationReport?: AxisDeviationReport | null,
  lateralCapacityReport?: LateralCapacityReport | null,
  agronomyReport?: AgronomyReport | null,
): ProposalDiagnostics {
  const physCols = bom.meta.nColunasLaterais;
  const nLaterais = bom.meta.nLaterais;

  // TASK-054: tês fishbone (sub-coletor) usam os mesmos SKUs TES_DERIVACAO_LATERAL
  // mas têm semântica e contadores próprios (meta.tes*Count) — excluídos aqui para
  // preservar a semântica original de tees50Count (tês de derivação lateral, 1/coluna)
  // e o heurístico tees50Source (comparação com physicalColumns).
  const totalTees = bom.itens
    .filter(
      (i) =>
        i.categoria === "CONEXAO" &&
        i.descricao.toLowerCase().startsWith("tê pvc lf") &&
        !i.descricao.includes("sub-coletor"),
    )
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

  // TASK-059: avisos agronômicos (diagnóstico-only — nunca blockers).
  if (agronomyReport) {
    warnings.push(...agronomyReport.warnings);
  }

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

  // Blockers de construtibilidade angular — gerados por detectNetworkAngleIssues.
  // Cada issue representa uma conexão com ângulo fora de 45°/90°/180°.
  if (networkAngleReport && networkAngleReport.hasBlockers) {
    const byType = new Map<string, number>();
    for (const issue of networkAngleReport.issues) {
      byType.set(issue.elementType, (byType.get(issue.elementType) ?? 0) + 1);
    }
    const summary = [...byType.entries()]
      .map(([t, n]) => `${n} em ${t}`)
      .join(", ");
    blockers.push(
      `Construtibilidade angular: ${networkAngleReport.issues.length} conexão(ões) com ângulo ` +
      `fora de 45°/90°/180° (${summary}). Nenhuma conexão padrão disponível. ` +
      `Corrija o traçado da rede antes de emitir proposta.`,
    );
  }

  // Blockers de desvio aspersor → eixo da lateral física.
  // Regra operacional Brasmáquinas: a vala da lateral e o ponto do aspersor são
  // a mesma execução física. Aspersor fora do eixo invalida o projeto construtivo.
  if (axisDeviationReport && axisDeviationReport.violations.length > 0) {
    const n = axisDeviationReport.violations.length;
    const maxM = axisDeviationReport.maxDeviationM.toFixed(2);
    blockers.push(
      `Aspersor fora do eixo da lateral física: ${n} lateral(is) com desvio acima de ` +
      `${TOLERANCIA_ASPERSOR_EIXO_LATERAL} m (máx: ${maxM} m). ` +
      `O aspersor deve estar sobre a rede lateral, pois a vala da lateral é a mesma do aspersor.`,
    );
  }

  // ── TASK-031: Blocker técnico — lateral hidraulicamente insuficiente no
  // subset homologado DN50/DN75 do aspersor 5022. Quando o seletor escolheu
  // o maior DN homologado (DN75) mas perda ou velocidade excede limites, este
  // blocker informa a capacidade insuficiente e propõe ações operacionais.
  if (lateralCapacityReport && lateralCapacityReport.violations.length > 0) {
    const n = lateralCapacityReport.violations.length;
    const maxHf = lateralCapacityReport.maxHfM.toFixed(2);
    const maxVel = lateralCapacityReport.maxVelMs.toFixed(2);
    blockers.push(
      `Lateral hidraulicamente insuficiente para o aspersor 5022: o maior DN homologado para ` +
      `lateral é DN75, mas ${n} coluna(s)/trecho(s) excedem perda de carga ou velocidade ` +
      `admissível (perda máx: ${maxHf} mca; velocidade máx: ${maxVel} m/s). ` +
      `Ações sugeridas: reduzir aspersores por trecho operacional; revisar comprimento das ` +
      `laterais; dividir alimentação; reposicionar principal/corredor; ou escalar para projetista/RT.`,
    );
  }

  // ── TASK-023: Blocker comercial — DN de lateral não homologado para kit 5022 ─
  // Mantido como defesa (não deve disparar no caminho normal após TASK-031,
  // porque o seletor recebe apenas DN50/DN75 via getCatalogoLateraisHomologadas5022).
  if (bom.meta.kitAspersorDnNaoHomologadoCount > 0) {
    blockers.push(
      `BOM incompleta — DN de lateral não homologado para kit do aspersor 5022: ` +
      `${bom.meta.kitAspersorDnNaoHomologadoCount} aspersor(es) em lateral sem kit disponível. ` +
      `Utilizar apenas laterais DN50mm ou DN75mm com o aspersor 5022.`,
    );
  }

  // ── TASK-022: Blocker comercial — conexões físicas sem SKU ──────────────────
  if (bom.meta.conexoesFisicasSemSkuCount > 0) {
    const tipos = new Set(bom.meta.conexoesFisicasPendentes.map((c) => c.tipo));
    const tipoTextos: string[] = [];
    if (tipos.has("tee_90_aspersor_lateral")) tipoTextos.push("derivação aspersor-lateral");
    if (tipos.has("curva_45_adutora"))        tipoTextos.push("curva 45° adutora");
    if (tipos.has("curva_90_adutora"))        tipoTextos.push("curva 90° adutora");
    if (tipos.has("curva_90_lateral"))        tipoTextos.push("curva 90° lateral");
    if (bom.meta.conexoesFisicasPendentes.some((c) => c.motivoPendencia === "dn_indeterminado"))
      tipoTextos.push("curva 90° ramal (DN indeterminado)");
    blockers.push(
      `BOM incompleta — ${bom.meta.conexoesFisicasSemSkuCount} conexão(ões) física(s) ` +
      `necessária(s) sem SKU/custo homologado` +
      (tipoTextos.length > 0 ? `: ${tipoTextos.join(", ")}` : "") +
      `. Incluir manualmente ou homologar catálogo antes de emitir proposta final.`,
    );
  }

  // ── TASK-026-B: Gate de emissão para cálculo hidráulico essencial ───────────
  // Bloqueia emissão quando o projeto está completo (passou pelas verificações
  // de isComplete em irrigation-project.ts) mas a hidráulica essencial está
  // ausente, inválida ou estruturalmente inconsistente. Não corrige a causa-raiz
  // (TASK-026-A trata generateSecondaries) — apenas garante que PDFs nunca sejam
  // emitidos sem HMT computada ou com colunas físicas sem ramal correspondente.
  const projectIsComplete =
    !!layout.sprinklers && !!layout.sectorization &&
    !!layout.mainPipeline && !!layout.centroid && !!layout.waterSource;

  if (projectIsComplete) {
    const hmtIsInvalid =
      !hydraulics ||
      typeof hydraulics.hmt?.totalHMT !== "number" ||
      !Number.isFinite(hydraulics.hmt.totalHMT) ||
      hydraulics.hmt.totalHMT <= 0;

    if (hmtIsInvalid) {
      blockers.push(
        "Cálculo hidráulico incompleto: HMT total não computada ou inválida. " +
        "Não é possível emitir proposta sem HMT — revisar dados de entrada e tentar novamente.",
      );
    } else {
      const secondariesCount = hydraulics.sizedSecondaries.length;
      if (physCols > 0 && secondariesCount === 0) {
        blockers.push(
          `Cálculo hidráulico incompleto: ${physCols} coluna(s) física(s) sem ramal correspondente na distribuição. ` +
          "Não é possível emitir proposta — revisar geometria do projeto.",
        );
      }
    }
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
