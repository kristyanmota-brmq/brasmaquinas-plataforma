# Arquitetura Atual — Brasmáquinas Plataforma

**Data:** 2026-05-19  
**Versão analisada:** branch `main`, 295/295 testes passando  
**Propósito:** auditoria para reestruturação

---

## 1. Estrutura de Arquivos

```
brasmaquinas-plataforma/
├── prisma/
│   └── schema.prisma                    [INFRA] único modelo de dados persistente
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                   [SHELL] html/body, fontes, Clerk provider
│   │   ├── middleware.ts                [INFRA] Clerk — protege /projetos/* e /api/projetos/*
│   │   ├── projetos/
│   │   │   ├── page.tsx                 [UI] lista de projetos (server component)
│   │   │   ├── novo/page.tsx            [UI] formulário de criação (não lido — presumido)
│   │   │   └── [id]/
│   │   │       ├── page.tsx             [UI] detalhe do projeto — renderiza <ProjectMap>
│   │   │       └── actions.ts           [API] Server Actions + tipo ProjectLayout
│   │   └── api/
│   │       └── projetos/[id]/pdf/
│   │           └── route.tsx            [API] POST → gera PDF via react-pdf/renderer
│   │
│   ├── components/
│   │   ├── brand/
│   │   │   └── Header.tsx               [UI] cabeçalho global
│   │   └── map/
│   │       ├── ProjectMap.tsx           [UI+LOGIC] componente deus — 1 500+ linhas
│   │       └── MemorialPanel.tsx        [UI] tabela de laterais + export .md
│   │
│   └── lib/
│       ├── prisma.ts                    [INFRA] singleton PrismaClient
│       ├── bom.ts                       [DOMAIN] buildBOM, generateProposalDiagnostics
│       ├── hydraulics/
│       │   └── hazenWilliams.ts         [DOMAIN] headLoss, velocity, selectDiameter
│       ├── catalog/
│       │   └── aspersores.ts            [DATA] catálogo estático de peças + selectTubo
│       ├── layout/
│       │   ├── laterais.ts              [DOMAIN] generatePhysicalColumns, generateLaterais
│       │   ├── principal.ts             [DOMAIN] generatePrincipalAndAdutora
│       │   ├── sectorization.ts         [DOMAIN] buildSectorsByFlowWithColumnSplitting
│       │   ├── constructability.ts      [DOMAIN] buildConstructabilityReport, ControlPoint
│       │   ├── hydraulic-graph.ts       [DOMAIN] tipos HydraulicNode / HydraulicEdge
│       │   ├── hydraulic-connectivity.ts [DOMAIN] generateSecondaries, validateHydraulicConnectivity
│       │   ├── pipeline-types.ts        [DOMAIN] tipos de segmento, bendAngleDeg, simplifyPolyline
│       │   ├── pipeline-diagnostics.ts  [DOMAIN] generatePipelineRouteDiagnostics
│       │   └── __tests__/               [TEST] 10 arquivos, 295 testes
│       └── pdf/
│           └── PropostaPDF.tsx          [UI] documento PDF via react-pdf/renderer
```

### Classificações

| Tag | Significado |
|-----|-------------|
| `INFRA` | Plumbing: banco, auth, middleware |
| `API` | Ponto de entrada HTTP (Server Action ou Route Handler) |
| `UI` | Componentes React puros — nenhuma lógica de negócio deveria estar aqui |
| `UI+LOGIC` | Componente React que contém lógica de negócio (problema) |
| `DOMAIN` | Lógica de negócio pura — funções sem efeitos colaterais |
| `DATA` | Catálogo estático / constantes de domínio |

---

## 2. Modelo de Dados Completo

### 2.1 Persistência (Prisma)

```prisma
// schema.prisma — modelo único
model Project {
  id        String        @id @default(cuid())
  name      String
  client    String?
  city      String?
  state     String?
  status    ProjectStatus @default(DRAFT)
  ownerId   String
  data      Json?         // ← TODA a lógica vive aqui como blob não tipado
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}

enum ProjectStatus {
  DRAFT | PRELIMINARY | FINAL_PENDING_APPROVAL | FINAL_RELEASED | SENT | WON | LOST
}
```

