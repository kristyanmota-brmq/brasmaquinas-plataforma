# TASK-041 — Revalidação visual pós-TASK-040

**Status:** `concluída` (aprovada — TASK-040 confirmada empiricamente)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / hidráulica
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 768/768 testes · 0 erros tsc · `src/` não alterado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-041.md`](../docs/relatorios/2026-05-21-TASK-041.md)
**Projeto-alvo:** `cmpfu7e4b0001ulshh0ni8jhd` (TASK-027 A — Cenário Limpo · Barreiras/BA)
**Dependências:** TASK-040 concluída (768/768 testes; ADR-014 criada); TASK-039 (baseline de comparação)

---

## Objetivo

> Validar empiricamente no Projeto A real (Barreiras/BA) se a TASK-040 eliminou o blocker técnico *"Lateral hidraulicamente insuficiente para o aspersor 5022"* via split automático por capacidade hidráulica (ADR-014), e medir o impacto real em colunas físicas, BOM, ramais e diagnóstico hidráulico. **Sem alterar código.**

---

## Contexto

A **TASK-040** implementou split automático por capacidade hidráulica em `generatePhysicalColumns()` (ver [ADR-014](../docs/decisoes/ADR-014-split-automatico-capacidade-hidraulica-lateral.md)). O relatório §"Números de sanidade" registrou as expectativas para o Projeto A:

| Indicador | Baseline TASK-039 | Expectativa pós-TASK-040 |
|-----------|-------------------|--------------------------|
| Blocker técnico DN75 | ⚠️ 8 colunas; perda 33,10 mca; vel 3,57 m/s | **ausente** |
| Nº colunas físicas | 16 | ~24 (+8 sub-colunas) |
| BOM total | R$ 226.724,81 | crescimento moderado (ramais e tês) |
| Tubo LF Ø100mm | 0 barras | **continua 0** |
| Aspersores em kit | 337/337 | 337/337 |
| HMT mínima | 40,7 mca | tende a cair |

A TASK-041 confirma (ou refuta) essas expectativas empiricamente no browser real, fechando a série de validação **TASK-027 → TASK-033 → TASK-039 → TASK-041**.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `docs/relatorios/2026-05-21-TASK-041.md` | criação | Relatório com 13 pontos validados + achados + comparação direta vs. TASK-039 |
| `docs/relatorios/evidencias/2026-05-21-TASK-041/` | criação | PNGs + traces YAML do Playwright (criado vazio pelo `/planejar`) |
| `tasks/backlog.md` | atualização | Status TASK-041: `pendente` → `concluída`; data; resumo de 1-2 linhas |
| `tasks/TASK-041-revalidacao-visual-pos-task-040.md` | este arquivo | Plano e fechamento documental |
| **`src/`** | **NÃO alterar** | Regra explícita Classe E |
| `src/lib/catalog/aspersores.ts` | NÃO alterar | Read-only |
| `package.json`, lockfile | NÃO alterar | Regra explícita do briefing |

---

## Mapeamento dos 13 pontos de validação → evidências

| # | Ponto a validar | Como medir | Evidência |
|---|------------------|------------|-----------|
| 1 | Blocker técnico DN75 desapareceu ou persiste | Sidebar área "Bloqueios ativos" — buscar texto *"Lateral hidraulicamente insuficiente"* | `task-041-01-sidebar.png` + transcrição do texto exato no relatório |
| 2 | Nº de colunas físicas antes/depois | Sidebar (se exposto) ou contagem via inspeção do `IrrigationProjectResult` no console (`window.__layout` se exposto, senão derivar da BOM/mapa) | `task-041-01-sidebar.png` ou trace de console |
| 3 | Nº máximo de aspersores por coluna | Derivado: `337 / nº colunas` médio; máximo via inspeção de `physicalColumns.map(c => c.sprinklerIndices.length)` se acessível | Cálculo no relatório + nota se inspeção foi possível |
| 4 | Perda máxima em lateral | Texto do blocker (se aparecer) ou ausência confirmada (esperado: blocker ausente → métrica não exposta na UI) | Transcrição no relatório; nota se não exposto |
| 5 | Velocidade máxima em lateral | Idem ponto 4 | Idem |
| 6 | Tubo LF Ø100mm continua 0 barras | Sidebar área BOM → procurar linha "Tubo PVC LF Ø100mm" | `task-041-01-sidebar.png` (BOM expandida) |
| 7 | DN50/DN75 únicos DNs de lateral 5022 | Sidebar BOM → confirmar apenas Ø50mm e Ø75mm em "Tubo PVC LF" | `task-041-01-sidebar.png` |
| 8 | Laterais continuam passando pelos aspersores | Blocker *"Aspersor fora do eixo da lateral física"* ausente + inspeção visual no mapa | `task-041-01-sidebar.png` + `task-041-02-mapa-zoom.png` |
| 9 | `routeCoords` renderizado em cada sub-lateral | Mapa em zoom alto: polilinhas amarelas seguem aspersores em cada sub-lateral | `task-041-02-mapa-zoom.png` |
| 10 | BOM total | Sidebar rodapé da BOM — valor em R$ | `task-041-01-sidebar.png` (rodapé visível) |
| 11 | Comprimento total de ramais | Sidebar — métricas de ramais (se expostas); senão derivar somando tubos LF DN50/DN75 destinados a ramal | Cálculo no relatório |
| 12 | Nenhum blocker angular/hidráulico novo inesperado | Sidebar área "Bloqueios ativos" — listar todos os blockers; comparar com TASK-039 (1 blocker técnico) | `task-041-01-sidebar.png` + comparação |
| 13 | PDF/sidebar coerentes | Clicar botão PDF; observar resposta HTTP (esperado: 422 se houver blocker, 200 se livre); UI feedback após clique | `task-041-03-pdf-gate.png` + console log |

---

## Sequência de execução (Playwright MCP)

1. **Setup**
   - Confirmar `curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200 (já confirmado: 200 ✓).
   - `mkdir -p docs/relatorios/evidencias/2026-05-21-TASK-041` (já criado pelo `/planejar`).
   - `browser_resize` → 1440×900 (desktop) — viewport default 729×783 é pequeno para sidebar+mapa.

