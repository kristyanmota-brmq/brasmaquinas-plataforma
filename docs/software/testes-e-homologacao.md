# Testes e Homologação

> Para guia de testes de software (framework, fixtures, invariantes, nomenclatura), ver `docs/software/testes.md`.
> Este documento descreve os **critérios de homologação** do software para uso comercial e complementa o guia de testes com requisitos de qualidade profissional.

---

## 1. Dois eixos

| Eixo | O que garante | Onde está definido |
|------|--------------|-------------------|
| Testes de software | O código faz o que a especificação diz | `docs/software/testes.md` |
| Homologação para uso comercial | O software pode ser usado para vender | Este documento |

Passar nos testes de software é condição necessária, mas não suficiente, para uso comercial. O software também precisa passar na validação de campo (`docs/metodologia/10-validacao-de-campo.md`).

---

## 2. Critérios de software profissional

Estes critérios devem ser satisfeitos antes de qualquer release.

### 2.1 Cálculo principal testado

| Critério | Como verificar | Status |
|----------|---------------|--------|
| `npx tsc --noEmit` → 0 erros | CI automático | implementado |
| `npx vitest run` → 100% passando | CI automático | implementado |
| Contagem de testes não regride entre releases | CI automático | implementado |
| HMT dos projetos L e P dentro de ±0,01 mca dos valores de sanidade | `integration.test.ts` | implementado |
| Diâmetro interno usado em todos os cálculos de hf | `hydraulic-sizing.test.ts` | implementado |
| Caminho crítico é exaustivo (não heurístico) | `hydraulic-sizing.test.ts` | implementado |
| `pumpValidation.designFlowM3h === maxSectorFlow` | `hydraulic-sizing.test.ts` | implementado |
| `secondarySizingModel === "individual_velocity_and_headloss_checked"` | `secondary-sizing.test.ts` | implementado |

### 2.2 BOM coerente com layout e cálculo

| Critério | Como verificar | Status |
|----------|---------------|--------|
| Ramais agrupados por SKU próprio (não pelo tubo da principal) | `bom.test.ts` | implementado |
| Laterais agrupadas por coluna física | `bom.test.ts` | implementado |
| Tês de derivação = nColunasLaterais | `bom.test.ts` | implementado |
| `buildBOM` é função pura (mesmo input → mesmo output) | arquitetura | implementado |
| BOM com `sizedSecondaries` difere da BOM sem (quando há ramais) | `bom.test.ts` | implementado |

### 2.3 Proposta bloqueia pendências críticas

| Critério | Como verificar | Status |
|----------|---------------|--------|
| `diagnostics.blockers` não vazio bloqueia emissão | `pipeline-diagnostics.test.ts` | implementado |
| `hydraulicSolverStatus === "blocked"` propaga blocker | `pipeline-diagnostics.test.ts` | implementado |
| Ramal com violação gera warning em diagnósticos | `secondary-sizing.test.ts` | implementado |
| Bomba insuficiente gera blocker ou warning conforme tipo | `hydraulic-sizing.test.ts` | implementado |
| Violação de PN de tubo gera blocker (TASK-004) | pendente | TASK-004 |

### 2.4 Base de produtos saneada

| Critério | Como verificar | Status |
|----------|---------------|--------|
| Todo SKU tem `diametroMm`, `coefC`, `pressaoMca` | inspeção do catálogo | implementado |
| Todo tubo PVC rígido tem `diametroInternoMm` | inspeção do catálogo | implementado |
| Nenhum SKU duplicado | inspeção do catálogo | implementado |
| Preços atualizados com data conhecida | processo de gestão de catálogo | `[PENDENTE — processo]` |

### 2.5 Responsáveis definidos

| Área | Responsável | Status |
|------|-------------|--------|
| Metodologia hidráulica | RT + projetista | definido em `11-disciplina-operacional.md` |
| Catálogo de produtos | admin do sistema | definido em `11-disciplina-operacional.md` |
| Parâmetros agronômicos | RT + agrônomo | definido em `11-disciplina-operacional.md` |
| Aprovações de Classe B | projetista ou RT | definido em `09-classificacao-de-projetos.md` |
| Projeto Classe C | projetista | definido em `09-classificacao-de-projetos.md` |

