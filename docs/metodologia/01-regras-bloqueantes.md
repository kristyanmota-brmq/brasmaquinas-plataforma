# Regras Bloqueantes

Estas regras nunca podem ser violadas. Se qualquer uma delas for violada, a tarefa não está concluída.

---

## RB-01 — TypeScript sem erros

```bash
npx tsc --noEmit
```

**Deve retornar 0 erros.** Nenhum `// @ts-ignore`, `// @ts-expect-error` ou `any` introduzido sem justificativa documentada em ADR.

---

## RB-02 — Testes passando sem regressão

```bash
npx vitest run
```

**Deve passar 100% dos testes.** A contagem de testes aprovados nunca pode diminuir entre commits. Novos testes podem ser adicionados; testes existentes não podem ser removidos ou desabilitados sem aprovação explícita do RT.

---

## RB-03 — Orquestrador único

`calculateIrrigationProject(layout)` em `src/lib/layout/irrigation-project.ts` é o **único caminho** para cálculo de projetos de irrigação.

Nenhum componente de UI, rota de API ou endpoint de PDF pode chamar diretamente funções de domínio como `generatePhysicalColumns`, `sizeHydraulics`, `buildBOM` ou similares. Esses consumidores devem sempre passar por `calculateIrrigationProject`.

**Exceções permitidas:**
- Funções utilitárias puras sem efeito no resultado do projeto (e.g., `headLoss`, `velocity` para visualização diagnóstica)
- Funções de UI que geram novo dado de layout via `setLayout` (e.g., `generatePrincipalAndAdutora` no auto-pipeline do mapa)

---

## RB-04 — Catálogo imutável em runtime

SKUs existentes em `src/lib/catalog/aspersores.ts` não mudam de nome, diâmetro ou tipo. Dados técnicos (espessura, diâmetro interno) podem ser corrigidos com evidência do fabricante + ADR. Preços podem ser atualizados. Novas peças podem ser adicionadas.

Nenhuma peça é removida do catálogo sem migração dos projetos que a referenciam.

---

## RB-05 — BOM sem estado fantasma

`buildBOM(input: BOMInput)` é puro: mesmo input → mesmo output. Nenhum estado global, nenhum cache, nenhum efeito colateral. Testes de BOM devem ser determinísticos.

---

## RB-06 — Domínio fora da UI

Código em `src/components/` e `src/app/` **não contém lógica de cálculo de irrigação**. Qualquer novo cálculo vai para `src/lib/`. Componentes apenas exibem e interagem com `IrrigationProjectResult`.

---

## RB-07 — Plano antes de implementação

Nenhuma tarefa começa sem plano escrito e aprovado. O plano deve conter: arquivos afetados, critérios de aceite, testes obrigatórios, riscos e o que está fora do escopo. Ver `tasks/TASK_TEMPLATE.md`.

---

## RB-08 — Sem alteração de geometria em sprint hidráulica

Sprints de solver hidráulico não alteram geometria (posições, setorização, principal, adutora) nem BOM estrutural. Sprints de layout não alteram solver hidráulico. Escopo cruzado requer aprovação explícita e ADR.

---

## Checklist de fechamento de tarefa

Antes de declarar qualquer tarefa concluída, verificar:

```
[ ] npx tsc --noEmit → 0 erros
[ ] npx vitest run → 100% passando, contagem ≥ anterior
[ ] Nenhum any não-documentado introduzido
[ ] Nenhuma lógica de domínio em src/components/ ou src/app/
[ ] Nenhum SKU do catálogo renomeado ou removido
[ ] Plano foi aprovado antes da implementação
[ ] Resumo de sessão gerado com /resumir
[ ] backlog.md atualizado com novo status da tarefa
```