**Observação crítica:** não existe tabela `Sprinkler`, `Sector`, `Lateral`, `Pipeline`. Tudo está em `data: Json?`.

### 2.2 Layout (blob TypeScript)

```typescript
// src/app/projetos/[id]/actions.ts
interface ProjectLayout {
  // Geometria da área
  area?: GeoJSON.Polygon;
  areaHectares?: number;
  perimeterMeters?: number;
  centroid?: { lng: number; lat: number };

  // Pontos de referência hídrica
  waterSource?: { lng: number; lat: number; elevation?: number };
  pumpLocation?: { lng: number; lat: number; elevation?: number } | null;
  pumpSeparate?: boolean;

  // Elevação
  areaElevation?: number;
  geodetic?: { distanceSourceToAreaMeters?: number; elevationDeltaMeters?: number };
  geocoded?: { city?: string; state?: string; fullAddress?: string };

  // Malha de aspersores
  sprinklers?: {
    aspersorId: string;
    positions: [number, number][];       // ← array de coordenadas brutas
    count: number;
    vazaoProjetoM3PorHora: number;
    espacamentoM: number;
    gridAngleDegrees: number;
    angleMode: "auto" | "manual";
  };

  // Setorização
  sectorization?: {
    jornadaHoras: 9 | 14 | 21;
    laminaMm: 10;
    setoresCount: number;
    tempoPorSetorMinutos: number;
    aspersoresPorSetor: number;
    vazaoPorSetorM3PorHora: number;
    sectorIndices: number[];             // ← índice paralelo a sprinklers.positions
  };

  // Rede principal
  mainPipeline?: {
    coordinates: [number, number][];     // polilinha da principal
    adutora?: [number, number][];        // captação → entrada da principal
    lengthMeters: number;
    segments: number;
    elevationStartM?: number;
    elevationEndM?: number;
    elevationDeltaM?: number;
    source: "auto" | "manual";
    corridorValidated?: boolean;
  };

  // Viewport do mapa
  center?: { lng: number; lat: number; zoom: number };
}
```

### 2.3 Tipos computados (não persistidos)

```typescript
// hazenWilliams.ts
interface TuboCandidato { sku, diametroMm, pressaoMca, custo, precoVenda, coefC }
interface SelecaoTubo   { tubo: TuboCandidato; perdaCargaM; velocidadeMs; perdaCargaPercentual }

// laterais.ts
interface PhysicalColumn {
  id, columnIndex
  startLngLat, endLngLat: [number, number]  // extremidades no CRS geográfico
  comprimentoM, sprinklerCount, vazaoM3h
  selecao: SelecaoTubo
  sectorsTouched: number[]
  sprinklerIndices: number[]
}
interface Lateral {
  sectorId, columnIndex
  startLngLat, endLngLat, derivacaoLngLat: [number, number]
  sprinklerCount, comprimentoM, vazaoM3h
  selecao: SelecaoTubo
}

// constructability.ts
interface ControlPoint {
  id, physicalColumnId, operationalSegmentId, sectorId
  coordinate: [number, number]
  type: "lateral_inlet" | "section_valve" | "isolation_valve"
         | "independent_feed_required" | "manual_validation_required"
  status: "resolved" | "pending"
}

// hydraulic-connectivity.ts
interface SecondaryPipe {
  id, physicalColumnId
  fromCoord: [number, number]    // ponto na principal
  toCoord: [number, number]      // lateral_inlet (startLngLat da coluna)
  lengthM, source: "auto"
}
interface HydraulicConnectivityReport {
  isConnected: boolean
  orphanPhysicalColumns: string[]
  missingSecondaryConnections: string[]
  secondaries: SecondaryPipe[]
  totalSecondaryLengthM: number
  connectedColumnsCount, disconnectedColumnsCount: number
  warnings: string[], blockers: string[]
}

// bom.ts
interface BOMItem { sku, descricao, marca, unidade, quantidade, precoUnitario, total, categoria }
interface BOM {
  itens: BOMItem[]
  totalGeral: number
  laterais: Lateral[]       // ← laterais operacionais (usado no MemorialPanel)
  meta: {
    diametroPrincipalMm, diametroPrincipalCalculadoMm, barrasDeTubo
    nCurvas90, nTes, nLaterais, nColunasLaterais
    comprimentoLateraisM, comprimentoAdutoraM, comprimentoSecundariasM
    aspersoresPorSetorMin, aspersoresPorSetorMax, aspersoresPorSetorMedia
    vazaoPorSetorMin, vazaoPorSetorMax, desbalanceamentoSetoresPercent
    operationalSegmentsCount, physicalColumnsSplitCount, maxSegmentsPerPhysicalColumn
    splitControlPointsCount, splitPointsCount, unresolvedOperationalSegmentsCount
    controlPointsCount, pendingControlPointsCount, independentFeedRequiredCount
    constructabilityStatus: "ok" | "pending_control_validation" | "blocked_unfeedable_segments"
  }
}
```

