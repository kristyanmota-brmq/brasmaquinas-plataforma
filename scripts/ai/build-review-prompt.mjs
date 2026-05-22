/**
 * Monta o prompt + JSON schema para a Responses API da OpenAI.
 * Pure: nenhum efeito colateral, nenhuma chamada de rede.
 */

import { PERMANENT_INVARIANTS, INVARIANT_IDS } from "./lib/invariants.mjs";

export const SCHEMA_VERSION = "1.0";

/**
 * @param {object} args
 * @param {string} args.projectState   conteúdo de ai/project-state.md
 * @param {string} args.currentTask    conteúdo de ai/current-task.md
 * @param {string} args.claudeReport   conteúdo de ai/claude-report.md
 * @param {string} args.taskId         ex.: "TOOL-001"
 * @param {string} args.modeloGpt      ex.: "gpt-5"
 * @returns {{ system: string, user: string, json_schema: object }}
 */
export function buildReviewPrompt({
  projectState,
  currentTask,
  claudeReport,
  taskId,
  modeloGpt,
}) {
  if (!projectState || !currentTask || !claudeReport) {
    throw new Error("buildReviewPrompt: projectState, currentTask, claudeReport obrigatórios");
  }
  if (!taskId || typeof taskId !== "string") {
    throw new Error("buildReviewPrompt: taskId obrigatório");
  }
  if (!modeloGpt || typeof modeloGpt !== "string") {
    throw new Error("buildReviewPrompt: modeloGpt obrigatório");
  }

  const invariantesList = PERMANENT_INVARIANTS.map(
    (inv, i) => `${i + 1}. ${inv.id} — ${inv.descricao}`,
  ).join("\n");

  const system = `Você é o GPT Reviewer do projeto Brasmáquinas — Aspersão Convencional.

Sua única função é revisar planos técnicos produzidos pelo Claude Code antes da aprovação humana, garantindo que invariantes permanentes do projeto não sejam violadas.

Você NUNCA decide. Você produz um veredito estruturado que o humano lê e usa para aprovar, ajustar ou reprovar manualmente.

INVARIANTES PERMANENTES (todas devem ser verificadas em cada revisão):

${invariantesList}

Para cada invariante, responda no campo "invariantes" do JSON estruturado com:
- "ok" se o plano respeita a invariante;
- "violada" se o plano explicitamente viola ou cria risco direto de violar;
- "nao_aplicavel" se a invariante não se aplica ao escopo do plano.

Se qualquer invariante for marcada "violada", o veredito DEVE ser "blocker_invariante_permanente" e o campo "override_permitido" DEVE ser false. Override humano não pode liberar violação de invariante permanente — a regra é terminal.

Categorias de blocker:
- "invariante_permanente" — violação de uma das 7 invariantes (terminal);
- "tecnico" — risco técnico que pode quebrar testes, TypeScript ou comportamento;
- "metodologico" — escopo errado, falta de critérios de aceite, etc.

Não faça sugestões fora do escopo do plano. Foco em coerência interna, riscos e respeito às invariantes.`;

  const user = `Plano a revisar — Task ${taskId}

============================================================
SNAPSHOT DO PROJETO (ai/project-state.md)
============================================================
${projectState}

============================================================
TASK ATUAL (ai/current-task.md)
============================================================
${currentTask}

============================================================
PLANO PROPOSTO (ai/claude-report.md)
============================================================
${claudeReport}

============================================================

Produza o JSON estruturado completo conforme o schema fornecido. Cada uma das 7 invariantes permanentes DEVE aparecer no array "invariantes" exatamente uma vez, identificada pelo "id" canônico. Não use IDs fora da lista.`;

  const json_schema = buildJsonSchema(modeloGpt);

  return { system, user, json_schema };
}

function buildJsonSchema(modeloGpt) {
  return {
    name: "gpt_review_brasmaquinas",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "task_id",
        "schema_version",
        "modelo_gpt",
        "timestamp",
        "veredito",
        "blockers",
        "invariantes",
        "recomendacao",
        "override_permitido",
        "justificativa_resumida",
        "metadata",
      ],
      properties: {
        task_id: { type: "string" },
        schema_version: { type: "string", enum: [SCHEMA_VERSION] },
        modelo_gpt: { type: "string", enum: [modeloGpt] },
        timestamp: { type: "string" },
        veredito: {
          type: "string",
          enum: [
            "aprovado",
            "aprovado_com_ajustes",
            "reprovado",
            "blocker_invariante_permanente",
          ],
        },
        blockers: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "categoria", "descricao", "invariante_id"],
            properties: {
              id: { type: "string" },
              categoria: {
                type: "string",
                enum: ["tecnico", "metodologico", "invariante_permanente"],
              },
              descricao: { type: "string" },
              invariante_id: {
                type: ["string", "null"],
                enum: [...INVARIANT_IDS, null],
              },
            },
          },
        },
        invariantes: {
          type: "array",
          minItems: INVARIANT_IDS.length,
          maxItems: INVARIANT_IDS.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "descricao", "status", "justificativa"],
            properties: {
              id: { type: "string", enum: [...INVARIANT_IDS] },
              descricao: { type: "string" },
              status: {
                type: "string",
                enum: ["ok", "violada", "nao_aplicavel"],
              },
              justificativa: { type: "string" },
            },
          },
        },
        recomendacao: {
          type: "string",
          enum: ["aprovado", "aprovado_com_ajustes", "reprovado"],
        },
        override_permitido: { type: ["boolean", "null"] },
        justificativa_resumida: { type: "string", maxLength: 500 },
        metadata: {
          type: "object",
          additionalProperties: false,
          required: ["tokens_prompt", "tokens_completion", "custo_estimado_usd"],
          properties: {
            tokens_prompt: { type: "integer", minimum: 0 },
            tokens_completion: { type: "integer", minimum: 0 },
            custo_estimado_usd: { type: "number", minimum: 0 },
          },
        },
      },
    },
  };
}
