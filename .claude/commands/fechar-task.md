# Comando /fechar-task

Quando este comando for invocado, execute o **fechamento documental completo** da task atual.

## O que fazer antes de gerar o resumo

1. Verificar estado final:
   ```bash
   npx tsc --noEmit      # deve retornar 0 erros
   npx vitest run        # anotar contagem final
   ```

2. Ler os arquivos de contexto para garantir que o resumo é preciso:
   - `tasks/backlog.md` — estado atual da task
   - `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — premissas existentes
   - O arquivo da task `tasks/TASK-XXX.md`, se existir

## Documentos a criar ou atualizar

Após gerar o resumo, criar ou atualizar os seguintes arquivos:

1. **`docs/relatorios/YYYY-MM-DD-TASK-XXX.md`** — relatório da task (usar data de hoje)
   - Criar se não existir
   - Não sobrescrever relatório de outra task

2. **`tasks/backlog.md`** — atualizar status da task para `concluída` com a data

3. **`docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`** — somente se houver premissa nova ou alterada nesta sessão

4. **`tasks/TASK-XXX.md`** — criar arquivo da task se ainda não existir, usando `tasks/TASK_TEMPLATE.md` como base

## Formato de resposta obrigatório

Gerar o relatório seguindo o template `templates/resumo-implementacao.md` e, ao final, incluir a seção abaixo:

---

### Ações executadas

| Arquivo | Ação | Observação |
|---------|------|------------|
| `docs/relatorios/YYYY-MM-DD-TASK-XXX.md` | criado | relatório desta task |
| `tasks/backlog.md` | atualizado | status → concluída |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | atualizado / sem alteração | [motivo] |
| `tasks/TASK-XXX.md` | criado / já existia | — |

---

### Premissas provisórias

- **Criadas nesta task:** [listar ou "nenhuma"]
- **Alteradas nesta task:** [listar ou "nenhuma"]
- **Removidas nesta task:** [listar ou "nenhuma"]

---

### Pendências abertas

- [ ] [o que ficou fora do escopo ou requer acompanhamento]

---

### Próxima task sugerida

**[TASK-XXX — título]** — [motivo pelo qual é o próximo passo natural]

---

### ADR necessário?

- **Sim** — [descrever qual decisão arquitetural deve ser registrada em `docs/decisoes/`]
- **Não** — nenhuma decisão arquitetural nova nesta task

---

## Regras do /fechar-task

- **Não alterar código** nesta etapa — apenas criar ou atualizar documentação
- Se o TypeScript retornar erros, reportar e **não marcar a task como concluída** até que sejam corrigidos
- Se os testes regredirem, reportar e **não marcar a task como concluída** até que sejam corrigidos
- A alteração de `tasks/backlog.md` e a criação do relatório em `docs/relatorios/` são **obrigatórias** — não podem ser puladas
- Alterar código somente se o usuário autorizar explicitamente nesta mesma mensagem