---

## 3. Funções Centrais — Código Completo

### 3.1 `generatePhysicalColumns` (laterais.ts)

Agrupa todos os aspersores em colunas físicas (independente de setorização) e calcula comprimento real de tubo.

**Algoritmo:**
1. Converte cada aspersor do CRS geográfico para frame local rotacionado (`-gridAngleDegrees` em torno do centroide)
2. Agrupa por `colIdx = round((x - xMin) / spacing)` — robusto contra drift numérico
3. Dentro de cada grupo, detecta gaps `> 1.5 × spacing` no eixo Y → cria segmento físico separado
4. Seleciona tubo via Hazen-Williams com fator de Christiansen (`F`)
5. Converte extremos de volta para LngLat

**Assinatura:**
```typescript
generatePhysicalColumns(
  positions: [number, number][],
  gridAngleDegrees: number,
  centroid: { lng, lat },
  spacingMeters: number,
  aspersor: AspersorMin,        // { vazao, pressaoServico }
  catalogoLF: TuboCandidato[],
  sectorIds?: number[],         // para popular sectorsTouched
  maxPerdaPercentual = 0.20,
): PhysicalColumn[]
```

**Invariante de sanidade:**
```typescript
if (result.length > positions.length / 3) {
  console.warn("Fragmentação excessiva: ...");
}
```

---

### 3.2 `generateLaterais` (laterais.ts)

Gera laterais operacionais (setor × coluna). Replica internamente a lógica de agrupamento de `generatePhysicalColumns`, mas por setor — não por toda a malha.

**Usado para:** visualização no mapa (linhas por setor), `MemorialPanel`, contagem de Tês (porém hoje o Tê vem de `physicalCols`). **Não usado** para comprimento de tubo na BOM.

**Problema:** duplica o algoritmo de agrupamento de `generatePhysicalColumns`. As duas funções podem divergir se uma for refatorada sem a outra.

---

### 3.3 `buildSectorsByFlowWithColumnSplitting` (sectorization.ts)

Distribui os aspersores em setores com base em vazão acumulada, preservando a ordem X→Y da malha física.

**Algoritmo:**
1. Itera `physicalColumns` em ordem (X crescente)
2. Para cada coluna, itera aspersores em ordem (Y crescente)
3. Acumula `accFlow += vazao_aspersor`; quando `accFlow >= (currentSector + 1) × targetFlow`, avança o setor
4. Resultado: `sectorIndices[]` paralelo a `positions[]`

**Invariante crítica:** colunas físicas podem ser divididas entre setores. A transição de setor dentro de uma coluna cria um ponto de corte operacional que precisa de `section_valve`.

---

### 3.4 `generatePrincipalAndAdutora` (principal.ts)

Gera a linha principal (polilinha de derivações) e a adutora (captação → entrada da principal).

**Algoritmo:**
1. Converte extremos de todas as `PhysicalColumn` para frame local
2. Determina o lado da captação (`side: "min" | "max"`) pelo Y da `waterSource`
3. `principalY = yMinGlobal` (ou `yMaxGlobal`) — fixo para todas as colunas
4. Ordena colunas por X; deduplica com `EPS_X = 1e-6` (colunas com gap físico no eixo Y têm mesmo `xRep`)
5. Cada coluna → um ponto de derivação `[xLateral, principalY]`
6. Ponto de entrada da adutora = extremidade da principal mais próxima da captação
7. Valida 4 invariantes (I1–I4) antes de retornar

