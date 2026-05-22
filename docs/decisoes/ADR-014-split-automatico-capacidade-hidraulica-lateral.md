# ADR-014 — Split automático por capacidade hidráulica da lateral

**Data:** 2026-05-21
**Status:** `aceita`
**Supersede:** — (complementa [ADR-013](ADR-013-restricao-dn-homologado-aspersor-subset-filtrado.md))
**Supersedida por:** —

---

## Contexto

A [ADR-013](ADR-013-restricao-dn-homologado-aspersor-subset-filtrado.md) restringiu a seleção hidráulica de laterais para o aspersor 5022 ao subset **DN50/DN75**, eliminando o over-spec de Ø100mm LF e introduzindo o blocker técnico:

> *"Lateral hidraulicamente insuficiente para o aspersor 5022: o maior DN homologado para lateral é DN75, mas N coluna(s)/trecho(s) excedem perda de carga ou velocidade admissível (perda máx: X.XX mca; velocidade máx: Y.YY m/s)..."*

A **TASK-039** (revalidação visual pós-TASK-031) confirmou empiricamente o efeito no Projeto A real (Barreiras/BA, `cmpfu7e4b0001ulshh0ni8jhd`):

| Indicador | TASK-039 (pós-TASK-031) |
|-----------|--------------------------|
| Tubo LF Ø100mm | **0 barras** ✅ |
| Blocker antigo "DN não homologado" | **ausente** ✅ |
| **Blocker técnico novo "Lateral hidraulicamente insuficiente"** | **presente (8 colunas)** ⚠️ |
| Perda máxima | **33,10 mca** (vs. limite 6,00 mca — 5,5× o limite) |
| Velocidade máxima | **3,57 m/s** (vs. limite 2,50 m/s) |
| BOM total | R$ 226.725 (−R$ 30k vs. baseline) |

Achados **H5/H6** da TASK-039 deixaram explícito: a geração default da grade produz, em projetos densos como o Projeto A (337 aspersores em 16 colunas físicas), colunas com **30+ aspersores** — onde DN75 não atende mesmo com a margem de segurança. Análise quantitativa via Hazen-Williams (registrada em `tasks/TASK-040-...md`):

| n asp | Q (m³/h) | L (m) | hf×F (mca) | V (m/s) | Status DN75 |
|-------|----------|-------|------------|---------|-------------|
| 19    | 28,5     | 216,5 | 5,03       | 2,12    | OK (10% margem) |
| 20    | 30,0     | 228,5 | 5,82       | 2,23    | **limite** |
| 21    | 31,5     | 240,5 | 6,68       | 2,34    | HF excede |
| 32    | 48,0     | 372,5 | 22,07      | 3,57    | ambos excedem |
| 37    | 55,5     | 432,5 | 33,33      | 4,12    | ambos excedem |

O sistema **detectava** o problema (via ADR-013), mas **não o reorganizava automaticamente**. O caminho feliz default ficava bloqueado em metade das colunas (8 de 16 no Projeto A), exigindo intervenção manual do usuário ou escalada ao projetista/RT, mesmo quando a reorganização correta era óbvia: **dividir a coluna longa em sub-colunas hidraulicamente viáveis**.

A **TASK-040** implementou essa reorganização automática.

---

## Decisão

**Decidimos** que `generatePhysicalColumns()` em `src/lib/layout/laterais.ts` aplica **split automático por capacidade hidráulica** como pós-processamento. Quando uma coluna física excede a capacidade do DN homologado disponível, a coluna é dividida recursivamente em sub-colunas hidraulicamente válidas — automaticamente, antes de qualquer blocker disparar. **DN100 continua proibido em lateral 5022** (ADR-013 preservada). O blocker técnico permanece **disparável como fallback** quando split mínimo (n=1) ainda não atende (caso patológico raro).

### 1. Critério de parada — capacidade hidráulica real, não número fixo

A bisseção para quando `selectLateralTube` retorna `lateralCapacity.ok === true` para o sub-segmento — ou quando `seg.length <= 1` (limite natural).

**Não há `n_max` hardcoded.** O critério reflete:

- perda de carga real (`hf × F ≤ 0,20 × pressao_servico`);
- velocidade real (`V ≤ MAX_VELOCITY_LATERAL_MS = 2,5 m/s`);
- subset de DN disponíveis (vindo de `getCatalogoLateraisHomologadas5022()` — ADR-013).

**Consequência:** a regra escala para outros aspersores, outros catálogos, outros espaçamentos — sem precisar recalibrar constantes.

### 2. Bisseção recursiva pelo Y mediano — split mínimo necessário

