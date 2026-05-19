# Checklist de Pull Request

Preencher antes de qualquer merge em `main`.

---

## Informações do PR

- **Tarefa:** TASK-00X — [título]
- **Branch:** [nome da branch]
- **Revisor:** [nome]
- **Data:** YYYY-MM-DD

---

## Checklist obrigatório

### Qualidade de código

- [ ] `npx tsc --noEmit` → **0 erros**
- [ ] `npx vitest run` → **100% passando**, contagem ≥ anterior
- [ ] Sem `any` não-documentado
- [ ] Sem imports circulares novos
- [ ] Sem lógica de domínio em `src/components/` ou `src/app/`

### Escopo

- [ ] Apenas arquivos dentro do escopo aprovado foram alterados
- [ ] Nenhum SKU do catálogo foi renomeado ou removido
- [ ] `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md` não foram alterados

### Testes

- [ ] Novos testes foram adicionados para toda lógica de domínio nova
- [ ] Testes existentes não foram desabilitados ou removidos
- [ ] Fixtures `makeLayoutL` e `makeLayoutP` ainda produzem resultados consistentes com sanidade

### Hidráulica (se aplicável)

- [ ] Diâmetro interno usado em headLoss e velocity
- [ ] HMT inclui todos os componentes: pressão + hfAdutora + hfPrincipal + hfRamal + hfLateral + desnível + localLosses + margem
- [ ] `pumpValidation.designFlowM3h` = maxSectorFlow

### BOM (se aplicável)

- [ ] Ramais agrupados por SKU próprio (não tubo da principal)
- [ ] Tês de derivação = nColunasLaterais
- [ ] `buildBOM` ainda é função pura (mesmo input → mesmo output)

### Documentação

- [ ] `tasks/backlog.md` atualizado com status da tarefa
- [ ] Se decisão arquitetural: ADR criado em `docs/decisoes/`
- [ ] Se números de sanidade mudaram: `docs/metodologia/08-logs-e-auditoria.md` atualizado

---

## Critérios de aceite da tarefa

> Cole aqui os critérios do arquivo `tasks/TASK-00X.md` e marque cada um:

- [ ] [critério 1]
- [ ] [critério 2]
- [ ] [...]

---

## Aprovação

| Papel | Nome | Status | Data |
|-------|------|--------|------|
| Revisor técnico | | pendente / aprovado / reprovado | |
| RT (se mudança de metodologia) | | pendente / aprovado / — | |

**Merge autorizado por:** [nome] em [data]
