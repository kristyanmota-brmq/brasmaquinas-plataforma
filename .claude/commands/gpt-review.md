# Comando /gpt-review

Orquestra o ciclo de revisão GPT pós-handoff: chamada real à Responses API + validação estrutural + resumo executivo no terminal. **Não substitui `/handoff-claude-report`** — assume que ele já foi rodado.

Uso: `/gpt-review TASK-XXX`

## O que fazer

1. **Validar argumento.** Se `task_id` não for passado como argumento, abortar com mensagem clara.

2. **Validar `ai/current-task.md`.**
   - Ler frontmatter.
   - Se `task_id` ≠ argumento: abortar listando o conflito.
   - Se `status` não estiver em `{em_planejamento, aguardando_revisao_gpt, aguardando_aprovacao_humana}`: abortar com sugestão de rodar `/handoff-status` para reabrir o ciclo.

3. **Validar `ai/claude-report.md`.**
   - Se arquivo ausente: abortar.
   - Ler primeiras 5 linhas; se cabeçalho não citar `TASK-XXX` (procurar pelo padrão `# claude-report — TASK-XXX`): abortar.

   **Mensagem de abort obrigatória nesses casos:**
   ```
   Handoff não pronto para TASK-XXX.
   Rode primeiro /handoff-claude-report TASK-XXX e depois /gpt-review TASK-XXX.
   ```

4. **Executar `run-gpt-review.mjs`** (chamada real à Responses API):
   ```bash
   node scripts/ai/run-gpt-review.mjs --task TASK-XXX
   ```
   - Se exit ≠ 0: **parar imediatamente**, mostrar stderr, **sem retry automática**. Não prosseguir para validate ou print-summary.

5. **Executar `validate-structure.mjs`:**
   ```bash
   node scripts/ai/validate-structure.mjs --task TASK-XXX
   ```
   - Capturar saída (OK / WARN / FAIL).
   - WARN não bloqueia; FAIL bloqueia.

6. **Executar `print-review-summary.mjs`:**
   ```bash
   node scripts/ai/print-review-summary.mjs --task TASK-XXX
   ```
   - Exit ≠ 0 → mostrar erro e parar.

7. **Imprimir próxima ação humana** (texto fixo no fim do output):
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Próxima ação humana:
     1. Leia ai/gpt-review.md COMPLETO (markdown narrativo + JSON canônico).
     2. Calcule hash:  shasum -a 256 ai/gpt-review.md
     3. Edite ai/decision-log.md adicionando entry append-only (template:
        templates/ai-handoff-decision-log-entry.md).
     4. Atualize ai/current-task.md.status manualmente conforme a decisão.
     5. Re-rode: node scripts/ai/validate-structure.mjs --task TASK-XXX
     6. SÓ ENTÃO execute /implementar TASK-XXX (se aplicável).

   NÃO executar /implementar antes de registrar a decisão humana.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

## Regras

- **NUNCA** editar `ai/decision-log.md` neste comando — esse é trabalho exclusivamente humano.
- **NUNCA** transitar `ai/current-task.md.status` neste comando — apenas leitura.
- **NUNCA** chamar `/implementar`, `/fechar-task`, ou criar commits.
- **NUNCA** fazer `git add` ou `git push`.
- **NUNCA** sobrescrever `ai/gpt-review.md` manualmente — apenas via `run-gpt-review.mjs` (passo 4).
- **NUNCA** chamar mais de uma vez `run-gpt-review.mjs` sem autorização humana (custo).
- **SEMPRE** abortar cedo se pré-requisitos (`current-task.md`, `claude-report.md`) estiverem inconsistentes — NÃO chamar a API se o handoff não estiver pronto (evita custo desperdiçado).
- **SEMPRE** propagar exit code não-zero dos scripts ao usuário.

## Limitações conhecidas (V1)

- **Telemetria de custo**: `tokens_prompt`, `tokens_completion`, `custo_estimado_usd` são declarados pelo próprio modelo no JSON canônico, não capturados de `response.usage` da API. Podem vir zerados ou imprecisos. Referência final de cobrança é o dashboard/fatura OpenAI. (Limitação descoberta em TOOL-002; sugestão de captura real fica para TOOL-004 futura.)
- **Sem cap automático de custo** (`OPENAI_COST_CAP_USD`) — Fase 2 do roadmap TOOL-001.
- **Sem retry automática** em caso de HTTP ≠ 200 ou erro de rede — abortar e instruir o humano.

## Sequência completa do fluxo manual (referência)

```
/iniciar-task TASK-XXX
   ↓
/planejar TASK-XXX
   ↓
/handoff-claude-report TASK-XXX     ← grava ai/claude-report.md (com preview + confirmação)
   ↓
/gpt-review TASK-XXX                ← este comando: API + validate + resumo
   ↓
[Humano lê ai/gpt-review.md + edita ai/decision-log.md + transita status]
   ↓
/implementar TASK-XXX               ← apenas após decisão registrada
   ↓
/fechar-task TASK-XXX
```

## Referências

- [`ai/README.md`](../../ai/README.md) — fluxo TOOL-001 V1 completo e regras de invariantes.
- [`tasks/TOOL-003-gpt-review-pos-handoff.md`](../../tasks/TOOL-003-gpt-review-pos-handoff.md) — task que criou este comando.
- [`scripts/ai/print-review-summary.mjs`](../../scripts/ai/print-review-summary.mjs) — CLI auxiliar que gera o resumo.
