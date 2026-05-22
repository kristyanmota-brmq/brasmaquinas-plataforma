# TOOL-001 — Handoff automatizado Claude Code ↔ GPT Reviewer

**Status:** `plano aprovado com ajustes` (aguardando `/implementar`)
**Prioridade:** P2-importante
**Classe:** A — Governança / infraestrutura de desenvolvimento
**Área:** tooling / governança
**Criada em:** 2026-05-22
**Plano aprovado com ajustes em:** 2026-05-22
**Tipo de task:** TOOL (nova trilha; paralela a TASK e HIST)

> Este arquivo é o output do `/planejar TOOL-001`, revisado com os 7 ajustes do usuário antes de `/implementar`.

---

## Entendimento

Construir uma camada local de handoff Claude Code ↔ GPT Reviewer que insere uma etapa formal de revisão por LLM externo (GPT) entre `/planejar` e a aprovação humana, materializada em 5 arquivos versionados em `ai/` e 3 scripts em `scripts/ai/`. A automação **nunca executa decisão nem muda status como efeito colateral**: ela serializa estado, chama o GPT, salva a resposta (markdown + bloco estruturado JSON) e valida estrutura — humano aprova manualmente.

---

## Estado atual

- Testes: **817/817 passando** (baseline pós-TASK-035, `tasks/backlog.md:4`)
- TypeScript: **0 erros**
- Working tree: modificado (TASK-027→046 + ADRs 012-emenda/013/014/015) — **não será tocado**
- `docs/metodologia/01-regras-bloqueantes.md` confirmado: 8 regras RB-01..RB-08 + checklist. Inserir RB-09 seria estruturalmente compatível, mas seguindo ajuste 7 do usuário **não será tocado nesta task**.
- Arquivos relevantes lidos: `CLAUDE.md`, `AGENTS.md`, `tasks/backlog.md`, `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`, `docs/metodologia/01-regras-bloqueantes.md`, `docs/relatorios/2026-05-22-TASK-035.md`, `.claude/commands/planejar.md`, `templates/prompt-revisao.md`, `templates/checklist-pr.md`, `.gitignore`, `package.json`.
- Confirmação: `ai/` e `scripts/ai/` ainda **não existem**.

---

## Ajustes aplicados (relativos à V1 do plano)

| Ajuste | Aplicado |
|--------|----------|
| 1. Dogfooding sem apagar entradas | ✅ Testes usam fixtures separadas em `scripts/ai/__tests__/fixtures/`; dogfooding real cria entrada **permanente** para TOOL-001 |
| 2. Saída estruturada do GPT | ✅ `ai/gpt-review.md` contém bloco JSON canônico obrigatório; validador lê do JSON, não de headings/keywords |
| 3. API OpenAI | ✅ V1 usa **Responses API** com structured outputs (JSON schema); modelo configurável via `OPENAI_MODEL`, sem default fixo no código |
| 4. Status da current-task | ✅ `validate-structure.mjs` é **read-only sobre status**; nunca altera; status muda só por edição manual ou comando explícito `/handoff-status` |
| 5. `/handoff-claude-report` | ✅ Exige `task_id` no argumento; valida contra `ai/current-task.md`; confirmação interativa antes de gravar |
| 6. Invariantes permanentes | ✅ Mantida regra: override **não libera** violação de invariante permanente; derivação automática no validador |
| 7. `01-regras-bloqueantes.md` | ✅ **Removido do escopo V1**; regra documentada em `ai/README.md`; criada sugestão de task documental TOOL-XXX para formalização futura como RB-09 |

---

## Arquitetura proposta

### Princípios

1. **GPT revisa, nunca decide.** Transições de estado **exigem edição humana** do `decision-log.md` e/ou `current-task.md`.
2. **Comando manual antes de hook.** V1 = comandos explícitos. Hooks ficam para TOOL-002 após 3 tasks reais validadas.
3. **Tooling fora de `src/`.** Testes de tooling rodam em pista separada do Vitest (817/817 preservado).
4. **Sem novas dependências npm.** `fetch` nativo do Node 18+. Sem `openai` SDK, sem `tsx`, sem `dotenv`, sem `js-yaml`.
5. **Append-only audit trail inviolável.** `decision-log.md` cresce monotonicamente. Nenhum mecanismo apaga entradas — nem testes, nem dogfood, nem rollback. Tests usam fixtures separadas.
6. **Validação a partir de bloco estruturado.** `gpt-review.md` carrega JSON canônico como fonte única de verdade do validador. Markdown narrativo é para humanos.
7. **Status nunca muda como efeito colateral.** Validador apenas reporta consistência; transições são explícitas.
8. **Invariante permanente é terminal.** Validador deriva `override_permitido = false` quando qualquer invariante está `violada` — independentemente do que o GPT escreva no campo.

