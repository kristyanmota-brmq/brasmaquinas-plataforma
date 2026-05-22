#!/usr/bin/env node
/**
 * Imprime resumo executivo de ai/gpt-review.md no terminal.
 *
 * Não tem efeitos colaterais: apenas LÊ arquivos e imprime no stdout.
 * Não chama API, não edita arquivos, não altera status, não toca decision-log,
 * não roda validate-structure internamente, não implementa, não commita, não push.
 *
 * Uso: node scripts/ai/print-review-summary.mjs --task TASK-XXX
 *
 * Exit codes:
 *   0 — sucesso (resumo impresso)
 *   2 — task_id em gpt-review.md ≠ --task argumento
 *   3 — ai/gpt-review.md não encontrado
 *   4 — bloco JSON canônico inválido ou ausente
 *   5 — argumento --task ausente
 *
 * Quando importado como módulo, exporta:
 *   - buildSummary({ gptReviewRaw, taskArg, currentTaskRaw }): retorna { ok, exitCode, lines, errors }
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractStructuredBlock,
  parseFrontmatter,
} from "./lib/parsers.mjs";
import { deriveOverridePermitido, INVARIANT_STATUS } from "./lib/invariants.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Argumentos
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { task: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--task" || a === "-t") {
      out.task = argv[++i] ?? null;
    } else if (a.startsWith("--task=")) {
      out.task = a.slice("--task=".length);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Função core (testável sem FS)
//
// Recebe conteúdo já carregado e produz lista de linhas + status.
// Não lê arquivos. Não escreve em stdout/stderr.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} input
 * @param {string} input.taskArg                    — argumento --task (obrigatório)
 * @param {string|null} input.gptReviewRaw          — conteúdo de ai/gpt-review.md, ou null se ausente
 * @param {string|null} input.currentTaskRaw        — conteúdo de ai/current-task.md, ou null se ausente
 * @param {string} [input.gptReviewPath]            — caminho para exibir no resumo
 * @returns {{ ok: boolean, exitCode: number, lines: string[], errors: string[] }}
 */
