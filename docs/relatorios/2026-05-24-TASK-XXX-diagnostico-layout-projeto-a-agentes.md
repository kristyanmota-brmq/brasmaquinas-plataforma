# Relatório — TASK-XXX · Diagnóstico profissional do layout do Projeto A com agentes especialistas

**Data:** 2026-05-24
**Classe:** E — Diagnóstico / Validação visual (READ-ONLY)
**Status:** **concluída como rascunho diagnóstico** — formalização condicional ao veredito (ver §7)
**Tipo:** Diagnóstico consolidado de 7 subagents (1 PM + 6 especialistas) sobre o layout do Projeto A pós-TASK-056
**Predecessores:** TASK-053 v12 (`bd74234`); TASK-055 (`15ebcbb`); TASK-056 (`184198d`); TOOL-005/005A/006/006A; **TOOL-006B publicada em `origin/main` (`82d92dc`)** — commit autorizado entre o `/iniciar-task` e a verificação final desta task
**Veredito GPT:** não disparado (Classe E não exige `/handoff` + `/gpt-review` por default)
**Decisão humana:** plano aprovado pelo usuário em `/implementar`

---

## 0. Veredito executivo

> **APROVAR COM AJUSTES.**
>
> O layout do Projeto A pós-TASK-056 é **tecnicamente defensável como candidato A0 baseline** (topologia espinha-de-peixe v12 metodologicamente coerente, motor hidráulico íntegro, mapa comunica adequadamente para usuário sem treinamento técnico, sequência laterais→sub-coletores→principal corretamente expressa, distinção 4-tier preservada).
>
> **Cinco BLOCKERs genuínos** impedem APROVAR puro e impedem qualquer emissão comercial no estado atual: dois pré-existentes conhecidos (TECH-053-01 angular, BOM imprecisa pendente de TASK-054), um escalado por convergência de pareceres (HMT calculada via proxy sem bomba real associada), e **três achados NOVOS surfaçados nesta análise**: (a) anomalia geométrica no setor 1 — rib com deflexão -37,5° (E04); (b) mensagem técnica crua de TECH-053-01 exposta ao vendedor na sidebar (E06); (c) errata documental no relatório TASK-056 §7.1 (E02). **Nove WARNINGs** complementares afetam calibração, agronomia, hidráulica e UX/DX sem invalidar a topologia.
>
> O blocker `TECH-053-01` permanece **ATIVO**; emissão comercial bloqueada por default. Decisão executiva detalhada em §6.

---

## 1. Resumo executivo

TASK-XXX é diagnóstico exploratório Classe E que coordenou **8 invocações de subagents** (`software-project-manager-agent` na Fase 1 e Fase 3 + 6 especialistas em paralelo na Fase 2) para produzir um veredito profissional consolidado sobre o layout atual do Projeto A. **Escopo de escrita restrito** a este relatório markdown — zero alteração de `src/`, BOM, catálogo, PDF, mapa, UI, premissas (`12-premissas-...md`), ADRs, agentes, `tasks/backlog.md`, ou qualquer task file.

**Observação operacional:** TOOL-006B (calibração do `map-workspace-agent`) **foi commitada como `82d92dc` e publicada em `origin/main`** entre o `/iniciar-task` (que viu working tree modificado) e a verificação final desta task (working tree limpo exceto pelo relatório novo). O usuário autorizou o commit/push em sessão paralela — esta task **não tocou** nenhum dos 5 arquivos da TOOL-006B; a publicação foi externa a este fluxo.

**Invariantes preservadas por construção:**
- vitest **887/887** (43 test files; ~2.3s)
- tsc **0 erros**
- tooling **37/37** (incl. T-AGT-9 + T-AGT-10 da TOOL-006B)
- ADRs 001-016 intocadas
- catálogo `aspersores.ts` read-only intocado
- 15 charters em `.claude/agents/` integralmente intocados (incluindo `map-workspace-agent.md` calibrado pela TOOL-006B já publicada)
- `CLAUDE.md`, `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`, Mapa Mestre intocados

**Smoke live oportunístico:** `map-workspace-agent` (calibrado pela TOOL-006B — já publicada em `origin/main` `82d92dc`) **foi exercitado nesta task** e cumpriu integralmente a calibração — não citou contagens globais do repositório sem fonte, usou o fallback literal `"Não verificado nesta análise."` em 3 itens e não acrescentou seções fora do escopo E06. Este é evidência informal de que TOOL-006B mitiga o PARCIAL da TOOL-006A — registro em §8.

---

## 2. Pergunta central e critérios de decisão

### 2.1 Pergunta central consolidada (refinada pelo PM-agent na Fase 1)

> **O layout do Projeto A pós-TASK-056 — com laterais paralelas, principal na borda, sub-coletores em espinha de peixe v12 e registros distribuídos — atende ao padrão profissional esperado por produtor, RT, instalador e vendedor, ou há deficiências visuais ou metodológicas que exigem correção antes de qualquer emissão comercial?**

### 2.2 Critérios de decisão executiva