### Diagrama do fluxo

```
/iniciar-task
     │
     ▼
/planejar TOOL-XXX
     │
     ▼
[novo] /handoff-claude-report TOOL-XXX
     │   confirma task_id contra ai/current-task.md
     │   pede confirmação interativa do plano a serializar
     │   grava ai/claude-report.md
     │   status passa a aguardando_revisao_gpt POR COMANDO EXPLÍCITO
     ▼
[script] node scripts/ai/run-gpt-review.mjs --task TOOL-XXX
     │   monta prompt (project-state + current-task + claude-report + invariantes)
     │   chama OpenAI Responses API com response_format JSON schema
     │   salva ai/gpt-review.md (narrativa MD + bloco JSON canônico)
     │   não altera status
     ▼
[script] node scripts/ai/validate-structure.mjs --task TOOL-XXX
     │   lê bloco JSON canônico (não markdown)
     │   deriva override_permitido independentemente do GPT
     │   reporta consistência; não muda status
     ▼
Humano abre ai/gpt-review.md no VS Code
     │   edita ai/decision-log.md acrescentando entry (append-only)
     │   edita ai/current-task.md.status manualmente para aprovado_para_implementacao
     ▼
[script] node scripts/ai/validate-structure.mjs --task TOOL-XXX
     │   confirma entry válida + status coerente
     ▼
/implementar TOOL-XXX  ← só destrava se validate-structure exit 0 + status aprovado
     │
     ▼
[testes] node scripts/ai/__tests__/run-all.mjs (tooling)
[testes] npx tsc --noEmit && npx vitest run (produto)
     │
     ▼
/fechar-task
```

---

## Arquivos que serão criados

### Diretório `ai/` (raiz)

- **`ai/README.md`** — Explica:
  - Os 5 arquivos canônicos e seu lifecycle
  - Regras de override (incluindo trava terminal de invariantes permanentes — texto que **eventualmente** virará RB-09 em task documental futura)
  - Princípio append-only de `decision-log.md`
  - Como editar `current-task.md.status` manualmente
  - Lista das 7 invariantes permanentes (mesma lista usada pelo prompt do GPT)
  - Link para `CLAUDE.md` e `docs/metodologia/01-regras-bloqueantes.md`
  - Aviso de segurança: `.env.local` nunca commitado
- **`ai/project-state.md`** — Snapshot estático. Seções obrigatórias: `## Métricas`, `## Última task concluída`, `## Pendências abertas`, `## Invariantes permanentes` (lista literal). Atualizado manualmente.
- **`ai/current-task.md`** — Ponteiro para task ativa. Frontmatter YAML obrigatório:
  ```yaml
  task_id: TOOL-001
  arquivo_task: tasks/TOOL-001-handoff-claude-gpt-reviewer.md
  classe: A
  data_abertura: 2026-05-22
  status: em_planejamento
  ultima_atualizacao: 2026-05-22T10:00:00-03:00
  atualizado_por: humano | comando:/handoff-claude-report
  ```
  Valores válidos para `status`: `em_planejamento` | `aguardando_revisao_gpt` | `aguardando_aprovacao_humana` | `aprovado_para_implementacao` | `em_implementacao` | `aguardando_fechamento` | `bloqueado_invariante_permanente`.
  Corpo: escopo permitido + escopo proibido + invariantes específicas da task.
