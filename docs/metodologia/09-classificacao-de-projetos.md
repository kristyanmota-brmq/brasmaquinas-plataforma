# Classificação de Projetos — A, B e C

**Versão:** 1.0
**Data:** 2026-05-19
**Status:** RASCUNHO — limites numéricos pendentes de validação formal (RT/agronômico/campo)

---

## 1. Objetivo

Definir em qual classe cada projeto se enquadra, determinando:
- quem pode conduzir a venda e emitir proposta;
- quais gates de aprovação são obrigatórios;
- qual tipo de documento é gerado (proposta comercial, pré-projeto, layout técnico assistido ou projeto executivo);
- quais riscos técnicos requerem projetista, RT ou validação de campo.

A classificação é o mecanismo central da **esteira de venda técnica assistida**: permite que ~90% das vendas padrão de aspersão convencional sejam conduzidas pelo vendedor sem depender do projetista na fase comercial.

A decisão de classificação pertence ao **Motor de Governança** (`ProjectClassificationEngine`) — não ao Motor Técnico nem ao Motor Comercial. O Motor Técnico informa os fatos (HMT, blockers, violações). O Motor de Governança interpreta esses fatos contra o envelope homologado e decide a classe. O Motor Comercial consome a classe para decidir tipo de proposta, alçadas e gates de emissão.

---

## 2. Aviso fundamental

> **Classe A não significa ausência de risco técnico. Significa que o projeto está dentro do envelope técnico-comercial homologado e passou nos gates obrigatórios.**
>
> Um projeto Classe A ainda pode ter risco agronômico, de solo, de topografia ou operacional. A classificação indica apenas que o software tem capacidade de auxiliar o vendedor a conduzir essa venda com segurança dentro do envelope validado. Qualquer condição fora do envelope, mesmo que o software processe sem erro, deve ser escalada.

---

## 3. Definições de classe

### Classe A — Venda automática assistida

O projeto está dentro do envelope técnico-comercial homologado. O software conduziu o cálculo sem blockers críticos. O vendedor pode emitir proposta sem aprovação técnica adicional, desde que todos os gates automáticos passem.

**O vendedor pode:**
- Gerar layout técnico assistido
- Emitir proposta comercial com preços do catálogo vigente
- Confirmar dimensionamento de bomba já selecionada pelo cliente
- Aprovar a proposta e encaminhar para pedido

**O vendedor NÃO pode:**
- Remover blocker crítico para forçar emissão (ver §7)
- Alterar parâmetros técnicos do catálogo
- Aprovar projeto fora do envelope sem escalar para Classe B ou C

**Critérios preliminares de enquadramento (Classe A):**

> ⚠️ Os limites abaixo são propostas de referência. Todos estão **[PENDENTE DE VALIDAÇÃO — RT/agronômico/campo]** até homologação formal. Não utilizar como regra operacional até aprovação explícita.

| Critério | Referência preliminar | Status |
|----------|-----------------------|--------|
| Área irrigada máxima | `[PENDENTE DE VALIDAÇÃO]` | não homologado |
| Desnível máximo total | `[PENDENTE DE VALIDAÇÃO]` | não homologado |
| Número máximo de setores | `[PENDENTE DE VALIDAÇÃO]` | não homologado |
| Vazão total máxima | `[PENDENTE DE VALIDAÇÃO]` | não homologado |
| HMT calculada máxima | `[PENDENTE DE VALIDAÇÃO]` | não homologado |
| Tipo de cultura elegível | `[PENDENTE DE VALIDAÇÃO]` | não homologado |
| Restrição hídrica de solo | `[PENDENTE DE VALIDAÇÃO]` | não homologado |

---

### Classe B — Venda assistida com aprovação técnica

O projeto tem características que excedem o envelope Classe A, mas ainda é viável com suporte técnico. Pode ser conduzido pelo vendedor, mas **exige aprovação do projetista ou RT antes da emissão de proposta**.

