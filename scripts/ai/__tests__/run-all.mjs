#!/usr/bin/env node
/**
 * Runner agregador dos testes da TOOL-001.
 * Usa node:test (run programático) para garantir que todos os arquivos *.test.mjs rodem
 * em uma só invocação, sem depender do CLI `node --test`.
 *
 * Uso: node scripts/ai/__tests__/run-all.mjs
 *
 * Saída: relatório TAP no stdout; exit 0 se todos passarem, 1 caso contrário.
 */

import { run } from "node:test";
import { tap } from "node:test/reporters";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = readdirSync(__dirname)
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => resolve(__dirname, f));

if (files.length === 0) {
  process.stderr.write("nenhum arquivo *.test.mjs encontrado\n");
  process.exit(2);
}

process.stdout.write(`# TOOL-001 tooling tests — ${files.length} arquivo(s)\n`);
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
    process.stderr.write(`\nTOOL-001 tests: ${failed} falha(s)\n`);
    process.exit(1);
  }
  process.stdout.write("\nTOOL-001 tests: todos passaram\n");
  process.exit(0);
});
