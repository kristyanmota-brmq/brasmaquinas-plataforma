# TASK-054 — BOM kind-aware para topologia sempre-sub-coletor (fishbone v12)

**Status:** `concluída`
**Concluída em:** 2026-06-11 · 951/951 testes vitest (+12 T54) · 0 erros tsc · 37/37 testes tooling
**Relatório:** `docs/relatorios/2026-06-11-TASK-054.md`
**Prioridade:** P1-crítico
**Classe:** A — BOM / domínio
**Área:** bom
**Criado em:** 2026-06-11
**Atualizado em:** 2026-06-11
**Predecessores:** TASK-053 v12 (`bd74234` — topologia espinha de peixe); TASK-056 (`184198d` — motor de qualidade); diagnóstico 2026-05-24 (B-02); NIGHTLY-EPIC-RUN 2026-05-25 (merged em `a1a875e`)

---

## Objetivo

> A BOM passa a contabilizar as conexões físicas da topologia v12 espinha de peixe (tê principal→spine_entry, junção spine_entry→spine, tês spine→rib), eliminando o B-02 ("BOM imprecisa para topologia sempre-sub-coletor") — caminho crítico para destravar emissão comercial.

---

## Contexto

- TASK-053 v12 introduziu `SecondaryPipe.kind: "spine" | "spine_entry" | "rib"`, mas `src/lib/bom.ts` **não referencia `kind` em nenhuma linha** — as conexões da espinha não são contadas nem precificadas.
- O que JÁ está correto e não muda:
  - Tubos das secundárias: agrupados por SKU de `sizedSecondaries` (inclui spine/spine_entry/ribs — `bom.ts:385-415`).
  - Tês de derivação lateral: 1 por coluna física (`bom.ts:319-339`) — na topologia v12 corresponde 1:1 à junção rib→lateral (cada coluna tem exatamente 1 rib).
  - L-bends (`countSecondaryLBends`) exigem `coords.length === 3`; entidades fishbone têm 2 pontos — sem dupla contagem.
