# ADR-004 — Lateral física vs. trecho operacional

**Data:** 2026-05-19
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

Na setorização de projetos de irrigação por aspersão, uma coluna de aspersores no campo pode ser operada em dois ou mais setores — a irrigação é feita em turnos, e uma coluna longa pode ser dividida no meio para equilibrar a vazão por setor.

Isso criou uma ambiguidade de modelagem: o "tubo" da lateral é uma entidade física (um comprimento contínuo de tubo no campo), mas o "trecho" de operação por setor é uma entidade lógica (a parte que opera em cada turno). Os dois têm comprimentos diferentes e são usados para propósitos diferentes.

A confusão entre os dois conceitos levaria a BOM errada (duplicar o comprimento do tubo) e a cálculos hidráulicos errados (usar comprimento operacional onde se quer comprimento de tubo e vice-versa).

---

## Decisão

Decidimos modelar dois tipos distintos de entidade:

- **`PhysicalColumn`** — representa o tubo físico no campo: um comprimento contínuo de tubo LF, do ponto de entrada até o último aspersor da coluna. É a entidade de **dimensionamento de tubo**, **BOM** e **tê de derivação**. Uma coluna física existe independentemente de quantos setores a atravessa.

- **`OperationalSegment`** — representa a parte de uma coluna física que opera em um único setor. É a entidade de **setorização** e **cálculo de vazão hidráulica**. Uma coluna física que atravessa dois setores gera dois `OperationalSegment`s.

A BOM usa `physicalColumn.comprimentoM` (comprimento do tubo físico), nunca a soma dos comprimentos operacionais. O solver usa `OperationalSegment` para determinar quais colunas operam juntas em cada setor.

---

## Alternativas consideradas

### Alternativa A — Usar apenas `OperationalSegment` para tudo

**Descrição:** Remover `PhysicalColumn`; modelar apenas segmentos operacionais. BOM somaria comprimentos operacionais.

**Por que foi descartada:** Uma coluna dividida entre dois setores teria seus comprimentos somados na BOM — dobrando o comprimento real do tubo. O campo instala **um** tubo físico, não dois.

### Alternativa B — Usar apenas `PhysicalColumn` para tudo

**Descrição:** Remover `OperationalSegment`; representar setorização como propriedade da coluna física.

**Por que foi descartada:** O solver precisa de entidades por setor para calcular vazão por setor e caminho crítico. Uma coluna física operando em dois setores tem fluxos diferentes nos dois trechos; modelar isso como propriedade única da coluna seria ambíguo.

---

## Consequências

### Positivas

- BOM de tubo lateral correta: `nColunasLaterais × comprimentoM` por coluna física, sem duplicação.
- Tês de derivação contados por coluna física (1 tê por coluna = 1 derivação da principal), não por segmento operacional.
- O solver pode construir lookup `physicalColumnId:sectorId → Lateral` para acesso eficiente sem recalcular.
- A prova da cadeia lógica (TASK-009B) confirmou o invariante: `nSecondaries = nPhysicalColumns` (1 ramal por coluna) e `nLaterais = nOperationalSegments` (1 lateral por segmento).

### Negativas / trade-offs

- Dois tipos com semântica próxima existem no modelo. Novos desenvolvedores precisam entender a distinção antes de alterar código de BOM ou solver.
- `OperationalSegment` referencia `physicalColumnId` — a rastreabilidade entre os dois tipos é obrigatória; perder esse link quebra o solver.

### Neutras

- `Lateral` é derivada de `OperationalSegment` (1:1), não de `PhysicalColumn`. O comprimento da Lateral é o comprimento da coluna física que a contém, mas a identidade da Lateral é a do segmento operacional.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/laterais.ts` | define e exporta `PhysicalColumn`, `generatePhysicalColumns` |
| `src/lib/layout/sectorization.ts` | define e exporta `OperationalSegment`, `deriveOperationalSegments` |
| `src/lib/bom.ts` | usa `physicalColumns.comprimentoM` para tubo e tê; usa `OperationalSegment` via laterais |
| `src/lib/layout/hydraulic-sizing.ts` | solver usa `OperationalSegment` por setor para caminho crítico |

---

## Classificação

- decisão de engenharia
- define fonte de verdade (comprimento de tubo para BOM)
- regra técnica (separação entre entidade física e entidade operacional)

---

## Referências

- HIST-001 — Auditar solver hidráulico V2 nos projetos L e P
- TASK-009B — Prova da cadeia lógica do motor de irrigação
- `docs/relatorios/2026-05-19-prova-cadeia-logica-motor.md` §Q8, §Q9, Achados 3 e 4

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
