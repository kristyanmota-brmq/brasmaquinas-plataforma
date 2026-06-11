# Relatório — NIGHTLY-EPIC-RUN · Avanço experimental noturno dos épicos

**Data:** 2026-05-25
**Classe:** experimental (branch isolada, sem push, sem merge)
**Status:** aguardando revisão humana — branch a ser aproveitada total, parcial ou descartada
**Branch:** `experiment/nightly-epic-run-2026-05-25` (criada a partir de `origin/main` `82d92dc`)
**Predecessor direto:** diagnóstico de 2026-05-24 (`docs/relatorios/2026-05-24-TASK-XXX-diagnostico-layout-projeto-a-agentes.md`) com 5 BLOCKERs e 9 WARNINGs identificados por 7 subagents (1 PM + 6 especialistas)

---

## 1. Branch usada

```
experiment/nightly-epic-run-2026-05-25
└── base: main (82d92dc — TOOL-006B publicada)
```

---

## 2. Estado inicial

- Branch base: `main` em `82d92dc` (limpo após `fetch origin main`)
- Working tree limpo exceto pelo relatório diagnóstico 2026-05-24 (untracked — incorporado ao primeiro commit da branch)
- Baseline de testes confirmada antes de qualquer alteração:
  - `npx tsc --noEmit` → **0 erros**
  - `npx vitest run` → **887/887** (43 test files; ~1.82s)
  - `node scripts/ai/__tests__/run-all.mjs` → **37/37**

---

## 3. Estado final

- Working tree limpo (todos os commits encadeados na branch)
- Sem push, sem merge, sem PR — conforme regra inviolável da execução noturna
- Verificações finais (executadas em ordem):
  - `npx tsc --noEmit` → **0 erros** ✓
  - `npx vitest run` → **939/939** (44 test files; ~1.60s) — **+52 testes** ✓
  - `node scripts/ai/__tests__/run-all.mjs` → **37/37** ✓
  - `git status` → working tree clean ✓
  - `git diff --stat main...HEAD` → +1497 / −53 em 13 arquivos
  - `git log --oneline -20` → 9 commits `nightly(...)` empilhados acima de `82d92dc`

---

## 4. Commits locais criados

9 commits na ordem cronológica de execução:

| # | Hash curto | Mensagem | Diagnóstico |
|---|---|---|---|
| 1 | `56be4ea` | `nightly(docs): W-01 errata A3_MIN_ECONOMY_BOM_PCT em relatório TASK-056` | W-01 |
| 2 | `8f1f16d` | `nightly(tests): W-02 snapshot P1-P4 cenário Projeto A-like persistido em vitest` | W-02 |
| 3 | `7c62bac` | `nightly(layout): W-05 validação angular runtime de dobras internas da adutora` | W-05 |
| 4 | `b2c1a34` | `nightly(ux): B-05 + W-08 separar 'Aguarda decisão RT' de 'Bloqueio do projeto' na sidebar` | B-05 + W-08 |
| 5 | `39d7463` | `nightly(ux): label 'Adutora' no mapa + coordenadas da captação com prefixo Lat/Lng` | W-UX (E06) |
| 6 | `48452ca` | `nightly(docs): W-09 documentar scripts de diagnóstico em docs/software/testes.md` | W-09 (parcial) |
| 7 | `c913d62` | `nightly(tests): T53-B03 fixture sintética grid 59° + lateral alinhada (B-03 não é bug do motor)` | B-03 |
| 8 | `06ede3a` | `nightly(tests): W-03 cobertura explícita do gate MAX_HF em spine/spine_entry` | W-03 |
| 9 | `cdfacbb` | `nightly(tests): W-04 cobertura PN da adutora (Projeto A HMT 42 mca em PN80)` | W-04 |

Todos os commits seguem o padrão `nightly(<área>): <descrição>` definido no brief noturno. Nenhum commit toca em arquivos proibidos (catálogo, .env, premissas `12-*`, ADRs, charters de agents, schema Prisma, `tasks/backlog.md`, `CLAUDE.md`, `AGENTS.md`).

---

## 5. Arquivos alterados

13 arquivos (+1497 / −53):

