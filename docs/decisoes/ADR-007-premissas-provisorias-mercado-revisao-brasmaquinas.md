# ADR-007 — Premissas provisórias de mercado e revisão Brasmáquinas

**Data:** 2026-05-20
**Status:** `provisório`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

TASK-010E-B adicionou pesos de penalidade ao score do motor de candidatos de layout baseados no comprimento da rede de distribuição (principal + adutora + ramais). Esses pesos influenciam a seleção automática do candidato "melhor" entre os 112 avaliados.

Não há dados de campo calibrados para esses pesos. Os valores foram escolhidos por heurística de engenharia (conservadores, baixo impacto) como ponto de partida para o ciclo de calibração pelo RT. Usar pesos não calibrados em proposta comercial pode resultar na seleção de layouts que o RT consideraria subótimos.

O mesmo problema existia antes para os pesos de filling ratio, short column e edge quality (introduzidos em TASK-010B), mas esses são marcados como `PENDENTE_CALIBRACAO_RT_CAMPO` sem valor de peso ainda ativo.

---

## Decisão

Decidimos:

1. Adotar `WEIGHT_SECONDARY_LENGTH = 0.10` e `WEIGHT_TOTAL_NETWORK_LENGTH = 0.10` como **valores provisionais de mercado** — conservadores por construção (baixo impacto no score total).
2. Usar comprimento geométrico como **proxy de custo e complexidade** da rede de distribuição — sem solver hidráulico por candidato.
3. Usar `distributionLengthRatio = (principal + adutora + ramais) / max(totalLateralLength, 1)` como fórmula de normalização da penalidade.
4. Registrar todas as premissas em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` com status `PENDENTE_REVISAO_RT_BRASMAQUINAS | PENDENTE_REVISAO_CAMPO_BRASMAQUINAS`.
5. Todo uso em proposta comercial está sujeito à revisão e aprovação pelo RT antes de remover os marcadores de premissa.

---

## Alternativas consideradas

### Alternativa A — Pesos zero (inativos) até calibração

**Descrição:** Não ativar os pesos de rede; métricas presentes mas não influenciam o score.

**Por que foi descartada:** Sem influência no score, o motor ignora completamente o comprimento da rede. Candidatos com rede de distribuição excessivamente longa seriam selecionados sem penalidade. Um peso conservador (0,10) é melhor que nenhum peso.

### Alternativa B — Peso maior (0,30–0,50) como critério de eliminação

**Descrição:** Penalidade mais agressiva para candidatos com rede longa.

**Por que foi descartada:** Sem dado de campo, um peso alto pode eliminar candidatos geometricamente bons em áreas com captação distante ou morfologia complexa. O conservadorismo (0,10) é intencional — o RT pode aumentar após calibração com dados reais.

### Alternativa C — Solver hidráulico por candidato em vez de proxy geométrico

**Descrição:** Rodar `sizeHydraulics()` para cada um dos 112 candidatos para obter métricas hidráulicas reais.

**Por que foi descartada:** Complexidade computacional proibitiva no cliente. `sizeHydraulics()` por candidato tornaria o motor impraticável para uso interativo. O proxy geométrico é suficiente para um ranking preliminar; o solver completo roda uma vez sobre o candidato selecionado.

---

## Consequências

### Positivas

- O motor considera a rede de distribuição na seleção de candidatos — não apenas métricas geométricas de cobertura.
- Os marcadores `PREMISSA_PROVISORIA_MERCADO` e `PENDENTE_REVISAO_RT_BRASMAQUINAS` no código tornam visível o estado de cada peso para qualquer desenvolvedor.
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` é a fonte de verdade centralizada para revisão pelo RT.

### Negativas / trade-offs

- O proxy geométrico ignora diâmetro, pressão e perfil topográfico — um candidato com rede longa pode ser hidraulicamente superior a um com rede curta (diâmetros maiores compensam o comprimento). O proxy não substitui o solver.
- Para polígonos com poucas colunas físicas, `distributionLengthRatio` pode inflar artificialmente a penalidade (denominador pequeno).
- Sem dado de campo, os valores 0,10 são arbitrários. O RT pode considerar que devem ser 0,05 ou 0,30 — a calibração é obrigatória antes do uso comercial.

### Neutras

- `TOP_K_HYDRAULIC_CANDIDATES = 5` e `WEIGHT_HYDRAULIC_BLOCKER = 0.50` são premissas separadas no mesmo documento, adicionadas em TASK-010F.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/sprinkler-grid-optimizer.ts` | pesos `WEIGHT_SECONDARY_LENGTH`, `WEIGHT_TOTAL_NETWORK_LENGTH`; fórmula `distributionLengthRatio` |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | registro das premissas com status e responsável futuro |

---

## Classificação

- premissa provisória (pendente de revisão Brasmáquinas)
- regra técnica (fórmula de score do motor de layout)
- pendente de revisão Brasmáquinas

---

## Referências

- TASK-010E-B — Métricas de rede de distribuição no motor de candidatos
- `docs/relatorios/2026-05-20-TASK-010E-B.md`
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- ADR-006 (motor como ferramenta preliminar)

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
