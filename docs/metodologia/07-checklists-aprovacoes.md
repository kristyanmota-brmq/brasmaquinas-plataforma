# Checklists e Aprovações

---

## 1. Checklist pré-implementação

Antes de escrever qualquer código, verificar:

```
[ ] Existe uma tarefa no backlog (tasks/backlog.md) para esta implementação
[ ] A tarefa tem critérios de aceite claros e mensuráveis
[ ] A tarefa lista os arquivos que serão afetados
[ ] A tarefa lista os testes obrigatórios
[ ] Foram identificados os riscos e o que está fora do escopo
[ ] O plano foi apresentado ao RT e aprovado explicitamente
[ ] A tarefa não viola nenhuma regra bloqueante (01-regras-bloqueantes.md)
```

---

## 2. Checklist de implementação

Durante a implementação, verificar a cada passo significativo:

```
[ ] Nenhum any introduzido sem justificativa
[ ] Nenhum estado movido para componente de UI
[ ] Nenhum SKU do catálogo alterado
[ ] Testes escritos antes ou junto com o código (não depois)
[ ] Funções novas têm interface clara; implementação pode mudar, contrato não
[ ] Imports circulares verificados (src/lib não importa de src/components)
```

---

## 3. Checklist de encerramento de tarefa

Antes de declarar a tarefa concluída:

```
[ ] npx tsc --noEmit → 0 erros
[ ] npx vitest run → 100% passando, contagem ≥ anterior
[ ] Todos os critérios de aceite da tarefa verificados
[ ] Números de sanidade registrados (HMT, HF, velocidades se aplicável)
[ ] Arquivo tasks/backlog.md atualizado com novo status
[ ] Resumo de sessão gerado com /resumir
[ ] Nenhum arquivo em src/ alterado fora do escopo aprovado
```

---

## 4. Checklist de revisão de código (/revisar)

Executar antes de qualquer merge ou emissão de proposta:

**Estrutura e arquitetura:**
```
[ ] calculateIrrigationProject é o único orquestrador chamado pelos consumidores
[ ] Nenhuma função de domínio chamada diretamente em src/components/
[ ] Sem estado global mutável em src/lib/
[ ] Sem efeitos colaterais em funções puras (buildBOM, sizeHydraulics, etc.)
```

**Hidráulica (se aplicável):**
```
[ ] Diâmetro interno usado em todos os cálculos de headLoss e velocity
[ ] Fator de Christiansen aplicado nas laterais
[ ] Caminho crítico exaustivo (não heurístico)
[ ] HMT inclui: pressão serviço + hfAdutora + hfPrincipal + hfRamal + hfLateral + desnível + localLosses + margem
[ ] pumpValidation.designFlowM3h = maxSectorFlow (não critSectorFlow)
```

**BOM (se aplicável):**
```
[ ] Ramais agrupados por SKU próprio (não pelo tubo da principal)
[ ] Laterais agrupadas por SKU da coluna física
[ ] Tês de derivação = nColunasLaterais (não nLaterais operacionais)
[ ] Adesivo calculado sobre comprimento total de tubulação
```

**Testes:**
```
[ ] Novos testes são independentes dos existentes
[ ] Fixtures usam makeLayoutL() ou makeLayoutP() para projetos realistas
[ ] Testes numéricos usam toBeCloseTo com precisão adequada
[ ] Nenhum teste com valores hardcoded que quebrem ao mudar o catálogo
```

---

## 5. Checklist de emissão de proposta (RT)

Antes de enviar proposta ao cliente:

```
[ ] diagnostics.blockers está vazio
[ ] diagnostics.hydraulicSolverStatus !== "blocked"
[ ] Bomba informada e validada (pumpValidationStatus === "ok") — ou proposta marcada como preliminar
[ ] constructabilityStatus !== "blocked"
[ ] BOM revisada manualmente para itens incomuns (quantidades muito altas/baixas)
[ ] Preços do catálogo atualizados (data da última atualização conhecida)
[ ] Área confirmada com cliente (areaHectares é informado manualmente)
[ ] Desnível informado (geodetic.elevationDeltaMeters) — ou HMT marcada como estimativa sem desnível
```

---

## 6. Processo de aprovação de plano

O RT deve responder explicitamente com uma das opções:

| Resposta | Significado | Próxima ação |
|---------|-------------|-------------|
| "Aprovado" / "Pode prosseguir" | Plano aceito como está | Iniciar implementação |
| "Aprovado com ajustes: [lista]" | Aceito com modificações | Ajustar plano e implementar |
| "Aguardar" | Decisão pendente | Manter tarefa como bloqueada |
| "Reprovar: [motivo]" | Plano rejeitado | Replanejar com novo contexto |

**Nenhuma implementação começa antes de aprovação explícita.**
