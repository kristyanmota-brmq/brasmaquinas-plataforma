# Disciplina Operacional

**Versão:** 1.0
**Data:** 2026-05-19

---

## 1. Objetivo

Definir quem pode fazer o quê no software e no processo de venda técnica assistida. A disciplina operacional é o que impede que a flexibilidade do sistema se torne vetor de risco técnico ou comercial.

---

## 2. Papéis e responsabilidades

### Vendedor

**Pode:**
- Acessar o software e inserir dados do cliente e do projeto
- Gerar layout técnico assistido e visualizar resultados
- Emitir proposta comercial para projetos Classe A (sem blockers, todos os gates passando)
- Apresentar layout preliminar ao cliente para projetos Classe B (sem emitir proposta sem aprovação técnica)
- Registrar dados de campo informados pelo cliente (área, topografia, tipo de cultura)
- Consultar catálogo de produtos e preços vigentes

**Não pode:**
- Remover blocker crítico para forçar emissão de proposta
- Alterar parâmetros técnicos do catálogo (dimensões, coeficientes, SKUs)
- Aprovar proposta Classe B sem parecer registrado do projetista ou RT
- Reclassificar projeto de C para B ou de B para A
- Comprometer prazo técnico antes de aprovação do projetista em Classe B

> **Regra inegociável: Vendedor não pode remover blocker crítico. Qualquer override deve ter responsável identificado, justificativa documentada, data/hora e log permanente. Overrides sem registro são inválidos e não conferem cobertura técnica sobre o resultado.**

---

### Projetista

**Pode:**
- Usar o software para todas as classes de projeto
- Aprovar ou reprovar proposta Classe B (com registro de parecer)
- Ajustar parâmetros dentro dos limites da metodologia vigente
- Elaborar projeto executivo para Classe C
- Autorizar override de blocker em situações excepcionais — com log obrigatório contendo: responsável, justificativa técnica, data/hora
- Sinalizar quando o envelope Classe A deve ser revisado pelo RT
- Propor ajuste de critérios de classificação ao RT

**Responsabilidade:**
- Qualidade técnica das propostas Classe B e Classe C
- Memorial de cálculo quando exigido
- Registro de todas as aprovações e overrides realizados

---

### Responsável Técnico (RT)

**Pode:**
- Aprovar planos de implementação de software
- Validar metodologia agronômica e hidráulica
- Aprovar ajuste do envelope A/B/C (incluindo novos limites numéricos, após validação de campo)
- Autorizar reclassificação manual de Classe (C→B ou B→A) — com log obrigatório
- Liberar uso interno após validação de campo (emitir GO/NO-GO)
- Auditar propostas emitidas periodicamente ou mediante denúncia

**Responsabilidade:**
- Integridade da metodologia técnica
- Aprovação de qualquer mudança em `docs/metodologia/`
- Condução ou supervisão da validação de campo antes da liberação comercial
- Aprovação de parâmetros marcados como `[PENDENTE DE VALIDAÇÃO]`

---

### Agrônomo

**Responsabilidade específica:**
- Validar parâmetros agronômicos (lâmina, eficiência, jornada, espaçamento, cultura)
- Aprovar `docs/metodologia/02-calculo-agronomico.md` após validação
- Validar critérios de Classe que dependem de tipo de cultura ou restrições agronômicas
- Participar das etapas de validação de campo quando houver risco agronômico

---

### Gestão comercial

**Pode:**
- Definir alçadas de aprovação de proposta por valor comercial
- Estabelecer política de preços e margens
- Autorizar exceções comerciais (desconto fora da tabela, prazo estendido)

**Não pode:**
- Remover blockers técnicos sem parecer de projetista ou RT
- Alterar parâmetros técnicos do software ou do catálogo
- Reclassificar projetos ou autorizar overrides técnicos

---

### Administrador do sistema

**Responsabilidade:**
- Atualizar catálogo de produtos (preços, novos SKUs) com evidência do fornecedor
- Nunca alterar ou remover SKUs existentes sem ADR aprovado por RT
- Controlar acesso de usuários por papel
- Manter o software atualizado
- Registrar alterações no catálogo em `docs/metodologia/08-logs-e-auditoria.md`

---

## 3. Quem atualiza o quê

