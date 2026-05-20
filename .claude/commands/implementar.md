# Comando /implementar

Quando este comando for invocado, execute a implementação de uma tarefa **que já foi planejada e aprovada**.

## Pré-condições obrigatórias

Antes de qualquer linha de código, verificar:

1. Existe um plano aprovado para esta tarefa?
   - Se não: executar `/planejar` primeiro e aguardar aprovação
   - Se sim: continuar

2. Ler o plano aprovado e confirmar que entendeu o escopo.

3. Verificar estado atual:
   ```bash
   npx tsc --noEmit      # deve retornar 0 erros
   npx vitest run        # anotar contagem atual
   ```

## Durante a implementação

- Seguir exatamente o escopo do plano aprovado
- Se encontrar algo não previsto no plano que mude o escopo: **parar e reportar** antes de continuar
- Criar testes junto com o código (não deixar para o final)
- Verificar `npx tsc --noEmit` após cada arquivo modificado

## Restrições sempre ativas

- `src/components/` e `src/app/` — não alterar (exceto se explicitamente no plano aprovado)
- `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md` — nunca alterar
- SKUs no catálogo — nunca renomear ou remover
- `.claude/settings.local.json` — nunca alterar

## Verificação final

Após implementar tudo:

```bash
npx tsc --noEmit     # deve retornar 0 erros
npx vitest run       # deve passar 100%, contagem ≥ anterior
```

Se qualquer verificação falhar: **corrigir antes de reportar conclusão**.

## Formato de resposta do /implementar

```
## O que foi feito

### Arquivos criados
- `caminho/arquivo.ts` — [resumo do que faz]

### Arquivos modificados
- `caminho/arquivo.ts` — [qual mudança e por quê]

## Testes

- Antes: [N]/[N]
- Depois: [N]/[N]
- Novos testes: [lista com nome e o que cobrem]

## TypeScript

`npx tsc --noEmit` → 0 erros ✓

## Critérios de aceite

- [x] [critério 1]
- [x] [critério 2]
- [ ] [critério não cumprido — explicar por quê]

## Números de sanidade

[HMT, HF, velocidades se aplicável]

## Pendências abertas

- [o que ficou fora do escopo ou requer acompanhamento]

## Próximos passos

1. [próxima tarefa natural do backlog]
```