```typescript
const splitByCapacity = (seg: LocalPt[]): ColumnDraft[] => {
  const draft = buildColumnDraft(seg);
  if (draft.lateralCapacity.ok || seg.length <= 1) {
    return [draft];
  }
  const mid = Math.floor(seg.length / 2);
  const left = seg.slice(0, mid);
  const right = seg.slice(mid);
  if (left.length === 0 || right.length === 0) {
    return [draft]; // segurança defensiva — não deveria ocorrer com seg.length >= 2
  }
  return [...splitByCapacity(left), ...splitByCapacity(right)];
};
```

A bisseção preserva continuidade espacial em Y. **A recursão para na primeira partição válida** — não divide além do necessário (split mínimo).

### 3. Rastreabilidade via `originalColumnIndex` + `splitIndex`

`PhysicalColumn` ganhou dois campos opcionais:

```typescript
interface PhysicalColumn {
  // ... campos existentes
  originalColumnIndex?: number;  // raw column source (antes do split)
  splitIndex?: number;            // sequencial dentro do split (0, 1, 2, ...)
}
```

Mesmo quando uma coluna **não foi dividida** (1 sub-coluna por raw column), os campos são populados — garantindo rastreabilidade uniforme para investigação/auditoria futura.

### 4. Cada sub-coluna ganha ramal próprio via `generateSecondaries`

A integração com `generateSecondaries` (já existente, 1 ramal por coluna) é automática — sub-colunas são tratadas como colunas físicas normais a partir do split. **Sem alteração em `generateSecondaries`** ou no orquestrador.

### 5. `routeCoords` preservado em cada sub-lateral

Cada sub-coluna chama `buildLateralRoute` (TASK-028, [ADR-012](ADR-012-lateral-fisica-polilinha-construtivel-0-90.md)) com seu próprio subset de pontos. A polilinha construtível 0°/90° é recomputada para o subset — `routeCoords` válido em cada sub-lateral. Validado em T40-6.

### 6. Blocker técnico permanece como fallback

Quando a bisseção atinge `seg.length === 1` e mesmo o aspersor solitário não atende (caso patológico: vazão extrema por aspersor, ex.: 50 m³/h/asp), o draft final tem `lateralCapacity.ok = false` e o blocker técnico da ADR-013 dispara normalmente. Validado em T40-4.

---

## Alternativas consideradas

### Alternativa A — Split por número fixo de aspersores (`n_max = 19` ou `20`)

**Descrição:** Hardcode de `n_max` calculado pela análise quantitativa do DN75 com aspersor 5022.

**Por que foi descartada:** Não escala. Mudança de aspersor, espaçamento ou catálogo exigiria recalibrar a constante. O critério hidráulico real (perda + velocidade no subset disponível) é o que importa — `n_max` é apenas uma consequência observável dele. Esta alternativa foi explicitamente descartada no ajuste 1 do plano aprovado da TASK-040.

### Alternativa B — Alimentação intermediária (T no meio da lateral, 2 ramais por coluna)

**Descrição:** Em vez de dividir a coluna em sub-colunas, alimentar uma única lateral por dois pontos (T no meio). Cada metade tem metade do comprimento e metade da vazão acumulada → perda cai por fator ~4 (Hazen-Williams).

**Por que foi descartada nesta task:** Decisão arquitetural significativa — exige envolvimento do RT (homologação de T de alimentação intermediária, regra de ramificação da principal, posicionamento do T no eixo). **Não descartada estrategicamente** — fica para a **TASK-042** (diagnóstico profissional da arquitetura principal/ramais/laterais), junto com outras alternativas arquiteturais.

### Alternativa C — Redistribuição da principal/corredor

**Descrição:** Mover o eixo da principal para colunas mais curtas (rebalancear a posição da principal no polígono).

**Por que foi descartada nesta task:** Mesma justificativa da Alternativa B — decisão arquitetural de produto que exige RT. Fica para a TASK-042.

### Alternativa D — Rebalanceamento de setorização (mais setores menores)

**Descrição:** Em vez de dividir colunas, dividir setores — operar mais setores menores em sequência. Mantém o número de colunas físicas mas reduz vazão de cada setor.

**Por que foi descartada nesta task:** Não resolve o problema **físico** — colunas longas continuam longas, perda continua alta para a mesma vazão por aspersor. Só funcionaria se reduzir aspersores ativos simultaneamente reduzisse a vazão na lateral inteira — mas a lateral acumula vazão de **todos** os aspersores conectados, independente do setor operacional. Fica para a TASK-042 apenas como combinação com outras alternativas.

### Alternativa E — Mudança de orientação automática da grade

**Descrição:** Rotacionar o ângulo da grade automaticamente para que as colunas físicas fiquem mais curtas (perpendiculares à dimensão longa do polígono).

**Por que foi descartada nesta task:** Fora do escopo (declarado em `tasks/TASK-040-...md`, "Fora do escopo"). Mudança de `gridAngleDegrees` é decisão arquitetural ampla — pode afetar setorização, sombreamento, layout visual, BOM. Fica para a TASK-042 como uma das alternativas a investigar.

