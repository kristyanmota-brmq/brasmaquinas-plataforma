# Diagnóstico do Software Atual — Quatro Pilares

**Data:** 2026-05-19
**Versão do software analisada:** commit `23609bc` (branch `main`)
**Testes na base:** 400/400 passando · TypeScript: 0 erros
**Autor:** Claude Sonnet 4.6 (agente de desenvolvimento)
**Referência:** `tasks/TASK-001-diagnostico-software-atual.md`

---

## Escopo e método

Este relatório diagnostica o estado atual do software contra os quatro pilares da plataforma de venda técnica assistida, conforme definido em `TASK-001`. A análise foi feita por **leitura direta de código** dos arquivos listados na task. Onde a leitura foi parcial ou ausente, o item é marcado como **evidência parcial** ou **risco a verificar**.

**Arquivos lidos integralmente:**
- `src/lib/layout/irrigation-project.ts`
- `src/lib/layout/pipeline-diagnostics.ts`
- `src/lib/layout/constructability.ts` (parcial — interface completa lida)
- `src/lib/layout/hydraulic-sizing.ts` (parcial — tipos e constantes lidos)
- `src/lib/bom.ts` (parcial — BOMInput, BOMResult, buildBOM lidos)
- `src/app/projetos/[id]/actions.ts`
- `src/app/projetos/[id]/layout-schema.ts`
- `src/app/api/projetos/[id]/pdf/route.tsx`
- `src/lib/catalog/aspersores.ts` (parcial — estruturas e aspersor padrão lidos)

**Arquivos não lidos (lacunas explícitas):**
- `src/lib/layout/laterais.ts`, `sectorization.ts`, `secondary-sizing.ts`, `hydraulic-connectivity.ts`, `sectorization.ts` — não lidos nesta sessão; diagnóstico dessas funções baseia-se em testes e no orquestrador
- `src/lib/pdf/PropostaPDF.tsx` — não lido; diagnóstico do PDF é baseado apenas na rota `route.tsx`
- `src/components/map/ProjectMap.tsx` — não lido

---

## Pilar 1 — Metodologia

### 1.1 Implementado e alinhado com a metodologia

| Item | Implementação | Evidência |
|------|--------------|----------|
| Orquestrador único `calculateIrrigationProject` | `irrigation-project.ts:175` | único ponto de entrada; PDF e UI consomem resultado |
| Hazen-Williams com diâmetro interno real | `hydraulic-sizing.ts:1–15` (header) | `secondarySizingModel = "individual_velocity_and_headloss_checked"` |
| Caminho crítico exaustivo | `hydraulic-sizing.ts:7` (header) | `criticalPathModel: "exhaustive"` no tipo `HydraulicModelLimitations` |
| Fator de Christiansen nas laterais | `hydraulic-sizing.ts` importa `christiansenF` | `lateralLossModel: "hazen_williams_christiansen_f"` |
| Perdas locais 10% | `hydraulic-sizing.ts:34` | `DEFAULT_LOCAL_LOSS_FACTOR_PERCENT = 10` |
| Desnível geodético | `hydraulic-sizing.ts` + `layout.geodetic?.elevationDeltaMeters` | `noElevationData` sinaliza ausência |
| Validação de bomba (`PumpValidation`) | `hydraulic-sizing.ts:52–58` | status estruturado `"not_informed" \| "ok" \| "pump_insufficient_flow" \| "pump_insufficient_head"` |
| Dimensionamento individual de ramais | `secondary-sizing.ts` via `sizeAllSecondaries` | P4, integrado ao solver |
| Construtibilidade com pontos de controle tipados | `constructability.ts:27–36` | `ControlPoint` com `type` e `status` |
| Diagnósticos com blockers e warnings | `pipeline-diagnostics.ts` | propagados para `IrrigationProjectResult.diagnostics` |
| BOM agrupada por SKU próprio de ramal | `bom.ts` | P4, BOM dupla no orquestrador |