| Veredito | Critério |
|---|---|
| **APROVAR** | Layout defensável, sem pendências relevantes |
| **APROVAR COM AJUSTES** | Layout bom como candidato, exige ajustes |
| **REPROVAR** | Layout visualmente/profissionalmente inadequado |
| **PARCIAL** | Diagnóstico inconclusivo por falta de dados hidráulicos/topográficos/campo |

### 2.3 Regra de escalada (do brief Fase 1)

- Um BLOCKER de qualquer especialista invalida APROVAR — força PARCIAL ou REPROVAR
- Dois ou mais WARNINGs de especialistas diferentes sobre o mesmo componente → reclassificar como BLOCKER pelo consolidador
- Tier 1 (regra técnica do doc 13) prevalece sobre tier 2 (boa prática) e tier 3 (decisão de engenharia)
- E04 (construtibilidade) prevalece sobre otimismo visual de E05/E06 quanto a TECH-053-01
- E03 (hydraulics) sobre HMT pode invalidar veredito positivo de E02
- E01 (metodologia) vs E02 (arquitetura): E01 é camada acima

---

## 3. Sequência de execução

| Fase | Agente | Tarefa | Resultado |
|---|---|---|---|
| 1 | `software-project-manager-agent` | Produzir plano de análise (pergunta central, perguntas dos especialistas, evidências mínimas, critérios de classificação, pontos de atenção transversal, critérios de consolidação) | Plano completo entregue; tabela de donos primários/secundários; opção A recomendada (6 especialistas em paralelo) |
| 2a | `irrigation-methodology-agent` (E01) | Layout é metodologicamente coerente? | 2 BLOCKERs + 6 WARNINGs + 3 INFOs |
| 2b | `architecture-layout-agent` (E02) | Aderência ao doc 13 e laterais→sub-coletores→principal? | 0 BLOCKERs diretos + 3 WARNINGs + 2 INFOs |
| 2c | `hydraulics-agent` (E03) | Riscos hidráulicos qualitativos? | 0 BLOCKERs diretos + 4 WARNINGs + 2 INFOs |
| 2d | `constructability-agent` (E04) | Instalador conseguiria montar? | 2 BLOCKERs + 3 WARNINGs + 2 INFOs |
| 2e | `map-workspace-agent` (E05) | Mapa comunica corretamente? | 1 BLOCKER ("por design" — gate HTTP 422 reativo) + 1 WARNING parcial + 4 INFOs |
| 2f | `ux-dx-agent` (E06) | Layout é claro para vendedor / RT / instalador / cliente / dev? | 2 BLOCKERs (UX) + 8 WARNINGs (5 UX + 3 DX) + 4 INFOs |
| 3 | `software-project-manager-agent` | Consolidar 6 pareceres em formato canônico + veredito executivo | **APROVAR COM AJUSTES** com 5 BLOCKERs genuínos + 9 WARNINGs |
| 4 | Claude principal | Escrever este relatório | Em curso |

---

## 4. Pareceres dos especialistas (resumos)

### 4.1 E01 — `irrigation-methodology-agent` (transversal)

**Pergunta:** Topologia é metodologicamente coerente com aspersão convencional (agronomia, solo, lâmina, turno, balanceamento, padrão de campo brasileiro)?

**Resumo:** A topologia pós-TASK-056 é **metodologicamente coerente na estrutura geral** (sequência laterais→sub-coletores→principal respeitada; operação rotativa por setor `APROVADO_RT`; seleção A0/A2-borda por menor BOM real conforme ADR-015; doc 13 §1 honrado). **Não é apta para proposta comercial** por (a) TECH-053-01 ATIVO (12 conexões sem SKU disponível); (b) BOM imprecisa pendente de TASK-054; (c) ausência de homologação agronômica de lâmina, turno, cultura, solo, vento, intensidade de aplicação; (d) bomba real não associada; (e) 8 aspersores residuais (344 vs 21×16=336) sem explicação documentada.

**Classificação 4-tier:** 2 regra técnica · 3 boa prática · 3 decisão de engenharia · 1 decisão comercial.

**Pontos RT/agrônomo:** 7 itens consolidados em §6.

### 4.2 E02 — `architecture-layout-agent` (E02)

**Pergunta:** Aderência ao doc 13 e à sequência laterais→sub-coletores→principal; escolha A0/A2-borda defensável como decisão de engenharia (não regra técnica)?

**Resumo:** Sequência **corretamente expressa no resultado visual**. A0/A2-borda **defensável como decisão de engenharia** (`scoreFinal = bomEstimadaPreliminar + WEIGHT_FRAGMENTATION × P2 × PENALTY_PER_M + P3 × PENALTY_ROUTE_BREAK`; ADR-015 preservada; tie-breaker A0 por `EPSILON_BOM_R$ = 1,00` correto). `WEIGHT_PRINCIPAL_CROSSES = 0` e `A3_MIN_ECONOMY_BOM_PCT = 0` implementados corretamente (princípio metodológico TASK-055: não transformar boa prática "principal aproveita bordas/central" em regra técnica). Topologia v12 SEMPRE sub-coletor ativa via `operationalSegments` + `gridAngleDegrees`.

