// Catálogo Brasmáquinas — extraído de Prod_Irrig_Convenc_SANEADO.xlsx (Base_Motor_Aprovada)
// Atualizar quando catálogo oficial mudar.

export interface Produto {
  sku: string;
  descricao: string;
  marca: string;
  unidade: string;
  custo: number;
  precoVenda: number;
}

export interface Aspersor extends Produto {
  modelo: string;
  bocal: string;
  pressaoServicoMca: number;
  vazaoM3PorHora: number;
  raioMolhadoM: number;
  espacamentoPadraoM: number;
}

export interface TuboPVC extends Produto {
  diametroNominalMm: number;
  pn: 40 | 60 | 80;
  metrosPorBarra: number;
}

export interface Conexao extends Produto {
  diametroMm: number;
  tipo: "curva90" | "te" | "reducao";
}

// ============================================================
// ASPERSOR PADRÃO — Naan 5022-SD 4.0 x 1.8 mm
// ============================================================
export const ASPERSOR_PADRAO: Aspersor = {
  sku: "101092",
  descricao: "ASPERSOR 5022-SD BOCAIS 4.0 X 1.8 MM - NAAN",
  marca: "NAAN",
  modelo: "5022-SD",
  bocal: "4.0 x 1.8 mm",
  unidade: "UN",
  custo: 15.06,
  precoVenda: 32.0,
  pressaoServicoMca: 30, // V0.5-RC: Naan 5022-SD pressão de serviço = 30 mca
  vazaoM3PorHora: 1.5,
  raioMolhadoM: 14,
  espacamentoPadraoM: 12,
};

// ============================================================
// TASK-060 — Família NAAN/NaanDanJain 5035 SD (homologação provisória)
//
// Origem dos dados:
//  - SKU/custo/preço: lista de preços Rivulis no corpus de propostas reais
//    (docs/PROJETO/, gitignored — ver docs/relatorios/2026-06-11-analise-propostas-reais.md)
//  - Dados técnicos (vazão, diâmetro molhado, precipitação): tabela de
//    performance Acurain 5035 SD do fabricante (jains.com, catálogo oficial)
//  - Espaçamento 18×18: padrão das 3 propostas reais de aspersão analisadas
//    (precipitação 6,5 mm/h no bocal 5,0×2,5 @ 3,0 bar — confere com proposta real)
//
// Status: PENDENTE_CONFIRMACAO_RT (ver 12-premissas §TASK-060). O 5035 SD
// 5,0×2,5 é o aspersor mais usado nas propostas reais da Brasmáquinas.
// ============================================================

export const ASPERSOR_5035_SD_50X25: Aspersor = {
  sku: "101080547",
  descricao: "Aspersor 5035 SD - 2110l/h (3,0bar) - Bocais 5,0 x 2,5 mm (Púrpura) - NAAN",
  marca: "NAAN",
  modelo: "5035-SD",
  bocal: "5,0 x 2,5 mm",
  unidade: "UN",
  custo: 43.86,
  precoVenda: 52.6,
  pressaoServicoMca: 30, // 3,0 kg/cm² — pressão da tabela do fabricante e das propostas reais
  vazaoM3PorHora: 2.11,
  raioMolhadoM: 15.75, // D = 31,5 m @ 3,0 bar (tabela Acurain 5035 SD dual nozzle)
  espacamentoPadraoM: 18,
};

export const ASPERSOR_5035_SD_35X25: Aspersor = {
  sku: "101084779",
  descricao: "Aspersor 5035 SD - 1240l/h (3,0bar) - Bocais 3,5 x 2,5 mm (Azul) - NAAN",
  marca: "NAAN",
  modelo: "5035-SD",
  bocal: "3,5 x 2,5 mm",
  unidade: "UN",
  custo: 43.86,
  precoVenda: 52.6,
  pressaoServicoMca: 30,
  vazaoM3PorHora: 1.24,
  raioMolhadoM: 13.6, // D = 27,2 m @ 3,0 bar
  espacamentoPadraoM: 18,
};

/** Variante PC (part-circle) usada nas bordas dos projetos reais (~6% dos emissores). */
export const ASPERSOR_5035_SD_PC_45: Aspersor = {
  sku: "101085663",
  descricao: "Aspersor 5035 SD PC - 1210l/h (2,5bar) - Bocal 4,5 mm (Marrom) - NAAN",
  marca: "NAAN",
  modelo: "5035-SD-PC",
  bocal: "4,5 mm",
  unidade: "UN",
  custo: 71.42,
  precoVenda: 85.64,
  pressaoServicoMca: 25, // 2,5 kg/cm² — linha da tabela do fabricante para bocal 4,5 single
  vazaoM3PorHora: 1.21,
  raioMolhadoM: 14, // D = 28 m @ 2,5 bar
  espacamentoPadraoM: 18,
};

