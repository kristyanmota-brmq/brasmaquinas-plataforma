# Comando /planejar

Quando este comando for invocado, gere um plano detalhado para a tarefa solicitada **sem implementar nada ainda**.

## O que fazer

1. **Ler o contexto atual:**
   - Estado dos testes: `npx vitest run` (contagem)
   - Estado do TypeScript: `npx tsc --noEmit`
   - Tarefa no backlog: `tasks/backlog.md`
   - Arquivo da tarefa específica se existir: `tasks/TASK-00X.md`

2. **Ler os arquivos relevantes** antes de propor qualquer mudança.
   Nunca propor mudanças em arquivos não lidos.

3. **Gerar o plano** no seguinte formato:

---

### Formato de resposta do /planejar

```
## Entendimento

[O que esta tarefa deve entregar. Uma frase clara.]

## Estado atual

- Testes: [N]/[N] passando
- TypeScript: [N] erros
- Arquivos relevantes lidos: [lista]

## Arquivos que serão criados

- `caminho/arquivo.ts` — [motivo e o que contém]

## Arquivos que serão modificados

- `caminho/arquivo.ts` — [qual parte e por quê]
  - Linha X: [o que muda]

## Arquivos que NÃO serão alterados

- `src/components/` — fora do escopo
- `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md` — nunca alterar

## Testes obrigatórios

1. [nome do teste] — [o que verifica]
2. [nome do teste] — [o que verifica]
...

## Critérios de aceite

- [ ] [critério mensurável]
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → contagem ≥ [N atual]

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|

## O que NÃO será feito nesta tarefa

- Não alterar [X]
- Não otimizar [Y]

## Confirmação necessária

Aguardando aprovação antes de iniciar qualquer implementação.
Responda com: "Aprovado", "Aprovado com ajustes: [lista]" ou "Reprovar: [motivo]".
```

---

## Regras do /planejar

- **Nunca implementar** durante o /planejar — apenas ler, analisar e planejar
- Se a tarefa não estiver no backlog, propor adicionar antes de planejar
- Se encontrar inconsistência no código que afeta o plano, reportar antes de continuar
- O plano deve ser específico o suficiente para que outra pessoa possa implementar sem perguntar