**Achado mais relevante:** **errata documental** — relatório TASK-056 §7.1 (linha 147) afirma "gate `A3_MIN_ECONOMY_BOM_PCT = 5%`" como justificativa de A3 não vencer, mas código tem `A3_MIN_ECONOMY_BOM_PCT = 0`. A3 perdeu por `scoreFinal`, não por gate. Não afeta operação do motor (código está correto) mas cria ambiguidade auditorial.

**Achado secundário:** P4 (`valveDispersionM`) retorna 0 estruturalmente no MVP porque `controlPoints` não é passado ao motor — `computeValveDispersionM` não exercitado em produção. Documentado como `WEIGHT_VALVE_DISPERSION = 0` aguardando TASK-053-valves.

### 4.3 E03 — `hydraulics-agent` (E03)

**Pergunta:** Riscos hidráulicos qualitativos não capturados pelos gates que afetariam HMT/bomba em campo?

**Resumo:** Motor hidráulico **integro** (Hazen-Williams com D interno conforme ADR-002; caminho crítico exaustivo; gates ativos de velocidade, perda de carga por ramal, classe de pressão). HMT calculada 42,4 mca (lida de `validacao-visual-projeto-a.md` §2). 4 WARNINGs qualitativos:

1. **Pressão real por derivação** em ramais/laterais ainda usa HMT como proxy conservativo (`pressureClassModel: "hmt_conservative_inlet"`). Promoção para `"exact_per_derivation"` pendente TASK-004B/E09 — pode tanto mascarar violações reais de PN quanto gerar `violation_conservative` falsos positivos em laterais PN40.
2. **Spine longo com vazão somada (Path 2):** spine + spine_entry têm `flowM3h = SUM ribs` — caso spine longo com vazão somada alta, gate `MAX_HEADLOSS_RAMAL_MCA = 3,0 mca` (premissa `PENDENTE_REVISAO_RT_BRASMAQUINAS`) pode não capturar adequadamente a perda no trecho spine.
3. **Critério `max(setor)`:** correto para Projeto A (setores uniformes 24 m³/h) e `APROVADO_RT` para operação rotativa. Latente para projetos com setores muito heterogêneos.
4. **Desnível geodético único** captação→área pode subestimar relevo interno > 5 m. Projeto A: desnível -3 m em 4,87 ha — impacto contido.

**Validação da bomba:** `not_informed` — bomba não associada ao Projeto A. Sem informar bomba, `validatePump` não pode retornar `ok`.

### 4.4 E04 — `constructability-agent` (E04)

**Pergunta:** Instalador conseguiria montar sem improvisar? TECH-053-01 é o único impedimento?

**Resumo:** Laterais **integralmente construtíveis** (ADR-012 + TASK-045B: reta de 2 pontos via mediana de X; sem escada visual). Principal sem blocker angular. Topologia v12 estruturalmente correta (kind-aware validator: legado completo; spine_entry só junção→principal; rib só junção→lateral; spine pula validação sob garantia construtiva).

**Achados BLOCKER:**
1. **TECH-053-01 ATIVO** — 12 conexões rib→lateral com deflexão fora de [0°, 90°] resultam diretamente da rotação 59° sobre grid ortogonal. Estrutural; não corrigível por ajuste pontual.
2. **NOVO: Anomalia geométrica setor 1** — rib com deflexão **-37,5°** documentada em `ai/current-task.md` linha 112. Não é o mesmo fenômeno dos 11 blockers padrão — pode indicar agrupamento incorreto de coluna, inlet fora do headland esperado ou erro de `fieldSideSign`. Classificada como BLOCKER se geometria do rib for inexecutável.

**Achados WARNING NOVOS:**
- **Adutora sem validação angular em runtime:** `network-angle-diagnostics.ts` linhas 15-19 declaram explicitamente que adutora **não** é validada angularmente ("produziria falsos positivos em redes auto-geradas"). `ALLOWED_DEFLECTIONS_ADUTORA = [0°, 45°, 90°]` declarado mas não verificado — gap de cobertura.
- Registros provisórios não realocados para spine_entry (TASK-053-valves pendente — pode gerar retrabalho de marcação).
- Setores com 1 coluna geram spine `lengthM ≈ 0` (degenerado válido topologicamente; dificuldade de marcação física em campo).

### 4.5 E05 — `map-workspace-agent` (E06)

**Pergunta:** Mapa comunica claramente setores, registros, fluxo, captação, hierarquia (lateral < sub-coletor < principal < adutora) para usuário sem treinamento técnico?

**Resumo:** Mapa **comunica adequadamente a arquitetura** para usuário sem treinamento técnico. Layers diferenciados (lateral magenta · principal azul · adutora púrpura · ramais verde-tracejado · setores 8 cores · registros laranja · captação droplet). Legenda condicional renderiza apenas camadas presentes. Orphan-laterais em vermelho via `connectivityReport.orphanPhysicalColumns`. Setores selecionáveis com `opacity: 0.25` em não-selecionados e `stroke` aumentado em selecionado.