### Alternativa F — Liberar DN100 como lateral

**Descrição:** Aceitar DN100 LF como tubo de lateral para resolver projetos densos sem split.

**Por que foi descartada:** Contradiz a regra do RT (TASK-023 — kit do aspersor 5022 só é homologado para DN50/DN75) e a ADR-013. Permitir Ø100mm na lateral aceita propostas com tomada do aspersor sem SKU homologado, o que invalida a proposta para emissão real.

### Alternativa G — Manter apenas o blocker técnico (status quo)

**Descrição:** Não reorganizar automaticamente; deixar o usuário escalar ao projetista/RT quando o blocker disparar.

**Por que foi descartada:** A TASK-039 mostrou que o caminho feliz default fica bloqueado em metade das colunas (8 de 16) em projetos densos típicos. Esperar reorganização manual converte um problema solucionável algoritmicamente em fricção operacional. O blocker técnico fica preservado como **fallback** — não como caminho primário.

### Alternativa H — Reduzir `MAX_VELOCITY_LATERAL_MS` ou `maxPerdaPercentual`

**Descrição:** Aumentar a margem de aceitação (ex.: aceitar velocidade até 3,0 m/s, ou perda até 25% pressão de serviço).

**Por que foi descartada:** Contradiz a regra hidráulica do RT. Mascarar o problema afrouxando limites não resolve — apenas adia o pico de perda em campo. Limites operam como invariantes; ajustes vão para revisão RT formal, não para resolver bloqueios pontuais.

---

## Consequências

### Positivas

- **Caminho feliz default desbloqueado** em projetos densos — o split resolve automaticamente o problema que travava 8 das 16 colunas no Projeto A.
- **Escalável** — usar `selectLateralTube` como critério de parada (em vez de `n_max` fixo) garante que a regra funciona para outros aspersores, espaçamentos e catálogos sem recalibração.
- **Sem over-spec** — DN100 nunca aparece em lateral 5022 (ADR-013 preservada; T40-7 valida).
- **`routeCoords` preservado** — ADR-012 (TASK-028) continua válida em cada sub-lateral (T40-6 valida).
- **Blocker técnico continua disparável** — fallback para casos patológicos (T40-4 valida com vazão extrema 50 m³/h/asp).
- **Defesa em camadas mantida** — ADR-013 (subset filtrado) + ADR-014 (split por capacidade) + blocker técnico (fallback) formam três camadas sequenciais.
- **Rastreabilidade uniforme** — `originalColumnIndex` + `splitIndex` permitem reconstruir a coluna raw a partir das sub-colunas para auditoria ou investigação.
- **Catálogo global preservado** — `TUBOS_PVC_LF` segue como fonte da verdade; restrição/split são regras de uso.

### Negativas / trade-offs

- **BOM cresce em ramais e conexões** — cada sub-coluna ganha seu próprio ramal via `generateSecondaries`. Para o Projeto A (esperativa: 16 → ~24 colunas, +8 ramais), espera-se crescimento moderado em DN50/DN75 LF + tês de derivação. Magnitude exata a confirmar na TASK-041.
- **`WEIGHT_FRAGMENTATION = 0,4`** (`OPTIMIZER_PARAMS`) não foi recalibrada — pode penalizar candidatos com mais sub-colunas no otimizer de layout. Fica para calibração futura se houver evidência de candidatos sub-ótimos.
- **Não resolve a discussão de arquitetura profissional da rede** — "mais ramais" é a solução mais idiomática ao código existente, mas pode não ser o ótimo global em todos os contextos. Alternativas arquiteturais (alimentação intermediária, redistribuição da principal, mudança de orientação) ficam para a **TASK-042**. ADR-014 não impede revisão futura — apenas estabelece o comportamento default atual.
- **Mais junções na principal** — cada ramal extra é mais um T na principal; pode aumentar perdas localizadas (já contabilizadas via fator F = 1,10). Sem impacto material esperado.
- **Testes legados ajustados** — `TEST_CATALOG` enriquecido em `laterais.test.ts`/`principal.test.ts`; Suite 11a de `constructability.test.ts` ajustada (`makePhysCols(1, 30)` → `(1, 18)`); T31-4/5/6/8 reescritos. Cobertura preservada.

### Neutras

