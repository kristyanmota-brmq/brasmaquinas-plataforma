# TASK-000 — Fundação Operacional do Repositório

**Status:** `concluída`
**Prioridade:** P0-fundação
**Área:** governança
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-19

---

## Objetivo

Criar a estrutura operacional completa do repositório para suportar desenvolvimento disciplinado com Claude Code e formalizar a visão de **venda técnica assistida** de aspersão convencional.

---

## Contexto

Antes desta tarefa, o repositório tinha apenas código (`src/`) e configuração. Não havia metodologia documentada, fluxo de trabalho definido, backlog formal, templates padronizados ou comandos de IA configurados.

O software foi posicionado em torno de quatro pilares:
1. **Metodologia** — como o software calcula e valida
2. **Engenharia de software** — como o código é escrito, testado e evoluído
3. **Validação de campo** — como os resultados são homologados antes do uso comercial
4. **Disciplina operacional** — quem pode fazer o quê, com que aprovação

---

## O que foi criado

### Fase 1 — Fundação base

| Arquivo | Propósito |
|---------|----------|
| `CLAUDE.md` | Instruções do projeto para o agente de desenvolvimento; `@AGENTS.md` na primeira linha |
| `docs/metodologia/00-visao-geral.md` | Princípios, fluxo de trabalho, papéis |
| `docs/metodologia/01-regras-bloqueantes.md` | RB-01 a RB-08 — regras que nunca podem ser violadas |
| `docs/metodologia/02-calculo-agronomico.md` | Lâmina, jornada, espaçamento, aspersor `[RASCUNHO — RT/agrônomo]` |
| `docs/metodologia/03-hidraulica.md` | Hazen-Williams, HMT, caminho crítico `[RASCUNHO — RT]` |
| `docs/metodologia/04-layout-earth-first.md` | Grade, principal, adutora, ramais `[RASCUNHO — RT]` |
| `docs/metodologia/05-lista-materiais.md` | Catálogo, BOM, agrupamento por SKU |
| `docs/metodologia/06-orcamento-proposta.md` | Preços, margens, exportação, gate de emissão |
| `docs/metodologia/07-checklists-aprovacoes.md` | Checklists pré-implementação, durante e pré-emissão |
| `docs/metodologia/08-logs-e-auditoria.md` | ADRs, handoffs, números de sanidade |
| `docs/software/arquitetura.md` | Arquitetura-alvo: orquestrador único, camadas, regras de import |
| `docs/software/padroes-codigo.md` | Convenções de código |
| `docs/software/testes.md` | Framework, fixtures, invariantes, nomenclatura de arquivos |
| `docs/decisoes/ADR-000-template.md` | Template para decisões arquiteturais |
| `docs/relatorios/.gitkeep` | Diretório para relatórios permanentes |
| `tasks/TASK_TEMPLATE.md` | Template padrão de task |
| `tasks/backlog.md` | Backlog com HIST-001/002/003 + TASK-000/001/002/004/005/006 |
| `templates/prompt-implementar.md` | Template de prompt para implementação |
| `templates/prompt-revisao.md` | Template de prompt para revisão |
| `templates/resumo-implementacao.md` | Template de resumo de sessão |
| `templates/checklist-pr.md` | Checklist de PR |
| `.claude/commands/planejar.md` | Comando `/planejar` — gera plano e aguarda aprovação |
| `.claude/commands/implementar.md` | Comando `/implementar` — executa tarefa aprovada |
| `.claude/commands/revisar.md` | Comando `/revisar` — checklist técnico e metodológico |
| `.claude/commands/resumir.md` | Comando `/resumir` — gera resumo de sessão |

### Fase 2 — Extensão de venda técnica assistida

| Arquivo | Propósito |
|---------|----------|
| `docs/metodologia/09-classificacao-de-projetos.md` | Classificação A/B/C, gatilhos, quem aprova o quê, tipos de documento |
| `docs/metodologia/10-validacao-de-campo.md` | Protocolo de 5 etapas antes de liberar uso comercial |
| `docs/metodologia/11-disciplina-operacional.md` | Responsabilidades por papel, exceções, overrides com log |
| `docs/software/arquitetura-motor-tecnico.md` | Os quatro motores: técnico, governança, comercial, operacional |
| `docs/software/testes-e-homologacao.md` | Critérios de software profissional + homologação para uso comercial |
| `templates/checklist-validacao-piloto.md` | Checklist para projeto piloto de validação de campo |
| `templates/resumo-validacao-campo.md` | Template de resumo de validação de campo |
| `tasks/TASK-000-fundacao-operacional.md` | Este arquivo |
| `tasks/TASK-001-diagnostico-software-atual.md` | Tarefa de diagnóstico contra os quatro pilares |
| `tasks/TASK-002-classificacao-abc-projetos.md` | Tarefa futura: `ProjectClassificationEngine` (Motor de Governança) |

---

## Arquivos modificados

| Arquivo | O que mudou |
|---------|------------|
| `tasks/backlog.md` | Renumeração TASK-001/002/003 → HIST-001/002/003 com nota explicativa; adição de TASK-000/001/002 formais |

---

## Arquivos NÃO alterados

- `src/` — nenhuma linha de código alterada
- `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md` — intocáveis
- Solver, BOM, PDF, mapa, testes de domínio — intocáveis
- `docs/metodologia/00-08` — não alterados (09-11 são extensão, não substituição)

---

## Critérios de aceite

- [x] Estrutura de documentação criada conforme especificação dos quatro pilares
- [x] Classificação A/B/C documentada com marcações `[PENDENTE DE VALIDAÇÃO]` em todos os limites numéricos
- [x] "Classe A não significa ausência de risco técnico" explicitado em `09-classificacao-de-projetos.md`
- [x] Protocolo de validação de campo definido em 5 etapas
- [x] "Vendedor não pode remover blocker crítico" explicitado em `11-disciplina-operacional.md`
- [x] Quatro motores descritos; A/B/C atribuída ao Motor de Governança (não ao Motor Comercial)
- [x] Motor Comercial descrito como consumidor da classificação do Motor de Governança
- [x] Critérios de homologação para uso comercial definidos em `testes-e-homologacao.md`
- [x] Templates de validação de campo criados
- [x] Backlog atualizado com nota explicativa sobre HIST vs TASK
- [x] `npx tsc --noEmit` → 0 erros (sem alteração de código)
- [x] `npx vitest run` → 400/400 passando (sem alteração de código)

---

## Pendências abertas

- [ ] Homologação dos critérios de Classe A/B/C pelo RT — execução da Etapa 4 de `10-validacao-de-campo.md`
- [ ] Execução do protocolo completo de validação de campo (Etapas 1–5)
- [ ] Aprovação de `docs/metodologia/02-calculo-agronomico.md` pelo agrônomo `[RASCUNHO]`
- [ ] Aprovação de `docs/metodologia/03-hidraulica.md` pelo RT `[RASCUNHO]`
- [ ] Aprovação de `docs/metodologia/04-layout-earth-first.md` pelo RT `[RASCUNHO]`
- [ ] Atualizar `docs/metodologia/00-visao-geral.md` para referenciar os documentos 09, 10 e 11

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-19 | Claude Sonnet 4.6 | Fase 1: fundação base criada |
| 2026-05-19 | Claude Sonnet 4.6 | Fase 2: extensão de venda técnica assistida |
