#!/usr/bin/env node
/**
 * Testes estruturais dos subagents Claude Code (TOOL-005).
 *
 * Valida o esqueleto e as invariantes mecânicas dos arquivos em `.claude/agents/`:
 * - existência dos 4 agentes
 * - frontmatter YAML válido com campos obrigatórios
 * - permissões restritas via `tools` (read-only agents sem Write/Edit/NotebookEdit)
 * - `task-planner-agent` sem Bash
 * - `close-commit-agent` SEM Bash (invariante crítica isolada)
 * - frase de proteção `"NÃO substitui"` em cada system prompt
 * - README cobre os 4 agentes pelo nome
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

const AGENTS = [
  "context-gate-agent",
  "task-planner-agent",
  "test-qa-agent",
  "close-commit-agent",
];

const READ_ONLY_AGENTS = ["context-gate-agent", "test-qa-agent", "close-commit-agent"];

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

describe("TOOL-005 — subagents Claude Code (validação estrutural)", () => {
  test("T-AGT-1: os 4 arquivos de agent existem em .claude/agents/", () => {
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

  test("T-AGT-6: .claude/agents/README.md existe e referencia os 4 agentes pelo nome", () => {
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
});
