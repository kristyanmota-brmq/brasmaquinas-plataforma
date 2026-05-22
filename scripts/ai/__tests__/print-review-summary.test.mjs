import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSummary } from "../print-review-summary.mjs";
import { INVARIANT_STATUS, PERMANENT_INVARIANTS } from "../lib/invariants.mjs";
import {
  buildGptReviewJson,
  buildGptReviewMd,
  buildCurrentTaskMd,
} from "./fixtures/builders.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// T20: gpt-review válido com veredito "aprovado" → resumo OK
// ─────────────────────────────────────────────────────────────────────────────
test("T20 print-review-summary — gpt-review válido aprovado → resumo OK", () => {
  const gptReviewRaw = buildGptReviewMd(
    buildGptReviewJson({ taskId: "TOOL-T20", veredito: "aprovado" }),
  );
  const currentTaskRaw = buildCurrentTaskMd({ taskId: "TOOL-T20", status: "aguardando_revisao_gpt" });

  const result = buildSummary({
    taskArg: "TOOL-T20",
    gptReviewRaw,
    currentTaskRaw,
  });

  assert.equal(result.ok, true, `errors: ${result.errors.join(" | ")}`);
  assert.equal(result.exitCode, 0);
  const out = result.lines.join("\n");
  assert.match(out, /task_id\s*:\s*TOOL-T20/);
  assert.match(out, /veredito\s*:\s*aprovado/);
  assert.match(out, /blockers_count\s*:\s*0/);
  assert.match(out, /status_atual\s*:\s*aguardando_revisao_gpt/);
});

// ─────────────────────────────────────────────────────────────────────────────
// T21: gpt-review ausente → erro stderr, exit ≠ 0
// ─────────────────────────────────────────────────────────────────────────────
test("T21 print-review-summary — gpt-review ausente → erro exit 3", () => {
  const result = buildSummary({
    taskArg: "TOOL-T21",
    gptReviewRaw: null,
    currentTaskRaw: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 3);
  assert.ok(result.errors.length >= 1, "deve ter mensagem de erro");
  assert.match(result.errors[0], /n[ãa]o encontrado/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// T22: task_id divergente → exit 2
// ─────────────────────────────────────────────────────────────────────────────
test("T22 print-review-summary — task_id divergente → exit 2", () => {
  const gptReviewRaw = buildGptReviewMd(
    buildGptReviewJson({ taskId: "TOOL-DIFFERENT", veredito: "aprovado" }),
  );

  const result = buildSummary({
    taskArg: "TOOL-T22",
    gptReviewRaw,
    currentTaskRaw: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 2);
  assert.match(
    result.errors[0],
    /task_id\s*\(TOOL-DIFFERENT\)\s*≠\s*--task\s*TOOL-T22/,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// T23: 3 blockers → resumo lista os IDs
// ─────────────────────────────────────────────────────────────────────────────
test("T23 print-review-summary — 3 blockers → resumo lista IDs", () => {
  const blockers = [
    { id: "BLK-001", categoria: "metodologico", descricao: "fixture m1" },
    { id: "BLK-002", categoria: "tecnico", descricao: "fixture t2" },
    { id: "BLK-003", categoria: "metodologico", descricao: "fixture m3" },
  ];
  const gptReviewRaw = buildGptReviewMd(
    buildGptReviewJson({
      taskId: "TOOL-T23",
      veredito: "aprovado_com_ajustes",
      blockers,
    }),
  );

  const result = buildSummary({
    taskArg: "TOOL-T23",
    gptReviewRaw,
    currentTaskRaw: null,
  });

  assert.equal(result.ok, true);
  const out = result.lines.join("\n");
  assert.match(out, /blockers_count\s*:\s*3/);
  assert.match(out, /BLK-001/);
  assert.match(out, /BLK-002/);
  assert.match(out, /BLK-003/);
});

// ─────────────────────────────────────────────────────────────────────────────
// T24: invariante violada → destaque + override_derivado=false
// ─────────────────────────────────────────────────────────────────────────────
test("T24 print-review-summary — invariante violada → terminal + override_derivado false", () => {
  const invariantesOverride = PERMANENT_INVARIANTS.map((inv, idx) => ({
    id: inv.id,
    descricao: inv.descricao,
    status: idx === 0 ? INVARIANT_STATUS.VIOLADA : INVARIANT_STATUS.OK,
    justificativa: idx === 0 ? "fixture: violação simulada" : "fixture: ok",
  }));
  const violadaId = PERMANENT_INVARIANTS[0].id;

  const gptReviewRaw = buildGptReviewMd(
    buildGptReviewJson({
      taskId: "TOOL-T24",
      veredito: "blocker_invariante_permanente",
      blockers: [
        {
          id: "BLK-INV-001",
          categoria: "invariante_permanente",
          descricao: `Violação simulada de ${violadaId}`,
          invariante_id: violadaId,
        },
      ],
      invariantesOverride,
      overridePermitido: false,
    }),
  );

  const result = buildSummary({
    taskArg: "TOOL-T24",
    gptReviewRaw,
    currentTaskRaw: null,
  });

  assert.equal(result.ok, true);
  const out = result.lines.join("\n");
  assert.match(out, new RegExp(`INVARIANTE VIOLADA:\\s*${violadaId}`));
  assert.match(out, /override_permitido_derivado\s*:\s*false/);
  assert.match(out, /Reformular plano/);
});

// ─────────────────────────────────────────────────────────────────────────────
// T25: tokens/custo zerados (limitação V1 TOOL-002) → não quebra
// ─────────────────────────────────────────────────────────────────────────────
test("T25 print-review-summary — tokens/custo zerados não quebram resumo", () => {
  const gptReviewRaw = buildGptReviewMd(
    buildGptReviewJson({
      taskId: "TOOL-T25",
      veredito: "aprovado",
      metadata: { tokens_prompt: 0, tokens_completion: 0, custo_estimado_usd: 0 },
    }),
  );

  const result = buildSummary({
    taskArg: "TOOL-T25",
    gptReviewRaw,
    currentTaskRaw: null,
  });

  assert.equal(result.ok, true);
  const out = result.lines.join("\n");
  assert.match(out, /tokens_prompt\s*:\s*0/);
  assert.match(out, /tokens_completion\s*:\s*0/);
  assert.match(out, /custo_estimado_usd\s*:\s*0/);
  // Nota de limitação V1 deve aparecer quando tudo é zero
  assert.match(out, /telemetria V1/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// T26: argumento --task ausente → exit 5 com mensagem clara
// ─────────────────────────────────────────────────────────────────────────────
test("T26 print-review-summary — --task ausente → exit 5", () => {
  const result = buildSummary({
    taskArg: null,
    gptReviewRaw: "irrelevante",
    currentTaskRaw: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 5);
  assert.match(result.errors[0], /--task/);
});
