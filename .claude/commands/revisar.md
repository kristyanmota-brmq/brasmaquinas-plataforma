# Comando /revisar

Quando este comando for invocado, execute uma revisão técnica e metodológica completa.
**Não implementar nada durante a revisão** — apenas ler, analisar e reportar.

## O que ler antes de revisar

1. Plano aprovado da tarefa (ou a descrição do que foi implementado)
2. Arquivos modificados (ler integralmente, não apenas o diff)
3. Testes criados
4. `docs/metodologia/01-regras-bloqueantes.md` — regras que não podem ser violadas
5. `docs/metodologia/07-checklists-aprovacoes.md` — checklist completo

## Checklist de revisão

### Estrutura e arquitetura

```
[ ] calculateIrrigationProject é o único orquestrador chamado pelos consumidores
[ ] Nenhuma função de domínio chamada diretamente em src/components/ ou src/app/
[ ] Sem estado global mutável em src/lib/
[ ] Sem efeitos colaterais em funções puras
[ ] Sem imports circulares novos
[ ] Sem any não-documentado
```

### Hidráulica (se aplicável)

```
[ ] Diâmetro interno usado em headLoss e velocity
[ ] Fator de Christiansen aplicado nas laterais
[ ] Caminho crítico exaustivo (não heurístico)
[ ] HMT inclui todos os componentes obrigatórios
[ ] pumpValidation.designFlowM3h = maxSectorFlow
[ ] HydraulicModelLimitations computado dinamicamente
```

### BOM (se aplicável)

```
[ ] Ramais agrupados por SKU próprio (não tubo da principal)
[ ] Laterais agrupadas por SKU da coluna física
[ ] Tês de derivação = nColunasLaterais (não nLaterais operacionais)
[ ] buildBOM é puro (sem estado global)
```

### Testes

```
[ ] Novos testes são independentes dos existentes
[ ] Fixtures realistas (makeLayoutL, makeLayoutP) usadas para testes de integração
[ ] Testes numéricos com toBeCloseTo e precisão adequada
[ ] Nenhum teste hardcoded com valor que mude ao atualizar catálogo
[ ] npx vitest run → 100% passando
```

### TypeScript

```
[ ] npx tsc --noEmit → 0 erros
[ ] Nenhum tipo exportado removido ou renomeado sem ADR
[ ] Interfaces públicas preservadas
```

## Formato de resposta do /revisar

```
## Resultado da revisão

**Status:** APROVADO / APROVADO COM RESSALVAS / REPROVADO

### Itens aprovados

- [x] [item que passou]

### Itens com ressalvas (não bloqueiam, mas devem ser acompanhados)

- [ ] [item] — [arquivo:linha] — [o que fazer]

### Itens reprovados (devem ser corrigidos antes de merge)

- [ ] [item] — [arquivo:linha] — [o que está errado e como corrigir]

### Riscos identificados

[Riscos que os testes existentes não cobrem]

### Sugestões (para futura tarefa, não implementar agora)

[Melhorias identificadas que estão fora do escopo desta tarefa]
```