- **`ai/claude-report.md`** — Plano canônico. Seções obrigatórias: `## Entendimento`, `## Arquivos criados`, `## Arquivos modificados`, `## Arquivos não alterados`, `## Testes obrigatórios`, `## Critérios de aceite`, `## Riscos`, `## O que NÃO será feito`, `## Invariantes verificadas`.
- **`ai/gpt-review.md`** — Markdown narrativo **+ bloco JSON canônico obrigatório** ao final. Estrutura:
  ```markdown
  # Revisão GPT — TOOL-XXX

  ## Resumo executivo
  [narrativa humana]

  ## Pontos fortes
  [narrativa]

  ## Riscos não cobertos
  [narrativa]

  ## Ajustes sugeridos
  [narrativa]

  ## Análise de invariantes
  [narrativa por invariante]

  ## Bloco estruturado (fonte de verdade do validador)

  ```json
  {
    "task_id": "TOOL-001",
    "schema_version": "1.0",
    "modelo_gpt": "<configurado em OPENAI_MODEL>",
    "timestamp": "2026-05-22T15:00:00-03:00",
    "veredito": "aprovado_com_ajustes",
    "blockers": [
      {
        "id": "B1",
        "categoria": "tecnico | metodologico | invariante_permanente",
        "descricao": "texto",
        "invariante_id": "<obrigatório quando categoria === invariante_permanente>"
      }
    ],
    "invariantes": [
      {
        "id": "INV-CATALOGO-IMUTAVEL",
        "descricao": "Não alterar catálogo sem SKU homologado",
        "status": "ok | violada | nao_aplicavel",
        "justificativa": "texto"
      }
    ],
    "recomendacao": "aprovado | aprovado_com_ajustes | reprovado",
    "override_permitido": true,
    "justificativa_resumida": "texto de no máximo 500 caracteres",
    "metadata": {
      "tokens_prompt": 0,
      "tokens_completion": 0,
      "custo_estimado_usd": 0
    }
  }
  ```
  ```
- **`ai/decision-log.md`** — Append-only. Cada entry é bloco YAML separado por `---`. Schema:
  ```yaml
  timestamp: 2026-05-22T15:30:00-03:00
  task_id: TOOL-001
  decision_point: pos_planejamento | pos_implementacao_revisao | pos_fechamento
  veredito_gpt: <cópia literal do campo gpt-review.json>
  decisao_humana: aprovado | aprovado_com_ajustes | reprovado
  responsavel: <nome>
  justificativa: |
    texto >= 80 caracteres quando override=true
  override: false
  ajustes_aplicados: [...]   # quando aprovado_com_ajustes
  risco_assumido: "..."       # obrigatório quando override=true
  hash_gpt_review: <sha256 do bloco JSON do gpt-review.md no momento da decisão>
  ```

### Diretório `scripts/ai/`

- **`scripts/ai/lib/parsers.mjs`** — Funções puras:
  - `parseFrontmatter(md): object | Error`
  - `parseDecisionLog(md): Entry[] | Error`
  - `extractStructuredBlock(md): object | Error` — extrai JSON do bloco canônico em `gpt-review.md` e valida contra schema embutido.
  - `sha256(text): string` — para hash do bloco GPT.
  - `loadDotEnvLocal(): Record<string,string>` — parser local de `.env.local`; valida presença de `OPENAI_API_KEY`.
- **`scripts/ai/lib/invariants.mjs`** — Exporta `PERMANENT_INVARIANTS` (array literal das 7 invariantes; usado pelo prompt do GPT E pelo validador). Single source of truth.
- **`scripts/ai/build-review-prompt.mjs`** — Exporta `buildReviewPrompt({ projectState, currentTask, claudeReport, invariants })` → `{ system: string, user: string, json_schema: object }`. JSON schema retornado é o schema de structured output da Responses API.
- **`scripts/ai/run-gpt-review.mjs`** — CLI runnable:
  ```bash
  node scripts/ai/run-gpt-review.mjs --task TOOL-XXX
  ```
  - Lê `.env.local`, valida `OPENAI_API_KEY` e `OPENAI_MODEL` (ambos obrigatórios — sem default no código).
  - Monta prompt + JSON schema.
  - Chama **Responses API** (`POST https://api.openai.com/v1/responses`) com `text.format` setado para `json_schema` strict mode.
  - Recebe JSON validado pelo lado do servidor.
  - Renderiza markdown narrativo a partir do JSON + embute o JSON no bloco canônico ao final.
  - Salva `ai/gpt-review.md`.
  - **Não altera `current-task.md.status`.**
  - Imprime resumo: veredito, nº blockers, nº invariantes violadas, tokens, custo, caminho do arquivo.
