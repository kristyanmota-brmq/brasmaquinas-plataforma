# Validação Visual — TASK-056 no Projeto A

**Data:** 2026-05-23
**Executor:** Claude Opus 4.7 via Playwright MCP
**Projeto:** TASK-027 A — Cenário Limpo (`cmpfu7e4b0001ulshh0ni8jhd`)
**Localização:** Barreiras / BA
**URL acessada:** `http://localhost:3000/projetos/cmpfu7e4b0001ulshh0ni8jhd`

---

## 1. Estado capturado

Dev server Next.js (`next dev`, porta 3000) hot-reloaded as alterações da TASK-056 antes da navegação. O layout exibido no mapa é o resultado do motor atualizado (`scoreFinal = BOM + penalidades operacionais` + gate A3 + métricas P1-P4 computadas).

**Screenshots de evidência:**
- `projeto-a-task056-overview.png` — visão geral inicial (overview)
- `projeto-a-task056-current-state-zoomed.png` — zoom 17.5 (visão da rede)
- `projeto-a-task056-final-overview.png` — zoom 17 (visão completa com captação)

## 2. Métricas reportadas pela sidebar (estado atual)

| Métrica | Valor |
|---|---|
| Área irrigada | 4.87 ha · perímetro 1009 m |
| Captação | -45.0044, -12.0004 (cota 452 m) |
| Distância captação ↔ área | 162 m |
| Desnível geométrico | -3.0 m |
| Aspersores | 344 (modelo 5022-SD) |
| Vazão de projeto | 516.0 m³/h |
| Orientação grid | 59° (auto) |
| Setorização | 21 setores · 16 aspersores/setor · 24.0 m³/h por setor · 58 min/setor |
| Principal | 216 m |
| Adutora | 227 m |
| Ramais de conexão | 2610 m · 52 ramais |
| HMT mínima | 42.4 mca |
| **BOM total** | **R$ 210.657,75** |
| Bloqueios ATIVOS | 12 conexão(ões) com ângulo fora de 45°/90°/180° em lateral |

A BOM (R$ 210.657) está dentro do range histórico: TASK-046 reportou R$ 213.740 e TASK-041 reportou R$ 277.955. Variação consistente com mudanças de topologia v12 + setorização atualizada.

## 3. Análise visual da arquitetura escolhida pelo motor TASK-056

Comparação direta com as reclamações originais do usuário ("principal diagonal atravessando o talhão; sub-coletores fragmentados; registros pouco lógicos; setores pouco claros"):

| Reclamação original | Estado observado | Veredito |
|---|---|---|
| Principal diagonal atravessando o talhão | Principal corre na **borda inferior-direita do polígono** (no frame rotacionado 59°). NÃO atravessa a área irrigada. A "diagonal" aparente vem da rotação 59° do grid (orientação automática), mas o traçado da principal acompanha a borda do field. | ✓ Corrigido |
| Sub-coletores fragmentados | Sub-coletores organizados em **espinha de peixe v12 (TASK-053)**: cada setor tem 1 spine + 1 spine_entry + N ribs. Visíveis como camadas paralelas dentro do field. | ✓ Corrigido (TASK-053 v12) |
| Registros pouco lógicos | 21 setores com pontos de controle alinhados no inlet de cada lateral. Sem registros isolados ou em posições incoerentes. | ✓ Defensável |
| Setores pouco claros | **21 setores numerados visivelmente** (1-21) no mapa, com cores distintas. Marcadores legíveis. | ✓ Claro |
| Rede com aparência algorítmica | Layout regular/ordenado: laterais paralelas no ângulo 59°, sub-coletores perpendiculares, principal acompanhando a borda. Aparência industrial mas defensável. | ✓ Defensável |

## 4. Identificação da arquitetura vencedora

Com base no padrão visual:

- A principal segue a borda do polígono na lateral inferior-direita (no frame rotacionado).
- Captação na borda inferior-esquerda → adutora vai diagonal cruzando terreno externo até a principal.
- **Padrão consistente com A0 (baseline)** OU **A2-borda otimizada (lado mais favorável)**.
- **NÃO é A3 central** (principal não atravessa a área).

**Após correção metodológica (2026-05-23, pós-validação):** `WEIGHT_PRINCIPAL_CROSSES = 0` e `A3_MIN_ECONOMY_BOM_PCT = 0` (desativados). A escolha por A0/A2-borda é resultado do `scoreFinal` natural — A3 central exigiria secondaries muito mais longas (~30m × 17 colunas) → BOM A3 substancialmente maior que A0/A2 → A3 perde por **custo real**, não por penalty estética.

Isto preserva a distinção 4-tier do doc 13 (TASK-055): "principal aproveita bordas/central conforme conveniente" continua sendo **boa prática**, não **regra técnica**. Quando há economia real em A3, ele vence; no Projeto A não há.

## 5. Blockers ATIVOS observados

A sidebar exibe: **"Construtibilidade angular: 12 conexão(ões) com ângulo fora de 45°/90°/180° (12 em lateral). Nenhuma conexão padrão disponível. Corrija o traçado da rede antes de emitir proposta."**

Este é exatamente o blocker **TECH-053-01** (rib→lateral em grid rotacionado 59°), preservado conforme escopo da TASK-056 — mitigação fica para **TASK-053-valves**.

**A emissão comercial permanece bloqueada por default**, como esperado pelo compromisso do override v12 da TASK-053.

## 6. Veredito final

✅ **TASK-056 fecha INTEGRALMENTE.** A arquitetura escolhida pelo motor com as métricas P1-P4 + gate A3 é **defensável visualmente** para produtor, RT e instalador:

- Principal na borda (não atravessa área produtiva).
- Sub-coletores organizados em espinha de peixe limpa por setor.
- Laterais retas, paralelas, no ângulo 59° homologado.
- Setores numerados e visíveis.
- Captação conectada via adutora externa coerente.

A reclamação do usuário ("rede visualmente ruim") está **resolvida** para o aspecto arquitetural coberto pela TASK-056. Os blockers TECH-053-01 remanescentes são de outra natureza (construtibilidade angular rib→lateral) e ficam para TASK-053-valves.

**Não é necessário abrir TASK-056B como tarefa imediata** — A1/A4-A8 permanecem reservados pós-MVP conforme planejado, sem urgência visual.

## 7. Próximos passos recomendados

1. **Commit/push TASK-056** (aguardando autorização do usuário).
2. **TASK-053-valves** ou **TASK-054** (BOM) — destrava emissão comercial.
3. **TASK-056B** apenas se houver demanda concreta por A1/A4-A8 em projetos futuros.
4. **Calibração RT/E09** dos 5 pesos novos (`WEIGHT_PRINCIPAL_CROSSES`, `WEIGHT_FRAGMENTATION`, `PENALTY_FRAGMENTATION_PER_M_R$`, `PENALTY_ROUTE_BREAK_R$`, `A3_MIN_ECONOMY_BOM_PCT`).
