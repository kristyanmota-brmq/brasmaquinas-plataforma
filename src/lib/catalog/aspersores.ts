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
  { modelo: "EBARA GS/GSD 40-200 (20 CV, rotor 172)", marca: "EBARA", potenciaCv: 20, vazaoMaxM3h: 64.1, hmtMca: 54, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 172 mm, ponto mediano (η≈0,64)" },
  { modelo: "EBARA GS/GSD 40-200 (25 CV, rotor 189)", marca: "EBARA", potenciaCv: 25, vazaoMaxM3h: 72.1, hmtMca: 64, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 189 mm, ponto mediano (η≈0,68)" },
  { modelo: "EBARA GS/GSD 40-200 (30 CV, rotor 205)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 77.4, hmtMca: 76, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 205 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 40-200 (30 CV, rotor 219)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 72.4, hmtMca: 88, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-200 3500 rpm rotor 219 mm, ponto mediano (η≈0,79)" },
  { modelo: "EBARA GS/GSD 40-250 (25 CV, rotor 211)", marca: "EBARA", potenciaCv: 25, vazaoMaxM3h: 62.3, hmtMca: 77, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 40-250 3500 rpm rotor 211 mm, ponto mediano (η≈0,71)" },
  { modelo: "EBARA GS/GSD 50-125 (5 CV, rotor 111)", marca: "EBARA", potenciaCv: 5, vazaoMaxM3h: 59.1, hmtMca: 16, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 111 mm, ponto mediano (η≈0,7)" },
  { modelo: "EBARA GS/GSD 50-125 (7,5 CV, rotor 123)", marca: "EBARA", potenciaCv: 7.5, vazaoMaxM3h: 75.6, hmtMca: 20, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 123 mm, ponto mediano (η≈0,75)" },
  { modelo: "EBARA GS/GSD 50-125 (12,5 CV, rotor 134)", marca: "EBARA", potenciaCv: 12.5, vazaoMaxM3h: 90.7, hmtMca: 26, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 134 mm, ponto mediano (η≈0,7)" },
  { modelo: "EBARA GS/GSD 50-125 (15 CV, rotor 144)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 114.3, hmtMca: 26, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 62 — GS 50-125 3500 rpm rotor 144 mm, ponto mediano (η≈0,73)" },
  { modelo: "EBARA GS/GSD 50-160 (10 CV, rotor 131)", marca: "EBARA", potenciaCv: 10, vazaoMaxM3h: 74.8, hmtMca: 25, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-160 3500 rpm rotor 131 mm, ponto mediano (η≈0,69)" },
  { modelo: "EBARA GS/GSD 50-160 (15 CV, rotor 148)", marca: "EBARA", potenciaCv: 15, vazaoMaxM3h: 78.6, hmtMca: 37, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 63 — GS 50-160 3500 rpm rotor 148 mm, ponto mediano (η≈0,72)" },
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
  { modelo: "EBARA GS/GSD 65-160 (30 CV, rotor 165)", marca: "EBARA", potenciaCv: 30, vazaoMaxM3h: 142.7, hmtMca: 44, fonte: "Cat. Produtos Superfície 60Hz 2025 EBAS, pág. 64 — GS 65-160 3500 rpm rotor 165 mm, ponto mediano (η≈0,78)" },
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


// ============================================================
// TASK-086 — Curvas Q-H multiponto (PENDENTE_CONFIRMACAO_RT)
// Tabela completa vazão×altura do fabricante por modelo, pares
// [qM3h, hMca] com q crescente. Mesma fonte/página citada na
// entrada correspondente de BOMBAS_HOMOLOGADAS; invariantes (q
// crescente, h decrescente, ponto nominal contido na curva)
// garantidos por teste (T86-6). Bombas do corpus (IMBIL, GSD
// MEGABLOC) não têm curva — validação retangular (fallback).
// ============================================================
export type CurvaQH = ReadonlyArray<readonly [number, number]>;

export const CURVAS_QH_BOMBAS: Readonly<Record<string, CurvaQH>> = {
  "THEBE R-20 (7,5 CV, rotor 183)": [[55,24.1],[56,22.8],[57,21.6],[58,19.1],[60,16.6],[62,11.3]],
  "THEBE R-20 (10 CV, rotor 192)": [[56,29.6],[57,27.5],[58,22.8],[60,20.1],[62,17.2],[64,13.7]],
  "THEBE R-20 (12,5 CV, rotor 197)": [[52,36.5],[54,35.8],[55,35],[56,34.3],[57,33.5],[58,32.1],[60,30.4],[62,28.7],[64,27],[66,25.1],[68,23.2],[70,20.5],[72,17.5],[74,8]],
  "THEBE R-20 (15 CV, rotor 197)": [[50,37.4],[52,36.5],[54,35.8],[55,35],[56,34.3],[57,33.5],[58,32.1],[60,30.4],[62,28.7],[64,27],[66,25.1],[68,23.2],[70,20.5],[72,17.5],[74,8]],
  "THEBE RL-20B (10 CV, rotor 147)": [[30,55.6],[32,52],[34,47.8],[36,43.2],[38,37.6],[40,30]],
  "THEBE RL-20B (10 CV, rotor 157)": [[44,40.5],[46,34.3],[48,25.2]],
  "THEBE RL-20B (12,5 CV, rotor 157)": [[34,60.3],[36,56.9],[38,53.6],[40,49.7],[42,45.6],[44,40.5],[46,34.3],[48,25.2]],
  "THEBE RL-20B (12,5 CV, rotor 166)": [[48,46.2],[50,41.3],[52,35.6],[54,27.7]],
  "THEBE RL-20B (15 CV, rotor 166)": [[38,63.2],[40,60.3],[42,57.1],[44,53.9],[46,50.1],[48,46.2],[50,41.3],[52,35.6],[54,27.7]],
  "THEBE RL-20B (15 CV, rotor 175)": [[52,50.5],[54,46.8],[56,42.1],[58,36.8],[60,29.9]],
  "THEBE RL-20B (15 CV, rotor 184)": [[64,39.3],[66,33.1],[68,25.1]],
  "THEBE RL-20B (20 CV, rotor 184)": [[52,66.3],[54,63.4],[56,58.9],[58,54],[60,49],[62,44.2],[64,39.3],[66,33.1],[68,25.1]],
  "THEBE RL-20B (20 CV, rotor 192)": [[68,55.4],[70,51.2],[72,46.3],[74,34.6]],
  "THEBE RL-20B (20 CV, rotor 200)": [[78,43.1],[80,25.7]],
  "THEBE RL-20B (25 CV, rotor 200)": [[70,66],[72,62.4],[74,58.8],[76,51.4],[78,43.1]],
  "THEBE THS-18 (3 CV, rotor 123)": [[18,28],[20,25.7],[22,22.9],[24,19.5],[26,14.3]],
  "THEBE THS-18 (3 CV, rotor 128)": [[26,22.5],[28,17.5]],
  "THEBE THS-18 (4 CV, rotor 132)": [[16,34.8],[18,33.1],[20,31.3],[22,29.2],[24,27],[26,24.1],[28,20.8],[30,15.8]],
  "THEBE THS-18 (4 CV, rotor 136)": [[26,28],[28,25.3],[30,22.2],[32,17.8]],
  "THEBE THS-18 (5 CV, rotor 141)": [[22,35.7],[24,34],[26,32.1],[28,30],[30,27.6],[32,24.7],[34,20.8],[36,15]],
  "THEBE THS-18 (5 CV, rotor 147)": [[34,27.5],[36,25.1],[38,21],[40,13.9]],
  "THEBE THS-18 (5 CV, rotor 156)": [[42,18.9],[44,14]],
  "THEBE THS-18 (6 CV, rotor 151)": [[30,35.2],[32,33],[34,30.9],[36,28.3],[38,25.3],[40,21],[42,12.7]],
  "THEBE THS-18 (6 CV, rotor 159)": [[42,27.5],[44,25.9],[46,23.7]],
  "THEBE THS-18 (7,5 CV, rotor 163)": [[38,35.4],[40,33.3],[42,30.6],[44,29.1],[46,23.2],[48,14.4]],
  "THEBE THS-18 (7,5 CV, rotor 168)": [[48,30.2],[50,26.7],[52,21.5]],
  "THEBE THS-18 (10 CV, rotor 172)": [[26,50.1],[28,48.9],[30,47.8],[32,46.6],[34,45.3],[36,43.7],[38,42.2],[40,40.7],[42,38.8],[44,37.8],[46,34.7],[48,31.7],[50,28.7],[52,23.9]],
  "THEBE THS-18 (10 CV, rotor 179)": [[46,40.6],[48,38.6],[50,36.6],[52,33.8],[54,30.8],[56,26.3],[58,18.2]],
  "THEBE THS-18 (12,5 CV, rotor 179)": [[30,55],[32,53.5],[34,52],[36,50],[38,48],[40,46],[42,44.7],[44,44],[46,40.6],[48,38.6],[50,36.6],[52,33.8],[54,30.8],[56,26.3],[58,18.2]],
  "EBARA GS/GSD 32-125 (3 CV, rotor 106)": [[13,19],[17.4,18],[20.7,17],[23.5,16],[25.8,15],[28.1,14],[30.3,13],[32.5,12],[34.7,11]],
  "EBARA GS/GSD 32-125 (4 CV, rotor 119)": [[6.5,26],[19.4,24],[26.3,22],[28.9,21],[31.2,20],[33,19],[34.8,18],[36.1,17],[37.4,16],[38.7,15]],
  "EBARA GS/GSD 32-125 (5 CV, rotor 131)": [[16.9,32],[26.7,30],[32.2,28],[36.4,26],[39.9,24],[42.8,22],[44.2,21]],
  "EBARA GS/GSD 32-125 (6 CV, rotor 142)": [[23.8,36],[30.8,34],[35.6,32],[39.4,30],[42.4,28],[45.4,26],[47.7,24],[50.1,22]],
  "EBARA GS/GSD 32-125.1 (3 CV, rotor 115)": [[15.8,22],[21.7,20],[25.7,18],[27.4,17]],
  "EBARA GS/GSD 32-125.1 (4 CV, rotor 129)": [[17.1,30],[24.1,28],[28.6,26],[32,24]],
  "EBARA GS/GSD 32-125.1 (5 CV, rotor 140)": [[16.3,36],[24.2,34],[28.8,32],[32.4,30]],
  "EBARA GS/GSD 32-160 (6 CV, rotor 139)": [[18.2,36],[23.6,35],[27.4,34],[30.5,33],[32.8,32],[35,31],[36.7,30],[38.5,29]],
  "EBARA GS/GSD 32-160 (7,5 CV, rotor 152)": [[20.6,44],[30.3,42],[33.2,41],[35.8,40],[37.9,39],[40.1,38],[41.8,37],[43.4,36],[45.1,35]],
  "EBARA GS/GSD 32-160 (12,5 CV, rotor 164)": [[29.2,50],[35.2,48],[39.8,46],[43.5,44],[46.6,42],[48.1,41]],
  "EBARA GS/GSD 32-160 (12,5 CV, rotor 177)": [[14.5,59],[28.7,56],[35.7,53],[41.1,50],[44.1,48],[46.9,46],[49.3,44],[51.7,42]],
  "EBARA GS/GSD 32-160.1 (4 CV, rotor 126)": [[10.3,28],[19.3,26],[23.5,24],[26.6,22],[29.1,20]],
  "EBARA GS/GSD 32-160.1 (6 CV, rotor 145)": [[18.7,40],[23.9,38],[27.6,36],[30.6,34],[33.2,32]],
  "EBARA GS/GSD 32-160.1 (7,5 CV, rotor 163)": [[19.7,50],[24.7,48],[28.3,46],[31.4,44],[34.1,42],[36.6,40],[39,38]],
  "EBARA GS/GSD 32-160.1 (10 CV, rotor 177)": [[15.4,60],[24.8,57],[29.7,54],[32.4,52],[34.8,50],[37.1,48],[39.3,46],[41.3,44]],
  "EBARA GS/GSD 32-200 (10 CV, rotor 175)": [[32.1,52],[35.3,50],[38.3,48],[40.9,46],[43.4,44],[45.6,42],[47.8,40]],
  "EBARA GS/GSD 32-200 (12,5 CV, rotor 184)": [[21.4,63],[30.4,60],[36.3,57],[41.1,54],[43.7,52],[46.3,50],[48.6,48],[50.9,46],[53.1,44]],
  "EBARA GS/GSD 32-200 (15 CV, rotor 197)": [[26.8,72],[34.4,69],[40.1,66],[44.9,63],[48.9,60],[52.6,57],[56,54]],
  "EBARA GS/GSD 32-200 (15 CV, rotor 208)": [[11,84],[28.6,81],[36,78],[41.7,75],[46.2,72],[50.2,69],[53.8,66],[57.2,63],[60.2,60]],
  "EBARA GS/GSD 32-200 (20 CV, rotor 219)": [[29.1,90],[37.4,87],[43.2,84],[48,81],[52.4,78],[55.9,75],[59.4,72],[62.3,69],[65.1,66]],
  "EBARA GS/GSD 32-200.1 (5 CV, rotor 172)": [[13.5,50],[18.9,47],[22.5,44],[25.4,41],[27,39],[28.5,37],[29.9,35],[31.2,33],[32.4,31],[33.5,29],[34.5,27],[35.6,25]],
  "EBARA GS/GSD 32-200.1 (7,5 CV, rotor 184)": [[5.9,61],[13.1,59],[18.8,56],[22.9,53],[26,50],[28.6,47],[30.9,44],[32.9,41],[34.1,39],[35.2,37],[36.3,35],[37.3,33],[38.2,31],[39.2,29]],
  "EBARA GS/GSD 32-200.1 (10 CV, rotor 196)": [[11.5,69],[16.2,67],[19.7,65],[22.4,63],[24.8,61],[26.9,59],[29.6,56],[32,53],[34.1,50],[35.9,47],[37.7,44],[39.2,41],[40.2,39],[41.1,37],[42,35],[43,33]],
  "EBARA GS/GSD 32-200.1 (10 CV, rotor 207)": [[17.8,75],[21.3,73],[24.1,71],[26.7,69],[28.7,67],[30.8,65],[32.5,63],[34,61],[35.6,59],[37.5,56],[39.3,53],[41,50],[42.5,47],[43.7,44],[45,41],[45.8,39],[46.6,37]],
  "EBARA GS/GSD 32-250 (10 CV, rotor 198)": [[12.4,76],[22.8,72],[29.2,68],[33.9,64],[37.7,60]],
  "EBARA GS/GSD 32-250 (12,5 CV, rotor 222)": [[15.6,96],[25.4,92],[31.7,88],[36.5,84],[40.3,80]],
  "EBARA GS/GSD 40-125 (3 CV, rotor 105)": [[15,19],[30,17],[38.7,15],[45.5,13],[51.3,11]],
  "EBARA GS/GSD 40-125 (5 CV, rotor 119)": [[24,25],[35.6,23],[43.5,21],[50,19],[55.5,17]],
  "EBARA GS/GSD 40-125 (7,5 CV, rotor 131)": [[36.6,31],[47,29],[54.5,27],[60.9,25],[66.2,23]],
  "EBARA GS/GSD 40-125 (10 CV, rotor 142)": [[36.5,37],[47.7,35],[55.4,33],[61.7,31],[67.3,29],[72.4,27]],
  "EBARA GS/GSD 40-160 (7,5 CV, rotor 134)": [[18.6,34],[34,32],[43.5,30],[50.8,28],[56.8,26],[61.7,24],[66,22],[69.8,20]],
  "EBARA GS/GSD 40-160 (10 CV, rotor 150)": [[11.7,44],[35.6,42],[46.7,40],[54.7,38],[61.1,36],[66.1,34],[70.9,32],[74.7,30],[78.4,28]],
  "EBARA GS/GSD 40-160 (15 CV, rotor 163)": [[35.4,52],[50.1,50],[59.5,48],[66.3,46],[71.9,44],[77,42],[81.2,40],[85.1,38]],
  "EBARA GS/GSD 40-160 (20 CV, rotor 177)": [[11.8,62],[40.3,60],[53.1,58],[61.8,56],[68.6,54],[74.7,52],[79.3,50],[83.8,48],[87.8,46],[91.3,44],[94.8,42]],
  "EBARA GS/GSD 40-200 (20 CV, rotor 172)": [[18.3,60],[46.3,58],[56.7,56],[64.1,54],[70.2,52],[75.4,50]],
  "EBARA GS/GSD 40-200 (25 CV, rotor 189)": [[48.2,70],[58.4,68],[66.1,66],[72.1,64],[77.4,62],[82.1,60]],
  "EBARA GS/GSD 40-200 (30 CV, rotor 205)": [[36.2,85],[56.5,82],[68.5,79],[77.4,76],[84.8,73],[91.2,70]],
  "EBARA GS/GSD 40-200 (30 CV, rotor 219)": [[15.5,97],[49.6,94],[63.1,91],[72.4,88],[79.8,85],[86.5,82],[91.9,79]],
  "EBARA GS/GSD 40-250 (25 CV, rotor 211)": [[34.5,88],[47.7,84],[56.8,80],[62.3,77],[67.2,74],[71.5,71]],
  "EBARA GS/GSD 50-125 (5 CV, rotor 111)": [[8,21],[25.7,20],[38,19],[46.4,18],[53.1,17],[59.1,16],[64.7,15],[69.9,14],[75,13],[80.3,12]],
  "EBARA GS/GSD 50-125 (7,5 CV, rotor 123)": [[27.7,26],[40.8,25],[50,24],[57.7,23],[64.4,22],[70.2,21],[75.6,20],[80.6,19],[85.2,18],[89.7,17],[93.8,16],[97.8,15]],
  "EBARA GS/GSD 50-125 (12,5 CV, rotor 134)": [[41.9,32],[65,30],[72.6,29],[79.3,28],[85.2,27],[90.7,26],[95.3,25],[99.9,24],[104,23],[107.8,22],[111.5,21]],
  "EBARA GS/GSD 50-125 (15 CV, rotor 144)": [[30.8,38],[64.8,36],[81.9,34],[93,32],[102,30],[105.1,29],[108.2,28],[111.3,27],[114.3,26],[116.9,25],[119,24],[121.1,23],[123.2,22],[125.4,21],[127.5,20],[129.6,19]],
  "EBARA GS/GSD 50-160 (10 CV, rotor 131)": [[36.7,31],[53.1,29],[65.1,27],[74.8,25],[83.2,23],[90.8,21],[97.5,19]],
  "EBARA GS/GSD 50-160 (15 CV, rotor 148)": [[26.5,43],[54,41],[68,39],[78.6,37],[87.5,35],[95.4,33],[102.2,31]],
  "EBARA GS/GSD 50-160 (20 CV, rotor 164)": [[57.3,53],[74.8,51],[86.2,49],[95.7,47],[104.3,45],[111.2,43],[118,41]],
  "EBARA GS/GSD 50-160 (25 CV, rotor 177)": [[35.6,63],[59.7,61],[74.9,59],[86.3,57],[95.5,55],[104,53],[111,51],[118,49],[123.6,47],[129.3,45]],
  "EBARA GS/GSD 50-200 (25 CV, rotor 171)": [[57.6,58],[75.6,56],[86.7,54],[95.1,52],[102.7,50],[108.6,48]],
  "EBARA GS/GSD 50-200 (30 CV, rotor 188)": [[66.2,70],[85.3,67],[98.3,64],[108.7,61],[116.7,58],[121.8,56]],
  "EBARA GS/GSD 50-200 (40 CV, rotor 203)": [[34.8,85],[72.2,82],[89.8,79],[102.7,76],[112.9,73],[121.3,70],[128.9,67]],
  "EBARA GS/GSD 50-200 (50 CV, rotor 219)": [[55.4,97],[80,94],[93.9,91],[105,88],[113.4,85],[121.8,82],[129.4,79],[136,76],[142,73]],
  "EBARA GS/GSD 50-250 (40 CV, rotor 210)": [[38.9,94],[70.7,92],[84.3,90],[94.4,88],[101.7,86],[108.7,84],[114.5,82],[120.2,80]],
  "EBARA GS/GSD 65-125 (10 CV, rotor 120)": [[21.7,24],[47.1,23],[65.6,22],[81.4,21],[95.3,20],[107.8,19],[119.3,18],[129.1,17],[138.1,16],[146.1,15]],
  "EBARA GS/GSD 65-125 (15 CV, rotor 130)": [[22.3,28],[62.7,27],[83.5,26],[98.7,25],[111.7,24],[122.9,23],[132.4,22],[141,21],[149.1,20],[155.7,19],[162.2,18],[168.8,17]],
  "EBARA GS/GSD 65-125 (20 CV, rotor 139)": [[108.1,32],[133.8,30],[143.2,29],[150.8,28],[158.4,27],[165.1,26],[170.6,25],[176.1,24],[181.6,23]],
  "EBARA GS/GSD 65-125 (25 CV, rotor 147)": [[55.1,38],[102.9,36],[125.4,34],[142.1,32],[155.4,30],[161.7,29],[168,28],[173.3,27],[178.5,26],[183.7,25],[188.8,24]],
  "EBARA GS/GSD 65-160 (12,5 CV, rotor 135)": [[9.5,32],[62.6,29],[99.4,26],[123.3,23],[142.9,20],[161.1,17]],
  "EBARA GS/GSD 65-160 (20 CV, rotor 150)": [[68.4,38],[107.4,35],[132.6,32],[152.4,29]],
  "EBARA GS/GSD 65-160 (30 CV, rotor 165)": [[3.5,50],[110.8,47],[142.7,44],[163.8,41],[180.4,38]],
  "EBARA GS/GSD 65-160 (40 CV, rotor 177)": [[83.8,56],[132.8,53],[158.2,50],[177,47],[191.6,44]],
  "EBARA GS/GSD 65-200 (30 CV, rotor 162)": [[58,50],[100.8,48],[122.3,46],[137.7,44],[150.4,42],[161,40]],
  "EBARA GS/GSD 65-200 (40 CV, rotor 183)": [[92.9,64],[126.7,62],[145.2,60],[159.1,58],[170.3,56]],
  "EBARA GS/GSD 65-200 (60 CV, rotor 203)": [[125.6,80],[150.6,78],[164.6,76],[175.6,74],[184.3,72]],
  "EBARA GS/GSD 65-200 (60 CV, rotor 215)": [[76.8,89],[101.9,88],[117,86],[128.3,84],[137.9,82],[145.8,80],[160.3,78],[172.1,76],[182.9,74],[192.3,72]],
  "EBARA GS/GSD 65-250 (60 CV, rotor 215)": [[86.5,88],[115.7,86],[134.4,84],[147.8,82],[160.2,80],[169.3,78],[178.4,76],[186,74],[192.7,72],[199.4,70]],
  "EBARA GS/GSD 80-160 (20 CV, rotor 147)": [[73.3,29],[117.1,27],[150,25],[178.7,23],[205.2,21],[230.6,19]],
  "EBARA GS/GSD 100-160 (30 CV, rotor 149)": [[66.1,39],[101.8,37],[130.9,35],[157.1,33],[180.9,31],[204.2,29],[226.4,27],[247.8,25],[268.4,23]],
  "EBARA GS/GSD 100-160 (40 CV, rotor 156)": [[72.7,43],[111.5,41],[143.6,39],[170.8,37],[196.1,35],[219.8,33],[241.9,31],[263,29],[283,27]],
};

/** Curva Q-H do fabricante para o modelo, se transcrita (TASK-086). */
export function getCurvaQHBomba(modelo: string): CurvaQH | undefined {
  return CURVAS_QH_BOMBAS[modelo];
}

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
export function selectTubo(
  vazaoM3PorHora: number,
  /**
   * TASK-085R (RT rev.2): "a classe de pressão da principal/adutora precisa
   * ser CALCULADA". Quando informada, seleciona a MENOR classe (PN) que cobre
   * a pressão operacional requerida (mca) — sem superdimensionar. Sem o
   * parâmetro, preserva o comportamento histórico (PN80).
   */
  pressaoRequeridaMca?: number,
): (typeof TUBOS_PVC_RIGIDO)[number] {
  const Q_m3s = vazaoM3PorHora / 3600;
  const V = 1.5;
  // D_mm é o diâmetro interno mínimo que garante v ≤ 1,5 m/s.
  const D_mm = Math.sqrt((4 * Q_m3s) / (Math.PI * V)) * 1000;

  const classeMinima = pressaoRequeridaMca ?? 80;
  // Candidatos: classe suficiente para a pressão; entre os que atendem o
  // diâmetro, vence o de MENOR custo (classe menor = mais barato).
  const candidatos = [...TUBOS_PVC_RIGIDO]
    .filter((t) => t.pressaoMca >= classeMinima)
    .sort((a, b) => a.diametroMm - b.diametroMm || a.precoVenda - b.precoVenda);
  const atende = candidatos.filter((t) => t.diametroInternoMm >= D_mm);
  if (atende.length > 0) {
    return atende.reduce((melhor, t) => (t.precoVenda < melhor.precoVenda ? t : melhor), atende[0]);
  }
  return candidatos[candidatos.length - 1] ?? TUBOS_PVC_RIGIDO[TUBOS_PVC_RIGIDO.length - 1];
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
