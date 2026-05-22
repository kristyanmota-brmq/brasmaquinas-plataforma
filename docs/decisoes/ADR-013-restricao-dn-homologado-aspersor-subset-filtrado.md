# ADR-013 — Restrição de DN homologado por aspersor via subset filtrado

**Data:** 2026-05-21
**Status:** `aceita`
**Supersede:** — (refina ADR-007 e complementa TASK-023)
**Supersedida por:** —

---

## Contexto

A **TASK-023** (concluída em 2026-05-21 mais cedo) implementou o **kit de ligação do aspersor 5022 por DN da lateral**, com SKUs homologados pelo RT para **DN50** e **DN75**. A trava de governança foi colocada **downstream** na BOM: se uma lateral aparecesse com DN ≠ 50 e ≠ 75, o sistema emite o blocker comercial:

> *"BOM incompleta — DN de lateral não homologado para kit do aspersor 5022: N aspersor(es) em lateral sem kit disponível. Utilizar apenas laterais DN50mm ou DN75mm com o aspersor 5022."*

A **TASK-028** (lateral física como polilinha — ver [ADR-012](ADR-012-lateral-fisica-polilinha-construtivel-0-90.md)) ampliou inadvertidamente o problema: ao tornar `comprimentoM` real (somando trechos horizontais das dobras 90°), `hf = headLoss(Q, L, Dint, C) × F` cresceu — e o seletor hidráulico `selectLateralTube` passou a escolher **DN100** com mais frequência (cai no fallback "maior tubo do catálogo" quando DN50/DN75 não atendem).

A **TASK-033** (revalidação visual no Projeto A em Barreiras/BA) mediu empiricamente o efeito:

| Indicador | TASK-027 | TASK-033 (pós-TASK-028) | Δ |
|-----------|----------|-------------------------|---|
| Blocker antigo "DN não homologado" | 199 aspersores | **217 aspersores** | +18 |
| Tubo LF Ø100mm | 385 barras | **625 barras** | **+240** |
| BOM total | R$ 207.952 | R$ 257.089 | **+R$ 49.136 (+23,6%)** |

O blocker downstream da TASK-023 **detectava** o problema mas não o **prevenia**: a BOM já contava as 625 barras Ø100mm como pendência sem SKU homologado, inflando custo (over-spec). A solução correta é restringir **upstream**, no nível do seletor.

A TASK-031 (que absorveu a antiga TASK-025) implementou essa restrição.

---

## Decisão

**Decidimos** que a seleção hidráulica de laterais para o **aspersor 5022** deve usar um **subset homologado DN50/DN75** no nível do seletor, via função exportada com nome explícito. O catálogo global `TUBOS_PVC_LF` permanece intocado (com DN50/DN75/DN100). Quando DN75 não atende perda/velocidade, o seletor mantém DN75 como tubo (para o solver continuar rodando) mas sinaliza `lateralCapacity.ok = false`, e o diagnóstico emite **blocker técnico** explícito.

### 1. Subset homologado via função exportada

`src/lib/layout/laterais.ts` exporta:

```typescript
export function getCatalogoLateraisHomologadas5022(): readonly TuboCandidato[] {
  return TUBOS_PVC_LF.filter((t) => t.diametroMm <= 75);
}
```

JSDoc explicita a regra operacional Brasmáquinas. **Catálogo global `TUBOS_PVC_LF` não é alterado** — DN100 LF continua válido em outros usos potenciais.

### 2. Contrato de `selectLateralTube`

Retorna estrutura ampliada (privada à `laterais.ts`):

```typescript
{
  selecionado: TuboCandidato;
  hfFinal: number;
  lateralCapacity: {
    ok: boolean;
    reason?: "headloss_exceeded" | "velocity_exceeded" | "both";
    hfM: number;
    velMs: number;
  };
}
```

- Quando algum tubo do subset atende perda **e** velocidade: `ok: true`.
- Quando nenhum atende: retorna o **maior do subset** (DN75) com `ok: false` e `reason` calculado examinando os gates do maior tubo.

### 3. Propagação

Campos obrigatórios:

- `PhysicalColumn.lateralCapacity: LateralCapacityInfo`
- `Lateral.lateralCapacity: LateralCapacityInfo`

Os 3 geradores (`generatePhysicalColumns`, `generateLateraisLegacyForDebug`, `deriveLateraisFromNetwork`) propagam o campo.

