import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runValidation } from "../validate-structure.mjs";
import { sha256 } from "../lib/parsers.mjs";
import { INVARIANT_STATUS, PERMANENT_INVARIANTS } from "../lib/invariants.mjs";
import {
  makeSandbox,
  writeSandboxAi,
  buildClaudeReportMd,
  buildGptReviewJson,
  buildGptReviewMd,
  buildDecisionLogEntry,
  buildDecisionLogWithEntries,
  buildDecisionLogEmpty,
  buildCurrentTaskMd,
} from "./fixtures/builders.mjs";

// T10: 5 arquivos válidos → ok
test("T10 validate-structure — 5 arquivos válidos → ok", () => {
  const sb = makeSandbox();
  const { ai } = writeSandboxAi(sb, {
    currentTask: buildCurrentTaskMd({ taskId: "TOOL-T10" }),
    gptReview: buildGptReviewMd(buildGptReviewJson({ taskId: "TOOL-T10" })),
  });
  const result = runValidation({ task: "TOOL-T10", aiDir: ai, decisionLogHead: null });
  assert.deepEqual(result.errors, [], `errors: ${result.errors.join(" | ")}`);
  assert.equal(result.ok, true);
});

// T11: claude-report sem seção → erro nominal
test("T11 validate-structure — claude-report sem seção obrigatória → erro com nome da seção", () => {
  const sb = makeSandbox();
  const { ai } = writeSandboxAi(sb, {
    currentTask: buildCurrentTaskMd({ taskId: "TOOL-T11" }),
    claudeReport: buildClaudeReportMd({ withAllSections: false }),
    gptReview: buildGptReviewMd(buildGptReviewJson({ taskId: "TOOL-T11" })),
  });
  const result = runValidation({ task: "TOOL-T11", aiDir: ai, decisionLogHead: null });
  assert.equal(result.ok, false);
  const hasReportError = result.errors.some((e) => /claude-report\.md/.test(e) && /Riscos/.test(e));
  assert.ok(hasReportError, `esperava erro citando claude-report.md e Riscos; got: ${result.errors.join(" | ")}`);
});

// T12: override sem risco_assumido → erro
test("T12 validate-structure — override sem risco_assumido → erro", () => {
  const sb = makeSandbox();
  const gptJson = buildGptReviewJson({ taskId: "TOOL-T12", veredito: "reprovado" });
  const gptMd = buildGptReviewMd(gptJson);
  const hash = sha256(gptMd);
  const entry = buildDecisionLogEntry({
    taskId: "TOOL-T12",
    veredito: "reprovado",
    decisao: "aprovado",
    override: true,
    justificativa: "Justificativa suficiente com mais de oitenta caracteres para passar do mínimo exigido.",
    riscoAssumido: null, // INTENCIONAL — força erro
    hashGptReview: hash,
  });
  const log = buildDecisionLogWithEntries([entry]);
  const { ai } = writeSandboxAi(sb, {
    currentTask: buildCurrentTaskMd({ taskId: "TOOL-T12" }),
    gptReview: gptMd,
    decisionLog: log,
  });
  const result = runValidation({ task: "TOOL-T12", aiDir: ai, decisionLogHead: null });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => /risco_assumido/.test(e)),
    `esperava erro de risco_assumido; got: ${result.errors.join(" | ")}`,
  );
});

// T13: override com justificativa curta → erro
test("T13 validate-structure — override com justificativa < 80 chars → erro", () => {
  const sb = makeSandbox();
  const gptJson = buildGptReviewJson({ taskId: "TOOL-T13", veredito: "reprovado" });
  const gptMd = buildGptReviewMd(gptJson);
  const entry = buildDecisionLogEntry({
    taskId: "TOOL-T13",
    veredito: "reprovado",
    decisao: "aprovado",
    override: true,
    justificativa: "curta demais",
    riscoAssumido: "aceito",
    hashGptReview: sha256(gptMd),
  });
  const log = buildDecisionLogWithEntries([entry]);
  const { ai } = writeSandboxAi(sb, {
    currentTask: buildCurrentTaskMd({ taskId: "TOOL-T13" }),
    gptReview: gptMd,
    decisionLog: log,
  });
  const result = runValidation({ task: "TOOL-T13", aiDir: ai, decisionLogHead: null });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => /justificativa/.test(e)),
    `esperava erro de justificativa; got: ${result.errors.join(" | ")}`,
  );
});

