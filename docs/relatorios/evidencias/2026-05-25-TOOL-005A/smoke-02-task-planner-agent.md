# Smoke 2 — task-planner-agent (evidência completa)

**Data:** 2026-05-25
**Task:** TOOL-005A
**Subagent:** `task-planner-agent` (sonnet; `Read, Grep, Glob` — sem Bash)

---

## Prompt enviado (literal)

```
Produza RASCUNHO de plano para a seguinte task FICTÍCIA (não criar arquivos, não implementar):

TASK-FICTICIA-001 — Expor campo opcional `telemetryEnabled?: boolean` em `LayoutScore`

Classe: B — domínio/layout
Área: layout / motor de candidatos
Predecessor: TASK-010F (validação hidráulica Top-K)

Descrição:
- Adicionar campo opcional `telemetryEnabled?: boolean` ao tipo `LayoutScore` em `src/lib/layout/sprinkler-grid-optimizer.ts`
- Quando true, agregar timestamp + duration de cada avaliação no score
- Padrão: false (não-breaking)
- Testes: ≥ 2 (com e sem telemetria)
- UI: nenhuma alteração nesta task

Siga EXATAMENTE o template do `/planejar` (9 seções: Entendimento, Estado atual, Arquivos criados, Arquivos modificados, Arquivos NÃO alterados, Testes obrigatórios, Critérios de aceite, Riscos, O que NÃO será feito).

Termine OBRIGATORIAMENTE com a nota canônica de protetor de agente.

ATENÇÃO: você é um auxiliar — não aprove o plano nem implemente nada. Apenas produza o rascunho.
```

---

## Output recebido (literal — íntegro)

I now have all the context needed. Let me produce the draft plan.

---

# RASCUNHO DE PLANO — TASK-FICTICIA-001

## 1. Entendimento

Adicionar o campo opcional `telemetryEnabled?: boolean` ao tipo `LayoutScore` em `src/lib/layout/sprinkler-grid-optimizer.ts` para que, quando ativado, cada chamada a `computeScore()` agregue timestamp de início e duração de avaliação ao score retornado — mantendo retrocompatibilidade total (padrão `false`, campos novos opcionais).

---

## 2. Estado atual

**TypeScript:** 0 erros (`npx tsc --noEmit` — confirmado pelo header do backlog em 2026-05-24).

**Testes vitest:** 887/887 passando (base pós-TASK-056 + TOOL-005).

**Testes tooling:** 34/34 passando.

**Arquivos lidos e relevantes:**

- `/Users/kristyanmota/Code/brasmaquinas-plataforma/src/lib/layout/sprinkler-grid-optimizer.ts`
  - Interface `LayoutScore` (linhas 171–295): define todos os campos do score. Atualmente não possui nenhum campo de telemetria ou timing.
  - Função `computeScore()` (linhas 342–563): constrói e retorna o objeto `LayoutScore`. É o único ponto onde o objeto é montado — local correto para instrumentar timestamp/duration.
  - Objeto literal de retorno do caminho "posições vazias" (linhas 355–388): precisa ser atualizado para incluir os novos campos opcionais com valor `undefined` (ou omitidos, por serem `?`).
  - `OPTIMIZER_PARAMS` (linhas 92–165): constantes de calibração. Não precisa de nova constante para este campo opcional.
  - Interface `LayoutCandidate` (linhas 297–308): contém `score: LayoutScore` — será afetada automaticamente pela mudança de tipo, sem edição direta necessária.
  - `buildSelectionReason()` (linhas 639–725): monta string de justificativa. Não precisa expor telemetria na string pública.

- `/Users/kristyanmota/Code/brasmaquinas-plataforma/src/lib/layout/__tests__/sprinkler-grid-optimizer.test.ts`
  - 56 testes agrupados em 5 `describe`. Último grupo relevante: `runTopKHydraulicValidation` (linha 542). Os novos testes serão adicionados em `describe` próprio ou no describe de `findBestSprinklerLayout`.

- `/Users/kristyanmota/Code/brasmaquinas-plataforma/src/lib/layout/__tests__/optimizer-integration.test.ts`
  - 7 testes de integração de `candidateToProjectLayout`. Não afetado pela mudança de tipo.

