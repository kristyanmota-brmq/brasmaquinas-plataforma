# TASK-066 — Custos de aquisição no catálogo (habilita margem / E08)

**Status:** `concluída` · **Prioridade:** P1 · **Classe:** A/B — catálogo / comercial
**Concluída em:** 2026-06-12 · **985/985 testes** (+1 T66) · 0 tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-12-TASK-066-conferencia-custos.md`
**Autorização:** usuário ("lista de produtos com todos os custos... pode utilizar por enquanto")

> 28 itens com `custo: 0` preenchidos a partir da lista mestra de preços (25.08.2025): fator de markup Tigre **1,5456 exato e uniforme** observado na lista → `custo = precoVenda ÷ 1,5456`, marcado item a item como estimado PENDENTE_CONFERENCIA. Custos reais pré-existentes (rígidos PN80, aspersores, registros VIQUA) preservados; nenhum `precoVenda` alterado; `KitAspersor5022Item.custo` deixa de ser literal `0`. T66-1: nenhuma família core com custo zero; custo < venda em 100%. Margem da proposta calculável a partir de agora.