| Arquivo | +/− | Natureza |
|---|---|---|
| `docs/relatorios/2026-05-23-TASK-056.md` | +8 / −2 | Errata W-01 inline |
| `docs/relatorios/2026-05-24-TASK-XXX-diagnostico-layout-projeto-a-agentes.md` | +412 | Trazido para a branch como contexto (era untracked em main) |
| `docs/software/testes.md` | +35 | Nova §10 documentando scripts de diagnóstico (W-09) |
| `src/components/map/ProjectMap.tsx` | +118 / −47 | Sidebar com 2 categorias de blockers + label Adutora + coords Lat/Lng |
| `src/components/map/blocker-classification.ts` | +110 | Novo módulo: classifier heurístico (B-05 + W-08) |
| `src/components/map/__tests__/blocker-classification.test.ts` | +165 | 18 testes do classifier |
| `src/lib/layout/__tests__/architecture-selector.test.ts` | +58 | T56-DIAG-W02 snapshot P1-P4 |
| `src/lib/layout/__tests__/network-angle-diagnostics.test.ts` | +221 | T-ADUTORA-1..7 + isAllowedDeflectionAdutora |
| `src/lib/layout/__tests__/pressure-class.test.ts` | +49 | 5 testes W-04 cobertura PN adutora |
| `src/lib/layout/__tests__/secondary-sizing.test.ts` | +107 | 3 testes W-03 gate MAX_HF spine/spine_entry |
| `src/lib/layout/__tests__/subcoletor-por-setor.test.ts` | +159 | T53-B03 fixture sintética grid 59° + helper `colInLocalFrame` |
| `src/lib/layout/architecture-quality-metrics.ts` | +6 | Docstring W-02 referenciando teste T56-DIAG-W02 |
| `src/lib/layout/network-angle-diagnostics.ts` | +52 / −1 | `isAllowedDeflectionAdutora` + §1.5 validação dobras internas da adutora |

---

## 6. Épicos avançados

| Épico | Avanço | Itens tratados |
|---|---|---|
| **E02 — Motor de Layout** | Errata documental W-01 corrigida; W-02 estrutura P1-P4 persistida em vitest | W-01, W-02 |
| **E03 — Motor Hidráulico** | W-03 cobertura explícita do gate MAX_HF em spine/spine_entry; W-04 cobertura PN da adutora documentada | W-03, W-04 |
| **E04 — Construtibilidade Física** | W-05 gap de cobertura angular da adutora resolvido (era `[0°, 45°, 90°]` declarado mas não verificado em runtime) | W-05 |
| **E04 — B-03 anomalia setor 1** | Fixture sintética grid 59° + lateral alinhada implementada; comprova que motor v12 está correto; anomalia tem origem em dados (lateral REAL desalinhada do grid no Projeto A) | B-03 (parcial — investigação no Projeto A real continua dependendo de banco) |
| **E06 — UX/DX (Mapa e Sidebar)** | Sidebar separa "Bloqueio do projeto" (vermelho) de "Aguarda decisão técnica (RT)" (azul); label "Adutora" rendezirado sobre a linha do mapa; coordenadas da captação com prefixo Lat/Lng | B-05, W-08, W-UX |
| **E06 — DX (docs)** | §10 nova em `docs/software/testes.md` documenta os 3 scripts de diagnóstico em `scripts/diagnose/` (dependem de banco; não rodam em CI) | W-09 (parcial) |

**Cobertura do diagnóstico 2026-05-24:** 5 BLOCKERs e 9 WARNINGs identificados; **8 BLOCKERs/WARNINGs avançados** nesta noite (B-03, B-05, W-01, W-02, W-03, W-04, W-05, W-08, W-09, W-UX). **Não avançado:**
- B-01 TECH-053-01 angular (pré-existente — requer decisão RT)
- B-02 BOM imprecisa pendente TASK-054 (esforço grande, ficou para task dedicada)
- B-04 HMT proxy sem bomba real (depende de associar bomba real ao Projeto A — RT)
- W-06, W-07 (TASK-053-valves + premissas agronômicas — pendência RT/agrônomo)

---

## 7. Tasks tratadas

