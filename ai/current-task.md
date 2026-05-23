---
task_id: TASK-052
arquivo_task: tasks/TASK-052-homologar-rotativa-por-setor.md
classe: C
data_abertura: 2026-05-22
status: aguardando_fechamento
ultima_atualizacao: 2026-05-22T22:13:04-03:00
atualizado_por: humano:fechamento-implementacao-TASK-052
---

# TASK-052 — Homologar premissa de operação rotativa por setor

## Objetivo

Corrigir a descrição **contraditória** da premissa "Critério de vazão de projeto do ramal" em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` e promover seu status de `PENDENTE_REVISAO_RT_BRASMAQUINAS` para `APROVADO_RT`, refletindo a decisão explícita do RT (registrada por Kristyan Mota em 2026-05-22 nesta sessão) de que a operação Brasmáquinas é **rotativa por setor (1 setor ativo por vez)**.

A inconsistência atual da premissa: a descrição literal afirma "todos os aspersores da coluna ativos simultaneamente" (que seria `sum(...)`) mas o código em [`src/lib/layout/secondary-sizing.ts:180-183`](../src/lib/layout/secondary-sizing.ts#L180-L183) usa `max(lat.vazaoM3h)` — comportamento exato de operação rotativa. **O código já estava tecnicamente correto desde sua origem; apenas a documentação descreveu mal.** TASK-052 corrige essa lacuna documental.

## Natureza

**Classe C — documental.** Não modifica nenhum arquivo em `src/**`. Produto exclusivamente em `docs/metodologia/`, `tasks/`, `docs/relatorios/` e `ai/` (governança). Per Mapa Mestre §9.3, Classe C dispensa `/planejar` formal — plano vive inline neste arquivo.

## Escopo permitido

- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — corrigir descrição da premissa "Critério de vazão de projeto do ramal"; promover status; atualizar histórico de revisões
- `tasks/TASK-052-homologar-rotativa-por-setor.md` (criar)
- `tasks/backlog.md` (atualizar header + entrada nova TASK-052)
- `docs/relatorios/2026-05-22-TASK-052.md` (criar relatório)
- `ai/current-task.md` (este arquivo — ciclo de governança)
- `ai/claude-report.md` (via `/handoff-claude-report`)
- `ai/gpt-review.md` (via `scripts/ai/run-gpt-review.mjs` invocado por `/gpt-review`)
- `ai/decision-log.md` (apenas pelo humano, append-only)

## Escopo proibido

- **`src/**`** — todo o produto (motor hidráulico, layout, catálogo, BOM, PDF, UI/mapa). Nenhuma linha de código é alterada por TASK-052.
- `docs/metodologia/01-regras-bloqueantes.md` — não criar `RB-09` nem alterar regras
- `docs/decisoes/ADR-*.md` — não criar ADR; ADR-008 não recebe emenda
- `tasks/TASK-024-mapa-mestre-tasks.md` — Mapa Mestre não alterado (TASK-024E é fonte)
- Outras premissas em `docs/metodologia/12-premissas-...md` que NÃO sejam "Critério de vazão de projeto do ramal" — preservar valor e status
- Automação de decisão humana ou edição de `ai/decision-log.md`
- Commit, push, deps novas

## Mudanças propostas — inline

### 1. `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`

#### 1.1 Premissa "Critério de vazão de projeto do ramal" (linha ~227-241 atual)

**Antes (inconsistência interna):**

> | **Valor usado** | `max(lateral.vazaoM3h)` em **todos os setores** da coluna física — cobertura por design (**todos os aspersores da coluna ativos simultaneamente**).
> | **Origem** | **Decisão de engenharia** — adotada como conservadora enquanto a operação real Brasmáquinas (rotativa por setor vs. múltiplos setores simultâneos) não é validada pelo RT.
> | **Status** | `PENDENTE_REVISAO_RT_BRASMAQUINAS`

**Depois (consistente com código real + status promovido):**

> | **Valor usado** | `max(lateral.vazaoM3h)` em **todos os setores** da coluna física — implementação em [`src/lib/layout/secondary-sizing.ts:180-183`](../../src/lib/layout/secondary-sizing.ts#L180-L183). Para uma coluna com N setores de mesma vazão Q, retorna Q (não N×Q). Equivale ao critério `max(setor_simultâneo)` da operação rotativa.
> | **Regra** | Vazão de projeto de cada ramal define o DN selecionado por `selectSecondaryPipe`. Como a operação Brasmáquinas é **rotativa por setor (1 setor ativo por vez)**, o ramal só atende UM setor a qualquer instante; dimensiona-se pelo pior setor isolado. **Não há cenário operacional onde todos os setores da coluna estão simultaneamente ativos.**
> | **Origem** | **Decisão operacional Brasmáquinas confirmada pelo RT em 2026-05-22** (Kristyan Mota): operação é rotativa por setor. O código em `secondary-sizing.ts` já implementava o critério correto desde sua origem; TASK-052 apenas corrigiu a descrição contraditória da premissa.
> | **Status** | **`APROVADO_RT` (regra confirmada)** — operação rotativa por setor homologada; critério `max(lat.vazaoM3h)` é o tecnicamente correto.

**Remover** as linhas anteriores "Alternativa pós-RT", "Risco — manter conservador (atual)", "Risco — relaxar para `max(setor_simultâneo)` sem RT" — todas tratavam de incerteza sobre operação que agora foi resolvida.

#### 1.2 Histórico de revisões (final do arquivo)

Adicionar entrada:

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-22 | Claude Opus 4.7 (TASK-052) | Premissa "Critério de vazão de projeto do ramal" homologada. RT (Kristyan Mota) confirmou operação rotativa por setor em 2026-05-22. Descrição da premissa corrigida (era contraditória — afirmava "todos os aspersores ativos simultaneamente" mas o código fazia `max(...)`); status promovido `PENDENTE_REVISAO_RT_BRASMAQUINAS → APROVADO_RT`. Código em `src/lib/layout/secondary-sizing.ts:180-183` confirmado tecnicamente correto sem alteração. |

### 2. `tasks/TASK-052-homologar-rotativa-por-setor.md`

Criar arquivo seguindo `TASK_TEMPLATE.md`: status, classe, objetivo, escopo, critérios de aceite (todos `[x]` após implementação), log de alterações.

### 3. `tasks/backlog.md`

- Header: atualizar para refletir TASK-052 concluída
- Entrada nova TASK-052 com status `aguardando_fechamento`, classe C, relatório

### 4. `docs/relatorios/2026-05-22-TASK-052.md`

Relatório de fechamento ~150-200 linhas: resumo, mudanças aplicadas (diff documental), evidência de leitura do código (linha 180-183 de `secondary-sizing.ts`), invariantes 7/7, sem testes novos (Classe C documental).

## Verificações de não-regressão

Sem código novo. Verificações:

- `npx tsc --noEmit` → **0 erros** (preservado — não tocamos `src/`)
- `npx vitest run` → **836/836** (preservado — não tocamos testes)
- `node scripts/ai/__tests__/run-all.mjs` → **27/27** (preservado)

## Critérios de aceite

- [ ] Descrição da premissa "Critério de vazão de projeto do ramal" corrigida em `12-premissas-...md` — sem contradição interna
- [ ] Status da premissa promovido para `APROVADO_RT`
- [ ] Histórico de revisões atualizado com entrada de 2026-05-22 citando responsável (Kristyan Mota), causa (confirmação RT da operação rotativa) e referência ao código (secondary-sizing.ts:180-183)
- [ ] Arquivo `tasks/TASK-052-...md` criado
- [ ] `tasks/backlog.md` atualizado
- [ ] `docs/relatorios/2026-05-22-TASK-052.md` criado
- [ ] **Nenhum arquivo em `src/**` modificado**
- [ ] **Nenhuma outra premissa alterada**
- [ ] **Sem ADR novo; sem emenda à ADR-008**
- [ ] **Sem RB-09**
- [ ] **Mapa Mestre não alterado**
- [ ] `tsc 0`, `vitest 836/836`, `run-all 27/27` preservados
- [ ] Fluxo TOOL-003 executado (`/handoff-claude-report` + `/gpt-review` + decision-log) antes da implementação

## Fluxo TOOL-003 obrigatório

```
/iniciar-task TASK-052          (implícito — abertura via edição manual autorizada de current-task.md)
   ↓
/planejar TASK-052               (inline — este arquivo; Classe C dispensa /planejar formal per Mapa Mestre §9.3)
   ↓
/handoff-claude-report TASK-052  (em execução — serializa este plano em ai/claude-report.md)
   ↓
/gpt-review TASK-052             (próximo)
   ↓
[Humano lê ai/gpt-review.md + edita ai/decision-log.md + transita status]
   ↓
/implementar TASK-052            (após decisão humana registrada)
   ↓
/fechar-task TASK-052
```

## Predecessor operacional

TASK-004B (concluída 2026-05-22, commit `b1bc2e0` em `origin/main`). Esta task surge de uma observação técnica feita durante a análise pós-TASK-004B dos ramais ("ramais estão horríveis" — Kristyan Mota): ao auditar o critério de vazão em `secondary-sizing.ts`, descobriu-se que a premissa documental descreve `sum(...)` mas o código faz `max(...)`. O RT confirmou que operação rotativa é a realidade Brasmáquinas, validando o código atual.

## Sucessor sugerido

**TASK-053 (Classe A) — Topologia de ramais (espinha de peixe ou estender principal)** — endereça os Problemas 1, 2, 3, 5, 6 listados na análise pós-TASK-004B. Independente desta task; aguarda decisão humana sobre direção (Opções A-F).
