# TASK-044 — Revalidação visual pós-TASK-043

**Status:** `concluída` (com regressão registrada — propõe TASK-045 Classe A)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / hidráulica / arquitetura
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 779/779 testes · 0 erros tsc · `src/` não alterado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-044.md`](../docs/relatorios/2026-05-21-TASK-044.md)
**Projeto-alvo:** `cmpfu7e4b0001ulshh0ni8jhd` (TASK-027 A — Cenário Limpo · Barreiras/BA)
**Dependências:** TASK-043 concluída (motor + ADR-015 + 779/779 testes); TASK-041 (baseline empírica)

---

## Objetivo

> Validar empiricamente no Projeto A real se o motor de seleção arquitetural da TASK-043 (ADR-015) funciona no fluxo prático: abrir projeto salvo, acionar "Auto", medir BOM, verificar PDF gate, blockers e invariantes. **Sem alterar código.** **Sem afirmar candidato vencedor sem evidência.**

---

## Contexto

A TASK-043 implementou `selectArchitectureByBom()` em [`src/lib/layout/architecture-selector.ts`](../src/lib/layout/architecture-selector.ts), integrado via `buildSelectedPipelineCoords()` em [`src/lib/layout/layout-use-cases.ts`](../src/lib/layout/layout-use-cases.ts). O motor é chamado em 2 caminhos do `ProjectMap.tsx`:

- **Caminho 1** — useEffect de auto-sugestão (linha 296-327): dispara automaticamente quando há `waterSource + area + centroid` E `mainPipeline.source !== "manual"`.
- **Caminho 2** — `resetToAutoPipeline` (linha 552-572): handler do botão "Auto" em "Tubulação principal".

A UI **NÃO expõe** `ArchitectureSelectionResult` na sidebar — task B futura. Significa que identificar qual candidato venceu (A0/A2/A3) será **best-effort**: via geometria visual da principal, via console messages, ou marcado como **"não mensurável pela interface atual"**.

**Baselines TASK-041 para comparação:**

| Indicador | Baseline TASK-041 |
|-----------|-------------------|
| BOM total | **R$ 277.955,01** |
| Blockers ativos | 0 |
| Avisos | 6 |
| PDF gate | HTTP 200 + download |
| Tubo LF Ø100mm | 0 barras |
| Tubo LF Ø75mm | 852 barras |
| Tubo LF Ø50mm | 74 barras |
| Aspersores em kit | 337/337 |
| HMT mínima | 40,3 mca |
| Ramais | 29 × 4186 m |

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `docs/relatorios/2026-05-21-TASK-044.md` | criação | Relatório com 10 seções (mesmo padrão TASK-041); 13 pontos validados com classificação CD/CS/IA/NM |
| `docs/relatorios/evidencias/2026-05-21-TASK-044/` | criação | PNGs + traces YAML do Playwright (criado vazio pelo `/planejar`) |
| `tasks/backlog.md` | atualização | Status TASK-044: `pendente` → `concluída` (criar entrada antes); cabeçalho mantido se sem regressão |
| `tasks/TASK-044-...md` | este arquivo | Plano e fechamento documental |
| **`src/`** | **NÃO alterar** | Regra explícita |
| Catálogo, `package.json`, lockfile, PDF, mapa | **NÃO alterar** | Regra explícita |

---

## Sequência de execução (Playwright MCP) — mapeamento dos 13 pontos

### Setup

- ✅ Confirmar `curl localhost:3000` → HTTP 200 (feito).
- ✅ Diretório `docs/relatorios/evidencias/2026-05-21-TASK-044/` criado vazio.
- `browser_resize` → 1440×900.

### Ponto 1 — Estado inicial salvo do projeto

- `browser_navigate` → `/projetos/cmpfu7e4b0001ulshh0ni8jhd`.
- `browser_snapshot` → DOM baseline; identificar referências dos botões "Auto" e "PDF".
- **Evidência:** `task-044-01-estado-inicial.png` (sidebar full page com BOM/blockers/avisos pré-Auto).
- Capturar `browser_console_messages` baseline.

### Ponto 2 — Acionar botão "Auto" ou "Refazer traçado"

- O botão "Auto" fica em "Tubulação principal" → handler é `resetToAutoPipeline` → chama `buildSelectedPipelineCoords()` → invoca motor.
- `browser_click` no botão "Auto" identificado no snapshot.
- Aguardar mapa atualizar (`browser_wait_for` por mudança visual ou timeout breve).

### Ponto 3 — Confirmar que o motor foi acionado

- `browser_console_messages` após clique: motor avalia A0 internamente → `generatePrincipalAndAdutora` pode emitir warning `"[principal] Captação dentro da faixa Y..."` se a captação estiver dentro da faixa Y (caso do Projeto A).
- Esse warning é **indicação indireta** de que A0 foi avaliado (e portanto o motor rodou). A0 não vence necessariamente — apenas foi avaliado.
- `browser_snapshot` pós-Auto para conferir BOM mudou ou não.

### Ponto 4 — Medir BOM total após Auto

- `browser_evaluate` extraindo `textContent` da seção BOM da sidebar.
- Capturar texto literal: `"Total R$ XXX.XXX,XX"`.
- **Evidência:** `task-044-02-sidebar-pos-auto.png`.

### Ponto 5 — Comparar com baseline TASK-041

- Cálculo: `Δ = BOM_TASK_044 − R$ 277.955,01`.
- Registrar percentual e diferença absoluta.

### Ponto 6 — Alteração visual da principal/ramais

- Comparar `task-044-02-sidebar-pos-auto.png` com `task-041-02-mapa-zoom.png` (TASK-041).
- `browser_click` em "Zoom in" várias vezes para visualizar polilinhas.
- **Evidência:** `task-044-03-mapa-zoom.png`.

### Ponto 7 — Candidato vencedor (3 caminhos possíveis)

- **CD (confirmado por UI)** — se de alguma forma o `ArchitectureSelectionResult` for serializado no DOM (improvável).
- **IG (inferido por geometria)** — comparar posição da principal entre TASK-041 e TASK-044:
  - Se mesma posição (borda Y próxima da captação) → provavelmente A0.
  - Se outra borda Y → provavelmente A2.
  - Se atravessa o meio da malha (atravessa aspersores) → provavelmente A3.
- **NM (não mensurável pela interface atual)** — se geometria não distinguir claramente, registrar como NM.
- **`browser_evaluate`** tentando acessar dados expostos (best-effort, com falha esperada).

### Ponto 8 — Validar ausência de blockers

- `browser_snapshot` da sidebar: a seção "Bloqueios ativos" deve estar **ausente** (igual TASK-041).
- Capturar texto literal de blockers + avisos via `browser_evaluate`.

### Ponto 9 — Validar PDF HTTP 200

- `browser_click` no botão "PDF".
- `browser_network_requests` filtro `/api/projetos|pdf` → confirmar `POST .../pdf → 200 OK`.
- Confirmar download iniciado.
- **Evidência:** `task-044-04-pdf-gate.png`.

### Ponto 10 — DN100 ausente em laterais 5022

- `browser_evaluate` extraindo BOM textContent → verificar **ausência** de `TIGRE_LF_100_PN40` (Tubo LF Ø100mm).
- Confirmar que `TIGRE_LF_50_PN40` e `TIGRE_LF_75_PN40` permanecem.

### Ponto 11 — Screenshots e trace

- 4 PNGs principais: `task-044-01-estado-inicial.png`, `task-044-02-sidebar-pos-auto.png`, `task-044-03-mapa-zoom.png`, `task-044-04-pdf-gate.png`.
- `playwright-trace/` com snapshots YAML + console logs.

### Ponto 12 — Evidências salvas

- `docs/relatorios/evidencias/2026-05-21-TASK-044/` com:
  - 4 PNGs
  - `playwright-trace/` (snapshots YAML + console log)
  - PDF emitido (se gate liberar)

### Ponto 13 — Warning A3 (se aplicável)

- Se evidência sugerir A3 vencedor (geometria atravessando área), registrar:
  - Warning esperado: "principal central atravessa área irrigada — validar construtibilidade operacional/RT".
  - Verificar se aparece na UI (não esperado — task B futura) ou se foi suprimido (esperado).

---

## Estratégia para identificar candidato vencedor (Ajuste padrão TASK-041)

| Tipo de evidência | O que cobre |
|-------------------|-------------|
| **CD (confirmado por DOM)** | Texto literal no DOM via `browser_evaluate` |
| **CS (confirmado por screenshot)** | Visual no PNG |
| **IG (inferido por geometria)** — uso especial nesta task | Geometria visual da principal vs. TASK-041 |
| **IA (inferido por ausência)** | Blocker/warning ausente que estaria presente em outro caso |
| **NM (não mensurável pela interface atual)** | UI não expõe; vinculação reservada para task B futura |

---

## Critérios de aceite

- [ ] `localhost:3000` confirmado HTTP 200
- [ ] Projeto `cmpfu7e4b0001ulshh0ni8jhd` carregado sem erros de domínio
- [ ] Botão "Auto" identificado e clicado com sucesso
- [ ] Mínimo 4 PNGs em `docs/relatorios/evidencias/2026-05-21-TASK-044/`
- [ ] `playwright-trace/` com snapshots YAML + console log
- [ ] Relatório `docs/relatorios/2026-05-21-TASK-044.md` criado com 10 seções
- [ ] **Os 13 pontos** validados com classificação CD/CS/IG/IA/NM
- [ ] **Comparação direta TASK-041 → TASK-044** no relatório (tabela)
- [ ] **Candidato vencedor**: registrado conforme caminho disponível (UI / geometria / NM); **sem afirmação sem evidência**
- [ ] BOM total medido e comparado com baseline
- [ ] PDF gate validado (HTTP 200 ou 422 — registrar o observado)
- [ ] DN100 LF confirmado ausente
- [ ] Blockers contados (esperado: 0; qualquer blocker novo = regressão)
- [ ] `tasks/backlog.md` atualizado (entrada TASK-044 → concluída)
- [ ] `tasks/TASK-044-...md` atualizado (status → concluída; log de alterações)
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → 779/779 (sem regressão)
- [ ] `git diff -- src/` vazio para esta task
- [ ] Catálogo, `package.json`, lockfile intocados
- [ ] Se houver regressão → registrar achado + sugerir task Classe A

---

## Critérios de **sucesso da TASK-043** (a confirmar empiricamente)

> Estes não são critérios de aceite da TASK-044 — são as expectativas da TASK-043 que esta task mede. Se algum falhar, é achado a registrar, não falha da TASK-044.

- [ ] Motor é acionado ao clicar "Auto" sem erros de console
- [ ] Sem regressão de BOM (BOM ≤ baseline OU mesma BOM se A0 venceu)
- [ ] Blockers permanecem em 0
- [ ] PDF gate permanece em 200
- [ ] DN100 LF permanece ausente
- [ ] Laterais permanecem sobre aspersores (TASK-028 preservada)
- [ ] Nenhum blocker angular novo
- [ ] Console sem errors de domínio
- [ ] Tempo de execução do motor < 1 segundo (perceptível mas aceitável na UI)

---

## Fora do escopo

- **NÃO** alterar `src/`, catálogo, `package.json`, lockfile
- **NÃO** corrigir bugs descobertos — registrar como achado e propor nova task (Classe A se severidade alta)
- **NÃO** reexecutar a TASK-043 mesmo se medição der inesperado
- **NÃO** redesenhar o projeto, mudar setorização, mover captação
- **NÃO** alterar configuração do Playwright nem do MCP
- **NÃO** abrir nova ADR
- **NÃO** tocar em TASK-034 (PDF feedback), TASK-035 (BOM curvas 90°), TASK-045/046/047 — todas seguem separadas
- **NÃO** afirmar candidato vencedor sem evidência (CD ou IG clara)
- **NÃO** mover artefatos de TASK-041 ou anteriores

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Botão "Auto" não disparar `resetToAutoPipeline` esperado | baixa | médio | Snapshot identifica handler; se botão errado, tentar "Refazer traçado (manual)" — também deve disparar |
| Motor não ser invocado (mainPipeline já salvo) | média | alto | Caminho 1 (useEffect) só roda se source ≠ "manual". Caminho 2 (botão Auto) sempre roda. Verificar antes/depois do clique |
| Geometria visual não distinguir A0 vs. A2 vs. A3 | média | médio | Registrar como NM (não mensurável); comparação visual fica como evidência qualitativa |
| `ArchitectureSelectionResult` não acessível via DOM | confirmada | baixo | NM registrado; fica para task B futura expor na UI |
| BOM aumentar inesperadamente (regressão) | baixa | alto | Registrar; abrir task Classe A com causa-raiz; não tentar corrigir nesta task |
| PDF retornar 422 (regressão) | baixa | alto | Registrar; verificar blocker novo no sidebar; abrir task A |
| Console emitir errors de domínio novos | baixa | médio | Capturar via `browser_console_messages level=error`; registrar |
| Sessão Clerk expirada → redirect login | baixa | médio | Perfil Playwright persistido das tasks anteriores; se cair, parar e reportar |
| Mapa Mapbox WebGL não inspeccionável via DOM | confirmada | baixo | Limitação conhecida; usar screenshots + comparação visual |
| Tempo de execução do motor visivelmente alto | baixa | baixo | Apenas registrar; não bloqueia |
| Conflito com a auto-sugestão do useEffect | média | médio | Caminho 1 e 2 chamam mesma função; resultado deve ser igual |
| Working tree sujo afetar medição | nenhuma | n/a | `localhost:3000` consome estado em disco — reflete TASK-043 atual |

**Dependências:**

- ✅ TASK-043 concluída (motor + ADR-015 + 779 testes)
- ✅ TASK-041 (baseline empírica)
- ✅ Playwright MCP configurado (memória `reference_playwright_mcp`)
- ✅ Projeto `cmpfu7e4b0001ulshh0ni8jhd` salvo

---

## Pendências abertas

> A serem fechadas durante a execução:

- [ ] Identificar handler exato do botão "Auto" em "Tubulação principal" via snapshot
- [ ] Decidir se geometria permite inferir candidato vencedor ou se registrar como NM
- [ ] Capturar BOM total exata pós-Auto
- [ ] Confirmar warning de console esperado (`[principal] Captação dentro da faixa Y...`)
- [ ] Limpeza final: mover `.playwright-mcp/` → `evidencias/.../playwright-trace/`

---

## Plano de implementação (a executar no `/implementar`)

1. **Setup ambiente** — `npx tsc --noEmit` + `npx vitest run` para confirmar baseline 779/779; `git status --short` para capturar working tree (Ajuste 1 padrão TASK-041); confirmar HTTP 200.
2. **Navegação** — abrir `/projetos/cmpfu7e4b0001ulshh0ni8jhd`; resize 1440×900; capturar snapshot inicial.
3. **Screenshot 1** — sidebar full page (estado salvo da TASK-041).
4. **Capturar console messages** (baseline).
5. **Acionar Auto** — clicar botão "Auto" identificado no snapshot.
6. **Capturar console messages pós-Auto** — esperar warning `[principal] Captação dentro da faixa Y...` se A0 foi avaliado pelo motor.
7. **Screenshot 2** — sidebar pós-Auto.
8. **Comparação BOM** — extrair total via `browser_evaluate`.
9. **Screenshot 3** — mapa em zoom alto após 3-4 cliques de Zoom In.
10. **Inferência geometria** — comparar visualmente com TASK-041 ([task-041-02](evidencias/2026-05-21-TASK-041/task-041-02-mapa-zoom.png)).
11. **Best-effort `browser_evaluate`** — tentar acessar dados de seleção.
12. **Clicar PDF** — capturar `browser_network_requests` + status + console.
13. **Screenshot 4** — pós-PDF.
14. **Cleanup** — `browser_close`; mover `.playwright-mcp/*` para `evidencias/2026-05-21-TASK-044/playwright-trace/`; renomear PDF se baixado.
15. **Relatório** — criar `docs/relatorios/2026-05-21-TASK-044.md` com 10 seções (Resumo → O que foi feito → Comparação direta TASK-041→044 → 13 pontos com classificação CD/CS/IG/IA/NM → Achados consolidados → Estado suíte → Limitações → Conclusão → Próximas tasks → Log final).
16. **Fechamento** — atualizar `tasks/backlog.md` (entrada TASK-044 → concluída); atualizar este arquivo (log de alterações); validações finais.

---

## Formato de resposta esperado

Ao concluir a TASK-044, o agente deve responder com:

1. **O que foi feito** — evidências, comparações, relatório
2. **Testes** — 779/779 (inalterado, esta task não toca código)
3. **TypeScript** — 0 erros
4. **Resultado dos 13 pontos** — tabela CD/CS/IG/IA/NM
5. **Candidato vencedor** — caminho confirmado (UI/geometria/NM) **sem afirmação sem evidência**
6. **Comparação numérica TASK-041 → TASK-044**
7. **Achados consolidados** — severidade + classe
8. **Próximas tasks sugeridas**

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Arquivo criado durante `/planejar` com plano de execução completo, 13 pontos mapeados, estratégia de inferência (CD/CS/IG/IA/NM), critérios de aceite mensuráveis, riscos. Diretório `docs/relatorios/evidencias/2026-05-21-TASK-044/` criado vazio. Aguardando aprovação. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` executado. Sessão Playwright completa: 4 PNGs + 7 traces YAML + console log. **Estado inicial**: BOM R$ 170.263,61 (motor TASK-043 já havia rodado via `useEffect`); 1 blocker angular novo; 5 avisos. **Clique Auto**: motor re-acionado (console +1 warning `[principal] Captação dentro da faixa Y`); BOM idêntica (determinístico). **PDF**: HTTP 422 (regressão vs. 200 TASK-041) — consistente com blocker ativo (gate ADR-003 OK). **Economia confirmada**: −R$ 107.691,40 (−38,7%) vs. baseline; ramais −79% (4186→878 m); Ø100mm rígido ramais −92,6% (416→31 barras / R$ 89.440 → R$ 6.665). **Regressão registrada**: blocker "Construtibilidade angular: 3 conexão(ões) com ângulo fora de 45°/90°/180° (3 em lateral)" — ADR-010 violada no Projeto A real (T43-8 sintético passou; cenário real expõe edge case). Candidato vencedor: NM (UI não expõe `ArchitectureSelectionResult`); inferência por geometria sugere arquitetura ≠ A0. **Não corrigir nesta task** (regra explícita). **TASK-045 (Classe A) sugerida**. tsc 0 erros; vitest 779/779; git diff -- src/ inalterado. |
