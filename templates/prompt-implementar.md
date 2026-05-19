# Template — Prompt de Implementação

Use este template ao solicitar implementação de uma tarefa ao Claude Code.
Substitua os campos entre `[ ]` antes de enviar.

---

## Prompt

```
Implemente [TASK-00X — título da tarefa] conforme o plano aprovado.

Contexto desta sessão:
- Branch: main
- Testes atuais: [N]/[N] passando
- TypeScript: 0 erros

Restrições obrigatórias:
- Não alterar src/components/ nem src/app/ (exceto se explicitamente no escopo)
- Não alterar AGENTS.md, HANDOFF.md, ARQUITETURA_ATUAL.md
- Não alterar SKUs existentes no catálogo
- Não commitar — apenas criar/modificar arquivos

Plano aprovado:
[cole aqui o plano que foi aprovado, incluindo arquivos afetados e critérios de aceite]

Ao concluir, responda com:
1. Arquivos criados/modificados
2. Testes: contagem antes vs. depois; novos testes criados
3. TypeScript: confirmação de 0 erros (npx tsc --noEmit)
4. Critérios de aceite verificados (checklist)
5. Números de sanidade (HMT, HF se aplicável)
6. Pendências abertas
7. Próximos passos sugeridos
```

---

## Notas de uso

- Execute `/planejar` antes deste prompt para gerar o plano a ser colado
- O plano deve ter sido aprovado explicitamente antes de enviar este prompt
- Se a implementação encontrar algo não previsto no plano, parar e reportar antes de continuar
- Não pular a verificação final (`npx tsc --noEmit` + `npx vitest run`)
