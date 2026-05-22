#!/usr/bin/env node
/**
 * Validador estrutural read-only da TOOL-001.
 *
 * - Verifica os 5 arquivos canônicos em ai/.
 * - Lê o bloco JSON canônico de gpt-review.md (não o markdown).
 * - Deriva override_permitido independentemente do que o GPT escreveu.
 * - Verifica append-only de decision-log.md contra HEAD do git.
 * - Verifica hash do gpt-review na última entry.
 * - NUNCA altera current-task.md.status. Apenas reporta.
 *
 * Uso: node scripts/ai/validate-structure.mjs --task TOOL-XXX
 *
 * Quando importado como módulo, exporta runValidation({ ai, task, gitHeadDecisionLog }).
 */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

import {
  parseFrontmatter,
  validateCurrentTaskFrontmatter,
  parseDecisionLog,
  extractStructuredBlock,
  sha256,
} from "./lib/parsers.mjs";
import { deriveOverridePermitido } from "./lib/invariants.mjs";

const REQUIRED_CLAUDE_REPORT_SECTIONS = [
  "## Entendimento",
  "## Arquivos criados",
  "## Arquivos modificados",
  "## Arquivos não alterados",
  "## Testes obrigatórios",
  "## Critérios de aceite",
  "## Riscos",
  "## O que NÃO será feito",
  "## Invariantes verificadas",
];

const REQUIRED_PROJECT_STATE_SECTIONS = [
  "## Métricas",
  "## Última task concluída",
  "## Pendências abertas",
  "## Invariantes permanentes",
];

const REQUIRED_FILES = [
  "ai/README.md",
  "ai/project-state.md",
  "ai/current-task.md",
  "ai/claude-report.md",
  "ai/gpt-review.md",
  "ai/decision-log.md",
];

function parseArgs(argv) {
  const out = { task: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--task" || a === "-t") out.task = argv[++i] ?? null;
    else if (a.startsWith("--task=")) out.task = a.slice("--task=".length);
  }
  return out;
}

function readFileIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function gitHeadDecisionLog() {
  try {
    return execSync("git show HEAD:ai/decision-log.md", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null; // arquivo ainda não está commitado em HEAD
  }
}

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {string|null} statusAtual
 * @property {string|null} statusSugerido
 * @property {boolean} transicaoValida
 * @property {Object|null} blocoJson
 * @property {boolean|null} overrideDerivado
 */

export function runValidation({
  task,
  aiDir = "ai",
  // Tri-state:
  //   undefined → auto-fetch from git HEAD (default em CLI).
  //   null      → skip HEAD comparison (usado por testes com sandbox isolado).
  //   string    → usa esse conteúdo como HEAD reference.
  decisionLogHead,
}) {
  /** @type {string[]} */
  const errors = [];
  const warnings = [];
  let statusAtual = null;
  let statusSugerido = null;
  let transicaoValida = false;
  let blocoJson = null;
  let overrideDerivado = null;

  // 1. Existência dos 5 arquivos
  for (const rel of REQUIRED_FILES) {
    const p = resolve(aiDir, rel.replace(/^ai\//, ""));
    if (!existsSync(p)) {
      errors.push(`arquivo obrigatório ausente: ${rel}`);
    }
  }
  if (errors.length > 0) {
    return finalize(errors, warnings, null, null, false, null, null);
  }

  // 2. Frontmatter de current-task.md
  const currentTaskRaw = readFileSync(resolve(aiDir, "current-task.md"), "utf8");
  let currentFm;
  try {
    const parsed = parseFrontmatter(currentTaskRaw);
    currentFm = parsed.frontmatter;
    validateCurrentTaskFrontmatter(currentFm);
    statusAtual = String(currentFm.status);
    if (task && String(currentFm.task_id) !== task) {
      errors.push(
        `current-task.md.task_id (${currentFm.task_id}) ≠ --task ${task}`,
      );
    }
  } catch (err) {
    errors.push(`current-task.md inválido: ${err.message}`);
  }

  // 3. Seções obrigatórias de project-state.md
  const projectStateRaw = readFileSync(resolve(aiDir, "project-state.md"), "utf8");
  for (const section of REQUIRED_PROJECT_STATE_SECTIONS) {
    if (!projectStateRaw.includes(section)) {
      errors.push(`project-state.md: seção obrigatória ausente: ${section}`);
    }
  }

  // 4. Seções obrigatórias de claude-report.md
  const claudeReportRaw = readFileSync(resolve(aiDir, "claude-report.md"), "utf8");
  for (const section of REQUIRED_CLAUDE_REPORT_SECTIONS) {
    if (!claudeReportRaw.includes(section)) {
      errors.push(`claude-report.md: seção obrigatória ausente: ${section}`);
    }
  }

  // 5. Bloco JSON estruturado de gpt-review.md
  const gptReviewRaw = readFileSync(resolve(aiDir, "gpt-review.md"), "utf8");
  try {
    blocoJson = extractStructuredBlock(gptReviewRaw);
    if (task && blocoJson.task_id !== task) {
      errors.push(
        `gpt-review.json: task_id (${blocoJson.task_id}) ≠ --task ${task}`,
      );
    }
    // Deriva override_permitido independentemente do que GPT escreveu
    overrideDerivado = deriveOverridePermitido(blocoJson);
    if (blocoJson.override_permitido !== overrideDerivado) {
      // Caso especial: GPT pode marcar true mas regra derivada é false (terminal).
      // Sempre logamos como warning; o valor derivado vence.
      warnings.push(
        `gpt-review.json: override_permitido declarado=${blocoJson.override_permitido} mas derivado=${overrideDerivado} — valor derivado vence`,
      );
    }
  } catch (err) {
    errors.push(`gpt-review.md inválido: ${err.message}`);
  }

  // 6. decision-log: schema + monotonicidade + append-only vs HEAD
  const decisionLogPath = resolve(aiDir, "decision-log.md");
  const decisionLogRaw = readFileSync(decisionLogPath, "utf8");
  let entries = [];
  try {
    entries = parseDecisionLog(decisionLogRaw);
  } catch (err) {
    errors.push(`decision-log.md inválido: ${err.message}`);
  }

  const head =
    decisionLogHead === undefined ? gitHeadDecisionLog() : decisionLogHead;
  if (head !== null) {
    let headEntries = [];
    try {
      headEntries = parseDecisionLog(head);
    } catch {
      // ignora — versão HEAD pode estar pré-V1 vazia
    }
    if (entries.length < headEntries.length) {
      errors.push(
        `decision-log.md encolheu vs HEAD: ${entries.length} < ${headEntries.length} entries`,
      );
    } else {
      // verifica prefixo intacto (apend-only)
      for (let i = 0; i < headEntries.length; i++) {
        const a = JSON.stringify(headEntries[i]);
        const b = JSON.stringify(entries[i]);
        if (a !== b) {
          errors.push(
            `decision-log.md: entry #${i + 1} foi alterada vs HEAD (append-only violado)`,
          );
          break;
        }
      }
    }
  }

  // 7. hash_gpt_review e trava terminal de override
  if (entries.length > 0 && blocoJson) {
    const lastEntry = entries[entries.length - 1];
    const expectedHash = sha256(gptReviewRaw);
    if (lastEntry.task_id === blocoJson.task_id) {
      if (lastEntry.hash_gpt_review && lastEntry.hash_gpt_review !== expectedHash) {
        errors.push(
          `decision-log.md: hash_gpt_review da última entry não bate com gpt-review.md atual`,
        );
      }
      if (lastEntry.override === true && overrideDerivado === false) {
        errors.push(
          `decision-log.md: última entry tem override=true mas override_permitido derivado=false (invariante terminal) — bloqueio terminal`,
        );
      }
    }
  }

  // 8. Status sugerido baseado no que existe
  if (statusAtual) {
    statusSugerido = sugerirProximoStatus(statusAtual, blocoJson, entries, overrideDerivado);
    transicaoValida = transicaoEhValida(statusAtual, statusSugerido);
  }

  return finalize(errors, warnings, statusAtual, statusSugerido, transicaoValida, blocoJson, overrideDerivado);
}

function finalize(errors, warnings, statusAtual, statusSugerido, transicaoValida, blocoJson, overrideDerivado) {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    statusAtual,
    statusSugerido,
    transicaoValida,
    blocoJson,
    overrideDerivado,
  };
}

function sugerirProximoStatus(statusAtual, blocoJson, entries, overrideDerivado) {
  // Trava terminal: invariante violada => sugere bloqueado_invariante_permanente
  if (overrideDerivado === false) return "bloqueado_invariante_permanente";

  if (statusAtual === "em_planejamento") return "aguardando_revisao_gpt";
  if (statusAtual === "aguardando_revisao_gpt") {
    return blocoJson ? "aguardando_aprovacao_humana" : statusAtual;
  }
  if (statusAtual === "aguardando_aprovacao_humana") {
    const last = entries[entries.length - 1];
    if (last && (last.decisao_humana === "aprovado" || last.decisao_humana === "aprovado_com_ajustes")) {
      return "aprovado_para_implementacao";
    }
    return statusAtual;
  }
  if (statusAtual === "aprovado_para_implementacao") return "em_implementacao";
  if (statusAtual === "em_implementacao") return "aguardando_fechamento";
  return statusAtual;
}

function transicaoEhValida(de, para) {
  if (de === para) return true;
  const grafo = {
    em_planejamento: ["aguardando_revisao_gpt", "bloqueado_invariante_permanente"],
    aguardando_revisao_gpt: ["aguardando_aprovacao_humana", "bloqueado_invariante_permanente", "em_planejamento"],
    aguardando_aprovacao_humana: [
      "aprovado_para_implementacao",
      "em_planejamento",
      "bloqueado_invariante_permanente",
    ],
    aprovado_para_implementacao: ["em_implementacao", "bloqueado_invariante_permanente"],
    em_implementacao: ["aguardando_fechamento", "bloqueado_invariante_permanente"],
    aguardando_fechamento: ["em_planejamento"],
    bloqueado_invariante_permanente: ["em_planejamento"],
  };
  return (grafo[de] || []).includes(para);
}

// CLI entry
async function main() {
  const { task } = parseArgs(process.argv);
  const result = runValidation({ task });

  process.stdout.write(`[validate-structure] task=${task ?? "<no-arg>"}\n`);
  process.stdout.write(`  status_atual:    ${result.statusAtual ?? "—"}\n`);
  process.stdout.write(`  status_sugerido: ${result.statusSugerido ?? "—"}\n`);
  process.stdout.write(`  transicao_valida: ${result.transicaoValida}\n`);
  process.stdout.write(`  override_permitido_derivado: ${result.overrideDerivado}\n`);

  for (const w of result.warnings) {
    process.stdout.write(`  WARN: ${w}\n`);
  }
  for (const e of result.errors) {
    process.stderr.write(`  ERR:  ${e}\n`);
  }

  if (result.ok) {
    process.stdout.write("OK\n");
    process.exit(0);
  } else {
    process.stderr.write("FALHA\n");
    process.exit(1);
  }
}

// Só roda como CLI se invocado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    process.stderr.write(`[validate-structure] erro: ${err.stack || err.message}\n`);
    process.exit(2);
  });
}