export const ASPERSORES: Aspersor[] = [
  ASPERSOR_PADRAO,
  ASPERSOR_5035_SD_50X25,
  ASPERSOR_5035_SD_35X25,
  ASPERSOR_5035_SD_PC_45,
];

/** TASK-060: resolve aspersor por SKU; fallback para o padrão (5022) preserva legado. */
export function getAspersorBySku(sku: string | undefined): Aspersor {
  if (!sku) return ASPERSOR_PADRAO;
  return ASPERSORES.find((a) => a.sku === sku) ?? ASPERSOR_PADRAO;
}

// ============================================================
// TUBOS PVC TIGRE — linha LF (Liga Fácil) PN40 e PN60
// Todos vendidos em barra de 6 m (unidade "UN" no catálogo)
// ============================================================
export const TUBOS_PVC: TuboPVC[] = [
  {
    sku: "1001054",
    descricao: "TUBO LF PN40 35MM - TIGRE",
    marca: "TIGRE",
    unidade: "BARRA 6m",
    custo: 0,
    precoVenda: 24.31,
    diametroNominalMm: 35,
    pn: 40,
    metrosPorBarra: 6,
  },
  {
    sku: "1000027",
    descricao: "TUBO LF PN40 50MM - TIGRE",
    marca: "TIGRE",
    unidade: "BARRA 6m",
    custo: 0,
    precoVenda: 31.0,
    diametroNominalMm: 50,
    pn: 40,
    metrosPorBarra: 6,
  },
  {
    sku: "1000028",
    descricao: "TUBO LF PN40 75MM - TIGRE",
    marca: "TIGRE",
    unidade: "BARRA 6m",
    custo: 0,
    precoVenda: 62.15,
    diametroNominalMm: 75,
    pn: 40,
    metrosPorBarra: 6,
  },
  {
    sku: "1000023",
    descricao: "TUBO LF PN40 100MM - TIGRE",
    marca: "TIGRE",
    unidade: "BARRA 6m",
    custo: 0,
    precoVenda: 114.0,
    diametroNominalMm: 100,
    pn: 40,
    metrosPorBarra: 6,
  },
  {
    sku: "1000024",
    descricao: "TUBO LF PN40 125MM - TIGRE",
    marca: "TIGRE",
    unidade: "BARRA 6m",
    custo: 0,
    precoVenda: 176.73,
    diametroNominalMm: 125,
    pn: 40,
    metrosPorBarra: 6,
  },
  {
    sku: "1000025",
    descricao: "TUBO LF PN40 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "BARRA 6m",
    custo: 0,
    precoVenda: 250.0,
    diametroNominalMm: 150,
    pn: 40,
    metrosPorBarra: 6,
  },
  {
    sku: "1000031",
    descricao: "TUBO LF PN60 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "BARRA 6m",
    custo: 0,
    precoVenda: 318.0,
    diametroNominalMm: 150,
    pn: 60,
    metrosPorBarra: 6,
  },
];

// ============================================================
// CONEXÕES TIGRE — Curva 90°, Tê
// ============================================================
export const CURVAS_90: Conexao[] = [
  {
    sku: "150174",
    descricao: "CURVA 90 PTA/BSA SOLD IRRIGA-LF 75 CB - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 20.0,
    diametroMm: 75,
    tipo: "curva90",
  },
  {
    sku: "793000",
    descricao: "CURVA 90 PTA/BSA SOLD IRRIGA-LF 100 CB - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 48.0,
    diametroMm: 100,
    tipo: "curva90",
  },
  {
    sku: "1000310",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 125MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 116.3,
    diametroMm: 125,
    tipo: "curva90",
  },
  {
    sku: "1118000",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 130.0,
    diametroMm: 150,
    tipo: "curva90",
  },
];

