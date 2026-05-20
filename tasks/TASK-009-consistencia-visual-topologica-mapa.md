# TASK-009 — Consistência visual/topológica do mapa

**Status:** planejada
**Prioridade:** alta
**Área:** `src/components/map/ProjectMap.tsx` + `src/lib/layout/`

---

## Objetivo

Auditar e corrigir a consistência visual/topológica do mapa.
Não é tarefa estética — é garantir que cada camada renderizada corresponde
exatamente ao que `IrrigationProjectResult` calculou.

---

## Diagnóstico realizado

### 1. Pontos laranjas — o que são

**Origem no código:** `constructability.controlPoints` filtrado por `cp.type === "section_valve"`
(`ProjectMap.tsx` linha 1283).

**O que são:** `ControlPoint` do tipo `"section_valve"` com `status = "pending"` —
gerados por `generateControlPoints` em `constructability.ts` (linha 147).
Aparecem no ponto de corte entre setores dentro de uma mesma coluna física.
Representam a válvula de seção que separa dois setores operando em momentos diferentes.

**Aparecem na BOM?** Não diretamente. Os `REGISTROS_MANUAIS_SECAO` estão no BOM,
mas o link entre um registro físico no BOM e um `section_valve` no mapa não é feito.

**Aparecem no diagnóstico?** Sim — `pendingControlPointsCount` em `ConstructabilityReport`.

**Têm legenda?** Não. O mapa não tem nenhuma legenda.

**Conflito de cor:** Adutora (`#E07B00`) e pontos de controle (`#E07B00`) usam a
mesma cor laranja. O usuário vê dois elementos distintos com cor idêntica.

---

### 2. Onde cada camada visual é criada e de onde vem cada dado

| Camada (Layer id) | Dado de origem | Vem de `IrrigationProjectResult`? | Cor |
|---|---|---|---|
| `area-fill` / `area-line` | `layout.area` | Não — input direto | `#094641` (verde escuro) |
| `sprinklers-circles` | `layout.sprinklers.positions` | Não — input direto | `SECTOR_PALETTE` por setor |
| `sector-labels-*` | `layout.sprinklers.positions + sectorIndices` | Parcialmente (sectorIndices) | preto |
| `laterais-line` | `projectResult.distribution?.laterais` | Sim | `#3B82A6` (azul médio) |
| `principal-casing` / `principal-line` | `layout.mainPipeline.coordinates` | **Não** — layout salvo | branco/`#1B5680` |
| `adutora-casing` / `adutora-line` | `layout.mainPipeline.adutora` | **Não** — layout salvo | branco/`#E07B00` |
| `secondaries-casing` / `secondaries-line` | `projectResult.hydraulic?.secondaries` | Sim | branco/`#0D9F6E` |
| `orphan-laterais-line` | `projectResult.physical?.physicalColumns` filtrado | Sim | `#EF4444` (vermelho) |
| `control-points-halo` / `control-points-dot` | `projectResult.constructability?.controlPoints` | Sim | branco/`#E07B00` |

**Problema crítico de fonte:** Principal e adutora são renderizadas de
`layout.mainPipeline` (input salvo no banco), não de
`projectResult.hydraulic.principalCoords` / `adutoraCoords` (resultado calculado).
Se houver divergência entre o que está salvo e o que o motor calcularia hoje, as
camadas mostram geometria desatualizada.

---

### 3. Aspersores aparentemente desconectados

**Análise:** A lateral é desenhada como `LineString` de 2 pontos:
`startLngLat → endLngLat` de cada `Lateral`.

Em `deriveLateraisFromNetwork` (`laterais.ts`):
```ts
const startLngLat = positions[seg.sprinklerIndices[0]] ?? col.startLngLat;
const endLngLat   = positions[seg.sprinklerIndices[last]] ?? col.endLngLat;
```

Os endpoints são posições reais de aspersores — a linha reta deveria passar visualmente
por todos os aspersores da coluna (que estão em grid reto).

**Causa provável da percepção de desconexão:**
- Cor `#3B82A6` (azul médio) sobre fundo de satélite escuro tem baixo contraste.
- Uma coluna dividida entre 2 setores gera 2 `OperationalSegments` → 2 laterais curtas;
  o usuário vê segmentos descontínuos no meio da coluna, sem conexão visual explícita.