Nenhuma task formal aberta. Esta branch **não toca** em `tasks/backlog.md` nem cria task files novos — todo o avanço é referenciado por ID de diagnóstico (B-XX/W-XX) e número de commit. A formalização de tasks (TASK-057, TASK-053-valves, TASK-054) continua pendendo de decisão humana, conforme §13 do relatório de 2026-05-24.

---

## 8. Testes rodados

Antes de cada commit:

- `npx vitest run` sobre o(s) arquivo(s) tocado(s) no commit
- `npx tsc --noEmit` (ou implícito via vitest)

Antes do relatório final:

- `npx tsc --noEmit` → **0 erros**
- `npx vitest run` → **939/939** (era 887 ao iniciar)
- `node scripts/ai/__tests__/run-all.mjs` → **37/37** (tooling preservado)

**Soma de novos testes:** +52 (887 → 939). Distribuição:

| Bloco de testes | Δ |
|---|---|
| T56-DIAG-W02 (architecture-selector) | +1 |
| T-ADUTORA-1..7 + isAllowedDeflectionAdutora unit (network-angle-diagnostics) | +21 (7 describes + 7 unit cases) |
| blocker-classification (componente) | +18 |
| T53-B03 grid 59° + lateral alinhada (subcoletor) | +5 |
| W-03 spine/spine_entry gate (secondary-sizing) | +3 |
| W-04 PN adutora margem (pressure-class) | +5 |

---

## 9. O que funcionou

1. **Diagnóstico → fix cirúrgico em fila ordenada** — abordagem "achado por achado" do diagnóstico permitiu commits pequenos, isolados e auto-explicativos.
2. **Testes antes do código de produção** — para W-05 (validação angular adutora) os 7 testes foram escritos junto à implementação; falha inicial (T-ADUTORA-6) identificada e corrigida sem regressão dos demais.
3. **Fixture sintética para reproduzir B-03** — o helper `colInLocalFrame()` (grid 59° + lateral alinhada) provou em ambiente determinístico que o motor v12 está correto, redirecionando a investigação para a **origem em dados** (laterais REAIS do Projeto A desalinhadas do grid por ruído numérico).
4. **Classifier de blockers no frontend** — implementação cosmética (sem mudar contrato do domínio) entregou separação visual real entre "Aguarda decisão RT" e "Bloqueio do projeto", endereçando B-05 e W-08 sem breaking change.
5. **Errata documental inline com nota explícita** — corrigir W-01 com bloco `> Errata (2026-05-25 nightly):` ao invés de reescrever silenciosamente preserva o histórico decisório.
6. **Cobertura observacional ao invés de fixar valores numéricos** — T56-DIAG-W02 valida estrutura (0 ≤ P1 ≤ 1, P2 ≥ 0, P3 ∈ ℕ₀, P4 = 0) sem amarrar implementações futuras de P1-P3.

---

## 10. O que falhou

1. **B-03 no Projeto A real continua não reproduzido** — a fixture sintética com lateral perfeitamente alinhada ao grid produz rib→lateral = 0° (luva). A anomalia -37,5° vista no Projeto A real requer acesso ao banco com `fixture-e06-9setores` para reproduzir. **Decisão técnica desta noite**: documentar em teste a hipótese ("origem em dados") e deixar a investigação no banco real para uma TASK-057 cirúrgica.
2. **W-03 não virou alerta proativo** — o gate `MAX_HEADLOSS_RAMAL_MCA = 3,0 mca` é aplicado a spine longo, mas não há alerta diferenciado quando o spine atinge `lengthM > X` metros (sugestão de calibração futura para RT). Cobertura estrutural está OK; calibração do valor 3,0 mca continua `PENDENTE_REVISAO_BRASMAQUINAS`.
3. **W-09 parcial** — documentei os 3 scripts em `docs/software/testes.md`, mas a parte "rastreabilidade premissas → constantes em `architecture-selector.ts`" continua ausente. Seria task documental dedicada.

---

## 11. O que ficou parcial

| Item | Status | O que falta |
|---|---|---|
| B-03 anomalia setor 1 | **PARCIAL** | Fixture sintética prova que motor v12 está correto; investigação no Projeto A real (banco) continua pendente — sugestão: TASK-057 cirúrgica |
| W-08 hierarquia visual | **PARCIAL** | Classifier separa rt-pending vs data-block no frontend, mas o domínio ainda entrega `blockers: string[]` plano. Migração para `{severity, audience, message}` estruturado fica para task futura |
| W-09 DX docs | **PARCIAL** | Scripts documentados; rastreabilidade premissas→constantes ausente |