### 1.2 Gap de código — documentado na metodologia mas não implementado

| Gap | Impacto | Referência metodológica | TASK |
|-----|:-------:|------------------------|------|
| Validação de PN por trecho (`pressaoExcedePn` em `HydraulicSegment`) | importante | `03-hidraulica.md` | TASK-004 |
| BOM de válvulas para `ControlPoint.type === "section_valve"` | importante | `05-lista-materiais.md` | TASK-005 |
| `section_valve` nunca tem `status: "resolved"` — a BOM não os resolve | importante | `05-lista-materiais.md`, `constructability.ts:26` | TASK-005 |
| Classificação A/B/C (`ProjectClassificationEngine`) | importante | `09-classificacao-de-projetos.md` | TASK-002 (bloqueada) |
| Log de aprovações e overrides com responsável + data/hora | importante | `09 §8`, `11 §4–5` | não formalizado |
| PDF bloqueia emissão quando `diagnostics.blockers` não está vazio | **gap de segurança** | `06-orcamento-proposta.md §5` | não formalizado — ver §1.4 abaixo |
| Premissas, exclusões e limites do modelo no PDF | melhoria | `testes-e-homologacao.md §3.5` | não formalizado |
| Motor Comercial (tipo de proposta, gates de emissão por classe) | melhoria | `arquitetura-motor-tecnico.md §Motor 3` | pós-TASK-002 |

### 1.3 Gap de metodologia — parâmetros pendentes de homologação por RT

Os valores abaixo estão implementados no código e são tecnicamente razoáveis (baseados em prática de engenharia convencional). No entanto, **não há registro de que o RT os homologou formalmente** para os projetos da Brasmáquinas. São "pendente de homologação metodológica/RT" — não erros técnicos.

| Constante | Valor atual | Arquivo:linha | Status |
|-----------|:-----------:|:-------------:|--------|
| `MAX_VEL_PRINCIPAL_MS` | 1,5 m/s | `hydraulic-sizing.ts:29` | pendente de homologação RT |
| `MAX_VEL_SECONDARY_MS` | 1,5 m/s | `hydraulic-sizing.ts:30` | pendente de homologação RT |
| `MAX_VEL_LATERAL_MS` | 2,5 m/s | `hydraulic-sizing.ts:31` | pendente de homologação RT |
| `MAX_LATERAL_LOSS_FRACTION` | 20% hf lateral | `hydraulic-sizing.ts:32` | pendente de homologação RT |
| `MAX_SECONDARY_LOSS_FRACTION` | 10% hf ramal | `hydraulic-sizing.ts:33` | pendente de homologação RT |
| `DEFAULT_SAFETY_MARGIN_MCA` | 2,0 mca | `hydraulic-sizing.ts:34` | pendente de homologação RT |
| `ASPERSOR_PADRAO.pressaoServicoMca` | 30 mca | `aspersores.ts:45` | definido no catálogo; único aspersor — pendente de revisão se catálogo expandir |

**Recomendação:** o RT deve revisar cada valor, confirmar que está dentro da metodologia da empresa e registrar a homologação. Isso não requer código — é uma decisão técnica que pode ser documentada em `docs/metodologia/03-hidraulica.md` (hoje `[RASCUNHO]`).

### 1.4 Gap crítico: PDF pode ser emitido com blockers ativos

**Evidência direta** (`route.tsx:24`):
```typescript
if (!result.isComplete || !result.bom) {
  return new NextResponse("Projeto incompleto...", { status: 422 });
}
```

A rota do PDF verifica apenas `isComplete` e `bom`. Não verifica `diagnostics.blockers`. Um projeto com `hydraulicSolverStatus === "blocked"` ou `corridorValidated === false` pode gerar PDF normalmente. Isso contradiz o gate de emissão definido em `06-orcamento-proposta.md §5` e `07-checklists-aprovacoes.md §5`.