- `physicalColumns` cached com deps `[layout.sprinklers, layout.centroid]` (linha 240)
  não inclui `layout.sectorization` — estável para edição, mas pode divergir em edge cases.

**Conclusão:** Não é bug de cálculo — é falha visual por cor + segmentação operacional
não comunicada.

---

### 4. Laterais físicas vs. operacionais

| Tipo | Função que gera | Quantidade | Como é renderizado |
|---|---|---|---|
| Coluna física | `generatePhysicalColumns` | 1 por coluna física | `orphan-laterais-src` (apenas órfãs, em vermelho) |
| Lateral operacional | `deriveLateraisFromNetwork` | 1 por `OperationalSegment` | `laterais-line` (azul) |

**Bug de renderização:** As colunas físicas conectadas (não-órfãs) nunca são renderizadas
como tal. Só aparecem as laterais operacionais. Quando uma coluna é dividida entre setores,
aparece como dois segmentos azuis curtos sem conexão visual entre eles — parecendo
aspersores flutuantes.

**Colunas físicas órfãs** (vermelho) são renderizadas, mas a camada usa
`physicalColumns` cacheado (deps `[layout.sprinklers, layout.centroid]`), não
`projectResult.physical?.physicalColumns`. Pode mostrar dados desatualizados.

---

### 5. Ramais/secundárias

- Renderizados em `#0D9F6E` (teal-verde) com linha tracejada.
- `fromCoord → toCoord`: projeção do inlet da lateral sobre a principal → inlet real.
- Entram no BOM (via `sizedSecondaries`).
- Entram no solver hidráulico (via `hydraulic.secondaries`).
- **Problema visual:** A cor teal é similar à cor das laterais (azul) em satélite.
  Sem legenda, o usuário não distingue ramal de lateral.
- **Problema semântico:** O rótulo no código diz "ramal (principal → lateral_inlet)"
  mas o comentário diz "ramais" enquanto a interface usa `secondaries`. Terminologia
  inconsistente entre código e UI.

---

### 6. Principal fora do polígono

**Análise:** A principal é gerada pelo bottom-up (`buildAutoPipelineCoords`) que percorre
os endpoints de menor Y de cada coluna física. Esses pontos **deveriam estar dentro** do
polígono (são posições de aspersores convertidas para frame local e de volta).

**Possíveis causas de a principal aparecer fora:**
1. O usuário moveu o polígono após o auto-cálculo (layout.mainPipeline salvo, mas
   layout.area mudou).
2. Pequenos desvios numéricos entre rotação Haversine (turf) e rotação plana (local frame)
   fazem o primeiro ponto da principal cair levemente fora da borda do polígono.
3. A principal é uma linha reta de extremidade a extremidade — não segue o contorno
   do polígono, podendo sair nas bordas.

**`corridorValidated`:** Existe no layout, mas não há alerta visual no mapa quando
`corridorValidated === false`. O usuário não sabe que precisa validar.

**Conclusão:** Pode ser regra construtiva (corredor de manutenção fora do campo) ou
desvio numérico. Precisa de alerta quando fora do polígono.

---

### 7. Elementos sem legenda

O mapa não tem nenhuma legenda visual. Elementos que precisam de identificação:

| Elemento | Cor atual | Problema |
|---|---|---|
| Adutora | `#E07B00` laranja | Igual à cor dos pontos de controle |
| Principal | `#1B5680` azul escuro | OK, mas sem rótulo |
| Lateral | `#3B82A6` azul médio | Sem distinção de ramal |
| Ramal/secundária | `#0D9F6E` teal | Sem distinção de lateral |
| Aspersor | `SECTOR_PALETTE` por setor | OK (colorido por setor) |
| Ponto de controle (`section_valve`) | `#E07B00` laranja | Igual à adutora; sem rótulo |
| Lateral órfã | `#EF4444` vermelho | Sem legenda que explique o que é |
| Elemento bloqueante | — | Não renderizado no mapa |

---

## Plano de correção (por ordem de impacto)