**O projetista ou RT pode:**
- Aprovar o layout e dimensionamento gerado pelo software
- Ajustar parâmetros dentro dos limites da metodologia
- Emitir parecer técnico que libera a proposta
- Sinalizar se o projeto deve ser reclassificado como Classe C

**O vendedor PODE (em Classe B):**
- Apresentar o layout ao cliente como preliminar
- Coletar dados adicionais solicitados pelo projetista

**O vendedor NÃO pode (em Classe B):**
- Emitir proposta sem aprovação registrada do projetista ou RT
- Comprometer prazo de entrega antes da aprovação técnica

**Gatilhos de Classe B (preliminares):**

> ⚠️ **[PENDENTE DE VALIDAÇÃO — RT/agronômico/campo]** — os gatilhos abaixo são hipóteses de referência, não regras homologadas.

| Gatilho | Parcialmente implementado? | Referência |
|---------|--------------------------|------------|
| Área acima do limite Classe A | `[PENDENTE]` | a homologar |
| Desnível acima do limite Classe A | `[PENDENTE]` | a homologar |
| HMT calculada acima do limite Classe A | `[PENDENTE]` | a homologar |
| Ramal com `velocityExceeds` ou `headLossExceeds` | sim (warning) | `sizeAllSecondaries` |
| Bomba insuficiente em pressão | sim (blocker) | `pumpValidationStatus` |
| Topografia com desnível geodético informado | sim (limitação) | `HydraulicModelLimitations` |
| Violação de PN de tubo (TASK-004) | pendente | TASK-004 |

---

### Classe C — Projeto especial obrigatório

O projeto está fora do envelope técnico-comercial padrão e exige projeto executivo completo elaborado pelo projetista, com validação de RT e/ou agrônomo conforme o risco.

**O projetista assume:**
- Elaboração do projeto executivo completo
- Memorial de cálculo
- Especificações técnicas
- Responsabilidade técnica pelo dimensionamento

**O vendedor (em Classe C):**
- Coleta dados e define escopo de projeto com o cliente
- Não emite proposta de irrigação sem o projeto executivo aprovado pelo projetista

**Gatilhos de Classe C (preliminares):**

> ⚠️ **[PENDENTE DE VALIDAÇÃO — RT/agronômico/campo]**

| Gatilho | Status |
|---------|--------|
| Cultura de alto valor com exigência hídrica específica | `[PENDENTE DE VALIDAÇÃO]` |
| Terreno com declividade fora do envelope Classe B | `[PENDENTE DE VALIDAÇÃO]` |
| Múltiplos conjuntos de bombeamento | `[PENDENTE DE VALIDAÇÃO]` |
| Integração com fertirrigação | `[PENDENTE DE VALIDAÇÃO]` |
| Requisito de CUC mínimo contratual | `[PENDENTE DE VALIDAÇÃO]` |
| Projeto público ou licitação | `[PENDENTE DE VALIDAÇÃO]` |
| Restrições legais, ambientais ou de outorga | `[PENDENTE DE VALIDAÇÃO]` |

---

## 4. Gatilhos de bloqueio automático

O software bloqueia a emissão de proposta automaticamente quando:

| Condição | Implementado | Referência no código |
|----------|-------------|---------------------|
| `diagnostics.blockers` não está vazio | sim | `generateProposalDiagnostics` |
| `hydraulicSolverStatus === "blocked"` | sim | `sizeHydraulics` |
| `constructabilityStatus === "blocked"` | sim | `buildConstructabilityReport` |
| `pumpValidationStatus === "pump_insufficient_head"` | sim | `validatePump` |
| `pumpValidationStatus === "pump_insufficient_flow"` | sim | `validatePump` |
| Ramal com violação de pressão de tubo (PN) | pendente | TASK-004 |
| Projeto Classe C sem projeto executivo | pendente | Motor de Governança (TASK-002) |

---

## 5. Gatilhos de revisão técnica

