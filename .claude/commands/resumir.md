# Comando /resumir

Quando este comando for invocado, gere um resumo completo da sessão atual para registro permanente.
Use o formato de `templates/resumo-implementacao.md`.

## O que coletar antes de resumir

1. Estado final dos testes: `npx vitest run`
2. Estado final do TypeScript: `npx tsc --noEmit`
3. Lista de arquivos criados e modificados nesta sessão
4. Decisões tomadas e por quê
5. O que ficou fora do escopo

## O que incluir no resumo

### Obrigatório

- Data e contagem de testes (antes e depois)
- Arquivos criados (com propósito de cada um)
- Arquivos modificados (com o que mudou e por quê)
- Novos testes e o que cobrem
- Invariantes verificadas (checklist)
- Pendências abertas
- Próximos passos

### Se aplicável (hidráulica)

- Números de sanidade: HMT, hfAdutora, hfPrincipal, hfRamal, hfLateral, localLosses, margem
- Se HMT mudou em relação aos valores de referência: explicar o motivo
- Setor crítico identificado

### Se aplicável (decisões)

- Decisões arquiteturais com alternativas descartadas
- Se decisão é significativa → indicar que precisa de ADR

## Onde salvar

O resumo deve ser apresentado para o usuário copiar para um dos destinos:

1. `HANDOFF.md` — quando é o fim de uma sessão longa e o trabalho continua depois
2. `docs/relatorios/YYYY-MM-DD-TASK-00X.md` — quando é o fechamento de uma tarefa
3. Ambos — quando aplicável

## Atualizar backlog

Após gerar o resumo, indicar quais entradas do `tasks/backlog.md` precisam ser atualizadas
e propor o texto exato do novo status.

## Formato de resposta do /resumir

Seguir exatamente o template em `templates/resumo-implementacao.md`.

Ao final, incluir:

```
## Ações necessárias

1. [ ] Copiar este resumo para HANDOFF.md (se sessão continua)
2. [ ] Copiar para docs/relatorios/YYYY-MM-DD-TASK-00X.md (se tarefa fechada)
3. [ ] Atualizar tasks/backlog.md: [status exato proposto para cada tarefa]
4. [ ] Atualizar docs/metodologia/08-logs-e-auditoria.md: [se HMT ou sanidade mudou]
5. [ ] Criar ADR: [se decisão arquitetural foi tomada]
```