**Invariantes CLAUDE.md:** ok — nenhuma lógica de domínio em `ProjectMap.tsx`; consome `IrrigationProjectResult` via `calculateIrrigationProject()`. ADR-001 orquestrador único respeitado. Drawer mobile com `aria-expanded`/`aria-controls` (TASK-051). 100dvh em vez de 100vh.

**Achado parcial:** áreas clicáveis em zoom baixo mobile podem ficar < 44px (`circle-radius` interpolado: zoom 12 → 1.5px) — recomendação futura.

**Cumprimento TOOL-006B:** ✓ não citou contagens globais sem fonte; usou fallback `"Não verificado nesta análise."` em 3 itens (testes sector-label-anchor, fixtures E06, 6 cenários TASK-050); usou exatamente as seções do charter. **Smoke live informal positivo** (registro em §8).

### 4.6 E06 — `ux-dx-agent` (transversal)

**Pergunta:** Layout é claro para vendedor / RT / instalador / cliente / dev? Quais fricções viram melhoria de produto?

**Resumo UX (usuário final):** Mapa **adequado para RT e instalador** (arquitetura legível; setores numerados; sub-coletores em espinha de peixe; principal na borda; sem atravessar área). **Não adequado para vendedor apresentar ao cliente com sidebar aberta** — blocker TECH-053-01 exposto com texto interno crua ("construtibilidade angular", "rib → lateral", "nenhuma conexão padrão disponível") gera pergunta imediata em reunião de venda.

**Achados BLOCKER UX NOVOS:**
1. **Mensagem técnica crua TECH-053-01 ao vendedor** — não distingue "aguardando decisão RT" de "erro que vendedor pode corrigir".
2. **Sidebar única mistura blockers de naturezas diferentes** (RT vs vendedor: TECH-053-01 angular vs HMT-bomba não informada) sem hierarquia visual nem ação específica por item.

**Achados WARNING UX:** adutora sem label "Adutora" no mapa; captação em coordenadas brutas (`-45.0044,-12.0004`); paleta `SECTOR_PALETTE` com 8 cores escuras (risco de daltonismo em zoom de overview); HMT warning no mesmo formato visual de blocker técnico.

**Achados DX:** dupla fonte `projectResult.diagnostics` + `pdfError` sem documentação inline; script `diagnose-architecture-projeto-a.mjs` sem instrução em `CLAUDE.md`/`docs/software/testes.md`; rastreabilidade premissas RT → constantes no código ausente (`12-premissas-...md` lista valores mas não aponta arquivo/linha de `architecture-selector.ts`).

**Aderência:** CLAUDE.md "nenhuma lógica de domínio em `src/components/`" ok; ADR-001 ok; ADR-003 gate HTTP 422 funcional mas mensagem não é suficientemente acionável para vendedor não-técnico — não é desvio do gate, é fricção de UX.

---

## 5. Tabela consolidada de achados por severidade

### 5.1 BLOCKERs (5 genuínos + 1 "por design")

| ID | Dimensão | Descrição | Origem | Status |
|---|---|---|---|---|
| **B-01** | Construtibilidade / Metodologia | TECH-053-01: 12 conexões rib→lateral fora de [0°, 90°] por rotação 59° | E01 + E04 (confirmam) | **PRÉ-EXISTENTE** (compromisso v12; emissão comercial bloqueada por default) |
| **B-02** | BOM / Metodologia | BOM imprecisa para topologia sempre-sub-coletor (TASK-054 pendente) | E01 + E03 (info) + E04 (contexto) | **PRÉ-EXISTENTE** (decisão de engenharia v12) |
| **B-03** | Construtibilidade | Anomalia geométrica setor 1: rib com deflexão **-37,5°** — pode indicar agrupamento incorreto, inlet fora do headland ou erro de `fieldSideSign` | **E04 NOVO** | **NOVO** — surfaçado nesta análise (ref. `ai/current-task.md` L112) |
| **B-04** | Hidráulica / Metodologia | HMT calculada via proxy conservativo sem bomba real associada ao Projeto A | E01 + E03 convergentes | **NOVO como BLOCKER** (escalado por convergência) |
| **B-05** | UX / Governança comercial | Mensagem técnica crua de TECH-053-01 exposta ao vendedor na sidebar (texto interno: "construtibilidade angular", "rib→lateral") | **E06 NOVO** | **NOVO** — surfaçado nesta análise |
| B-Reativo | UX | Bloco "Segmentos inválidos" só aparece após tentativa de PDF | E05 | **POR DESIGN** — gate HTTP 422 ADR-003 reativo, não proativo (não conta no veredito) |

### 5.2 WARNINGs (9 consolidados)

