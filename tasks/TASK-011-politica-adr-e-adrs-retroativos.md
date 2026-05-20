# TASK-011 — Política de ADR e ADRs retroativos essenciais

**Data de abertura:** 2026-05-20
**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** governança / documentação
**Concluída em:** 2026-05-20 · 597/597 testes · 0 erros tsc

---

## Objetivo

Criar uma política simples de ADR e registrar os ADRs retroativos essenciais já consolidados no projeto.

---

## Motivação

Várias tasks técnicas foram concluídas sem que as decisões estruturais fossem formalmente registradas. Sem ADRs, o raciocínio por trás de invariantes críticas (orquestrador único, diâmetro interno, gate de PDF, lateral física vs. operacional, etc.) existe apenas em relatórios de sessão espalhados em `docs/relatorios/` e no histórico de commits. Isso cria risco de regressão intencional ou acidental quando a equipe ou o agente não tem contexto suficiente.

---

## Escopo

### Criado

- `docs/decisoes/ADR-001-orquestrador-unico-calculate-irrigation-project.md`
- `docs/decisoes/ADR-002-diametro-interno-calculos-hidraulicos.md`
- `docs/decisoes/ADR-003-bloqueio-pdf-com-blockers.md`
- `docs/decisoes/ADR-004-lateral-fisica-vs-trecho-operacional.md`
- `docs/decisoes/ADR-005-registros-manuais-secao-viqua-pn80.md`
- `docs/decisoes/ADR-006-motor-layout-candidatos-preliminar.md`
- `docs/decisoes/ADR-007-premissas-provisorias-mercado-revisao-brasmaquinas.md`
- `docs/decisoes/ADR-008-validacao-pn-classe-pressao-tubos.md`
- `tasks/TASK-011-politica-adr-e-adrs-retroativos.md` (este arquivo)
- `docs/relatorios/2026-05-20-TASK-011.md`

### Atualizado

- `docs/software/arquitetura.md` — seção de política de ADR adicionada
- `tasks/backlog.md` — TASK-011 registrada como concluída

---

## Restrições

- Nenhum arquivo em `src/` alterado.
- Nenhuma decisão nova inventada — apenas decisões já tomadas em tasks, relatórios e metodologia.
- Catálogo, solver, BOM, UI, motor de layout e PDF intocados.

---

## Critérios de aceite

- [x] 8 ADRs criados
- [x] Política de ADR adicionada em `docs/software/arquitetura.md`
- [x] TASK-011 criada em `tasks/`
- [x] Backlog atualizado
- [x] Relatório da TASK-011 criado em `docs/relatorios/`
- [x] Nenhum arquivo em `src/` alterado
- [x] 597/597 testes passando · 0 erros tsc (não alterado — task de documentação)

---

## Referências

- `docs/relatorios/2026-05-19-diagnostico-software-atual.md`
- `docs/relatorios/2026-05-19-prova-cadeia-logica-motor.md`
- `docs/relatorios/2026-05-19-TASK-003.md`
- `docs/relatorios/2026-05-19-TASK-004.md`
- `docs/relatorios/2026-05-19-TASK-006B.md`
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- `docs/decisoes/ADR-000-template.md`
