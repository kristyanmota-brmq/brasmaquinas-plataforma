/**
 * TASK-078 — Ajuste automático de setorização para viabilizar a arquitetura.
 *
 * Reproduz a decisão do projetista profissional: quando NENHUM candidato de
 * arquitetura (A0/A2/A3) passa nos gates hidráulicos, a causa típica é vazão
 * por setor acima do que o maior tubo de sub-coletor comporta a 1,5 m/s.
 * Em vez de aceitar o fallback A0 inválido, o motor tenta AUMENTAR o número
 * de setores (vazão/setor menor) até os candidatos validarem — e devolve a
 * primeira configuração válida (menor mudança operacional possível).
 *
 * Governança preservada:
 * - Só age quando `decision === "no_valid_candidate"` (nada a fazer se já há
 *   candidato válido) e nunca quando o traçado é manual (caller garante).
 * - Não relaxa nenhum gate — apenas re-setoriza e re-avalia pelos mesmos
 *   critérios homologados (doc 13; ADR-015).
 * - Sem solução dentro do limite → null (decisão volta ao humano; blockers
 *   do solver continuam ativos).
 */
import type { ProjectLayout } from "@/app/projetos/[id]/layout-schema";
import { calculateIrrigationProject } from "./irrigation-project";
import {
  selectArchitectureByBom,
  type ArchitectureSelectionResult,
} from "./architecture-selector";
import { buildSectorsByFlowWithColumnSplitting } from "./sectorization";
import {
  getAspersorBySku,
  ASPERSOR_PADRAO,
  BOMBAS_HOMOLOGADAS,
  type BombaCatalogo,
} from "@/lib/catalog/aspersores";
import { selectBombaAutomatica } from "./pump-auto-select";

export const MAX_EXTRA_SETORES_AUTO_TUNE = 6;

export interface SectorizationAutoTuneResult {
  setoresCountOriginal: number;
  setoresCount: number;
  /** Sectorization completa pronta para aplicar no layout. */
  sectorization: NonNullable<ProjectLayout["sectorization"]>;
  /** Seleção de arquitetura re-avaliada com a nova setorização (vencedor válido). */
  selection: ArchitectureSelectionResult;
  /** Layout completo com setorização + traçado vencedor aplicados (verificado no solver oficial). */
  layoutAjustado: ProjectLayout;
  /**
   * Bomba homologada que atende o ponto de operação resultante (menor folga),
   * ou null se nenhuma do catálogo atende. O tune PREFERE a primeira
   * configuração que também tem bomba disponível — como faria o projetista.
   */
  bombaSugerida: BombaCatalogo | null;
}

/**
 * Critério OFICIAL de aceitação: nº de secundárias dimensionadas pelo solver
 * fora de limite (status ≠ "ok"). O avaliador preliminar de candidatos pode
 * divergir do solver em casos-limite — quem manda é o solver (fonte única).
 */
export function countSecondariesOutOfLimit(layout: ProjectLayout): number {
  const r = calculateIrrigationProject(layout);
  return (r.hydraulics?.sizedSecondaries ?? []).filter((s) => s.status !== "ok").length;
}

/**
 * Aceitação estrutural OFICIAL da rede (TASK-080 follow-up — lição da Fazenda
 * Três Ilhas): além de 0 secundárias fora de limite, a rede precisa estar
 * COMPLETA — HMT válida e, havendo colunas físicas, secundárias EXISTINDO.
 * Sem isso, um candidato de borda que "abraça" os inlets passa vacuamente
 * (0 secundárias = 0 fora de limite) e dispara o gate de cálculo incompleto
 * do BOM (TASK-026-B) depois de aplicado.
 */
export function officialNetworkOk(layout: ProjectLayout): boolean {
  const r = calculateIrrigationProject(layout);
  const h = r.hydraulics;
  if (!h || !Number.isFinite(h.hmt?.totalHMT) || h.hmt.totalHMT <= 0) return false;
  const nCols = r.physical?.physicalColumns.length ?? 0;
  if (nCols > 0 && h.sizedSecondaries.length === 0) return false;
  return h.sizedSecondaries.every((x) => x.status === "ok");
}

function withWinnerPipeline(
  layout: ProjectLayout,
  selection: ArchitectureSelectionResult,
): ProjectLayout {
  const w = selection.winnerCandidate;
  return {
    ...layout,
    mainPipeline: {
      coordinates: w.principal,
      adutora: w.adutora,
      lengthMeters: w.principalLengthM,
      segments: Math.max(1, w.principal.length - 1),
      source: "auto",
    },
  };
}

