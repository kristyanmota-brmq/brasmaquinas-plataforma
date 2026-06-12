import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { IrrigationProjectResult } from "@/lib/layout/irrigation-project";
import { mapSizedSecondariesToRows } from "@/lib/pdf/secondary-rows";

const C = {
  ink: "#0A0A0A",
  ink2: "#3D3D3D",
  ink3: "#717171",
  border: "#E5E5E5",
  accent: "#094641",
  bg: "#F7F7F5",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.ink,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: C.white,
  },
  // ── Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 1,
  },
  docType: {
    fontSize: 8,
    color: C.ink3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end" },
  headerDate: { fontSize: 8, color: C.ink3 },
  // ── Project info block ──────────────────────────────────
  infoBlock: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: C.bg,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 7, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.ink },
  // ── Section title ───────────────────────────────────────
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 14,
  },
  // ── Summary grid ────────────────────────────────────────
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  summaryCell: {
    width: "31%",
    backgroundColor: C.bg,
    borderRadius: 3,
    padding: 8,
  },
  summaryCellLabel: { fontSize: 7, color: C.ink3, marginBottom: 2 },
  summaryCellValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.ink },
  summaryCellUnit: { fontSize: 7, color: C.ink3 },
  // ── Table ───────────────────────────────────────────────
  table: { width: "100%", marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.accent,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableHeaderText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white, textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRowAlt: { backgroundColor: "#FAFAF9" },
  tableCell: { fontSize: 8, color: C.ink2 },
  tableCellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink },
  colDesc: { flex: 1 },
  colMarca: { width: 52 },
  colUn: { width: 24, textAlign: "center" },
  colQtd: { width: 32, textAlign: "right" },
  colPreco: { width: 60, textAlign: "right" },
  colTotal: { width: 64, textAlign: "right" },
  // ── Total row ───────────────────────────────────────────
  totalRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: C.accent,
    borderRadius: 3,
    marginTop: 2,
  },
  totalLabel: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: C.white },
  totalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.white },
  // ── Footer (page 1) ─────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.ink3 },
  pageNumber: { fontSize: 7, color: C.ink3 },
  // ── Layout page (page 2) ────────────────────────────────
  layoutPage: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: C.ink,
    padding: 0,
    backgroundColor: C.white,
    flexDirection: "column",
  },
  mapWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  // Cartela (title block) at the bottom — inspired by the reference PDF
  cartela: {
    height: 88,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.ink,
  },
  cartelaMain: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: C.ink,
  },
  cartelaRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cartelaRowLast: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cartelaLabel: { fontSize: 6.5, color: C.ink3, width: 64 },
  cartelaValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink, flex: 1 },
  cartelaRight: {
    width: 130,
    flexDirection: "column",
  },
  cartelaRightTop: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
  },
  cartelaRightBottom: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 6,
  },
  brandLarge: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 7,
    color: C.accent,
    letterSpacing: 0.3,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 6.5, color: C.ink3 },
  metaValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 1 },
  // ── Tabela de ramais (TASK-047) ──────────────────────────
  colRamal: { width: 44 },
  colSku: { width: 90 },
  colDN: { width: 58, textAlign: "center" },
  colLen: { width: 64, textAlign: "right" },
  colVel: { width: 60, textAlign: "right" },
  colHf: { width: 56, textAlign: "right", paddingRight: 10 },
  colStatus: { flex: 1, paddingLeft: 8 },
  statusBadgeOk: { fontSize: 7, color: C.ink3 },
  statusBadgeWarn: { fontSize: 7.5, color: "#92400E", fontFamily: "Helvetica-Bold" },
});

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtN(n: number, dec = 1) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

interface Props {
  projectName: string;
  client?: string;
  city?: string;
  state?: string;
  result: IrrigationProjectResult;
  geradoEm: string;
  mapImage?: string | null;
}

const hmtStatusLabel: Record<string, string> = {
  blocked_invalid_segments: "BLOQUEADO — segmentos inválidos",
  technical_review_required: "Revisão técnica necessária",
  hydraulic_precheck_ok: "Pré-verificação hidráulica OK",
};