**Efeito colateral:** quando o campo tem borda sul irregular, `yMinGlobal < yMin_col` para várias colunas → gap → `generateSecondaries` necessário.

---

### 3.5 `christiansenF` (laterais.ts)

```typescript
export function christiansenF(numOutlets: number): number {
  if (numOutlets <= 1) return 1;
  const m = 1.852;
  const N = numOutlets;
  return 1 / (m + 1) + 1 / (2 * N) + Math.sqrt(m - 1) / (6 * N * N);
}
```

Fator de Christiansen para laterais com saídas múltiplas (reduz perda calculada para refletir vazão decrescente ao longo do tubo).

---

### 3.6 `selectDiameter` / `selectTubo` (hazenWilliams.ts / aspersores.ts)

`selectDiameter` — genérico, itera candidatos em ordem crescente de diâmetro, retorna o menor que satisfaz `hf ≤ pressaoReferencia × maxPerdaPercentual`.

`selectTubo` — wrapper para principal/adutora: usa `TUBOS_PVC_RIGIDO` e gate de **velocidade ≤ 1,5 m/s** (não perda de carga percentual). Nenhum gate de HMT.

---

### 3.7 `generateSecondaries` (hydraulic-connectivity.ts)

Para cada `PhysicalColumn`, projeta ortogonalmente o `startLngLat` (ou `endLngLat`, o mais próximo do lado captação) na polilinha da principal. Se `gap > minGapM (0.5 m)`, cria um `SecondaryPipe`.

**Projeção:** usa produto escalar em coordenadas escaladas (`dx × mPerLng`, `dy × M_PER_DEG_LAT`) para preservar proporção métrica sem projeção Haversine.

---

### 3.8 `buildConstructabilityReport` (constructability.ts)

1. Chama `generateControlPoints` → para cada coluna, gera `lateral_inlet` (resolved) + `section_valve` (pending) por transição de setor consecutiva
2. Chama `generateColumnDiagnostics` → diagnóstico por coluna
3. Chama `evaluateConstructability` → status global: `ok | pending_control_validation | blocked_unfeedable_segments`

---

### 3.9 `buildBOM` (bom.ts)

Função orquestradora que chama todas as anteriores e monta o objeto `BOM`.

**Sequência de chamadas:**
```
buildBOM(layout)
  ├── generateLaterais(...)           → laterais operacionais (memorial, Tê — mas Tê vem de physicalCols)
  ├── generatePhysicalColumns(...)    → colunas físicas (comprimento de tubo, Tê, construtibilidade)
  ├── generateSecondaries(...)        → ramais de conexão (BOM, comprimento total)
  ├── buildConstructabilityReport(...)→ pontos de controle, status
  ├── selectTubo(vazaoPorSetor)       → diâmetro da principal e adutora
  ├── calculatePipelineDiameterMm(...)→ diâmetro calculado (informativo, não usado na seleção de tubo)
  ├── selectCurva(...) / selectTe(...)→ conexões
  └── retorna BOM { itens, totalGeral, laterais, meta }
```

---

## 4. Fluxo de Ponta a Ponta

### 4.1 Criação e edição de projeto

```
Browser                    Server
──────                     ──────
/projetos/novo             → page.tsx (cria Project DRAFT via Prisma)
/projetos/[id]             → page.tsx (lê project.data → ProjectLayout)
                           → renderiza <ProjectMap initialLayout={layout} />

ProjectMap (client)
├── Etapa 1: Desenhar área → GeoJSON.Polygon → layout.area, areaHectares, centroid
├── Etapa 2: Posicionar waterSource → layout.waterSource
├── Etapa 3: Auto-grade sprinklers → layout.sprinklers (positions[], count, espacamentoM, gridAngleDegrees)
├── Etapa 4: Setorizar → layout.sectorization.sectorIndices[]
├── Etapa 5: Gerar pipeline → layout.mainPipeline (auto ou manual)
└── Cada etapa → saveProjectLayout(projectId, layout) [Server Action]
                 → prisma.project.update({ data: layout })
                 → revalidatePath
```

