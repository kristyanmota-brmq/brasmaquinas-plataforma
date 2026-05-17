import {
  ASPERSOR_PADRAO,
  ADESIVO_PVC,
  selectTubo,
  selectCurva,
  selectTe,
  calculatePipelineDiameterMm,
} from "@/lib/catalog/aspersores";
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
  meta: {
    diametroPrincipalMm: number;
    diametroPrincipalCalculadoMm: number;
    barrasDeTubo: number;
    nCurvas90: number;
    nTes: number;
  };
}

export function buildBOM(layout: ProjectLayout): BOM | null {
  if (!layout.sprinklers || !layout.sectorization || !layout.mainPipeline) {
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

  const vazaoPorSetor = layout.sectorization.vazaoPorSetorM3PorHora;
  const diametroCalc = calculatePipelineDiameterMm(vazaoPorSetor);
  const tubo = selectTubo(vazaoPorSetor);
  const comprimentoM = layout.mainPipeline.lengthMeters;
  const barras = Math.ceil(comprimentoM / tubo.metrosPorBarra);

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

  const nTes = 1 + layout.sectorization.setoresCount;
  const te = selectTe(tubo.diametroNominalMm);
  itens.push({
    sku: te.sku,
    descricao: te.descricao,
    marca: te.marca,
    unidade: te.unidade,
    quantidade: nTes,
    precoUnitario: te.precoVenda,
    total: nTes * te.precoVenda,
    categoria: "CONEXAO",
  });

  const nAdesivos = Math.max(1, Math.ceil(comprimentoM / 30));
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
    meta: {
      diametroPrincipalMm: tubo.diametroNominalMm,
      diametroPrincipalCalculadoMm: diametroCalc,
      barrasDeTubo: barras,
      nCurvas90: nCurvas,
      nTes,
    },
  };
}