| ID | Dimensão | Descrição | Origem | Status |
|---|---|---|---|---|
| **W-01** | Arquitetura | Errata documental: relatório TASK-056 §7.1 diz "gate `A3_MIN_ECONOMY_BOM_PCT = 5%`" mas código tem `0` | **E02 NOVO** | **NOVO** |
| **W-02** | Arquitetura | P4 (`valveDispersionM`) retorna `0` estruturalmente pois `controlPoints` não passado ao motor; saída real P1-P4 do Projeto A não em artefato persistente | **E02 NOVO** | **NOVO** |
| **W-03** | Hidráulica | Spine longo com vazão somada — gate `MAX_HEADLOSS_RAMAL_MCA` pode não capturar pressão diferencial no spine | **E03 NOVO** | **NOVO** |
| **W-04** | Hidráulica | Adutora 227 m com pressão mais alta do sistema — verificar PN da adutora no catálogo | **E03 NOVO** | **NOVO** |
| **W-05** | Construtibilidade | Adutora diagonal sem validação angular em runtime (gap de cobertura `ALLOWED_DEFLECTIONS_ADUTORA` declarado mas não verificado) | **E04 NOVO** | **NOVO** |
| W-06 | Construtibilidade | Registros provisórios não realocados para spine_entry (TASK-053-valves pendente) | E04 | PRÉ-EXISTENTE (deferido explicitamente) |
| W-07 | Metodologia | Lâmina, turno de rega e cultura sem agronomia documentada — premissas provisórias sem homologação RT/agrônomo | E01 | PRÉ-EXISTENTE (em `12-premissas-...md`) |
| **W-08** | UX | Sidebar única mistura blockers de naturezas diferentes (RT vs vendedor) sem hierarquia visual | **E06 NOVO** | **NOVO** |
| **W-09** | DX | Dupla fonte `projectResult.diagnostics` + `pdfError` sem documentação inline; script `diagnose-architecture-projeto-a.mjs` sem instrução em `CLAUDE.md`/`docs/software/testes.md`; rastreabilidade premissas→constantes ausente | **E06 NOVO** | **NOVO** |

### 5.3 INFOs (consolidados — 8 ao total entre 6 pareceres)

Adutora 45° permitido (ADR-010); tolerâncias angulares provisórias para projetos < 500 m (E01); paleta SECTOR_PALETTE com cycle modulo (E05); validação visual TASK-056 executada via Playwright MCP (E02); junção adutora→principal por design (E04); badge "incompleto" no Memorial (E06); etc.

---

## 6. Pontos que exigem RT / agrônomo / engenheiro / instalador

### 6.1 RT (Responsável Técnico) — **obrigatório antes de emissão comercial**

1. **Decisão explícita sobre TECH-053-01:** override técnico OU aguardar TASK-053-valves como mitigação angular. Registrar em `ai/decision-log.md` se for override.
2. **Homologação da BOM pós-TASK-054** (topologia sempre-sub-coletor com contagem correta de tês: 1 principal→spine_entry + N spine→ribs + 1 por coluna na lateral).
3. **Calibração dos pesos P1-P4** (`WEIGHT_PRINCIPAL_CROSSES`, `WEIGHT_FRAGMENTATION`, `PENALTY_FRAGMENTATION_PER_M_R$`, `PENALTY_ROUTE_BREAK_R$`, `WEIGHT_VALVE_DISPERSION`, `A3_MIN_ECONOMY_BOM_PCT`) — todos `PENDENTE_CALIBRACAO_RT_CAMPO`.
4. **Confirmação ou correção da anomalia setor 1 (-37,5°)** — geometria executável ou bug em `fieldSideSign` / agrupamento de coluna?
5. **Associar bomba real ao Projeto A** e validar HMT calculada (42,4 mca) vs curva da bomba (escopo TASK-004B futura).

### 6.2 Agrônomo — **obrigatório antes de proposta com cultura real**

6. Lâmina de irrigação, turno de rega e cultura documentados para o talhão do Projeto A.
7. Intensidade de aplicação (~10,4 mm/h) vs taxa de infiltração do solo (Cerrado baiano).
8. Vento predominante (Barreiras/BA) vs orientação das laterais (59°).

### 6.3 Instalador — **verificar antes de obra**

9. Ângulos da adutora diagonal (gap W-05) — validação manual pois runtime não verifica `ALLOWED_DEFLECTIONS_ADUTORA`.
10. Posição dos registros provisórios vs spine_entry real (W-06 / TASK-053-valves).

### 6.4 Engenheiro — **calibração futura**

11. Comparação HMT calculada vs cálculo manual RT (E09 — validação de campo).
12. Modelo `elevationModel: "exact_per_segment"` para projetos com relevo interno > 5 m (futuro).

---

## 7. Consolidação do PM-agent — Diagnóstico → Opções → Recomendação → Riscos → Próximos passos

### 7.1 Diagnóstico

O layout do Projeto A pós-TASK-056 é tecnicamente defensável como **candidato A0 baseline**. A topologia espinha-de-peixe v12 está metodologicamente coerente, o motor hidráulico é íntegro, o mapa comunica adequadamente para usuário sem treinamento técnico, e o fluxo obrigatório de governança está preservado. Porém, **5 BLOCKERs genuínos** (2 pré-existentes + 3 NOVOS + 1 escalado por convergência) impedem APROVAR puro e impedem qualquer emissão comercial. **9 WARNINGs** complementares afetam calibração, agronomia, hidráulica e UX/DX sem invalidar a topologia.