- O que FALTA (fórmula do diagnóstico 2026-05-24 §266): **1 tê principal→spine_entry por setor + N tês spine→rib** + junção spine_entry→spine (precisão física adicional, surfaçada — nunca oculta).
- Camada A (detecção geométrica pura, sem catálogo) fica em `src/lib/layout/physical-connections.ts`, seguindo o padrão TASK-022/035. Resolução de SKU e pendências em `bom.ts`.
- Restrição dura: catálogo read-only (`TES_DERIVACAO_LATERAL` tem apenas DN 50/75/100 LF). DN sem SKU exato → `BOMPendingConnection` (nunca fallback silencioso para SKU de outro DN).

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/physical-connections.ts` | modificação | nova função pura `countFishboneConnections(secondaries, sizedSecondaries)` |
| `src/lib/bom.ts` | modificação | bloco kind-aware: itens precificados por DN exato + pendências; novos campos em `meta`; `BOMPendingConnection.tipo` estendido |
| `src/lib/layout/__tests__/physical-connections.test.ts` | modificação | testes da contagem fishbone |
| `src/lib/__tests__/bom-fishbone.test.ts` | criação | testes de integração BOM fishbone |

---

## Critérios de aceite

- [x] Setor com 1 spine + 3 ribs → 1 tê principal→spine_entry + 1 junção spine_entry→spine + 3 tês spine→rib contados (T54-1)
- [x] DN com SKU exato em `TES_DERIVACAO_LATERAL` → item precificado; DN sem SKU exato → `BOMPendingConnection` com `sku_nao_catalogado` (sem fallback silencioso) (T54-3a/3b)
- [x] `sizedSecondaries` ausente → pendência `dn_indeterminado`, sem crash (T54-5/5b)
- [x] Caminho legado (`kind: undefined`) → saída idêntica à atual (T54-4, T54-leg)
- [x] Spine degenerado (`lengthM ≈ 0`, setor de 1 coluna) → sem junção spine_entry→spine falsa (T54-6)
- [x] Novos contadores em `BOMResult.meta` corretos (T54-7)
- [x] `generateProposalDiagnostics` cobre as novas pendências via blocker "BOM incompleta" existente (T54-9)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 951/951 (≥ 939), 100% passando
- [x] Nenhuma lógica de domínio movida para UI
- [x] Nenhum SKU do catálogo alterado; TECH-053-01 permanece ATIVO

> Ajuste adicional durante implementação (dentro do escopo): `totalTees` em `generateProposalDiagnostics` passou a excluir itens fishbone para preservar a semântica de `tees50Count` (tês de derivação lateral, 1/coluna) e do heurístico `tees50Source`. 3 asserções de testes existentes ganharam o mesmo filtro — invariante protegido inalterado.

---

## Testes obrigatórios (≥ 8)

1. **T54-1** — fishbone 1 setor / 3 colunas: contagens exatas (1 tê principal→spine_entry, 1 junção spine_entry→spine, 3 tês spine→rib)
2. **T54-2** — multi-setor: soma por setor e agrupamento por DN
3. **T54-3** — DN 75 (SKU existe) → item precificado `CONEXAO`; DN 32 (sem SKU) → pendência `sku_nao_catalogado`
4. **T54-4** — regressão: secundárias legadas (`kind: undefined`) → resultado byte-idêntico ao atual
5. **T54-5** — `sizedSecondaries` ausente → `dn_indeterminado`, sem crash
6. **T54-6** — spine degenerado (1 coluna) → 0 junções spine_entry→spine
7. **T54-7** — `BOMResult.meta` novos contadores consistentes com as listas
8. **T54-8** — integração: BOM fishbone não produz dupla contagem com L-bends nem com tês de derivação lateral

---

## Fora do escopo

- Não relaxar TECH-053-01 (permanece ATIVO; esta task o torna quantificado, não resolvido)
- Não alterar catálogo (nenhum SKU novo — homologação de tês para DNs ausentes é decisão RT)
- Não alterar `secondary-sizing.ts`, `hydraulic-connectivity.ts`, motor de layout, PDF, UI
- Não corrigir o fallback legado de tês de derivação lateral (`bom.ts:327-328` usa SKU mais próximo — comportamento pré-existente; mudá-lo altera BOM legada e merece task própria)
- Não migrar `blockers: string[]` para shape estruturado (Fase 3 do roadmap)

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Dupla contagem fishbone × legado | média | alto | ramificação exclusiva por `kind` + T54-4/T54-8 |
| DN do Projeto A sem tê em catálogo → mais pendências visíveis | alta | médio (comercial) | é o propósito: precisão antes de preço; pendência alimenta blocker existente |
| Junção spine_entry→spine não prevista na fórmula do diagnóstico §266 | baixa | baixo | contada em métrica própria e documentada; RT pode zerar na homologação |

**Dependências:** TASK-053 v12 e TASK-056 publicadas (✓); merge nightly `a1a875e` (✓).

---

## Plano de implementação

1. `countFishboneConnections()` em `physical-connections.ts` (Camada A pura): varre `secondaries` com `kind`, resolve DN via `sizedSecondaries` (match por `id`), retorna 3 mapas DN→qtd + `indeterminate`; ignora junção spine_entry→spine quando `spine.lengthM < 0.01`
2. Bloco novo em `buildBOM` (após L-bends): quando há `kind` em alguma secundária, chama o contador, emite itens precificados (DN exato) e pendências; popula novos campos de `meta`
3. Estender union `BOMPendingConnection.tipo` com `"te_principal_spine_entry" | "juncao_spine_entry_spine" | "te_spine_rib"`
4. Testes T54-1..T54-8; rodar suítes completas

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-06-11 | Claude (Fable 5), autorização "vc decide" do usuário | Tarefa criada e iniciada — plano aprovado por delegação explícita no chat |
| 2026-06-11 | Claude (Fable 5) | Implementada e concluída — 951/951 vitest (+12 T54), 0 erros tsc, 37/37 tooling; premissa "Modelo de contagem de conexões fishbone" registrada PENDENTE_REVISAO_RT; relatório `docs/relatorios/2026-06-11-TASK-054.md` |