export function buildSummary({
  taskArg,
  gptReviewRaw,
  currentTaskRaw,
  gptReviewPath = "ai/gpt-review.md",
}) {
  const errors = [];
  const lines = [];

  if (!taskArg) {
    errors.push("argumento obrigatório --task <TASK_ID> ausente");
    return { ok: false, exitCode: 5, lines, errors };
  }

  if (gptReviewRaw == null) {
    errors.push(`${gptReviewPath} não encontrado`);
    return { ok: false, exitCode: 3, lines, errors };
  }

  let block;
  try {
    block = extractStructuredBlock(gptReviewRaw);
  } catch (err) {
    errors.push(`bloco JSON canônico inválido: ${err.message}`);
    return { ok: false, exitCode: 4, lines, errors };
  }

  if (String(block.task_id) !== taskArg) {
    errors.push(`task_id (${block.task_id}) ≠ --task ${taskArg}`);
    return { ok: false, exitCode: 2, lines, errors };
  }

  // status atual (best-effort: lê de current-task.md se disponível)
  let statusAtual = "(desconhecido)";
  if (currentTaskRaw != null) {
    try {
      const { frontmatter } = parseFrontmatter(currentTaskRaw);
      if (String(frontmatter.task_id) === taskArg && frontmatter.status) {
        statusAtual = String(frontmatter.status);
      }
    } catch {
      // current-task ilegível — manter "(desconhecido)" sem propagar erro
    }
  }

  // override derivado vs declarado
  const overrideDerivado = deriveOverridePermitido(block);
  const overrideDeclarado = block.override_permitido;

  // contagens
  const blockers = block.blockers || [];
  const invariantes = block.invariantes || [];
  const violadas = invariantes.filter((i) => i.status === INVARIANT_STATUS.VIOLADA);

  // metadata (tokens/custo — limitação V1 herdada de TOOL-002)
  const metadata = block.metadata || {};
  const tokensPrompt = metadata.tokens_prompt ?? null;
  const tokensCompletion = metadata.tokens_completion ?? null;
  const custoUsd = metadata.custo_estimado_usd ?? null;
  const custoIndisponivel =
    tokensPrompt === 0 &&
    tokensCompletion === 0 &&
    custoUsd === 0;

  // próxima ação humana
  let proximaAcao;
  if (violadas.length > 0) {
    proximaAcao = "Reformular plano e voltar a /planejar (invariante permanente — terminal).";
  } else if (block.veredito === "reprovado") {
    proximaAcao = "Decidir override em ai/decision-log.md (risco assumido obrigatório) OU reformular plano.";
  } else {
    proximaAcao =
      "Leia ai/gpt-review.md completo; registre decisão humana em ai/decision-log.md (append-only); depois transicione status manualmente.";
  }

  // ── Montagem do resumo ──────────────────────────────────────────────────
  lines.push("");
  lines.push("┌─ RESUMO GPT REVIEW ─────────────────────────────────────────");
  lines.push(`│ task_id                       : ${block.task_id}`);
  lines.push(`│ status_atual                  : ${statusAtual}`);
  lines.push(`│ veredito                      : ${block.veredito}`);
  lines.push(`│ recomendacao                  : ${block.recomendacao ?? "(n/a)"}`);
  lines.push(`│ blockers_count                : ${blockers.length}`);
  if (blockers.length > 0) {
    for (const b of blockers) {
      const invRef = b.invariante_id ? ` [${b.invariante_id}]` : "";
      lines.push(`│   • ${b.id} (${b.categoria})${invRef}`);
    }
  }
  lines.push(`│ invariantes_violadas          : ${violadas.length}/${invariantes.length}`);
  if (violadas.length > 0) {
    for (const v of violadas) {
      lines.push(`│   ⚠ INVARIANTE VIOLADA: ${v.id}`);
    }
  }
  lines.push(`│ override_permitido_declarado  : ${formatBool(overrideDeclarado)}`);
  lines.push(`│ override_permitido_derivado   : ${formatBool(overrideDerivado)} (regra terminal vence)`);
  lines.push(`│`);
  lines.push(`│ tokens_prompt                 : ${tokensPrompt ?? "(n/a)"}`);
  lines.push(`│ tokens_completion             : ${tokensCompletion ?? "(n/a)"}`);
  lines.push(`│ custo_estimado_usd            : ${custoUsd ?? "(n/a)"}`);
  if (custoIndisponivel) {
    lines.push(`│   (telemetria V1 — valores do JSON do modelo, não da API; referência real = dashboard OpenAI)`);
  }
  lines.push(`│`);
  lines.push(`│ arquivo_completo              : ${gptReviewPath}`);
  lines.push(`│`);
  lines.push(`│ próxima ação humana           :`);
  for (const segmento of wrapLine(proximaAcao, 56)) {
    lines.push(`│   ${segmento}`);
  }
  lines.push("└─────────────────────────────────────────────────────────────");
  lines.push("");

  return { ok: true, exitCode: 0, lines, errors };
}

function formatBool(v) {
  if (v === true) return "true";
  if (v === false) return "false";
  if (v === null) return "null";
  return String(v);
}

function wrapLine(text, maxWidth) {
  const words = String(text).split(/\s+/);
  const out = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxWidth) {
      if (current) out.push(current.trim());
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current) out.push(current.trim());
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry (apenas quando executado diretamente, não quando importado)
// ─────────────────────────────────────────────────────────────────────────────

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  const { task } = parseArgs(process.argv);

  const gptReviewPath = resolve("ai/gpt-review.md");
  const currentTaskPath = resolve("ai/current-task.md");

  const gptReviewRaw = existsSync(gptReviewPath)
    ? readFileSync(gptReviewPath, "utf8")
    : null;
  const currentTaskRaw = existsSync(currentTaskPath)
    ? readFileSync(currentTaskPath, "utf8")
    : null;

  const result = buildSummary({
    taskArg: task,
    gptReviewRaw,
    currentTaskRaw,
    gptReviewPath: "ai/gpt-review.md",
  });

  if (result.ok) {
    process.stdout.write(result.lines.join("\n") + "\n");
    process.exit(0);
  } else {
    for (const err of result.errors) {
      process.stderr.write(`[print-review-summary] ERRO: ${err}\n`);
    }
    process.exit(result.exitCode);
  }
}