**Impacto:** alto — é o único gate de emissão real que existe hoje, e está incompleto.

**Classificação:** gap de código — não requer Motor de Governança para corrigir. Uma verificação de `diagnostics.blockers.length === 0` na rota do PDF já resolveria.

---

## Pilar 2 — Engenharia de software

### 2.1 Critérios satisfeitos (`testes-e-homologacao.md §2`)

| Critério | Evidência | Status |
|----------|----------|:------:|
| `npx tsc --noEmit → 0 erros` | verificado 2026-05-19 | ✓ |
| `npx vitest run → 400/400` | verificado 2026-05-19 | ✓ |
| Contagem de testes não regride | CI integrado ao fluxo `/implementar` | ✓ |
| HMT L e P dentro de ±0,01 mca dos valores de sanidade | `integration.test.ts` | ✓ |
| Diâmetro interno usado em todos os cálculos de hf | `hydraulic-sizing.test.ts` | ✓ |
| Caminho crítico exaustivo | `hydraulic-sizing.test.ts` | ✓ |
| `pumpValidation.designFlowM3h === maxSectorFlow` | `hydraulic-sizing.test.ts` | ✓ |
| `secondarySizingModel === "individual_velocity_and_headloss_checked"` | `secondary-sizing.test.ts` | ✓ |
| Ramais agrupados por SKU próprio | `bom.test.ts` | ✓ |
| Laterais por coluna física | `bom.test.ts` | ✓ |
| Tês = nColunasLaterais | `bom.test.ts` | ✓ |
| `buildBOM` é função pura | `bom.ts:206` (sem efeitos colaterais) | ✓ |
| Blockers propagados corretamente | `pipeline-diagnostics.test.ts` | ✓ |
| Bomba insuficiente gera blocker | `hydraulic-sizing.test.ts` | ✓ |
| Ramal com violação gera warning | `secondary-sizing.test.ts` | ✓ |

### 2.2 Critérios pendentes

| Critério | Gap | Tipo |
|----------|-----|------|
| Validação de PN por trecho gera blocker | não implementado | gap de código (TASK-004) |
| `section_valve` resolvido na BOM | não implementado | gap de código (TASK-005) |
| PDF bloqueia quando `blockers` não vazio | não implementado | gap de código (ver §1.4) |
| Preços do catálogo com data conhecida de atualização | processo não formalizado | gap de disciplina operacional |
| PDF com premissas, exclusões e `HydraulicModelLimitations` | não implementado | gap de código |

### 2.3 Cobertura de testes por módulo

| Módulo | Arquivo de teste | Cobertura |
|--------|----------------|-----------|
| `laterais.ts` | `laterais.test.ts` | presente |
| `principal.ts` | `principal.test.ts` | presente |
| `sectorization.ts` | `sectorization.test.ts`, `sectorization-split.test.ts` | presente |
| `hydraulic-sizing.ts` | `hydraulic-sizing.test.ts` | presente |
| `secondary-sizing.ts` | `secondary-sizing.test.ts` | presente |
| `bom.ts` | `bom.test.ts` | presente |
| `constructability.ts` | `constructability.test.ts` | presente |
| `hydraulic-connectivity.ts` | `hydraulic-connectivity.test.ts` | presente |
| `pipeline-diagnostics.ts` | `pipeline-diagnostics.test.ts` | presente |
| `irrigation-project.ts` | `integration.test.ts` | presente |
| `layout-schema.ts` | sem teste próprio | lacuna menor (função pura simples) |
| `pipeline-types.ts` | sem teste próprio | lacuna menor (utilitários geométricos) |
| PDF (`src/lib/pdf/`) | sem teste | aceitável (UI visual) |
| `actions.ts` | sem teste | aceitável (server action — testável por e2e) |

### 2.4 Ponto de atenção arquitetural — `generateGeometryDiagnostics`

