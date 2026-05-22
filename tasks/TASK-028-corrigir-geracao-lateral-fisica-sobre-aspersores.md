# TASK-028 — Corrigir geração automática da lateral física sobre os aspersores

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 747/747 testes · 0 erros tsc · catálogo intocado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-028.md`](../docs/relatorios/2026-05-21-TASK-028.md)
**ADR:** [`ADR-012 — Lateral física como polilinha construtível 0°/90°`](../docs/decisoes/ADR-012-lateral-fisica-polilinha-construtivel-0-90.md) (criada em 2026-05-21)

---

## Objetivo

> O motor de geração da lateral física deve produzir, automaticamente, uma rota que **passa por todos os aspersores atendidos pela lateral**. A lateral pode ser polilinha (não precisa ser reta). O blocker existente *"aspersor fora do eixo da lateral física"* permanece como fallback de segurança — disparado apenas quando o motor não conseguir construir geometria válida.

---

## Contexto

A regra operacional da Brasmáquinas é: **a vala da lateral é o mesmo local onde o aspersor será instalado**. Portanto, todo aspersor precisa estar sobre uma lateral física. Hoje:

- O sistema gera blocker quando detecta aspersor fora do eixo da lateral (TASK-018, TASK-019, TASK-020).
- A premissa `TOLERANCIA_ASPERSOR_EIXO_LATERAL` (0,10 m) está como regra **APROVADA** pela operação.
- A validação visual da [`TASK-027`](TASK-027-validacao-browser-fluxo-projeto.md) mostrou que o **fluxo default gera blocker** já no projeto base: o motor não está construindo a lateral sobre a coluna de aspersores — está construindo uma reta canônica que pode passar até **7.00 m** longe dos aspersores (achado F7 do relatório TASK-027).

**Decisão de produto:** o blocker não pode ser a solução principal. O motor deve gerar a lateral física passando pelos aspersores; o blocker existente continua, mas como trava de segurança quando o motor não conseguir.

**Histórico relevante:**
- TASK-013: Auditar e corrigir laterais físicas construtíveis
- TASK-017: Corrigir lateral física para rota reta/construtível
- TASK-018: Corrigir eixo canônico das laterais físicas
- TASK-019: Integrar desvio aspersor-eixo da lateral em diagnostics
- TASK-020: ADR-011 — Aspersor obrigatoriamente sobre lateral física
- TASK-027 — F6/F7: identificou que o caminho feliz default falha por causa da geometria da lateral

---

## Arquivos impactados

> Levantamento preciso pelo `/planejar`. Lista preliminar baseada na arquitetura conhecida:

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `src/lib/layout/laterais.ts` | modificação | provável local da geração da lateral física |
| `src/lib/layout/physical-connections.ts` | possível modificação | geometria construtível ramal-lateral |
| `src/lib/layout/irrigation-project.ts` | possível modificação | orquestração; sem mudar contrato externo |
| `src/lib/layout/__tests__/*.test.ts` | criação de testes novos | cobertura da nova rota da lateral |
| `src/components/map/ProjectMap.tsx` | **apenas** se necessário para renderizar `routeCoords` já vindas do domínio | sem lógica de domínio na UI |

**NÃO impactados:** `src/lib/catalog/`, `src/app/api/projetos/[id]/pdf/`, motor A/B/C, `src/lib/bom.ts` (exceto se a polilinha exigir recálculo de comprimento já consumido por BOM — a ser validado no plano).

---

## Critérios de aceite

> Detalhamento mensurável após `/planejar`. Critérios estruturais já definidos:

- [ ] A lateral física gerada automaticamente passa por **todos os aspersores** da coluna física correspondente (desvio ≤ `TOLERANCIA_ASPERSOR_EIXO_LATERAL` = 0,10 m).
- [ ] A rota da lateral usa **apenas ângulos construtíveis 0° e 90°** (rede interna) — proibido 45° ou ângulos livres em lateral.
- [ ] O comprimento físico da lateral é recalculado conforme a rota real (polilinha), não conforme a reta canônica.
- [ ] O blocker existente *"aspersor fora do eixo da lateral física"* **permanece** ativo e disparável — só não dispara quando o motor consegue construir a rota.
- [ ] Se o motor não conseguir construir geometria válida para uma coluna, o blocker dispara como fallback (caminho atualmente em produção).
- [ ] `npx tsc --noEmit` → 0 erros.
- [ ] `npx vitest run` → sem regressão (≥ 738 testes passando).
- [ ] Nenhum SKU do catálogo alterado.
- [ ] Nenhuma lógica de domínio movida para UI.
- [ ] PDF não alterado.

---

## Testes obrigatórios

> Mínimo N ≥ 5 testes novos. Lista preliminar definida no `/planejar`:

1. **Lateral passa por todos os aspersores em coluna reta** — caso base
2. **Lateral em polilinha com dobras 90°** — aspersores desalinhados exigem dobra
3. **Recálculo de comprimento da polilinha** — soma dos segmentos vs. linha reta canônica
4. **Fallback do blocker quando motor falha** — geometria que impede construção válida
5. **Sem desvios > 0,10 m no caminho feliz** — projeto default validado pela TASK-027 não deve mais gerar o blocker
6. **Ângulos só 0°/90° em lateral** — rejeitar qualquer dobra fora desse conjunto

---

## Fora do escopo

- **Não** resolver apenas no mapa (UI).
- **Não** mascarar com tolerância maior (`TOLERANCIA_ASPERSOR_EIXO_LATERAL` continua 0,10 m).
- **Não** remover o blocker existente — ele permanece como fallback.
- **Não** alterar PDF nesta task.
- **Não** alterar catálogo nesta task.
- **Não** alterar motor A/B/C (`ProjectClassificationEngine` — fora desta task).
- **Não** alterar espaçamento 12×12.
- **Não** alterar aspersor padrão (5022-SD).
- **Não** corrigir feedback visual do PDF com blocker — remanejado para TASK-034 (ou pendência futura).

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Polilinha quebra contrato consumido por BOM/hidráulica | média | alto | Mapear todos os consumidores do comprimento da lateral antes de mudar formato; manter `lengthM` como campo derivado |
| Geometria com aspersores muito desalinhados gerar polilinha com muitas dobras 90° | média | médio | Estabelecer no plano um limite máximo de dobras por lateral; acionar blocker fallback se exceder |
| Recálculo de comprimento alterar `totalLateralLengthM` usado no otimizer (premissa provisória) | baixa | médio | Validar que o impacto no score do otimizer não desclassifica candidatos válidos |
| Render do mapa não consumir `routeCoords` (precisa ajuste UI mínimo) | alta | baixo | Ajuste explícito permitido pela regra da task — apenas para consumo de routeCoords |
| Falsa simetria entre "lateral construtível" e "rota geométrica que passa pelos aspersores" — podem divergir em casos extremos | média | médio | Cobrir ambos os casos com testes; aceitar fallback do blocker quando divergirem |

**Dependências de outras tarefas:** Nenhuma bloqueante. TASK-026-B (gate HMT) e TASK-020 (regra aspersor sobre lateral) já concluídas — base estável.

---

## Pendências abertas

> A serem fechadas no `/planejar`:

- [ ] Confirmar contrato atual da estrutura da lateral (campo `axisLngLat` reta vs. `routeCoords` polilinha — a investigar)
- [ ] Decidir representação canônica da rota (array de `[lng, lat]` vs. estrutura `{ start, end, intermediates }`)
- [ ] Decidir estratégia de fallback quando aspersores estão muito desalinhados para 90°

---

## Plano de implementação

> **Preenchido pelo `/planejar` antes de qualquer edição.** As 11 perguntas obrigatórias serão respondidas no plano:
>
> 1. Onde a lateral física é gerada hoje.
> 2. Se a lateral física hoje é reta ou já aceita routeCoords/polilinha.
> 3. Como os aspersores são agrupados por coluna física.
> 4. Como gerar uma rota da lateral que passe por todos os aspersores.
> 5. Como garantir ângulos 90°/180°.
> 6. Como recalcular comprimento da lateral.
> 7. Como o diagnóstico "aspersor fora do eixo" será preservado como fallback.
> 8. Quais arquivos serão alterados.
> 9. Quais testes serão criados.
> 10. Riscos.
> 11. O que não será feito.

---

## Formato de resposta esperado

Ao concluir, o agente deve responder com:

1. **O que foi feito** — arquivos criados/modificados em `src/lib/layout/` (sem `src/` fora desse subdiretório, exceto consumo de `routeCoords` em mapa)
2. **Testes** — contagem antes vs. depois; nomes dos testes novos
3. **TypeScript** — confirmação de 0 erros
4. **Invariantes verificadas** — checklist dos critérios de aceite
5. **Números de sanidade** — comprimento da lateral antes vs. depois; número de dobras médias
6. **Validação da TASK-027 F7** — projeto Barreiras/BA com Projeto A não deve mais gerar blocker de "aspersor fora do eixo"
7. **Pendências abertas** — o que ficou fora do escopo ou requer acompanhamento
8. **Próximos passos sugeridos** — TASK seguinte (provavelmente revalidação visual via Playwright MCP)

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Tarefa criada após `/iniciar-task`. Escopo inicial: corrigir geração da lateral física para passar pelos aspersores; blocker existente permanece como fallback. Endereça F6/F7 da TASK-027. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` produziu plano com 11 perguntas respondidas, aprovado com 7 ajustes obrigatórios pelo usuário. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` concluído: `routeCoords` adicionado a `PhysicalColumn`/`Lateral`; `buildLateralRoute()` criado; `generatePhysicalColumns` + `deriveLateraisFromNetwork` (com novo `gridAngleDegrees`/`centroid`) + `maxSprinklerAxisDeviationM` atualizados; `network-angle-diagnostics` usa primeiro/último segmento real; `ProjectMap.tsx` consome `routeCoords`. 9 testes novos em `lateral-route.test.ts`; 5 testes T19→T28 reescritos. 738 → 747 testes, 0 erros tsc. Catálogo intocado. |
| 2026-05-21 | Claude Opus 4.7 | `/fechar-task`: relatório `docs/relatorios/2026-05-21-TASK-028.md` criado; backlog atualizado; premissa `ROUTE_BUILD_TOL_X_M = 0,05 m` documentada em `12-premissas-provisorias-e-revisao-rt.md`. Pendências TASK-035 e revalidação visual registradas. |