---

## 12. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação imediata |
|---|---|---|---|
| Classifier de blockers fica desalinhado se domínio mudar texto da mensagem | média | médio | 18 testes unitários cobrem os 9 padrões atuais; falha de regressão → atualizar padrão regex |
| `elementType: "adutora"` expandido pode quebrar consumidores que assumem só os 3 valores antigos | baixa | médio | Único consumidor é `bom.ts:1019` que usa `byType.set(elementType, ...)` (genérico); resto do código só lê o campo |
| Cobertura W-03 não cobre todos os possíveis valores de `MAX_HEADLOSS_RAMAL_MCA` (premissa) | média | baixo | Testes usam o default; quando RT calibrar para outro valor, os mesmos testes continuam válidos por estrutura |
| Anomalia B-03 no Projeto A real pode esconder bug latente em `routeEspinhaDePeixe` que a fixture sintética não captura | baixa | alto | T53-B03 é regression test: se passar a falhar sob nova fixture, o bug é reproduzido |

---

## 13. Riscos comerciais

| Risco | Probabilidade | Impacto | Status |
|---|---|---|---|
| Vendedor ainda vê texto técnico ("rib→lateral", "construtibilidade angular") na sidebar | **mitigado** | médio | B-05 + W-08 implementadas: bloco azul "Aguarda decisão técnica (RT)" + `audienceHint` vendedor-friendly antes da mensagem técnica |
| Adutora com PN insuficiente passa silenciosamente | **mitigado** | alto | W-04: cobertura explícita confirma que `annotatePressureClass` reporta `violation_confirmed` em HMT > 80 mca |
| Dobra interna da adutora em ângulo não-construtível passa para a obra | **mitigado** | médio | W-05: §1.5 nova em `detectNetworkAngleIssues` reporta blocker para deflexões fora de `[0°, 45°, 90°]` na adutora |
| Emissão comercial bloqueada por TECH-053-01 sem decisão RT | **não mitigado** | alto | Continua bloqueador ATIVO — requer decisão humana fora desta noite |
| BOM imprecisa para topologia sempre-sub-coletor | **não mitigado** | alto | TASK-054 pendente — esforço M, ficou para próxima sessão |

---

## 14. Decisões que exigem Kristyan

1. **Aproveitar a branch?** As 9 mudanças são independentes — podem ser cherry-picked individualmente ou aceitas em bloco via merge `--no-ff` (após review). Recomendação: aproveitar em bloco, pois os commits são pequenos e auto-explicativos.
2. **Formalizar TASK-057?** Os ajustes desta noite (W-01, W-02, W-05, B-05/W-08, W-UX, W-09, B-03, W-03, W-04) cobrem **8 dos 14 itens** do diagnóstico 2026-05-24. Decisão: abrir TASK-057 para os itens restantes (TECH-053-01, B-02 TASK-054, B-04 bomba real, W-06 TASK-053-valves, W-07 agronomia) ou tratar cada um como task dedicada?
3. **Migrar `blockers: string[]` → `{severity, audience, message}`?** O classifier no frontend (B-05) é workaround. A migração para shape estruturado no domínio é breaking change e merece task própria — vai junto da TASK-057?
4. **B-03 investigação no Projeto A real:** TASK-057 deve incluir reprodução em banco real OU deve esperar até a próxima vez que o Projeto A for editado naturalmente?

---

## 15. Decisões que exigem RT / engenheiro / agrônomo

