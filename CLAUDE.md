@AGENTS.md

# Brasmáquinas — Plataforma de Irrigação por Aspersão

Gerador de propostas técnicas para irrigação convencional. Calcula layout, setorização, hidráulica, BOM e exporta proposta em PDF.

## Estrutura do repositório

```
src/lib/layout/         — Domínio: físico, operacional, hidráulico, construtibilidade
src/lib/catalog/        — Catálogo de peças (estático — não alterar SKUs)
src/lib/hydraulics/     — Hazen-Williams, velocity, selectDiameter
src/lib/bom.ts          — buildBOM, generateProposalDiagnostics
src/components/map/     — Mapa interativo (consome IrrigationProjectResult)
src/app/projetos/       — Server actions, roteamento, PDF
docs/                   — Metodologia, decisões arquiteturais, padrões
tasks/                  — Backlog e templates de tarefa
templates/              — Templates de prompt, revisão, checklist de PR
.claude/commands/       — Comandos locais: /planejar /implementar /revisar /resumir
```

## Comandos disponíveis

| Comando          | O que faz                                                              |
|------------------|------------------------------------------------------------------------|
| `/iniciar-task`  | Auditoria de contexto obrigatória ao abrir qualquer task               |
| `/planejar`      | Gera plano detalhado + lista de riscos; aguarda aprovação              |
| `/implementar`   | Executa tarefa do backlog após aprovação do plano                      |
| `/revisar`       | Checklist técnico + metodológico sobre código ou implementação         |
| `/resumir`       | Gera resumo de sessão no formato `templates/resumo-implementacao.md`   |
| `/fechar-task`   | Fechamento documental: relatório, backlog, premissas, próxima task     |

## Fluxo obrigatório

```
/iniciar-task → /planejar → aguardar aprovação → /implementar → rodar testes → /fechar-task
```

- **Nunca pular `/iniciar-task`** — toda sessão começa com auditoria de contexto.
- **Nunca pular a aprovação do plano** — ver `docs/metodologia/01-regras-bloqueantes.md`.
- **Nunca pular `/fechar-task`** — relatório, backlog e premissas são atualizados aqui.

## Invariantes críticas (não negociáveis)

- `npx tsc --noEmit` → **0 erros** antes de qualquer commit
- `npx vitest run` → **100% passando**, sem regressão de contagem
- Orquestrador único: `calculateIrrigationProject()` em `src/lib/layout/irrigation-project.ts`
- Nenhuma lógica de domínio em componentes de UI (`src/components/`)
- Catálogo em `src/lib/catalog/aspersores.ts` é read-only — SKUs existentes não mudam

## Referências principais

- Metodologia completa: `docs/metodologia/00-visao-geral.md`
- Regras bloqueantes: `docs/metodologia/01-regras-bloqueantes.md`
- Arquitetura atual (histórico): `ARQUITETURA_ATUAL.md`
- Arquitetura-alvo: `docs/software/arquitetura.md`
- Padrões de código: `docs/software/padroes-codigo.md`
- Testes: `docs/software/testes.md`
- Decisões arquiteturais: `docs/decisoes/`

## Tarefas

- Backlog: `tasks/backlog.md`
- Template: `tasks/TASK_TEMPLATE.md`
