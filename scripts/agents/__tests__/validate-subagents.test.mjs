#!/usr/bin/env node
/**
 * Testes estruturais dos subagents Claude Code (TOOL-005 + TOOL-006 + TOOL-006B).
 *
 * TOOL-005 introduziu os 4 agentes base de governança:
 *   - context-gate-agent (haiku; Read, Bash, Grep, Glob)
 *   - task-planner-agent (sonnet; Read, Grep, Glob)
 *   - test-qa-agent (haiku; Read, Bash, Grep, Glob)
 *   - close-commit-agent (haiku; Read, Grep, Glob — SEM Bash)
 *
 * TOOL-006 adicionou 11 agentes read-only (tools: Read, Grep, Glob):
 *   - 8 especialistas por épico (E02..E09)
 *   - 3 transversais (irrigation-methodology, ux-dx, software-project-manager)
 *
 * Total: 15 agentes.
 *
 * TOOL-006B calibrou exclusivamente o map-workspace-agent contra hardcode de
 * contagens globais — adicionou T-AGT-9 (regra) e T-AGT-10 (fallback literal).
 * Origem: Smoke 05 da TOOL-006A foi PARCIAL (hardcode vitest 826/826).
 * Total de testes estruturais: 10 (era 8 — +2 da TOOL-006B).
 *
 * Política em `docs/decisoes/ADR-016-subagents-claude-code-camada-aditiva-governanca.md`.
 * Uso: invocado por `scripts/ai/__tests__/run-all.mjs`.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const AGENTS_DIR = resolve(REPO_ROOT, ".claude/agents");

// 4 agentes de governança (TOOL-005)
const GOVERNANCE_AGENTS = [
  "context-gate-agent",
  "task-planner-agent",
  "test-qa-agent",
  "close-commit-agent",
];

// 8 agentes especialistas por épico (TOOL-006)
const SPECIALIST_AGENTS = [
  "architecture-layout-agent",
  "hydraulics-agent",
  "constructability-agent",
  "bom-catalog-agent",
  "map-workspace-agent",
  "proposal-pdf-agent",
  "commercial-engine-agent",
  "field-validation-agent",
];

// 3 agentes transversais (TOOL-006)
const CROSS_FUNCTIONAL_AGENTS = [
  "irrigation-methodology-agent",
  "ux-dx-agent",
  "software-project-manager-agent",
];

// 11 agentes novos da TOOL-006 (especialistas + transversais) — todos read-only com tools exatos
const TOOL_006_AGENTS = [...SPECIALIST_AGENTS, ...CROSS_FUNCTIONAL_AGENTS];

// Total: 15 agentes
const AGENTS = [...GOVERNANCE_AGENTS, ...TOOL_006_AGENTS];

// Read-only no sentido de NÃO ter Write/Edit/NotebookEdit
// (task-planner-agent é coberto por T-AGT-4 separadamente; close-commit-agent + context-gate-agent + test-qa-agent + os 11 da TOOL-006 entram aqui)
const READ_ONLY_AGENTS = [
  "context-gate-agent",
  "test-qa-agent",
  "close-commit-agent",
  ...TOOL_006_AGENTS,
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

function readAgent(name) {
  const path = resolve(AGENTS_DIR, `${name}.md`);
  return { path, content: readFileSync(path, "utf8") };
}

function toolsList(fm) {
  if (!fm.tools) return [];
  return fm.tools.split(",").map((s) => s.trim()).filter(Boolean);
}

describe("TOOL-005 + TOOL-006 — subagents Claude Code (validação estrutural)", () => {
  test("T-AGT-1: os 15 arquivos de agent existem em .claude/agents/", () => {
    for (const name of AGENTS) {
      const path = resolve(AGENTS_DIR, `${name}.md`);
      assert.ok(existsSync(path), `agent ausente: ${path}`);
    }
  });

  test("T-AGT-2: cada agent tem frontmatter YAML válido com name e description", () => {
    for (const name of AGENTS) {
      const { content } = readAgent(name);
      const fm = parseFrontmatter(content);
      assert.ok(fm, `frontmatter ausente em ${name}`);
      assert.equal(fm.name, name, `name divergente em ${name}: ${fm.name}`);
      assert.ok(
        fm.description && fm.description.length > 20,
        `description curta ou ausente em ${name}`
      );
    }
  });

  test("T-AGT-3: agents read-only não listam Write/Edit/NotebookEdit em tools", () => {
    const FORBIDDEN = ["Write", "Edit", "NotebookEdit"];
    for (const name of READ_ONLY_AGENTS) {
      const { content } = readAgent(name);
      const fm = parseFrontmatter(content);
      assert.ok(
        fm.tools,
        `${name} precisa de tools explícito — read-only exige restrição mecânica`
      );
      const tools = toolsList(fm);
      for (const f of FORBIDDEN) {
        assert.ok(
          !tools.includes(f),
          `${name} listou tool proibido ${f} — viola política read-only`
        );
      }
    }
  });

  test("T-AGT-4: task-planner-agent não tem Bash/Write/Edit/NotebookEdit", () => {
    const { content } = readAgent("task-planner-agent");
    const fm = parseFrontmatter(content);
    assert.ok(fm.tools, "task-planner-agent precisa de tools explícito");
    const tools = toolsList(fm);
    for (const f of ["Bash", "Write", "Edit", "NotebookEdit"]) {
      assert.ok(
        !tools.includes(f),
        `task-planner-agent listou tool proibido ${f} — viola política read+no-bash`
      );
    }
  });

  test("T-AGT-5: cada system prompt contém a frase de proteção 'NÃO substitui'", () => {
    for (const name of AGENTS) {
      const { content } = readAgent(name);
      assert.ok(
        content.includes("NÃO substitui"),
        `${name} não contém a frase literal 'NÃO substitui' — frase de proteção obrigatória por ADR-016`
      );
    }
  });

  test("T-AGT-6: .claude/agents/README.md existe e referencia os 15 agentes pelo nome", () => {
    const readmePath = resolve(AGENTS_DIR, "README.md");
    assert.ok(existsSync(readmePath), "README.md ausente em .claude/agents/");
    const readme = readFileSync(readmePath, "utf8");
    for (const name of AGENTS) {
      assert.ok(
        readme.includes(name),
        `README.md não referencia ${name} — documentação incompleta`
      );
    }
  });

  test("T-AGT-7: close-commit-agent NÃO tem Bash em tools (invariante crítica)", () => {
    const { content } = readAgent("close-commit-agent");
    const fm = parseFrontmatter(content);
    assert.ok(fm.tools, "close-commit-agent precisa de tools explícito");
    const tools = toolsList(fm);
    assert.ok(
      !tools.includes("Bash"),
      "close-commit-agent NÃO PODE ter Bash em tools — risco crítico de auto-commit (ADR-016 §6)"
    );
  });

  test("T-AGT-8: agents da TOOL-006 (11) têm tools exatamente Read, Grep, Glob", () => {
    const EXPECTED_TOOLS = ["Read", "Grep", "Glob"];
    for (const name of TOOL_006_AGENTS) {
      const { content } = readAgent(name);
      const fm = parseFrontmatter(content);
      assert.ok(fm.tools, `${name} precisa de tools explícito`);
      const tools = toolsList(fm);
      assert.deepEqual(
        [...tools].sort(),
        [...EXPECTED_TOOLS].sort(),
        `${name} tools deve ser exatamente Read, Grep, Glob (sem Bash, sem extras). Atual: ${tools.join(", ")}`
      );
    }
  });

  // TOOL-006B: calibração do map-workspace-agent contra hardcode de contagens globais.
  // Origem: Smoke 05 da TOOL-006A classificado PARCIAL — agente hardcodeou
  // "vitest 826/826" em closing statement quando o baseline real era 887/887.
  // Não houve mudança de tools (continua read-only com Read, Grep, Glob).
  // Validação estrutural: regra + fallback devem estar literalmente documentados no charter.

  test("T-AGT-9: map-workspace-agent documenta regra contra hardcode de contagens GLOBAIS (TOOL-006B)", () => {
    const { content } = readAgent("map-workspace-agent");
    assert.ok(
      /contagens globais|status global/i.test(content),
      "map-workspace-agent precisa documentar regra contra hardcode de contagens GLOBAIS (vitest, TypeScript, tooling, branch, git status, baseline) — TOOL-006B calibração"
    );
  });

  test("T-AGT-10: map-workspace-agent contém fallback literal 'Não verificado nesta análise' (TOOL-006B)", () => {
    const { content } = readAgent("map-workspace-agent");
    assert.ok(
      content.includes("Não verificado nesta análise"),
      "map-workspace-agent precisa documentar o fallback literal 'Não verificado nesta análise.' para citação de contagens globais sem fonte — TOOL-006B calibração"
    );
  });
});