export function PropostaPDF({ projectName, client, city, state, result, geradoEm, mapImage }: Props) {
  const { layout, bom } = result;
  if (!bom) return null;
  const { sprinklers, sectorization, mainPipeline, areaHectares, geodetic } = layout;

  const categorias: Array<"ASPERSOR" | "TUBO" | "CONEXAO" | "ACESSORIO"> = [
    "ASPERSOR",
    "TUBO",
    "CONEXAO",
    "ACESSORIO",
  ];
  const categoriaLabel: Record<string, string> = {
    ASPERSOR: "Aspersores",
    TUBO: "Tubulações",
    CONEXAO: "Conexões",
    ACESSORIO: "Acessórios",
  };

  const localidade = [city, state].filter(Boolean).join(" - ");

  return (
    <Document title={`Proposta — ${projectName}`} author="Brasmáquinas">

      {/* ── Página 1: Proposta / BOM ── */}
      <Page size="A4" style={s.page}>
        <View style={s.headerRow} fixed>
          <View>
            <Text style={s.brandName}>BRASMÁQUINAS</Text>
            <Text style={s.docType}>Proposta de Irrigação Convencional</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>{geradoEm}</Text>
          </View>
        </View>

        <View style={s.infoBlock}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Projeto</Text>
            <Text style={s.infoValue}>{projectName}</Text>
          </View>
          {client && (
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>{client}</Text>
            </View>
          )}
          {localidade && (
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Localização</Text>
              <Text style={s.infoValue}>{localidade}</Text>
            </View>
          )}
        </View>

        <Text style={s.sectionTitle}>Resumo Técnico</Text>
        <View style={s.summaryGrid}>
          {areaHectares && (
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Área irrigada</Text>
              <Text style={s.summaryCellValue}>{fmtN(areaHectares, 2)}</Text>
              <Text style={s.summaryCellUnit}>ha</Text>
            </View>
          )}
          {sprinklers && (
            <>
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Aspersores</Text>
                <Text style={s.summaryCellValue}>{sprinklers.count}</Text>
                <Text style={s.summaryCellUnit}>unidades</Text>
              </View>
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Espaçamento</Text>
                <Text style={s.summaryCellValue}>{fmtN(sprinklers.espacamentoM, 0)}</Text>
                <Text style={s.summaryCellUnit}>m entre aspersores</Text>
              </View>
            </>
          )}
          {/* TASK-063: dados agronômicos no padrão das propostas reais (corpus 2026-06-11) */}
          {sectorization && (
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Cultura</Text>
              <Text style={s.summaryCellValue}>{sectorization.cultura ?? "—"}</Text>
              <Text style={s.summaryCellUnit}>
                {sectorization.cultura ? "informada pelo projetista" : "não informada"}
              </Text>
            </View>
          )}
          {sectorization && (
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Lâmina desejada</Text>
              <Text style={s.summaryCellValue}>{fmtN(sectorization.laminaMm, 1)}</Text>
              <Text style={s.summaryCellUnit}>mm/dia</Text>
            </View>
          )}
          {result.agronomy && (
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Intensidade de aplicação</Text>
              <Text style={s.summaryCellValue}>{fmtN(result.agronomy.intensidadeAplicacaoMmH, 2)}</Text>
              <Text style={s.summaryCellUnit}>mm/h no arranjo atual</Text>
            </View>
          )}
          {sectorization && (
            <>
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Setores</Text>
                <Text style={s.summaryCellValue}>{sectorization.setoresCount}</Text>
                <Text style={s.summaryCellUnit}>
                  {bom.meta.aspersoresPorSetorMin === bom.meta.aspersoresPorSetorMax
                    ? `${bom.meta.aspersoresPorSetorMin} asp/setor`
                    : `${bom.meta.aspersoresPorSetorMin}–${bom.meta.aspersoresPorSetorMax} asp  •  média ${fmtN(bom.meta.aspersoresPorSetorMedia, 0)}`
                  }
                </Text>
              </View>
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Tempo por setor</Text>
                <Text style={s.summaryCellValue}>{sectorization.tempoPorSetorMinutos}</Text>
                <Text style={s.summaryCellUnit}>min ({sectorization.jornadaHoras}h/dia)</Text>
              </View>
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Vazão por setor</Text>
                <Text style={s.summaryCellValue}>
                  {bom.meta.vazaoPorSetorMin === bom.meta.vazaoPorSetorMax
                    ? fmtN(bom.meta.vazaoPorSetorMin, 1)
                    : `${fmtN(bom.meta.vazaoPorSetorMin, 1)}–${fmtN(bom.meta.vazaoPorSetorMax, 1)}`
                  }
                </Text>
                <Text style={s.summaryCellUnit}>
                  m³/h{bom.meta.vazaoPorSetorMin !== bom.meta.vazaoPorSetorMax
                    ? `  •  média ${fmtN(bom.meta.aspersoresPorSetorMedia * (sectorization.vazaoPorSetorM3PorHora / sectorization.aspersoresPorSetor), 1)}`
                    : ""
                  }
                </Text>
              </View>
            </>
          )}
          {mainPipeline && (
            <>
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Tubulação principal</Text>
                <Text style={s.summaryCellValue}>{fmtN(mainPipeline.lengthMeters, 0)}</Text>
                <Text style={s.summaryCellUnit}>m  •  Ø {bom.meta.diametroPrincipalMm} mm</Text>
              </View>
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Laterais</Text>
                <Text style={s.summaryCellValue}>{fmtN(bom.meta.comprimentoLateraisM, 0)}</Text>
                <Text style={s.summaryCellUnit}>
                  {`m  •  ${bom.meta.nColunasLaterais} físicas  /  ${bom.meta.operationalSegmentsCount} trechos op.`}
                </Text>
              </View>
              {bom.meta.physicalColumnsSplitCount > 0 && (
                <View style={s.summaryCell}>
                  <Text style={s.summaryCellLabel}>Laterais físicas divididas</Text>
                  <Text style={s.summaryCellValue}>{bom.meta.physicalColumnsSplitCount}</Text>
                  <Text style={s.summaryCellUnit}>
                    {`de ${bom.meta.nColunasLaterais}  •  ${bom.meta.operationalSegmentsCount} trechos op.`}
                  </Text>
                </View>
              )}
              {bom.meta.splitControlPointsCount > 0 && bom.meta.splitControlPointsCount !== bom.meta.physicalColumnsSplitCount && (
                <View style={s.summaryCell}>
                  <Text style={s.summaryCellLabel}>Pontos de corte operacional</Text>
                  <Text style={s.summaryCellValue}>{bom.meta.splitControlPointsCount}</Text>
                  <Text style={s.summaryCellUnit}>
                    {`corte${bom.meta.splitControlPointsCount > 1 ? "s" : ""} entre trechos  •  ${bom.meta.physicalColumnsSplitCount} lateral${bom.meta.physicalColumnsSplitCount > 1 ? "is" : ""} dividida${bom.meta.physicalColumnsSplitCount > 1 ? "s" : ""}`}
                  </Text>
                </View>
              )}
              {bom.meta.pendingControlPointsCount > 0 && (
                <View style={[s.summaryCell, { backgroundColor: bom.meta.independentFeedRequiredCount > 0 ? "#FEE2E2" : "#FEF9C3" }]}>
                  <Text style={s.summaryCellLabel}>
                    {bom.meta.independentFeedRequiredCount > 0 ? "BLOQUEADO — alimentação" : "PENDENTE — controle"}
                  </Text>
                  <Text style={s.summaryCellValue}>{bom.meta.pendingControlPointsCount}</Text>
                  <Text style={s.summaryCellUnit}>
                    {bom.meta.independentFeedRequiredCount > 0
                      ? `${bom.meta.independentFeedRequiredCount} trecho${bom.meta.independentFeedRequiredCount > 1 ? "s" : ""} sem alimentação física  •  redesenho necessário`
                      : `ponto${bom.meta.pendingControlPointsCount > 1 ? "s" : ""} de controle pendente${bom.meta.pendingControlPointsCount > 1 ? "s" : ""}  •  validar antes da emissão`}
                  </Text>
                </View>
              )}
            </>
          )}
          {bom.meta.comprimentoAdutoraM > 0 && (
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Adutora</Text>
              <Text style={s.summaryCellValue}>{fmtN(bom.meta.comprimentoAdutoraM, 0)}</Text>
              <Text style={s.summaryCellUnit}>m  •  Ø {bom.meta.diametroPrincipalMm} mm</Text>
            </View>
          )}
          {geodetic?.distanceSourceToAreaMeters && (
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Dist. captação → centróide</Text>
              <Text style={s.summaryCellValue}>{fmtN(geodetic.distanceSourceToAreaMeters, 0)}</Text>
              <Text style={s.summaryCellUnit}>m (referência)</Text>
            </View>
          )}
        </View>

        {/* ── Status do traçado de tubulação ── */}
        {mainPipeline && (
          <>
            <Text style={s.sectionTitle}>Status do Traçado de Tubulação</Text>
            {/* Linha 1: comprimentos reais por camada */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
              <View style={[s.summaryCell, { flex: 1 }]}>
                <Text style={s.summaryCellLabel}>Adutora</Text>
                <Text style={s.summaryCellValue}>
                  {bom.meta.comprimentoAdutoraM > 0
                    ? `${bom.meta.comprimentoAdutoraM.toFixed(0)} m`
                    : "—"}
                </Text>
                <Text style={s.summaryCellUnit}>captação → área  •  Ø {bom.meta.diametroPrincipalMm} mm</Text>
              </View>
              <View style={[s.summaryCell, { flex: 1 }]}>
                <Text style={s.summaryCellLabel}>Principal</Text>
                <Text style={s.summaryCellValue}>{mainPipeline.lengthMeters.toFixed(0)} m</Text>
                <Text style={s.summaryCellUnit}>tronco principal  •  Ø {bom.meta.diametroPrincipalMm} mm</Text>
              </View>
              <View style={[s.summaryCell, { flex: 1, backgroundColor: bom.meta.comprimentoSecundariasM > 0 ? "#ECFDF5" : undefined }]}>
                <Text style={s.summaryCellLabel}>Secundárias / Ramais</Text>
                <Text style={s.summaryCellValue}>
                  {bom.meta.comprimentoSecundariasM > 0
                    ? `${bom.meta.comprimentoSecundariasM.toFixed(0)} m`
                    : "0 m"}
                </Text>
                <Text style={s.summaryCellUnit}>
                  {bom.meta.comprimentoSecundariasM > 0
                    ? "principal → lateral_inlet  •  gerado automaticamente"
                    : "laterais tocam a principal diretamente"}
                </Text>
              </View>
              <View style={[s.summaryCell, { flex: 1 }]}>
                <Text style={s.summaryCellLabel}>Laterais físicas</Text>
                <Text style={s.summaryCellValue}>{bom.meta.comprimentoLateraisM.toFixed(0)} m</Text>
                <Text style={s.summaryCellUnit}>{bom.meta.nColunasLaterais} colunas  •  {bom.meta.operationalSegmentsCount} trechos op.</Text>
              </View>
            </View>
            {/* Linha 2: validação do corredor */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
              <View style={[s.summaryCell, { flex: 1 }]}>
                <Text style={s.summaryCellLabel}>Origem do traçado</Text>
                <Text style={s.summaryCellValue}>
                  {mainPipeline.source === "manual" ? "Manual" : "Automático"}
                </Text>
                <Text style={s.summaryCellUnit}>
                  {mainPipeline.source === "manual" ? "Corredor desenhado pelo projetista" : "Gerado pelo algoritmo"}
                </Text>
              </View>
              <View style={[s.summaryCell, { flex: 1 }]}>
                <Text style={s.summaryCellLabel}>Validação de corredor</Text>
                <Text style={[s.summaryCellValue, { color: mainPipeline.corridorValidated ? C.accent : "#B45309" }]}>
                  {mainPipeline.corridorValidated ? "Validado" : "Pendente"}
                </Text>
                <Text style={s.summaryCellUnit}>
                  {mainPipeline.corridorValidated
                    ? "Corredor aprovado em campo"
                    : "Validar antes da emissão final"}
                </Text>
              </View>
              <View style={[s.summaryCell, { flex: 2 }]} />
            </View>
            {!mainPipeline.corridorValidated && mainPipeline.source === "auto" && (
              <View style={{
                backgroundColor: "#FFFBEB",
                borderWidth: 1,
                borderColor: "#D97706",
                borderRadius: 3,
                padding: 8,
                marginBottom: 10,
              }}>
                <Text style={{ fontSize: 7.5, color: "#92400E", fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                  Traçado automático de tubulação — Validação pendente
                </Text>
                <Text style={{ fontSize: 7, color: "#92400E" }}>
                  Validar corredor de instalação, curvas, pontos de controle e interferências antes da emissão final da proposta.
                </Text>
              </View>
            )}
          </>
        )}

        {categorias.map((cat) => {
          const itens = bom.itens.filter((i) => i.categoria === cat);
          if (itens.length === 0) return null;
          return (
            <View key={cat}>
              <Text style={s.sectionTitle}>{categoriaLabel[cat]}</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderText, s.colDesc]}>Descrição</Text>
                  <Text style={[s.tableHeaderText, s.colMarca]}>Marca</Text>
                  <Text style={[s.tableHeaderText, s.colUn]}>Un</Text>
                  <Text style={[s.tableHeaderText, s.colQtd]}>Qtd</Text>
                  <Text style={[s.tableHeaderText, s.colPreco]}>Preço unit.</Text>
                  <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
                </View>
                {itens.map((item, i) => (
                  <View key={`${item.sku}-${i}`} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                    <Text style={[s.tableCell, s.colDesc]}>{item.descricao}</Text>
                    <Text style={[s.tableCell, s.colMarca]}>{item.marca}</Text>
                    <Text style={[s.tableCell, s.colUn]}>{item.unidade}</Text>
                    <Text style={[s.tableCell, s.colQtd]}>{item.quantidade}</Text>
                    <Text style={[s.tableCell, s.colPreco]}>R$ {fmt(item.precoUnitario)}</Text>
                    <Text style={[s.tableCellBold, s.colTotal]}>R$ {fmt(item.total)}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL GERAL</Text>
          <Text style={s.totalValue}>R$ {fmt(bom.totalGeral)}</Text>
        </View>

        {/* TASK-063: disclaimer comercial — mesma nota exibida na plataforma */}
        <Text style={{ fontSize: 7, color: C.ink3, marginTop: 6, fontStyle: "italic" }}>
          Valores estimados conforme catálogo Brasmáquinas. Conjunto moto-bomba, sucção,
          materiais elétricos, filtragem, frete e instalação não inclusos nesta etapa.
          Documento gerado automaticamente pela plataforma — sujeito a revisão técnica
          e comercial antes da emissão final.
        </Text>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Brasmáquinas — Proposta de Irrigação Convencional</Text>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>

      {/* ── Página 2: Layout da área ── */}
      {mapImage && (
        <Page size="A4" orientation="landscape" style={s.layoutPage}>
          {/* Mapa ocupa todo o espaço acima da cartela */}
          <View style={s.mapWrapper}>
            <Image src={mapImage} style={s.mapImage} />
          </View>

          {/* Cartela inferior — mesma linguagem do layout de referência */}
          <View style={s.cartela}>
            {/* Coluna esquerda: dados do projeto */}
            <View style={s.cartelaMain}>
              <View style={s.metaGrid}>
                {areaHectares && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>ÁREA IRRIGADA</Text>
                    <Text style={s.metaValue}>{fmtN(areaHectares, 2)} ha</Text>
                  </View>
                )}
                {sprinklers && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>ASPERSORES</Text>
                    <Text style={s.metaValue}>{sprinklers.count} un</Text>
                  </View>
                )}
                {sectorization && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>SETORES</Text>
                    <Text style={s.metaValue}>{sectorization.setoresCount}</Text>
                  </View>
                )}
                {mainPipeline && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>TUBULAÇÃO PRINCIPAL</Text>
                    <Text style={s.metaValue}>{fmtN(mainPipeline.lengthMeters, 0)} m</Text>
                  </View>
                )}
              </View>

              <View style={s.cartelaRow}>
                <Text style={s.cartelaLabel}>PROPRIEDADE</Text>
                <Text style={s.cartelaValue}>{projectName}</Text>
              </View>
              {client && (
                <View style={s.cartelaRow}>
                  <Text style={s.cartelaLabel}>CLIENTE</Text>
                  <Text style={s.cartelaValue}>{client}</Text>
                </View>
              )}
              {localidade && (
                <View style={s.cartelaRow}>
                  <Text style={s.cartelaLabel}>MUNICÍPIO</Text>
                  <Text style={s.cartelaValue}>{localidade}</Text>
                </View>
              )}
              <View style={s.cartelaRowLast}>
                <Text style={s.cartelaLabel}>DESENHO</Text>
                <Text style={s.cartelaValue}>Layout de projeto</Text>
                <Text style={s.cartelaLabel}>DATA</Text>
                <Text style={s.cartelaValue}>{geradoEm}</Text>
                <Text style={s.cartelaLabel}>FOLHA</Text>
                <Text style={s.cartelaValue}>
                  <Text
                    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                  />
                </Text>
              </View>
            </View>

            {/* Coluna direita: logo */}
            <View style={s.cartelaRight}>
              <View style={s.cartelaRightTop}>
                <Text style={s.brandLarge}>BRAS</Text>
                <Text style={s.brandLarge}>MÁQUINAS</Text>
                <Text style={s.brandSub}>Irrigação & Automação</Text>
              </View>
              <View style={s.cartelaRightBottom}>
                <Text style={{ fontSize: 7, color: C.ink3 }}>brasmaquinas.com.br</Text>
              </View>
            </View>
          </View>
        </Page>
      )}

      {/* ── Página 3: Memorial Hidráulico ── */}
      {result.hydraulics && (
        <Page size="A4" style={s.page}>
          <View style={s.headerRow} fixed>
            <View>
              <Text style={s.brandName}>BRASMÁQUINAS</Text>
              <Text style={s.docType}>Memorial Hidráulico</Text>
            </View>
            <View style={s.headerRight}>
              <Text style={s.headerDate}>{geradoEm}</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Parâmetros de Dimensionamento</Text>
          <View style={s.summaryGrid}>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Modo de operação</Text>
              <Text style={s.summaryCellValue}>1 setor por vez</Text>
              <Text style={s.summaryCellUnit}>um setor ativo por jornada</Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Setor crítico</Text>
              <Text style={s.summaryCellValue}>Setor {result.hydraulics.criticalPath.criticalSectorId + 1}</Text>
              <Text style={s.summaryCellUnit}>maior vazão — caminho mais desfavorável</Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Vazão de projeto</Text>
              <Text style={s.summaryCellValue}>
                {fmtN(result.hydraulics.allSegments.find((s) => s.type === "adutora")?.flowM3h ?? 0, 1)}
              </Text>
              <Text style={s.summaryCellUnit}>m³/h  •  setor crítico</Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Comprimento crítico</Text>
              <Text style={s.summaryCellValue}>
                {fmtN(result.hydraulics.criticalPath.totalCriticalLengthM, 0)}
              </Text>
              <Text style={s.summaryCellUnit}>m  •  captação → aspersor crítico</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Decomposição da HMT</Text>
          <View style={s.summaryGrid}>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Pressão de serviço</Text>
              <Text style={s.summaryCellValue}>{fmtN(result.hydraulics.hmt.pressaoServicoMca, 0)}</Text>
              <Text style={s.summaryCellUnit}>mca  •  Naan 5022-SD</Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Perda — adutora</Text>
              <Text style={s.summaryCellValue}>{fmtN(result.hydraulics.hmt.hfAdutoraM, 2)}</Text>
              <Text style={s.summaryCellUnit}>mca</Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Perda — principal</Text>
              <Text style={s.summaryCellValue}>{fmtN(result.hydraulics.hmt.hfPrincipalToDerivationM, 2)}</Text>
              <Text style={s.summaryCellUnit}>mca  •  até derivação crítica</Text>
            </View>
            {result.hydraulics.hmt.hfSecondaryM > 0 && (
              <View style={s.summaryCell}>
                <Text style={s.summaryCellLabel}>Perda — ramal</Text>
                <Text style={s.summaryCellValue}>{fmtN(result.hydraulics.hmt.hfSecondaryM, 2)}</Text>
                <Text style={s.summaryCellUnit}>mca</Text>
              </View>
            )}
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Perda — lateral crítica</Text>
              <Text style={s.summaryCellValue}>{fmtN(result.hydraulics.hmt.hfLateralM, 2)}</Text>
              <Text style={s.summaryCellUnit}>mca  •  com fator Christiansen</Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Desnível</Text>
              <Text style={s.summaryCellValue}>
                {result.hydraulics.hmt.noElevationData ? "—" : fmtN(result.hydraulics.hmt.desnivelM, 1)}
              </Text>
              <Text style={s.summaryCellUnit}>
                {result.hydraulics.hmt.noElevationData ? "sem dados de elevação" : "m  •  captação → área"}
              </Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryCellLabel}>Margem de segurança</Text>
              <Text style={s.summaryCellValue}>{fmtN(result.hydraulics.hmt.safetyMarginM, 1)}</Text>
              <Text style={s.summaryCellUnit}>mca</Text>
            </View>
            <View style={[s.summaryCell, { backgroundColor: "#ECFDF5" }]}>
              <Text style={s.summaryCellLabel}>HMT MÍNIMA REQUERIDA</Text>
              <Text style={[s.summaryCellValue, { fontSize: 14 }]}>
                {fmtN(result.hydraulics.hmt.totalHMT, 1)}
              </Text>
              <Text style={s.summaryCellUnit}>mca</Text>
            </View>
          </View>

          {/* Status hidráulico */}
          <Text style={s.sectionTitle}>Status Hidráulico</Text>
          <View style={{
            backgroundColor: result.hydraulics.status === "hydraulic_precheck_ok" ? "#ECFDF5"
              : result.hydraulics.status === "blocked_invalid_segments" ? "#FEE2E2"
              : "#FFFBEB",
            borderWidth: 1,
            borderColor: result.hydraulics.status === "hydraulic_precheck_ok" ? "#059669"
              : result.hydraulics.status === "blocked_invalid_segments" ? "#DC2626"
              : "#D97706",
            borderRadius: 3,
            padding: 8,
            marginBottom: 10,
          }}>
            <Text style={{
              fontSize: 8,
              fontFamily: "Helvetica-Bold",
              color: result.hydraulics.status === "hydraulic_precheck_ok" ? "#065F46"
                : result.hydraulics.status === "blocked_invalid_segments" ? "#7F1D1D"
                : "#78350F",
              marginBottom: 3,
            }}>
              {hmtStatusLabel[result.hydraulics.status] ?? result.hydraulics.status}
            </Text>
            {result.hydraulics.warnings.map((w, i) => (
              <Text key={i} style={{ fontSize: 7, color: "#374151", marginTop: 2 }}>• {w}</Text>
            ))}
          </View>

          {/* Pendências */}
          {result.hydraulics.hmt.noElevationData && (
            <View style={{
              backgroundColor: "#FFFBEB",
              borderWidth: 1,
              borderColor: "#D97706",
              borderRadius: 3,
              padding: 8,
              marginBottom: 8,
            }}>
              <Text style={{ fontSize: 7.5, color: "#92400E", fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                Dados de elevação ausentes
              </Text>
              <Text style={{ fontSize: 7, color: "#92400E" }}>
                Informe a elevação da captação e da área irrigada para calcular o desnível real.
                A HMT apresentada considera desnível zero — pode subestimar a potência da bomba.
              </Text>
            </View>
          )}
          {result.hydraulics.status !== "hydraulic_precheck_ok" && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 7, color: "#6B7280", fontStyle: "italic" }}>
                Sistema calcula HMT mínima requerida. A bomba ainda deve ser selecionada
                ou validada contra curva Q-H pelo engenheiro responsável.
              </Text>
            </View>
          )}

          {/* ── Dimensionamento dos ramais (TASK-047) ── */}
          {result.hydraulics.sizedSecondaries.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Dimensionamento dos ramais</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderText, s.colRamal]}>Ramal</Text>
                  <Text style={[s.tableHeaderText, s.colSku]}>SKU</Text>
                  <Text style={[s.tableHeaderText, s.colDN]}>DN</Text>
                  <Text style={[s.tableHeaderText, s.colLen]}>Comprimento</Text>
                  <Text style={[s.tableHeaderText, s.colVel]}>Velocidade</Text>
                  <Text style={[s.tableHeaderText, s.colHf]}>Hf</Text>
                  <Text style={[s.tableHeaderText, s.colStatus]}>Status</Text>
                </View>
                {mapSizedSecondariesToRows(result.hydraulics.sizedSecondaries).map((row, i) => (
                  <View key={row.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                    <Text style={[s.tableCellBold, s.colRamal]}>{row.ramalLabel}</Text>
                    <Text style={[s.tableCell, s.colSku]}>{row.sku}</Text>
                    <Text style={[s.tableCell, s.colDN]}>{row.dnLabel}</Text>
                    <Text style={[s.tableCell, s.colLen]}>{row.lengthLabel}</Text>
                    <Text style={[s.tableCell, s.colVel]}>{row.velocityLabel}</Text>
                    <Text style={[s.tableCell, s.colHf]}>{row.hfLabel}</Text>
                    <Text
                      style={[
                        row.statusLabel.severity === "ok" ? s.statusBadgeOk : s.statusBadgeWarn,
                        s.colStatus,
                      ]}
                    >
                      {row.statusLabel.text}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={s.footer} fixed>
            <Text style={s.footerText}>Brasmáquinas — Memorial Hidráulico</Text>
            <Text
              style={s.pageNumber}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      )}

    </Document>
  );
}