### 4. Agregação e diagnóstico

`detectLateralCapacityViolations(physicalColumns)` em `laterais.ts` produz `LateralCapacityReport { violations, hasBlockers, maxHfM, maxVelMs }`, similar a `detectAxisDeviations`.

O orquestrador `calculateIrrigationProject()` chama o detector e passa o report como **6º parâmetro** de `generateProposalDiagnostics()`.

### 5. Blocker técnico

Texto literal (validado em T31-6):

> *"Lateral hidraulicamente insuficiente para o aspersor 5022: o maior DN homologado para lateral é DN75, mas N coluna(s)/trecho(s) excedem perda de carga ou velocidade admissível (perda máx: X.XX mca; velocidade máx: Y.YY m/s). Ações sugeridas: reduzir aspersores por trecho operacional; revisar comprimento das laterais; dividir alimentação; reposicionar principal/corredor; ou escalar para projetista/RT."*

**Severidade:** blocker (impede emissão do PDF via gate HTTP 422 — ADR-003).

### 6. Defesa em camadas

O blocker antigo da TASK-023 (*"BOM incompleta — DN de lateral não homologado..."*) **permanece** na codebase em `bom.ts`. Comportamento esperado pós-ADR-013:

- **Caminho normal:** subset filtrado garante DN ≤ 75 → `kitAspersorDnNaoHomologadoCount === 0` → blocker antigo **não dispara**.
- **Caminho defensivo:** se algum chamador esquecer de passar o subset filtrado (regressão), o blocker antigo ainda dispara como **trava de segurança**.

Validado em T31-7.

---

## Alternativas consideradas

### Alternativa A — Remover DN100 de `TUBOS_PVC_LF`

**Descrição:** Editar o catálogo global removendo o SKU DN100 LF.

**Por que foi descartada:** Catálogo é fonte de verdade sobre o que **existe** comercialmente. DN100 LF é um tubo real do catálogo Tigre. Remover quebraria outros usos potenciais (futuros aspersores, ramais, principal). Regra é de **uso por aspersor**, não de **catálogo**.

### Alternativa B — Filtro inline em `irrigation-project.ts`

**Descrição:** `TUBOS_PVC_LF.filter(t => t.diametroMm <= 75)` direto no orquestrador, sem função nomeada.

**Por que foi descartada:** Regra fica oculta. Ajuste 3 do usuário no plano da TASK-031: "regra deve ter nome explícito (`laterais do 5022 usam apenas DN50/DN75`), não filtro solto".

### Alternativa C — Hard-coded de DNs em `selectLateralTube`

**Descrição:** `if (tubo.diametroMm > 75) continue;` dentro do seletor.

**Por que foi descartada:** Não escala — `selectLateralTube` ficaria conhecendo a regra de cada aspersor (acoplamento ruim). O contrato correto é: catálogo passado = subset válido para aquele contexto; seletor não conhece regras de domínio.

### Alternativa D — Manter apenas a trava downstream (TASK-023)

**Descrição:** Não restringir o seletor; deixar a BOM bloquear quando DN100 aparecer.

**Por que foi descartada:** Permite que o motor produza projetos com Ø100mm LF — inflando BOM por over-spec. Validado empiricamente na TASK-033: +R$ 49k principalmente em DN100 LF, mesmo com o blocker ativo. Restrição upstream é a correção real.

### Alternativa E — Lançar exceção quando seletor falha

**Descrição:** `selectLateralTube` lança erro se nenhum tubo do subset atende.

**Por que foi descartada:** Quebra o pipeline. O solver hidráulico e a UI precisam continuar rodando com **números visíveis ao usuário** (perda real, velocidade real do DN75) para que o blocker técnico contextualize o problema. A solução adotada (`ok: false` + DN75) permite isso.

### Alternativa F — Aceitar DN100 com aviso (warning, não blocker)

**Descrição:** Permitir DN100 em lateral mas emitir warning.

**Por que foi descartada:** Contradiz a regra do RT (kit 5022 não tem peças homologadas para DN100 — TASK-023). Permitir Ø100mm na lateral aceita propostas com tomada do aspersor sem SKU homologado, o que invalida a proposta para emissão real.

---

## Consequências

### Positivas

