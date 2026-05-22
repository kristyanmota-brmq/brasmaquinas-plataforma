# TASK-048 — Validação browser TASK-021 / TASK-014

**Status:** `concluída` (com 4 cenários de 6 NÃO EXECUTADOS por limitação ambiental — ver achados)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** ui / validação / governança
**Arquivo:** `tasks/TASK-048-validacao-browser-task-021-014.md`
**Concluída em:** 2026-05-22 · 826/826 testes preservados · 0 erros tsc preservado · `src/` não alterado · banco do Projeto A não alterado

> Sessão Playwright MCP no Projeto A (`cmpfu7e4b0001ulshh0ni8jhd`, Barreiras/BA) cobrindo 6 cenários de validação visual: 2 da TASK-021 (drawer mobile, `pdfError`) e 4 da TASK-014 (labels 2/3/4 setores + coluna fragmentada). **Resultado: 2 PASS, 4 NÃO EXECUTADOS por limitação ambiental.** Cenário 1 (drawer mobile) e Cenário 6 (coluna fragmentada — 17 laterais divididas no Projeto A) validados visualmente. Cenários 2-5 não executados porque (a) Projeto A está em 0 blockers pós-TASK-046 — alterá-lo para induzir blocker estava explicitamente proibido; (b) criar projeto fictício via UI exige desenhar polígono em Mapbox WebGL, que não aceita cliques precisos via Playwright; (c) apenas 1 projeto existe no banco. **E06 NÃO promovido** — permanece "Testado em código" no Mapa Mestre. Achado menor H1: toggle do drawer não tem `aria-expanded`. Achados maiores H2, H3, H4: ambiente de validação requer projetos fixtures pré-criados para fechar Cenários 2-5 — aberta sugestão de task D/E de seed.

---

## 1. Contexto

Pendências documentadas das TASK-021 e TASK-014 (E06 Mapa/UI) precisavam de validação visual no browser real antes de promover o épico a "Validado visualmente". TASK-048 organiza isso como Classe E — exploratória, sem alteração em `src/`, com Playwright MCP. Pendências exatas:

- **TASK-021** (backlog linha 662):
  - 21-P1: validar drawer mobile com clique real (DevTools mobile ou device físico)
  - 21-P2: validar `pdfError.invalidHydraulicSegments` no sidebar via clique PDF com blocker ativo
- **TASK-014** (backlog linha 508):
  - 14-P1..P3: labels corretos com 2/3/4 setores
  - 14-P4: labels corretos com coluna fragmentada (split por capacidade — TASK-040)

---

## 2. Cobertura — resultado por cenário

| # | Cenário | Resultado | Evidência |
|---|---|---|---|
| 1 | TASK-021 — drawer mobile (375×812) | **PASS** | `task-048-01a/b/c` |
| 2 | TASK-021 — `pdfError.invalidHydraulicSegments` após HTTP 422 | **NÃO EXECUTADO** | Limitação L1 (sem projeto com blocker) |
| 3 | TASK-014 — labels com 2 setores | **NÃO EXECUTADO** | Limitação L2 (sem projeto fixture) |
| 4 | TASK-014 — labels com 3 setores | **NÃO EXECUTADO** | Limitação L2 |
| 5 | TASK-014 — labels com 4 setores | **NÃO EXECUTADO** | Limitação L2 |
| 6 | TASK-014 — labels com coluna fragmentada (17 splits) | **PASS** | `task-048-06-*`; `task-048-00-desktop-baseline` |

---

## 3. Limitações ambientais

### L1 — Projeto A não tem blocker ativo

Projeto A pós-TASK-046 tem **0 blockers** (caminho feliz validado). Para validar `pdfError.invalidHydraulicSegments` é necessário um projeto com blocker. As regras do briefing **proibiam** alterar bomba/jornada/parâmetros persistentes do Projeto A.

**Workaround tentado:** criar projeto fictício via `/projetos/novo`.
**Bloqueio técnico:** o fluxo de criação exige (após a tela inicial de Nome/Cliente) desenhar polígono e marcar captação **dentro do canvas Mapbox WebGL** — que não aceita cliques precisos via Playwright (`browser_click` em canvas dispara coordenadas viewport, não geo-coords).

**Consequência:** Cenário 2 não executado.

### L2 — Sem projeto fixture com setorização variável (2/3/4 setores)

Apenas 1 projeto existe no banco (Projeto A, 21 setores fixos). Variar setorização exigiria:
- (a) alterar `jornadaHoras` no Projeto A — **proibido pelo briefing**, ou
- (b) criar projetos fictícios — bloqueado por L1 (canvas Mapbox).