- **`scripts/ai/validate-structure.mjs`** — CLI runnable:
  ```bash
  node scripts/ai/validate-structure.mjs --task TOOL-XXX
  ```
  Verificações:
  1. Os 5 arquivos `ai/*.md` existem.
  2. `current-task.md` frontmatter válido; `task_id` bate com `--task`.
  3. `claude-report.md` tem todas as 9 seções obrigatórias.
  4. `gpt-review.md` contém bloco JSON estruturado válido contra schema embutido.
  5. **`override_permitido` derivado** = `false` se qualquer `invariantes[i].status === "violada"`, senão = `true` se `veredito === "reprovado"`, senão `null` (não aplicável). Compara com valor no JSON; **divergência registrada como warning** (validador adota o valor derivado como verdade).
  6. `decision-log.md` monotônico vs. `git show HEAD:ai/decision-log.md` (nenhuma entry removida ou reordenada). Schema YAML válido.
  7. Última entry com `override: true` exige `risco_assumido` não-vazio e `justificativa` ≥ 80 caracteres.
  8. Última entry tem `hash_gpt_review` correspondente ao hash atual de `gpt-review.md` (detecta gpt-review modificado após decisão).
  9. Se bloco JSON marca `override_permitido: false` (derivado) E última entry tem `override: true` → exit 1 com mensagem de bloqueio terminal.
  - **Status nunca é alterado pelo validador.** Reporta apenas: status atual, status sugerido, se transição é válida.
  - Exit 0 OK; exit 1 com problemas detalhados em stderr.
- **`scripts/ai/__tests__/parsers.test.mjs`**
- **`scripts/ai/__tests__/validate-structure.test.mjs`**
- **`scripts/ai/__tests__/build-review-prompt.test.mjs`**
- **`scripts/ai/__tests__/run-all.mjs`** — runner com `node:test` ou assert puro.
- **`scripts/ai/__tests__/fixtures/`** — JSON e MD de exemplo para todos os 16 testes; **nenhum teste toca `ai/*.md` reais**.

### Comandos slash novos

- **`.claude/commands/handoff-claude-report.md`** — Define `/handoff-claude-report TOOL-XXX`. Instrução para Claude:
  1. Validar que `task_id` foi passado como argumento.
  2. Ler `ai/current-task.md` e confirmar que `task_id` bate; se não bater, abortar com mensagem.
  3. Apresentar ao usuário o plano que será serializado (último output válido do `/planejar` na conversa OU conteúdo de `tasks/TOOL-XXX-*.md`) e pedir confirmação explícita.
  4. Após confirmação, gravar `ai/claude-report.md` no formato canônico.
  5. Atualizar `ai/current-task.md.status` para `aguardando_revisao_gpt` e `atualizado_por: comando:/handoff-claude-report`.
- **`.claude/commands/handoff-status.md`** — Define `/handoff-status TOOL-XXX <novo-status>`. Comando explícito para transição de estado, usado quando o humano quer marcar `aprovado_para_implementacao` sem editar YAML à mão. Validador é chamado antes da gravação; transições inválidas são recusadas.

### Templates

- **`templates/ai-handoff-claude-report.md`** — esqueleto vazio com seções.
- **`templates/ai-handoff-gpt-review.md`** — esqueleto com bloco JSON exemplo.
- **`templates/ai-handoff-decision-log-entry.md`** — bloco YAML modelo.
- **`templates/ai-handoff-prompt-system.md`** — texto literal do prompt + as 7 invariantes (consumido por `build-review-prompt.mjs` ou referenciado).

### Outros

- **`.env.example`** — adicionar:
  ```bash
  # GPT Reviewer (TOOL-001)
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=                     # obrigatório; sem default no código (ex.: gpt-5, gpt-4.1, gpt-4o)
  OPENAI_BASE_URL=                  # opcional; default = https://api.openai.com/v1
  ```

---

## Arquivos que serão modificados

- **`.gitignore`** — adicionar:
  - `ai/*.tmp`
  - `ai/.cache/`
  - **Não ignorar** os 5 arquivos canônicos.