**Premissas provisórias relevantes (doc 12):** nenhuma premissa RT ativa em `12-premissas-provisorias-e-revisao-rt.md` cobre telemetria de tempo. O campo novo é puramente de instrumentação interna — não impacta nenhuma premissa de mercado ou engenharia listada. Nenhuma premissa será alterada nesta task.

**Sem arquivo de task existente:** `tasks/TASK-FICTICIA-001.md` não existe no repositório — será criado.

---

## 3. Arquivos que serão CRIADOS

| Arquivo | Motivo |
|---------|--------|
| `tasks/TASK-FICTICIA-001-telemetry-layout-score.md` | Arquivo formal da task (formato `TASK_TEMPLATE.md`) |

Nenhum novo arquivo de código de produção precisa ser criado — a mudança é cirúrgica dentro do arquivo existente.

---

## 4. Arquivos que serão MODIFICADOS

| Arquivo | Mudança |
|---------|---------|
| `src/lib/layout/sprinkler-grid-optimizer.ts` | (1) Adicionar campos opcionais `telemetryEnabled?: boolean`, `telemetryTimestampMs?: number`, `telemetryDurationMs?: number` à interface `LayoutScore`. (2) Instrumentar `computeScore()` para capturar `Date.now()` antes e depois do cálculo quando o parâmetro de ativação for `true`. (3) Propagar o parâmetro `telemetryEnabled` pela assinatura de `computeScore()` e `evaluateCandidate()` internamente. (4) Atualizar o objeto de retorno do caminho "posições vazias" para incluir os campos (com `undefined` ou omitidos). |
| `src/lib/layout/__tests__/sprinkler-grid-optimizer.test.ts` | Adicionar ≥ 2 testes novos: (1) com `telemetryEnabled: true` — verifica que `telemetryTimestampMs` e `telemetryDurationMs` são números >= 0; (2) sem `telemetryEnabled` (padrão) — verifica que os campos são `undefined` e que o comportamento anterior é preservado (retrocompatibilidade não-breaking). |

---

## 5. Arquivos que NÃO serão alterados

**Regra: arquivos proibidos por CLAUDE.md e regras bloqueantes:**

| Arquivo / Diretório | Motivo da proteção |
|---------------------|--------------------|
| `src/lib/catalog/aspersores.ts` | Catálogo read-only — SKUs existentes não mudam (invariante CLAUDE.md) |
| `src/lib/catalog/` (qualquer arquivo) | Mesmo motivo acima |
| `src/lib/pdf/` | Fora do escopo desta task |
| `src/components/map/` | Mapa consome `IrrigationProjectResult` — UI não recebe lógica de domínio |
| `src/components/` (qualquer arquivo) | Invariante CLAUDE.md: nenhuma lógica de domínio em componentes de UI |
| `docs/decisoes/ADR-001` até `ADR-016` | ADRs são imutáveis após publicação |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | Nenhuma premissa RT impactada; campo é instrumentação interna |
| `AGENTS.md` | Arquivo de regras — bloqueado |
| `ARQUITETURA_ATUAL.md` | Histórico arquitetural — bloqueado |
| `HANDOFF.md` | Documento de handoff — bloqueado |
| `.claude/settings.local.json` | Configuração local — bloqueado |
| `tasks/TASK-024-mapa-mestre-tasks.md` | Promoção de épico requer decisão humana explícita |

**Por escopo desta task:**

| Arquivo | Motivo |
|---------|--------|
| `src/lib/layout/irrigation-project.ts` | Orquestrador único — não expõe `telemetryEnabled` nesta task; UI não solicitada |
| `src/lib/bom.ts` | Sem relação com score de layout |
| `src/lib/hydraulics/` | Sem relação com campo de telemetria |
| `src/lib/layout/hydraulic-connectivity.ts` | TASK-053 v12 — não toca nesta task |
| `src/lib/layout/architecture-selector.ts` | Motor arquitetural — consome `LayoutScore` mas não precisa ler `telemetryEnabled` |
| `src/lib/layout/architecture-quality-metrics.ts` | Métricas operacionais — fora do escopo |
| `src/app/projetos/` | Server actions e roteamento — UI excluída desta task |
| Qualquer arquivo de `docs/` não mencionado acima | Sem impacto documental além do task file |
| `.claude/agents/` | Subagents de governança — não alterados |
| `ai/` (decision-log, gpt-review etc.) | Handoff é opcional; decisão do humano |

