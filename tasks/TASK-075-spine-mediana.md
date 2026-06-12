# TASK-075 — Spine na mediana dos inlets (L1-ótima)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — motor de layout / construtibilidade
**Área:** layout
**Criado em:** 2026-06-12
**Atualizado em:** 2026-06-12
**Concluída em:** 2026-06-12 · **997/997 testes vitest** (+6 vs 991) · 0 erros tsc · 37/37 testes tooling
**Relatório:** `docs/relatorios/2026-06-12-TASK-075.md`
**Predecessores:** TASK-053 v12 (`bd74234` — topologia fishbone, midpoint formula); TASK-057 (`cfb74f3` — clamp ao vão); diagnóstico `scripts/diagnose/diagnose-spine-placement.mjs` (`38ab8e2`)
**Autorização:** delegação RT explícita do usuário (Kristyan Mota, RT): "Você vai ser meu RT, pode aprovar o que precisar" + autorização específica desta task na sessão de 2026-06-12

---

## Objetivo

Em `routeEspinhaDePeixe` (passo 6, `src/lib/layout/hydraulic-connectivity.ts`), substituir o posicionamento do spine via midpoint `(principalYLocal + farthestInletY) / 2` pela **MEDIANA de `ysLocal`** (inlets do setor) — propriedade L1: a mediana minimiza a soma dos comprimentos dos ribs.

---

## Contexto

Motivação do RT (2026-06-12): *"a principal está fazendo usar muito mais tubulação nas secundárias"*. O midpoint v12 posicionava o spine a meio caminho entre principal e inlets, dobrando cada rib sem função hidráulica. Com inlets uniformes (caso dominante em campos retangulares), a mediana produz o **manifold clássico das propostas reais**: spine na linha dos inlets, ribs ≈ 0 m, conexão vira tê direto — a validação angular já pula ribs < 1e-3 m e a BOM TASK-054 já conta o tê por rib.

Restrições: clamp `MIN_HEADLAND_M = 3 m` (passo 7) preservado — casos degenerados (inlets rentes à principal) mantêm o comportamento v12; clamp do rib ao vão da lateral (TASK-057, passo 10) intacto.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/hydraulic-connectivity.ts` | modificação | passo 6 → mediana; passo 5 (`farthestInletY`) removido (sem uso); JSDoc |
| `src/lib/bom.ts` | modificação (1 linha) | skip de secundárias com `lengthM < 0,01` no agrupamento de ramais — elimina item de tubo com quantidade 0 (artefato pré-existente desde o clamp TASK-057) |
| `src/lib/layout/__tests__/subcoletor-por-setor.test.ts` | modificação | 5 testes do midpoint atualizados para o invariante da mediana + bloco T75 novo (4 testes) |
| `src/lib/layout/__tests__/hydraulic-sizing.test.ts` | modificação | T8-5 migrado para fixture rampa; T8-5b novo (manifold no Projeto P) |
| `src/lib/layout/__tests__/fixtures.ts` | modificação | nova fixture `makeLayoutRampa()` (campo escalonado +6 m/coluna); L/P intocadas |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | modificação | célula "Valor usado" da premissa fishbone + entrada no histórico (refinamento de premissa APROVADO_RT) |

---

## Critérios de aceite

- [x] `spineYLocal` = mediana de `ysLocal`; clamp `MIN_HEADLAND_M` e clamp TASK-057 preservados (T75-4, T57 passando)
- [x] Os 7 testes comportamentais que assumiam o midpoint atualizados para o invariante correto da mediana — **nenhum deletado**
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 997/997 (≥ 991)
- [x] `node scripts/ai/__tests__/run-all.mjs` → 37/37
- [x] `npx tsx scripts/diagnose/diagnose-spine-placement.mjs` rodado no banco real
- [x] Nenhuma lógica de domínio movida para UI; nenhum SKU alterado

---

## Testes obrigatórios (entregues)

1. **T75-1** — inlets escalonados (6/12/30 m): spine na mediana (12 m), não no midpoint (15 m)
2. **T75-2** — Σ ribs com mediana (54 m) < Σ ribs do midpoint (78 m analítico) — propriedade L1
3. **T75-3** — inlets uniformes (18 m): manifold clássico (spine_entry = gap; ribs 0)
4. **T75-4** — caso degenerado (1 m): clamp `MIN_HEADLAND_M = 3 m` preservado
5. **T8-5** (atualizado) — campo em rampa: caminho crítico do solver passa por `secondary`
6. **T8-5b** — Projeto P uniforme: fishbone com spine/entry > 0, ribs 0 (tê), caminho crítico íntegro

---

## Resultados em dados reais (Fazenda do Paulo)

| Métrica | Pré (midpoint) | Pós (mediana) |
|---|---|---|
| Secundárias | 468 m | **426 m (−9%)** |
| HMT | 36,5 mca | 35,8 mca |
| BOM total | R$ 109.977,75 | R$ 110.998,95 (+0,9%) |
| Itens BOM com q=0 | 1 | **0** |

Custo ≈ neutro neste campo (gaps pequenos: mix DN75→DN125 no spine_entry compensa os −42 m). Benefícios estruturais: topologia converge ao manifold das propostas reais; economia direta em campos escalonados; menos junções físicas de montagem (ribs viram tês).

---

## Fora do escopo

- Topologia fishbone em si (spine ⊥ laterais, sempre sub-coletor) — inalterada
- Posicionamento X do spine_entry; relocação de válvulas (TASK-053-valves)
- Inclusão de hf de spine/spine_entry no caminho crítico por derivação (limitação pré-existente do solver, documentada no T8-5b)
- Catálogo, UI, PDF
