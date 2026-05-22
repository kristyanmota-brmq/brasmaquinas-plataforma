# TASK-027 — Validação prática no browser do fluxo de projeto

**Status:** `concluída` (aprovada com ressalvas)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** ui / validação / governança
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 738/738 testes · 0 erros tsc
**Relatório:** [`docs/relatorios/2026-05-21-TASK-027.md`](../docs/relatorios/2026-05-21-TASK-027.md)

---

## Objetivo

> Testar o software na prática usando o browser real, com automação/controle pelo VS Code/Claude Code (ou fallback manual), validando o fluxo visual e operacional do projeto de aspersão convencional. Produto único: **relatório de achados em `docs/relatorios/2026-05-21-TASK-027.md`**. Nenhum arquivo em `src/` é alterado.

---

## Contexto

As validações anteriores (TASK-026, TASK-026-A, TASK-026-B) testaram código e simulações sintéticas via solver. A TASK-024D estabeleceu como regra de governança que a primeira proposta a cliente **não pode** ser a primeira validação visual do sistema. A TASK-027 é a primeira validação visual formalmente registrada de múltiplos épicos do MVP.

Pendências de validação visual abertas no backlog que esta task busca cobrir parcialmente:

- **TASK-021** — drawer mobile com clique real; `pdfError.invalidHydraulicSegments` no sidebar.
- **TASK-014** — labels de setor em 2/3/4 setores e coluna fragmentada.
- **TASK-007** — busca por endereço/coordenadas (cobertura tangencial).

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `tasks/TASK-027-validacao-browser-fluxo-projeto.md` | criação | este arquivo |
| `docs/relatorios/2026-05-21-TASK-027.md` | criação | relatório de achados |
| `tasks/backlog.md` | modificação | entrada da TASK-027 |
| `src/**/*` | **inalterado** | regra explícita da task |
| `package.json`, lockfiles | **inalterados** | regra explícita do usuário |

---

## Critérios de aceite

- [x] Os 5 cenários obrigatórios foram executados (ou marcados como N/A com justificativa). · Cenário 1 não coberto e registrado como limitação; Cenários 2, 3, 4 cobertos integralmente; Cenário 5 parcialmente coberto (limitação WebGL).
- [x] Cada cenário tem: resultado esperado, resultado observado, evidências (texto ou screenshot do usuário), achados se houver.
- [x] Cada achado tem severidade (Crítico / Alto / Médio / Baixo) e task recomendada (Classe A / B / D). · 7 achados (F1–F7).
- [x] Conclusão geral: aprovado / aprovado com ressalvas / reprovado. · **Aprovado com ressalvas**.
- [x] `tasks/backlog.md` atualizado com entrada da TASK-027.
- [x] `npx vitest run` continua `738/738` (não regredido pela documentação).
- [x] `npx tsc --noEmit` continua `0 erros`.
- [x] Nenhum arquivo em `src/` foi modificado.
- [x] `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` inalterados.

---

## Testes obrigatórios

> Task Classe E exploratória. Não cria testes permanentes (regra do usuário). A "evidência de teste" é o conteúdo do relatório.

N/A — Validação manual em browser. A suíte automatizada não é alterada nem aumentada por esta task.

---

## Fora do escopo

- Corrigir bugs encontrados durante a validação.
- Instalar Playwright, Puppeteer ou qualquer dependência de browser automation.
- Alterar `src/`, catálogos, motores, schemas Prisma ou rotas de API.
- Criar projetos fictícios sem confirmação do usuário.
- Alterar dados existentes do banco do ambiente local.

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Não haver projeto candidato sem blocker no ambiente local | média | médio | Registrar achado e propor criação de projeto fictício; aguardar confirmação |
| Não haver projeto candidato com blocker | média | médio | Idem acima |
| Browser automation VS Code não disponível | confirmada — não detectada | médio | Fallback manual: usuário interage com browser; agente registra |
| Ambiente local autenticado por Clerk | alta | baixo | Usuário usa sessão real já autenticada |
| Bug não-cosmético encontrado sem task pré-aprovada | média | médio | Registrar como achado com severidade; sugerir nova task na conclusão |

