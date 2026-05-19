# Template — Resumo de Implementação

Use este template para registrar o que foi feito em cada sessão de desenvolvimento.
Gerado automaticamente pelo comando `/resumir`.

---

```markdown
# Resumo de Sessão — [TASK-00X ou "Sessão livre"]

**Data:** YYYY-MM-DD
**Duração:** estimada
**Testes ao início:** [N]/[N]
**Testes ao final:** [N]/[N]
**TypeScript erros:** 0

---

## O que foi feito

### [Nome da tarefa ou bloco de trabalho]

[Descrição concisa do que foi implementado, não o que foi tentado]

**Arquivos criados:**
- `src/lib/layout/nome-do-arquivo.ts` — [o que faz]

**Arquivos modificados:**
- `src/lib/bom.ts` — [qual parte e por quê]

---

## Testes novos

| Arquivo de teste | Testes adicionados | O que cobrem |
|-----------------|-------------------|-------------|
| `secondary-sizing.test.ts` | +12 | selectSecondaryPipe, sizeAllSecondaries, integração |

---

## Números de sanidade

| Projeto | Métrica | Antes | Depois |
|---------|---------|-------|--------|
| Projeto L | HMT (mca) | — | 43,99 |
| Projeto L | hfRamal (mca) | — | 0,09 |

---

## Invariantes verificadas

- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → [N]/[N] passando
- [x] Orquestrador único preservado
- [x] Nenhuma lógica de domínio em UI
- [x] Catálogo imutável

---

## Decisões tomadas

| Decisão | Alternativa descartada | Motivo |
|---------|----------------------|--------|
| [decisão] | [alternativa] | [motivo] |

Se decisão for arquitetural significativa → criar ADR em `docs/decisoes/`.

---

## Pendências abertas

- [ ] [o que ficou fora do escopo ou requer acompanhamento]
- [ ] [decidir X com RT antes da próxima sessão]

---

## Próximos passos

1. **TASK-00X** — [próxima tarefa natural]
2. **Revisar com RT** — [o que precisa de validação técnica]
```

---

## Notas de uso

- Preencher imediatamente ao final da sessão (memória quente)
- Salvar em `docs/relatorios/YYYY-MM-DD-TASK-00X.md` ou atualizar `HANDOFF.md`
- Se HMT ou outro número de sanidade mudou, atualizar `docs/metodologia/08-logs-e-auditoria.md`