- **Catálogo `src/lib/catalog/aspersores.ts`** intocado (mtime verificado).
- **Motor A/B/C, PDF, mapa, espaçamento 12×12, `ASPERSOR_PADRAO`** não afetados.
- **TASK-028 (`routeCoords`)** preservada (ADR-012).
- **TASK-031 (subset homologado)** preservada (ADR-013).
- **TASK-034 (feedback PDF)** e **TASK-035 (BOM curvas 90°)** seguem separadas.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|-----------------|
| `src/lib/layout/laterais.ts` | `splitByCapacity` (nova função privada, bisseção recursiva), `buildColumnDraft` (helper privado para centralizar cálculo de rota/vazão/comprimento/seleção), pós-processamento em `generatePhysicalColumns`, `PhysicalColumn` ganhou `originalColumnIndex?` e `splitIndex?` (opcionais) |
| `src/lib/layout/__tests__/grid-split-density.test.ts` | **Novo arquivo** — 9 testes (T40-1 a T40-9): caminho feliz, split em 2, split recursivo, fallback patológico, preservação de aspersores e `routeCoords`, DN100 proibido em lateral 5022, projeto-tipo Barreiras (16×21=336 asp), split mínimo necessário |
| `src/lib/layout/__tests__/lateral-capacity.test.ts` | T31-4/T31-5/T31-6/T31-8 reescritos para refletir split automático: T31-4 valida sub-colunas com `ok=true` + rastreabilidade; T31-5 valida `detectLateralCapacityViolations` via `PhysicalColumn` sintética; T31-6 valida texto do blocker via `LateralCapacityReport` sintético; T31-8 valida n=40 via `calculateIrrigationProject` sem blocker |
| `src/lib/layout/__tests__/laterais.test.ts`, `principal.test.ts` | `TEST_CATALOG` enriquecido com DN50/DN75/DN100 + `diametroInternoMm` — testes de agrupamento preservam intenção sem disparar split por capacidade |
| `src/lib/layout/__tests__/constructability.test.ts` | Suite 11a: `makePhysCols(1, 30)` → `(1, 18)` para preservar cenário "1 coluna × 3 setores" sem disparar split |
| `src/lib/catalog/aspersores.ts` | **Intocado** (mtime 12:08:51 anterior ao início da TASK-040) |
| `src/lib/layout/irrigation-project.ts` | **Não modificado** — split é interno a `generatePhysicalColumns`; contrato de saída preservado |
| `src/lib/bom.ts` | **Não modificado** — blocker técnico da ADR-013 disparável via fallback é o mesmo |

**Saldo de testes:** 759 → **768** (+9 novos em `grid-split-density.test.ts`; 4 reescritos sem mudança de contagem; 35 arquivos).

---

## Classificação

- decisão arquitetural de domínio (estratégia de reorganização automática vs. bloqueio)
- governança de geração default (caminho feliz vs. fallback)
- escalável para outros aspersores/catálogos (sem `n_max` hardcoded)
- complementar à ADR-013 (subset filtrado upstream + split na geração)
- **não encerra** a discussão de arquitetura profissional da rede (TASK-042 pendente)
- blocker técnico mantido como fallback (ADR-013 preservada)
- ADR-014 documenta o **comportamento default**, não a estratégia ótima global — revisão arquitetural por RT prevista via TASK-042

---

## Referências

- TASK-040 — Revisar geração default da grade para projetos densos (concluída em 2026-05-21; absorveu escopo "algoritmo da grade" da TASK-032)
- TASK-039 — Revalidação visual pós-TASK-031 (origem empírica de H5/H6 → motivou TASK-040)
- TASK-041 — Revalidação visual pós-TASK-040 (obrigatória; medir empiricamente o efeito no Projeto A)
- TASK-042 — Diagnóstico profissional da arquitetura principal/ramais/laterais (estratégica; investiga alternativas arquiteturais)
- TASK-031 — Subset DN50/DN75 homologado (ver ADR-013)
- TASK-028 — Lateral física polilinha (ver ADR-012)
- TASK-023 — Kit de ligação aspersor 5022 por DN
- [ADR-012](ADR-012-lateral-fisica-polilinha-construtivel-0-90.md) — Lateral física como polilinha construtível 0°/90°
- [ADR-013](ADR-013-restricao-dn-homologado-aspersor-subset-filtrado.md) — Restrição de DN homologado por aspersor via subset filtrado
- [ADR-003](ADR-003-bloqueio-pdf-com-blockers.md) — Bloqueio de PDF com blockers ativos
- [ADR-007](ADR-007-premissas-provisorias-mercado-revisao-brasmaquinas.md) — Premissas provisórias e revisão Brasmáquinas
- `docs/relatorios/2026-05-21-TASK-039.md`
- `docs/relatorios/2026-05-21-TASK-040.md`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | ADR-014 criada formalizando a decisão arquitetural materializada pela TASK-040. Registra split automático por capacidade hidráulica em `generatePhysicalColumns` como comportamento default, com blocker técnico (ADR-013) preservado como fallback. Documenta que ADR-014 **não encerra** a discussão arquitetural — alternativas (alimentação intermediária, redistribuição da principal, mudança de orientação) ficam para a TASK-042. |
