# ADR-001 — Orquestrador único `calculateIrrigationProject`

**Data:** 2026-05-19
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

Durante as sessões T1–T9 (HIST-001), o motor técnico foi construído como um conjunto de funções independentes: `generatePhysicalColumns`, `sizeHydraulics`, `buildBOM`, `generateProposalDiagnostics`, entre outras. À medida que o número de módulos cresceu, surgiu o risco de que PDF, mapa e testes chamassem subconjuntos diferentes dessas funções, produzindo resultados inconsistentes — por exemplo, um PDF gerado com BOM preliminar (sem `sizedSecondaries`) enquanto o mapa exibia a BOM final.

A prova formal da cadeia (TASK-009B) confirmou que o motor tem 13 etapas em sequência com dependências explícitas. Qualquer ponto de entrada que "pule" etapas pode produzir estado parcial.

---

## Decisão

Decidimos que `calculateIrrigationProject(layout: ProjectLayout): IrrigationProjectResult`, em `src/lib/layout/irrigation-project.ts`, é o **único ponto de entrada** para executar o motor de irrigação. Nenhuma camada de UI (`src/components/`) ou rota de API (`src/app/api/`) pode chamar funções de domínio diretamente para construir um resultado de projeto.

---

## Alternativas consideradas

### Alternativa A — Múltiplos pontos de entrada por módulo

**Descrição:** PDF chama `sizeHydraulics()` diretamente; mapa chama `buildBOM()` com seu próprio conjunto de parâmetros.

**Por que foi descartada:** Resulta em estados paralelos com ciclos de vida diferentes. Uma mudança em `buildBOM` exigiria atualizar cada ponto de entrada. A prova da cadeia lógica (TASK-009B) mostrou que a BOM correta depende de `sizedSecondaries`, que só está disponível após o solver — uma chamada direta a `buildBOM` sem essa dependência produz BOM errada.

### Alternativa B — Orquestrador por camada (um para PDF, um para UI)

**Descrição:** Um `calculateForPDF()` otimizado para o PDF e um `calculateForMap()` otimizado para o mapa.

**Por que foi descartada:** Divergência inevitável entre as duas versões ao longo do tempo. O orquestrador único garante que mapa e PDF são sempre derivados do mesmo objeto `IrrigationProjectResult`.

---

## Consequências

### Positivas

- PDF e mapa derivam do mesmo objeto — divergência entre os dois é impossível por construção.
- O motor é testável com `vitest` sem qualquer dependência de React, Next.js ou browser.
- Mudanças no motor têm um único ponto de auditoria.
- A cadeia de 13 etapas pode ser verificada em um único teste de integração (`integration.test.ts`).

### Negativas / trade-offs

- O orquestrador é chamado mesmo quando a UI quer apenas verificar se um campo está preenchido — não há "modo rápido" sem a chain completa.
- Funções de etapas intermediárias (ex.: `generatePhysicalColumns`) são exportadas e testáveis diretamente, criando risco de uso externo indevido. O contrato público é o tipo de retorno do orquestrador.

### Neutras

- `pdfEmissionBlockers()` foi extraída como função pura adicional em `irrigation-project.ts` — não quebra o orquestrador, apenas expõe um subconjunto do resultado para uso na rota de PDF.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/irrigation-project.ts` | fonte de verdade — orquestrador |
| `src/app/api/projetos/[id]/pdf/route.tsx` | consumidor — chama `calculateIrrigationProject` |
| `src/app/projetos/[id]/page.tsx` | consumidor — passa resultado ao `ProjectMap` |
| `src/components/map/ProjectMap.tsx` | consumidor — recebe `IrrigationProjectResult` como prop |

---

## Classificação

- decisão de engenharia
- regra técnica (invariante de arquitetura)

---

## Referências

- HIST-001 — Auditar solver hidráulico V2 nos projetos L e P
- TASK-009B — Prova da cadeia lógica do motor de irrigação
- `docs/relatorios/2026-05-19-prova-cadeia-logica-motor.md`
- `docs/software/arquitetura.md` §1

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