export const TES: Conexao[] = [
  {
    sku: "1000390",
    descricao: "TE PVC SOLD. IRRIG 75MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 31.0,
    diametroMm: 75,
    tipo: "te",
  },
  {
    sku: "835000",
    descricao: "TE PVC SOLD. IRRIG 100MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 58.3,
    diametroMm: 100,
    tipo: "te",
  },
  {
    sku: "1000363",
    descricao: "TE PVC SOLD. IRRIG PN80 125MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 258.25,
    diametroMm: 125,
    tipo: "te",
  },
  {
    sku: "1003635",
    descricao: "TE PVC SOLD. IRRIG PN80 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 391.0,
    diametroMm: 150,
    tipo: "te",
  },
];

// ============================================================
// TASK-065 — Bombas homologadas (provisório — PENDENTE_CONFIRMACAO_RT)
// Pontos nominais extraídos de propostas REAIS do corpus (docs/PROJETO/,
// gitignored): modelos nomeados pelos projetistas da Brasmáquinas.
// Sem curva Q-H completa — validação por ponto nominal (validatePump).
// ============================================================
export interface BombaCatalogo {
  modelo: string;
  marca: string;
  potenciaCv?: number;
  /** Vazão nominal de operação (m³/h). */
  vazaoMaxM3h: number;
  /** HMT nominal de operação (mca). */
  hmtMca: number;
  /** Origem do dado de placa. */
  fonte: string;
}

export const BOMBAS_HOMOLOGADAS: BombaCatalogo[] = [
  {
    modelo: "IMBIL INI BLOC 65-160",
    marca: "IMBIL",
    vazaoMaxM3h: 100,
    hmtMca: 60,
    fonte: "proposta real 12,7 ha (corpus 2026-06-11) — ponto de operação declarado",
  },
  {
    modelo: "EBARA GSD MEGABLOC (30 CV)",
    marca: "EBARA",
    potenciaCv: 30,
    vazaoMaxM3h: 67,
    hmtMca: 73,
    fonte: "proposta real 32 ha pastagem (corpus) — 134 m³/h em 2 conjuntos @ 73 mca",
  },
];

// Adesivo PVC consumível
export const ADESIVO_PVC: Produto = {
  sku: "1569000",
  descricao: "ADESIVO PLASTICO PVC 175G - PLASTUBOS",
  marca: "PLASTUBOS",
  unidade: "FR",
  custo: 0,
  precoVenda: 11.6,
};

// ============================================================
// TASK-023: Kit de ligação do aspersor 5022 por DN da lateral
//
// Regra operacional Brasmáquinas: laterais somente DN50 e DN75 para o 5022.
// Esta estrutura é a trava de segurança na BOM. A restrição do seletor
// hidráulico (generatePhysicalColumns) é escopo de TASK-025.
//
// Notas de dado:
//   - precoVenda: homologado pelo RT (2026-05-21)
//   - custo: 0 — custo de aquisição não informado; NÃO usar para margem real
//   - marca: "" para SKUs 1819000, 1000843, 1000354 — pendente do RT
// ============================================================

export interface KitAspersor5022Item {
  sku: string;
  descricao: string;
  /** Fornecedor; "" quando não informado pelo RT. */
  marca: string;
  unidade: string;
  /** Custo de aquisição não informado — não usar para análise de margem. */
  custo: 0;
  precoVenda: number;
}

export const KIT_ASPERSOR_5022: { dnMm: number; itens: KitAspersor5022Item[] }[] = [
  {
    dnMm: 50,
    itens: [
      { sku: "1819000", descricao: 'Luva PVC BR 3/4"',                      marca: "",      unidade: "unid", custo: 0, precoVenda:  6.00 },
      { sku: "1000843", descricao: 'Tubo de Subida PVC BR 3/4" x 3,0 m',   marca: "",      unidade: "unid", custo: 0, precoVenda: 30.25 },
      { sku: "1000354", descricao: 'Tee de derivação roscável 50 mm x 3/4"', marca: "",    unidade: "unid", custo: 0, precoVenda: 15.00 },
    ],
  },
  {
    dnMm: 75,
    itens: [
      { sku: "1819000", descricao: 'Luva PVC BR 3/4"',                      marca: "",      unidade: "unid", custo: 0, precoVenda:  6.00 },
      { sku: "1000843", descricao: 'Tubo de Subida PVC BR 3/4" x 3,0 m',   marca: "",      unidade: "unid", custo: 0, precoVenda: 30.25 },
      { sku: "132789",  descricao: 'TE SOLD IRR PN80 DN75 X 1" - PTI',      marca: "PTI",   unidade: "unid", custo: 0, precoVenda: 36.75 },
      { sku: "1464000", descricao: 'BUCHA RED. ROSC. 1" X 3/4" - TIGRE',    marca: "TIGRE", unidade: "unid", custo: 0, precoVenda:  5.70 },
    ],
  },
];