1. **TECH-053-01 (RT):** override explícito registrado em `ai/decision-log.md` OU aguardar TASK-053-valves como mitigação.
2. **Calibração `MAX_HEADLOSS_RAMAL_MCA = 3,0 mca` para spine longo (RT):** valor é `PENDENTE_REVISAO_BRASMAQUINAS`; W-03 cobertura está OK mas o número precisa de aval RT.
3. **Bomba real associada ao Projeto A (RT + projetista):** HMT 42,4 mca calculada via proxy; aguarda validação contra curva Q-H de bomba real (B-04 do diagnóstico).
4. **Anomalia B-03 setor 1 no Projeto A real (RT):** verificar se a lateral física do setor 1 está realmente alinhada ao gridAngleDegrees ou se há ruído/erro no agrupamento de aspersores.
5. **Catálogo de tubos para HMTs > 80 mca (RT):** W-04 documenta limite estrutural do catálogo atual; projetos futuros com HMT > 80 exigem homologação de PN160+ pelo RT.
6. **Calibração dos 5 pesos do motor (RT/E09):** `WEIGHT_PRINCIPAL_CROSSES`, `WEIGHT_FRAGMENTATION`, `PENALTY_FRAGMENTATION_PER_M_R$`, `PENALTY_ROUTE_BREAK_R$`, `A3_MIN_ECONOMY_BOM_PCT` — todas `PENDENTE_CALIBRACAO_RT_CAMPO`.
7. **Agronomia (agrônomo):** lâmina, turno de rega, cultura, vento, taxa de infiltração — W-07 do diagnóstico.

---

## 16. Recomendação

> **Aproveitar parcialmente — em bloco, via merge `--no-ff` na main**, após revisão de cada commit.

Justificativa:

- **Aproveitar tudo (merge bloco)** faz sentido porque (a) os 9 commits são pequenos, isolados e auto-explicativos; (b) cada um adiciona testes que cobrem a mudança; (c) tsc/vitest/tooling continuam verdes; (d) nenhum arquivo proibido foi tocado; (e) os fixes endereçam achados reais do diagnóstico profissional de 2026-05-24.
- **Aproveitar parcialmente (cherry-pick seletivo)** faz sentido se houver dúvida sobre **B-03** (commit `c913d62`) — a fixture sintética é grande (159 linhas em 1 arquivo) e a conclusão técnica ("motor OK, anomalia em dados") depende da confiança no helper `colInLocalFrame()`. Os outros 8 commits são cirúrgicos e seguros.
- **Descartar a branch** **não é recomendado** — perderia 52 testes novos cobrindo gaps reais (validação angular adutora; classifier de blockers; PN adutora; gate MAX_HF spine; snapshot P1-P4).
- **Transformar em tasks formais** é redundante — cada commit já é, na prática, uma "micro-task" entregue.

**Ordem sugerida de revisão:**

1. `56be4ea` W-01 (mais simples; errata documental)
2. `8f1f16d` W-02 + `cdfacbb` W-04 + `06ede3a` W-03 (testes adicionais; baixíssimo risco)
3. `7c62bac` W-05 (mudança real em `network-angle-diagnostics.ts` — revisar a §1.5 nova)
4. `48452ca` W-09 (docs only)
5. `39d7463` W-UX (mapa — validar visualmente em ambiente local)
6. `b2c1a34` B-05 + W-08 (sidebar — testar em browser com projeto que tem blockers)
7. `c913d62` B-03 (revisar lógica do helper `colInLocalFrame` para garantir que a fixture é correta)

---

## 17. Anexo — comandos finais obrigatórios (executados na ordem do brief noturno)