| O que | Quem pode atualizar | Evidência exigida |
|-------|--------------------|--------------------|
| Preços do catálogo | Admin do sistema | Cotação do fornecedor com data |
| Novos SKUs | Admin + projetista | Especificação técnica do fabricante |
| Parâmetros técnicos (D interno, coefC, PN) | Admin + projetista + RT | ABNT ou catálogo do fabricante; ADR se impactar projetos existentes |
| Critérios de Classe A/B/C | RT | Evidência de campo ou metodologia homologada |
| Parâmetros agronômicos | RT + agrônomo | Referência técnica + validação de campo |
| Metodologia hidráulica | RT + projetista | ADR aprovado |
| Envelope técnico-comercial | RT | Validação de campo documentada (Etapas 1–5 de `10-validacao-de-campo.md`) |

---

## 4. Como exceções são registradas

Toda exceção ao fluxo padrão deve ser registrada com:

| Campo | Obrigatório |
|-------|-------------|
| Tipo de exceção | sim |
| Descrição da situação | sim |
| Responsável pela exceção | sim |
| Justificativa técnica ou comercial | sim |
| Data e hora | sim |
| Aprovador (se exige aprovação de outro papel) | conforme tipo |
| Consequências aceitas | sim |
| Número do pedido ou proposta afetada | sim |

Exceções recorrentes (mesmo tipo registrado repetidamente) devem ser analisadas para:
- (a) ajuste do envelope técnico-comercial, ou
- (b) atualização da metodologia, ou
- (c) treinamento da equipe.

Exceções não são normalizadas por volume. Volume de exceções é sinal de gap metodológico ou operacional, não de maturidade do processo.

---

## 5. Como blockers podem ou não ser liberados

| Tipo de blocker | Pode ser liberado? | Por quem | Como |
|----------------|-------------------|---------|------|
| `hydraulicSolverStatus === "blocked"` | Não, sem correção dos dados | — | Corrigir dados de entrada ou geometria |
| `constructabilityStatus === "blocked"` | Não, sem correção | — | Corrigir geometria do projeto |
| `pumpValidationStatus === "pump_insufficient_head"` | Sim, em casos excepcionais | Projetista ou RT | Override com log obrigatório (responsável + justificativa + data/hora) |
| `pumpValidationStatus === "pump_insufficient_flow"` | Sim, em casos excepcionais | Projetista ou RT | Override com log obrigatório |
| Ramal com `velocityExceeds` (warning) | Sim, para Classe B | Projetista | Registro no parecer técnico |
| Ramal com `headLossExceeds` (warning) | Sim, para Classe B | Projetista | Registro no parecer técnico |
| Violação de PN de tubo — TASK-004 (blocker) | Não, sem substituição do tubo | — | Redimensionar ou substituir tubo |
| Blocker de Classe C sem projeto executivo | Não | — | Elaborar projeto executivo |

**Nenhum blocker de segurança técnica pode ser removido por decisão exclusivamente comercial.** Override de blocker técnico é sempre ato técnico com responsabilidade pessoal registrada. A decisão comercial pode influenciar a prioridade de análise, não o resultado técnico.

---

## 6. Auditoria de propostas

O RT ou projetista sênior deve auditar propostas emitidas:
- Periodicamente — frequência a definir com gestão comercial `[PENDENTE DE VALIDAÇÃO]`
- Quando houver reclamação do cliente sobre dimensionamento ou material
- Quando houver divergência significativa entre BOM proposto e material instalado
- Quando um override ou exceção for registrado
- Quando uma proposta de Classe B ou C for emitida

A auditoria verifica:
- Se blockers estavam zerados no momento da emissão
- Se a classificação A/B/C estava correta para o projeto
- Se overrides foram registrados adequadamente com responsável e justificativa
- Se o BOM corresponde ao material instalado (para projetos concluídos)
- Se o parecer técnico de Classe B foi emitido antes da proposta

---

## 7. Referências

- Classificação de projetos: `docs/metodologia/09-classificacao-de-projetos.md`
- Validação de campo: `docs/metodologia/10-validacao-de-campo.md`
- Regras bloqueantes de software: `docs/metodologia/01-regras-bloqueantes.md`
- Checklists de aprovação: `docs/metodologia/07-checklists-aprovacoes.md`
- Logs e auditoria: `docs/metodologia/08-logs-e-auditoria.md`
