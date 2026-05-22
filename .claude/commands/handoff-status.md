# Comando /handoff-status

Comando explícito para alterar `ai/current-task.md.status`. Existe para evitar edição manual descuidada do frontmatter YAML.

Uso: `/handoff-status TASK-XXX <novo-status>`

## Estados válidos

| Status | Significado |
|--------|-------------|
| `em_planejamento` | `/planejar` em curso |
| `aguardando_revisao_gpt` | `claude-report.md` gerado; aguardando `run-gpt-review.mjs` |
| `aguardando_aprovacao_humana` | `gpt-review.md` gerado; humano deve ler e decidir |
| `aprovado_para_implementacao` | Humano aprovou; `/implementar` autorizado |
| `em_implementacao` | `/implementar` em curso |
| `aguardando_fechamento` | Implementação concluída; aguardando `/fechar-task` |
| `bloqueado_invariante_permanente` | GPT marcou invariante violada; trava terminal |

## Transições válidas

```
em_planejamento → aguardando_revisao_gpt | bloqueado_invariante_permanente
aguardando_revisao_gpt → aguardando_aprovacao_humana | bloqueado_invariante_permanente | em_planejamento
aguardando_aprovacao_humana → aprovado_para_implementacao | em_planejamento | bloqueado_invariante_permanente
aprovado_para_implementacao → em_implementacao | bloqueado_invariante_permanente
em_implementacao → aguardando_fechamento | bloqueado_invariante_permanente
aguardando_fechamento → em_planejamento (próxima task)
bloqueado_invariante_permanente → em_planejamento (após reformular)
```

## O que fazer

1. **Validar argumentos.** Ambos `task_id` e `novo-status` obrigatórios.

2. **Ler `ai/current-task.md`.** Confirmar que `task_id` bate.

3. **Rodar `node scripts/ai/validate-structure.mjs --task TASK-XXX`.** Se exit code ≠ 0:
   - Mostrar erros ao usuário.
   - Abortar — status não muda enquanto estrutura estiver inconsistente.

4. **Verificar transição.** A transição de status_atual → novo-status deve estar no grafo acima. Se inválida, abortar e listar transições válidas a partir do status_atual.

5. **Caso especial — `aprovado_para_implementacao`:**
   - Exigir que exista entry recente em `ai/decision-log.md` com `task_id` casando e `decisao_humana ∈ { aprovado, aprovado_com_ajustes }`.
   - Exigir que `hash_gpt_review` da última entry bata com hash atual de `ai/gpt-review.md`.

6. **Caso especial — `bloqueado_invariante_permanente`:**
   - Pode ser definido manualmente OU automaticamente quando validador detecta invariante violada.
   - Não permitir saída de volta para qualquer status que avance — apenas `em_planejamento`.

7. **Atualizar `ai/current-task.md`:**
   - `status: <novo-status>`
   - `ultima_atualizacao: <timestamp ISO 8601 com offset>`
   - `atualizado_por: comando:/handoff-status`

8. **NÃO escrever em `ai/decision-log.md`** — esse arquivo é exclusivamente editado pelo humano.

## Regras

- **Read-only sobre `decision-log.md`** — comando lê para validar, nunca escreve.
- **Read-only sobre `gpt-review.md`** — comando lê para hash, nunca escreve.
- **Validador é pré-requisito** — exit 0 obrigatório antes de alterar status.
- **Transições inválidas são abortadas**, não silenciosamente reverberadas para o status alvo mais próximo.
- Se `--force` for passado, alterar comportamento? **Não.** Não suportar `--force` nesta V1.

ARGUMENTS: TASK-XXX <novo-status> (ambos obrigatórios)
