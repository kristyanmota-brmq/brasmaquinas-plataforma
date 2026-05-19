# Template — Prompt de Revisão Técnica

Use este template ao solicitar revisão de código ou implementação ao Claude Code.

---

## Prompt — revisão de implementação concluída

```
Revise a implementação de [TASK-00X — título] recém-concluída.

Arquivos modificados nesta tarefa:
- [arquivo 1]
- [arquivo 2]

Critérios de aceite da tarefa:
[cole os critérios do arquivo tasks/TASK-00X.md]

Execute o checklist completo de revisão (docs/metodologia/07-checklists-aprovacoes.md §4):

1. Estrutura e arquitetura
2. Hidráulica (se aplicável)
3. BOM (se aplicável)
4. Testes

Reporte:
- [ ] Itens que passaram
- [ ] Itens que falharam (com arquivo:linha)
- [ ] Riscos identificados não cobertos pelos testes
- [ ] Sugestões de melhoria (sem implementar — apenas documentar)
```

---

## Prompt — revisão de plano (antes de implementar)

```
Revise o seguinte plano antes da implementação:

[cole o plano gerado por /planejar]

Verificar:
1. O plano cobre todos os critérios de aceite da tarefa?
2. Os arquivos afetados estão corretos e completos?
3. Os testes propostos são suficientes para cobrir os casos de falha?
4. Existe algum risco não mapeado?
5. O plano viola alguma regra bloqueante (01-regras-bloqueantes.md)?

Responda com: aprovado / aprovado com ajustes / reprovado + justificativa.
```

---

## Notas de uso

- Revisão de implementação deve ser feita antes de commit em `main`
- Revisão de plano deve ser feita antes de iniciar implementação
- Revisor pode ser o mesmo agente em sessão separada (sem contexto da implementação) para revisão independente