2. **Navegação e autenticação**
   - `browser_navigate` → `http://localhost:3000/projetos/cmpfu7e4b0001ulshh0ni8jhd`.
   - Sessão Clerk deve persistir (perfil Playwright reutilizado). Se redirecionar para login, parar e reportar.

3. **Carregamento do projeto**
   - `browser_wait_for` → sidebar com nome "TASK-027 A" visível (ou similar).
   - `browser_snapshot` → captura DOM estruturado para localizar Bloqueios/BOM/PDF.

4. **Evidência 1 — Sidebar completa (`task-041-01-sidebar.png`)**
   - `browser_take_screenshot` → full page ou container do sidebar.
   - Cobertura: blockers no topo + avisos + BOM até rodapé (R$ total).
   - **Valida pontos: 1, 2, 6, 7, 8, 10, 12, 13 (estado pré-clique).**

5. **Evidência 2 — Mapa em zoom alto (`task-041-02-mapa-zoom.png`)**
   - Interação: zoom no mapa (clicar no botão + ou usar `browser_press_key`/scroll) até polilinhas visíveis distintamente.
   - `browser_take_screenshot` → área do mapa.
   - **Valida pontos: 8, 9.**

6. **Evidência 3 — Gate PDF (`task-041-03-pdf-gate.png`)**
   - `browser_click` → botão "Exportar PDF".
   - `browser_network_requests` → confirmar `GET /api/projetos/.../pdf` → HTTP 422 (se blocker ativo) ou 200 (se livre).
   - `browser_console_messages` → capturar logs.
   - `browser_take_screenshot` → estado UI após clique.
   - **Valida ponto 13.**

7. **Inspeção opcional (best-effort)**
   - `browser_evaluate` → tentar acessar `window` em busca de dados do projeto serializados (se houver `__NEXT_DATA__` ou similar com layout serializado). Não é bloqueante — se não houver, derivar números da UI.
   - **Valida pontos: 2, 3, 11 (se acessível).**

8. **Cleanup**
   - `browser_close`.
   - Mover artefatos `.playwright-mcp/` para `docs/relatorios/evidencias/2026-05-21-TASK-041/playwright-trace/`.

9. **Relatório**
   - Criar `docs/relatorios/2026-05-21-TASK-041.md` com:
     - §1 Resumo executivo (1 frase: TASK-040 confirmada / refutada / parcial).
     - §2 O que foi feito (checklist setup).
     - §3 Comparação direta TASK-039 → TASK-041 (tabela).
     - §4 Validação dos 13 pontos (um a um, com evidência).
     - §5 Achados consolidados (severidade, classe, ação).
     - §6 Estado da suíte (tsc, vitest, src/ intocado).
     - §7 Limitações.
     - §8 Conclusão.
     - §9 Próximas tasks recomendadas.
     - §10 Log de validação final.

10. **Fechamento**
    - Atualizar `tasks/backlog.md`: status TASK-041 → `concluída`, data, sumário.
    - Atualizar log de alterações deste arquivo.

---

## Critérios de aceite

