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
  pressaoServicoMca: 25,
  vazaoM3PorHora: 1.5,
  raioMolhadoM: 14,
  espacamentoPadraoM: 12,
};

export const ASPERSORES: Aspersor[] = [ASPERSOR_PADRAO];

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
// SELEÇÃO DE TUBO POR DIÂMETRO MÍNIMO (Hazen-Williams V = 1.5 m/s)
// ============================================================
export function selectTubo(vazaoM3PorHora: number): (typeof TUBOS_PVC_RIGIDO)[number] {
  const Q_m3s = vazaoM3PorHora / 3600;
  const V = 1.5;
  const D_mm = Math.sqrt((4 * Q_m3s) / (Math.PI * V)) * 1000;

  const ordenados = [...TUBOS_PVC_RIGIDO].sort((a, b) => a.diametroMm - b.diametroMm);
  return (
    ordenados.find((t) => t.diametroMm >= D_mm) ??
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

// PVC LF (Liga Fácil) — laterais (rede secundária)
export const TUBOS_PVC_LF = [
  { sku: "TIGRE_LF_50_PN40",  descricao: "Tubo PVC LF Ø50mm PN40 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 50,  pressaoMca: 40, metrosPorBarra: 6, custo: 28.4, precoVenda:  52.0, coefC: 145 },
  { sku: "TIGRE_LF_75_PN40",  descricao: "Tubo PVC LF Ø75mm PN40 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 75,  pressaoMca: 40, metrosPorBarra: 6, custo: 58.9, precoVenda: 108.0, coefC: 145 },
  { sku: "TIGRE_LF_100_PN40", descricao: "Tubo PVC LF Ø100mm PN40 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 100, pressaoMca: 40, metrosPorBarra: 6, custo: 98.7, precoVenda: 178.0, coefC: 145 },
] as const;

// PVC RÍGIDO (soldável) — principal e adutora (uso futuro no refactor bottom-up)
export const TUBOS_PVC_RIGIDO = [
  { sku: "TIGRE_R_50_PN80",  descricao: "Tubo PVC rígido Ø50mm PN80 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 50,  diametroNominalMm: 50,  pressaoMca: 80, metrosPorBarra: 6, custo:  34.2, precoVenda:  62.0, coefC: 145 },
  { sku: "TIGRE_R_75_PN80",  descricao: "Tubo PVC rígido Ø75mm PN80 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 75,  diametroNominalMm: 75,  pressaoMca: 80, metrosPorBarra: 6, custo:  72.1, precoVenda: 132.0, coefC: 145 },
  { sku: "TIGRE_R_100_PN80", descricao: "Tubo PVC rígido Ø100mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 100, diametroNominalMm: 100, pressaoMca: 80, metrosPorBarra: 6, custo: 118.5, precoVenda: 215.0, coefC: 145 },
  { sku: "TIGRE_R_125_PN80", descricao: "Tubo PVC rígido Ø125mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 125, diametroNominalMm: 125, pressaoMca: 80, metrosPorBarra: 6, custo: 178.4, precoVenda: 322.0, coefC: 145 },
  { sku: "TIGRE_R_150_PN80", descricao: "Tubo PVC rígido Ø150mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 150, diametroNominalMm: 150, pressaoMca: 80, metrosPorBarra: 6, custo: 248.9, precoVenda: 448.0, coefC: 145 },
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
