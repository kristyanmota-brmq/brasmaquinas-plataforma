/**
 * Builders puros para fixtures usadas pelos testes da TOOL-001.
 * Nenhum teste lê ou escreve em ai/*.md reais — apenas usa estes builders.
 */

import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { PERMANENT_INVARIANTS, INVARIANT_STATUS } from "../../lib/invariants.mjs";
import { SCHEMA_VERSION } from "../../build-review-prompt.mjs";

/**
 * Cria um diretório temporário isolado para uma instância de teste.
 * Retorna o caminho. Cada teste pode chamar e ter seu próprio sandbox.
 */
export function makeSandbox() {
  const dir = mkdtempSync(join(tmpdir(), "tool001-test-"));
  return dir;
}

export function buildCurrentTaskMd({
  taskId = "TOOL-FIXTURE",
  status = "em_planejamento",
  classe = "A",
  data = "2026-05-22",
  arquivoTask = "tasks/TOOL-FIXTURE.md",
  atualizadoPor = "humano",
} = {}) {
  return `---
task_id: ${taskId}
arquivo_task: ${arquivoTask}
classe: ${classe}
data_abertura: ${data}
status: ${status}
ultima_atualizacao: 2026-05-22T10:00:00-03:00
atualizado_por: ${atualizadoPor}
---

# Task ${taskId}

Conteúdo de teste — fixture isolada.
`;
}

export function buildProjectStateMd() {
  return `# project-state (fixture)

## Métricas

- Testes: 817/817
- TypeScript: 0 erros

## Última task concluída

TASK-035

## Pendências abertas

- TASK-034

## Invariantes permanentes

Lista fixa — ver scripts/ai/lib/invariants.mjs.
`;
}

export function buildClaudeReportMd({ withAllSections = true } = {}) {
  if (!withAllSections) {
    return `# claude-report (fixture incompleta)

## Entendimento

Fixture sem todas as seções obrigatórias.
`;
  }
  return `# claude-report (fixture)

## Entendimento

Plano de teste.

## Arquivos criados

- nenhum

## Arquivos modificados

- nenhum

## Arquivos não alterados

- src/**

## Testes obrigatórios

1. Teste exemplo.

## Critérios de aceite

- [ ] critério.

## Riscos

| Risco | Mitigação |
|-------|-----------|

## O que NÃO será feito

- nada extra.

## Invariantes verificadas

- todas
`;
}

/**
 * Constrói bloco JSON canônico de gpt-review.
 * Permite forçar inválidos para testes negativos.
 */
export function buildGptReviewJson({
  taskId = "TOOL-FIXTURE",
  veredito = "aprovado",
  blockers = [],
  invariantesOverride = null,
  recomendacao = null,
  overridePermitido = null,
  justificativa = "Plano coerente; nenhum risco crítico identificado nesta revisão sintética.",
  modelo = "fixture-model",
  timestamp = "2026-05-22T15:00:00-03:00",
  metadata = { tokens_prompt: 100, tokens_completion: 50, custo_estimado_usd: 0.001 },
} = {}) {
  const invariantes = invariantesOverride
    ? invariantesOverride
    : PERMANENT_INVARIANTS.map((inv) => ({
        id: inv.id,
        descricao: inv.descricao,
        status: INVARIANT_STATUS.OK,
        justificativa: "fixture: plano não toca o domínio coberto por esta invariante",
      }));

  const algumaViolada = invariantes.some((i) => i.status === INVARIANT_STATUS.VIOLADA);
  const overrideFinal =
    overridePermitido !== null
      ? overridePermitido
      : algumaViolada
      ? false
      : veredito === "reprovado"
      ? true
      : null;

  return {
    task_id: taskId,
    schema_version: SCHEMA_VERSION,
    modelo_gpt: modelo,
    timestamp,
    veredito,
    blockers,
    invariantes,
    recomendacao: recomendacao ?? (veredito === "aprovado" ? "aprovado" : veredito === "reprovado" ? "reprovado" : "aprovado_com_ajustes"),
    override_permitido: overrideFinal,
    justificativa_resumida: justificativa,
    metadata,
  };
}

export function buildGptReviewMd(jsonBlock, { withWrapper = true } = {}) {
  const body = withWrapper
    ? `# Revisão GPT — ${jsonBlock.task_id}

## Resumo executivo
fixture.
`
    : "";

  return `${body}
\`\`\`json
${JSON.stringify(jsonBlock, null, 2)}
\`\`\`
`;
}

export function buildDecisionLogEmpty() {
  return `# decision-log

Log append-only de decisões humanas pós-revisão do GPT.

`;
}

/**
 * Cria entrada YAML para decision-log.md.
 * `hashGptReview` deve ser passado quando aplicável (sha256 de gpt-review.md).
 */
export function buildDecisionLogEntry({
  timestamp = "2026-05-22T15:30:00-03:00",
  taskId = "TOOL-FIXTURE",
  decisionPoint = "pos_planejamento",
  veredito = "aprovado",
  decisao = "aprovado",
  responsavel = "Fixture User",
  justificativa = "Justificativa de fixture com o mínimo de oitenta caracteres para passar pela validação de campo.",
  override = false,
  riscoAssumido = null,
  ajustes = null,
  hashGptReview = null,
} = {}) {
  const lines = [
    `timestamp: ${timestamp}`,
    `task_id: ${taskId}`,
    `decision_point: ${decisionPoint}`,
    `veredito_gpt: ${veredito}`,
    `decisao_humana: ${decisao}`,
    `responsavel: ${responsavel}`,
    `justificativa: |`,
    `  ${justificativa}`,
    `override: ${override}`,
  ];
  if (ajustes && ajustes.length) {
    lines.push(`ajustes_aplicados: [${ajustes.map((a) => `"${a}"`).join(", ")}]`);
  }
  if (override && riscoAssumido) {
    lines.push(`risco_assumido: "${riscoAssumido}"`);
  }
  if (hashGptReview) {
    lines.push(`hash_gpt_review: ${hashGptReview}`);
  }
  return lines.join("\n");
}

export function buildDecisionLogWithEntries(entries) {
  const head = buildDecisionLogEmpty();
  if (!entries.length) return head;
  return `${head}---\n${entries.join("\n---\n")}\n`;
}

/**
 * Materializa um sandbox completo (ai/) para testes.
 * Retorna { dir, ai } onde ai é o caminho de ai/.
 */
export function writeSandboxAi(sandboxDir, {
  currentTask = buildCurrentTaskMd(),
  projectState = buildProjectStateMd(),
  claudeReport = buildClaudeReportMd(),
  gptReview = buildGptReviewMd(buildGptReviewJson()),
  decisionLog = buildDecisionLogEmpty(),
  readme = "# README fixture",
} = {}) {
  const ai = join(sandboxDir, "ai");
  mkdirSync(ai, { recursive: true });
  writeFileSync(join(ai, "README.md"), readme);
  writeFileSync(join(ai, "current-task.md"), currentTask);
  writeFileSync(join(ai, "project-state.md"), projectState);
  writeFileSync(join(ai, "claude-report.md"), claudeReport);
  writeFileSync(join(ai, "gpt-review.md"), gptReview);
  writeFileSync(join(ai, "decision-log.md"), decisionLog);
  return { dir: sandboxDir, ai };
}
