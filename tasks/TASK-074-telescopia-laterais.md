# TASK-074 — Telescopia de laterais 75→50 (cascata de DN)

**Status:** `concluída` · **Prioridade:** P1 · **Classe:** A — domínio (núcleo de laterais) / BOM / solver
**Concluída em:** 2026-06-12 · **991/991 testes** (+2 T74; 2 invariantes atualizados) · 0 tsc · 37/37 tooling
**Autorização + decisão RT do usuário:** "Pode prosseguir. Mas não cascatearei as laterais para tubos menor que 50mm. A economia não compensa o custo da personalização."

## Regra implementada (decisão RT hardcoded)
Cascata **exclusivamente 75→50** (`computeTelescopia75para50` em `laterais.ts`): quando a lateral seleciona DN75, busca a MAIOR cauda (k aspersores da ponta, k≥2) que roda em DN50 com `hf_telescopada = hf75(total) − hf75(cauda) + hf50(cauda) ≤ 20%×Ps` e velocidade da cauda ≤ máx. F de Christiansen global nas três parcelas (aproximação consistente com o seletor). DN<50 nunca considerado.

## Integração (um único ponto → tudo herda)
`selectLateralTube` computa e `SelecaoTubo.telescopia?` carrega — colunas físicas, laterais operacionais e solver herdam automaticamente. `perdaCargaM` passa a ser a hf telescopada quando presente; solver usa `telescopia.hfTotalMca`. BOM: tubos divididos cabeceira/cauda por SKU; kit do aspersor dividido por DN do trecho (riser DN75 na cabeceira, DN50 na cauda); **1 tê de redução soldável 75×50 por coluna telescopada** (SKU VIQUA 2090612, custo/venda REAIS da lista mestra: 13,65/22,80); `meta.colunasTelescopadasCount`.

## Validação no caso histórico (Jaíba 12,7 ha)
**BOM R$ 328.238 → R$ 268.627 (−18,2%)**; laterais 1.097 barras DN75 → 85 DN75 + 1.013 DN50 — proporção de cabeceira (85) próxima do real (115), com cauda DN50 maior porque o real cascateia até DN25 e nós paramos no 50 (decisão RT). PN60 DEFOFO entrou nos ramais (TASK-070). A maior divergência material vs propostas reais está fechada dentro da regra do RT.

## Testes
T74-1 (cauda DN50, contagens e hf coerentes; teto 20%×Ps; nunca <50), T74-2 (curta não telescopa; BOM divide tubos + tê de redução). T8-2 e "perdaCargaM usa Dint" atualizados para o invariante telescopia-aware (teto absoluto preservado).
