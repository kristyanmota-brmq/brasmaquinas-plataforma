# TASK-026 — Validação sintética simples e com blocker

**Status:** `concluída`
**Prioridade:** `P1-crítico (governança)`
**Classe:** E — Exploratória
**Área:** governança / qualidade
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21

---

## Objetivo

Executar os passos 1 e 2 do roteiro mínimo da TASK-024D: projeto fictício simples (sem blocker) e projeto fictício com blocker de bomba. Produto exclusivo: relatório de achados. Nenhuma alteração de código.

---

## Contexto

A TASK-024D definiu que a primeira proposta real para cliente NÃO deve ser a primeira validação do sistema. O roteiro mínimo de 6 passos exige que os dois primeiros (fictício simples e fictício com blocker) sejam executados antes de qualquer proposta a cliente. Esta task executa esses dois passos via chamada direta ao orquestrador `calculateIrrigationProject()` em arquivo de teste temporário, sem tocar em `src/`.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `validate-task026.test.ts` | criação (temporário) | Arquivo de teste na raiz do projeto; apagado após conclusão |
| `vitest.task026.config.ts` | criação (temporário) | Config customizado para incluir arquivo fora de `src/`; apagado após conclusão |
| `docs/relatorios/2026-05-21-TASK-026.md` | criação | Relatório de achados permanente |
| `tasks/TASK-026-validacao-sintetica-simples-e-blocker.md` | criação | Este arquivo |

---

## Critérios de aceite (Classe E)

- [x] Cenário 1 executado com dados sintéticos controlados
- [x] Cenário 2 executado com bomba deliberadamente insuficiente
- [x] Todos os achados documentados com evidência textual direta do output dos testes
- [x] Nenhum código em `src/` alterado
- [x] Cada achado classificado como: esperado / inesperado / possível bug / design gap
- [x] Próxima ação recomendada para cada achado

---

## Fora do escopo

- Não corrigir nenhum bug encontrado
- Não alterar `src/` em hipótese alguma
- Não criar testes permanentes na suíte de regressão
- Não commitar correção de comportamento
- Não reclassificar épicos com base nos achados desta task

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Achados inesperados exigem task de correção | alta | médio | Abrir nova task A ou D com escopo cirúrgico; não desviar desta |

**Dependências:** TASK-023 ✅, TASK-024D ✅

---

## Pendências abertas

- [ ] **TASK-026-A**: Investigar por que `distribution.secondaries` retorna vazio para layout sintético com geometria válida. Classificação sugerida: Classe D ou A (ver relatório).
- [ ] **TASK-026-B** (design gap): Avaliar se HMT=undefined deve gerar blocker em `pdfEmissionBlockers`. Classificação sugerida: Classe A.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude (agente) | Tarefa criada e concluída |