### 4.2 Geração de PDF

```
ProjectMap
└── botão "Exportar PDF"
    ├── captura screenshot do mapa (MapLibre → canvas → base64)
    └── POST /api/projetos/[id]/pdf { mapImage }
        └── route.tsx
            ├── prisma.project.findUnique
            ├── buildBOM(layout)          → computação completa no servidor
            ├── renderToBuffer(<PropostaPDF .../>)
            └── resposta: application/pdf
```

### 4.3 Cálculo hidráulico no mapa (client-side)

```typescript
// ProjectMap.tsx — useMemos encadeados (executam no browser)
const physicalColumns = useMemo(() => generatePhysicalColumns(...), [...])
const laterais        = useMemo(() => generateLaterais(...), [...])
const sectorLabels    = useMemo(() => ... turf.centroid ..., [...])
const controlPoints   = useMemo(() => buildConstructabilityReport(...).controlPoints, [...])
const secondaries     = useMemo(() => generateSecondaries(...), [...])
const connectivityReport = useMemo(() => validateHydraulicConnectivity(...), [...])
const bom             = useMemo(() => buildBOM(layout), [...])
const pipelineDiagnostics = useMemo(() => generatePipelineRouteDiagnostics(layout), [...])
```

**Toda a hidráulica é recalculada no browser a cada mudança de estado.**

---

## 5. Acoplamentos Problemáticos

### 5.1 `bom.ts` é o único orquestrador — e está errado para isso

`bom.ts` chama `generateLaterais`, `generatePhysicalColumns`, `generateSecondaries`, `buildConstructabilityReport`, `selectTubo`, `calculatePipelineDiameterMm`, `selectCurva`, `selectTe`, `ASPERSOR_PADRAO`, `ADESIVO_PVC`, `TUBO_SUBIDA_PVC_BR`, `TUBOS_PVC_LF`, `TUBOS_PVC_RIGIDO`, `TES_DERIVACAO_LATERAL`. São 14 dependências diretas. Qualquer mudança em qualquer uma dessas quebra a BOM. Não há camada intermediária.

### 5.2 `ProjectMap.tsx` contém lógica de negócio

O componente de mapa executa `buildBOM`, `generatePhysicalColumns`, `generateLaterais`, `buildConstructabilityReport`, `generateSecondaries`, `validateHydraulicConnectivity`, `generatePipelineRouteDiagnostics` — tudo dentro de `useMemo`. Isso significa:
- A lógica de domínio é acoplada ao ciclo de vida do React
- Não há como executar esses cálculos fora do browser sem montar o componente
- Testes de integração do fluxo completo exigiriam renderizar o componente

### 5.3 `generatePhysicalColumns` e `generateLaterais` duplicam o agrupamento

As duas funções implementam o mesmo algoritmo de agrupamento por coluna (X arredondado, gap threshold, sort por Y). Se o algoritmo mudar em uma, a outra diverge silenciosamente. `generateLaterais` usa `tolerance = spacing * 0.5` com greedy; `generatePhysicalColumns` usa `round((x - xMin) / spacing)`. Já são diferentes hoje — e produzem contagens diferentes para campos irregulares.

### 5.4 O modelo de persistência é um blob opaco

`data: Json?` não tem schema no banco. Um campo adicionado ao TypeScript (`corridorValidated`, `pumpSeparate`) não existe em registros antigos — o código tem que lidar com `undefined` silenciosamente ou vai quebrar ao ler projetos antigos. Não há migração de schema. Não há versioning. Não há audit trail de quem mudou o quê.

### 5.5 `selectTubo` usa gate de velocidade, não de perda de carga

```typescript
// aspersores.ts
export function selectTubo(vazaoM3h: number): TuboPVCRigido {
  return TUBOS_PVC_RIGIDO.find((t) => velocity(vazaoM3h, t.diametroMm) <= 1.5)
    ?? TUBOS_PVC_RIGIDO[TUBOS_PVC_RIGIDO.length - 1];
}
```

