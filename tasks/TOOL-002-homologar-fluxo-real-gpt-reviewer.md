# TOOL-002 — Homologar fluxo real Claude Code ↔ GPT Reviewer

**Status:** `concluída`
**Classe:** A — governança / tooling / metodologia
**Área:** infraestrutura / handoff / governança
**Predecessor:** TOOL-001 (handoff Claude Code ↔ GPT Reviewer — soft-dogfood; `aguardando_fechamento` terminal estável)
**Data de abertura:** 2026-05-22
**Data de fechamento:** 2026-05-22
**Veredito GPT:** `aprovado_com_ajustes`
**Decisão humana:** `aprovado_com_ajustes` (sem override)
**Relatório:** `docs/relatorios/2026-05-22-TOOL-002.md`

---

## Objetivo

Homologar o pipeline real do handoff TOOL-001 executando uma chamada autêntica à Responses API da OpenAI, validando end-to-end:

1. `/handoff-claude-report TOOL-002` → `ai/claude-report.md` (formato canônico).
2. `node scripts/ai/run-gpt-review.mjs --task TOOL-002` → chamada real → `ai/gpt-review.md` com JSON canônico.
3. `node scripts/ai/validate-structure.mjs --task TOOL-002` → OK.
4. Decisão humana em `ai/decision-log.md` (append-only).
5. Custo real registrado (sujeito à limitação V1 documentada).
6. **Nenhuma aprovação automática.**

Endereça pendência **R1** do relatório `docs/relatorios/2026-05-22-TOOL-001.md`.

---

## Resultado (resumo executivo)

| Item | Status |
|---|---|
| Pipeline real homologado end-to-end | ✅ |
| Primeira chamada real à Responses API (modelo `gpt-5.5`) | ✅ HTTP 200 (após ajuste de billing — Tentativa 2) |
| `ai/gpt-review.md` regenerado com JSON canônico válido | ✅ |
| `validate-structure --task TOOL-002` | ✅ OK (com 1 WARN não-bloqueante) |
| Invariantes violadas | 0/7 |
| Blockers metodológicos/técnicos apontados pelo GPT | 3 (todos resolvidos na Fase 5) |
| Decisão humana registrada em `decision-log.md` (append-only) | ✅ |
| Nenhum arquivo de produto alterado | ✅ |
| Nenhum secret exposto | ✅ |

---

## Estrutura por fase

Conforme separação obrigatória do BLK-MET-002 (registrada no relatório):

### Fase 1 — Serialização (autorizada e executada)
`/handoff-claude-report TOOL-002` → `ai/claude-report.md` regenerado; status transitivo `em_planejamento → aguardando_revisao_gpt`.

### Fase 2 — Chamada real (autorizada e executada — 2 tentativas)
- Tentativa 1: HTTP 429 `insufficient_quota` (billing); script abortou conforme desenho.
- Tentativa 2 (pós-ajuste billing): HTTP 200; JSON canônico gerado; `ai/gpt-review.md` gravado.

### Fase 3 — Validação estrutural (autorizada e executada)
`validate-structure.mjs --task TOOL-002` → **OK** com WARN.

### Fase 4 — Decisão humana (autorizada APÓS Fase 3 — executada)
Hash sha256 calculado; entry append-only em `ai/decision-log.md`; status `aguardando_revisao_gpt → aguardando_aprovacao_humana`.

### Fase 5 — Fechamento documental (autorizada APÓS Fase 4 — executada)
Aplicação dos 3 ajustes obrigatórios; criação do relatório; atualização do task file, backlog e current-task; status final `aguardando_fechamento`.

---

## Escopo permitido (definitivo, pós-BLK-MET-001)

- `ai/current-task.md` — transições de status ao longo do ciclo.
- `ai/claude-report.md` — sobrescrito via `/handoff-claude-report`.
- `ai/gpt-review.md` — sobrescrito via `run-gpt-review.mjs`.
- `ai/decision-log.md` — append-only.
- `ai/project-state.md` — atualização opcional (não obrigatória).
- `ai/README.md` — ajustes mínimos justificados (registro de limitação V1).
- `tasks/TOOL-002-homologar-fluxo-real-gpt-reviewer.md` — este arquivo.
- **`tasks/backlog.md`** — entrada formal TOOL-002 concluída. **Incluído explicitamente no escopo nesta versão (resposta ao BLK-MET-001 do GPT).**
- `docs/relatorios/2026-05-22-TOOL-002.md` — relatório de fechamento.

---

## Escopo proibido

- `src/**` — todo o produto.
- Motor hidráulico, layout, PDF, catálogo, BOM, UI/mapa, proposta comercial.
- `docs/metodologia/01-regras-bloqueantes.md` — promoção a `RB-09` fica para task documental separada.
- `package.json`, `prisma/**`.
- ADRs existentes (`docs/decisoes/ADR-*.md`).
- Premissas técnicas (`docs/metodologia/12-premissas-...md`).
- TASK-047, TASK-048, TASK-049, TASK-050 (já em `origin/main`).
- TASK-034, `aria-expanded` no drawer mobile.
- `git push` sem aprovação humana explícita.

---

## Invariantes específicas (herdadas de TOOL-001 V1)

- 7 invariantes permanentes (fonte única `scripts/ai/lib/invariants.mjs`).
- Override humano **não libera** violação de invariante permanente.
- `decision-log.md` append-only.
- `gpt-review.md` com bloco JSON estruturado como fonte de verdade do validador.
- `validate-structure.mjs` é read-only sobre `current-task.md.status`.
- Responses API com `text.format: { type: "json_schema", strict: true }`.
- `OPENAI_MODEL` obrigatório via `.env.local`, sem default no código.