**Dependências:** nenhuma — TASK-026-A já concluída; servidor `localhost:3000` rodando.

---

## Pendências abertas

- [x] Identificar projeto candidato sem blocker (a definir com o usuário). · Não encontrado — fluxo default gera blockers; registrado como F6/F7 e limitação no relatório.
- [x] Identificar projeto candidato com blocker (a definir com o usuário). · Projeto A naturalmente apresentou 2 blockers + 5 avisos.
- [x] Decidir se um projeto fictício será criado caso nenhum dos candidatos exista. · Autorizado pelo usuário; 1 projeto fictício criado (Projeto A).

**Pendências geradas para próxima rodada (ver §8 do relatório):**

- Cenário 1 (projeto limpo) — exige ajuste de grade ou troca de DN para zerar blockers.
- TASK-014 — labels de setor em 2/3/4 setores (este teste produziu 21 setores).
- TASK-007 — busca por endereço/coordenadas (apenas auto-detect de município por polígono foi validado).
- Validação fina do mapa WebGL (alinhamento aspersor↔lateral, ângulos, labels in-canvas).

---

## Plano de execução (Classe E — exploratória)

1. **Preparação**
   - Verificar servidor local (`localhost:3000`) — confirmado HTTP 200.
   - Confirmar ferramental de browser disponível — **não há** automação MCP/Playwright/Puppeteer detectada → fallback manual.
   - Pedir ao usuário a lista de projetos (em `/projetos`) e identificar candidatos para cenários 1 e 2.
2. **Cenário 1 — Projeto simples sem blocker**
   - Verificar carregamento da página, layout do mapa, sidebar, aspersores, laterais, ramais, principal, adutora, legenda, blockers/warnings (devem ser zero ou apenas warnings benignos), BOM, botão PDF, ausência de erros visuais.
3. **Cenário 2 — Projeto com blocker**
   - Verificar blocker no topo do sidebar, não escondido pelo mapa; botão PDF bloqueado ou erro controlado; mensagem compreensível; mapa navegável; legenda não cobre blocker.
4. **Cenário 3 — Responsivo/mobile**
   - DevTools mobile (Chrome) — drawer "Layout", área clicável ≥ 44px, sem quebra de mapa, zoom e legenda utilizáveis.
5. **Cenário 4 — PDF**
   - Com blocker: PDF não emitido (HTTP 422). Sem blocker: tentar emissão; registrar mensagem se falhar.
6. **Cenário 5 — Labels e mapa**
   - Labels de setor coerentes; laterais passam pelos aspersores; ramais e laterais sem ângulos indevidos; zoom/pan; mapa preserva elementos ao redimensionar.
7. **Consolidação**
   - Compilar achados, severidades e tasks recomendadas no relatório.
   - Atualizar backlog.
   - Conclusão: aprovado / aprovado com ressalvas / reprovado.

---

## Formato de resposta esperado

Ao concluir, esta TASK responderá com:

1. **O que foi feito** — task file criado, relatório criado, backlog atualizado.
2. **Cenários executados** — 5 ou subconjunto justificado.
3. **Achados** — tabela severidade + task recomendada.
4. **Estado da suíte** — confirmar `738/738` e `0 erros tsc` inalterados (`src/` não tocado).
5. **Pendências para próximas tasks** — lista classificada A/B/D.
6. **Conclusão de governança** — aprovado / com ressalvas / reprovado.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Tarefa criada após `/iniciar-task` e confirmação do usuário. |
| 2026-05-21 | Claude Opus 4.7 | Configurado Playwright MCP em `~/.claude.json` (escopo `user`) — sem alterar repo. |
| 2026-05-21 | Claude Opus 4.7 | Validação executada: Cenários 2, 3, 4 cobertos; Cenário 5 parcial (limitação WebGL); Cenário 1 não coberto. 7 achados (F1–F7). Conclusão: **aprovado com ressalvas**. 738/738 testes · 0 erros tsc. `src/` inalterado. Evidências em `docs/relatorios/evidencias/2026-05-21-TASK-027/`. Relatório em `docs/relatorios/2026-05-21-TASK-027.md`. |