**Risco a verificar — mitigado na leitura atual.**

`bom.ts:135` exporta `generateGeometryDiagnostics` que chama `generatePhysicalColumns` diretamente (bypass do orquestrador). Isso seria RB-03 violação se chamada de UI ou API.

**Evidência encontrada:**
- Chamada encontrada apenas em `bom.test.ts:654` — uso exclusivo em testes.
- Não encontrada em `src/app/`, `src/components/` ou `src/app/api/` (busca por grep confirmada).

**Conclusão atual:** a função existe como debug/compatibilidade e é usada apenas em testes. Não é violação de RB-03 em produção. **Risco residual:** se futuramente for exposta em uma API ou componente, vira violação. Recomenda-se marcar com comentário `// debug only — não chamar fora de testes` para tornar a intenção explícita.

### 2.5 Arquitetura do orquestrador — conforme

| Invariante | Estado |
|------------|--------|
| `calculateIrrigationProject` é único ponto de entrada | ✓ confirmado |
| PDF chama `calculateIrrigationProject` via `route.tsx` | ✓ confirmado |
| `buildBOM` não tem efeitos colaterais | ✓ confirmado |
| `src/components/` não chama funções de domínio diretamente | evidência parcial — `ProjectMap.tsx` não lido |
| `src/lib/` não importa de `src/components/` | evidência parcial — não verificado por grep |

---

## Pilar 3 — Validação de campo

### 3.1 Status

**Não iniciada.** O protocolo de 5 etapas está definido em `10-validacao-de-campo.md` mas nenhuma etapa foi executada.

### 3.2 Pré-condições para iniciar

| Pré-condição | Estado |
|-------------|--------|
| Protocolo documentado | ✓ `10-validacao-de-campo.md` |
| Templates de registro disponíveis | ✓ `checklist-validacao-piloto.md`, `resumo-validacao-campo.md` |
| Projetos antigos identificados para Etapa 1 | **ausente** |
| Planilhas de cálculo validadas para Etapa 2 | **ausente** |
| Projetista designado para conduzir etapas | **ausente** |
| RT designado para aprovação de GO/NO-GO | **ausente** |
| Critérios de aceitação (divergência máxima HMT, BOM) | **ausente** — todos `[PENDENTE DE VALIDAÇÃO]` |

### 3.3 O que o software já oferece para apoiar a validação

| Recurso | Utilidade para validação |
|---------|-------------------------|
| `integration.test.ts` com projetos L e P | números de referência internos (HMT, HF por componente) — úteis para calibração |
| `HydraulicModelLimitations` no resultado | documenta as simplificações assumidas — facilita explicar divergências esperadas |
| `noElevationData` em HMT | sinaliza quando desnível não foi informado — obrigatório declarar nas comparações |
| `diagnostics.warnings` | lista as condições que afastam o resultado do ideal — contexto para a comparação |
| `HMTBreakdown` por componente | permite comparar HF por segmento, não apenas HMT total |

### 3.4 Primeiro passo concreto

Iniciar Etapa 1 sem nenhum código novo:
1. Projetista seleciona 2–3 projetos executivos já implantados pela empresa
2. Insere os dados no software (área, aspersor, espaçamento, topografia, bomba conhecida)
3. Compara `hydraulics.hmt` do software com a HMT do projeto original
4. Registra resultado em `docs/relatorios/` usando `resumo-validacao-campo.md`

### 3.5 Bloqueio para GO/NO-GO

Sem Etapa 1 concluída, não há como definir os critérios numéricos de Classe A/B/C. Sem esses critérios, `ProjectClassificationEngine` (TASK-002) não deve ser implementado.

---

## Pilar 4 — Disciplina Operacional

### 4.1 O que a disciplina exige vs. o que existe

