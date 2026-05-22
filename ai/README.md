# `ai/` — Handoff Claude Code ↔ GPT Reviewer (TOOL-001)

Este diretório materializa o handoff manual entre o Claude Code (planejador/implementador) e o GPT Reviewer (revisor LLM externo) antes da aprovação humana de cada task.

**O GPT revisa, mas nunca decide.** Toda transição de estado exige edição humana de `decision-log.md` e/ou `current-task.md`.

---

## Arquivos canônicos (todos versionados em git)

| Arquivo | Papel | Quem escreve |
|---------|-------|--------------|
| `project-state.md` | Snapshot resumido do projeto (testes, TS, última task, pendências, invariantes) | Humano ou comando manual |
| `current-task.md` | Ponteiro para a task ativa + frontmatter YAML obrigatório com `task_id`, `status`, etc. | `/handoff-claude-report` ou `/handoff-status` ou humano à mão |
| `claude-report.md` | Plano canônico da task ativa, no formato do `/planejar` | `/handoff-claude-report` |
| `gpt-review.md` | Revisão estruturada do GPT — markdown narrativo **+ bloco JSON canônico** ao final | `scripts/ai/run-gpt-review.mjs` |
| `decision-log.md` | Append-only. Cada bloco YAML separado por `---` registra a decisão humana | **Humano** (à mão ou via `/handoff-status`) |

`decision-log.md` é **append-only e inviolável**. Nenhum script remove entradas. Validador rejeita PRs em que o log encolher vs. `HEAD`.

---

## Fluxo operacional (Fase 1 — manual)

```
/iniciar-task TOOL-XXX
   │
   ▼
/planejar TOOL-XXX                           (Claude gera plano na conversa)
   │
   ▼
/handoff-claude-report TOOL-XXX              (Claude serializa para ai/claude-report.md)
   │                                          status: aguardando_revisao_gpt
   ▼
node scripts/ai/run-gpt-review.mjs --task TOOL-XXX
   │                                          gera ai/gpt-review.md (markdown + JSON canônico)
   │                                          NÃO altera status
   ▼
node scripts/ai/validate-structure.mjs --task TOOL-XXX
   │                                          read-only; deriva override_permitido
   │                                          reporta consistência e status sugerido
   ▼
Humano abre ai/gpt-review.md
Humano edita ai/decision-log.md (entry append-only)
Humano edita ai/current-task.md.status (à mão ou via /handoff-status)
   │
   ▼
node scripts/ai/validate-structure.mjs --task TOOL-XXX  (confirma estado coerente)
   │
   ▼
/implementar TOOL-XXX
```

---

## Invariantes permanentes

São 7 (fonte única: [`scripts/ai/lib/invariants.mjs`](../scripts/ai/lib/invariants.mjs)):

1. **INV-CATALOGO-SEM-HOMOLOGACAO** — Não alterar catálogo sem SKU homologado.
2. **INV-NAO-INVENTAR-SKU** — Não inventar SKU.
3. **INV-DN100-LATERAL-5022** — Não voltar DN100 como lateral 5022.
4. **INV-BLOCKERS-TECNICOS** — Não relaxar blockers técnicos.
5. **INV-MASCARAR-PENDENCIA** — Não mascarar pendência.
6. **INV-DOMINIO-FORA-UI** — Não colocar lógica de domínio na UI.
7. **INV-LAYOUT-INSTAVEL-COMERCIAL** — Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.

### Regra terminal de invariante

Se o GPT marcar `status: "violada"` para qualquer invariante no JSON canônico de `gpt-review.md`:

- `override_permitido` derivado pelo validador = **`false`** (vence o valor declarado pelo GPT).
- A task entra em status sugerido `bloqueado_invariante_permanente`.
- **Override humano não libera.** As únicas saídas legítimas são:
  1. Reformular o plano e voltar ao `/planejar` (provoca novo ciclo de revisão).
  2. Abrir task documental específica de governança técnica para revisar/refutar formalmente a invariante (idealmente promovendo a regra a uma `RB-XX` em `docs/metodologia/01-regras-bloqueantes.md`).

Esta regra é parte de TOOL-001 V1 e está documentada aqui. Promoção formal a `RB-09` em `01-regras-bloqueantes.md` é deixada para task documental separada (escopo proibido nesta V1 — ver TASK-XXX futura).

---

## Override humano (apenas para discordância NÃO relacionada a invariante)

Quando o humano contraria a recomendação do GPT (e nenhuma invariante está `violada`):

1. Entry em `decision-log.md` com `override: true`.
2. Campos **obrigatórios**:
   - `responsavel`
   - `timestamp`
   - `task_id`
   - `decision_point`
   - `veredito_gpt` (cópia literal)
   - `decisao_humana`
   - `justificativa` (≥ 80 caracteres)
   - `risco_assumido` (não-vazio)
   - `hash_gpt_review` (sha256 hex de `gpt-review.md`)

`validate-structure.mjs` rejeita override sem `risco_assumido` ou com justificativa curta.

---

## Configuração de API

Variáveis em `.env.local` (gitignored). Veja `.env.example`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=                # obrigatório; sem default no código
OPENAI_BASE_URL=             # opcional; default = https://api.openai.com/v1
```

A V1 usa a **Responses API** (`POST /v1/responses`) com `text.format: { type: "json_schema", strict: true }`. A resposta é sempre JSON validado pelo lado do servidor + revalidado localmente.

**Modelo nunca é fixado no código.** Trocar de modelo (ex.: `gpt-5` → `gpt-4.1`) é mudança de configuração de ambiente, não de código.

---

## Segurança

- `.env.local` está em `.gitignore` (`.env*.local`).
- `run-gpt-review.mjs` executa pré-check via `git status --porcelain` e aborta se detectar `.env.local` ou `.env` no working tree.
- Nenhuma chave aparece em log, stdout, arquivos `ai/*` ou erro de validação.

---

## Custos

O script imprime ao final: `tokens_prompt`, `tokens_completion`, `custo_estimado_usd`.

**Custo médio observado** será preenchido aqui após os primeiros usos reais (Fase 2 pode adicionar cap automático em `OPENAI_COST_CAP_USD`).

---

## O que NÃO está nesta V1

- Hooks automáticos do Claude Code (`PostToolUse`, `Stop`) — Fase 2.
- Cap de custo bloqueante — Fase 2.
- Dashboards / métricas de override agregadas — Fase 2.
- Alteração de `docs/metodologia/01-regras-bloqueantes.md` — task documental separada.
- Automação de `/implementar`, `/fechar-task`, merge, aprovação humana — **nunca**.

---

## Links

- [`CLAUDE.md`](../CLAUDE.md) — regras gerais do repositório.
- [`docs/metodologia/01-regras-bloqueantes.md`](../docs/metodologia/01-regras-bloqueantes.md) — regras bloqueantes formais (RB-01..RB-08).
- [`tasks/TOOL-001-handoff-claude-gpt-reviewer.md`](../tasks/TOOL-001-handoff-claude-gpt-reviewer.md) — plano completo desta task.
- [`scripts/ai/`](../scripts/ai/) — scripts CLI e libs.
