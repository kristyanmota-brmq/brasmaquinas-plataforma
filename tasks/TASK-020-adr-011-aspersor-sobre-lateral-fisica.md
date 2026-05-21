# TASK-020 — ADR-011 Aspersor obrigatoriamente sobre lateral física

**Status:** `concluída`
**Prioridade:** `P1-crítico`
**Área:** `governança / documentação`
**Criado em:** 2026-05-20
**Atualizado em:** 2026-05-20

---

## Objetivo

Registrar a decisão operacional Brasmáquinas de que o aspersor deve estar obrigatoriamente sobre a lateral física que o atende em um Architectural Decision Record (ADR-011). Tarefa de documentação pura — não altera código.

---

## Contexto

A TASK-019 implementou a detecção de desvios de aspersor fora do eixo da lateral, gerando blocker quando o desvio > 0,10 m.

Durante o planejamento de TASK-019, o usuário clarificou a regra operacional Brasmáquinas:
- A vala da lateral e o ponto do aspersor são a mesma execução física
- Aspersor fora do eixo exige segunda escavação
- Projeto com aspersor fora da lateral é construtivamente inválido

Esta tarefa formaliza essa decisão em um ADR seguindo a política estabelecida em TASK-011.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `docs/decisoes/ADR-011-aspersor-obrigatoriamente-sobre-lateral-fisica.md` | criação | novo ADR |
| `tasks/TASK-020-adr-011-aspersor-sobre-lateral-fisica.md` | criação | próprio arquivo de task |
| `docs/relatorios/2026-05-20-TASK-020.md` | criação | relatório de conclusão |
| `tasks/backlog.md` | modificação | adicionar entrada de TASK-020 |

**Arquivos NÃO alterados:**
- `src/` — nenhum arquivo de código
- `src/lib/bom.ts`, `src/lib/layout/laterais.ts`, `src/lib/layout/irrigation-project.ts` — já alterados em TASK-019, não tocados nesta task
- solver, BOM, catálogo, PDF, mapa, motor A/B/C, motor de layout

---

## Critérios de aceite

- [ ] ADR-011 criado em `docs/decisoes/` com 10 seções: Contexto, Decisão (4 subsções), Alternativas (3 alternativas), Consequências, Arquivos afetados, Classificação, Referências, Log
- [ ] ADR registra a vala da lateral = ponto do aspersor
- [ ] ADR registra que aspersor fora da lateral exige segunda escavação
- [ ] ADR registra que desvio > tolerância gera blocker
- [ ] ADR registra que PDF é bloqueado automaticamente
- [ ] ADR registra tolerância 0,10 m
- [ ] ADR registra que a regra é aprovada pela Brasmáquinas (não é premissa provisória)
- [ ] ADR registra que o valor 0,10 m é pendente de revisão RT
- [ ] TASK-020 criado em `tasks/` com contexto, objetivo, critérios de aceite e referências
- [ ] Relatório criado em `docs/relatorios/2026-05-20-TASK-020.md`
- [ ] `tasks/backlog.md` atualizado com entrada de TASK-020
- [ ] Nenhum arquivo em `src/` alterado
- [ ] Nenhuma alteração em solver, BOM, catálogo, PDF, mapa, motor A/B/C

---

## Testes obrigatórios

Não aplicável — tarefa de documentação. Nenhum teste de código novo.

---

## Fora do escopo

- Não alterar implementação da detecção (já em TASK-019)
- Não revisar o valor 0,10 m com o RT (responsabilidade futura)
- Não modificar solver, BOM, catálogo, PDF, mapa, motor A/B/C
- Não criar testes de código

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| ADR incompleto | baixa | médio | revisar os 9 pontos antes de finalizar |
| Referências inconsistentes | baixa | baixo | usar padrão de ADR-010 como modelo |

**Dependências de outras tarefas:** TASK-019 deve estar concluída (✓ está concluída em 2026-05-20).

---

## Pendências abertas

- [ ] Revisão RT do valor 0,10 m para fazendas > 500–700 m (responsabilidade futura, não desta task)

---

## Plano de implementação

1. Ler ADR existente (ADR-010) para entender estrutura e tom
2. Criar ADR-011 em `docs/decisoes/` com 10 seções:
   - Contexto (por que a regra existe agora)
   - Decisão (4 subsções: regra confirmada, tolerância 0,10m, severidade blocker, implementação)
   - Alternativas (3 alternativas descartadas com justificativas)
   - Consequências (positivas, negativas, neutras)
   - Arquivos afetados (tabela com 5 arquivos já modificados em TASK-019)
   - Classificação (tipo de decisão)
   - Referências (TASK-018/019, ADRs relacionadas, premissas provisórias)
   - Log de revisões (entry único: 2026-05-20)
3. Criar TASK-020 em `tasks/` com contexto, objetivo, critérios, fora do escopo
4. Criar relatório em `docs/relatorios/2026-05-20-TASK-020.md`
5. Atualizar `tasks/backlog.md` com entrada de TASK-020

---

## Formato de resposta esperado

Ao concluir esta tarefa:

1. **O que foi feito** — lista de 4 arquivos criados/modificados
2. **Arquivos criados** — ADR-011, TASK-020, relatório, backlog atualizado
3. **Invariantes verificadas** — todos os 9 pontos registrados no ADR
4. **Nenhum código alterado** — confirmação de que `src/` intocado
5. **Próximos passos** — revisão RT de campo

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Haiku 4.5 | TASK-020 criada |
