import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseFrontmatter,
  validateCurrentTaskFrontmatter,
  parseDecisionLog,
  extractStructuredBlock,
  sha256,
} from "../lib/parsers.mjs";

import {
  buildCurrentTaskMd,
  buildGptReviewJson,
  buildGptReviewMd,
  buildDecisionLogEntry,
  buildDecisionLogWithEntries,
  buildDecisionLogEmpty,
} from "./fixtures/builders.mjs";

// T1: parseFrontmatter válido
test("T1 parseFrontmatter — campos obrigatórios presentes", () => {
  const md = buildCurrentTaskMd({ taskId: "TOOL-001" });
  const { frontmatter } = parseFrontmatter(md);
  validateCurrentTaskFrontmatter(frontmatter);
  assert.equal(frontmatter.task_id, "TOOL-001");
  assert.equal(frontmatter.status, "em_planejamento");
  assert.equal(frontmatter.classe, "A");
});

// T2: parseFrontmatter inválido — campo faltando
test("T2 parseFrontmatter — campo faltando rejeita com nome", () => {
  const md = `---
task_id: TOOL-X
classe: A
data_abertura: 2026-05-22
status: em_planejamento
ultima_atualizacao: 2026-05-22T10:00:00-03:00
atualizado_por: humano
---
corpo`;
  const { frontmatter } = parseFrontmatter(md);
  assert.throws(
    () => validateCurrentTaskFrontmatter(frontmatter),
    /arquivo_task/,
  );
});

// T3: parseDecisionLog vazio
test("T3 parseDecisionLog vazio → array vazio", () => {
  const md = buildDecisionLogEmpty();
  const entries = parseDecisionLog(md);
  assert.deepEqual(entries, []);
});

// T4: parseDecisionLog 3 entries monotônicas
test("T4 parseDecisionLog — 3 entries monotônicas", () => {
  const e1 = buildDecisionLogEntry({ timestamp: "2026-05-22T10:00:00-03:00" });
  const e2 = buildDecisionLogEntry({ timestamp: "2026-05-22T11:00:00-03:00" });
  const e3 = buildDecisionLogEntry({ timestamp: "2026-05-22T12:00:00-03:00" });
  const md = buildDecisionLogWithEntries([e1, e2, e3]);
  const entries = parseDecisionLog(md);
  assert.equal(entries.length, 3);
});

// T5: parseDecisionLog timestamps fora de ordem
test("T5 parseDecisionLog — timestamps fora de ordem → erro", () => {
  const e1 = buildDecisionLogEntry({ timestamp: "2026-05-22T12:00:00-03:00" });
  const e2 = buildDecisionLogEntry({ timestamp: "2026-05-22T11:00:00-03:00" });
  const md = buildDecisionLogWithEntries([e1, e2]);
  assert.throws(() => parseDecisionLog(md), /fora de ordem/);
});

// T6: extractStructuredBlock válido
test("T6 extractStructuredBlock — JSON canônico válido", () => {
  const block = buildGptReviewJson({ taskId: "TOOL-XYZ" });
  const md = buildGptReviewMd(block);
  const out = extractStructuredBlock(md);
  assert.equal(out.task_id, "TOOL-XYZ");
  assert.equal(out.invariantes.length, 7);
});

// T7: extractStructuredBlock ausente
test("T7 extractStructuredBlock — bloco ausente → erro", () => {
  const md = "# Sem bloco JSON\n\nApenas narrativa.";
  assert.throws(() => extractStructuredBlock(md), /bloco/);
});

// T8: extractStructuredBlock JSON malformado
test("T8 extractStructuredBlock — JSON malformado → erro", () => {
  const md = "# Review\n\n```json\n{ not valid json }\n```\n";
  assert.throws(() => extractStructuredBlock(md), /JSON inválido/);
});

// T9: extractStructuredBlock fora do schema — campo obrigatório faltando
test("T9 extractStructuredBlock — campo obrigatório ausente → erro nominal", () => {
  const block = buildGptReviewJson();
  delete block.veredito;
  const md = buildGptReviewMd(block);
  assert.throws(() => extractStructuredBlock(md), /veredito/);
});

// T-extra: sha256 determinístico
test("Textra-A sha256 — determinístico", () => {
  const a = sha256("foo");
  const b = sha256("foo");
  assert.equal(a, b);
  assert.notEqual(a, sha256("bar"));
});