export function tuneSectorizationForValidArchitecture(
  layout: ProjectLayout,
  opts?: { maxExtraSetores?: number },
): SectorizationAutoTuneResult | null {
  const maxExtra = opts?.maxExtraSetores ?? MAX_EXTRA_SETORES_AUTO_TUNE;
  const { sprinklers, sectorization, waterSource, centroid } = layout;
  if (!sprinklers || !sectorization || !waterSource || !centroid) return null;
  if (maxExtra < 1) return null;

  const aspersor = getAspersorBySku(sprinklers.aspersorId) ?? ASPERSOR_PADRAO;
  const vazaoAspersor = aspersor.vazaoM3PorHora;
  const nOriginal = sectorization.setoresCount;
  const count = sprinklers.positions.length;
  const gridAngle = sprinklers.gridAngleDegrees ?? 0;

  // Estado atual: só ajustamos se a rede REAL está fora de limite — pelo
  // solver oficial (secundárias com status ≠ ok) ou pelo seletor (nenhum
  // candidato válido). Rede saudável → nada a fazer.
  const r0 = calculateIrrigationProject(layout);
  if (!r0.physical || !r0.distribution || !r0.operational) return null;
  const sel0 = selectArchitectureByBom({
    waterSource,
    physicalColumns: r0.physical.physicalColumns,
    centroid,
    gridAngleDegrees: gridAngle,
    laterais: r0.distribution.laterais,
    operationalSegments: r0.operational.operationalSegments,
  });
  const officialBad0 = (r0.hydraulics?.sizedSecondaries ?? []).some((x) => x.status !== "ok");
  const redeInvalida = sel0.decision === "no_valid_candidate" || officialBad0;
  // Gatilho adicional do projetista: rede OK mas nenhum conjunto moto-bomba
  // homologado atende o ponto de operação atual (e nenhuma bomba foi escolhida
  // manualmente) — re-setorizar pode trazer o ponto para dentro do catálogo.
  const hmt0 = r0.hydraulics?.hmt.totalHMT;
  const bombaAtualPossivel =
    layout.pump != null ||
    (hmt0 != null &&
      selectBombaAutomatica(
        BOMBAS_HOMOLOGADAS,
        sectorization.vazaoPorSetorM3PorHora,
        hmt0,
      ) != null);
  if (!redeInvalida && bombaAtualPossivel) return null;

  let fallbackSemBomba: SectorizationAutoTuneResult | null = null;

  for (let extra = 1; extra <= maxExtra; extra++) {
    const n = nOriginal + extra;
    const { sectorIndices } = buildSectorsByFlowWithColumnSplitting(
      r0.physical.physicalColumns,
      n,
      vazaoAspersor,
      count,
    );
    const aspersoresPorSetor = Math.round(count / n);
    const sectorization2: NonNullable<ProjectLayout["sectorization"]> = {
      ...sectorization,
      setoresCount: n,
      sectorIndices,
      aspersoresPorSetor,
      vazaoPorSetorM3PorHora: aspersoresPorSetor * vazaoAspersor,
      tempoPorSetorMinutos: Math.round((60 * sectorization.jornadaHoras) / n),
    };
    const layout2: ProjectLayout = { ...layout, sectorization: sectorization2 };
    const r2 = calculateIrrigationProject(layout2);
    if (!r2.physical || !r2.distribution || !r2.operational) continue;
    const sel2 = selectArchitectureByBom({
      waterSource,
      physicalColumns: r2.physical.physicalColumns,
      centroid,
      gridAngleDegrees: gridAngle,
      laterais: r2.distribution.laterais,
      operationalSegments: r2.operational.operationalSegments,
    });
    if (sel2.decision === "no_valid_candidate") continue;
    // Aceitação: o SOLVER OFICIAL (com o traçado vencedor aplicado) não pode
    // ter nenhuma secundária fora de limite.
    const layoutAjustado = withWinnerPipeline(layout2, sel2);
    if (!officialNetworkOk(layoutAjustado)) continue;
    // Critério do projetista: prefere a configuração que TAMBÉM tem conjunto
    // moto-bomba homologado atendendo o ponto de operação resultante.
    const r3 = calculateIrrigationProject(layoutAjustado);
    const hmtReq = r3.hydraulics?.hmt.totalHMT;
    const bomba = hmtReq
      ? selectBombaAutomatica(
          BOMBAS_HOMOLOGADAS,
          sectorization2.vazaoPorSetorM3PorHora,
          hmtReq,
        )
      : null;
    const result: SectorizationAutoTuneResult = {
      setoresCountOriginal: nOriginal,
      setoresCount: n,
      sectorization: sectorization2,
      selection: sel2,
      layoutAjustado,
      bombaSugerida: bomba,
    };
    if (bomba) return result; // melhor caso: rede válida + bomba disponível
    if (!fallbackSemBomba) fallbackSemBomba = result;
  }
  // Se o gatilho foi apenas "sem bomba" e nenhum n trouxe bomba, não mexer
  // na setorização à toa — devolve null e a decisão fica com o humano.
  return redeInvalida ? fallbackSemBomba : null;
}