**Consequência:** Cenários 3, 4, 5 não executados.

### L3 — Labels de setor são desenhadas dentro do canvas WebGL

Verificado via `browser_evaluate`: nenhum HTML marker para labels (`querySelectorAll('.mapboxgl-marker, [class*="sector-label"]')` → apenas 1 marker, não os 21 setores). Labels vivem no canvas Mapbox — só inspecionáveis via screenshot, não via DOM. Para esta task, isso não bloqueia o Cenário 6 (que se baseia em screenshot visual), mas reforça que validação programática granular dos labels é inviável.

---

## 4. Achados (H1..H4)

### H1 — Toggle do drawer mobile sem `aria-expanded`

**Severidade:** menor (acessibilidade)
**Descrição:** o botão `aria-label="Abrir painel de layout do projeto"` (`ref=e404`) não emite `aria-expanded` para sinalizar estado aberto/fechado. Leitores de tela não distinguem os dois estados pelo atributo padrão.
**Evidência:** `browser_evaluate` retornou `toggleAriaExpanded: null` em ambos os estados.
**Funcionalidade:** funciona — drawer abre, conteúdo rolável, overlay fecha. Apenas a comunicação semântica está incompleta.
**Recomendação:** task D futura (≤ 5 linhas em `ProjectMap.tsx`) — adicionar `aria-expanded={drawerOpen}`. Fora do escopo da TASK-048.

### H2 — Ambiente de validação requer fixtures persistidas

**Severidade:** processo
**Descrição:** validar Cenários 2-5 (e qualquer validação UX futura) exige projetos com configurações específicas (com blocker, com setorização variável, com coluna fragmentada em vários cenários). Hoje só existe o Projeto A.
**Recomendação:** abrir task E ou D de **seed de fixtures**:
- 1 projeto com bomba HMT insuficiente → blocker `pump_insufficient_head` → testa `pdfError`.
- 3 projetos com jornadas distintas → setorização 2/3/4.
- Seeds em `prisma/seed.ts` ou similar; documentar em `docs/software/`.

### H3 — Canvas Mapbox bloqueia automação de desenho

**Severidade:** infraestrutura
**Descrição:** o fluxo "novo projeto" depende de cliques precisos no canvas Mapbox para desenhar polígono e captação. Playwright não consegue automatizar isso. Toda criação de projeto via teste E2E está bloqueada.
**Recomendação:** considerar criação programática via Prisma (script de seed) OU endpoint admin para criação direta a partir de GeoJSON + parâmetros. Fora do escopo desta task.

### H4 — Projeto A confirmado em 17 laterais físicas divididas (Cenário 6)

**Severidade:** confirmação (não é bug)
**Descrição:** texto da sidebar confirma "17 laterais físicas divididas" no Projeto A pós-TASK-040/046. Match regex em DOM → `splitLaterals: "17"`, `controlPoints: "17"`, `setores: "21"`, `aspersores: 344`. Screenshot do mapa (`task-048-06-*`) mostra os labels distribuídos sobre as colunas fragmentadas no ângulo 59° aplicado pela TASK-046.
**Validação positiva:** labels visualmente presentes sobre as sub-colunas; nenhum label órfão concentrado em ponto único; resolução visual coerente com `resolveSectorLabelAnchor()` da TASK-014.

---

## 5. Sequência Playwright executada

| Passo | Ação | Resultado |
|---|---|---|
| 0.1 | `browser_resize` 1280×800 + `browser_navigate` → Projeto A | OK (Mapbox carregou, sidebar visível com 21 setores, 0 blockers, BOM R$ 213.740,15) |
| 0.2 | `browser_take_screenshot` → `task-048-06-labels-coluna-fragmentada-desktop.png` | Baseline com mapa + sidebar |
| 0.3 | `browser_navigate` → `/projetos` | Confirmado: apenas 1 projeto (Projeto A) |
| 1.1 | `browser_resize` 375×812 + reload Projeto A | Layout mobile carregado; drawer escondido por default |
| 1.2 | `browser_take_screenshot` → `task-048-01a-mobile-drawer-fechado.png` | Mapa fullscreen + toggle visível |
| 1.3 | `browser_click` no toggle (`ref=e404`) | Drawer abre |
| 1.4 | `browser_evaluate` checa `aside.className` | `translate-y-0` confirmado; overlay `bg-black/30` presente |
| 1.5 | `browser_take_screenshot` → `task-048-01b-mobile-drawer-aberto.png` | Drawer com 60dvh + overlay |
| 1.6 | `browser_evaluate` dispatch click no overlay | Drawer fecha (`translate-y-full`); overlay removido |
| 1.7 | `browser_take_screenshot` → `task-048-01c-mobile-drawer-fechado-novamente.png` | Igual ao estado 1.2 |
| 2.1 | `browser_navigate` → `/projetos/novo` | Tela inicial de criação (nome/cliente) — etapas seguintes exigem canvas Mapbox → bloqueado |
| 6.1 | Volta ao Projeto A em 1280×800 | Setores=21, splitLaterals=17 confirmados via DOM regex |
| 6.2 | `browser_take_screenshot` → `task-048-06-coluna-fragmentada-21-setores.png` | Mapa + sidebar com aviso "17 laterais físicas divididas" |
| 6.3 | `browser_take_screenshot` → `task-048-00-desktop-baseline-projeto-a.png` | Estado completo do Projeto A pós-TASK-046 |

