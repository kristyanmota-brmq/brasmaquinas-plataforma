# TASK-070/073 — PN60 nas secundárias + margem bruta interna (E08)

**Status:** `concluída` · **Prioridade:** P1 · **Classe:** A — catálogo / BOM / UI
**Concluída em:** 2026-06-12 · **989/989 testes** (+2) · 0 tsc · 37/37 tooling
**Autorização:** delegação "Prossiga" (RT delegado)

## TASK-070 — Tubos rígidos PN60 (DEFOFO) no catálogo
2 entradas com **custo/venda REAIS da lista mestra** (DN100: 176,05/272,10; DN150: 390,30/603,25; SKUs Tigre 15293527/15293543). Disponíveis APENAS para secundárias via `pressureClassRequirement` explícito (T70-1); **principal/adutora continuam PN80-only** (filtro adicionado em `selectTubo` e `selectPrincipalTube` — a principal não tem verificação de classe por trecho na seleção; deixá-la pegar PN60 com HMT > 60 seria regressão de segurança). **Descoberta honesta registrada**: os preços placeholder dos rígidos PN80 atuais (ex.: DN100 venda 215) estão ABAIXO da lista real (DEFOFO PN80: 323,57) — a economia do PN60 se materializa quando a conferência TASK-066 atualizar os rígidos para preços reais.

## TASK-073 — Margem bruta interna (primeiro tijolo do E08)
`BOMItem.custoUnitario?` populado nos 15 pontos de emissão; `meta.custoTotalAquisicaoR$` + `meta.margemBrutaR$`; **bloco verde "Margem bruta (interno)"** na Lista de Materiais da sidebar (custo, margem R$ e %) — exclusivo do vendedor, NUNCA no PDF do cliente (T73-1: margem > 0 e coerente com totalGeral − custo).

## Fora do escopo (sessão dedicada)
Cascata de DN nas laterais (maior divergência vs propostas reais — mexe em `laterais.ts`/capacidade/kit/BOM por segmento); curva Q-H multiponto; atualização dos preços rígidos para a lista real (PENDENTE_CONFERENCIA TASK-066).