---

## 3. Critérios de homologação para uso comercial

Estes critérios são gates adicionais antes de o software ser usado para emitir propostas reais. Não são substituídos pelos testes automatizados — são complementares.

> ⚠️ Todos os critérios abaixo estão **[PENDENTE DE VALIDAÇÃO — RT/agronômico/campo]** até execução formal da validação de campo descrita em `docs/metodologia/10-validacao-de-campo.md`.

### 3.1 Validação com projetos antigos

| Critério | Tipo | Responsável |
|----------|------|-------------|
| ≥ N projetos antigos comparados (N a definir com RT) | bloqueante — `[PENDENTE]` | projetista + RT |
| Divergência de HMT abaixo do limite aceitável | bloqueante — `[PENDENTE — limite a definir]` | RT |
| Divergência de BOM abaixo do limite aceitável | bloqueante — `[PENDENTE — limite a definir]` | projetista |
| Relatório de comparação gerado e arquivado em `docs/relatorios/` | bloqueante | projetista |

### 3.2 Validação com proposta real piloto

| Critério | Tipo | Responsável |
|----------|------|-------------|
| ≥ 1 projeto real gerado via software e revisado por projetista de forma independente | bloqueante | projetista + RT |
| Proposta piloto aprovada pelo RT antes de enviar ao cliente | bloqueante | RT |
| Checklist `templates/checklist-validacao-piloto.md` preenchido e assinado | bloqueante | projetista + RT |
| Resultado do projeto piloto registrado usando `templates/resumo-validacao-campo.md` | bloqueante | projetista |

### 3.3 Divergências registradas

| Critério | Tipo | Responsável |
|----------|------|-------------|
| Toda divergência encontrada registrada formalmente | bloqueante | projetista |
| Divergências bloqueantes: todas resolvidas ou aceitas como limitação documentada | bloqueante | RT |
| Divergências de warning: rastreadas e monitoradas | recomendado | projetista |
| Relatório consolidado de divergências disponível em `docs/relatorios/` | bloqueante | projetista |

### 3.4 Aprovação de RT e agrônomo quando houver risco técnico

| Condição | Gate | Responsável |
|----------|------|-------------|
| Qualquer critério agronômico não validado em campo | aprovação de agrônomo | agrônomo |
| HMT com divergência significativa vs. referência | aprovação de RT | RT |
| Envelope A/B/C com limites não testados em campo | aprovação de RT | RT |
| Release com mudança em fórmula ou constante hidráulica | aprovação de RT + ADR | RT |
| Release com mudança no catálogo de produtos | revisão de projetista | projetista |

### 3.5 PDF e proposta com premissas, exclusões e limites

| Critério | Status |
|----------|--------|
| PDF inclui data de geração e versão do software | `[PENDENTE — feature]` |
| PDF inclui premissas (dados informados pelo cliente vs. calculados) | `[PENDENTE — feature]` |
| PDF inclui exclusões explícitas (o que o software não calcula) | `[PENDENTE — feature]` |
| PDF inclui limitações do modelo (`HydraulicModelLimitations`) | parcialmente implementado |
| Proposta Classe B indica que é preliminar, sujeita a revisão técnica | `[PENDENTE — feature]` |
| Proposta sem desnível geodético marcada como "HMT estimada sem desnível" | parcialmente implementado |

---

## 4. Gate de GO/NO-GO para uso comercial

| Gate | Tipo | Aprovador |
|------|------|----------|
| Critérios 2.1 a 2.5 todos passando | bloqueante | CI automático + RT |
| Validação com projetos antigos concluída (3.1) | bloqueante | RT |
| Proposta real piloto aprovada (3.2) | bloqueante | RT |
| Divergências bloqueantes resolvidas (3.3) | bloqueante | RT |
| Aprovações técnicas obtidas quando há risco (3.4) | bloqueante | RT + agrônomo |
| PDF com premissas e exclusões (3.5) | recomendado | projetista |

**GO:** todos os gates bloqueantes aprovados → uso interno para propostas Classe A liberado.

**NO-GO:** qualquer gate bloqueante pendente → software restrito a análise interna e simulações. Não emitir propostas comerciais.