// T14: invariante violada + override true → trava terminal
test("T14 validate-structure — invariante violada + override true → bloqueio terminal", () => {
  const sb = makeSandbox();
  const invariantesComViolada = PERMANENT_INVARIANTS.map((inv, idx) => ({
    id: inv.id,
    descricao: inv.descricao,
    status: idx === 0 ? INVARIANT_STATUS.VIOLADA : INVARIANT_STATUS.OK,
    justificativa: idx === 0 ? "Plano altera catálogo sem SKU homologado" : "OK",
  }));
  const gptJson = buildGptReviewJson({
    taskId: "TOOL-T14",
    veredito: "blocker_invariante_permanente",
    invariantesOverride: invariantesComViolada,
    overridePermitido: false,
  });
  const gptMd = buildGptReviewMd(gptJson);
  const entry = buildDecisionLogEntry({
    taskId: "TOOL-T14",
    veredito: "blocker_invariante_permanente",
    decisao: "aprovado",
    override: true,
    justificativa: "Tentativa de override sobre invariante terminal — deve ser rejeitado pelo validador.",
    riscoAssumido: "ignorar invariante",
    hashGptReview: sha256(gptMd),
  });
  const log = buildDecisionLogWithEntries([entry]);
  const { ai } = writeSandboxAi(sb, {
    currentTask: buildCurrentTaskMd({ taskId: "TOOL-T14" }),
    gptReview: gptMd,
    decisionLog: log,
  });
  const result = runValidation({ task: "TOOL-T14", aiDir: ai, decisionLogHead: null });
  assert.equal(result.ok, false);
  assert.equal(result.overrideDerivado, false);
  assert.ok(
    result.errors.some((e) => /terminal/.test(e)),
    `esperava erro citando bloqueio terminal; got: ${result.errors.join(" | ")}`,
  );
});

// T15: decision-log encolheu vs HEAD → erro
test("T15 validate-structure — decision-log encolheu vs HEAD → erro", () => {
  const sb = makeSandbox();
  const gptJson = buildGptReviewJson({ taskId: "TOOL-T15" });
  const gptMd = buildGptReviewMd(gptJson);
  const e1 = buildDecisionLogEntry({ timestamp: "2026-05-22T10:00:00-03:00", taskId: "TOOL-T15", hashGptReview: sha256(gptMd) });
  const e2 = buildDecisionLogEntry({ timestamp: "2026-05-22T11:00:00-03:00", taskId: "TOOL-T15", hashGptReview: sha256(gptMd) });
  const headLog = buildDecisionLogWithEntries([e1, e2]);
  const currentLog = buildDecisionLogWithEntries([e1]); // encolheu
  const { ai } = writeSandboxAi(sb, {
    currentTask: buildCurrentTaskMd({ taskId: "TOOL-T15" }),
    gptReview: gptMd,
    decisionLog: currentLog,
  });
  const result = runValidation({ task: "TOOL-T15", aiDir: ai, decisionLogHead: headLog });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /encolheu/.test(e)));
});

// T16: hash_gpt_review da última entry diverge → erro
test("T16 validate-structure — hash_gpt_review da última entry ≠ hash atual → erro", () => {
  const sb = makeSandbox();
  const gptJson = buildGptReviewJson({ taskId: "TOOL-T16" });
  const gptMd = buildGptReviewMd(gptJson);
  const entry = buildDecisionLogEntry({
    taskId: "TOOL-T16",
    hashGptReview: "0".repeat(64), // hash falso
  });
  const log = buildDecisionLogWithEntries([entry]);
  const { ai } = writeSandboxAi(sb, {
    currentTask: buildCurrentTaskMd({ taskId: "TOOL-T16" }),
    gptReview: gptMd,
    decisionLog: log,
  });
  const result = runValidation({ task: "TOOL-T16", aiDir: ai, decisionLogHead: null });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /hash_gpt_review/.test(e)));
});

// T17: validate-structure é read-only sobre status
test("T17 validate-structure — read-only sobre status (não altera arquivos)", () => {
  const sb = makeSandbox();
  const currentTaskMd = buildCurrentTaskMd({ taskId: "TOOL-T17", status: "em_planejamento" });
  const { ai } = writeSandboxAi(sb, {
    currentTask: currentTaskMd,
    gptReview: buildGptReviewMd(buildGptReviewJson({ taskId: "TOOL-T17" })),
  });
  const before = readFileSync(join(ai, "current-task.md"), "utf8");
  const result = runValidation({ task: "TOOL-T17", aiDir: ai, decisionLogHead: null });
  const after = readFileSync(join(ai, "current-task.md"), "utf8");
  assert.equal(before, after, "validate-structure NÃO deve alterar current-task.md");
  assert.equal(result.statusAtual, "em_planejamento");
  // valida que sugeriu próximo status sem aplicar
  assert.equal(result.statusSugerido, "aguardando_revisao_gpt");
});
