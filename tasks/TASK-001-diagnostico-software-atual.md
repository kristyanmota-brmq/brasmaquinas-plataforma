# TASK-001 — Diagnóstico do Software Atual

**Status:** `aguardando_fechamento` (terminal estável; aguarda commit/push)
**Prioridade:** P1-crítico
**Classe:** A — diagnóstico estrutural / arquitetura / governança
**Área:** governança
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-22
**Concluída em:** 2026-05-22 · 826/826 testes vitest · 0 erros tsc · 27/27 testes tooling · produto intocado
**Relatório:** [`docs/relatorios/2026-05-22-TASK-001.md`](../docs/relatorios/2026-05-22-TASK-001.md)
**Veredito GPT (`/gpt-review TASK-001`):** `aprovado` · 0 blockers · 0/7 invariantes violadas
**Decisão humana:** `aprovado` (sem override) · `ai/decision-log.md` 2026-05-22T20:17:39-03:00 · hash gpt-review `3dc28c98...cef789`

---

## Objetivo

Realizar uma varredura diagnóstica do estado atual do software contra os quatro pilares da plataforma de venda técnica assistida: metodologia, engenharia de software, validação de campo e disciplina operacional.

Produto: relatório de diagnóstico em `docs/relatorios/YYYY-MM-DD-diagnostico-software-atual.md`.

**Esta tarefa não implementa código.** É exclusivamente leitura, análise e documentação.

---

## Contexto

A fundação operacional (TASK-000) descreve onde o software deve chegar. Esta tarefa identifica o gap entre o estado atual e o estado desejado, por pilar, com grau de impacto e sugestão de próximo passo.

O diagnóstico alimenta:
- Priorização do backlog técnico (TASK-004, TASK-005, TASK-006)
- Definição do escopo real da TASK-002 (Motor de Governança)
- Identificação de gaps de validação de campo (quando iniciar, com quais projetos)
- Identificação de gaps de disciplina operacional (processos que não dependem de código)

---

## Arquivos a ler (não alterar nenhum)

| Arquivo | Por que ler |
|---------|------------|
| `src/lib/layout/irrigation-project.ts` | Estado do orquestrador e do fluxo de dados |
| `src/lib/bom.ts` | Estado da BOM e dos diagnósticos |
| `src/lib/layout/hydraulic-sizing.ts` | Estado do solver hidráulico |
| `src/lib/layout/secondary-sizing.ts` | Estado do dimensionamento individual de ramais |
| `src/lib/layout/pipeline-diagnostics.ts` | Estado dos diagnósticos e blockers |
| `src/lib/layout/constructability.ts` | Estado da construtibilidade e pontos de controle |
| `src/lib/catalog/aspersores.ts` | Estado do catálogo de produtos |
| `src/app/projetos/[id]/actions.ts` | Server actions — persistência de dados |
| `src/app/api/` | Rota de PDF |
| `docs/metodologia/09-classificacao-de-projetos.md` | Requisitos de governança (Classe A/B/C) |
| `docs/metodologia/10-validacao-de-campo.md` | Requisitos de validação de campo |
| `docs/metodologia/11-disciplina-operacional.md` | Requisitos operacionais por papel |
| `docs/software/arquitetura-motor-tecnico.md` | Visão dos quatro motores |
| `docs/software/testes-e-homologacao.md` | Critérios de homologação para uso comercial |

---

## Arquivos impactados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `docs/relatorios/YYYY-MM-DD-diagnostico-software-atual.md` | criação |

Nenhum arquivo em `src/` será alterado. Nenhum arquivo de metodologia será alterado.

---

## Estrutura do relatório de diagnóstico

O relatório deve cobrir os quatro pilares:

### Pilar 1 — Metodologia
- O que está implementado e documentado
- O que está documentado mas não implementado (gaps de código)
- O que está pendente de validação por RT/agrônomo/campo
- Recomendação de prioridade

### Pilar 2 — Engenharia de software
- Estado dos critérios de `testes-e-homologacao.md` §2 (software profissional)
- Quais critérios estão satisfeitos, quais estão pendentes
- Cobertura de testes por módulo
- Recomendação de prioridade

### Pilar 3 — Validação de campo
- O que seria necessário para iniciar o protocolo de validação (quais projetos, quem)
- Gaps que impedem iniciar validação agora
- Recomendação de primeiro passo concreto

### Pilar 4 — Disciplina operacional
- Quais papéis estão definidos mas sem processo real (vendedor, projetista, RT)
- O que o software já suporta vs. o que falta para cada papel funcionar
- Recomendação de processo mínimo para uso interno disciplinado

---

## Critérios de aceite

