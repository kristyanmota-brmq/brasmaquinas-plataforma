# ADR-012 — Lateral física como polilinha construtível 0°/90°

**Data:** 2026-05-21
**Status:** `aceita`
**Supersede:** — (refina ADR-011; não substitui)
**Supersedida por:** —

---

## Contexto

A TASK-027 (validação visual no browser) identificou empiricamente o achado **F7** no Projeto A em Barreiras/BA: o motor produzia laterais físicas com **21 colunas violando a regra ADR-011** (aspersor sobre a lateral), com desvio máximo de **7,00 m** contra o eixo canônico — muito além da tolerância de 0,10 m.

A causa-raiz era a representação canônica anterior: a lateral física era uma **reta** entre `startLngLat` e `endLngLat` com `X = xSegRep` (média dos X locais dos aspersores da coluna). Em projetos com aspersores ligeiramente desalinhados em X (curvaturas naturais do terreno, terraços, ruído de geração da grade), a média não passa por nenhum aspersor individual — gerando desvios sistemáticos.

A **regra ADR-011** ("aspersor obrigatoriamente sobre a lateral física") foi confirmada como **regra operacional** Brasmáquinas: a vala da lateral é o mesmo ponto físico do aspersor, e desvio > 0,10 m exige segunda escavação (projeto não construtível).

A pressão era inverter a lógica: ao invés de **rejeitar** projetos com desvio (TASK-019/TASK-020), **construir a lateral passando pelos aspersores**, mantendo o blocker como fallback defensivo. O usuário aprovou essa direção e formalizou na TASK-028.

---

## Decisão

**Decidimos** representar a lateral física como **polilinha construtível** que passa por todos os aspersores da coluna, usando exclusivamente ângulos `0°` (segmento reto) e `90°` (dobra) — respeitando a [REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA](../metodologia/12-premissas-provisorias-e-revisao-rt.md) confirmada pelo RT.

### 1. Estrutura de dados

`PhysicalColumn` e `Lateral` ganham campo **obrigatório**:

```typescript
routeCoords: [number, number][];  // sempre ≥ 2 pontos
```

Invariantes:

- `startLngLat === routeCoords[0]`
- `endLngLat === routeCoords[routeCoords.length - 1]`
- Ângulos entre segmentos consecutivos ∈ `{0°, 90°, 180°}` (validados defensivamente)
- **Primeiro segmento sempre vertical no frame local** (preserva contrato de `network-angle-diagnostics` para vetor da lateral no inlet — mitigação R2 do plano da TASK-028)

### 2. Algoritmo `buildLateralRoute`

Exportado em `src/lib/layout/laterais.ts`. Em frame local rotacionado:

1. Trilho inicial = X do primeiro aspersor (sorted por Y).
2. Para cada próximo aspersor:
   - Se `|Δx| ≤ ROUTE_BUILD_TOL_X_M (0,05 m)`: estender vertical (mesmo trilho).
   - Senão: dobra em L — vertical até `Y_i`, depois horizontal até `X_i`. Aspersor fica no novo trilho.
3. Cada aspersor está em **um vértice** da rota (desvio ≤ erro numérico).
4. Validação defensiva: `anglesValid` exige ângulos ∈ {0°, 90°, 180°} ±0,1°.

### 3. Tolerância geométrica interna

`ROUTE_BUILD_TOL_X_M = 0,05 m` (registrada em `12-premissas-provisorias-e-revisao-rt.md`).

**Não é tolerância do blocker** — esse continua sendo `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m`. `ROUTE_BUILD_TOL_X_M` é tolerância **interna de construção da rota** para evitar dobras espúrias por ruído numérico de milímetros (rotação Haversine, flat-earth, ponto flutuante).

### 4. Comprimento físico

`comprimentoM` passa a refletir a **soma real dos segmentos** da polilinha (`polylineLengthM(routeCoords) + 0.5` margem de extremidade), **não** a fórmula ideal `(n-1) × spacing + 0.5`. Dobras 90° adicionam tubo extra real.

### 5. Detecção do blocker

`maxSprinklerAxisDeviationM` mede distância à **polilinha** (mínimo entre distâncias a cada segmento). Quando a rota cobre os aspersores corretamente, desvio ≈ 0 → blocker da ADR-011 não dispara.

### 6. Fallback do blocker

Quando `routeCoords` está ausente ou inválida (caso patológico), o cálculo do desvio cai para a **reta** `startLngLat → endLngLat` — comportamento pré-TASK-028 preservado. O blocker da ADR-011 permanece como **trava de segurança** disparável.

### 7. Integração

