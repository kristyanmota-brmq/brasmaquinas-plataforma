# Comando /iniciar-task

Quando este comando for invocado, execute uma **auditoria de contexto completa** antes de qualquer planejamento ou implementação.

## Leitura obrigatória

Leia todos os arquivos abaixo antes de responder qualquer coisa:

1. `CLAUDE.md` — regras e invariantes do repositório
2. `tasks/backlog.md` — estado atual de todas as tasks
3. `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — premissas vivas
4. O relatório mais recente em `docs/relatorios/` (identificar pelo nome de arquivo mais recente)
5. O arquivo da task atual em `tasks/TASK-XXX.md` (substituir XXX pelo ID informado pelo usuário ou, se não informado, pela task mais recente com status `em progresso`)

Se algum desses arquivos não existir, listar o que falta e parar.

## Formato de resposta obrigatório

Responda exatamente neste formato, sem pular nenhuma seção:

---

### Arquivos lidos

- `CLAUDE.md` — ✓
- `tasks/backlog.md` — ✓
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — ✓
- `docs/relatorios/[nome do arquivo mais recente]` — ✓
- `tasks/TASK-XXX.md` — ✓ / ✗ não encontrado

---

### Estado atual do projeto

- Testes na base: [N]/[N] (conforme `tasks/backlog.md`)
- TypeScript: [N erros] (conforme `tasks/backlog.md`)
- Última task concluída: [TASK-XXX — título]
- Task atual: [TASK-XXX — título — status atual]

---

### Regras permanentes aplicáveis a esta task

Liste apenas as regras de `CLAUDE.md` que são diretamente relevantes para a task atual. Se todas se aplicam, diga isso explicitamente.

---

### Premissas provisórias que impactam esta task

Liste as entradas de `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` que afetam o escopo, os critérios de aceite ou os arquivos desta task. Se nenhuma, dizer explicitamente "Nenhuma premissa provisória impacta esta task."

---

### Pendências anteriores que impactam esta task

Liste qualquer pendência aberta no último relatório (`docs/relatorios/`) ou no backlog que deva ser resolvida ou considerada antes de avançar. Se nenhuma, dizer explicitamente.

---

### Avaliação de contexto

**Contexto suficiente para iniciar?** Sim / Não

- Se **Não**: listar exatamente o que falta (arquivos ausentes, decisões pendentes, aprovações, dados do RT) e **parar aqui**.
- Se **Sim**: informar que o contexto está completo e aguardar instrução do usuário para prosseguir (ex: `/planejar`).

---

## Regras do /iniciar-task

- **Não implementar nada** durante este comando — apenas ler e reportar
- **Não planejar** durante este comando — aguardar instrução explícita do usuário
- Se `tasks/TASK-XXX.md` não existir, alertar e pedir confirmação de qual task iniciar
- Se houver task `em progresso` no backlog diferente da informada pelo usuário, alertar o conflito antes de continuar