O software emite warning (não bloqueia, mas exige atenção) quando:

| Condição | Implementado | Referência no código |
|----------|-------------|---------------------|
| `diagnostics.warnings` não está vazio | sim | `generateProposalDiagnostics` |
| Ramal com `velocityExceeds` | sim | `sizeAllSecondaries` |
| Ramal com `headLossExceeds` | sim | `sizeAllSecondaries` |
| Bomba não informada (`pumpValidationStatus === "not_informed"`) | sim | `validatePump` |
| Desnível geodético não informado | sim | `HydraulicModelLimitations` |
| Projeto reclassificado de A para B automaticamente | pendente | Motor de Governança (TASK-002) |

---

## 6. Quem aprova o quê

| Ação | Vendedor | Projetista | RT | Agrônomo |
|------|:--------:|:----------:|:--:|:--------:|
| Emitir proposta Classe A | ✓ | — | — | — |
| Aprovar proposta Classe B | ✗ | ✓ | ✓ | — |
| Emitir projeto executivo Classe C | ✗ | ✓ | — | — |
| Validar metodologia agronômica | ✗ | — | ✓ | ✓ |
| Ajustar envelope Classe A/B/C | ✗ | proposta | ✓ | conforme |
| Override de blocker crítico | ✗ | ✓ | ✓ | — |
| Reclassificar C → B manualmente | ✗ | ✗ | ✓ | — |
| Reclassificar B → A manualmente | ✗ | ✗ | ✓ | — |
| Atualizar catálogo de produtos | ✗ | revisão | — | — |
| Atualizar parâmetros técnicos | ✗ | ✓ | ✓ | conforme |

---

## 7. Tipos de documento por classe

| Tipo de documento | Classe A | Classe B | Classe C |
|-------------------|----------|----------|----------|
| Layout técnico assistido | gerado pelo software | gerado + revisado pelo projetista | base para projeto executivo |
| Proposta comercial | vendedor emite | projetista ou RT aprova antes | projetista assina |
| Pré-projeto | não necessário | conforme complexidade | mandatório como base |
| Memorial de cálculo | não obrigatório | conforme risco | obrigatório |
| Projeto executivo | não aplicável | não aplicável | obrigatório |

**Definições:**

- **Proposta comercial:** documento para o cliente com escopo, quantitativos e preços. Não é o projeto técnico.
- **Layout técnico assistido:** saída do software com colunas, setores, ramais, BOM e HMT. Base da proposta Classe A.
- **Pré-projeto:** layout técnico com dimensionamento preliminar, sem memorial completo. Base para negociação Classe B.
- **Projeto executivo:** documento técnico completo com responsabilidade assinada pelo projetista. Exigido na Classe C.

---

## 8. Logs, aprovações e exceções

> ⚠️ O motor de log ainda não está implementado. As regras abaixo definem o comportamento esperado quando o Motor de Governança (TASK-002) for implementado.

### Logs obrigatórios por proposta

Toda proposta gerada deve registrar:
- Data e hora de geração
- Classe atribuída (A, B ou C)
- Gates passados e reprovados
- Usuário que gerou
- Versão do software utilizada

### Aprovações registradas

- **Classe B:** identificação do projetista ou RT que aprovou, data/hora, observações
- **Classe C:** identificação do projetista responsável, referência ao projeto executivo

### Exceções e overrides

**Vendedor não pode remover blocker crítico.** Qualquer override deve ter: responsável identificado, justificativa documentada, data/hora e log permanente. Overrides sem registro são inválidos e não conferem cobertura técnica.

Overrides de blocker são de responsabilidade exclusiva do projetista ou RT.

Overrides de Classe (reclassificação manual de C→B ou B→A) exigem RT e são permanentemente auditáveis.

Exceções recorrentes (mesmo tipo recorrente) devem ser analisadas para ajuste do envelope ou da metodologia — não para normalização do override como prática operacional.
