/**
 * Parsers puros usados pelos scripts da TOOL-001.
 * Nenhum efeito colateral. Nenhum acesso à rede.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

import { INVARIANT_IDS, INVARIANT_STATUS } from "./invariants.mjs";

const VALID_STATUSES = new Set([
  "em_planejamento",
  "aguardando_revisao_gpt",
  "aguardando_aprovacao_humana",
  "aprovado_para_implementacao",
  "em_implementacao",
  "aguardando_fechamento",
  "bloqueado_invariante_permanente",
]);

const VALID_DECISIONS = new Set([
  "aprovado",
  "aprovado_com_ajustes",
  "reprovado",
]);

const VALID_VEREDITOS = new Set([
  "aprovado",
  "aprovado_com_ajustes",
  "reprovado",
  "blocker_invariante_permanente",
  "indisponivel",
]);

const VALID_DECISION_POINTS = new Set([
  "pos_planejamento",
  "pos_implementacao_revisao",
  "pos_fechamento",
]);

/**
 * Extrai frontmatter YAML de um markdown.
 * @param {string} md
 * @returns {{ frontmatter: Record<string, unknown>, body: string }}
 */
export function parseFrontmatter(md) {
  if (typeof md !== "string") {
    throw new Error("parseFrontmatter: input não é string");
  }
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("parseFrontmatter: bloco frontmatter ausente ou mal formado");
  }
  const yamlText = match[1];
  const body = match[2] ?? "";
  const frontmatter = parseSimpleYaml(yamlText);
  return { frontmatter, body };
}

/**
 * Valida o frontmatter de ai/current-task.md.
 * Exige task_id, arquivo_task, classe, data_abertura, status, ultima_atualizacao, atualizado_por.
 */
export function validateCurrentTaskFrontmatter(fm) {
  const required = [
    "task_id",
    "arquivo_task",
    "classe",
    "data_abertura",
    "status",
    "ultima_atualizacao",
    "atualizado_por",
  ];
  for (const key of required) {
    if (!(key in fm) || fm[key] === undefined || fm[key] === "") {
      throw new Error(`current-task.md: campo obrigatório ausente: ${key}`);
    }
  }
  if (!VALID_STATUSES.has(String(fm.status))) {
    throw new Error(`current-task.md: status inválido: ${fm.status}`);
  }
  return true;
}

/**
 * Parser YAML mínimo. Aceita:
 *   chave: valor
 *   chave: "valor"
 *   chave: |     (block scalar, valor multilinha indentado)
 *   chave:       (objeto/lista — não suportado neste subset)
 *   chave: [a, b]
 *
 * Restrições deliberadas: sem aninhamento, sem âncoras, sem tags, sem flow maps.
 * Suficiente para frontmatter e entries simples; bloco JSON é parseado por JSON.parse.
 */
export function parseSimpleYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = {};
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.trim().startsWith("#")) {
      i++;
      continue;
    }
    const indentMatch = raw.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    if (indent > 0) {
      // top-level keys only — ignore deeper continuations here
      i++;
      continue;
    }
    const m = raw.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) {
      throw new Error(`parseSimpleYaml: linha inválida: ${JSON.stringify(raw)}`);
    }
    const key = m[1];
    let value = m[2];
    if (value === "|") {
      // block scalar: consume indented lines until dedent
      i++;
      const collected = [];
      while (i < lines.length) {
        const cur = lines[i];
        const curIndent = (cur.match(/^(\s*)/) || ["", ""])[1].length;
        if (cur.trim() === "" && i + 1 < lines.length) {
          // allow blank lines inside block scalar
          collected.push("");
          i++;
          continue;
        }
        if (curIndent === 0 && cur.trim() !== "") break;
        collected.push(cur.replace(/^\s\s/, ""));
        i++;
      }
      out[key] = collected.join("\n").replace(/\n+$/, "");
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      if (inner === "") {
        out[key] = [];
      } else {
        out[key] = inner.split(",").map((s) => stripQuotes(s.trim()));
      }
      i++;
      continue;
    }
    out[key] = coerceScalar(stripQuotes(value));
    i++;
  }
  return out;
}

function stripQuotes(s) {
  if (s.length >= 2) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
  }
  return s;
}

function coerceScalar(s) {
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "") return null;
  // Só coage para Number quando cabe em safe integer (≤ 15 dígitos);
  // evita perda de precisão e impede que strings tipo SHA256 puro-digito virem 0.
  if (/^-?\d+$/.test(s) && s.replace(/^-/, "").length <= 15) return Number(s);
  if (/^-?\d+\.\d+$/.test(s) && s.replace(/^-/, "").split(".")[0].length <= 15) return Number(s);
  return s;
}

/**
 * Extrai entradas YAML separadas por `---` de ai/decision-log.md.
 * Ignora cabeçalho markdown (qualquer coisa antes do primeiro `---`).
 * Retorna entries com timestamps ISO 8601 estritamente monotônicos crescentes.
 */
