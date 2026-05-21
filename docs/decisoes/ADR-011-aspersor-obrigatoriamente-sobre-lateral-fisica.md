# ADR-011 — Aspersor obrigatoriamente sobre a lateral física

**Data:** 2026-05-20
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

A TASK-018 e TASK-019 implementaram a detecção de desvios entre a posição calculada do aspersor (do grid engine) e a posição do eixo canônico da lateral física que o atende.

Antes do início da TASK-019, o usuário clarificou e o RT confirmou uma **regra operacional fundamental** da Brasmáquinas:

> A vala da lateral e o ponto do aspersor são a mesma execução física. Um aspersor fora do eixo da lateral exige uma segunda escavação, tornando o projeto construtivamente inválido.

Essa regra é consequência direta do modelo operacional: laterais são encanamentos enterrados no eixo da linha de aspersores. Não há "desvio aceitável" — o aspersor está sobre a vala ou o projeto não é construtível.

---

## Decisão

### 1. Regra operacional confirmada

A regra é **aprovada e confirmada pela Brasmáquinas** — não é premissa provisória. Está documentada em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` com status explícito:

> **Regra: APROVADO — decisão operacional Brasmáquinas** (não é premissa provisória)

### 2. Tolerância numérica

A tolerância numérica/cartográfica é **0,10 m** — constante exportada `TOLERANCIA_ASPERSOR_EIXO_LATERAL`:

```typescript
export const TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0.10; // metros
```

**Justificativa do valor:**
- Aspersores são calculados pelo grid engine com ponto flutuante (16–17 dígitos significativos).
- A projeção flat-earth usada para calcular a grade introduz erro < 0,10 m para fazendas < 500 m.
- O valor 0,10 m cobre ruído numérico com margem de segurança 10× para projetos normais.

**Status do valor:** `PENDENTE_REVISAO_BRASMAQUINAS` — para projetos com fazendas > 500–700 m, o erro flat-earth pode aproximar-se de 0,10 m. Se blockers espúrios forem observados com dados reais, elevar para 0,20 m.

### 3. Severidade: blocker

Desvio **maior que 0,10 m** gera **blocker** estruturado:

```text
"Aspersor fora do eixo da lateral física: N lateral(is) com desvio acima de 0.1 m (máx: X.XX m). 
O aspersor deve estar sobre a rede lateral, pois a vala da lateral é a mesma do aspersor."
```

O blocker é armazenado em `diagnostics.blockers` e impede a emissão do PDF via gate HTTP 422 existente (ADR-003, TASK-003).

### 4. Implementação

Três componentes integrados no orquestrador `calculateIrrigationProject()` (TASK-019):

1. **Detecção:** `detectAxisDeviations(physicalColumns, sprinklerPositions, centroid)` em `src/lib/layout/laterais.ts`
   - Itera cada coluna física
   - Calcula desvio máximo dos aspersores em relação ao eixo canônico
   - Retorna `AxisDeviationReport { violations, maxDeviationM }`

2. **Diagnóstico:** `generateProposalDiagnostics(..., axisDeviationReport?)` em `src/lib/bom.ts`
   - Recebe report opcional
   - Gera blocker quando `violations.length > 0`

3. **Resultado:** `IrrigationProjectResult.axisDeviation` em `src/lib/layout/irrigation-project.ts`
   - Exposto para inspeção direta pelos consumidores
   - Permite UI exibir detalhes do desvio (opcional, futuro)

---

## Alternativas consideradas

### Alternativa A — Warning em vez de blocker

**Descrição:** Gerar warning técnico, não blocker. Deixar a proposta ser emitida com um aviso.

**Por que foi descartada:** Contradiz a regra operacional confirmada. Um aspersor fora da vala exige segunda escavação — é erro construtivo crítico, não recomendação. Warningimplica "você pode ignorar se souber o risco", o que não se aplica aqui.

### Alternativa B — Tolerância variável por tamanho de fazenda

**Descrição:** Ajustar `TOLERANCIA_ASPERSOR_EIXO_LATERAL` dinamicamente em função da área da fazenda.

**Por que foi descartada:** Prematura. A tolerância 0,10 m já funciona para a maioria dos casos. Variabilidade dinâmica seria complexidade sem benefício confirmado até que dados de campo revelem um padrão sistemático de erro por escala.

### Alternativa C — Tolerância 0,50 m (TASK-018)

**Descrição:** Usar tolerância ampla 0,50 m (provisória de TASK-018).

**Por que foi descartada:** Muito ampla. Após TASK-018/019, o erro flat-earth foi medido em < 0,10 m para fazendas normais. 0,50 m aceitaria desvios construtivamente problemáticos. Valor 0,10 m é conservador e cobre o ruído numérico real.

### Alternativa D — Não bloquear PDF; apenas exibir aviso no mapa

**Descrição:** Detectar mas não bloquear; deixar o usuário ver o aviso e decidir.

**Por que foi descartada:** Desabilita a governança do sistema. O PDF é o artefato crítico de venda/execução. Permitir propostas com aspersores fora da vala aumenta risco de rejeição em campo (obra não combina com planta). Blocker força correção antes de proposta ser entregue.

---

## Consequências

### Positivas

- Projetos com aspersores fora da lateral física são bloqueados antes da proposta sair do sistema — elimina propostas construtivamente inválidas.
- A regra é explícita no código (não implícita). Novos engenheiros veem `detectAxisDeviations` e compreendem imediatamente a regra.
- Tolerância 0,10 m é rastreável e versionável. Futuras revisões RT são documentadas em `12-premissas-provisorias-e-revisao-rt.md`.
- PDF bloqueado automaticamente via mecanismo existente (TASK-003) — sem mudança na rota.

### Negativas / trade-offs

- Projetos legítimos com desvios espúrios < 0,10 m por erro numérico em fazendas > 500 m podem gerar falsos blockers. Mitigação: telemetria de campo, revisão RT do valor.
- Se o RT observar que 0,10 m é muito restritivo, será necessário elevar para 0,20 m e revisar propostas existentes bloqueadas.

### Neutras

- A detecção não altera `physicalColumns`, `laterais` ou `sprinklers` — apenas diagnóstico.
- Motor de layout, solver hidráulico, BOM de materiais e mapa não são afetados.
- Retrocompatibilidade: 5° parâmetro de `generateProposalDiagnostics` é opcional (padrão `undefined`).

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/laterais.ts` | `TOLERANCIA_ASPERSOR_EIXO_LATERAL`, `AxisDeviationReport`, `detectAxisDeviations`, tipos associados |
| `src/lib/bom.ts` | 5° parâmetro opcional `axisDeviationReport` em `generateProposalDiagnostics`; blocker condicionado |
| `src/lib/layout/irrigation-project.ts` | `axisDeviation` em `IrrigationProjectResult`; chamada `detectAxisDeviations`; passagem do report para diagnósticos |
| `src/lib/layout/__tests__/physical-column-audit.test.ts` | +5 testes (T19-a..e) — detecção sem/com violação, múltiplas colunas |
| `src/lib/layout/__tests__/integration.test.ts` | +3 testes (T19-f..h) — integração de ponta-a-ponta, PDF bloqueado |

---

## Classificação

- regra operacional de construtibilidade (vala da lateral = ponto do aspersor)
- governança de bloqueio/emissão (blocker impede PDF)
- **regra confirmada pelo RT (não é premissa provisória)**
- **valor numérico 0,10 m permanece pendente de revisão RT para fazendas > 500 m**

---

## Referências

- TASK-019 — Integrar desvio aspersor-eixo da lateral em diagnostics
- TASK-018 — Corrigir eixo canônico das laterais físicas
- TASK-017 — Lateral física para rota reta/construtível
- TASK-013 — Auditar e corrigir laterais físicas construtíveis
- ADR-003 — Bloqueio de PDF com blockers ativos
- ADR-004 — Lateral física vs. trecho operacional
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — `TOLERANCIA_ASPERSOR_EIXO_LATERAL`
- `docs/relatorios/2026-05-20-TASK-019.md`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Haiku 4.5 | ADR-011 criada (TASK-020) |
