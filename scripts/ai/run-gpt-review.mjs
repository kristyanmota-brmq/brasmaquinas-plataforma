#!/usr/bin/env node
/**
 * Chama a OpenAI Responses API com structured output (JSON schema strict)
 * para gerar ai/gpt-review.md a partir dos arquivos canônicos em ai/.
 *
 * Não altera ai/current-task.md.status — apenas escreve o review.
 *
 * Uso: node scripts/ai/run-gpt-review.mjs --task TOOL-XXX
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

import { buildReviewPrompt, SCHEMA_VERSION } from "./build-review-prompt.mjs";
import { loadDotEnvLocal, parseFrontmatter } from "./lib/parsers.mjs";

function fail(message, code = 1) {
  process.stderr.write(`[run-gpt-review] ERRO: ${message}\n`);
  process.exit(code);
}

function info(message) {
  process.stdout.write(`[run-gpt-review] ${message}\n`);
}

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

function preflightSecretCheck() {
  try {
    const status = execSync("git status --porcelain", { encoding: "utf8" });
    const offending = status
      .split(/\r?\n/)
      .filter((l) => /\.env\.local|\s\.env$/.test(l));
    if (offending.length > 0) {
      fail(
        `arquivo de secret aparece em git status: ${offending.join(", ")}. Verifique .gitignore antes de prosseguir.`,
      );
    }
  } catch {
    // git status falhou (não-fatal — provavelmente rodando fora de repo); apenas avisa
    info("aviso: git status indisponível; skip pré-check de secret");
  }
}

async function main() {
  const { task } = parseArgs(process.argv);
  if (!task) {
    fail("argumento obrigatório --task <TASK_ID> ausente");
  }

  preflightSecretCheck();

  const env = loadDotEnvLocal(".env.local");
  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL;
  const baseUrl =
    env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  if (!apiKey) {
    fail(
      "OPENAI_API_KEY ausente. Configure em .env.local (template em .env.example).",
    );
  }
  if (!model) {
    fail(
      "OPENAI_MODEL ausente. Configure em .env.local (sem default no código). Exemplos: gpt-5, gpt-4.1, gpt-4o.",
    );
  }

  // Verifica current-task.md
  const currentTaskPath = resolve("ai/current-task.md");
  if (!existsSync(currentTaskPath)) {
    fail("ai/current-task.md não encontrado");
  }
  const currentTaskRaw = readFileSync(currentTaskPath, "utf8");
  const { frontmatter } = parseFrontmatter(currentTaskRaw);
  if (String(frontmatter.task_id) !== task) {
    fail(
      `task_id em ai/current-task.md (${frontmatter.task_id}) não bate com --task ${task}. Sincronize antes de rodar.`,
    );
  }

  const projectStatePath = resolve("ai/project-state.md");
  const claudeReportPath = resolve("ai/claude-report.md");
  if (!existsSync(projectStatePath)) fail("ai/project-state.md não encontrado");
  if (!existsSync(claudeReportPath)) fail("ai/claude-report.md não encontrado");

  const projectState = readFileSync(projectStatePath, "utf8");
  const claudeReport = readFileSync(claudeReportPath, "utf8");

  const { system, user, json_schema } = buildReviewPrompt({
    projectState,
    currentTask: currentTaskRaw,
    claudeReport,
    taskId: task,
    modeloGpt: model,
  });

  info(`chamando Responses API: model=${model} base=${baseUrl}`);
  const t0 = Date.now();

  let response;
  try {
    response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: {
          format: {
            type: "json_schema",
            name: json_schema.name,
            strict: json_schema.strict,
            schema: json_schema.schema,
          },
        },
      }),
    });
  } catch (err) {
    fail(`falha de rede chamando OpenAI: ${err.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    fail(`OpenAI retornou HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  const elapsedMs = Date.now() - t0;

  // Extrai JSON estruturado da Responses API
  const jsonText = extractResponsesOutputText(data);
  if (!jsonText) {
    fail(`não foi possível extrair output da resposta da API: ${JSON.stringify(data).slice(0, 500)}`);
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch (err) {
    fail(`JSON estruturado da API mal formado: ${err.message}`);
  }

  // Reforça schema_version e modelo no JSON antes de gravar
  parsedJson.schema_version = SCHEMA_VERSION;
  parsedJson.modelo_gpt = model;
  if (!parsedJson.timestamp) {
    parsedJson.timestamp = new Date().toISOString();
  }

  const markdown = renderMarkdown(parsedJson);
  const outPath = resolve("ai/gpt-review.md");
  writeFileSync(outPath, markdown, "utf8");

  info(
    `gpt-review.md salvo (${elapsedMs}ms). veredito=${parsedJson.veredito} blockers=${parsedJson.blockers.length} invariantes_violadas=${
      parsedJson.invariantes.filter((i) => i.status === "violada").length
    } tokens_prompt=${parsedJson.metadata.tokens_prompt} tokens_completion=${
      parsedJson.metadata.tokens_completion
    } custo_usd=${parsedJson.metadata.custo_estimado_usd}`,
  );
  info(`arquivo: ${outPath}`);
  info("status atual de ai/current-task.md NÃO foi alterado — edite manualmente ou rode /handoff-status.");
}

function extractResponsesOutputText(data) {
  // Responses API: campo output_text é shortcut; fallback para output[].content[].text
  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part?.text === "string") return part.text;
          if (typeof part === "string") return part;
        }
      }
    }
  }
  // fallback para chat-completions-like shape (defensivo)
  if (Array.isArray(data.choices)) {
    const c = data.choices[0]?.message?.content;
    if (typeof c === "string") return c;
  }
  return null;
}

function renderMarkdown(b) {
  const blockers = b.blockers.length
    ? b.blockers
        .map(
          (bl) =>
            `- **${bl.id} (${bl.categoria}):** ${bl.descricao}${
              bl.invariante_id ? ` *(invariante: ${bl.invariante_id})*` : ""
            }`,
        )
        .join("\n")
    : "_Nenhum blocker identificado._";

  const invariantes = b.invariantes
    .map(
      (i) =>
        `- **${i.id}** — _${i.status}_\n  - ${i.descricao}\n  - ${i.justificativa}`,
    )
    .join("\n");

  return `# Revisão GPT — ${b.task_id}

> Gerado automaticamente por \`scripts/ai/run-gpt-review.mjs\` em ${b.timestamp}.
> Modelo: \`${b.modelo_gpt}\`. Schema: \`v${b.schema_version}\`.

## Resumo executivo

**Veredito:** \`${b.veredito}\`
**Recomendação:** \`${b.recomendacao}\`
**Override permitido (declarado pelo GPT):** \`${b.override_permitido}\`

${b.justificativa_resumida}

## Blockers

${blockers}

## Análise das invariantes permanentes

${invariantes}

## Metadata

- tokens_prompt: ${b.metadata.tokens_prompt}
- tokens_completion: ${b.metadata.tokens_completion}
- custo_estimado_usd: ${b.metadata.custo_estimado_usd}

---

## Bloco estruturado (fonte de verdade do validador)

\`\`\`json
${JSON.stringify(b, null, 2)}
\`\`\`
`;
}

main().catch((err) => {
  fail(err.stack || err.message);
});