/**
 * Retorna os itens do kit do aspersor 5022 para o DN de lateral informado.
 * Retorna null para DNs não homologados (qualquer DN != 50 e != 75).
 */
export function selectKitAspersor5022(dnMm: number): KitAspersor5022Item[] | null {
  return KIT_ASPERSOR_5022.find((k) => k.dnMm === dnMm)?.itens ?? null;
}

// ============================================================
// SELEÇÃO DE TUBO POR DIÂMETRO MÍNIMO (Hazen-Williams V = 1.5 m/s)
// ============================================================
export function selectTubo(vazaoM3PorHora: number): (typeof TUBOS_PVC_RIGIDO)[number] {
  const Q_m3s = vazaoM3PorHora / 3600;
  const V = 1.5;
  // D_mm é o diâmetro interno mínimo que garante v ≤ 1,5 m/s.
  // Comparamos com diametroInternoMm (real) e não com o nominal.
  const D_mm = Math.sqrt((4 * Q_m3s) / (Math.PI * V)) * 1000;

  const ordenados = [...TUBOS_PVC_RIGIDO].sort((a, b) => a.diametroMm - b.diametroMm);
  return (
    ordenados.find((t) => t.diametroInternoMm >= D_mm) ??
    ordenados[ordenados.length - 1]
  );
}

export function selectCurva(diametroMm: number): Conexao {
  return (
    CURVAS_90_RIGIDAS.find((c) => c.diametroMm === diametroMm) ??
    CURVAS_90_RIGIDAS.reduce((closest, c) =>
      Math.abs(c.diametroMm - diametroMm) < Math.abs(closest.diametroMm - diametroMm)
        ? c
        : closest
    )
  );
}

export function selectTe(diametroMm: number): Conexao {
  return (
    TES.find((t) => t.diametroMm === diametroMm) ??
    TES.reduce((closest, t) =>
      Math.abs(t.diametroMm - diametroMm) < Math.abs(closest.diametroMm - diametroMm)
        ? t
        : closest
    )
  );
}

export function calculatePipelineDiameterMm(vazaoM3PorHora: number): number {
  const Q_m3s = vazaoM3PorHora / 3600;
  const V = 1.5;
  return Math.sqrt((4 * Q_m3s) / (Math.PI * V)) * 1000;
}
// ============================================================
// SPRINT 7 — Tubos e conexões para rede secundária
// ============================================================

// PVC BR (Branco Roscável) — tubo de SUBIDA (riser do aspersor)
// 1 por aspersor, comprimento útil 2,6 m. Barra de 6 m atende 2 aspersores.
export const TUBO_SUBIDA_PVC_BR = {
  sku: "PVC_BR_3_4_PN60",
  descricao: 'Tubo PVC BR roscável 3/4" PN60 - barra 6m',
  marca: "Tigre",
  unidade: "barra",
  diametroNominalMm: 25,
  diametroPolegadas: '3/4"',
  metrosPorBarra: 6,
  comprimentoUtilPorAspersorM: 2.6,
  aspersoresPorBarra: 2,
  pressaoNominalMca: 60,
  custo: 18.5,
  precoVenda: 32.0,
} as const;

// Coeficiente C de Hazen-Williams para PVC:
//   - PVC novo (<= 2 anos): C = 150
//   - PVC envelhecido (>= 10 anos): C = 140
//   - V0.5-RC piloto: C = 145 (media, default neste catalogo)
// Politica: campo editavel por linha do catalogo para permitir
// ajuste fino quando o RT optar por C alternativo.

