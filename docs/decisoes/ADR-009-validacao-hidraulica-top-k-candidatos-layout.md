# ADR-009 — Validação hidráulica Top-K dos candidatos de layout

**Data:** 2026-05-20
**Status:** `provisório`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

TASK-010F evoluiu o motor de layout 12×12 para incluir validação hidráulica dos candidatos.
O motor geométrico (`findBestSprinklerLayout`) avalia até 112 candidatos sem chamar o solver
hidráulico, elegendo um `best` geométrico. A questão central era: como introduzir critérios
hidráulicos na seleção de candidatos sem criar um modelo hidráulico paralelo ao solver oficial?

O risco de um solver paralelo é real: dois modelos hidráulicos com heurísticas diferentes podem
divergir em edge cases, criando inconsistência entre "candidato sugerido como melhor" e
"resultado real do projeto quando calculado pelo solver oficial". A Brasmáquinas já opera com
um solver oficial (`calculateIrrigationProject`) auditado e testado (597 testes).

A decisão de governance era: como introduzir informação hidráulica no ranking de candidatos
sem duplicar o modelo hidráulico?

---

## Decisão

Decidimos implementar a validação hidráulica dos candidatos como **segundo passo explícito**,
separado do motor geométrico, com as seguintes regras:

### 1. Separação de funções: dois passos explícitos

`findBestSprinklerLayout()` é geométrico-only. Nunca chama solver hidráulico.
`runTopKHydraulicValidation()` é uma função separada — chama o solver apenas quando
acionada explicitamente pelo usuário.

Nenhuma lógica hidráulica foi adicionada ao motor geométrico.

### 2. Validação hidráulica somente por ação explícita do usuário

A UI expõe dois botões distintos:
- "Otimizar layout" → executa `findBestSprinklerLayout` (geométrico)
- "Validar hidráulica dos melhores candidatos" → executa `runTopKHydraulicValidation` (Top K)

O segundo botão só aparece quando o resultado geométrico existe, `waterSource` e `pump`
estão presentes. Nunca executado automaticamente.

### 3. Uso exclusivo do solver oficial `calculateIrrigationProject()`

`runTopKHydraulicValidation` chama `calculateIrrigationProject(tempLayout)` para cada
candidato Top K. Os blockers coletados são exclusivamente `diagnostics.blockers` do solver
oficial — sem estimativa própria, sem fórmula intermediária.

### 4. Proibição de solver hidráulico paralelo

`estimateHydraulicBlockers()` **não existe e não deve ser criado**. Qualquer função que
re-implemente lógica de HMT, hf ou validação de bomba fora do solver oficial viola esta
decisão.

### 5. `TOP_K_HYDRAULIC_CANDIDATES = 5` como premissa provisória

Apenas os 5 melhores candidatos geométricos recebem o solver. Os demais ficam com status
`not_evaluated_not_in_top_k`. Valor 5 é `PREMISSA_PROVISORIA_MERCADO` — heurística de
balanço entre cobertura e custo computacional.

### 6. `best` após validação restrito aos candidatos Top K avaliados

Após `runTopKHydraulicValidation`, o `best` é sempre um dos Top K candidatos que receberam
o solver. Candidatos fora do Top K não podem ser eleitos como `best`, pois não foram
avaliados hidraulicamente.

### 7. `jornadaHoras=9` como placeholder técnico sem impacto hidráulico

O `ProjectLayout` temporário construído por candidato requer `jornadaHoras` pelo schema.
O valor 9 é usado como placeholder — `sizeHydraulics` não lê este campo. Confirmado seguro
pela leitura do código de `irrigation-project.ts`.

Se `sizeHydraulics` passar a usar `jornadaHoras` em versão futura, esta decisão deve ser
revisada antes do merge.

### 8. `geodetic` ausente gera warning, não blocker

Ausência de desnível (`elevationDeltaMeters`) não bloqueia a avaliação hidráulica. O solver
roda com HMT conservadora (sem componente de elevação) e a `selectionReason` registra o
aviso "Avaliação hidráulica sem desnível informado." O resultado é informativo, não definitivo.

### 9. `WEIGHT_HYDRAULIC_BLOCKER = 0.50` como premissa provisória

