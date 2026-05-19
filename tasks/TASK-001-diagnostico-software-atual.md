# TASK-001 — Diagnóstico do Software Atual

**Status:** `pendente`
**Prioridade:** P1-crítico
**Área:** governança
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-19

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

- [ ] Relatório criado em `docs/relatorios/` com data e versão do software analisada
- [ ] Diagnóstico cobre os quatro pilares com estrutura definida acima
- [ ] Cada gap identificado tem: descrição, impacto (bloqueante/importante/melhoria), referência ao requisito (arquivo:§seção), sugestão de próximo passo
- [ ] Checklist de homologação de `testes-e-homologacao.md` §2 e §3 preenchido contra o estado atual
- [ ] Lista de prioridades sugeridas para o backlog (com proposta de ordem e justificativa)
- [ ] `npx tsc --noEmit` → 0 erros (não alteramos código)
- [ ] `npx vitest run` → 400/400 passando (não alteramos código)

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

## Plano de implementação

> A ser preenchido pelo agente ao executar `/planejar TASK-001`.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-19 | Claude Sonnet 4.6 | Tarefa criada |