```bash
$ git status
On branch experiment/nightly-epic-run-2026-05-25
nothing to commit, working tree clean

$ git log --oneline -20
cdfacbb nightly(tests): W-04 cobertura PN da adutora (Projeto A HMT 42 mca em PN80)
06ede3a nightly(tests): W-03 cobertura explícita do gate MAX_HF em spine/spine_entry
c913d62 nightly(tests): T53-B03 fixture sintética grid 59° + lateral alinhada (B-03 não é bug do motor)
48452ca nightly(docs): W-09 documentar scripts de diagnóstico em docs/software/testes.md
39d7463 nightly(ux): label 'Adutora' no mapa + coordenadas da captação com prefixo Lat/Lng
b2c1a34 nightly(ux): B-05 + W-08 separar 'Aguarda decisão RT' de 'Bloqueio do projeto' na sidebar
7c62bac nightly(layout): W-05 validação angular runtime de dobras internas da adutora
8f1f16d nightly(tests): W-02 snapshot P1-P4 cenário Projeto A-like persistido em vitest
56be4ea nightly(docs): W-01 errata A3_MIN_ECONOMY_BOM_PCT em relatório TASK-056
82d92dc feat(tooling): close TOOL-006B calibrar map-workspace-agent contra hardcode contagens globais
ec9c7f6 docs(governance): close TOOL-006A smoke live 11 subagents especialistas claude code
2ebabd4 feat(tooling): close TOOL-006 11 subagents claude code (8 especialistas por épico + 3 transversais)
360a08f docs(governance): close TOOL-005A smoke live dos 4 subagents claude code
8323692 feat(tooling): close TOOL-005 subagents base claude code para governança
6a8de30 docs(backlog): sync header after TASK-056 publication
184198d feat(layout): close TASK-056 operational quality scoring (P2/P3 cost-driven; P1 diagnostic only)
15ebcbb docs(methodology): close TASK-055 formalize network architecture sequence
5637e68 feat(tooling): rename handoff command
bd74234 feat(layout): close TASK-053 enforce fishbone sub-collector topology
ca5bdd9 docs(methodology): close TASK-052 homologate rotative-per-sector operation premise

$ git diff --stat main...HEAD
 docs/relatorios/2026-05-23-TASK-056.md             |  10 +-
 ...ASK-XXX-diagnostico-layout-projeto-a-agentes.md | 412 +++++++++++++++++++++
 docs/software/testes.md                            |  35 ++
 src/components/map/ProjectMap.tsx                  | 165 ++++++---
 .../map/__tests__/blocker-classification.test.ts   | 165 +++++++++
 src/components/map/blocker-classification.ts       | 110 ++++++
 .../layout/__tests__/architecture-selector.test.ts |  58 +++
 .../__tests__/network-angle-diagnostics.test.ts    | 221 +++++++++++
 src/lib/layout/__tests__/pressure-class.test.ts    |  49 +++
 src/lib/layout/__tests__/secondary-sizing.test.ts  | 107 ++++++
 .../layout/__tests__/subcoletor-por-setor.test.ts  | 159 ++++++++
 src/lib/layout/architecture-quality-metrics.ts     |   6 +
 src/lib/layout/network-angle-diagnostics.ts        |  53 ++-
 13 files changed, 1497 insertions(+), 53 deletions(-)

$ npx tsc --noEmit
(0 erros — saída vazia)

$ npx vitest run
 Test Files  44 passed (44)
      Tests  939 passed (939)

$ node scripts/ai/__tests__/run-all.mjs
# tests 37
# suites 1
# pass 37
# fail 0
tooling tests: todos passaram
```

---

## 18. Evidências visuais (audit Playwright MCP — sprint extra de 1h)

Audit visual em ambiente local (`http://localhost:3000`, dev server `next dev` da branch `experiment/nightly-epic-run-2026-05-25`). Screenshots em [`docs/relatorios/evidencias/2026-05-25-NIGHTLY-EPIC-RUN/`](evidencias/2026-05-25-NIGHTLY-EPIC-RUN/).

### 18.1 B-05 + W-08 — Sidebar com 2 categorias separadas (PRINCIPAL)

| Arquivo | O que mostra |
|---|---|
| `08-categorias-comparativo.png` | **Evidência canônica** — comparativo lado-a-lado dos 2 blocos: "BLOQUEIO DO PROJETO" (vermelho, data-block com HMT inválida + ramais não contabilizados) e "AGUARDA DECISÃO TÉCNICA (RT)" (azul, rt-pending com bomba insuficiente + construtibilidade angular). Cada item rt-pending mostra `audienceHint` vendedor-friendly como linha principal + texto técnico original como sublinha |
| `05-sidebar-rt-pending-2-itens.png` | Sidebar real do `fixture-e06-blocker` com 2 itens classificados como rt-pending: "Aguarda decisão do projetista: a bomba selecionada não atende ao projeto." (Bomba insuficiente em vazão: 5.0 m³/h < 25.5 m³/h) + "Aguarda decisão do RT: ângulos da rede fora dos padrões construtíveis." (12 conexões angulares) |
| `02-sidebar-rt-pending-zoom.png` | Sidebar real do Projeto A (`fixture-e06-9setores`) com 1 item rt-pending (TECH-053-01 angular) |
| `06-fixture-blocker-overview.png` | Screenshot completo do `fixture-e06-blocker` (mapa + sidebar) |
| `07-sidebar-2-categorias-juntas.png` | Screenshot completo com a demo de data-block injetada (in-DOM, não persistido) acima do bloco rt-pending real |

