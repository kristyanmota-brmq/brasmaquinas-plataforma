# Cálculo Agronômico

> **[RASCUNHO — revisar com RT/agronômico]**
> Este documento foi gerado com base na implementação atual do código. Parâmetros marcados com
> `[RT]` ainda não foram validados formalmente com o responsável técnico agronômico da Brasmáquinas.

---

## 1. Aspersor padrão

O sistema opera atualmente com um único aspersor padrão:

| Parâmetro | Valor | Status |
|-----------|-------|--------|
| Modelo | Naan 5022-SD | confirmado no catálogo |
| Bocal | 4,0 × 1,8 mm | confirmado no catálogo |
| Pressão de serviço | 30 mca | `[RT]` confirmar faixa aceitável |
| Vazão | 1,5 m³/h | `[RT]` confirmar condição de operação |
| Raio molhado | 14 m | `[RT]` confirmar com curva do fabricante |
| Espaçamento padrão | 12 m | `[RT]` confirmar espaçamento campo a campo |

**Referência no código:** `src/lib/catalog/aspersores.ts` → `ASPERSOR_PADRAO`

---

## 2. Parâmetros de projeto

### 2.1 Lâmina de irrigação

- Valor fixo: **10 mm** por aplicação (campo `laminaMm` em `ProjectLayout.sectorization`)
- `[RT]` — Confirmar se é sempre 10 mm ou varia por cultura/fase fenológica

### 2.2 Jornada de irrigação

Opções disponíveis: **9h, 14h ou 21h** por dia

- `[RT]` — Confirmar critérios de escolha por jornada (tamanho da área, disponibilidade hídrica, cultura)
- Impacto: `tempoPorSetorMinutos = (jornadaHoras × 60) / nSetores`

### 2.3 Espaçamento entre aspersores

- Padrão: **12 m × 12 m** (espaçamento quadrado, grade regular)
- `[RT]` — Confirmar se outros espaçamentos são usados em campo (e.g., 12 × 18, triangular)
- Impacto direto na contagem de aspersores, na geometria das colunas físicas e na vazão por setor

---

## 3. Setorização

O sistema divide os aspersores em setores de vazão aproximadamente igual, operando um setor por vez ("one sector at a time").

**Algoritmo atual:** `buildSectorsByFlowWithColumnSplitting` em `src/lib/layout/sectorization.ts`

- Agrupa colunas físicas completas por setor sempre que possível
- Quando uma coluna física toca dois setores, cria ponto de controle (válvula de corte)
- Balanceamento: desbalanceamento máximo tolerado é 10% da vazão média
  - `[RT]` — Confirmar tolerância de desbalanceamento aceitável em campo

### 3.1 Vazão por setor

```
vazaoPorSetor = aspersoresPorSetor × vazaoPorAspersor
vazaoPorAspersor = vazaoTotalProjeto / totalAspersores
```

- `[RT]` — Confirmar se a vazão de projeto usa sempre a vazão nominal do bocal ou uma eficiência aplicada

---

## 4. Cálculo de área

- `areaHectares` é um campo informado pelo usuário (não calculado geometricamente)
- `[RT]` — Confirmar se o cálculo geométrico pela posição dos aspersores seria mais preciso
- Impacto: usado apenas em exibição e na proposta; não entra nos cálculos hidráulicos

---

## 5. Parâmetros não implementados (pendentes)

| Parâmetro | Impacto esperado | Status |
|-----------|-----------------|--------|
| Eficiência de aplicação | Corrigir lâmina real vs. nominal | `[RT]` não implementado |
| CUC (Coeficiente de Uniformidade de Christiansen) | Critério de qualidade da irrigação | `[RT]` não implementado |
| Culturas e fases fenológicas | Variar lâmina e jornada por fase | `[RT]` não implementado |
| Evapotranspiração (ET₀) | Base para cálculo de lâmina real | `[RT]` não implementado |

---

## 6. Referências

- `src/lib/catalog/aspersores.ts` — catálogo estático
- `src/lib/layout/sectorization.ts` — algoritmo de setorização
- `src/lib/layout/laterais.ts` — geração de colunas físicas e laterais
- `src/app/projetos/[id]/layout-schema.ts` — campos de `ProjectLayout`
