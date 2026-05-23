# Comando /handoff

Serializa o plano gerado por `/planejar` para `ai/claude-report.md` e atualiza `ai/current-task.md.status` para `aguardando_revisao_gpt`.

Uso: `/handoff TASK-XXX`

> **Nota histórica**: este comando era chamado `/handoff-claude-report` até 2026-05-23. Foi renomeado para `/handoff` (mais curto). Tasks fechadas, relatórios e entries antigas do decision-log preservam o nome original como registro histórico.

## O que fazer

1. **Validar argumento.** Se `task_id` não for passado como argumento, abortar com mensagem clara — não usar o último output da conversa como referência sem confirmação.

2. **Confirmar contra `ai/current-task.md`.** Ler o frontmatter; se `task_id` não bater com o argumento, abortar e listar o conflito.

3. **Localizar o plano a serializar.** Em ordem de preferência:
   - Conteúdo da resposta mais recente do `/planejar` na conversa atual (apresentar trecho ao usuário e pedir confirmação explícita antes de gravar).
   - Conteúdo de `tasks/TASK-XXX-*.md` se já existir (perguntar se é esse).

4. **Apresentar preview ao usuário** antes de gravar:
   - Caminho do arquivo de destino: `ai/claude-report.md`.
   - Primeiras 30 linhas do conteúdo proposto.
   - Status atual e status alvo.

5. **Após confirmação explícita**, escrever `ai/claude-report.md` no formato canônico (ver `templates/ai-handoff-claude-report.md`). Seções obrigatórias:
   - `## Entendimento`
   - `## Arquivos criados`
   - `## Arquivos modificados`
   - `## Arquivos não alterados`
   - `## Testes obrigatórios`
   - `## Critérios de aceite`
   - `## Riscos`
   - `## O que NÃO será feito`
   - `## Invariantes verificadas`

6. **Atualizar `ai/current-task.md`:**
   - `status: aguardando_revisao_gpt`
   - `ultima_atualizacao: <timestamp ISO 8601 com offset>`
   - `atualizado_por: comando:/handoff`

7. **Lembrar o usuário** do próximo passo:
   ```
   node scripts/ai/run-gpt-review.mjs --task TASK-XXX
   ```

## Regras

- **Nunca** gravar `ai/claude-report.md` sem confirmação explícita do usuário sobre qual plano serializar.
- **Nunca** alterar `ai/decision-log.md` neste comando (esse é trabalho exclusivamente humano).
- **Nunca** chamar a API OpenAI neste comando.
- **Sempre** validar `task_id` contra `ai/current-task.md` antes de gravar.
- Se houver discrepância entre `task_id` argumento e `current-task.md`, **abortar** e instruir o usuário a rodar `/handoff-status` para sincronizar antes.

ARGUMENTS: TASK-XXX (obrigatório)