export function parseDecisionLog(md) {
  if (typeof md !== "string") {
    throw new Error("parseDecisionLog: input não é string");
  }
  // Encontra o primeiro `---` numa linha sozinha, considera anterior como cabeçalho
  const firstSep = md.match(/(^|\n)---\s*\n/);
  if (!firstSep) {
    return [];
  }
  const startIdx = firstSep.index + firstSep[0].length;
  const rest = md.slice(startIdx);
  const blocks = rest
    .split(/\n---\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const entries = blocks.map((block, idx) => {
    let parsed;
    try {
      parsed = parseSimpleYaml(block);
    } catch (err) {
      throw new Error(`decision-log: entry #${idx + 1} YAML inválido: ${err.message}`);
    }
    validateDecisionEntry(parsed, idx + 1);
    return parsed;
  });

  // Monotonicidade de timestamps (estritamente crescente)
  for (let i = 1; i < entries.length; i++) {
    const prev = Date.parse(String(entries[i - 1].timestamp));
    const cur = Date.parse(String(entries[i].timestamp));
    if (!Number.isFinite(prev) || !Number.isFinite(cur)) {
      throw new Error(`decision-log: timestamp inválido em entry #${i + 1}`);
    }
    if (cur <= prev) {
      throw new Error(
        `decision-log: timestamps fora de ordem entre entry #${i} e #${i + 1}`,
      );
    }
  }
  return entries;
}

function validateDecisionEntry(entry, n) {
  const required = [
    "timestamp",
    "task_id",
    "decision_point",
    "veredito_gpt",
    "decisao_humana",
    "responsavel",
    "justificativa",
    "override",
  ];
  for (const key of required) {
    if (!(key in entry)) {
      throw new Error(`decision-log: entry #${n} sem campo obrigatório: ${key}`);
    }
  }
  if (!VALID_DECISION_POINTS.has(String(entry.decision_point))) {
    throw new Error(`decision-log: entry #${n} decision_point inválido: ${entry.decision_point}`);
  }
  if (!VALID_VEREDITOS.has(String(entry.veredito_gpt))) {
    throw new Error(`decision-log: entry #${n} veredito_gpt inválido: ${entry.veredito_gpt}`);
  }
  if (!VALID_DECISIONS.has(String(entry.decisao_humana))) {
    throw new Error(`decision-log: entry #${n} decisao_humana inválido: ${entry.decisao_humana}`);
  }
  if (entry.override === true) {
    if (!entry.risco_assumido || String(entry.risco_assumido).trim() === "") {
      throw new Error(`decision-log: entry #${n} override=true exige risco_assumido não-vazio`);
    }
    if (!entry.justificativa || String(entry.justificativa).length < 80) {
      throw new Error(`decision-log: entry #${n} override=true exige justificativa >= 80 chars`);
    }
  }
}

/**
 * Extrai o bloco JSON canônico de ai/gpt-review.md.
 * Procura o último fenced code block ```json ... ``` no arquivo.
 */
export function extractStructuredBlock(md) {
  if (typeof md !== "string") {
    throw new Error("extractStructuredBlock: input não é string");
  }
  const re = /```json\s*\n([\s\S]*?)\n```/g;
  let last = null;
  let m;
  while ((m = re.exec(md)) !== null) {
    last = m[1];
  }
  if (last === null) {
    throw new Error("gpt-review.md: bloco ```json estruturado não encontrado");
  }
  let parsed;
  try {
    parsed = JSON.parse(last);
  } catch (err) {
    throw new Error(`gpt-review.md: JSON inválido: ${err.message}`);
  }
  validateStructuredBlock(parsed);
  return parsed;
}

function validateStructuredBlock(b) {
  const requiredTop = [
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
  ];
  for (const k of requiredTop) {
    if (!(k in b)) {
      throw new Error(`gpt-review.json: campo obrigatório ausente: ${k}`);
    }
  }
  if (!VALID_VEREDITOS.has(String(b.veredito))) {
    throw new Error(`gpt-review.json: veredito inválido: ${b.veredito}`);
  }
  if (!Array.isArray(b.blockers)) {
    throw new Error(`gpt-review.json: blockers deve ser array`);
  }
  if (!Array.isArray(b.invariantes)) {
    throw new Error(`gpt-review.json: invariantes deve ser array`);
  }
  // cada invariante deve ter id reconhecido, status válido
  const validStatuses = new Set(Object.values(INVARIANT_STATUS));
  const allowedIds = new Set(INVARIANT_IDS);
  for (const [i, inv] of b.invariantes.entries()) {
    if (!inv || typeof inv !== "object") {
      throw new Error(`gpt-review.json: invariantes[${i}] inválido`);
    }
    if (!allowedIds.has(String(inv.id))) {
      throw new Error(`gpt-review.json: invariantes[${i}].id desconhecido: ${inv.id}`);
    }
    if (!validStatuses.has(String(inv.status))) {
      throw new Error(`gpt-review.json: invariantes[${i}].status inválido: ${inv.status}`);
    }
  }
  // cobertura: todas as 7 invariantes presentes (sem duplicatas)
  const seen = new Set(b.invariantes.map((i) => String(i.id)));
  if (seen.size !== INVARIANT_IDS.length) {
    throw new Error(
      `gpt-review.json: invariantes incompleto. Encontradas ${seen.size}/${INVARIANT_IDS.length}`,
    );
  }
  // justificativa_resumida <= 500
  if (
    typeof b.justificativa_resumida !== "string" ||
    b.justificativa_resumida.length > 500
  ) {
    throw new Error(`gpt-review.json: justificativa_resumida deve ser string <= 500 chars`);
  }
}

/**
 * SHA-256 hex de uma string. Determinístico.
 */
export function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Lê .env.local minimalmente: linhas KEY=VALUE, comentários # ignorados,
 * aspas opcionais. Retorna mapa puro; não muta process.env.
 */
export function loadDotEnvLocal(path = ".env.local") {
  if (!existsSync(path)) {
    return {};
  }
  const raw = readFileSync(path, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][\w-]*)=(.*)$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

export const _internal = {
  parseSimpleYaml,
  stripQuotes,
  coerceScalar,
};