### 7.2 Opções

| # | Opção | Esforço | Risco | Quando faz sentido |
|---|---|---|---|---|
| A | Formalizar TASK-057 com escopo cirúrgico: (i) investigar B-03 anomalia setor 1; (ii) corrigir errata W-01; (iii) registrar saída real P1-P4 (W-02); (iv) separar níveis de mensagem na sidebar (B-05) | S | médio | Manter momentum sem abrir frentes paralelas |
| B | Abrir TASK-054 imediatamente (BOM para sempre-sub-coletor) e resolver B-02 como prioridade — caminho crítico para destravar emissão comercial | M | médio | BOM imprecisa é blocker P1; emissão comercial é objetivo próximo |
| C | Aguardar calibração RT/E09 das penalidades P1-P4 e bomba real antes de qualquer task nova de layout | L | baixo | RT tem disponibilidade imediata; não queremos abrir débitos adicionais |
| D | **NÃO formalizar TASK-XXX no backlog** — manter este relatório como rascunho diagnóstico standalone; humano decide se cria uma ou mais tasks corretivas (TASK-057 / TASK-053-valves / TASK-054) com base na priorização | XS | nenhum | Combinado em `/iniciar-task` ponto 1-b: formalização condicional ao veredito |

### 7.3 Recomendação

> **Opção D + Opção A em sequência, com Opção B preparada em paralelo.**
>
> **D primeiro** (cumprir o acordo de não formalizar TASK-XXX no backlog — este relatório serve como insumo executivo, não como entrada de backlog). **A depois** (TASK-057 cirúrgica: B-03, W-01, W-02, B-05). **B em paralelo** (TASK-054 BOM para sempre-sub-coletor — caminho crítico para destravar B-02 e emissão comercial).
>
> Os três achados NOVOS de alto impacto são: **B-03** (anomalia rib -37,5° pode invalidar geometria implementada se não for variante aceitável), **B-05** (texto técnico crua TECH-053-01 ao vendedor — risco imediato em reunião de venda), **W-01** (errata documental contamina revisões GPT futuras pois há divergência relatório vs código).

### 7.4 Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Anomalia B-03 revela erro estrutural em `fieldSideSign` (não apenas setor 1) | média | alto | Investigar antes de qualquer proposta com campo rotacionado |
| BOM emitida antes de TASK-054 gera erro de orçamento | alta | alto | Gate TECH-053-01 ATIVO impede emissão; não relaxar |
| Mensagem crua B-05 vista pelo cliente antes de correção UX | média | médio | Não apresentar sidebar ao cliente até nível "PENDENTE_RT" implementado |
| Errata W-01 contamina revisão GPT futura | alta | baixo | Corrigir relatório TASK-056 §7.1 na próxima task documental |
| P4=0 estrutural (W-02) mascara qualidade real em projetos futuros | média | médio | Passar `controlPoints` ao motor antes de usar P4 como critério comercial |
| HMT proxy (B-04) subestima requisito de bomba em campo | média | alto | Associar bomba real ao Projeto A antes de validação de campo (TASK-004B) |

### 7.5 Próximos passos

1. ~~Commit/push autorizado do TOOL-006B~~ **JÁ EXECUTADO** (`82d92dc` em `origin/main`).
2. **Decisão humana**: formalizar TASK-057 (Opção A) e/ou TASK-054 (Opção B)? Manter como rascunho (Opção D)?
3. **Se TASK-057 formalizada:** escopo cirúrgico (i) investigar B-03 setor 1 em `verify-v12-projeto-a.mjs`; (ii) corrigir errata W-01 no relatório TASK-056; (iii) registrar saída real P1-P4 em artefato persistente; (iv) UI: nível de mensagem "PENDENTE_RT" na sidebar. Sugerir `ux-dx-agent` no `/planejar` desta task.
4. **Se TASK-054 formalizada:** BOM para topologia sempre-sub-coletor (1 tê principal→spine_entry + N tês spine→ribs + 1 tê por coluna na lateral).
5. **Agendar sessão RT** para os 5 itens da seção §6.1.
6. **Não invocar** `field-validation-agent` nem `commercial-engine-agent` até TECH-053-01 ter decisão RT explícita registrada em `ai/decision-log.md`.

### 7.6 Quando NÃO seguir esta recomendação

Se o RT já tiver decisão formada sobre TECH-053-01 e TASK-053-valves tiver prioridade clara no roadmap, faz mais sentido abrir **TASK-053-valves diretamente** (relocação de `section_valve` para `spine_entry`) e tratar B-03, W-01, B-05 como itens intra-task — reduzindo número de tasks abertas em paralelo. Nesse cenário, TASK-054 e TASK-053-valves podem ser sequenciadas explicitamente pelo RT sem a TASK-057 intermediária.

---

## 8. Smoke live oportunístico do `map-workspace-agent` (TOOL-006C informal)

