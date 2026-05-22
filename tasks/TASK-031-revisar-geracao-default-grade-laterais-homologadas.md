# TASK-031 — Revisar geração default de grade vs. laterais homologadas

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** domínio / hidráulica / catálogo / governança
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 759/759 testes · 0 erros tsc · catálogo intocado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-031.md`](../docs/relatorios/2026-05-21-TASK-031.md)
**ADR:** [`ADR-013 — Restrição de DN homologado por aspersor via subset filtrado`](../docs/decisoes/ADR-013-restricao-dn-homologado-aspersor-subset-filtrado.md) (criada em 2026-05-21)
**Absorve:** TASK-025 (marcada como `superseded`)

---

## Objetivo

> Restringir a seleção hidráulica de laterais ao subset homologado para o aspersor 5022 (DN50 e DN75) **no nível do seletor**, eliminando a possibilidade de DN100 ser selecionado como lateral. Quando DN50/DN75 não atenderem perda de carga ou velocidade, o seletor deve produzir **blocker técnico claro** em vez de cair para fallback de maior DN. Investigar empiricamente a causa do crescimento de BOM (+23,6%) e do tubo LF Ø100mm (+240 barras) identificado na TASK-033, e corrigir geração default para produzir solução compatível com laterais homologadas e sem explosão artificial de material.

---

## Contexto

A **TASK-023** implementou a trava de segurança na BOM: DN ≠ 50/75 → blocker comercial *"BOM incompleta — DN de lateral não homologado para kit do aspersor 5022"*. Porém, esse blocker é **downstream** do seletor; ele aparece **depois** que o seletor já escolheu DN100.

A **TASK-028** corrigiu o blocker "Aspersor fora do eixo da lateral física" introduzindo `routeCoords` (polilinha 0°/90°). A polilinha aumenta o comprimento físico das laterais (somando trechos horizontais das dobras), o que muda as condições de perda de carga e velocidade — e o seletor passou a escolher Ø100mm em mais colunas.

A **TASK-033** confirmou empiricamente no Projeto A da TASK-027 (Barreiras/BA):

| Indicador | TASK-027 | TASK-033 | Δ |
|-----------|----------|----------|---|
| Blocker "fora do eixo" | ✗ | ✓ resolvido | — |
| Blocker "BOM kit 5022" | 199 asp | 217 asp | +18 |
| Tubo LF Ø100mm | 385 barras | 625 barras | **+240** |
| BOM total | R$ 207.952 | R$ 257.089 | **+R$ 49.136 (+23,6%)** |
| HMT mínima | 39,1 mca | 40,7 mca | +1,6 |

**Hipótese a investigar:** o crescimento do Ø100mm LF (+240 barras) tem duas componentes plausíveis:
1. **Polilinha legítima** — TASK-028 acrescenta tubo real nas dobras (esperado).
2. **Over-spec do DN** — o seletor passou a escolher Ø100 onde antes escolhia Ø75/Ø50 porque a nova perda calculada (com comprimento maior) ultrapassa o limite e o seletor sobe o DN.

Se a hipótese 2 estiver correta, **restringir o seletor a DN50/DN75 + emitir blocker quando insuficiente** resolve o problema upstream: colunas com muitos aspersores que hoje viram Ø100 (não homologado) passariam a gerar blocker técnico claro, forçando reprojeto operacional (mais setores, menos aspersores por coluna) em vez de violar a regra.

**Histórico relevante:**

- TASK-023 — Kit de ligação aspersor 5022 por DN da lateral (DN50/DN75 homologados)
- TASK-025 — Restringir seleção hidráulica (escopo absorvido por esta task)
- TASK-024D — Roteiro mínimo de validação; passos 3, 5 e 6 estão bloqueados aguardando TASK-025/TASK-031
- TASK-028 — Lateral física como polilinha 0°/90°
- TASK-033 — Revalidação visual; G2/G3 são causas-raiz desta task

---

## Arquivos impactados

> Levantamento preciso no `/planejar`. Lista preliminar:

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `src/lib/layout/laterais.ts` | modificação | Provável: alterar `selectLateralTube()` para receber catálogo já filtrado e retornar `{ ok: false, motivo }` em vez de fallback silencioso; possivelmente expor flag `lateralHomologated` no `PhysicalColumn`/`Lateral`. |
| `src/lib/layout/irrigation-project.ts` | modificação | Filtrar `TUBOS_PVC_LF` a `[DN50, DN75]` antes de passar para `generatePhysicalColumns` e `deriveLateraisFromNetwork`. **Sem alterar `TUBOS_PVC_LF` global.** |
| `src/lib/bom.ts` | possível modificação | Refletir novo blocker técnico (perda/velocidade DN50/DN75 insuficiente) — sem remover o blocker existente do kit 5022. |
| `src/lib/layout/__tests__/*.test.ts` | criação | Testes novos cobrindo: (a) DN100 nunca selecionado para lateral; (b) blocker quando DN50/DN75 não atende; (c) BOM não explode artificialmente quando seletor é restrito. |
| `src/lib/catalog/aspersores.ts` | **inalterado** | Não remover SKUs; não renomear DN100. |
| `src/components/`, PDF, mapa | **inalterado** | Regra explícita. |

---

## Critérios de aceite

> Detalhamento mensurável após `/planejar`. Critérios estruturais:

- [ ] `generatePhysicalColumns` e `deriveLateraisFromNetwork` recebem catálogo filtrado a DN50/DN75 quando aspersor é 5022 — `TUBOS_PVC_LF` global **inalterado**.
- [ ] Nenhuma lateral selecionada com `diametroMm > 75` para aspersor 5022.
- [ ] Quando DN50 e DN75 falham (perda > limite OU velocidade > 2,5 m/s), o seletor produz **blocker técnico** com texto explicando: nº aspersores, vazão, perda calculada, velocidade calculada, e ação sugerida (reduzir aspersores por coluna).
- [ ] Blocker existente *"BOM incompleta — DN de lateral não homologado para kit do aspersor 5022"* **deixa de disparar** para colunas atendidas (porque DN100 não é mais escolhido); permanece como fallback se algum caminho não-filtrado escapar.
- [ ] No Projeto A da TASK-027 (Barreiras/BA): blocker do kit 5022 **resolvido ou reduzido**; tubo LF Ø100mm em laterais **= 0 barras** (Ø100mm continua válido em principal/adutora/ramais, não em lateral).
- [ ] BOM no Projeto A não cresce artificialmente — verificação quantitativa pós-implementação contra baseline TASK-033.
- [ ] `npx tsc --noEmit` → **0 erros**.
- [ ] `npx vitest run` → sem regressão (≥ 747 testes passando).
- [ ] Catálogo `src/lib/catalog/aspersores.ts` **inalterado** (`git diff src/lib/catalog/` vazio para a TASK-031).
- [ ] PDF, mapa, motor A/B/C, `ASPERSOR_PADRAO`, espaçamento 12×12 **inalterados**.
- [ ] TASK-035 (BOM curvas 90°) **não tocada**.

---

## Testes obrigatórios

> Mínimo N ≥ 5. Lista preliminar definida no `/planejar`:

1. **Lateral 5022 — catálogo filtrado nunca contém DN100** — invariante do filtro.
2. **Lateral n=10 cabe em DN75** — caso ok que antes (sem filtro) podia escolher Ø100 por margem.
3. **Lateral n=20 — DN75 ainda atende ou gera blocker técnico claro** — limite superior do DN75.
4. **Lateral com vazão acima do DN75 → blocker técnico explícito** — fallback proibido.
5. **`pdfEmissionBlockers` inclui o blocker técnico** — gate de governança.
6. **Cenário projeto-tipo Barreiras (sintético): nenhuma lateral Ø100; BOM Ø100 LF = 0** — regressão do achado G3 da TASK-033.

---

## Fora do escopo

- **Não** alterar `src/lib/catalog/aspersores.ts` (nem `TUBOS_PVC_LF` global).
- **Não** remover/renomear SKUs ou DN100.
- **Não** alterar `ASPERSOR_PADRAO` (5022-SD).
- **Não** alterar espaçamento 12×12.
- **Não** alterar PDF (texto, layout, gate 422).
- **Não** alterar mapa.
- **Não** alterar feedback visual do PDF (TASK-034).
- **Não** mexer em TASK-035 (BOM de curvas 90°).
- **Não** inventar SKU.
- **Não** alterar motor A/B/C (`ProjectClassificationEngine`).
- **Não** alterar `TOLERANCIA_ASPERSOR_EIXO_LATERAL`, `ROUTE_BUILD_TOL_X_M` ou outras tolerâncias da TASK-028.
- **Não** retroceder a TASK-028 (laterais continuam polilinhas).

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| DN50/DN75 não atendem em colunas com muitos aspersores → blocker dispara em projetos antes "ok" | alta | médio (é comportamento correto) | Texto do blocker deve explicar causa e ação sugerida (reduzir aspersores/coluna ou setorizar) |
| Otimizer de layout score muda — candidato escolhido difere | média | médio | Validar no Projeto A da TASK-027 que candidato final continua razoável; rodar `vitest` completo |
| Solver hidráulico (`hydraulic-sizing.ts`) consome `lateral.selecao.tubo` — pode encontrar caso de "lateral sem seleção válida" | média | alto | Definir contrato: quando seletor falha, `selecao` ainda tem um tubo (DN75 maior do subset) mas flag `homologado=false` ou similar; blocker técnico domina; solver não falha |
| Polilinha `routeCoords` (TASK-028) já depende de seletor para `comprimentoM` real — ciclo | baixa | alto | Investigar sequência: rota → comprimento → DN → blocker; manter sequência atual |
| BOM perde itens caso o blocker técnico não emita SKUs corretos | média | médio | Plano deve detalhar como BOM se comporta no estado de blocker — manter contagem visível mesmo sem proposta válida |
| Testes existentes podem regredir se mudaram seleção esperada | alta | médio | `npx vitest run` ao fim; ajustar fixtures de teste apenas para refletir novo comportamento (sem mascarar regressão real) |

**Dependências:** TASK-023 ✅, TASK-028 ✅. Sem bloqueios.

---

## Pendências abertas

> A serem fechadas no `/planejar`:

- [ ] Decidir representação do blocker técnico (texto, severidade, campo no `Lateral`/`PhysicalColumn`).
- [ ] Decidir comportamento do solver hidráulico quando `selecao` é fallback (DN máximo do subset com perda excedida).
- [ ] Decidir se `selectLateralTube` muda assinatura ou apenas o subset passado.

---

## Plano de implementação

> **Preenchido pelo `/planejar` antes de qualquer edição.** As 11 perguntas obrigatórias serão respondidas no plano:
>
> 1. Onde o seletor hidráulico de laterais escolhe DN hoje.
> 2. Por que LF Ø100mm aparece como lateral.
> 3. Por que o kit 5022 cresceu para 217.
> 4. Se o aumento da BOM é efeito correto do comprimento real ou erro de geração.
> 5. Como restringir apenas laterais físicas 5022 para DN50/DN75.
> 6. O que acontece se DN50/DN75 não atenderem perda/velocidade.
> 7. Quais blockers/diagnósticos serão gerados.
> 8. Quais arquivos serão alterados.
> 9. Quais testes serão criados.
> 10. Quais riscos existem.
> 11. O que não será feito.

---

## Formato de resposta esperado

Ao concluir, o agente deve responder com:

1. **O que foi feito** — arquivos modificados em `src/lib/layout/` (e `src/lib/bom.ts` se necessário); catálogo intocado.
2. **Testes** — contagem antes vs. depois; nomes dos testes novos.
3. **TypeScript** — confirmação de 0 erros.
4. **Invariantes verificadas** — checklist dos critérios de aceite.
5. **Números de sanidade** — Projeto A da TASK-027: tubo LF Ø100mm antes vs. depois; blocker kit 5022 antes vs. depois; BOM total antes vs. depois.
6. **Pendências abertas** — TASK-035, TASK-034 (continuam separadas).
7. **Próximos passos sugeridos** — revalidação visual (TASK-039? ou ampliar TASK-033 com nova rodada).

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Tarefa criada após `/iniciar-task`. Absorve escopo da TASK-025 (marcada `superseded`). Endereça G2/G3 da TASK-033. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` produziu plano com 11 perguntas respondidas. Aprovado com 10 ajustes obrigatórios pelo usuário. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` concluído: `getCatalogoLateraisHomologadas5022()` exportado em `laterais.ts`; `selectLateralTube` retorna `lateralCapacity`; `PhysicalColumn`/`Lateral` ganham campo obrigatório; `detectLateralCapacityViolations` + tipos novos; orquestrador usa subset filtrado nas 2 chamadas; `bom.ts` emite blocker técnico com texto/ações literais aprovadas; 9 fixtures atualizadas; novo `lateral-capacity.test.ts` com 12 testes pela superfície pública. 747 → 759 testes, 0 erros tsc. **Catálogo `aspersores.ts` não tocado** (mtime confirmado). |
| 2026-05-21 | Claude Opus 4.7 | `/fechar-task`: relatório `docs/relatorios/2026-05-21-TASK-031.md` criado; backlog atualizado (status `concluída`, cabeçalho 759/759). Sem premissa nova (regra do kit 5022 vem da TASK-023). ADR-013 sugerido. Pendências: TASK-039 (revalidação visual), TASK-035 e TASK-034 (separadas). |