- **`tasks/backlog.md`** — adicionar seção nova `## Tarefas de tooling (TOOL)` antes de "Próximas tarefas sugeridas", com TOOL-001 listada.
- **`CLAUDE.md`** — adicionar seção curta `## Handoff Claude Code ↔ GPT Reviewer (TOOL-001)` apontando para `ai/README.md`. **Não alterar** o fluxo obrigatório existente.

### Removido da V1 conforme ajuste 7

- ~~`docs/metodologia/01-regras-bloqueantes.md`~~ — **não será tocado**. Regra de invariantes terminais documentada em `ai/README.md`. Sugestão: abrir TOOL-XXX documental futura para promover a regra a RB-09 formal.

---

## Arquivos que NÃO serão alterados

- `src/**` — todo o produto.
- `src/lib/catalog/aspersores.ts` — read-only.
- `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`.
- `vitest.config.*`, `tsconfig.json`.
- `.claude/commands/*.md` existentes (`iniciar-task`, `planejar`, `implementar`, `revisar`, `resumir`, `fechar-task`).
- `docs/metodologia/01-regras-bloqueantes.md` (conforme ajuste 7).
- `prisma/`, `node_modules/`, `.next/`.
- Working tree atual.

---

## Fluxo operacional detalhado

### 1. Geração de `claude-report.md`

- `/planejar TOOL-XXX` → plano canônico na conversa.
- `/handoff-claude-report TOOL-XXX` → comando exige `task_id` explícito, valida contra `current-task.md`, pede confirmação do plano a serializar (mostra preview), só então grava.
- Atualiza `current-task.md.status` → `aguardando_revisao_gpt` com `atualizado_por: comando:/handoff-claude-report`.

### 2. Geração de `gpt-review.md`

- `node scripts/ai/run-gpt-review.mjs --task TOOL-XXX`.
- Script aborta se `OPENAI_API_KEY` ou `OPENAI_MODEL` ausentes (sem fallback silencioso).
- Chamada à Responses API com `text.format: { type: "json_schema", strict: true }`.
- Resposta JSON validada pelo servidor + revalidada localmente.
- Markdown narrativo + bloco JSON canônico salvos.
- **Status não muda** após este comando — fica em `aguardando_revisao_gpt` até decisão humana.

### 3. Validação estrutural

- `node scripts/ai/validate-structure.mjs --task TOOL-XXX`.
- Read-only sobre status. Reporta:
  - Inconsistências de estrutura.
  - `override_permitido` derivado vs. declarado pelo GPT.
  - Status atual + status sugerido.
  - Validade da transição (não a executa).

### 4. Aprovação humana

- Humano abre `ai/gpt-review.md`, lê narrativa + bloco JSON.
- Edita `ai/decision-log.md` à mão (ou via `/handoff-status TOOL-XXX aprovado_para_implementacao` que insere entry padrão e pede review).
- Roda `validate-structure.mjs` novamente.
- Se exit 0 e status correto, `/implementar TOOL-XXX` destravado.

### 5. Override

- Permitido apenas quando `override_permitido` (derivado) é `true`.
- Quando GPT marca `invariante violada` → `override_permitido` derivado = `false` → trava terminal.
- Saídas legítimas da trava terminal:
  - Reformular plano (volta ao `/planejar`).
  - Abrir task documental específica de governança técnica para revisar/refutar a invariante (RB-XX ou TOOL-XX documental).
  - **Override humano não libera.**

### 6. Secrets

- `.env.local` (gitignored). `.env.example` documenta variáveis.
- Smoke check pré-run: `git status --porcelain | grep -E '\.env\.local|\.env$'` — se output não vazio, aborta.

---

## Testes obrigatórios

**Pista separada do Vitest.** Rodam via `node scripts/ai/__tests__/run-all.mjs`. Vitest permanece 817/817.