Para laterais, `selectDiameter` usa perda de carga percentual. Para a principal e adutora, só velocidade. O dimensionamento da principal ignora completamente: (a) a perda de carga acumulada da principal até a lateral mais distante, (b) o desnível, (c) a HMT disponível da bomba. O aviso W4 em `generateProposalDiagnostics` documenta isso, mas o problema não está resolvido.

### 5.6 Não há modelo de bomba

`ProjectLayout` não tem campo `pump`. A HMT não pode ser calculada. `elevationDeltaM` existe mas não é usada em nenhum cálculo. Warnings W4 e W5 são permanentes para todos os projetos.

### 5.7 `bom.meta.comprimentoSecundariasM` é recalculado 3 vezes

`generateSecondaries` é chamada em:
1. `buildBOM` (para a BOM)
2. `ProjectMap` (useMemo `secondaries`)
3. `generateProposalDiagnostics` não recalcula, mas usa `bom.meta.comprimentoSecundariasM`

O resultado deveria ser idêntico, mas cada chamada percorre a projeção ortogonal de novo. Para projetos grandes (100+ colunas), isso é 3× o trabalho.

### 5.8 Labels de setor usam centroide do turf, não o ponto de derivação real

```typescript
// ProjectMap.tsx
const sectorLabelsGeoJSON = useMemo(() => {
  // usa turf.centroid da coleção de posições do setor
  // deveria usar PhysicalColumn.startLngLat da primeira coluna do setor
}, [...]);
```

O label aparece no centro geométrico do setor, não no ponto onde a lateral conecta à principal. Para campos irregulares, os dois podem ser metros ou dezenas de metros separados.

### 5.9 `MemorialPanel` exporta só Markdown e só laterais

O memorial descritivo (`MemorialPanel.tsx`) lista apenas as laterais operacionais (`Lateral[]`). Não inclui principal, adutora, ramais, pontos de controle, ou qualquer dado da BOM. O export é somente `.md` — sem PDF, sem JSON estruturado.

### 5.10 Dois caminhos de cálculo sem reconciliação

O fluxo de geração de PDF (`route.tsx → buildBOM`) e o fluxo de visualização no mapa (`ProjectMap → useMemo`) são independentes. Se a lógica de BOM divergir do que está no mapa (por exemplo, porque o mapa usa um estado de `layout` ainda não salvo), o PDF pode mostrar números diferentes do que o engenheiro está vendo.

---

## 6. O que não existe e deveria existir

### 6.1 Solver hidráulico completo (HMT end-to-end)

**O que existe:** Hazen-Williams por trecho. Dimensionamento da lateral por `hf ≤ 20% Ps`. Dimensionamento da principal por `V ≤ 1,5 m/s`.

**O que falta:**
- Perda de carga acumulada: lateral → ramal → principal → adutora → bomba
- Pressão residual em cada aspersor (ponto mais desfavorável)
- HMT total = desnível + perda adutora + perda principal + perda lateral + perda localizada
- Curva `Q-H` da bomba selecionada
- Ponto de operação: interseção curva da bomba × curva do sistema

Sem isso, a proposta nunca pode garantir que os aspersores vão operar na pressão de serviço correta.

### 6.2 Modelo de bomba

`ProjectLayout` tem `pumpLocation` (coordenada) e `pumpSeparate` (booleano), mas nenhum dado hidráulico da bomba. Não há:
```typescript
pump?: {
  modelo: string;
  hmtMca: number;
  vazaoNominalM3h: number;
  potenciaCv: number;
  curvaQH?: { q: number; h: number }[];
}
```
Sem isso, o dimensionamento é incompleto por definição.

### 6.3 Camada de serviço / casos de uso

Hoje não há separação entre "o que o sistema sabe fazer" e "como o sistema persiste e apresenta". As funções de domínio são puras (bom), mas são orquestradas diretamente pelo componente de mapa e pelo `bom.ts`. Uma reestruturação deveria ter:

```
UseCases/
  CalculateLayoutUseCase       — recebe ProjectLayout, retorna LayoutResult
  GenerateBOMUseCase           — recebe LayoutResult, retorna BOM
  ValidateProposalUseCase      — recebe LayoutResult + BOM, retorna ProposalDiagnostics
  ExportPDFUseCase             — recebe LayoutResult + BOM + meta, retorna Buffer
```