A TOOL-006B calibrou o `map-workspace-agent` (publicada em `origin/main` `82d92dc`) com 3 ajustes contra hardcode de contagens globais. Esta task **exercitou o agente calibrado** ao chamá-lo para responder a pergunta do E05.

**Resultado:** ✓ **PASS informal**
- Não citou `vitest N/N`, `tsc 0 erros`, `tooling 37/37`, `branch main`, `git status` ou `baseline` sem fonte explícita.
- **Usou o fallback literal** `"Não verificado nesta análise."` em 3 itens: (a) Cenários 2/3/4 setores validados; (b) Coluna fragmentada validada; (c) Testes Playwright E06 (TASK-050).
- **Não acrescentou seções fora do escopo E06** — usou exatamente as seções do charter ("Resumo executivo", "Achados", "Aderência a invariantes de UI", "Labels de setor", "Diagnósticos no sidebar", "Evidências Playwright disponíveis", "Pendências conhecidas", "Arquivos consultados", "Próxima ação recomendada para o Claude principal"). Sem "Status da suite" / "Resumo do repositório" / "Estado geral do projeto".

**Conclusão:** A calibração TOOL-006B **mitiga** o PARCIAL identificado no Smoke 05 da TOOL-006A. Registro informal — **não substitui** TOOL-006C formal se quiser smoke live em sessão pós-commit/push autorizada. Esta task não altera o status pendente da TOOL-006C no backlog.

---

## 9. Próxima task sugerida

**Recomendação consolidada do PM-agent (Fase 3):** **Opção D — não formalizar TASK-XXX no backlog**. Este relatório serve como insumo executivo para o humano decidir entre Opções A, B, C ou combinação. As candidatas concretas são:

| Candidata | Classe | Esforço | Predecessor | Conteúdo |
|---|---|---|---|---|
| **TASK-057** (proposta) | A — Motor de Layout / UX | S | TASK-056 publicada | (i) investigar anomalia B-03 setor 1 (`fieldSideSign` / agrupamento de coluna); (ii) errata W-01 no relatório TASK-056 §7.1; (iii) artefato persistente saída real P1-P4 (W-02); (iv) sidebar nível "PENDENTE_RT" vs blocker técnico (B-05) |
| **TASK-054** (já planejada como sucessora) | A — BOM | M | TASK-053 v12 publicada | BOM correta para topologia sempre-sub-coletor (1 tê principal→spine_entry + N tês spine→ribs + 1 tê por coluna lateral); destrava B-02 |
| **TASK-053-valves** (decisão RT pendente) | A — Layout | M | TASK-053 v12 publicada | Realocação de `section_valve` para `spine_entry`; mitiga TECH-053-01 |
| **TOOL-006C** (opcional, pendência) | B — Tooling | XS | TOOL-006B publicada `82d92dc` ✓ | Smoke live formal pós-commit do `map-workspace-agent` (este relatório fornece smoke informal — registro em §8) |

**Decisão executiva fica com o humano.** TOOL-006B já está publicada (`82d92dc`). Fluxo recomendado: (1) ler este relatório; (2) escolher entre A, B, C ou combinação; (3) abrir task(s) específica(s) via `/iniciar-task` com ID real.

---

## 10. Anexo — evidências consultadas pelos 7 agentes

### 10.1 Evidências visuais (screenshots)

- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-overview.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-current-state-zoomed.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-field-detail.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-area-irrigada.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-tubulacao-view.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-zoom-x4.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-detail-zoom185.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-final-overview.png`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/projeto-a-task056-before-regenerate.png`
- `docs/relatorios/evidencias/2026-05-22-TASK-053/v12-zoomed.png`
- `docs/relatorios/evidencias/2026-05-22-TASK-053/v12-validate-zoom.png`
- `docs/relatorios/evidencias/2026-05-22-TASK-053/v12-detail.png`

### 10.2 Relatórios e diagnósticos textuais

- `docs/relatorios/evidencias/2026-05-23-TASK-056/validacao-visual-projeto-a.md`
- `docs/relatorios/evidencias/2026-05-23-TASK-056/diagnostico-projeto-a.txt`
- `docs/relatorios/2026-05-23-TASK-056.md`
- `docs/relatorios/2026-05-24-TOOL-006B.md`
- `ai/current-task.md` (L1-130, incl. L112 — anomalia setor 1)

### 10.3 Metodologia e premissas

- `docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md`
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- `docs/metodologia/02-calculo-agronomico.md`
- `docs/metodologia/04-layout-earth-first.md`

### 10.4 ADRs