// PVC LF (Liga Fácil) — laterais (rede secundária)
// diametroMm = diâmetro nominal/externo (OD). Espessuras PN40 ABNT NBR 5648.
export const TUBOS_PVC_LF = [
  { sku: "TIGRE_LF_50_PN40",  descricao: "Tubo PVC LF Ø50mm PN40 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 50,  diametroExternoMm: 50,  espessuraParedeMm: 2.0, diametroInternoMm: 46,  pressaoMca: 40, metrosPorBarra: 6, custo: 28.4, precoVenda:  52.0, coefC: 145 },
  { sku: "TIGRE_LF_75_PN40",  descricao: "Tubo PVC LF Ø75mm PN40 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 75,  diametroExternoMm: 75,  espessuraParedeMm: 3.0, diametroInternoMm: 69,  pressaoMca: 40, metrosPorBarra: 6, custo: 58.9, precoVenda: 108.0, coefC: 145 },
  { sku: "TIGRE_LF_100_PN40", descricao: "Tubo PVC LF Ø100mm PN40 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 100, diametroExternoMm: 100, espessuraParedeMm: 4.0, diametroInternoMm: 92,  pressaoMca: 40, metrosPorBarra: 6, custo: 98.7, precoVenda: 178.0, coefC: 145 },
] as const;

// PVC RÍGIDO (soldável) — principal e adutora
// diametroMm = diâmetro nominal = externo (OD). Espessuras PN80 ABNT NBR 5647.
export const TUBOS_PVC_RIGIDO = [
  { sku: "TIGRE_R_50_PN80",  descricao: "Tubo PVC rígido Ø50mm PN80 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 50,  diametroNominalMm: 50,  diametroExternoMm: 50,  espessuraParedeMm: 3.0, diametroInternoMm: 44,  pressaoMca: 80, metrosPorBarra: 6, custo:  34.2, precoVenda:  62.0, coefC: 145 },
  { sku: "TIGRE_R_75_PN80",  descricao: "Tubo PVC rígido Ø75mm PN80 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 75,  diametroNominalMm: 75,  diametroExternoMm: 75,  espessuraParedeMm: 4.5, diametroInternoMm: 66,  pressaoMca: 80, metrosPorBarra: 6, custo:  72.1, precoVenda: 132.0, coefC: 145 },
  { sku: "TIGRE_R_100_PN80", descricao: "Tubo PVC rígido Ø100mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 100, diametroNominalMm: 100, diametroExternoMm: 100, espessuraParedeMm: 6.0, diametroInternoMm: 88,  pressaoMca: 80, metrosPorBarra: 6, custo: 118.5, precoVenda: 215.0, coefC: 145 },
  { sku: "TIGRE_R_125_PN80", descricao: "Tubo PVC rígido Ø125mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 125, diametroNominalMm: 125, diametroExternoMm: 125, espessuraParedeMm: 7.0, diametroInternoMm: 111, pressaoMca: 80, metrosPorBarra: 6, custo: 178.4, precoVenda: 322.0, coefC: 145 },
  { sku: "TIGRE_R_150_PN80", descricao: "Tubo PVC rígido Ø150mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 150, diametroNominalMm: 150, diametroExternoMm: 150, espessuraParedeMm: 8.5, diametroInternoMm: 133, pressaoMca: 80, metrosPorBarra: 6, custo: 248.9, precoVenda: 448.0, coefC: 145 },
] as const;

// ============================================================
// CONEXÕES RÍGIDAS (soldável PN80) — principal e adutora
// ============================================================
export const CURVAS_90_RIGIDAS: Conexao[] = [
  {
    sku: "TIGRE_CR_50_PN80",
    descricao: "Curva 90 PVC rígido sold. Ø50mm PN80 - Tigre", // TODO: confirmar preço
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 22.0,
    diametroMm: 50,
    tipo: "curva90",
  },
  {
    sku: "TIGRE_CR_75_PN80",
    descricao: "Curva 90 PVC rígido sold. Ø75mm PN80 - Tigre", // TODO: confirmar preço
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 38.0,
    diametroMm: 75,
    tipo: "curva90",
  },
  {
    sku: "TIGRE_CR_100_PN80",
    descricao: "Curva 90 PVC rígido sold. Ø100mm PN80 - Tigre", // TODO: confirmar preço
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 68.0,
    diametroMm: 100,
    tipo: "curva90",
  },
  {
    sku: "1000310",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 125MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 116.3,
    diametroMm: 125,
    tipo: "curva90",
  },
  {
    sku: "1118000",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 0,
    precoVenda: 130.0,
    diametroMm: 150,
    tipo: "curva90",
  },
];

// Tês de derivação para laterais (PVC LF)
export const TES_DERIVACAO_LATERAL = [
  { sku: "TIGRE_TE_50_LF",  descricao: "Tê PVC LF Ø50mm",  marca: "Tigre", unidade: "un", diametroMm: 50,  custo:  9.8, precoVenda: 18.0 },
  { sku: "TIGRE_TE_75_LF",  descricao: "Tê PVC LF Ø75mm",  marca: "Tigre", unidade: "un", diametroMm: 75,  custo: 18.4, precoVenda: 34.0 },
  { sku: "TIGRE_TE_100_LF", descricao: "Tê PVC LF Ø100mm", marca: "Tigre", unidade: "un", diametroMm: 100, custo: 32.6, precoVenda: 58.0 },
] as const;

// ── TASK-006B: Registros manuais de seção ────────────────────────────────────
// VIQUA soldável — PN80 por homologação interna Brasmáquinas.

export interface RegistroSecao {
  sku: string;
  descricao: string;
  marca: string;
  tipo: "registro_manual_secao";
  diametroNominalMm: number;
  classePressao: "PN80";
  pressaoNominalMca: 80;
  unidade: "un";
  custo: number;
  precoVenda: number;
  prioridade: "primario" | "alternativa";
  fontePressao: "homologacao_interna_brasmaquinas";
  usoPermitido: "registro_manual_secao";
}

export const REGISTROS_SECAO_MANUAL: RegistroSecao[] = [
  {
    sku: "4209000",
    descricao: "REGIST PVC ESF.SOLD. AZUL 32MM - VIQUA",
    marca: "VIQUA",
    tipo: "registro_manual_secao",
    diametroNominalMm: 32,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    unidade: "un",
    custo: 10.816,
    precoVenda: 18.10,
    prioridade: "primario",
    fontePressao: "homologacao_interna_brasmaquinas",
    usoPermitido: "registro_manual_secao",
  },
  {
    sku: "1000962",
    descricao: "REGIST PVC ESF.SOLD. PREDIALL 32MM - VIQUA",
    marca: "VIQUA",
    tipo: "registro_manual_secao",
    diametroNominalMm: 32,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    unidade: "un",
    custo: 5.33,
    precoVenda: 20.10,
    prioridade: "alternativa",
    fontePressao: "homologacao_interna_brasmaquinas",
    usoPermitido: "registro_manual_secao",
  },
  {
    sku: "4208000",
    descricao: "REGIST PVC ESF.SOLD. AZUL 35MM - VIQUA",
    marca: "VIQUA",
    tipo: "registro_manual_secao",
    diametroNominalMm: 35,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    unidade: "un",
    custo: 13.9748,
    precoVenda: 24.20,
    prioridade: "primario",
    fontePressao: "homologacao_interna_brasmaquinas",
    usoPermitido: "registro_manual_secao",
  },
  {
    sku: "1002326",
    descricao: "REGIST PVC ESF.SOLD. AZUL 50MM - VIQUA",
    marca: "VIQUA",
    tipo: "registro_manual_secao",
    diametroNominalMm: 50,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    unidade: "un",
    custo: 14.575,
    precoVenda: 24.96,
    prioridade: "primario",
    fontePressao: "homologacao_interna_brasmaquinas",
    usoPermitido: "registro_manual_secao",
  },
  {
    sku: "1003768",
    descricao: "REGIST PVC ESF.SOLD. MARRON 50MM - VIQUA",
    marca: "VIQUA",
    tipo: "registro_manual_secao",
    diametroNominalMm: 50,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    unidade: "un",
    custo: 22.83,
    precoVenda: 48.50,
    prioridade: "alternativa",
    fontePressao: "homologacao_interna_brasmaquinas",
    usoPermitido: "registro_manual_secao",
  },
  {
    sku: "1001994",
    descricao: "REGIST PVC ESF.SOLD. AZUL 75MM - VIQUA",
    marca: "VIQUA",
    tipo: "registro_manual_secao",
    diametroNominalMm: 75,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    unidade: "un",
    custo: 84.7046,
    precoVenda: 135.30,
    prioridade: "primario",
    fontePressao: "homologacao_interna_brasmaquinas",
    usoPermitido: "registro_manual_secao",
  },
  {
    sku: "1002327",
    descricao: "REGIST PVC ESF.SOLD. AZUL 100MM - VIQUA",
    marca: "VIQUA",
    tipo: "registro_manual_secao",
    diametroNominalMm: 100,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    unidade: "un",
    custo: 240.514,
    precoVenda: 404.50,
    prioridade: "primario",
    fontePressao: "homologacao_interna_brasmaquinas",
    usoPermitido: "registro_manual_secao",
  },
];

export function selectRegistroSecao(diametroMm: number): RegistroSecao | undefined {
  return REGISTROS_SECAO_MANUAL.find(
    (r) => r.prioridade === "primario" && Math.abs(r.diametroNominalMm - diametroMm) <= 2,
  );
}