### 6.4 Versionamento do modelo de dados

Toda mudança em `ProjectLayout` é silenciosamente retroativa. Campos opcionais com `?` são a única proteção. Deveria existir:
- Campo `schemaVersion: number` no blob
- Função `migrateLayout(data, fromVersion)` que atualiza blobs antigos ao ler
- Ou: estrutura de tabelas relacionais no banco com Prisma migrations

### 6.5 API REST estruturada

O único endpoint HTTP é o PDF (`POST /api/projetos/[id]/pdf`). Todo o resto usa Server Actions. Para integração futura (app mobile, webhooks, sistema de proposta externo), não existe API pública. Não há:
- `GET /api/projetos` — lista projetos
- `GET /api/projetos/[id]` — dados do projeto
- `POST /api/projetos/[id]/layout` — salva layout
- `GET /api/projetos/[id]/bom` — BOM sem gerar PDF

### 6.6 Validação de entrada (boundary)

Nenhuma função de domínio valida seus inputs. `generatePhysicalColumns([])` retorna `[]` silenciosamente. `buildBOM` faz early return `null` se algum campo faltar — mas não diz qual campo nem por quê. Para inputs corrompidos ou inesperados (um blob com schema inválido), o sistema pode calcular resultados errados sem emitir erro.

### 6.7 Diâmetro dos ramais (secundárias)

`generateSecondaries` cria os ramais mas não dimensiona o diâmetro. Todos os ramais usam o mesmo diâmetro da principal por omissão (`bom.ts` usa o mesmo `tubo` selecionado para a principal). Para o memorial hidráulico de um ramal de 50 m com a vazão de uma única coluna, o diâmetro correto pode ser diferente.

### 6.8 BOM de válvulas nos pontos de corte

`ControlPoint.type = "section_valve"` existe e é renderizado no mapa. Mas:
- Não há seleção de peça (qual válvula, qual SKU, qual diâmetro)
- Não entra na BOM como linha `"CONEXAO"`
- `status` permanece `"pending"` indefinidamente
- `pendingControlPointsCount > 0` gera W7 permanente para todo projeto com campo irregular

### 6.9 Testes de integração do fluxo completo

Os 295 testes cobrem funções de domínio isoladas. Não existe teste que cubra:
- "dado um `ProjectLayout`, o PDF gerado contém os valores corretos"
- "dado um `ProjectLayout` salvo, `buildBOM` produz os mesmos números que o mapa exibe"
- "mudar `gridAngleDegrees` e salvar produz um layout consistente"

Isso significa que divergências entre o mapa e o PDF só aparecem em runtime.

### 6.10 Estado de erro visível ao usuário

Quando `buildBOM` retorna `null` (campos faltando), o PDF route responde 422 com texto puro. O mapa não mostra nenhum erro — simplesmente não exibe a sidebar de BOM. Não há feedback de qual campo está faltando para o engenheiro completar o projeto.

---

## Resumo de Riscos por Prioridade

| # | Risco | Impacto | Arquivo(s) |
|---|-------|---------|------------|
| R1 | Sem HMT: proposta não garante pressão no aspersor | Qualidade técnica | `bom.ts`, `aspersores.ts`, `actions.ts` |
| R2 | Blob sem versioning: projetos antigos quebram silenciosamente | Confiabilidade | `schema.prisma`, `actions.ts` |
| R3 | Lógica de negócio em `ProjectMap.tsx` | Testabilidade, manutenção | `ProjectMap.tsx` |
| R4 | Dois caminhos de cálculo (mapa vs PDF) podem divergir | Confiabilidade | `ProjectMap.tsx`, `route.tsx` |
| R5 | Duplicação `generatePhysicalColumns` / `generateLaterais` | Risco de divergência | `laterais.ts` |
| R6 | Sem API REST: impossível integrar sistemas externos | Extensibilidade | `/api/` |
| R7 | `section_valve` pendente nunca entra na BOM | BOM incompleta | `constructability.ts`, `bom.ts` |
| R8 | Labels de setor no centroide errado | UX enganosa | `ProjectMap.tsx` |