1. **parseFrontmatter** — válido → objeto.
2. **parseFrontmatter inválido** — campo faltando → erro nominal.
3. **parseDecisionLog vazio** → `[]`.
4. **parseDecisionLog 3 entries monotônicas** → `[entry, entry, entry]`.
5. **parseDecisionLog timestamps fora de ordem** → erro.
6. **extractStructuredBlock válido** → objeto JSON.
7. **extractStructuredBlock ausente** → erro.
8. **extractStructuredBlock JSON inválido** → erro nominal (linha, coluna).
9. **extractStructuredBlock JSON fora do schema** (ex.: campo obrigatório faltando) → erro com nome do campo.
10. **validate-structure: 5 arquivos válidos** → exit 0.
11. **validate-structure: claude-report sem seção `## Riscos`** → exit 1.
12. **validate-structure: override sem `risco_assumido`** → exit 1.
13. **validate-structure: override com `justificativa` < 80 chars** → exit 1.
14. **validate-structure: invariante violada no JSON → override_permitido derivado false → entry com `override: true`** → exit 1 (bloqueio terminal).
15. **validate-structure: `decision-log` encolheu vs. HEAD** → exit 1.
16. **validate-structure: `hash_gpt_review` da última entry ≠ hash atual** → exit 1.
17. **build-review-prompt: 7 invariantes literalmente presentes** no prompt de sistema.
18. **build-review-prompt: JSON schema retornado** tem todos os campos canônicos como `required`.

**18 tests.** Fixtures isoladas em `scripts/ai/__tests__/fixtures/`. **Nenhum teste lê ou escreve em `ai/*.md`.**

### Dogfooding (não-destrutivo)

1. `/implementar TOOL-001` cria todos os arquivos.
2. 18 testes de tooling passam.
3. Dogfood **permanente** (cria entrada real no `decision-log.md`):
   - `/handoff-claude-report TOOL-001` → `ai/claude-report.md` (a partir deste plano).
   - `run-gpt-review --task TOOL-001` → `ai/gpt-review.md`.
   - `validate-structure --task TOOL-001` → exit 0.
   - Humano escreve entry real em `decision-log.md` para TOOL-001 (`decision_point: pos_implementacao_revisao`, marcando o ciclo como executado com sucesso).
4. **Entry NÃO é apagada.** Permanece como primeiro registro de audit trail da história do `decision-log.md`.
5. TOOL-002 (próxima task de tooling) passa pelo fluxo igual.

---

## Critérios de aceite

- [ ] `ai/README.md` + 5 arquivos canônicos criados; `validate-structure.mjs` exit 0.
- [ ] 5 scripts em `scripts/ai/` (2 libs + 2 CLI + 1 runner) em ESM puro; nenhuma dep npm nova.
- [ ] 4 templates `templates/ai-handoff-*.md`.
- [ ] 2 comandos novos: `/handoff-claude-report` e `/handoff-status`.
- [ ] `.env.example` atualizado com `OPENAI_API_KEY`, `OPENAI_MODEL` (sem default no código).
- [ ] `.gitignore` ajustado.
- [ ] `tasks/backlog.md` tem seção `## Tarefas de tooling (TOOL)` com TOOL-001 listada.
- [ ] `CLAUDE.md` tem seção curta apontando para `ai/README.md`.
- [ ] `docs/metodologia/01-regras-bloqueantes.md` **não foi tocado** (verificado via `git diff`).
- [ ] 18 testes de tooling passando via `node scripts/ai/__tests__/run-all.mjs`.
- [ ] `npx tsc --noEmit` → **0 erros**.
- [ ] `npx vitest run` → **817/817** (sem regressão).
- [ ] Dogfooding executado com entrada **permanente** em `decision-log.md`.
- [ ] Custo médio por chamada GPT documentado em `ai/README.md` após primeiro uso.
- [ ] Nenhum arquivo em `src/`, `prisma/`, `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`, `docs/metodologia/01-regras-bloqueantes.md` tocado.
- [ ] Bloco JSON do `gpt-review.md` valida contra schema; validador deriva `override_permitido` independentemente do GPT.
- [ ] `validate-structure.mjs` é read-only sobre `current-task.md.status`.
- [ ] `/handoff-claude-report` exige `task_id` no argumento e confirmação interativa.

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---|---|-----------|
| **Vazamento de `OPENAI_API_KEY`** | Baixa | Alto | `.env.local` em `.gitignore`; smoke check pré-run; documentado em `ai/README.md`. |
| **GPT alucinar invariante violada** | Média | Médio | Trava terminal só dispara com `status: violada` literal no JSON; humano pode reformular plano. |
| **GPT não detectar violação real** | Média | Alto | Revisão humana não substituída; testes Vitest e gates do PDF continuam ativos. |
| **GPT marcar `override_permitido: true` quando invariante violada** | Média | Alto | Validador **deriva** o valor independentemente do JSON; valor derivado vence. |
| **Bloco JSON do GPT mal formado apesar de structured output** | Baixa | Médio | Responses API com `strict: true` + revalidação local + erro nominal pelo parser. |
| **Custo de API descontrolado** | Baixa-Média | Médio | `OPENAI_MODEL` configurável; script imprime tokens + custo; cap configurável em Fase 2. |
| **Sobrescrita acidental de `decision-log.md`** | Baixa | Alto | Validador rejeita PR onde log encolheu vs. HEAD; convenção append-only no `ai/README.md`. |
| **Hash de `gpt-review.md` modificado após decisão** | Média | Alto | `hash_gpt_review` na entry valida ↔ se mudou, validador exit 1 e pede nova entry. |
| **`/handoff-claude-report` pegar plano errado** | Média | Médio | Exige `task_id` explícito + confirmação interativa do conteúdo antes de gravar. |
| **`validate-structure` alterar status sem perceber** | Baixa | Alto | Code review explícito: validador é read-only; teste #10 cobre. |
| **Hooks futuros automatizarem aprovação** | Baixa | Crítico | V1 explicita "manual only"; TOOL-002 só roda `validate-structure`, **nunca** edita `decision-log.md` nem `current-task.md.status`. |
| **Override usado como rotina** | Média | Médio | `decision-log.md` commitado; auditoria mensal por grep extraindo razão `override:true / total`. |
| **API OpenAI fora do ar** | Baixa | Baixo | Falha graciosa; usuário pode registrar `veredito_gpt: indisponivel` e seguir com aprovação direta (entry no log com justificativa explícita). |
| **Responses API mudar formato** | Baixa | Médio | Schema version em todos os blocos; documentado; migração só com TOOL-XXX explícita. |
| **`schema_version` divergente entre arquivos** | Baixa | Médio | Validador compara `schema_version` em todos os blocos; mismatch → warning. |
| **Comando slash novo colidir** | Muito baixa | Baixo | Verificado: `handoff-claude-report` e `handoff-status` não colidem com os 6 existentes. |
| **`tasks/backlog.md` seção nova ficar mal posicionada** | Baixa | Baixo | Inserir antes de "Próximas tarefas sugeridas" (linha existente conhecida). |

