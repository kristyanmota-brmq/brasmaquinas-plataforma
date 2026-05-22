# TASK-039 — Revalidação visual pós-TASK-031

**Status:** `concluída` (aprovada — TASK-031 confirmada empiricamente)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / hidráulica
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 759/759 testes · 0 erros tsc · `src/` não alterado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-039.md`](../docs/relatorios/2026-05-21-TASK-039.md)

---

## Objetivo

> Validar no browser real, via Playwright MCP, o impacto da TASK-031 (restrição de DN homologado para lateral 5022 + blocker técnico) no Projeto A em Barreiras/BA (`cmpfu7e4b0001ulshh0ni8jhd`). Confirmar empiricamente as hipóteses do relatório `2026-05-21-TASK-031.md`: tubo LF Ø100mm cai a zero, blocker antigo do kit 5022 silencia, blocker técnico novo aparece **apenas se** DN50/DN75 não atenderem, BOM total reduz vs. R$ 257.089 da TASK-033. **Nenhum arquivo em `src/` é alterado.**

---

## Contexto

Sequência das tasks visuais sobre o mesmo projeto:

| Task | Estado registrado |
|------|-------------------|
| TASK-027 (baseline) | 2 blockers (eixo + kit 5022); BOM R$ 207.952; 21 laterais com desvio máximo 7,00 m |
| TASK-028 (correção lateral polilinha) | Eliminou blocker de eixo via `routeCoords`; mas inflou BOM por over-spec downstream |
| TASK-033 (revalidação pós-028) | 1 blocker remanescente (kit 5022 = 217 aspersores); BOM R$ 257.089; tubo Ø100mm LF = 625 barras; novo aviso PN/HMT |
| TASK-031 (restrição DN) | Subset DN50/DN75 upstream via `getCatalogoLateraisHomologadas5022()`; blocker técnico novo disparável; blocker antigo defensivo |
| **TASK-039 (esta)** | Medir empiricamente o efeito da TASK-031 no mesmo projeto real |

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `tasks/TASK-039-revalidacao-visual-pos-task-031.md` | criação | este arquivo |
| `docs/relatorios/2026-05-21-TASK-039.md` | criação | relatório de achados |
| `docs/relatorios/evidencias/2026-05-21-TASK-039/` | criação | screenshots e traces |
| `tasks/backlog.md` | modificação | inserir entrada TASK-039 |
| `src/**/*` | **inalterado** | regra explícita |
| `package.json`, lockfiles | **inalterados** | regra explícita |

---

## Pontos obrigatórios de validação

1. **Tubo LF Ø100mm = 0 barras** — verificação principal (filtro upstream da TASK-031).
2. **Blocker antigo "BOM incompleta — DN não homologado para kit 5022"** ausente da sidebar.
3. **Blocker técnico "Lateral hidraulicamente insuficiente para o aspersor 5022"** presente **apenas se** alguma coluna excede DN75 (esperado: pode aparecer ou não).
4. **BOM total reduziu** em relação aos R$ 257.089 da TASK-033.
5. **Nenhum novo blocker hidráulico** inesperado introduzido pela TASK-031.
6. **Sidebar e PDF** continuam coerentes (gate 422 funcionando quando há blocker).
7. **Laterais continuam passando pelos aspersores** (TASK-028 não retrocedida).
8. **`routeCoords` renderizado corretamente no mapa** (polilinha visível, não reta).

---

## Critérios de aceite

- [ ] Servidor `localhost:3000` confirmado ativo.
- [ ] Projeto `cmpfu7e4b0001ulshh0ni8jhd` confirmado presente.
- [ ] Cada um dos 8 pontos observados com evidência (snapshot DOM ou screenshot).
- [ ] Tabela comparativa TASK-027 → TASK-033 → TASK-039 produzida.
- [ ] Achados classificados por severidade (Crítico/Alto/Médio/Baixo) e ação recomendada.
- [ ] Conclusão geral: TASK-031 confirmada / parcialmente confirmada / regressão observada.
- [ ] `npx vitest run` continua **759/759**; `npx tsc --noEmit` continua **0 erros** (validação não altera código).
- [ ] Nenhum arquivo em `src/` foi modificado.

---

## Fora do escopo

- Corrigir bugs encontrados durante a validação.
- Alterar `src/`, catálogo, motor A/B/C, PDF, schemas Prisma, rotas de API.
- Recriar projeto sem autorização.
- Reabrir TASK-035 (BOM curvas 90°) ou TASK-034 (PDF feedback).
- Validar F1/F3/F4/F5 da TASK-027 (escopo de tasks separadas).

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Banco resetado entre sessões | baixa | alto | Verificar antes; abortar se ausente; pedir autorização para recriar |
| Servidor dev derrubado | baixa | médio | Verificar HTTP 200 antes de navegar |
| Sessão Clerk expirada no profile Playwright | média | baixo | Pedir login manual se necessário (mesmo fluxo da TASK-027/TASK-033) |
| Hipótese "Ø100mm = 0" falhar (regressão real) | baixa | crítico | Registrar como achado A; recomendar revisão imediata da TASK-031 |
| Blocker técnico aparecer e ser severo (DN75 não atende em projeto default) | média | médio | Registrar com mensagem exata e ações sugeridas; sugerir TASK de calibração se necessário |
| BOM aumentar em vez de reduzir | baixa | alto | Registrar e investigar — pode indicar over-spec em outras camadas |

**Dependências:** TASK-031 concluída (sim). Servidor dev rodando. Banco com Projeto A persistido.

---

## Plano de execução

1. Pré-checagens: servidor + diretório de evidências (já feito).
2. Navegação `/projetos`; verificar projeto presente.
3. Abrir projeto; capturar snapshot completo da sidebar.
4. Comparar lista de blockers com TASK-033 (era 1 blocker do kit 5022).
5. Capturar BOM total e detalhamento de tubos LF (foco em Ø100mm).
6. Screenshots do mapa em zoom alto para validar `routeCoords` e laterais sobre aspersores.
7. Testar gate PDF.
8. Capturar console (erros/warnings).
9. Compilar relatório com tabela comparativa e achados.
10. Atualizar TASK-039.md (status `concluída`) e backlog.

---

## Formato de resposta esperado

Ao concluir:

1. **O que foi feito** — navegação, capturas, inspeção DOM.
2. **Pontos validados** — 8/8 ou justificativa para os não cobertos.
3. **Tabela comparativa** TASK-027 → TASK-033 → TASK-039.
4. **Achados** — severidade + ação recomendada.
5. **Estado da suíte** — `tsc` e `vitest` reconfirmados.
6. **Conclusão** — TASK-031 confirmada / parcial / regressão.
7. **Próximas tasks** — TASK-035, TASK-034, ou novas conforme achados.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Tarefa criada após `/iniciar-task`. Validação empírica do impacto da TASK-031 no Projeto A real. |
| 2026-05-21 | Claude Opus 4.7 | Execução: navegação Playwright MCP ao Projeto A; 3 screenshots + 11 traces. **TASK-031 confirmada empiricamente**: Tubo Ø100mm LF = 0 barras (era 625); blocker antigo kit 5022 ausente (era 217 asp); blocker técnico novo presente (8 colunas excedem DN75; perda máx 33.10 mca; vel máx 3.57 m/s); BOM R$ 226.725 (−R$ 30.364 vs. TASK-033, −11,8%); 100% dos aspersores agora em kit homologado (337/337). Gate PDF 422 funciona. F1 da TASK-027 (sem feedback UI) persiste — TASK-034 separada. 9 achados (H1–H9): H5/H6 viram TASK-040 (sugerida — revisar geração default para colunas densas). Relatório: `docs/relatorios/2026-05-21-TASK-039.md`. |
