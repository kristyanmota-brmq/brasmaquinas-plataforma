# ADR-008 — Validação de PN/classe de pressão dos tubos por segmento

**Data:** 2026-05-19
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

O solver dimensiona tubos por critério de velocidade e perda de carga, mas não verificava se a pressão operacional estimada no segmento excedia a pressão nominal do tubo selecionado (PN — Pressão Nominal, em mca). Um tubo dimensionado corretamente por velocidade pode ter PN inadequado para o sistema — especialmente em tubos de entrada da adutora e início da principal, onde a pressão é mais alta.

TASK-001 identificou esse gap como pendência. TASK-004 implementou a verificação.

A complexidade estava em definir o nível de confiança da verificação por tipo de segmento:

- **Adutora e principal:** a pressão de entrada é calculada diretamente pelo solver (progressão cumulativa de hf a partir da bomba/HMT). A verificação é exata — uma violação é confirmada.
- **Ramal e lateral:** o solver não calcula pressão pontual por derivação nesta versão. O limite superior disponível é a HMT total, que superestima a pressão real na entrada de cada ramal/lateral. Uma violação baseada em HMT pode ser conservativa (falso positivo).

---

## Decisão

Decidimos modelar a verificação de PN com o tipo `PressureClassCheck` de 4 valores:

- `"ok"` — pressão operacional dentro do PN do tubo.
- `"violation_confirmed"` — violação confirmada com pressão calculada diretamente (adutora e principal). **Gera blocker de proposta.** Não pode ser rebaixado a warning.
- `"violation_conservative"` — possível violação identificada com limite conservativo (HMT como proxy para ramal e lateral). **Gera warning técnico, não blocker.** Pode ser falso positivo.
- `"unknown"` — `pressaoNominalMca` não disponível no catálogo para o tubo selecionado. **Gera pendência, sem falso blocker.**

Violação confirmada (`violation_confirmed`) jamais é rebaixada a warning, independente de contexto.

---

## Alternativas consideradas

### Alternativa A — Flag booleano `pressaoExcedePn: boolean`

**Descrição:** Verificação binária — excede ou não excede.

**Por que foi descartada:** Não carrega a distinção semântica obrigatória entre violação confirmada (blocker) e violação conservativa (warning). Um booleano `true` aplicado a lateral onde a pressão real pode estar dentro do PN geraria falso blocker, impedindo emissão de propostas tecnicamente válidas.

### Alternativa B — Bloquear toda violação de PN, incluindo conservative

**Descrição:** Qualquer check diferente de `"ok"` ou `"unknown"` gera blocker.

**Por que foi descartada:** Laterais PN40 em sistemas planos com HMT 41–45 mca são tecnicamente aceitáveis: a pressão real na entrada da lateral é menor que a HMT. Bloquear com base no limite conservativo impediria a emissão de projetos que o RT aprovaria.

### Alternativa C — Calcular pressão por derivação de arco para ramal e lateral

**Descrição:** Enriquecer os segmentos com `cumPrincipalHfM` para calcular pressão exata em cada ramal.

**Por que foi descartada:** O valor `cumPrincipalHfM` existe internamente no solver durante o cálculo do caminho crítico, mas não é propagado à estrutura de segmentos retornada. Propagá-lo requereria mudança no modelo de dados dos segmentos — complexidade desproporcional para V1. A decisão é: implementar como `"hmt_conservative_inlet"` agora e promover a `"exact_per_derivation"` em tarefa futura quando `cumPrincipalHfM` estiver disponível por segmento.

---

## Consequências

### Positivas

- Violações confirmadas de PN (adutora, principal) geram blocker e impedem emissão de proposta com risco real de falha de tubo.
- O campo `pressureClassModel: "hmt_conservative_inlet"` no resultado documenta explicitamente a limitação do modelo atual — rastreável no output sem leitura de código.
- Sem falso blocker para laterais e ramais em sistemas planos típicos.

### Negativas / trade-offs

- Laterais e ramais com `violation_conservative` podem ter pressão real dentro do PN, mas o diagnóstico emite warning — o engenheiro precisa avaliar manualmente se é falso positivo.
- A promoção de `"hmt_conservative_inlet"` para `"exact_per_derivation"` requer tarefa futura (pendente: adicionar `cumPrincipalHfM` ao segmento de ramal na construção do solver).
- Tubos sem `pressaoNominalMca` no catálogo retornam `"unknown"` silenciosamente — sem blocker, sem violação falsa. A completude do catálogo é pré-condição para a verificação funcionar em 100% dos casos.

### Neutras

- `allGatesPass` não cai com `violation_conservative` — apenas com `violation_confirmed` ou outra falha hidráulica. O comportamento anterior de `allGatesPass` é preservado para violações conservativas.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/hydraulic-sizing.ts` | tipo `PressureClassCheck`; `annotatePressureClass()`; campos em `HydraulicSegment` e `HydraulicValidation`; `pressureClassModel: "hmt_conservative_inlet"` |
| `src/lib/bom.ts` | `generateProposalDiagnostics`: blocker para `violation_confirmed`; warning para `violation_conservative` |
| `src/lib/layout/__tests__/pressure-class.test.ts` | 15 testes criados |

---

## Classificação

- regra técnica (PN por segmento)
- decisão de engenharia (distinção entre confirmed e conservative)
- governança de bloqueio/emissão (violação confirmada = blocker irrebaixável)
- pendente de revisão Brasmáquinas (catálogo de PN pode estar incompleto para alguns DNs)

---

## Referências

- TASK-004 — Validar PN/classe de pressão por trecho
- `docs/relatorios/2026-05-19-TASK-004.md`
- `docs/relatorios/2026-05-19-diagnostico-software-atual.md` §2.2

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
