import {
  ASPERSOR_PADRAO,
  ADESIVO_PVC,
  TUBO_SUBIDA_PVC_BR,
  TUBOS_PVC_LF,
  TES_DERIVACAO_LATERAL,
  selectTubo,
  selectCurva,
  selectTe,
  calculatePipelineDiameterMm,
} from "@/lib/catalog/aspersores";
import { generateLaterais, type Lateral } from "@/lib/layout/laterais";
import type { ProjectLayout } from "@/app/projetos/[id]/actions";

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

export interface BOM {
  itens: BOMItem[];
  totalGeral: number;
  laterais: Lateral[];
  meta: {
    diametroPrincipalMm: number;
    diametroPrincipalCalculadoMm: number;
    barrasDeTubo: number;
    nCurvas90: number;
    nTes: number;
    nLaterais: number;
    comprimentoLateraisM: number;
  };
}

const PRESSAO_SERVICO_ASPERSOR_MCA = 30;

export function buildBOM(layout: ProjectLayout): BOM | null {
  if (
    !layout.sprinklers ||
    !layout.sectorization ||
    !layout.mainPipeline ||
    !layout.centroid
  ) {
    return null;
  }

  const itens: BOMItem[] = [];

  itens.push({
    sku: ASPERSOR_PADRAO.sku,
    descricao: ASPERSOR_PADRAO.descricao,
    marca: ASPERSOR_PADRAO.marca,
    unidade: ASPERSOR_PADRAO.unidade,
    quantidade: layout.sprinklers.count,
    precoUnitario: ASPERSOR_PADRAO.precoVenda,
    total: layout.sprinklers.count * ASPERSOR_PADRAO.precoVenda,
    categoria: "ASPERSOR",
  });

  const barrasSubida = Math.ceil(
    layout.sprinklers.count / TUBO_SUBIDA_PVC_BR.aspersoresPorBarra,
  );
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

  const vazaoPorAspersorM3h =
    layout.sprinklers.vazaoProjetoM3PorHora / layout.sprinklers.count;

  const laterais = generateLaterais(
    layout.sprinklers.positions,
    layout.sectorization.sectorIndices,
    layout.sprinklers.gridAngleDegrees,
    layout.centroid,
    layout.sprinklers.espacamentoM,
    {
      vazao: vazaoPorAspersorM3h,
      pressaoServico: PRESSAO_SERVICO_ASPERSOR_MCA,
    },
    TUBOS_PVC_LF,
  );

  type TuboLFEntry = (typeof TUBOS_PVC_LF)[number];
  const lateraisPorSku = new Map<string, { tubo: TuboLFEntry; comprimentoTotal: number }>();
  for (const lat of laterais) {
    const sku = lat.selecao.tubo.sku;
    const tuboCat = TUBOS_PVC_LF.find((t) => t.sku === sku);
    if (!tuboCat) continue;
    const entry = lateraisPorSku.get(sku) ?? {
      tubo: tuboCat,
      comprimentoTotal: 0,
    };
    entry.comprimentoTotal += lat.comprimentoM;
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

  const tesPorDiam = new Map<number, number>();
  for (const lat of laterais) {
    const d = lat.selecao.tubo.diametroMm;
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

  const vazaoPorSetor = layout.sectorization.vazaoPorSetorM3PorHora;
  const diametroCalc = calculatePipelineDiameterMm(vazaoPorSetor);
  const tubo = selectTubo(vazaoPorSetor);
  const comprimentoPrincipalM = layout.mainPipeline.lengthMeters;
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

  const verticesIntermediarios = Math.max(0, layout.mainPipeline.segments - 1);
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

  const totalTubulacaoM = comprimentoPrincipalM + comprimentoLateraisM;
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
      comprimentoLateraisM,
    },
  };
}