- **Over-spec eliminado upstream** — DN100 nunca mais aparece em lateral do 5022 (validado em T31-2, T31-9).
- **Blocker técnico explícito** — quando DN75 não atende, o usuário recebe mensagem operacional com 5 ações sugeridas (não apenas "mais setores"). Contextualizado pela perda e velocidade reais calculadas.
- **Catálogo global preservado** — `TUBOS_PVC_LF` segue como fonte da verdade; restrição é regra de uso.
- **Defesa em camadas** — blocker antigo da TASK-023 permanece como trava se a restrição upstream falhar (regressão).
- **Padrão escalável** — futuro aspersor com kit diferente terá sua própria função `getCatalogoLaterais{XXXX}()` no mesmo padrão.
- **Solver hidráulico continua rodando** com DN75 — usuário vê perda/velocidade reais junto do blocker.
- **BOM efetiva reduzida** — eliminação do tubo Ø100mm LF deve compensar parte do crescimento da TASK-028 (a confirmar empiricamente na TASK-039).

### Negativas / trade-offs

- **Projetos antes "ok" via DN100 agora geram blocker técnico** — é o comportamento correto, mas pode surpreender em projetos legados. Mitigação: o blocker tem texto operacional claro.
- **`PhysicalColumn.lateralCapacity` é campo obrigatório** — fixtures de teste com literais precisaram ser atualizadas (9 arquivos).
- **`deriveLateraisFromNetwork` assinatura ampliada** — chamadores externos (testes) precisaram do ajuste; não há consumidor além de orquestrador e testes.
- **Calibração do RT** — texto e ações sugeridas do blocker precisam de validação RT antes de produção real (pendente).

### Neutras

- Motor A/B/C, PDF, mapa, espaçamento 12×12, `ASPERSOR_PADRAO` **não afetados**.
- TASK-028 (`routeCoords`) preservada.
- TASK-035 (BOM curvas 90°) segue separada.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/laterais.ts` | `getCatalogoLateraisHomologadas5022` (novo, exportado), `LateralCapacityInfo`/`LateralCapacityReason`/`LateralCapacityReport`/`LateralCapacityViolation` (novos tipos), `detectLateralCapacityViolations` (nova função exportada), `selectLateralTube` retorno ampliado, `lateralCapacity` em `PhysicalColumn`/`Lateral` (obrigatório), propagação nos 3 geradores |
| `src/lib/layout/irrigation-project.ts` | Usa `getCatalogoLateraisHomologadas5022()` nas 2 chamadas; campo `lateralCapacity` em `IrrigationProjectResult`; passa 6º argumento para `generateProposalDiagnostics` |
| `src/lib/bom.ts` | `generateProposalDiagnostics` aceita `lateralCapacityReport`; emite blocker técnico com texto literal aprovado |
| `src/lib/catalog/aspersores.ts` | **Intocado** (verificado por mtime e `git diff` vazio para a TASK-031) |
| `src/lib/layout/__tests__/lateral-capacity.test.ts` | +12 testes novos (T31-1 a T31-9) pela superfície pública |
| 9 fixtures de teste existentes | Adicionam `lateralCapacity: { ok: true, hfM: 0, velMs: 0 }` em literais |

---

## Classificação

- decisão arquitetural de domínio (estratégia de restrição por aspersor)
- governança de emissão (blocker técnico + defesa em camadas)
- catálogo global imutável; restrição via subset filtrado upstream
- escalável para outros aspersores no futuro (mesmo padrão)
- texto e ações do blocker **PENDENTE_REVISAO_RT** antes de produção real

---

## Referências

- TASK-031 — Revisar geração default de grade vs. laterais homologadas (concluída; absorveu TASK-025)
- TASK-023 — Kit de ligação aspersor 5022 por DN (homologação SKUs DN50/DN75)
- TASK-027 — Validação visual (origem do achado F7 → F6 da BOM)
- TASK-028 — Lateral física polilinha (ver ADR-012)
- TASK-033 — Revalidação visual pós-TASK-028 (G2/G3 — endereçados por esta ADR)
- ADR-003 — Bloqueio de PDF com blockers ativos
- ADR-007 — Premissas provisórias e revisão Brasmáquinas
- ADR-012 — Lateral física como polilinha construtível 0°/90°
- `docs/relatorios/2026-05-21-TASK-031.md`
- `docs/relatorios/2026-05-21-TASK-033.md`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | ADR-013 criada (retroativa) para documentar a decisão arquitetural materializada pela TASK-031 e empiricamente motivada pelos achados G2/G3 da TASK-033. |