Candidatos com blockers reais do solver sofrem penalidade `score.total -= 0.50`. Valor
deliberadamente alto para deslocar candidatos com blockers hidráulicos no ranking, mas
marcado como `PREMISSA_PROVISORIA_MERCADO` — sem calibração com projetos reais.

### 10. Pendência de revisão futura pela Brasmáquinas

`TOP_K_HYDRAULIC_CANDIDATES` e `WEIGHT_HYDRAULIC_BLOCKER` requerem revisão pelo RT com
dados de projetos reais antes de uso em proposta homologada. Documentados em
`docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`.

---

## Alternativas consideradas

### Alternativa A — Solver hidráulico leve paralelo (`estimateHydraulicBlockers`)

**Descrição:** Criar função própria que estima HMT e verifica bomba para cada candidato,
sem chamar `calculateIrrigationProject` (mais rápido, sem overhead de setorização).

**Por que foi descartada:** Cria dois modelos hidráulicos com potencial de divergência.
O solver oficial já passou por ciclos de auditoria (ADR-001, ADR-002). Uma estimativa
própria não auditada pode gerar ranking de candidatos inconsistente com o resultado real
do projeto quando o usuário efetivamente calcular o projeto final.

### Alternativa B — Rodar solver em todos os 112 candidatos

**Descrição:** Sem limitação de Top K — todos os candidatos recebem o solver oficial.

**Por que foi descartada:** Custo computacional proporcional (112 × tempo do solver).
O solver envolve setorização completa, dimensionamento de tubos, cálculo de HMT — custo
não trivial por candidato. Top K = 5 captura os candidatos mais relevantes com overhead
aceitável.

### Alternativa C — Avaliar hidráulica automaticamente após o geométrico

**Descrição:** `findBestSprinklerLayout` chama `runTopKHydraulicValidation` internamente
ao final, retornando resultado já com informação hidráulica.

**Por que foi descartada:** Viola a separação explícita dos dois passos. O usuário não
teria controle sobre quando o solver é chamado. Projetos sem bomba informada quebrariam
silenciosamente. A ação explícita garante que o usuário escolhe conscientemente quando
invocar o solver completo.

---

## Consequências

### Positivas

- Fonte de verdade única: todos os blockers hidráulicos vêm do solver oficial.
- Nenhuma divergência possível entre "candidato sugerido" e "projeto final calculado".
- Custo computacional controlado (máximo 5 chamadas ao solver por ação do usuário).
- Governança clara: usuário sabe que validação hidráulica é passo opcional e explícito.

### Negativas / trade-offs

- Candidato hidraulicamente melhor pode estar na posição 6+ do ranking geométrico e
  nunca receber o solver (Top K = 5 é conservador).
- `jornadaHoras=9` como placeholder cria acoplamento frágil ao schema — se `sizeHydraulics`
  passar a usar o campo, o valor placeholder pode afetar o resultado.
- Avaliação sem desnível produz HMT conservadora — pode aprovar candidato que seria
  reprovado com elevação real positiva.

### Neutras

- `best` geométrico e `best` após validação hidráulica podem ser candidatos diferentes —
  o usuário vê ambos no painel experimental.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/sprinkler-grid-optimizer.ts` | `runTopKHydraulicValidation`, novos tipos, `OPTIMIZER_PARAMS` estendido |
| `src/lib/layout/__tests__/sprinkler-grid-optimizer.test.ts` | 13 novos testes |
| `src/lib/layout/__tests__/optimizer-integration.test.ts` | fixture `makeCandidate` estendida |
| `src/components/map/ProjectMap.tsx` | botão explícito, painel hidráulico, spinner |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | 2 novas entradas de premissa |

---

## Classificação

- decisão de engenharia
- governança de motor de layout (ferramenta preliminar, passo explícito)
- premissa provisória (TOP_K e WEIGHT_HYDRAULIC_BLOCKER — PREMISSA_PROVISORIA_MERCADO)
- pendente de revisão Brasmáquinas

---

## Referências

- ADR-001 — Orquestrador único `calculateIrrigationProject`
- ADR-006 — Motor de candidatos de layout como ferramenta preliminar
- ADR-007 — Premissas provisórias de mercado e revisão Brasmáquinas
- TASK-010F — Validação hidráulica Top-K dos candidatos de layout
- `docs/relatorios/2026-05-20-TASK-010F.md`
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011B) |