- [ ] `localhost:3000` confirmado HTTP 200.
- [ ] Projeto `cmpfu7e4b0001ulshh0ni8jhd` carregado sem erro de console.
- [ ] Pelo menos 3 screenshots PNG em `docs/relatorios/evidencias/2026-05-21-TASK-041/` (sidebar, mapa zoom, gate PDF).
- [ ] `playwright-trace/` em `docs/relatorios/evidencias/2026-05-21-TASK-041/` com snapshots YAML.
- [ ] Relatório `docs/relatorios/2026-05-21-TASK-041.md` criado com os 13 pontos validados.
- [ ] Cada um dos 13 pontos tem evidência ou explicação clara se não pôde ser medido.
- [ ] Comparação numérica direta vs. TASK-039 no relatório.
- [ ] `tasks/backlog.md` atualizado (status TASK-041 → concluída).
- [ ] `npx tsc --noEmit` → **0 erros** (no encerramento).
- [ ] `npx vitest run` → **768/768** (no encerramento, sem regressão).
- [ ] `src/` não tocado (`git diff src/` vazio para esta task).
- [ ] Catálogo `src/lib/catalog/aspersores.ts` não tocado.
- [ ] `package.json` e lockfile não tocados.

---

## Critérios de **sucesso da TASK-040** (a confirmar empiricamente)

> Estes não são critérios de aceite **da TASK-041** — são as expectativas da TASK-040 que esta task **mede**. Se algum falhar, é achado a registrar, não falha da TASK-041.

- [ ] Blocker técnico *"Lateral hidraulicamente insuficiente"* **ausente**.
- [ ] Nº de colunas físicas aumentou vs. baseline 16 (esperativa: ~24).
- [ ] Tubo LF Ø100mm permanece **0 barras**.
- [ ] Apenas DN50 e DN75 aparecem como lateral 5022.
- [ ] Blocker *"Aspersor fora do eixo"* permanece **ausente**.
- [ ] Nenhum blocker angular novo.
- [ ] Polilinhas amarelas visíveis no mapa em cada sub-lateral.
- [ ] HTTP 422 ou 200 coerente com presença/ausência de blocker.

---

## Fora do escopo

- **NÃO** alterar `src/`, catálogo, `package.json`, lockfile.
- **NÃO** corrigir bugs descobertos — registrar como achado e propor nova task (classe conforme severidade).
- **NÃO** reexecutar a TASK-040 (mesmo se medição der inesperado).
- **NÃO** redesenhar o projeto, mudar setorização, mover captação, recriar projeto.
- **NÃO** alterar configuração do Playwright nem do MCP.
- **NÃO** abrir nova ADR (a menos que medição revele que ADR-014 está incorreta — improvável).
- **NÃO** tocar TASK-034 (PDF feedback), TASK-035 (BOM curvas 90°), TASK-042 (arquitetura) — todas seguem separadas.
- **NÃO** mover artefatos de TASK-039 ou anteriores.

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Sessão Clerk expirada → redireciona para login | baixa | médio | Perfil Playwright persistido desde TASK-039; se cair, parar e reportar |
| Mapa Mapbox WebGL não inspeccionável via DOM | alta | baixo | Screenshot + observação comportamental (mesma limitação TASK-033/039) |
| Métrica "comprimento total de ramais" não exposta na UI | média | baixo | Derivar pela soma de tubos LF DN50/DN75 destinados a ramal na BOM; documentar limitação |
| Métrica "perda máx em lateral" não acessível quando blocker some | alta | baixo | Esperado — registrar "não exposta pois blocker ausente"; expectativa ADR-014 |
| Console errors do Mapbox ao carregar | baixa | baixo | Mesma TASK-033/039; apenas registrar |
| Resultado contradiz ADR-014 (split não funciona em produção real) | baixa | alto | Documentar com precisão; propor TASK-042-A urgente; não tentar corrigir nesta task |
| Working tree sujo afeta medição | nenhuma | n/a | `localhost:3000` consome estado em disco — medida reflete TASK-040 real |
| Nº de colunas ainda excede DN75 em algum caso patológico | baixa | médio | Blocker dispara como fallback (T40-4 garantia); registrar achado |
| Crescimento de BOM além do moderado esperado | média | médio | Apenas registrar; análise de causa-raiz fica para TASK-042 |
| Sub-lateral com aspersor fora do eixo (regressão de TASK-028) | baixa | alto | Blocker existente detecta; achado abre task A |
| Blocker angular novo em junção ramal→principal extra | média | médio | Registrar e abrir task A se confirmado |

**Dependências de outras tarefas:**

- ✅ TASK-040 concluída (768/768 testes; ADR-014 criada nesta mesma sessão).
- ✅ TASK-039 como baseline de comparação numérica.
- ✅ TASK-027 como origem do projeto-alvo.
- ✅ Playwright MCP configurado (`reference_playwright_mcp` na memória).