- `generatePhysicalColumns` e `deriveLateraisFromNetwork` chamam `buildLateralRoute` e populam `routeCoords`. `deriveLateraisFromNetwork` reconstrói a rota do **subset operacional** (não copia a rota completa da coluna).
- `network-angle-diagnostics.ts` consome primeiro/último segmento real de `routeCoords` ao calcular vetor da lateral no inlet (evita falso blocker angular ramal→lateral em polilinhas).
- `ProjectMap.tsx` consome `col.routeCoords` para renderizar a polilinha no mapa (fallback para reta start→end se ausente).

---

---

## Atualização TASK-045B (2026-05-21) — Emenda interpretativa

A TASK-044 (revalidação visual) revelou que o algoritmo de polilinha greedy ponto-a-ponto da TASK-028, mesmo com `ROUTE_BUILD_TOL_X_M` ajustada para 0,10 m (TASK-045), produzia **laterais visualmente em zigue-zague** no Projeto A real (Barreiras/BA, ângulo 31°): ruído de rotação Haversine criava trilhos deslocados a cada par de aspersores → escada visível em screenshots.

A TASK-045B revisita o **algoritmo de construção** (não a invariante geométrica):

### Regra atualizada — TASK-045B

**A lateral física padrão é uma reta única no eixo da coluna** (mediana de X local dos aspersores do segmento). `routeCoords` continua sendo polilinha 0°/90° conforme a invariante geométrica — uma reta de 2 pontos é o caso degenerado padrão.

**A polilinha NÃO é usada para compensar aspersor desalinhado** — aspersor fora de `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` do eixo dispara blocker via `detectAxisDeviations` (ADR-011 preservada), forçando o sistema/usuário a corrigir orientação ou agrupamento.

**Cotovelo em lateral não é ferramenta para "costurar" aspersores ponto a ponto.** Polilinha não-degenerada (com cotovelos genuínos) só aparece se domínio futuro exigir explicitamente — não como compensação de ruído numérico.

### Algoritmo `buildLateralRoute` (pós-TASK-045B)

1. `eixoX = mediana(pts.map(p => p.x))` — **robusto contra outliers** (média seria contaminada por aspersor desalinhado, mascarando blocker).
2. `yMin/yMax = extremos Y do segmento`.
3. Retornar `routeCoords = [(eixoX, yMin), (eixoX, yMax)]`.
4. Validação angular: trivialmente `true` (single segment).

### Por que mediana e não média

Um aspersor outlier a 0,20 m do eixo real puxaria a média para 0,04 m (eixo desloca), e os aspersores principais ficariam a 0,04 m do eixo enquanto o outlier ficaria a 0,16 m — **mascarando a violação**. Mediana ignora outliers: eixo permanece sobre o conjunto principal e o aspersor desalinhado é detectado pelo blocker.

### Invariante geométrica preservada

A definição matemática de "polilinha construtível 0°/90°" continua válida — uma reta vertical de 2 pontos é polilinha 0°/90° degenerada. ADR-010 (rede 0°/90°) **não é tocada**. ADR-011 (aspersor sobre lateral, 0,10 m) **é o gate principal** pós-TASK-045B.

### `ROUTE_BUILD_TOL_X_M` deprecated

A constante é mantida em `src/lib/layout/laterais.ts` apenas para compatibilidade da assinatura pública (terceiro parâmetro opcional de `buildLateralRoute`). **No algoritmo novo não tem efeito.** Documentação em `docs/metodologia/12-premissas-...md` marca como deprecated.

### Testes T28-* ajustados

Os testes T28-1..T28-9, T28-c, T28-c-violation, T28-d, T28-f, T28-h foram reescritos para refletir o novo contrato: rota é reta de 2 pontos; aspersor fora dispara blocker. Intent original preservada (cobertura de cenários), forma adaptada.

### Próximas tasks ressalvadas

Se aspersores genuinamente desalinhados aparecerem com frequência em projetos reais (escopo de TASK-046 sugerida), investigar `findOptimalGridAngle` e `generatePhysicalColumns` para melhorar orientação/agrupamento — não restaurar polilinha greedy.

---

## Alternativas consideradas

### Alternativa A — Relaxar tolerância do blocker para 0,5 m

**Descrição:** Manter lateral reta; aumentar `TOLERANCIA_ASPERSOR_EIXO_LATERAL` para 0,50 m.

**Por que foi descartada:** Contradiz a regra operacional ADR-011 (vala = aspersor; sem desvio aceitável). Mascararia o problema sem resolvê-lo. RT explicitamente reprovou.

### Alternativa B — Reposicionar aspersores para o eixo canônico

**Descrição:** Mover `positions[i]` para o eixo canônico (forçar alinhamento por força).

**Por que foi descartada:** Altera o projeto do cliente. A grade é resultado de cálculo de cobertura — mexer nas posições rompe o contrato com o motor de aspersão.

### Alternativa C — Suavização global por regressão linear

**Descrição:** Calcular um eixo otimizado (mínimos quadrados) que minimiza desvio máximo. Continua reta.