- [x] Relatório criado em `docs/relatorios/2026-05-22-TASK-001.md` com data e versão do software analisada (commit `6debfd4`)
- [x] Diagnóstico cobre **12 seções obrigatórias** (estrutura aprovada no `/planejar` excedeu os 4 pilares originais; cobre arquitetura funcional, 9 épicos, motores existentes, status por bloco de valor, evidências, riscos, premissas, blockers para E08, roadmap em 5 categorias)
- [x] Cada gap identificado tem: descrição, impacto, referência (`arquivo:§seção` ou `ADR-XXX`), sugestão de próximo passo
- [x] Checklist de homologação de `testes-e-homologacao.md` §2 e §3 preenchido contra estado atual (Apêndice A do relatório)
- [x] Lista de prioridades sugeridas separada em 5 categorias: próxima task; Classe A; Classe E validação; pendências RT/campo; tooling futuro (Seção 12 do relatório)
- [x] `npx tsc --noEmit` → **0 erros** (preservado — não alteramos `src/**`)
- [x] `npx vitest run` → **826/826 passando** (preservado — atualizado de 400 do task file original para 826 real em 2026-05-22)
- [x] `node scripts/ai/__tests__/run-all.mjs` → **27/27 passando** (preservado)
- [x] Fluxo TOOL-003 (`/handoff-claude-report` + `/gpt-review`) executado **antes** da implementação (não depois)
- [x] Decisão humana registrada em `ai/decision-log.md` (append-only) com hash sha256 correto
- [x] Mapa Mestre `tasks/TASK-024-mapa-mestre-tasks.md` **não alterado** (TASK-024E é fonte)
- [x] Premissas `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` **inventariadas mas não alteradas**
- [x] Nenhum arquivo em `src/**` modificado
- [x] Nenhum ADR novo criado

---

## Testes obrigatórios

Não se aplica — esta tarefa não modifica código.

---

## Fora do escopo

- Não implementar nenhuma correção identificada
- Não alterar código em `src/`
- Não alterar documentação metodológica
- Não criar ADRs (apenas diagnosticar, não decidir)
- Não propor mudanças arquiteturais sem embasar no diagnóstico

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Diagnóstico superficial por leitura parcial dos arquivos | média | alto | Ler integralmente cada arquivo listado antes de concluir |
| Afirmação sobre o código baseada em suposição, não em leitura | média | alto | Toda afirmação deve referenciar arquivo:linha ou §seção |
| Diagnóstico conflitando com backlog atual sem proposta de resolução | baixa | médio | Propor ajuste ao backlog como item do relatório, não alterar diretamente |

**Dependências:** nenhuma. Esta tarefa pode ser iniciada imediatamente após TASK-000.

---

## Plano de implementação (executado em 2026-05-22)

**Plano aprovado com ajustes** pelo usuário em 2026-05-22 via `/planejar TASK-001`. Resumo do que foi executado:

1. **Auditoria de contexto** via `/iniciar-task TASK-001` confirmou estado: 826/826 testes; 0 tsc; nenhum conflito de task ativa; arquivos referenciados existem.
2. **Plano detalhado** gerado com 12 seções obrigatórias do relatório, reconciliação explícita vs predecessor 2026-05-19, e roadmap separado em 5 categorias.
3. **Sincronização** de `ai/current-task.md` para TASK-001 (de TOOL-003 `aguardando_fechamento` previamente publicada em `origin/main` no commit `6debfd4`).
4. **Handoff Claude → GPT Reviewer** via `/handoff-claude-report TASK-001`: plano serializado em `ai/claude-report.md` (9 seções canônicas) com preview + confirmação humana.
5. **Revisão GPT** via `/gpt-review TASK-001`: chamada real à Responses API (modelo `gpt-5.5`; HTTP 200; 37,9s). Veredito `aprovado`, 0 blockers, 0/7 invariantes violadas. `validate-structure --task TASK-001` retornou **OK** (com 1 WARN não-bloqueante estrutural).
6. **Decisão humana** registrada em `ai/decision-log.md` (append-only) — entry com `decisao_humana: aprovado`, `override: false`, hash sha256 `3dc28c985f228b5b62e5bdea8418ac7e392957b208985608198bb3b911cef789`.
7. **Implementação** estritamente documental:
   - `docs/relatorios/2026-05-22-TASK-001.md` criado (~900 linhas, 12 seções + 3 apêndices).
   - `tasks/TASK-001-diagnostico-software-atual.md` atualizado (status, critérios marcados, plano executado, log).
   - `tasks/backlog.md` atualizado (entrada TASK-001 concluída + ajuste bloqueio TASK-002).
   - `ai/current-task.md` transicionado para `aguardando_fechamento`.
8. **Verificação final**: `tsc 0`, `vitest 826/826`, `run-all.mjs 27/27`, `git status` confirmou apenas arquivos do escopo permitido.

Nenhum arquivo em `src/**` foi tocado. Nenhuma premissa RT/campo alterada. Nenhum ADR novo criado. Mapa Mestre preservado intacto. Diagnóstico predecessor `2026-05-19-diagnostico-software-atual.md` preservado fisicamente como registro histórico.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-19 | Claude Sonnet 4.6 | Tarefa criada |
| 2026-05-22 | Claude Opus 4.7 | TASK-001 executada: diagnóstico em `docs/relatorios/2026-05-22-TASK-001.md` (~900 linhas, 12 seções + 3 apêndices); reconcilia diagnóstico anterior (2026-05-19) desatualizado em 7 dias; consome literalmente Mapa Mestre TASK-024E; inventaria 14 premissas + 6 pesos + 22+ limites de Classe A/B/C pendentes RT; lista 13 riscos técnicos priorizados; explicita 5 condições para destravar E08; roadmap separado em 5 categorias (próxima task / Classe A / Classe E validação / pendências RT/campo / tooling futuro). Estado base: 826/826 testes, 0 tsc, 27/27 tooling, 15 ADRs, 9 épicos. Fluxo TOOL-003 executado integralmente antes da implementação (handoff + gpt-review + decision-log). Mapa Mestre não alterado. Premissas não alteradas. Produto (`src/**`) intocado. |
