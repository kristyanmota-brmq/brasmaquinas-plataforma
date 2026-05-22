# TASK-040 — Revisar geração default da grade para projetos densos

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / hidráulica
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 768/768 testes · 0 erros tsc · catálogo intocado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-040.md`](../docs/relatorios/2026-05-21-TASK-040.md)
**ADR:** [`docs/decisoes/ADR-014-split-automatico-capacidade-hidraulica-lateral.md`](../docs/decisoes/ADR-014-split-automatico-capacidade-hidraulica-lateral.md)
**Absorveu:** escopo "algoritmo da grade" da TASK-032

---

## Objetivo

> Reorganizar automaticamente a geração default da grade quando colunas físicas excedem a capacidade hidráulica do DN75 (limite homologado para aspersor 5022), evitando que o blocker técnico dispare no caminho feliz default. **DN100 continua proibido em lateral 5022**; o limite hidráulico DN75 (perda ≤ 6 mca, velocidade ≤ 2,5 m/s) permanece intocado.

---

## Contexto

A TASK-039 confirmou empiricamente que a TASK-031 funcionou (Ø100mm LF = 0, blocker antigo kit 5022 ausente, BOM −R$ 30k). Mas surgiu o blocker técnico novo:

> *"Lateral hidraulicamente insuficiente para o aspersor 5022: o maior DN homologado para lateral é DN75, mas 8 coluna(s)/trecho(s) excedem perda de carga ou velocidade admissível (perda máx: 33.10 mca; velocidade máx: 3.57 m/s)..."*

**Análise quantitativa do limite DN75 (já validada via cálculo Hazen-Williams):**

| n asp | Q (m³/h) | L (m) | hf×F (mca) | V (m/s) | Status |
|-------|----------|-------|------------|---------|--------|
| 19 | 28,5 | 216,5 | 5,03 | 2,12 | OK (10% margem) |
| 20 | 30,0 | 228,5 | 5,82 | 2,23 | **limite** |
| 21 | 31,5 | 240,5 | 6,68 | 2,34 | HF excede |
| 32 | 48,0 | 372,5 | 22,07 | 3,57 | ambos excedem |
| 37 | 55,5 | 432,5 | 33,33 | 4,12 | ambos excedem |

**Diagnóstico:** projetos densos (Projeto A: 337 aspersores em 16 colunas) produzem algumas colunas com 30+ aspersores. A geração default não aplica **split por capacidade hidráulica** — apenas split por **gap geográfico** (> 1,5 × spacing). Quando a coluna é hidráulicamente longa demais para DN75, o sistema bloqueia em vez de reorganizar.

**Decisão administrativa:** o escopo "algoritmo da grade" da TASK-032 foi absorvido por esta task. TASK-032 fica restrita a tolerância/calibração.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `src/lib/layout/laterais.ts` | modificação | Adicionar lógica de split por capacidade hidráulica no pós-processamento de `generatePhysicalColumns`; nova função `splitColumnByHydraulicCapacity()`. |
| `src/lib/layout/irrigation-project.ts` | possível modificação | Ajuste se contrato mudar (improvável — split mantém invariantes de output). |
| `src/lib/layout/__tests__/grid-split-density.test.ts` | criação | Testes do split por capacidade. |
| `src/lib/catalog/aspersores.ts` | **inalterado** | Regra explícita. |
| `src/components/`, PDF, mapa | **inalterado** | Regra explícita. |
| Outros consumidores de `PhysicalColumn` | possível ajuste em testes/fixtures | Maior número de colunas pode quebrar contagens em testes existentes. |

---

## Critérios de aceite

> Detalhamento mensurável após `/planejar`. Estrutura:

- [ ] Projeto sintético tipo Barreiras (337 asp, 16 colunas iniciais): **nenhuma coluna excede DN75** após split automático.
- [ ] Blocker técnico *"Lateral hidraulicamente insuficiente..."* **não dispara** no caminho feliz default.
- [ ] Catálogo `TUBOS_PVC_LF` intocado.
- [ ] DN100 nunca aparece como lateral 5022 (regressão da TASK-031 mantida).
- [ ] Blocker técnico ainda **disparável** como fallback (caso extremo: aspersor único cabe no DN, mas algum subset patológico). T31-* preservados.
- [ ] BOM resultante: redução ou crescimento moderado vs. R$ 226.725 da TASK-039 (a medir).
- [ ] `npx tsc --noEmit` → 0 erros.
- [ ] `npx vitest run` → sem regressão (≥ 759 testes; novos testes do split).
- [ ] Nenhum SKU do catálogo alterado.
- [ ] PDF, mapa, motor A/B/C intocados.

---

## Fora do escopo

- **Não** voltar a permitir DN100 como lateral 5022.
- **Não** relaxar limite hidráulico (`MAX_VELOCITY_LATERAL_MS = 2,5`; `maxPerdaPercentual = 0,20`) sem validação do RT.
- **Não** remover blocker técnico — permanece como fallback.
- **Não** alterar catálogo, `ASPERSOR_PADRAO`, espaçamento 12×12.
- **Não** alterar PDF.
- **Não** alterar mapa (exceto consumir resultado já vindo do domínio).
- **Não** mexer em TASK-035 (BOM curvas 90°), TASK-034 (PDF feedback).
- **Não** alterar setorização operacional (TASK-032 escopo separado).
- **Não** mudar orientação automática da grade (`gridAngleDegrees`) — escopo de TASK futura se necessário.
- **Não** implementar antes do plano aprovado.

---

## Riscos preliminares

| Risco | Probabilidade | Impacto | Mitigação preliminar |
|-------|---------------|---------|----------------------|
| BOM cresce muito por excesso de ramais | média | médio | Split mínimo necessário; usar `selectLateralTube` para definir quando parar |
| `WEIGHT_FRAGMENTATION` (0,4) penaliza split — score do otimizer pode cair | alta | médio | Plano deve revisar peso ou ajustar fórmula de score |
| Split altera contagem de testes existentes (mais PhysicalColumns) | alta | médio | Catalogar testes que afirmam `cols.length === N`; ajustar onde necessário |
| Coluna patológica (poucos aspersores muito longos) não consegue split que atenda | baixa | alto | Blocker técnico fica como fallback (regressão da TASK-031 ok) |
| `generateSecondaries` precisa criar mais ramais → mais conexões na principal | confirmada | médio | Esperado; BOM aumenta em ramais e tês mas evita over-spec |
| `routeCoords` precisa ser recomputado em cada metade | alta | baixo | Já existe `buildLateralRoute` — basta chamar com subset |

---

## Pendências abertas

> A serem fechadas no `/planejar`:

- [ ] Confirmar **estratégia preferida**: split por número de aspersores (n=19 max) vs. split por capacidade (chamar `selectLateralTube` recursivamente).
- [ ] Decidir se `WEIGHT_FRAGMENTATION` deve ser ajustado nesta task ou em task de calibração.
- [ ] Definir naming convention para colunas derivadas (ex.: `col-0-a`, `col-0-b`).

---

## Plano de implementação

> **Preenchido pelo `/planejar` antes de qualquer edição.** As 11 perguntas obrigatórias serão respondidas no plano.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Tarefa criada após `/iniciar-task`. Absorve escopo "algoritmo da grade" da TASK-032. Endereça H5/H6 da TASK-039. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` produziu plano com 11 perguntas respondidas + cálculos quantitativos do limite DN75 (n_max ≈ 20). Aprovado pelo usuário com 9 ajustes obrigatórios. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` concluído: `splitByCapacity` recursivo em `laterais.ts` (sem n_max hardcoded — usa `selectLateralTube` real); `PhysicalColumn` ganhou `originalColumnIndex`/`splitIndex` para rastreabilidade; pós-processamento em `generatePhysicalColumns`; 9 testes novos em `grid-split-density.test.ts`; T31-4/5/6/8 reescritos para refletir split automático; catálogos de teste enriquecidos; constructability Suite 11a ajustada (n=18). 759 → 768 testes. Catálogo aspersores.ts NÃO tocado. |
| 2026-05-21 | Claude Opus 4.7 | `/fechar-task`: relatório `docs/relatorios/2026-05-21-TASK-040.md` criado; backlog atualizado (status `concluída`; cabeçalho 759→768; TASK-041 e TASK-042 inseridas como pendentes). Sem premissa nova. ADR-014 sugerido. |
| 2026-05-21 | Claude Opus 4.7 | Fechamento formal complementar: `ADR-014 — Split automático por capacidade hidráulica da lateral` criado em `docs/decisoes/`. Backlog atualizado (entrada TASK-040 referencia o ADR; cabeçalho do working tree menciona ADR-014). Relatório atualizado (§"ADR necessário?" e §"Pendências abertas" refletem que o ADR foi criado). Nenhum arquivo em `src/` alterado. |
