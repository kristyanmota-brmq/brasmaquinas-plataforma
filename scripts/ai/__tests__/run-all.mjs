#!/usr/bin/env node
/**
 * Runner agregador dos testes de tooling (TOOL-001 + TOOL-005).
 * Usa node:test (run programático) para garantir que todos os arquivos *.test.mjs rodem
 * em uma só invocação, sem depender do CLI `node --test`.
 *
 * Escaneia:
 *   - scripts/ai/__tests__/      (TOOL-001/002/003 — handoff Claude↔GPT)
 *   - scripts/agents/__tests__/  (TOOL-005 — subagents Claude Code)
 *
 * Uso: node scripts/ai/__tests__/run-all.mjs
 * Saída: relatório TAP no stdout; exit 0 se todos passarem, 1 caso contrário.
 */

import { run } from "node:test";
import { tap } from "node:test/reporters";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readdirSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const TEST_DIRS = [
  __dirname,
  resolve(REPO_ROOT, "scripts/agents/__tests__"),
].filter((d) => existsSync(d));

const files = TEST_DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".test.mjs"))
    .map((f) => resolve(dir, f))
);

if (files.length === 0) {
  process.stderr.write("nenhum arquivo *.test.mjs encontrado\n");
  process.exit(2);
}

process.stdout.write(`# tooling tests (TOOL-001 + TOOL-005) — ${files.length} arquivo(s)\n`);
for (const f of files) {
  process.stdout.write(`# ${f}\n`);
}

const stream = run({ files, concurrency: 1 });

let failed = 0;
stream.on("test:fail", () => {
  failed++;
});

stream.compose(tap).pipe(process.stdout);

stream.on("end", () => {
  if (failed > 0) {
    process.stderr.write(`\ntooling tests: ${failed} falha(s)\n`);
    process.exit(1);
  }
  process.stdout.write("\ntooling tests: todos passaram\n");
  process.exit(0);
});
