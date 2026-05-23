# Metodologia de Desenvolvimento — Visão Geral

**Versão:** 1.0
**Data:** 2026-05-19

---

## Propósito

Este documento descreve como o software de irrigação da Brasmáquinas é desenvolvido, revisado e evoluído. O objetivo é garantir rastreabilidade técnica, qualidade do cálculo e alinhamento com a metodologia agronômica da empresa.

---

## Princípios fundamentais

### 1. Planejar antes de implementar

Nenhuma implementação começa sem plano aprovado. O plano inclui: escopo, arquivos afetados, critérios de aceite, testes obrigatórios, riscos e o que está fora do escopo.

### 2. Testes não regridem

A contagem de testes só cresce. Nenhuma tarefa é concluída com `npx vitest run` falhando ou com count menor que o anterior.

### 3. TypeScript zero erros

`npx tsc --noEmit` deve retornar 0 erros antes de qualquer commit ou encerramento de sessão.

### 4. Domínio fora da UI

Toda lógica de cálculo vive em `src/lib/`. Componentes em `src/components/` consomem `IrrigationProjectResult` — nunca chamam funções de domínio diretamente.

### 5. Orquestrador único

`calculateIrrigationProject(layout)` em `src/lib/layout/irrigation-project.ts` é o único ponto de entrada para cálculo de projetos. Nenhuma outra função pode calcular o projeto de forma paralela ou alternativa.

### 6. Catálogo imutável (em produção)

SKUs existentes em `src/lib/catalog/aspersores.ts` não mudam. Novas peças são adicionadas; peças existentes podem ter preços ou campos técnicos atualizados com evidência do fabricante.

---

## Fluxo de trabalho padrão

```
1. Identificar tarefa no backlog (tasks/backlog.md)
2. Criar arquivo de tarefa usando tasks/TASK_TEMPLATE.md
3. /planejar — gerar plano detalhado e aguardar aprovação
4. Aprovação explícita do responsável técnico
5. /implementar — executar a implementação conforme o plano aprovado
6. Verificar: tsc 0 erros + vitest 100% passando
7. /revisar — checklist técnico e metodológico
8. /resumir — gerar resumo de sessão
9. Atualizar backlog.md com novo status
10. Commit com mensagem descritiva
```

---

## Estrutura de documentação

| Diretório | Conteúdo |
|-----------|----------|
| `docs/metodologia/` | Esta metodologia (agronômica, hidráulica, layout, BOM, etc.) |
| `docs/software/` | Arquitetura, padrões de código, testes |
| `docs/decisoes/` | ADRs — registro permanente de decisões arquiteturais |
| `docs/relatorios/` | Relatórios gerados (auditorias, before/after de cálculo) |
| `tasks/` | Backlog e tarefas individuais |
| `templates/` | Templates de prompt, checklist, resumo |

---

## Documentos da metodologia

| Arquivo | Conteúdo |
|---------|----------|
| `01-regras-bloqueantes.md` | O que nunca pode ser violado |
| `02-calculo-agronomico.md` | Aspersor, lâmina, jornada, espaçamento, setorização |
| `03-hidraulica.md` | Hazen-Williams, caminho crítico, HMT, perdas |
| `04-layout-earth-first.md` | Grade, principal, adutora, coluna física, ramais |
| `05-lista-materiais.md` | Catálogo, BOM, agrupamento por SKU |
| `06-orcamento-proposta.md` | Preços, margens, exportação, gate de emissão |
| `07-checklists-aprovacoes.md` | Checklists pré-implementação e pré-emissão |
| `08-logs-e-auditoria.md` | ADRs, handoffs, rastreabilidade |
| `09-classificacao-de-projetos.md` | Classificação A/B/C de projetos (governança) |
| `10-validacao-de-campo.md` | Critérios e protocolo de validação RT/campo |
| `11-disciplina-operacional.md` | Fluxo `/iniciar-task` → `/planejar` → `/implementar` → `/fechar-task` |
| `12-premissas-provisorias-e-revisao-rt.md` | Parâmetros e pesos com status de revisão RT |
| `13-arquitetura-de-rede-principal-subcoletores-laterais.md` | Sequência laterais → sub-coletores → principal; classificação 4-tier; candidatos arquiteturais |

---

## Papéis

| Papel | Responsabilidade |
|-------|----------------|
| Responsável Técnico (RT) | Aprova planos, valida metodologia agronômica e hidráulica |
| Agente de desenvolvimento | Implementa, testa, documenta seguindo este fluxo |
| Revisor | Executa `/revisar` antes de qualquer merge em produção |
