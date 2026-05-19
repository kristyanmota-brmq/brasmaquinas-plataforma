# Lista de Materiais (BOM)

---

## 1. Estrutura da BOM

A BOM (`BOMResult`) é gerada por `buildBOM(input: BOMInput)` em `src/lib/bom.ts`.

```typescript
BOMResult = {
  itens: BOMItem[];    // lista de peças
  totalGeral: number;  // soma de todos os totais
  laterais: Lateral[]; // laterais para memorial descritivo
  meta: { ... };       // estatísticas: comprimentos, contagens, desbalanceamento
}
```

Cada `BOMItem`:
```typescript
{
  sku: string;
  descricao: string;
  marca: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  categoria: "ASPERSOR" | "TUBO" | "CONEXAO" | "ACESSORIO";
}
```

---

## 2. Categorias de material

### 2.1 ASPERSOR
- 1 aspersor Naan 5022-SD por posição
- Quantidade = `sprinklers.count`

### 2.2 TUBO
Em ordem de inclusão na BOM:

| Trecho | Catálogo | Critério de agrupamento |
|--------|----------|------------------------|
| Tubo de subida (riser) | `TUBO_SUBIDA_PVC_BR` | 1 barra por 2 aspersores |
| Laterais | `TUBOS_PVC_LF` (PN40) | agrupado por SKU da coluna física |
| Ramais | `TUBOS_PVC_RIGIDO` (PN80) | **agrupado por SKU do tubo selecionado individualmente (P4)** |
| Principal | `TUBOS_PVC_RIGIDO` (PN80) | único tubo por setor de maior vazão |
| Adutora | `TUBOS_PVC_RIGIDO` (PN80) | mesmo tubo da principal |

### 2.3 CONEXAO
- Tês de derivação lateral: 1 por coluna física, agrupado por diâmetro
- Curvas 90° da principal: min 2 curvas, +1 por vértice intermediário
- Tê da principal: 1 unidade (conexão adutora→principal)

### 2.4 ACESSORIO
- Adesivo PVC: 1 frasco por 30 m de tubulação total

---

## 3. Catálogo — fonte da verdade

**Arquivo:** `src/lib/catalog/aspersores.ts`

| Array | Tipo | Uso |
|-------|------|-----|
| `TUBOS_PVC_LF` | PN40 — laterais | seleção por coluna física |
| `TUBOS_PVC_RIGIDO` | PN80 — principal, adutora, ramais | seleção por velocidade/hf |
| `TUBO_SUBIDA_PVC_BR` | roscável 3/4" | fixo por aspersor |
| `TES_DERIVACAO_LATERAL` | LF | 1 por coluna física |
| `CURVAS_90_RIGIDAS` | PN80 | por diâmetro da principal |
| `ADESIVO_PVC` | consumível | por comprimento total |

**Regra:** SKUs existentes não mudam. Novos itens são adicionados ao final dos arrays.

---

## 4. Seleção de tubo

### 4.1 Laterais

Selecionado por `selectDiameter` em `hazenWilliams.ts`:
- Critério: velocidade ≤ 2,5 m/s (máx lateral) E perda de carga ≤ 20% da pressão de serviço
- Menor tubo válido do catálogo `TUBOS_PVC_LF`

### 4.2 Principal e adutora

Selecionado por `selectPrincipalTube` em `hydraulic-sizing.ts`:
- Critério: velocidade ≤ 1,5 m/s com diâmetro **nominal** (BOM-safe)
- Setor de **maior vazão** (para garantir que a BOM cobre o pior caso de velocidade)

### 4.3 Ramais (P4)

Selecionado por `selectSecondaryPipe` em `secondary-sizing.ts`:
- Critério 1: velocidade ≤ 1,5 m/s com diâmetro **interno**
- Critério 2: hf ≤ 3,0 mca (10% × 30 mca pressão de serviço) com diâmetro **interno**
- Menor tubo válido; fallback ao maior com flag de violação
- Agrupado na BOM por SKU selecionado — diferentes ramais podem gerar SKUs diferentes

---

## 5. Comprimentos e unidades

Todos os comprimentos são em metros. Barras são calculadas por:

```
barras = ceil(comprimentoTotal / metrosPorBarra)
```

Onde `metrosPorBarra = 6` para todos os tubos PVC no catálogo atual.

---

## 6. Pendências da BOM

| Pendência | Status | Referência |
|-----------|--------|-----------|
| Válvulas de corte nos pontos de controle | pendente | TASK-005 |
| Validação de PN por trecho (pressão operacional vs. PN do tubo) | pendente | TASK-004 |
| Otimização por massa de PVC | pendente | TASK-006 |

---

## 7. Diagnósticos de proposta

`generateProposalDiagnostics(layout, bom, hydraulics?)` em `src/lib/bom.ts` compila:
- Warnings: desbalanceamento de setor, laterais físicas divididas, bomba não informada, ramais fora de limite
- Blockers: bomba insuficiente, segmentos hidráulicos inválidos, ramais sem alimentação física
- Status hidráulico: `hydraulicSolverStatus`, `pumpValidationStatus`, `hydraulicModelLimitations`