### Fase 1 — Diagnóstico puro (função pura, sem UI)

**1.1** Criar `buildMapNetworkConsistencyReport(result: IrrigationProjectResult): MapNetworkConsistencyReport`
em `src/lib/layout/irrigation-project.ts` ou arquivo separado
`src/lib/layout/map-consistency.ts`.

Interface proposta:
```ts
export interface MapNetworkConsistencyReport {
  sprinklersTotal: number;
  sprinklersInPhysicalColumns: number;
  sprinklersWithoutPhysicalColumn: number;

  physicalColumnsTotal: number;
  physicalColumnsRendered: number;           // total - orphans

  operationalSegmentsTotal: number;
  operationalSegmentsRendered: number;       // = laterais.length

  secondariesTotal: number;
  secondariesRendered: number;

  controlPointsTotal: number;
  controlPointsSectionValve: number;         // type === "section_valve"
  controlPointsLateralInlet: number;         // type === "lateral_inlet"

  principalOutsidePolygonPercent?: number;   // % do comprimento fora do polígono
  corridorValidated?: boolean;

  warnings: string[];                        // divergências não bloqueantes
  blockers: string[];                        // inconsistências graves
}
```

### Fase 2 — Correções visuais em ProjectMap.tsx

**2.1** Diferenciar cor da adutora e do ponto de controle.
- Adutora permanece `#E07B00` (laranja — identidade da tubulação de alimentação).
- Pontos de controle: mudar para `#F59E0B` (âmbar) com borda `#92400E`.
- Ou: pontos de controle para `#DC2626` (vermelho) indicando "pendente".

**2.2** Adicionar `lateral_inlet` como camada visual distinta (círculo menor, cor neutra)
para tornar explícita a conexão lateral → principal.

**2.3** Adicionar camada de colunas físicas completas (não só as operacionais):
- Renderizar `physicalColumns` como linhas cinza-claro sob as laterais operacionais.
- Isto mostra o tubo real (de extremidade a extremidade da coluna).
- As laterais operacionais (coloridas por setor) ficam sobrepostas.

**2.4** Adicionar legenda flutuante mínima (canto inferior esquerdo):
```
■ Adutora           (laranja)
■ Principal         (azul escuro)
— Ramal             (teal, tracejado)
— Lateral           (azul médio)
● Aspersor          (cor do setor)
● Ponto de controle (âmbar/vermelho)
```

**2.5** Adicionar badge/alerta quando `corridorValidated === false` e o traçado da
principal diverge do polígono.

**2.6** Usar `projectResult.hydraulic?.principalCoords` em vez de
`layout.mainPipeline.coordinates` para renderização da principal quando disponível
(garante consistência com o solver).

**2.7** Usar `projectResult.physical?.physicalColumns` para orphan laterals em vez
do `physicalColumns` cacheado.

### Fase 3 — Testes

**3.1** Testes para `buildMapNetworkConsistencyReport`:
- Projeto completo → `sprinklersWithoutPhysicalColumn === 0`
- Projeto completo → `operationalSegmentsRendered === operationalSegmentsTotal`
- Projeto completo → `secondariesTotal === secondariesRendered`
- `warnings` vazio em projeto válido
- `blockers` não vazio quando `orphanPhysicalColumns.length > 0`

**3.2** Regressão: suite existente deve continuar 490/490.

---

## Testes obrigatórios

1. `buildMapNetworkConsistencyReport(completeResult)` → `sprinklersWithoutPhysicalColumn === 0`
2. `buildMapNetworkConsistencyReport(completeResult)` → totais de operationalSegments, laterais, secondaries consistentes
3. `buildMapNetworkConsistencyReport(incompleteResult)` → `blockers.length > 0` quando há colunas órfãs
4. `buildMapNetworkConsistencyReport` → `physicalColumnsRendered === physicalColumnsTotal - orphans`
5. Projeto com split de coluna entre 2 setores → `operationalSegmentsTotal === 2` para aquela coluna, `physicalColumnsTotal === 1`
6. `warnings` inclui alerta quando `corridorValidated === false`
7. Regressão: `npx vitest run` → ≥ 490 testes

---

