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
// Naan 5022-SD 4.0 x 1.8 mm — entrada PRESERVADA (catálogo read-only;
// projetos salvos com este SKU continuam resolvendo por getAspersorBySku)
// ============================================================
export const ASPERSOR_5022_SD_40X18: Aspersor = {
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
// ASPERSOR PADRÃO — Naan 5022-SD 3.0 x 1.8 mm (TASK-082)
// Especificação OFICIAL ditada pelo RT da Brasmáquinas em sessão
// (2026-06-12): "utilizamos 5022 espaçamento 12x12 bocal 3.0x1.8mm,
// vazão 760 L/h, pressão nominal 25 mca". Custo/preço herdados da
// entrada 4.0x1.8 (mesmo corpo de aspersor, bocal diferente).
// ============================================================
export const ASPERSOR_PADRAO: Aspersor = {
  sku: "101092-3018",
  descricao: "ASPERSOR 5022-SD BOCAIS 3.0 X 1.8 MM - NAAN",
  marca: "NAAN",
  modelo: "5022-SD",
  bocal: "3.0 x 1.8 mm",
  unidade: "UN",
  custo: 15.06,
  precoVenda: 32.0,
  pressaoServicoMca: 25, // RT em sessão (2026-06-12): pressão nominal 25 mca
  vazaoM3PorHora: 0.76, // RT em sessão: 760 L/h
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

// TASK-084: ASPERSOR 5035 SD 3,5×2,5 REMOVIDO por ordem do RT (2026-06-12).


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
  ASPERSOR_5022_SD_40X18,
  ASPERSOR_5035_SD_50X25,
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
    custo: 15.73 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 20.06 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 40.21 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 73.76 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 114.34 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 161.75 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 205.75 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 12.94 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 20.0,
    diametroMm: 75,
    tipo: "curva90",
  },
  {
    sku: "793000",
    descricao: "CURVA 90 PTA/BSA SOLD IRRIGA-LF 100 CB - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 31.06 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 48.0,
    diametroMm: 100,
    tipo: "curva90",
  },
  {
    sku: "1000310",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 125MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 75.25 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 116.3,
    diametroMm: 125,
    tipo: "curva90",
  },
  {
    sku: "1118000",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 84.11 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
    custo: 20.06 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 31.0,
    diametroMm: 75,
    tipo: "te",
  },
  {
    sku: "835000",
    descricao: "TE PVC SOLD. IRRIG 100MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 37.72 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 58.3,
    diametroMm: 100,
    tipo: "te",
  },
  {
    sku: "1000363",
    descricao: "TE PVC SOLD. IRRIG PN80 125MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 167.09 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 258.25,
    diametroMm: 125,
    tipo: "te",
  },
  {
    sku: "1003635",
    descricao: "TE PVC SOLD. IRRIG PN80 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 252.98 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
  // ── TASK-085 — Catálogo de fabricante (PENDENTE_CONFIRMACAO_RT) ──
  // Ponto nominal = ponto MEDIANO da tabela vazão×altura do fabricante
  // (conservador: à esquerda do ponto a curva real entrega altura maior).
  // Fonte: Catálogo de Produtos de Superfície 60 Hz 2025 rev00 (EBAS —
  // Ebara/Thebe), download 2026-06-12 — ver docs/catalogos/bombas/README.md.
  { modelo: "THEBE R-20 (7,5 CV, rotor 183)", marca: "THEBE", potenciaCv: 7.5, vazaoMaxM3h: 57, hmtMca: 21.6, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — R-20 rotor 183 mm, ponto mediano (η≈0,61)" },
  { modelo: "THEBE R-20 (10 CV, rotor 192)", marca: "THEBE", potenciaCv: 10, vazaoMaxM3h: 58, hmtMca: 22.8, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — R-20 rotor 192 mm, ponto mediano (η≈0,49)" },
  { modelo: "THEBE R-20 (12,5 CV, rotor 197)", marca: "THEBE", potenciaCv: 12.5, vazaoMaxM3h: 60, hmtMca: 30.4, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — R-20 rotor 197 mm, ponto mediano (η≈0,54)" },
  { modelo: "THEBE R-20 (15 CV, rotor 197)", marca: "THEBE", potenciaCv: 15, vazaoMaxM3h: 60, hmtMca: 30.4, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — R-20 rotor 197 mm, ponto mediano (η≈0,45)" },
  { modelo: "THEBE RL-20B (10 CV, rotor 147)", marca: "THEBE", potenciaCv: 10, vazaoMaxM3h: 34, hmtMca: 47.8, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 147 mm, ponto mediano (η≈0,6)" },
  { modelo: "THEBE RL-20B (10 CV, rotor 157)", marca: "THEBE", potenciaCv: 10, vazaoMaxM3h: 46, hmtMca: 34.3, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 157 mm, ponto mediano (η≈0,58)" },
  { modelo: "THEBE RL-20B (12,5 CV, rotor 157)", marca: "THEBE", potenciaCv: 12.5, vazaoMaxM3h: 40, hmtMca: 49.7, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 157 mm, ponto mediano (η≈0,59)" },
  { modelo: "THEBE RL-20B (12,5 CV, rotor 166)", marca: "THEBE", potenciaCv: 12.5, vazaoMaxM3h: 50, hmtMca: 41.3, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 166 mm, ponto mediano (η≈0,61)" },
  { modelo: "THEBE RL-20B (15 CV, rotor 166)", marca: "THEBE", potenciaCv: 15, vazaoMaxM3h: 46, hmtMca: 50.1, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 166 mm, ponto mediano (η≈0,57)" },
  { modelo: "THEBE RL-20B (15 CV, rotor 175)", marca: "THEBE", potenciaCv: 15, vazaoMaxM3h: 56, hmtMca: 42.1, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 175 mm, ponto mediano (η≈0,58)" },
  { modelo: "THEBE RL-20B (15 CV, rotor 184)", marca: "THEBE", potenciaCv: 15, vazaoMaxM3h: 66, hmtMca: 33.1, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 184 mm, ponto mediano (η≈0,54)" },
  { modelo: "THEBE RL-20B (20 CV, rotor 184)", marca: "THEBE", potenciaCv: 20, vazaoMaxM3h: 60, hmtMca: 49, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 184 mm, ponto mediano (η≈0,54)" },
  { modelo: "THEBE RL-20B (20 CV, rotor 192)", marca: "THEBE", potenciaCv: 20, vazaoMaxM3h: 70, hmtMca: 51.2, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 192 mm, ponto mediano (η≈0,66)" },
  { modelo: "THEBE RL-20B (20 CV, rotor 200)", marca: "THEBE", potenciaCv: 20, vazaoMaxM3h: 78, hmtMca: 43.1, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 200 mm, ponto mediano (η≈0,62)" },
  { modelo: "THEBE RL-20B (25 CV, rotor 200)", marca: "THEBE", potenciaCv: 25, vazaoMaxM3h: 74, hmtMca: 58.8, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 13 — RL-20B rotor 200 mm, ponto mediano (η≈0,64)" },
  { modelo: "THEBE THS-18 (3 CV, rotor 123)", marca: "THEBE", potenciaCv: 3, vazaoMaxM3h: 22, hmtMca: 22.9, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 123 mm, ponto mediano (η≈0,62)" },
  { modelo: "THEBE THS-18 (3 CV, rotor 128)", marca: "THEBE", potenciaCv: 3, vazaoMaxM3h: 26, hmtMca: 22.5, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 128 mm, ponto mediano (η≈0,72)" },
  { modelo: "THEBE THS-18 (4 CV, rotor 132)", marca: "THEBE", potenciaCv: 4, vazaoMaxM3h: 22, hmtMca: 29.2, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 132 mm, ponto mediano (η≈0,59)" },
  { modelo: "THEBE THS-18 (4 CV, rotor 136)", marca: "THEBE", potenciaCv: 4, vazaoMaxM3h: 28, hmtMca: 25.3, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 136 mm, ponto mediano (η≈0,66)" },
  { modelo: "THEBE THS-18 (5 CV, rotor 141)", marca: "THEBE", potenciaCv: 5, vazaoMaxM3h: 28, hmtMca: 30, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 141 mm, ponto mediano (η≈0,62)" },
  { modelo: "THEBE THS-18 (5 CV, rotor 147)", marca: "THEBE", potenciaCv: 5, vazaoMaxM3h: 36, hmtMca: 25.1, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 147 mm, ponto mediano (η≈0,67)" },
  { modelo: "THEBE THS-18 (5 CV, rotor 156)", marca: "THEBE", potenciaCv: 5, vazaoMaxM3h: 42, hmtMca: 18.9, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 156 mm, ponto mediano (η≈0,59)" },
  { modelo: "THEBE THS-18 (6 CV, rotor 151)", marca: "THEBE", potenciaCv: 6, vazaoMaxM3h: 36, hmtMca: 28.3, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 151 mm, ponto mediano (η≈0,63)" },
  { modelo: "THEBE THS-18 (6 CV, rotor 159)", marca: "THEBE", potenciaCv: 6, vazaoMaxM3h: 44, hmtMca: 25.9, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 159 mm, ponto mediano (η≈0,7)" },
  { modelo: "THEBE THS-18 (7,5 CV, rotor 163)", marca: "THEBE", potenciaCv: 7.5, vazaoMaxM3h: 42, hmtMca: 30.6, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 163 mm, ponto mediano (η≈0,63)" },
  { modelo: "THEBE THS-18 (7,5 CV, rotor 168)", marca: "THEBE", potenciaCv: 7.5, vazaoMaxM3h: 50, hmtMca: 26.7, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 168 mm, ponto mediano (η≈0,66)" },
  { modelo: "THEBE THS-18 (10 CV, rotor 172)", marca: "THEBE", potenciaCv: 10, vazaoMaxM3h: 38, hmtMca: 42.2, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 172 mm, ponto mediano (η≈0,59)" },
  { modelo: "THEBE THS-18 (10 CV, rotor 179)", marca: "THEBE", potenciaCv: 10, vazaoMaxM3h: 52, hmtMca: 33.8, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 179 mm, ponto mediano (η≈0,65)" },
  { modelo: "THEBE THS-18 (12,5 CV, rotor 179)", marca: "THEBE", potenciaCv: 12.5, vazaoMaxM3h: 44, hmtMca: 44, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 11 — THS-18 rotor 179 mm, ponto mediano (η≈0,57)" },
  { modelo: "EBARA GS/GSD 32-125 (3 CV, rotor 106)", marca: "EBARA", potenciaCv: 3, vazaoMaxM3h: 25.8, hmtMca: 15, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-125 3500 rpm rotor 106 mm, ponto mediano (η≈0,48)" },
  { modelo: "EBARA GS/GSD 32-125 (4 CV, rotor 119)", marca: "EBARA", potenciaCv: 4, vazaoMaxM3h: 33, hmtMca: 19, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-125 3500 rpm rotor 119 mm, ponto mediano (η≈0,58)" },
  { modelo: "EBARA GS/GSD 32-125 (5 CV, rotor 131)", marca: "EBARA", potenciaCv: 5, vazaoMaxM3h: 36.4, hmtMca: 26, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-125 3500 rpm rotor 131 mm, ponto mediano (η≈0,7)" },
  { modelo: "EBARA GS/GSD 32-125 (6 CV, rotor 142)", marca: "EBARA", potenciaCv: 6, vazaoMaxM3h: 42.4, hmtMca: 28, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-125 3500 rpm rotor 142 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 32-125.1 (3 CV, rotor 115)", marca: "EBARA", potenciaCv: 3, vazaoMaxM3h: 25.7, hmtMca: 18, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-125.1 3500 rpm rotor 115 mm, ponto mediano (η≈0,57)" },
  { modelo: "EBARA GS/GSD 32-125.1 (4 CV, rotor 129)", marca: "EBARA", potenciaCv: 4, vazaoMaxM3h: 28.6, hmtMca: 26, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-125.1 3500 rpm rotor 129 mm, ponto mediano (η≈0,69)" },
  { modelo: "EBARA GS/GSD 32-125.1 (5 CV, rotor 140)", marca: "EBARA", potenciaCv: 5, vazaoMaxM3h: 28.8, hmtMca: 32, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-125.1 3500 rpm rotor 140 mm, ponto mediano (η≈0,68)" },
  { modelo: "EBARA GS/GSD 32-160 (6 CV, rotor 139)", marca: "EBARA", potenciaCv: 6, vazaoMaxM3h: 32.8, hmtMca: 32, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160 3500 rpm rotor 139 mm, ponto mediano (η≈0,65)" },
  { modelo: "EBARA GS/GSD 32-160 (7,5 CV, rotor 152)", marca: "EBARA", potenciaCv: 7.5, vazaoMaxM3h: 37.9, hmtMca: 39, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160 3500 rpm rotor 152 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 32-160 (12,5 CV, rotor 164)", marca: "EBARA", potenciaCv: 12.5, vazaoMaxM3h: 43.5, hmtMca: 44, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160 3500 rpm rotor 164 mm, ponto mediano (η≈0,57)" },
  { modelo: "EBARA GS/GSD 32-160 (12,5 CV, rotor 177)", marca: "EBARA", potenciaCv: 12.5, vazaoMaxM3h: 44.1, hmtMca: 48, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160 3500 rpm rotor 177 mm, ponto mediano (η≈0,63)" },
  { modelo: "EBARA GS/GSD 32-160.1 (4 CV, rotor 126)", marca: "EBARA", potenciaCv: 4, vazaoMaxM3h: 23.5, hmtMca: 24, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160.1 3500 rpm rotor 126 mm, ponto mediano (η≈0,52)" },
  { modelo: "EBARA GS/GSD 32-160.1 (6 CV, rotor 145)", marca: "EBARA", potenciaCv: 6, vazaoMaxM3h: 27.6, hmtMca: 36, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160.1 3500 rpm rotor 145 mm, ponto mediano (η≈0,61)" },
  { modelo: "EBARA GS/GSD 32-160.1 (7,5 CV, rotor 163)", marca: "EBARA", potenciaCv: 7.5, vazaoMaxM3h: 31.4, hmtMca: 44, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160.1 3500 rpm rotor 163 mm, ponto mediano (η≈0,68)" },
  { modelo: "EBARA GS/GSD 32-160.1 (10 CV, rotor 177)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 34.8, hmtMca: 50, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 60 — GS 32-160.1 3500 rpm rotor 177 mm, ponto mediano (η≈0,64)" },
  { modelo: "EBARA GS/GSD 32-200 (10 CV, rotor 175)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 38.3, hmtMca: 48, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200 3500 rpm rotor 175 mm, ponto mediano (η≈0,68)" },
  { modelo: "EBARA GS/GSD 32-200 (12,5 CV, rotor 184)", marca: "EBARA", potenciaCv: 12.5, vazaoMaxM3h: 43.7, hmtMca: 52, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200 3500 rpm rotor 184 mm, ponto mediano (η≈0,67)" },
  { modelo: "EBARA GS/GSD 32-200 (15 CV, rotor 197)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 44.9, hmtMca: 63, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200 3500 rpm rotor 197 mm, ponto mediano (η≈0,7)" },
  { modelo: "EBARA GS/GSD 32-200 (15 CV, rotor 208)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 46.2, hmtMca: 72, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200 3500 rpm rotor 208 mm, ponto mediano (η≈0,82)" },
  { modelo: "EBARA GS/GSD 32-200 (20 CV, rotor 219)", marca: "EBARA", potenciaCv: 20, vazaoMaxM3h: 52.4, hmtMca: 78, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200 3500 rpm rotor 219 mm, ponto mediano (η≈0,76)" },
  { modelo: "EBARA GS/GSD 32-200.1 (5 CV, rotor 172)", marca: "EBARA", potenciaCv: 5, vazaoMaxM3h: 29.9, hmtMca: 35, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200.1 3500 rpm rotor 172 mm, ponto mediano (η≈0,78)" },
  { modelo: "EBARA GS/GSD 32-200.1 (7,5 CV, rotor 184)", marca: "EBARA", potenciaCv: 7.5, vazaoMaxM3h: 32.9, hmtMca: 41, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200.1 3500 rpm rotor 184 mm, ponto mediano (η≈0,67)" },
  { modelo: "EBARA GS/GSD 32-200.1 (10 CV, rotor 196)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 34.1, hmtMca: 50, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200.1 3500 rpm rotor 196 mm, ponto mediano (η≈0,63)" },
  { modelo: "EBARA GS/GSD 32-200.1 (10 CV, rotor 207)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 35.6, hmtMca: 59, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-200.1 3500 rpm rotor 207 mm, ponto mediano (η≈0,78)" },
  { modelo: "EBARA GS/GSD 32-250 (10 CV, rotor 198)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 29.2, hmtMca: 68, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-250 3500 rpm rotor 198 mm, ponto mediano (η≈0,74)" },
  { modelo: "EBARA GS/GSD 32-250 (12,5 CV, rotor 222)", marca: "EBARA", potenciaCv: 12.5, vazaoMaxM3h: 31.7, hmtMca: 88, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 32-250 3500 rpm rotor 222 mm, ponto mediano (η≈0,83)" },
  { modelo: "EBARA GS/GSD 40-125 (3 CV, rotor 105)", marca: "EBARA", potenciaCv: 3, vazaoMaxM3h: 38.7, hmtMca: 15, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 40-125 3500 rpm rotor 105 mm, ponto mediano (η≈0,72)" },
  { modelo: "EBARA GS/GSD 40-125 (5 CV, rotor 119)", marca: "EBARA", potenciaCv: 5, vazaoMaxM3h: 43.5, hmtMca: 21, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 40-125 3500 rpm rotor 119 mm, ponto mediano (η≈0,68)" },
  { modelo: "EBARA GS/GSD 40-125 (7,5 CV, rotor 131)", marca: "EBARA", potenciaCv: 7.5, vazaoMaxM3h: 54.5, hmtMca: 27, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 40-125 3500 rpm rotor 131 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 40-125 (10 CV, rotor 142)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 61.7, hmtMca: 31, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 61 — GS 40-125 3500 rpm rotor 142 mm, ponto mediano (η≈0,71)" },
  { modelo: "EBARA GS/GSD 40-160 (7,5 CV, rotor 134)", marca: "EBARA", potenciaCv: 7.5, vazaoMaxM3h: 56.8, hmtMca: 26, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-160 3500 rpm rotor 134 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 40-160 (10 CV, rotor 150)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 61.1, hmtMca: 36, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-160 3500 rpm rotor 150 mm, ponto mediano (η≈0,81)" },
  { modelo: "EBARA GS/GSD 40-160 (15 CV, rotor 163)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 71.9, hmtMca: 44, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-160 3500 rpm rotor 163 mm, ponto mediano (η≈0,78)" },
  { modelo: "EBARA GS/GSD 40-160 (20 CV, rotor 177)", marca: "EBARA", potenciaCv: 20, vazaoMaxM3h: 74.7, hmtMca: 52, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-160 3500 rpm rotor 177 mm, ponto mediano (η≈0,72)" },
  { modelo: "EBARA GS/GSD 40-200 (15 CV, rotor 172)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 64.1, hmtMca: 52, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 172 mm, ponto mediano (η≈0,82)" },
  { modelo: "EBARA GS/GSD 40-200 (25 CV, rotor 189)", marca: "EBARA", potenciaCv: 25, vazaoMaxM3h: 72.1, hmtMca: 64, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 189 mm, ponto mediano (η≈0,68)" },
  { modelo: "EBARA GS/GSD 40-200 (30 CV, rotor 205)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 77.4, hmtMca: 76, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 205 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 40-200 (30 CV, rotor 219)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 72.4, hmtMca: 88, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 219 mm, ponto mediano (η≈0,79)" },
  { modelo: "EBARA GS/GSD 40-250 (25 CV, rotor 211)", marca: "EBARA", potenciaCv: 25, vazaoMaxM3h: 62.3, hmtMca: 77, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-250 3500 rpm rotor 211 mm, ponto mediano (η≈0,71)" },
  { modelo: "EBARA GS/GSD 50-125 (5 CV, rotor 111)", marca: "EBARA", potenciaCv: 5, vazaoMaxM3h: 59.1, hmtMca: 16, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 111 mm, ponto mediano (η≈0,7)" },
  { modelo: "EBARA GS/GSD 50-125 (7,5 CV, rotor 123)", marca: "EBARA", potenciaCv: 7.5, vazaoMaxM3h: 75.6, hmtMca: 20, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 123 mm, ponto mediano (η≈0,75)" },
  { modelo: "EBARA GS/GSD 50-125 (10 CV, rotor 134)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 90.7, hmtMca: 25, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 134 mm, ponto mediano (η≈0,84)" },
  { modelo: "EBARA GS/GSD 50-125 (15 CV, rotor 144)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 114.3, hmtMca: 26, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 144 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 50-160 (10 CV, rotor 131)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 74.8, hmtMca: 25, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-160 3500 rpm rotor 131 mm, ponto mediano (η≈0,69)" },
  { modelo: "EBARA GS/GSD 50-160 (15 CV, rotor 148)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 78.6, hmtMca: 35, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-160 3500 rpm rotor 148 mm, ponto mediano (η≈0,68)" },
  { modelo: "EBARA GS/GSD 50-160 (20 CV, rotor 164)", marca: "EBARA", potenciaCv: 20, vazaoMaxM3h: 95.7, hmtMca: 47, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-160 3500 rpm rotor 164 mm, ponto mediano (η≈0,83)" },
  { modelo: "EBARA GS/GSD 50-160 (25 CV, rotor 177)", marca: "EBARA", potenciaCv: 25, vazaoMaxM3h: 104, hmtMca: 53, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-160 3500 rpm rotor 177 mm, ponto mediano (η≈0,82)" },
  { modelo: "EBARA GS/GSD 50-200 (25 CV, rotor 171)", marca: "EBARA", potenciaCv: 25, vazaoMaxM3h: 95.1, hmtMca: 52, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-200 3500 rpm rotor 171 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 50-200 (30 CV, rotor 188)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 108.7, hmtMca: 61, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-200 3500 rpm rotor 188 mm, ponto mediano (η≈0,82)" },
  { modelo: "EBARA GS/GSD 50-200 (40 CV, rotor 203)", marca: "EBARA", potenciaCv: 40, vazaoMaxM3h: 102.7, hmtMca: 76, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-200 3500 rpm rotor 203 mm, ponto mediano (η≈0,72)" },
  { modelo: "EBARA GS/GSD 50-200 (50 CV, rotor 219)", marca: "EBARA", potenciaCv: 50, vazaoMaxM3h: 113.4, hmtMca: 85, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-200 3500 rpm rotor 219 mm, ponto mediano (η≈0,71)" },
  { modelo: "EBARA GS/GSD 50-250 (40 CV, rotor 210)", marca: "EBARA", potenciaCv: 40, vazaoMaxM3h: 101.7, hmtMca: 86, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-250 3500 rpm rotor 210 mm, ponto mediano (η≈0,81)" },
  { modelo: "EBARA GS/GSD 65-125 (10 CV, rotor 120)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 107.8, hmtMca: 19, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 65-125 3500 rpm rotor 120 mm, ponto mediano (η≈0,76)" },
  { modelo: "EBARA GS/GSD 65-125 (15 CV, rotor 130)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 132.4, hmtMca: 22, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 65-125 3500 rpm rotor 130 mm, ponto mediano (η≈0,72)" },
  { modelo: "EBARA GS/GSD 65-125 (20 CV, rotor 139)", marca: "EBARA", potenciaCv: 20, vazaoMaxM3h: 158.4, hmtMca: 27, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 65-125 3500 rpm rotor 139 mm, ponto mediano (η≈0,79)" },
  { modelo: "EBARA GS/GSD 65-125 (25 CV, rotor 147)", marca: "EBARA", potenciaCv: 25, vazaoMaxM3h: 161.7, hmtMca: 29, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 65-125 3500 rpm rotor 147 mm, ponto mediano (η≈0,69)" },
  { modelo: "EBARA GS/GSD 65-160 (12,5 CV, rotor 135)", marca: "EBARA", potenciaCv: 12.5, vazaoMaxM3h: 123.3, hmtMca: 23, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-160 3500 rpm rotor 135 mm, ponto mediano (η≈0,84)" },
  { modelo: "EBARA GS/GSD 65-160 (20 CV, rotor 150)", marca: "EBARA", potenciaCv: 20, vazaoMaxM3h: 132.6, hmtMca: 32, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-160 3500 rpm rotor 150 mm, ponto mediano (η≈0,79)" },
  { modelo: "EBARA GS/GSD 65-160 (30 CV, rotor 165)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 142.7, hmtMca: 41, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-160 3500 rpm rotor 165 mm, ponto mediano (η≈0,72)" },
  { modelo: "EBARA GS/GSD 65-160 (40 CV, rotor 177)", marca: "EBARA", potenciaCv: 40, vazaoMaxM3h: 158.2, hmtMca: 50, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-160 3500 rpm rotor 177 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 65-200 (30 CV, rotor 162)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 137.7, hmtMca: 44, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-200 3500 rpm rotor 162 mm, ponto mediano (η≈0,75)" },
  { modelo: "EBARA GS/GSD 65-200 (40 CV, rotor 183)", marca: "EBARA", potenciaCv: 40, vazaoMaxM3h: 145.2, hmtMca: 60, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-200 3500 rpm rotor 183 mm, ponto mediano (η≈0,81)" },
  { modelo: "EBARA GS/GSD 65-200 (60 CV, rotor 203)", marca: "EBARA", potenciaCv: 60, vazaoMaxM3h: 164.6, hmtMca: 76, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-200 3500 rpm rotor 203 mm, ponto mediano (η≈0,77)" },
  { modelo: "EBARA GS/GSD 65-200 (60 CV, rotor 215)", marca: "EBARA", potenciaCv: 60, vazaoMaxM3h: 145.8, hmtMca: 80, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-200 3500 rpm rotor 215 mm, ponto mediano (η≈0,72)" },
  { modelo: "EBARA GS/GSD 65-250 (60 CV, rotor 215)", marca: "EBARA", potenciaCv: 60, vazaoMaxM3h: 169.3, hmtMca: 78, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-250 3500 rpm rotor 215 mm, ponto mediano (η≈0,82)" },
  { modelo: "EBARA GS/GSD 80-160 (20 CV, rotor 147)", marca: "EBARA", potenciaCv: 20, vazaoMaxM3h: 178.7, hmtMca: 23, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 80-160 3500 rpm rotor 147 mm, ponto mediano (η≈0,76)" },
  { modelo: "EBARA GS/GSD 100-160 (30 CV, rotor 149)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 180.9, hmtMca: 31, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 65 — GS 100-160 3500 rpm rotor 149 mm, ponto mediano (η≈0,69)" },
  { modelo: "EBARA GS/GSD 100-160 (40 CV, rotor 156)", marca: "EBARA", potenciaCv: 40, vazaoMaxM3h: 196.1, hmtMca: 35, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 65 — GS 100-160 3500 rpm rotor 156 mm, ponto mediano (η≈0,64)" },
];

// TASK-074 — Transição da lateral telescopada (75→50): tê de redução soldável
// na posição do aspersor de quebra. Custo/venda REAIS (lista mestra, aba VIQUA).
export const TE_REDUCAO_TELESCOPIA_75_50: Conexao = {
  sku: "2090612",
  descricao: "Te redução soldável 75 x 50 - VIQUA",
  marca: "VIQUA",
  unidade: "UN",
  custo: 13.65,
  precoVenda: 22.8,
  diametroMm: 75,
  tipo: "reducao",
};

// Adesivo PVC consumível
export const ADESIVO_PVC: Produto = {
  sku: "1569000",
  descricao: "ADESIVO PLASTICO PVC 175G - PLASTUBOS",
  marca: "PLASTUBOS",
  unidade: "FR",
  custo: 7.51 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
//   - custo: estimado pela TASK-066 (precoVenda ÷ 1,5456) quando o fornecedor não informou — conferir antes de margem final
//   - marca: "" para SKUs 1819000, 1000843, 1000354 — pendente do RT
// ============================================================

export interface KitAspersor5022Item {
  sku: string;
  descricao: string;
  /** Fornecedor; "" quando não informado pelo RT. */
  marca: string;
  unidade: string;
  /** Custo de aquisição não informado — não usar para análise de margem. */
  /** TASK-066: custo de aquisição (estimado ÷1,5456 quando sem dado de fornecedor). */
  custo: number;
  precoVenda: number;
}

export const KIT_ASPERSOR_5022: { dnMm: number; itens: KitAspersor5022Item[] }[] = [
  {
    dnMm: 50,
    itens: [
      { sku: "1819000", descricao: 'Luva PVC BR 3/4"',                      marca: "",      unidade: "unid", custo: 3.88 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */, precoVenda:  6.00 },
      { sku: "1000843", descricao: 'Tubo de Subida PVC BR 3/4" x 3,0 m',   marca: "",      unidade: "unid", custo: 19.57 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */, precoVenda: 30.25 },
      { sku: "1000354", descricao: 'Tee de derivação roscável 50 mm x 3/4"', marca: "",    unidade: "unid", custo: 9.7 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */, precoVenda: 15.00 },
    ],
  },
  {
    dnMm: 75,
    itens: [
      { sku: "1819000", descricao: 'Luva PVC BR 3/4"',                      marca: "",      unidade: "unid", custo: 3.88 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */, precoVenda:  6.00 },
      { sku: "1000843", descricao: 'Tubo de Subida PVC BR 3/4" x 3,0 m',   marca: "",      unidade: "unid", custo: 19.57 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */, precoVenda: 30.25 },
      { sku: "132789",  descricao: 'TE SOLD IRR PN80 DN75 X 1" - PTI',      marca: "PTI",   unidade: "unid", custo: 23.78 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */, precoVenda: 36.75 },
      { sku: "1464000", descricao: 'BUCHA RED. ROSC. 1" X 3/4" - TIGRE',    marca: "TIGRE", unidade: "unid", custo: 3.69 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */, precoVenda:  5.70 },
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

  // TASK-070: a principal não tem filtro de classe por trecho na seleção — manter
  // apenas PN80 aqui (comportamento histórico); PN60 entra nas secundárias via
  // selectSecondaryPipe, que aplica pressureClassRequirement explicitamente.
  const ordenados = [...TUBOS_PVC_RIGIDO]
    .filter((t) => t.pressaoMca >= 80)
    .sort((a, b) => a.diametroMm - b.diametroMm);
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
  { sku: "TIGRE_LF_50_PN40",  descricao: "Tubo PVC LF Ø50mm PN40 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 50,  diametroExternoMm: 50,  espessuraParedeMm: 0.95, diametroInternoMm: 48.1, pressaoMca: 40, metrosPorBarra: 6, custo: 28.4, precoVenda:  52.0, coefC: 140 },
  { sku: "TIGRE_LF_75_PN40",  descricao: "Tubo PVC LF Ø75mm PN40 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 75,  diametroExternoMm: 75,  espessuraParedeMm: 3.0, diametroInternoMm: 69,  pressaoMca: 40, metrosPorBarra: 6, custo: 58.9, precoVenda: 108.0, coefC: 140 },
  { sku: "TIGRE_LF_100_PN40", descricao: "Tubo PVC LF Ø100mm PN40 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 100, diametroExternoMm: 100, espessuraParedeMm: 4.0, diametroInternoMm: 92,  pressaoMca: 40, metrosPorBarra: 6, custo: 98.7, precoVenda: 178.0, coefC: 140 },
] as const;

// PVC RÍGIDO (soldável) — principal e adutora
// diametroMm = diâmetro nominal = externo (OD). Espessuras PN80 ABNT NBR 5647.
export const TUBOS_PVC_RIGIDO = [
  { sku: "TIGRE_R_50_PN80",  descricao: "Tubo PVC rígido Ø50mm PN80 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 50,  diametroNominalMm: 50,  diametroExternoMm: 50,  espessuraParedeMm: 3.0, diametroInternoMm: 44,  pressaoMca: 80, metrosPorBarra: 6, custo:  34.2, precoVenda:  62.0, coefC: 140 },
  { sku: "TIGRE_R_75_PN80",  descricao: "Tubo PVC rígido Ø75mm PN80 - barra 6m",  marca: "Tigre", unidade: "barra", diametroMm: 75,  diametroNominalMm: 75,  diametroExternoMm: 75,  espessuraParedeMm: 4.5, diametroInternoMm: 66,  pressaoMca: 80, metrosPorBarra: 6, custo:  72.1, precoVenda: 132.0, coefC: 140 },
  { sku: "15293527", descricao: "Tubo PVC rígido Ø100mm PN60 DEFOFO - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 100, diametroNominalMm: 100, diametroExternoMm: 100, espessuraParedeMm: 4.6, diametroInternoMm: 90.8, pressaoMca: 60, metrosPorBarra: 6, custo: 176.05, precoVenda: 272.10, coefC: 140 }, // TASK-070: lista mestra 25.08.2025 (custo/venda reais)
  { sku: "TIGRE_R_100_PN80", descricao: "Tubo PVC rígido Ø100mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 100, diametroNominalMm: 100, diametroExternoMm: 100, espessuraParedeMm: 6.0, diametroInternoMm: 88,  pressaoMca: 80, metrosPorBarra: 6, custo: 118.5, precoVenda: 215.0, coefC: 140 },
  { sku: "TIGRE_R_125_PN80", descricao: "Tubo PVC rígido Ø125mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 125, diametroNominalMm: 125, diametroExternoMm: 125, espessuraParedeMm: 7.0, diametroInternoMm: 111, pressaoMca: 80, metrosPorBarra: 6, custo: 178.4, precoVenda: 322.0, coefC: 140 },
  { sku: "15293543", descricao: "Tubo PVC rígido Ø150mm PN60 DEFOFO - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 150, diametroNominalMm: 150, diametroExternoMm: 150, espessuraParedeMm: 6.9, diametroInternoMm: 136.2, pressaoMca: 60, metrosPorBarra: 6, custo: 390.30, precoVenda: 603.25, coefC: 140 }, // TASK-070: lista mestra 25.08.2025 (custo/venda reais)
  { sku: "TIGRE_R_150_PN80", descricao: "Tubo PVC rígido Ø150mm PN80 - barra 6m", marca: "Tigre", unidade: "barra", diametroMm: 150, diametroNominalMm: 150, diametroExternoMm: 150, espessuraParedeMm: 8.5, diametroInternoMm: 133, pressaoMca: 80, metrosPorBarra: 6, custo: 248.9, precoVenda: 448.0, coefC: 140 },
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
    custo: 14.23 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 22.0,
    diametroMm: 50,
    tipo: "curva90",
  },
  {
    sku: "TIGRE_CR_75_PN80",
    descricao: "Curva 90 PVC rígido sold. Ø75mm PN80 - Tigre", // TODO: confirmar preço
    marca: "TIGRE",
    unidade: "UN",
    custo: 24.59 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 38.0,
    diametroMm: 75,
    tipo: "curva90",
  },
  {
    sku: "TIGRE_CR_100_PN80",
    descricao: "Curva 90 PVC rígido sold. Ø100mm PN80 - Tigre", // TODO: confirmar preço
    marca: "TIGRE",
    unidade: "UN",
    custo: 44.0 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 68.0,
    diametroMm: 100,
    tipo: "curva90",
  },
  {
    sku: "1000310",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 125MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 75.25 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
    precoVenda: 116.3,
    diametroMm: 125,
    tipo: "curva90",
  },
  {
    sku: "1118000",
    descricao: "CURVA 90 PTA/BSA IRRIGA-LF PN80 150MM - TIGRE",
    marca: "TIGRE",
    unidade: "UN",
    custo: 84.11 /* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */,
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