**Por que foi descartada:** Não resolve aspersores muito desalinhados (gera blocker mesmo otimizando). Não cobre 100% dos casos como a polilinha.

### Alternativa D — Aceitar 45° na lateral

**Descrição:** Permitir dobras 45° na rota da lateral (mais suaves).

**Por que foi descartada:** Viola REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA — rede interna aceita apenas 0° e 90° (regra do RT). 45° é exclusivo da adutora.

### Alternativa E — Aspersor com dois pontos (riser inclinado)

**Descrição:** Permitir riser do aspersor com pequena inclinação ao chegar na lateral.

**Por que foi descartada:** Não é prática construtiva. Riser do 5022 é vertical; a tomada na lateral é o ponto físico exato do aspersor.

---

## Consequências

### Positivas

- **Caminho feliz não gera blocker espúrio** — projeto default em Barreiras (337 aspersores, validado na TASK-033) deixou de disparar o blocker da ADR-011.
- **Geometria fiel à construção real** — o tubo entregue ao instalador segue o traçado real, não uma reta idealizada.
- **Blocker preservado como trava** — quando o motor falha (rota inviável, aspersor disperso), o blocker da ADR-011 continua disparável via fallback.
- **`network-angle-diagnostics` mantém validade** — vetor da lateral no inlet usa primeiro/último segmento real, não start→end (evita falso blocker angular).
- **Mapa renderiza polilinha** — visualização fiel ao projeto físico.

### Negativas / trade-offs

- **`comprimentoM` real maior que ideal** — dobras 90° somam metros extras (verificado na TASK-033: tubo LF total subiu de 633 → 951 barras em todas as DNs combinadas, +318 barras).
- **BOM ainda não conta as curvas 90°** — as conexões físicas necessárias para as dobras não são contabilizadas. **Endereçado pela TASK-035** (separada).
- **Seletor hidráulico passou a escolher Ø100mm com mais frequência** porque `hf = headLoss × L` cresce com o comprimento real. Verificado empiricamente na TASK-033: Ø100mm LF +240 barras vs. TASK-027. **Endereçado pela TASK-031** (concluída) e ADR-013 (esta sessão).

### Neutras

- `PhysicalColumn.routeCoords` é campo **obrigatório** — fixtures de teste com literais precisaram adicionar rota mínima `[start, end]`.
- `deriveLateraisFromNetwork` ganhou parâmetros `gridAngleDegrees` e `centroid` para reconstruir rota do subset.
- Motor A/B/C, PDF, catálogo, espaçamento 12×12 e aspersor padrão **não afetados**.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/laterais.ts` | `buildLateralRoute` (novo, exportado), `routeCoords` em `PhysicalColumn`/`Lateral` (obrigatório), `polylineLengthM` inline, `maxSprinklerAxisDeviationM` com fallback, `pointToPolylineDistM` (privado) |
| `src/lib/layout/irrigation-project.ts` | Propaga `gridAngleDegrees` + `centroid` para `deriveLateraisFromNetwork` |
| `src/lib/layout/network-angle-diagnostics.ts` | Vetor da lateral no inlet usa primeiro/último segmento de `routeCoords` |
| `src/components/map/ProjectMap.tsx` | Linha 250: `coordinates: col.routeCoords ?? [col.startLngLat, col.endLngLat]` |
| `src/lib/layout/__tests__/lateral-route.test.ts` | +9 testes novos (T28-1 a T28-9) |
| 8 fixtures de teste existentes | Adicionam `routeCoords` em literais |
| 2 testes T19→T28 reescritos | Expectativas invertidas (rota cobre aspersores) |

---

## Classificação

- decisão arquitetural de domínio (representação da lateral física)
- refinamento operacional da ADR-011 (lateral física construtível)
- tolerância geométrica interna `ROUTE_BUILD_TOL_X_M = 0,05 m` registrada como premissa
- catálogo, aspersor padrão e PDF não afetados

---

## Referências

- TASK-028 — Corrigir geração automática da lateral física sobre os aspersores
- TASK-027 — Validação prática no browser (achado F7)
- TASK-033 — Revalidação visual pós-TASK-028 (confirmação empírica)
- ADR-010 — Regra de construtibilidade angular (rede interna `[0°, 90°]`)
- ADR-011 — Aspersor obrigatoriamente sobre a lateral física (refinada por esta ADR)
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — `ROUTE_BUILD_TOL_X_M`, `TOLERANCIA_ASPERSOR_EIXO_LATERAL`, `REGRA_CONSTRUTIBILIDADE_ANGULAR_REDE_INTERNA`
- `docs/relatorios/2026-05-21-TASK-028.md`
- `docs/relatorios/2026-05-21-TASK-033.md`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | ADR-012 criada (retroativa) para documentar a decisão arquitetural materializada pela TASK-028 e validada empiricamente pela TASK-033. |