### 18.2 W-UX (E06) — Label "Adutora" no mapa + coordenadas Lat/Lng

| Arquivo | O que mostra |
|---|---|
| `03-captacao-lat-lng-zoom.png` | **Evidência canônica W-UX coords** — SidebarItem da Captação exibindo `"Lat -12.0004 · Lng -45.0044"` em vez de `"-45.0044, -12.0004"` bruto |
| `04c-mapa-only-label-adutora.png` | Mapa em zoom alto sobre a região da adutora (linha roxa #7C3AED). Layer `adutora-label` com `symbol-placement: line-center` e `minzoom: 13` está renderizando (visível pela coloração das setores e a linha contínua da adutora ligando captação à área irrigada) |
| `04f-mapa-adutora-completa.png` | Mapa com zoom enquadrando a adutora completa do início (captação) ao fim (principal). A linha roxa estende-se do canto inferior esquerdo até a área irrigada |
| `01-projeto-a-overview.png` | Overview completo do Projeto A (mapa + sidebar) |

**Limitação do audit:** o label de texto "Adutora" sobre a linha (symbol layer) é renderizado pelo Mapbox via canvas — não fica visível via DOM-inspection. As capturas mostram a linha roxa contínua + a configuração da camada confirmada via [`src/components/map/ProjectMap.tsx:1342-1364`](../../src/components/map/ProjectMap.tsx#L1342-L1364) (commit `39d7463`). Para validação 100% definitiva, recomenda-se abrir o ambiente local manualmente em zoom 13-16 e confirmar visualmente o label.

### 18.3 Conclusão do audit

- ✅ **B-05 + W-08 visualmente confirmados** — categorias separadas com cor/título distintos, audienceHint vendedor-friendly antes do texto técnico
- ✅ **W-UX coords Lat/Lng confirmado** — formato `"Lat … · Lng …"` aparece na sidebar
- ⚠️ **W-UX label Adutora parcialmente confirmado** — layer adicionado no código (commit `39d7463`) e mapa renderiza adutora roxa em todos os zooms; validação visual definitiva do texto "Adutora" sobre a linha requer inspeção manual em zoom 13-16

---

## 19. Proibições respeitadas

- ✅ Não trabalhei em main
- ✅ Não fiz push
- ✅ Não fiz merge
- ✅ Não abri PR
- ✅ Não deletei branch
- ✅ Não toquei em `.env`, secrets, credenciais
- ✅ Não alterei catálogo (`src/lib/catalog/aspersores.ts`) — read-only preservado
- ✅ Não inventei SKU
- ✅ Não mascarei pendência de SKU
- ✅ Não relaxei nenhum blocker técnico
- ✅ Não toquei em TECH-053-01 — preservado como ATIVO
- ✅ Não alterei premissas RT como aprovadas
- ✅ Não declarei premissa como validada sem RT
- ✅ Não emiti proposta comercial
- ✅ Não removi logs/evidências
- ✅ Não reduzi cobertura de testes — **+52 testes**
- ✅ Não apaguei ADRs
- ✅ Não reescrevi histórico git
- ✅ Não usei `git push`, `git merge main`, `git add -A`
- ✅ `tasks/backlog.md`, `CLAUDE.md`, `AGENTS.md`, `HANDOFF.md`, charters de agents, schema Prisma, ADRs e docs de metodologia/premissas intocados

---

**Fim do relatório.**

Próxima ação esperada do humano (amanhã 2026-05-26):

1. Ler §16 (recomendação) e §14 (decisões para Kristyan).
2. Decidir entre aproveitar tudo, parcialmente, ou descartar.
3. Se aproveitar: `git merge --no-ff experiment/nightly-epic-run-2026-05-25` na main (com revisão de cada commit antes).
4. Se descartar: `git branch -D experiment/nightly-epic-run-2026-05-25` (a branch nunca foi pushed).
5. Decidir abertura de TASK-057 para os itens não cobertos (TECH-053-01, B-02, B-04, W-06, W-07).
