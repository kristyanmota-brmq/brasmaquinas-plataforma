# Layout — Earth First

> **[RASCUNHO — revisar com RT/campo]**
> Este documento descreve as regras de layout implementadas. Parâmetros marcados com `[RT]` ainda
> não foram validados com o responsável técnico ou com equipe de campo.

---

## 1. Grade de aspersores

O sistema gera uma grade regular de aspersores a partir de:
- Centroide da área (`layout.centroid`)
- Ângulo da grade (`gridAngleDegrees`) — auto-calculado ou manual
- Espaçamento (`espacamentoM`) — padrão 12 m
- Posições do polígono da área — aspersores fora do polígono são removidos

```
posição(col, row) = centroide + rotate(col × spacing, row × spacing, gridAngle)
```

> `[RT]` — Confirmar se a grade é sempre ortogonal ou se espaçamento triangular é usado.
> `[RT]` — Confirmar critério de inclusão/exclusão de aspersores na borda da área.

**Referência no código:** `src/lib/layout/laterais.ts` → `generatePhysicalColumns`

---

## 2. Colunas físicas

Uma **coluna física** é um conjunto de aspersores alinhados na mesma direção perpendicular à principal, servidos por um único trecho de lateral.

- Aspersores com mesmo índice de coluna (após rotação) formam uma coluna física
- Comprimento da coluna = distância do primeiro ao último aspersor + espaçamento/2 em cada extremidade
- `[RT]` — Confirmar se a extensão de meia-distância nas extremidades é correta para campo

**Referência no código:** `src/lib/layout/laterais.ts` → `PhysicalColumn`

---

## 3. Principal

A linha principal é o eixo principal de distribuição de água, perpendicular às laterais.

### 3.1 Principal automática

Gerada por `generatePrincipalAndAdutora` em `src/lib/layout/principal.ts`:
- Posicionada na extremidade de menor Y das colunas físicas (captação geralmente abaixo da área)
- Direção: paralela às linhas de grade, perpendicular às laterais
- Comprimento: cobre todas as derivações de colunas físicas

> `[RT]` — Confirmar critério de posicionamento automático (borda vs. centro vs. baseado em cota).
> `[RT]` — Em campo, a principal segue o contorno do terreno — o modelo atual é reto.

### 3.2 Principal manual

O usuário pode desenhar a principal manualmente no mapa. A principal manual é preservada e não é sobrescrita pelo auto-pipeline.

---

## 4. Adutora

A adutora conecta a captação (fonte de água) ao início da principal.

- Calculada como linha reta entre `layout.waterSource` e o extremo mais próximo da principal
- `[RT]` — Em campo, a adutora pode não ser reta; confirmar se o comprimento linear é suficiente para BOM
- A HMT usa o comprimento real da adutora para cálculo de perda de carga

---

## 5. Ramais (secundárias)

Um **ramal** conecta a principal ao ponto de entrada (inlet) de uma coluna física quando a coluna não toca diretamente a principal.

- Gerado automaticamente por `generateSecondaries`
- Comprimento = projeção perpendicular do inlet na principal
- `[RT]` — Confirmar se a projeção perpendicular é sempre o caminho real em campo (vs. roteamento ao longo de estradas ou carreadores)

**Referência no código:** `src/lib/layout/hydraulic-connectivity.ts` → `generateSecondaries`

---

## 6. Setorização e pontos de controle

A setorização divide os aspersores em grupos de vazão aproximadamente igual. Quando uma coluna física pertence a mais de um setor, um **ponto de controle** (válvula de corte) é criado no ponto de divisão.

```
ControlPoint.type = "section_valve" — válvula de corte entre setores
ControlPoint.status = "pending" | "resolved" — "resolved" quando a BOM inclui a válvula
```

> `[RT]` — Confirmar o tipo de válvula usada nos pontos de corte (esfera, gaveta, borboleta).
> `[RT]` — Confirmar se sempre há necessidade de válvula ou se o operador pode usar uma tampa cega.
> `[RT]` — TASK-005 pendente: BOM não inclui válvulas ainda.

---

## 7. Construtibilidade

O relatório de construtibilidade (`ConstructabilityReport`) indica:
- Quantos pontos de controle existem e quantos estão resolvidos (na BOM)
- Quais segmentos operacionais requerem alimentação independente (`independent_feed_required`)
- Status geral: `ok`, `pending_review`, `blocked`

**Referência no código:** `src/lib/layout/constructability.ts` → `buildConstructabilityReport`

---

## 8. Premissas "Earth First" (não implementadas — pendentes)

> `[RT]` — Os itens abaixo representam necessidades identificadas em campo, ainda não implementadas:

| Premissa | Status | Impacto |
|---------|--------|---------|
| Principal segue carreadores e estradas | não implementado | Comprimento real pode ser maior |
| Ramais evitam obstáculos (rios, cercas) | não implementado | Roteamento alternativo |
| Cotas intermediárias do terreno | não implementado | HMT pode ser subestimada |
| Espaçamento variável por zona | não implementado | Grade irregular por seção |

---

## 9. Referências de código

| Arquivo | Função |
|---------|--------|
| `src/lib/layout/laterais.ts` | `generatePhysicalColumns`, `deriveLateraisFromNetwork` |
| `src/lib/layout/principal.ts` | `generatePrincipalAndAdutora` |
| `src/lib/layout/sectorization.ts` | `buildSectorsByFlowWithColumnSplitting`, `deriveOperationalSegments` |
| `src/lib/layout/hydraulic-connectivity.ts` | `generateSecondaries`, `validateHydraulicConnectivity` |
| `src/lib/layout/constructability.ts` | `buildConstructabilityReport` |
| `src/lib/layout/irrigation-project.ts` | `calculateIrrigationProject` (orquestrador) |
