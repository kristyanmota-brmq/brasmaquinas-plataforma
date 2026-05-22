import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReviewPrompt } from "../build-review-prompt.mjs";
import { PERMANENT_INVARIANTS, INVARIANT_IDS } from "../lib/invariants.mjs";

// T18: prompt inclui as 7 invariantes literalmente
test("T18 buildReviewPrompt — 7 invariantes literalmente presentes no prompt de sistema", () => {
  const { system, json_schema } = buildReviewPrompt({
    projectState: "ps",
    currentTask: "ct",
    claudeReport: "cr",
    taskId: "TOOL-X",
    modeloGpt: "fixture-model",
  });
  for (const inv of PERMANENT_INVARIANTS) {
    assert.ok(system.includes(inv.id), `invariante ${inv.id} ausente do prompt`);
    assert.ok(system.includes(inv.descricao), `descrição da invariante ${inv.id} ausente do prompt`);
  }
  // schema cobre todos os IDs
  const enumIds = json_schema.schema.properties.invariantes.items.properties.id.enum;
  assert.deepEqual(new Set(enumIds), new Set(INVARIANT_IDS));
  // minItems = maxItems = 7
  assert.equal(json_schema.schema.properties.invariantes.minItems, INVARIANT_IDS.length);
  assert.equal(json_schema.schema.properties.invariantes.maxItems, INVARIANT_IDS.length);
});

// T19: schema marca todos os campos canônicos como required
test("T19 buildReviewPrompt — schema marca campos canônicos como required", () => {
  const { json_schema } = buildReviewPrompt({
    projectState: "ps",
    currentTask: "ct",
    claudeReport: "cr",
    taskId: "TOOL-X",
    modeloGpt: "fixture-model",
  });
  const required = json_schema.schema.required;
  for (const k of [
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
  ]) {
    assert.ok(required.includes(k), `campo ${k} deveria estar em required`);
  }
  assert.equal(json_schema.strict, true);
});