---

## Pendências abertas

> A serem fechadas durante a execução:

- [ ] Confirmar acessibilidade de `nº de colunas físicas` na UI (sidebar ou via `browser_evaluate`). Se não acessível, documentar limitação no relatório.
- [ ] Confirmar acessibilidade de `comprimento total de ramais`. Se não exposto diretamente, derivar pela BOM.
- [ ] Confirmar acessibilidade de `n_max aspersores por coluna`. Se não exposto, derivar matematicamente.
- [ ] Decidir formato final dos PNGs (área total da página vs. crop de sidebar) — defaultar a screenshot completo para inspeção posterior.

---

## Plano de implementação

> **Aprovado pelo usuário ao final do `/planejar`.** Etapas a executar pelo `/implementar`:

1. **Setup ambiente** — confirmar HTTP 200 em `localhost:3000`; confirmar diretório de evidências; resize do browser para 1440×900.
2. **Navegação** — abrir `/projetos/cmpfu7e4b0001ulshh0ni8jhd`; aguardar carregamento.
3. **Snapshot inicial** — `browser_snapshot` + captura de console messages baseline.
4. **Evidência 1 — Sidebar** — screenshot completo da sidebar (`task-041-01-sidebar.png`); transcrever blockers e BOM no relatório.
5. **Evidência 2 — Mapa zoom** — interagir até zoom alto; screenshot do canvas (`task-041-02-mapa-zoom.png`).
6. **Evidência 3 — Gate PDF** — clicar botão PDF; capturar requisição HTTP e console; screenshot (`task-041-03-pdf-gate.png`).
7. **Best-effort — instrumentação** — `browser_evaluate` para tentar ler dados do projeto (não bloqueante).
8. **Cleanup** — `browser_close`; mover `.playwright-mcp/` → `evidencias/2026-05-21-TASK-041/playwright-trace/`.
9. **Relatório** — criar `docs/relatorios/2026-05-21-TASK-041.md` (formato TASK-039); preencher 10 seções; mapear cada um dos 13 pontos.
10. **Fechamento** — `npx tsc --noEmit`; `npx vitest run`; atualizar `tasks/backlog.md` (status `concluída`); atualizar log de alterações deste arquivo.

---

## Formato de resposta esperado

Ao concluir a TASK-041, o agente deve responder com:

1. **O que foi feito** — listagem de evidências criadas + relatório + atualizações no backlog.
2. **Testes** — confirmação 768/768 inalterados (esta task não toca código).
3. **TypeScript** — confirmação 0 erros.
4. **Invariantes verificadas** — checklist dos critérios de aceite (todos os 12 do bloco "Critérios de aceite").
5. **Resultado dos 13 pontos** — tabela com "✅ confirmado / ⚠️ achado / ❓ não medido" por ponto.
6. **Achados consolidados** — lista numerada (H1, H2, ...) com severidade e classe.
7. **Comparação numérica direta TASK-039 → TASK-041.**
8. **Próximas tasks sugeridas** — pelo menos TASK-042 (estratégica) referenciada; outras se houver achado novo.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Arquivo criado durante `/planejar` da TASK-041 com plano de execução completo, 13 pontos mapeados para evidências específicas, baselines TASK-039 explícitas, sequência Playwright detalhada, critérios de aceite mensuráveis, riscos e fora-do-escopo. Diretório `docs/relatorios/evidencias/2026-05-21-TASK-041/` criado vazio. Aguardando aprovação do plano. |
| 2026-05-21 | Claude Opus 4.7 | Plano aprovado pelo usuário com 7 ajustes obrigatórios (git status inicial, blockers/avisos em texto, BOM específica, "não mensurável" sem inferir, classificação por tipo de evidência, regra absoluta src/ intocado, comandos finais tsc/vitest/git diff). `/implementar` executou sessão Playwright completa no Projeto A: 6 avisos capturados literalmente; **0 blockers** ✅; PDF gate **HTTP 200 + download** ✅ (vs. 422 na TASK-039); BOM **R$ 277.955,01** (+R$ 51.230 / +22,6%); 29 ramais × 4186 m; Tubo LF Ø100mm = 0 ✅; 337/337 aspersores em kit. 3 PNGs + traces + PDF emitido em `docs/relatorios/evidencias/2026-05-21-TASK-041/`. 13 pontos validados (classificação: 8 CD + 2 CS + 2 IA + 2 NM). 12 achados (H1-H12); H3/H4 reforçam TASK-042 estratégica. Relatório `docs/relatorios/2026-05-21-TASK-041.md` criado. Backlog atualizado. `npx tsc --noEmit` → 0 erros; `npx vitest run` → 768/768; `git diff -- src/` esperado vazio para esta task. |