## Arquivos a criar

- `src/lib/layout/map-consistency.ts` — função pura `buildMapNetworkConsistencyReport`
- `src/lib/layout/__tests__/map-consistency.test.ts` — testes acima

## Arquivos a modificar

- `src/components/map/ProjectMap.tsx` — correções visuais (fases 2.1–2.7)
- `src/lib/layout/irrigation-project.ts` — re-exportar `MapNetworkConsistencyReport` se necessário

## Arquivos que NÃO serão alterados

- `src/lib/layout/hydraulic-sizing.ts` — solver hidráulico
- `src/lib/layout/laterais.ts` — motor de laterais (corrigido em 008B)
- `src/lib/layout/sectorization.ts` — motor de setorização
- `src/lib/bom.ts` — motor comercial (BOM)
- `src/lib/catalog/aspersores.ts` — catálogo (read-only para SKUs)
- `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`

---

## Legenda técnica proposta

| Elemento | Cor proposta | Estilo | Observação |
|---|---|---|---|
| Adutora | `#E07B00` laranja | Linha sólida 2.5px + casing branco | Mantém cor atual |
| Principal | `#1B5680` azul escuro | Linha sólida 3px + casing branco | Mantém cor atual |
| Coluna física (fundo) | `#94A3B8` cinza-azulado | Linha sólida 1px, opacidade 0.4 | **Nova** — tubo real |
| Ramal/secundária | `#0D9F6E` teal | Linha tracejada 2px + casing branco | Mantém cor; melhorar rótulo |
| Lateral operacional | `SECTOR_PALETTE[sectorId]` | Linha sólida 1.5px | Usa cor do setor |
| Aspersor | `SECTOR_PALETTE[sectorId]` | Círculo 2–4px | Mantém comportamento atual |
| Setor (label) | Círculo preto + texto branco | Ponto 10–20px | Mantém comportamento atual |
| Ponto de controle — section_valve | `#F59E0B` âmbar | Círculo 4px + halo branco | **Mudar** de `#E07B00` |
| Lateral órfã | `#EF4444` vermelho | Linha sólida 3px | Mantém; adicionar legenda |
| Elemento bloqueante | `#DC2626` vermelho | Badge/overlay | **Novo** — a definir |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Mudar renderização de principal para `hydraulic.principalCoords` pode divergir de projetos salvos com `source: "manual"` | Média | Alto | Só substituir quando `source === "auto"` ou quando `hydraulic.principalCoords` disponível |
| Adicionar camada de colunas físicas completas pode degradar performance em projetos grandes (>500 aspersores) | Baixa | Médio | Renderizar apenas quando zoom > 14 |
| Mudança de cor do ponto de controle pode impactar projetos já exportados em PDF (cor no mapa-imagem) | Baixa | Baixo | PDF não renderiza mapa do Mapbox; usa captura do canvas |
| `physicalColumns` cacheado vs. `projectResult.physical?.physicalColumns` — substituição pode mudar comportamento em modo de edição | Baixa | Médio | Usar `projectResult.physical?.physicalColumns` diretamente, sem cache separado |

---

## O que não será feito

- Não alterar solver hidráulico (`hydraulic-sizing.ts`)
- Não alterar critérios de velocidade, perda de carga ou PN
- Não alterar seleção de tubos
- Não alterar setorização
- Não remover blockers
- Não esconder problema técnico com CSS (opacidade zero, display none, etc.)
- Não implementar motor A/B/C, motor comercial
- Não alterar SKUs do catálogo
- Não gerar nova tubulação ou rota — apenas renderizar o que o motor já calculou

---

## Sequência de implementação recomendada

```
1. Criar buildMapNetworkConsistencyReport + testes  ← pura, sem risco
2. Corrigir cor section_valve (orange → amber)      ← 1 linha em ProjectMap
3. Adicionar camada de colunas físicas (fundo)       ← nova Source/Layer
4. Adicionar legenda flutuante mínima               ← novo componente UI simples
5. Adicionar alerta corridorValidated === false      ← condicional no painel lateral
6. Avaliar substituição de layout.mainPipeline por hydraulic.principalCoords  ← risco médio, fase final
```