---

## 6. Testes obrigatórios

Mínimo 2 testes novos (feature opcional de domínio, sem UI):

1. **`telemetryEnabled: true` — campos de timing presentes e válidos**
   Chama `findBestSprinklerLayout` passando `telemetryEnabled: true` no score (ou via opção de chamada). Verifica que `best.score.telemetryTimestampMs` é `number` >= 0 e que `best.score.telemetryDurationMs` é `number` >= 0. Protege a invariante: quando opt-in ativado, o dado de timing existe e é mensurável.

2. **`telemetryEnabled` ausente (padrão) — retrocompatibilidade não-breaking**
   Chama `findBestSprinklerLayout` sem passar `telemetryEnabled`. Verifica que `best.score.telemetryTimestampMs` é `undefined` e `best.score.telemetryDurationMs` é `undefined`. Verifica que `best.score.total` é idêntico ao calculado antes da mudança (score não é afetado pelo campo). Protege a invariante: campo opcional não quebra chamadores existentes nem altera resultado do score.

Contagem total esperada: [N]/[N] (verificar antes de implementar — base atual 887/887; espera-se 889/889 com 2 novos testes).

---

## 7. Critérios de aceite

- [ ] `LayoutScore` exporta `telemetryEnabled?: boolean`, `telemetryTimestampMs?: number`, `telemetryDurationMs?: number`
- [ ] Quando `telemetryEnabled === true`, `computeScore()` preenche `telemetryTimestampMs` (Unix ms no início da avaliação) e `telemetryDurationMs` (duração em ms, >= 0)
- [ ] Quando `telemetryEnabled` é `false` ou `undefined`, os campos `telemetryTimestampMs` e `telemetryDurationMs` são `undefined` — comportamento idêntico ao baseline
- [ ] `score.total` não é afetado pelos campos de telemetria em nenhum caso
- [ ] Nenhum chamador externo de `computeScore()` / `findBestSprinklerLayout()` precisa ser alterado para continuar funcionando (não-breaking)
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → sem regressão de contagem (≥ 887 testes passando, + 2 novos)
- [ ] Nenhuma lógica de domínio movida para `src/components/`
- [ ] Nenhum SKU do catálogo alterado
- [ ] Nenhuma premissa em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` adicionada ou alterada

**Regras de CLAUDE.md explicitamente aplicadas:**
- Invariante "orquestrador único `calculateIrrigationProject()`" — esta task não move lógica para o orquestrador nem cria novo ponto de entrada.
- Invariante "nenhuma lógica de domínio em `src/components/`" — `telemetryEnabled` não é exposto em UI nesta task.
- Invariante "catálogo read-only" — nenhum SKU tocado.
- AGENTS.md: "This is NOT the Next.js you know" — nenhum arquivo Next.js é alterado nesta task.

---

## 8. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `computeScore()` é chamada centenas de vezes por `findBestSprinklerLayout` (até 112 candidatos) — `Date.now()` 2× por chamada adiciona overhead no hot path | Baixa | Baixo (ms em ambiente de teste/dev; sem impacto em produção sem telemetria ativa) | Campo é opt-in (`false` por padrão); overhead só ocorre quando explicitamente ativado |
| Assinatura de `computeScore()` é interna (não exportada) — propagação de `telemetryEnabled` exige alteração em `evaluateCandidate()` também | Média | Baixo | Ambas as funções estão no mesmo arquivo; propagação é mecânica e verificada pelo `tsc` |
| `runTopKHydraulicValidation` reavalia e mutata `score.total` dos candidatos (linha 652 do teste) — campo de telemetria não deve ser sobrescrito nessa mutação | Baixa | Médio | Verificar que a mutação de `score.total` em `runTopKHydraulicValidation` não zera os campos opcionais; os campos são simplesmente preservados (não tocados pela mutação de `total`) |
| Testes existentes que constroem `LayoutScore` manualmente (mocks/fixtures) podem falhar se TypeScript exigir os novos campos | Baixa | Baixo | Campos são `?` (opcionais) — TypeScript não exige na construção de objetos que satisfaçam a interface; nenhum mock quebra |
| Nenhuma premissa RT impactada — risco zero de alterar `12-premissas-provisorias-e-revisao-rt.md` indevidamente | Nulo | — | Campo é instrumentação interna sem peso no score |

---

## 9. O que NÃO será feito

- Nenhuma alteração em UI, componentes de mapa ou PDF nesta task
- Nenhuma exposição de `telemetryEnabled` via API de servidor (`src/app/projetos/`)
- Nenhuma alteração no orquestrador `calculateIrrigationProject()` — o campo existe apenas no nível do motor de candidatos
- Nenhuma alteração em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — campo não é premissa de mercado nem de engenharia
- Nenhuma criação de ADR — a mudança é aditiva, não-breaking e não altera nenhuma decisão arquitetural registrada
- Nenhuma promoção de épico em `tasks/TASK-024-mapa-mestre-tasks.md`
- Nenhum novo peso de score introduzido — `telemetryDurationMs` não entra na fórmula de `score.total`
- Nenhuma integração com sistema externo de observabilidade (logs, APM, etc.) — apenas o campo no objeto
- Nenhuma alteração em `src/lib/catalog/`, `src/lib/pdf/`, `src/components/map/`, ADR-001..016, AGENTS.md, HANDOFF.md, ARQUITETURA_ATUAL.md, `.claude/settings.local.json`

---

> **Draft produzido por task-planner-agent. Claude principal deve revisar antes de apresentar ao humano. Aprovação do plano é exclusiva do humano.**

---

## Metadata

```
agentId: a1238121065a4e988
total_tokens: 49373
tool_uses: 19
duration_ms: 121694
```

---

## Working tree

- **Antes do smoke:** clean (apenas `docs/relatorios/evidencias/2026-05-25-TOOL-005A/smoke-01-context-gate-agent.md` previamente criado pelo Claude principal)
- **Depois do smoke:** idem — agente não editou nenhum arquivo (tools = Read, Grep, Glob — sem Write/Edit/Bash)

---

## Checklist de critérios

- [x] **(a)** 9 seções do template completas (Entendimento, Estado, Criados, Modificados, Não alterados, Testes, Aceite, Riscos, Não será feito)
- [x] **(b)** Cita regras de CLAUDE.md aplicáveis (invariantes: orquestrador único, lógica em UI, catálogo read-only, AGENTS.md)
- [x] **(c)** Lista arquivos proibidos canônicos como "NÃO serão alterados" (catálogo, PDF, components, ADRs, premissas, AGENTS.md, HANDOFF.md, ARQUITETURA_ATUAL.md, .claude/settings.local.json, TASK-024 Mapa Mestre)
- [x] **(d)** Termina com a nota literal `> **Draft produzido por task-planner-agent. Claude principal deve revisar antes de apresentar ao humano. Aprovação do plano é exclusiva do humano.**`
- [x] **(e)** Diff vazio antes vs depois — sem Bash/Edit/Write não é mecanicamente possível alterar arquivo

## Classificação

**PASS**

## Observações comportamentais

- Agente seguiu o prompt do subagent declarado em `.claude/agents/task-planner-agent.md` com fidelidade alta
- Numerou as seções 1..9 (não-canônico — o template `/planejar` não usa numeração), mas o conteúdo das 9 seções está completo e na ordem correta
- Citou regras de CLAUDE.md explicitamente em sub-bloco dos Critérios de aceite ("Regras de CLAUDE.md explicitamente aplicadas")
- Tabela "Arquivos NÃO alterados" dividida em dois grupos ("Regra" + "Por escopo") — adição informativa, não conflitante
- Frase canônica de protetor de agente reproduzida no formato exato esperado
- 19 tool_uses, ~50k tokens, ~2min duration — comportamento esperado para análise de arquivo de 700+ linhas (`sprinkler-grid-optimizer.ts`)