---

## Restrições operacionais

- **Cap de custo USD:** ≤ US$ 0,50 por execução (acordado verbal). Sem cap automático na V1. Limitação adicional: telemetria de custo veio zerada do modelo (ver Seção "Limitações V1" abaixo). Referência final = dashboard/fatura OpenAI.
- **Modelo:** `gpt-5.5` (lido de `.env.local`, sem default no código).
- **Secrets:** nenhum valor de `.env.local` impresso em logs, `ai/*`, decision-log, ou erros.

---

## Critérios de aceite verificados

- [x] `/handoff-claude-report TOOL-002` executado; `ai/claude-report.md` gerado no formato canônico.
- [x] `current-task.md.status` transitou `em_planejamento → aguardando_revisao_gpt → aguardando_aprovacao_humana → aprovado_para_implementacao → em_implementacao → aguardando_fechamento` (todas válidas).
- [x] `run-gpt-review.mjs --task TOOL-002` executado com **HTTP 200** na chamada real (Tentativa 2 pós-billing).
- [x] `ai/gpt-review.md` regenerado com bloco JSON canônico válido (extração por `extractStructuredBlock` sem erro).
- [x] `task_id === "TOOL-002"` no JSON.
- [x] `validate-structure --task TOOL-002` retorna **OK** após Fase 3 e após Fase 4.
- [x] Decisão humana registrada em `ai/decision-log.md` (append-only) com todos os campos obrigatórios + hash sha256 correto.
- [x] Hash sha256 de `gpt-review.md` correto: `cd4e92f886f39bed9ba969371afd3ba8301fd32194ee14e465aade25c347f55c`.
- [x] 3 blockers do GPT (BLK-MET-001, BLK-MET-002, BLK-TEC-001) resolvidos na Fase 5.
- [x] `docs/relatorios/2026-05-22-TOOL-002.md` criado com sumário + custo + lições + limitações V1.
- [x] `tasks/backlog.md` atualizado (escopo agora explícito).
- [x] **Nenhum arquivo** em `src/**`, catálogo, BOM, PDF, layout, UI, mapa, `docs/decisoes/`, `docs/metodologia/01-regras-bloqueantes.md`, `package.json`, `prisma/**` alterado.
- [x] **Nenhuma aprovação automática** — todas as transições foram decisões humanas explícitas.
- [x] **Nenhum push** ao remoto.
- [x] Estado da suíte preservado (critério paramétrico — ver abaixo).

### Critério paramétrico de testes (resposta ao BLK-TEC-001)

Em vez de contagens hardcoded (826/826, 817/817), aplicar:

- `npx tsc --noEmit` → **0 erros** se executado. **Não executado nesta task** — nenhuma alteração em `src/` ou TypeScript em `scripts/`. **Baseline preservado** (último checkpoint em HEAD `ac7dd3b`).
- `npx vitest run` → **100% passando** com contagem real se executado. **Não executado nesta task** — nenhuma alteração em arquivos com testes. **Baseline preservado**.
- `node scripts/ai/__tests__/run-all.mjs` → **20/20 passando** se executado. **Executado** na Fase 5 (ver relatório).

---

## Limitações conhecidas da V1

1. **Telemetria de custo zerada.** Modelo `gpt-5.5` retornou `tokens_prompt=0`, `tokens_completion=0` e `custo_estimado_usd=0` no JSON canônico. Esses valores **não são custo real** — vieram do próprio JSON do modelo, não do campo `usage` da API. **Referência final = dashboard/fatura OpenAI.**
2. **Cap automático ausente.** `OPENAI_COST_CAP_USD` mencionado como Fase 2 no `ai/README.md` ainda não implementado.
3. **WARN persistente:** `override_permitido` declarado pelo GPT (`true`) vs derivado pelo validator (`null`). Documentado no relatório; não-bloqueante porque nenhuma invariante foi violada.

## Sugestões de tasks futuras (não criadas nesta task)

- **TOOL-003** — Capturar usage real via `response.usage` da Responses API. Recalcular custo via tabela de preços por modelo. Manter dashboard como referência final. Classe B.
- **Cap automático de custo** — `OPENAI_COST_CAP_USD` em `.env.local`; script aborta se ultrapassar. Classe D.
- **RB-09** — Promover regra terminal de invariante a `docs/metodologia/01-regras-bloqueantes.md`. Classe C (task documental separada).
- **Hook `/iniciar-task → /handoff-claude-report`** — automação opcional do fluxo. Fase 2 do TOOL-001.

---

## Rastreabilidade

- Predecessor: TOOL-001 (`tasks/TOOL-001-handoff-claude-gpt-reviewer.md`, `docs/relatorios/2026-05-22-TOOL-001.md`).
- Pendência endereçada: R1 do relatório TOOL-001.
- claude-report: `ai/claude-report.md`.
- gpt-review: `ai/gpt-review.md`.
- decision-log entry: `ai/decision-log.md` (timestamp `2026-05-22T18:24:30-03:00`).
- Relatório: `docs/relatorios/2026-05-22-TOOL-002.md`.
- Backlog: `tasks/backlog.md`.
- Scripts (preservados, não alterados): `scripts/ai/*.mjs`, `scripts/ai/lib/*.mjs`.