| Requisito (`11-disciplina-operacional.md`) | Estado atual | Tipo de gap |
|-------------------------------------------|-------------|-------------|
| Vendedor não pode remover blocker | blockers existem no código, mas qualquer usuário pode alterar o layout e gerar PDF | gap de código (controle de papel) |
| Projetista aprova Classe B antes da emissão | Classe B não existe no software | gap de código (pós-TASK-002) |
| Log de overrides com responsável + justificativa + data/hora | não existe no software | gap de código (Motor de Governança) |
| Acesso por papel (vendedor / projetista / RT) | não existe — todos têm a mesma interface | gap de código |
| Aprovação de Classe B registrada antes do PDF | não existe | gap de código (pós-TASK-002) |
| Auditoria de propostas emitidas | não existe no software | gap de código (Motor de Governança) |
| Processo de atualização de preços com data e fonte | definido em `08-logs-e-auditoria.md §4` mas sem enforcement | gap de disciplina operacional |
| Projetista e RT designados formalmente | definidos nos docs, mas sem designação real por nome | gap de disciplina operacional |

### 4.2 O que pode ser feito agora sem código

| Ação | Responsável | Dependência |
|------|-------------|------------|
| Nomear projetista responsável pela validação de campo | gestão | nenhuma |
| Nomear RT responsável pela homologação de parâmetros | gestão | nenhuma |
| Estabelecer processo manual de aprovação de Classe B (email ou formulário) enquanto Motor de Governança não existe | RT + gestão | nenhuma |
| Definir frequência de atualização de preços do catálogo | admin do sistema + gestão | nenhuma |
| Estabelecer critério mínimo de divergência para GO/NO-GO da validação | RT | iniciar Etapa 1 |

### 4.3 O que requer código

| Requisito | TASK sugerida |
|-----------|--------------|
| Controle de acesso por papel | pós-TASK-002 |
| Fluxo de aprovação de Classe B no software | pós-TASK-002 |
| Log de overrides | TASK-002 (Motor de Governança) |
| Registro de auditoria de propostas | pós-TASK-002 |
| Gate de emissão de PDF por classe | pós-TASK-002 |
| Gate básico de PDF (verificar `diagnostics.blockers`) | gap imediato — não requer TASK-002 |

---

## Checklist de homologação (`testes-e-homologacao.md §2` e `§3`)

### §2 — Critérios de software profissional

| Critério | Status |
|----------|:------:|
| `npx tsc --noEmit → 0 erros` | ✓ |
| `npx vitest run → 100% passando` | ✓ |
| Contagem de testes não regride | ✓ |
| HMT L e P dentro de ±0,01 mca | ✓ |
| Diâmetro interno em todos os hf | ✓ |
| Caminho crítico exaustivo | ✓ |
| `pumpValidation.designFlowM3h === maxSectorFlow` | ✓ |
| `secondarySizingModel === "individual_velocity_and_headloss_checked"` | ✓ |
| Ramais agrupados por SKU próprio | ✓ |
| Laterais por coluna física | ✓ |
| Tês = nColunasLaterais | ✓ |
| `buildBOM` é puro | ✓ |
| `diagnostics.blockers` não vazio bloqueia emissão | ⚠ parcial — blockers existem, mas a rota do PDF não os verifica |
| Bomba insuficiente gera blocker | ✓ |
| Ramal com violação gera warning | ✓ |
| Validação de PN por trecho gera blocker | ✗ pendente (TASK-004) |
| Todo SKU tem `diametroMm`, `coefC`, `pressaoMca` | evidência parcial — catálogo não lido integralmente |
| Todo tubo PVC rígido tem `diametroInternoMm` | ✓ (P4) |
| Preços atualizados com data conhecida | ✗ processo não formalizado |
| Responsáveis definidos | ✓ nos docs, ✗ sem designação formal por nome |

### §3 — Critérios de homologação para uso comercial