---

## 6. Impacto sobre E06 (Mapa Mestre Seção 2)

**Status antes da TASK-048:** `Testado em código` (TASK-024E).

**Decisão pós-TASK-048:** **manter `Testado em código`**. NÃO promover.

**Justificativa:**
- Apenas 2 dos 6 cenários executados.
- Cenários NÃO EXECUTADOS por limitação ambiental real (não por dispensa).
- Briefing explícito: "Não promover E06 se houver cenário FAIL ou NÃO EXECUTADO relevante."
- Cenários 2-5 são relevantes (cobrem o gate de PDF + label semantics para diferentes setorizações).

A nuance de "validação parcial executada" pode ser registrada no campo `Riscos` ou `Status real` do bloco de valor E07 se desejado, mas a regra conservadora é não promover.

---

## 7. Tasks de follow-up sugeridas

| Ordem | Sugestão | Classe | Motivo |
|---|---|---|---|
| 1 | Seed de fixtures de projeto (script Prisma) | E ou D | Resolve L1, L2, L3 — desbloqueia Cenários 2-5 e qualquer validação E2E futura |
| 2 | Adicionar `aria-expanded` ao toggle do drawer mobile | D | Resolve H1 — escopo cirúrgico ≤ 5 linhas em `ProjectMap.tsx` |
| 3 | Re-executar TASK-048 (Cenários 2-5) após fixtures | E | Habilita promoção de E06 quando fixtures existirem |

---

## 8. Critérios de aceite verificados

- [x] Sessão Playwright executada com servidor local ativo (`localhost:3000`)
- [x] 6 PNGs capturados em `docs/relatorios/evidencias/2026-05-22-TASK-048/`
- [x] Cada cenário com PASS/NÃO EXECUTADO registrado com link para evidência ou limitação
- [x] Achados H1..H4 documentados com diagnóstico e recomendação
- [x] Limitações L1..L3 registradas explicitamente
- [x] Tasks de follow-up sugeridas (sem implementação nesta task)
- [x] Arquivo `tasks/TASK-048-validacao-browser-task-021-014.md` criado
- [x] Relatório `docs/relatorios/2026-05-22-TASK-048.md` criado
- [x] `tasks/backlog.md` atualizado (entrada TASK-048 + ajuste de "próximas tarefas")
- [x] `tasks/TASK-024-mapa-mestre-tasks.md` **NÃO** atualizado para promover E06 (regra do briefing)
- [x] Nenhum arquivo em `src/` alterado
- [x] Nenhuma alteração permanente no Projeto A no banco
- [x] `npx tsc --noEmit` → 0 erros (preservado)
- [x] `npx vitest run` → 826/826 (preservado)

---

## 9. Rastreabilidade

- Plano aprovado: nesta sessão (Plan + Approve com ajustes; organização (A) combinada).
- Pendências origem: TASK-021 (backlog linha 662), TASK-014 (backlog linha 508).
- Relatório: `docs/relatorios/2026-05-22-TASK-048.md`.
- Evidências: `docs/relatorios/evidencias/2026-05-22-TASK-048/` (6 PNGs).
- ADRs preservadas (não alteradas): ADR-001 a ADR-015.
- Premissas preservadas (não alteradas).
- Projeto A: `cmpfu7e4b0001ulshh0ni8jhd` — nenhuma alteração permanente; verificado antes (21 setores, 17 splits, 344 aspersores, BOM R$ 213.740,15) e após (mesmos valores). Nenhuma escrita no banco.