- `docs/decisoes/ADR-001-orquestrador-unico-calculate-irrigation-project.md`
- `docs/decisoes/ADR-002-diametro-interno-calculos-hidraulicos.md`
- `docs/decisoes/ADR-003-bloqueio-pdf-com-blockers.md`
- `docs/decisoes/ADR-008-validacao-pn-classe-pressao-tubos.md`
- `docs/decisoes/ADR-010-regra-construtibilidade-angular-rede-interna-adutora.md`
- `docs/decisoes/ADR-011-aspersor-obrigatoriamente-sobre-lateral-fisica.md`
- `docs/decisoes/ADR-012-lateral-fisica-polilinha-construtivel-0-90.md`
- `docs/decisoes/ADR-013-restricao-dn-homologado-aspersor-subset-filtrado.md`
- `docs/decisoes/ADR-014-split-automatico-capacidade-hidraulica-lateral.md`
- `docs/decisoes/ADR-015-selecao-arquitetural-menor-bom-valida.md`
- `docs/decisoes/ADR-016-subagents-claude-code-camada-aditiva-governanca.md`

### 10.5 Código consultado (sem alteração)

- `src/lib/layout/architecture-selector.ts`
- `src/lib/layout/architecture-quality-metrics.ts`
- `src/lib/layout/hydraulic-connectivity.ts`
- `src/lib/layout/hydraulic-sizing.ts`
- `src/lib/layout/secondary-sizing.ts`
- `src/lib/layout/network-angle-diagnostics.ts`
- `src/lib/layout/laterais.ts`
- `src/lib/layout/principal.ts`
- `src/lib/layout/sector-label-anchor.ts`
- `src/components/map/ProjectMap.tsx`

### 10.6 Tasks e backlog (apenas leitura)

- `tasks/backlog.md` (header, linha 4 — estado da suíte)
- `tasks/TASK-053-sub-coletor-por-setor.md`
- `tasks/TASK-056-motor-qualidade-operacional.md`
- `tasks/TASK-024-mapa-mestre-tasks.md`
- `tasks/TOOL-006B-calibrar-map-workspace-agent.md`
- `.claude/agents/` (16 charters — não alterados)

---

## 11. Verificação de invariantes

| Verificação | Resultado | Observação |
|---|---|---|
| `npx tsc --noEmit` | **0 erros** | Preservado por construção (Classe E não toca `src/`) |
| `npx vitest run` | **887/887** | Preservado por construção |
| `node scripts/ai/__tests__/run-all.mjs` | **37/37** | Preservado byte-a-byte (charters intocados, exceto `map-workspace-agent.md` pendente de TOOL-006B) |
| `git diff --stat -- src/ docs/decisoes/ docs/metodologia/12-* .claude/commands/ CLAUDE.md AGENTS.md HANDOFF.md ARQUITETURA_ATUAL.md tasks/TASK-024-* scripts/ai/ .claude/agents/` | **vazio** | Nenhum caminho protegido tocado |
| `git status --short` | apenas `?? docs/relatorios/2026-05-24-TASK-XXX-diagnostico-layout-projeto-a-agentes.md` | Working tree limpo (TOOL-006B publicada `82d92dc`); memory feedback `feedback-iniciar-planejar-transition.md` fica fora do repo em `~/.claude/projects/.../memory/` |
| Pareceres dos 6 especialistas | 7 invocações conformes | PM Fase 1 + 6 especialistas Fase 2 + PM Fase 3 |
| `map-workspace-agent` cumpriu TOOL-006B | ✓ smoke live informal PASS | §8 — não citou contagens globais; usou fallback em 3 itens; sem seções fora do escopo |
| Blocker `TECH-053-01` referido como contexto pré-existente | ✓ | Não relaxado em nenhum parecer |
| Veredito executivo claro | ✓ **APROVAR COM AJUSTES** | Justificado em §7.3 |

---

## 12. Decisões e ADRs

**ADR necessária?** **Não.** Esta task é diagnóstica Classe E — não cria decisão arquitetural nova. Os achados podem motivar ADRs futuras (ex.: ADR sobre validação angular da adutora em runtime), mas isso será escopo de tasks corretivas (TASK-057 / TASK-053-valves / TASK-054).

**`/handoff` + `/gpt-review` foi executado?** **Não.** Classe E não exige por default; humano pode pedir explicitamente se quiser revisão externa do veredito.

---

## 13. Aprovação humana necessária

Este relatório encerra a Fase 4 de TASK-XXX. **As decisões a seguir requerem o humano** (não delegáveis a subagent):

1. Aprovar o veredito **APROVAR COM AJUSTES**? Ou prefere reclassificar como **PARCIAL** dado que (a) bomba real não foi associada (B-04 escalado) e (b) anomalia B-03 ainda não foi investigada?
2. Formalizar TASK-XXX no `tasks/backlog.md` + criar `tasks/TASK-057-...md` para os ajustes cirúrgicos (Opção A)? Ou manter este relatório como rascunho standalone (Opção D)?
3. Priorização entre TASK-057 / TASK-054 / TASK-053-valves?
4. ~~Decisão sobre commit/push de TOOL-006B~~ **JÁ EXECUTADO** (`82d92dc`).
5. Override técnico de TECH-053-01 com registro em `ai/decision-log.md`? Ou aguardar TASK-053-valves?

---

**Fim do relatório.**

Próxima ação esperada do humano: ler §0 (veredito), §5 (BLOCKERs/WARNINGs), §7.3 (recomendação) e §13 (aprovação humana). Decidir formalização e prioridades.