| Critério | Status |
|----------|:------:|
| Validação com projetos antigos (Etapa 1) | ✗ não iniciada |
| Validação com proposta real piloto (Etapa 5) | ✗ não iniciada |
| Divergências registradas | ✗ não aplicável — Etapa 1 não iniciada |
| Aprovação de RT quando houver risco técnico | ✗ processo não formalizado |
| PDF com premissas e exclusões | ✗ não implementado |

**Resultado §3:** NO-GO — uso comercial não liberado. Software adequado para análise interna.

---

## Tabela de prioridades

| Pri | Descrição | Tipo | Dependência | Risco que resolve | TASK sugerida |
|:---:|-----------|:----:|-------------|-------------------|---------------|
| 1 | Gate básico de PDF: verificar `diagnostics.blockers` antes de renderizar | código | nenhuma | proposta com blocker chega ao cliente | sem TASK formal — simples |
| 2 | Iniciar Etapa 1 de validação de campo | campo | projetista + projetos antigos disponíveis | sem validação, uso comercial não pode ser liberado | processo, sem TASK de código |
| 3 | RT homologa parâmetros hardcoded de velocidade, perda e margem | metodologia | RT disponível | parâmetros sem respaldo formal virarem critério de Classe A/B/C errado | atualizar `03-hidraulica.md` após RASCUNHO → aprovado |
| 4 | TASK-004: validação de PN por trecho | código | nenhuma | ramal dimensionado por velocidade pode exceder PN do tubo escolhido | TASK-004 |
| 5 | TASK-005: BOM de válvulas (`section_valve`) | código | nenhuma (mas TASK-004 pode afetar diâmetro) | BOM sem válvulas de controle operacional subestima custo real | TASK-005 |
| 6 | Definir responsáveis por nome: projetista e RT da validação de campo | operação | gestão | sem responsável, validação não começa | processo |
| 7 | Definir processo manual de aprovação de Classe B (enquanto motor não existe) | operação | TASK-001 concluída | propostas Classe B sem revisão técnica chegando ao cliente | processo |
| 8 | TASK-002: Motor de Governança A/B/C | código | Etapa 1–3 de validação + homologação de `09` + TASK-004 estável | sem governança, controle de papel e bloqueios por classe são manuais | TASK-002 |

> **Nota sobre TASK-002:** não recomendado iniciar antes de (a) concluir ao menos Etapas 1–3 da validação de campo, (b) homologar os limites de Classe A/B/C com o RT, e (c) definir formalmente os responsáveis por aprovação de Classe B. Implementar com critérios não homologados força refatoração assim que os limites mudarem.

---

## Resumo executivo

O software tem um **motor técnico sólido**: orquestrador único, Hazen-Williams com D interno real, caminho crítico exaustivo, dimensionamento individual de ramais, construtibilidade modelada e 400 testes passando. A fundação de código para venda técnica assistida está correta.

Os **gaps críticos** são:

1. **PDF emite proposta com blockers ativos** — a rota `route.tsx` não verifica `diagnostics.blockers`. Este é o único gate real de emissão hoje, e está incompleto. Correção simples, sem dependências.

2. **Validação de campo não iniciada** — sem Etapa 1 não há como definir limites de Classe A/B/C nem liberar uso comercial. Este é o bloqueio mais estratégico do projeto.

3. **Parâmetros técnicos pendentes de homologação metodológica** — os valores de velocidade, perda e margem no código são razoáveis, mas não têm registro de aprovação do RT. Isso cria risco se forem usados como critério de Classe A.

4. **Disciplina operacional existe nos docs, mas não no software** — controle de papel, log de overrides e aprovação de Classe B são processos manuais hoje. Estão corretos enquanto o Motor de Governança não existe, desde que a equipe siga o processo definido em `11-disciplina-operacional.md`.

**Próxima tarefa sugerida:** corrigir o gate de PDF (`diagnostics.blockers`) e iniciar Etapa 1 da validação de campo com projetos antigos. Ambas podem ser feitas em paralelo, sem dependências entre si.
