# Cálculo Hidráulico

> **[RASCUNHO — revisar com RT/hidráulico]**
> Este documento descreve o solver implementado. Parâmetros marcados com `[RT]` ainda não foram
> validados formalmente com o responsável técnico. Limitações do modelo estão explicitadas.

---

## 1. Equação de perda de carga (Hazen-Williams)

O sistema usa exclusivamente a fórmula de Hazen-Williams no Sistema Internacional:

```
hf [m] = 10,67 × Q[m³/s]^1,852 / (C^1,852 × D_interno[m]^4,871) × L[m]
```

| Parâmetro | Valor usado | Fonte |
|-----------|------------|-------|
| Coeficiente C (PVC) | 145 | V0.5-RC §14 — `[RT]` confirmar C por faixa etária do tubo |
| Diâmetro | **interno real** (mm) | catálogo `diametroInternoMm` |
| Velocidade máxima | 1,5 m/s principal/ramal; 2,5 m/s lateral | `[RT]` confirmar limites de campo |

**Referência no código:** `src/lib/hydraulics/hazenWilliams.ts` → `headLoss`, `velocity`

---

## 2. Diâmetro interno vs. nominal

Tubos PVC têm parede espessa; usar diâmetro nominal superestima a seção e subestima o hf em 50–85% dependendo do DN e PN.

| Série | DN (mm) | OD (mm) | e (mm) | ID (mm) | hf nominal vs. real |
|-------|---------|---------|--------|---------|---------------------|
| LF PN40 (laterais) | 50 | 50 | 2,0 | 46 | ~50% subestimado |
| LF PN40 (laterais) | 75 | 75 | 3,0 | 69 | ~55% subestimado |
| Rígido PN80 (principal) | 75 | 75 | 4,5 | 66 | ~70% subestimado |
| Rígido PN80 (principal) | 125 | 125 | 7,0 | 111 | ~75% subestimado |

> `[RT]` — Confirmar espessuras com catálogo ABNT NBR 5648 (LF) e NBR 5647 (rígido) do fornecedor atual.

---

## 3. Laterais — Fator de Christiansen

Laterais com múltiplos emissores não têm fluxo constante. O fator F de Christiansen corrige a perda de carga:

```
F = 1/(m+1) + 1/(2N) + √(m-1)/(6N²)
onde m = 1,852 (expoente de Hazen-Williams), N = número de aspersores na lateral
```

```
hf_lateral_real = hf_HW_tubo_cheio × F
```

**Referência no código:** `src/lib/layout/laterais.ts` → `christiansenF(sprinklerCount)`

> `[RT]` — Confirmar se F de Christiansen é adequado para a configuração de lateral usada em campo (saídas laterais vs. em linha).

---

## 4. Caminho crítico exaustivo

O solver avalia **todos os setores × todos os segmentos operacionais** para encontrar o argmax de HMT global:

```
Para cada setor s:
  Para cada segmento operacional i:
    HMT(s,i) = pressaoServico + hfAdutora(s) + hfPrincipal(s→i) + hfRamal(s,i) + hfLateral(s,i) + desnivelM + localLosses + margem
  Registrar max HMT(s, i)
Retornar argmax global
```

O tubo da **principal** é selecionado pelo setor de **maior vazão** (garantia de velocidade e BOM imutável), mas o HMT é calculado com a vazão real do setor crítico.

**Referência no código:** `src/lib/layout/hydraulic-sizing.ts` → `sizeHydraulics`

---

## 5. Modelo de vazão decrescente na principal

A principal opera com vazão decrescente do ponto de entrada até a extremidade:

```
Ao cruzar a derivação do segmento i: remainFlow -= vazaoSetor(i)
```

A perda de carga acumulada até a derivação crítica é computada com o flow real em cada sub-segmento.

---

## 6. HMT — composição completa

```
HMT = pressaoServico + hfAdutora + hfPrincipal(até derivação) + hfRamal + hfLateral + desnivelM + localLosses + margem
```

| Componente | Valor padrão | Notas |
|------------|-------------|-------|
| Pressão de serviço | 30 mca | Naan 5022-SD |
| Desnível | `geodetic.elevationDeltaMeters` | Positivo = captação abaixo da área. `[RT]` confirmar convenção de sinal |
| Perdas locais | 10% da perda distribuída | `[RT]` confirmar fator de campo |
| Margem de segurança | 2 mca | `[RT]` confirmar margem mínima aceitável |

**Piso do HMT:** quando desnível for favorável (negativo), o HMT mínimo é `pressaoServico + localLosses + margem`.

---

## 7. Dimensionamento de ramais (P4)

Cada ramal é dimensionado individualmente:

| Critério | Valor | Notas |
|---------|-------|-------|
| Velocidade máxima | ≤ 1,5 m/s | diâmetro interno |
| Perda de carga máxima | ≤ 3,0 mca (10% × 30 mca) | diâmetro interno |
| Vazão de projeto | max lateral flow na coluna física | design flow; HMT usa vazão real do setor |
| Catálogo | `TUBOS_PVC_RIGIDO` (PN80) | `[RT]` confirmar se PN80 é obrigatório para ramais |

**Referência no código:** `src/lib/layout/secondary-sizing.ts` → `selectSecondaryPipe`, `sizeAllSecondaries`

---

## 8. Validação de bomba

```
pumpValidation.status:
  "not_informed"           — bomba não cadastrada (warning)
  "ok"                     — bomba ok em HMT e vazão
  "pump_insufficient_flow" — vazão máxima da bomba < setor crítico (blocker)
  "pump_insufficient_head" — HMT da bomba < HMT mínima (blocker)
```

`designFlowM3h` = **max setor flow** (não o setor crítico de HMT — a bomba deve cobrir o pior caso de vazão).

---

## 9. Limitações do modelo (HydraulicModelLimitations)

| Campo | Valor atual | Significado |
|-------|------------|-------------|
| `diameterAssumption` | `"internal"` | usa D interno do catálogo |
| `criticalPathModel` | `"exhaustive"` | varredura global |
| `localLossesModel` | `"percent_estimate"` | 10% da perda distribuída |
| `secondarySizingModel` | `"individual_velocity_and_headloss_checked"` | P4 ativo |
| `elevationModel` | `"waterSource_elevation_only"` | `[RT]` apenas desnível global; sem perfil de terreno |

> `[RT]` — O modelo de elevação atual assume terreno plano entre pontos intermediários. Em terrenos acidentados, o perfil completo da rede é necessário para HMT precisa.

---

## 10. Referências de código

| Arquivo | Função |
|---------|--------|
| `src/lib/hydraulics/hazenWilliams.ts` | `headLoss`, `velocity`, `selectDiameter` |
| `src/lib/layout/hydraulic-sizing.ts` | `sizeHydraulics` (orquestrador hidráulico) |
| `src/lib/layout/secondary-sizing.ts` | `selectSecondaryPipe`, `sizeAllSecondaries` |
| `src/lib/layout/laterais.ts` | `christiansenF` |
| `src/lib/layout/hydraulic-connectivity.ts` | `generateSecondaries`, `validateHydraulicConnectivity` |