---

## O que NÃO será feito nesta tarefa

- **Não implementar nenhum hook automático** do Claude Code.
- **Não automatizar aprovação humana.**
- **Não automatizar `/implementar`, `/fechar-task`, merge.**
- **Não apagar entradas de `decision-log.md`** — nem testes, nem dogfood.
- **Não criar secrets no repositório.**
- **Não alterar nenhum arquivo em `src/`.**
- **Não alterar `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`.**
- **Não alterar `tsconfig.json`, `vitest.config.*`.**
- **Não alterar `docs/metodologia/01-regras-bloqueantes.md`** (ajuste 7).
- **Não adicionar dependências npm.**
- **Não usar `/v1/chat/completions`** como caminho padrão.
- **Não fixar `OPENAI_MODEL` default no código.**
- **Não fazer `validate-structure` alterar `current-task.md.status`.**
- **Não permitir override de invariante permanente.**
- **Não criar dashboards, métricas agregadas, relatórios automáticos** — Fase 2.
- **Não tocar working tree atual.**
- **Não substituir `/revisar` existente.**
- **Não validar conteúdo semântico de `gpt-review.md`** — só estrutura JSON.

---

## Próximas tasks sugeridas após TOOL-001

- **TOOL-XXX (documental):** promover regra "violação de invariante permanente é terminal" a RB-09 em `docs/metodologia/01-regras-bloqueantes.md`. Task ≤ 30 min, sem código.
- **TOOL-002 (tooling):** primeira task real (não-autorreferente) a passar pelo fluxo de handoff.
- **TOOL-003 (tooling, eventual):** cap de custo automático bloqueante (`OPENAI_COST_CAP_USD` em `.env.local`).
- **TOOL-004 (tooling, eventual):** integração com hooks do Claude Code (`PostToolUse`, `Stop`) — apenas após TOOL-001/002/003 validados em 3+ tasks reais.

---

## Confirmação

Plano aprovado com 7 ajustes em 2026-05-22 pelo usuário. Aguardando comando `/implementar TOOL-001` para iniciar implementação.
