# ADR-015 — Seleção arquitetural automática da principal/ramais por menor BOM válida e operacionalmente executável

**Data:** 2026-05-21
**Status:** `aceita`
**Supersede:** — (complementa [ADR-014](ADR-014-split-automatico-capacidade-hidraulica-lateral.md))
**Supersedida por:** —

---

## Contexto

A **TASK-040** ([ADR-014](ADR-014-split-automatico-capacidade-hidraulica-lateral.md)) eliminou o blocker técnico de capacidade DN75 nas laterais. A **TASK-041** confirmou empiricamente o efeito no Projeto A real (Barreiras/BA, `cmpfu7e4b0001ulshh0ni8jhd`): blocker desapareceu, PDF gate liberado (HTTP 200), mas a BOM total cresceu de **R$ 226.724,81 → R$ 277.955,01 (+R$ 51.230 / +22,6%)**. O driver dominante foi **tubo PVC rígido Ø100mm em ramais — 416 barras × R$ 215 = R$ 89.440 (32% da BOM)**.

A **TASK-042** decompôs o problema em **três alavancas ortogonais** (L1 posição da principal; L2 critério de vazão dos ramais; L3 limite de velocidade em ramal) e avaliou 9 alternativas arquiteturais (A0-A8). A **TASK-042R** registrou a diretriz Brasmáquinas:

> "O software deve comparar alternativas de arquitetura principal/ramais e escolher automaticamente a alternativa de menor BOM tecnicamente válida e operacionalmente executável."

Esta ADR formaliza essa decisão arquitetural — implementada pela TASK-043.

---

## Decisão

**Decidimos** que `src/lib/layout/architecture-selector.ts` exporta a função pura `selectArchitectureByBom()` que:

1. Avalia **candidatos arquiteturais** (mínimo MVP: A0/A2/A3) gerando principal/adutora para cada um.
2. Para cada candidato: gera ramais via `generateSecondaries`, dimensiona via `sizeAllSecondaries` (com `MAX_VELOCITY_RAMAL_MS=1,5`, `MAX_HEADLOSS_RAMAL_MCA=3,0`), e calcula **BOM estimada preliminar** somando custo de principal + adutora + ramais usando preços do catálogo.
3. Marca candidato **inválido** quando algum ramal excede `MAX_VEL` ou `MAX_HEADLOSS` mesmo com o maior DN do `TUBOS_PVC_RIGIDO`.
4. Escolhe o de **menor BOM estimada preliminar entre os válidos**; em empate (< R$ 1,00), prefere A0 (princípio "menor mudança").
5. Retorna diagnóstico completo: vencedor, BOM por candidato, motivo de invalidação dos rejeitados, motivo de escolha, warnings, diferença vs. baseline.

### 1. Função objetivo: custo. Restrições duras: engenharia.

**Função objetivo:** BOM estimada preliminar (R$).
**Restrições duras (todas devem ser satisfeitas):**

| Restrição | Limite | Origem |
|-----------|--------|--------|
| Velocidade em ramal | ≤ 1,5 m/s | NRCS NEH (≈ 5 ft/s) — `PENDENTE_REVISAO_RT_BRASMAQUINAS` |
| Perda de carga em ramal | ≤ 3,0 mca (10% × pressão de serviço) | boa prática |
| Rede interna 0°/90° | ADR-010 | regra técnica Brasmáquinas |
| Aspersor sobre lateral física | ADR-011/012 | regra operacional |
| DN100 proibido em lateral 5022 | ADR-013 | regra técnica Brasmáquinas |
| Split por capacidade preservado | ADR-014 | regra técnica |
| Operacionalmente executável | warning quando principal cruza área (A3) | proxy de construtibilidade |

### 2. A BOM estimada preliminar NÃO é a BOM oficial do projeto

A BOM estimada preliminar é **diferencial** — apenas itens que mudam entre candidatos (tubos principal/adutora/ramais). Usada exclusivamente para comparação entre candidatos. **A BOM oficial continua sendo gerada por `buildBOM()` em `src/lib/bom.ts`** sobre o resultado do solver hidráulico após a arquitetura vencedora ser aplicada.

Convenções de linguagem oficiais (registradas em TASK-042R §6):

- **BOM estimada preliminar** — calculada pelo motor para comparação.
- **BOM diferencial** — sinônimo, enfatiza que só itens variáveis são incluídos.
- **BOM de comparação arquitetural** — sinônimo.
- **NÃO** usar "BOM real" ou "BOM do projeto" para se referir à saída do motor.

### 3. A0 é fallback seguro

Quando todos os candidatos são inválidos (caso patológico defensivo), o motor retorna A0 com `decision = "no_valid_candidate"` — o diagnóstico de bloqueio virá do solver hidráulico oficial via blockers técnicos.

Quando A0 é o de menor BOM válida (ou empata), o motor retorna A0 com `decision = "baseline_preserved"` e `bomDeltaVsBaseline = 0` — comportamento idêntico ao baseline atual.

### 4. Lista de candidatos MVP — A0, A2, A3

| ID | Candidato | MVP? | Motivo |
|----|-----------|------|--------|
| A0 | Baseline: principal na borda Y mais próxima da captação | sim (obrigatório) | comportamento atual; fallback seguro |
| A2 | Principal na borda forçada (avalia min e max) | sim | refinamento de A0 sem mudar topologia |
| A3 | Principal central: `principalY = (yMin + yMax)/2` | sim | maior potencial de redução de comprimento de ramais |
| A1 | Principal externa | **pós-MVP** | requer detecção de "lado externo preferencial" — lógica não simples nem segura no MVP |
| A4 | Espinha interna (T-shape) | pós-MVP | complexidade alta; topologia não-trivial |
| A5 | Subprincipais paralelas | pós-MVP | aplicável a > 10 ha |
| A6 | Alimentação central de lateral | pós-MVP | requer SKU novo + homologação RT |
| A7 | Mudança de orientação automática | pós-MVP | refatoração ampla do otimizer de candidatos |
| A8 | Divisão em blocos hidráulicos | pós-MVP | apenas fazendas > 50 ha |

### 5. O motor NÃO substitui revisão RT

O motor opera dentro de restrições técnicas e proxies de construtibilidade já formalizados. **Decisões qualitativas** (tolerância da operação a valeta atravessando área irrigada em culturas perenes; aplicabilidade em pivô-central; outras particularidades de campo) permanecem com o **RT humano**:

- A3 (central) vence → motor emite warning obrigatório "principal central atravessa área irrigada — validar construtibilidade operacional/RT".
- Usuário pode override clicando "manual" (`mainPipeline.source = "manual"`) — motor não é invocado em modo manual.
- Premissas técnicas (MAX_VEL_RAMAL, MAX_HEADLOSS_RAMAL, critério de vazão de projeto) registradas em `docs/metodologia/12-premissas-...md` com status `PENDENTE_REVISAO_RT_BRASMAQUINAS` aguardam validação RT antes de calibração futura.

### 6. Integração no orquestrador via `layout-use-cases.ts`

A função `buildSelectedPipelineCoords(...)` em [`src/lib/layout/layout-use-cases.ts`](../../src/lib/layout/layout-use-cases.ts) é a camada entre UI e motor. Ela:

1. Faz fallback para `buildAutoPipelineCoords` (A0 puro) quando `physicalColumns.length === 0` ou `laterais.length === 0`.
2. Caso contrário, chama `selectArchitectureByBom()` e retorna `{ principal, adutora, lengthMeters, architectureSelection }`.

`ProjectMap.tsx` chama `buildSelectedPipelineCoords` em ambos os caminhos automáticos (auto-sugestão no `useEffect` e handler `resetToAutoPipeline`) — alteração mínima (troca de função chamada + propagação de `laterais`).

### 7. Critério L2 — vazão de projeto do ramal — não muda nesta task

O motor usa `sizeAllSecondaries` que calcula vazão de projeto como `max(lateral.vazaoM3h)` da coluna em todos os setores. Este critério é **mantido conservador** nesta task — **não muda para `max(setor_simultâneo)` sem validação RT da operação real Brasmáquinas**. Premissa registrada em `12-premissas-...md` com `PENDENTE_REVISAO_RT_BRASMAQUINAS`.

---

## Alternativas consideradas

### Alternativa A — Escolha binária A2 ou A3 (modelo da TASK-042 original)

**Descrição:** RT escolhe entre A2 (borda otimizada) e A3 (central); software implementa apenas a escolhida.

**Por que foi descartada:** Decisão congela trade-off em código; não escala para projetos com formato/captação diferente; A2 e A3 podem ter desempenho oposto em projetos distintos. A diretriz Brasmáquinas (TASK-042R) é explícita: software escolhe por menor BOM válida por projeto.

### Alternativa B — Regra fixa "sempre central" ou "sempre borda"

**Descrição:** Aplicar uma topologia única globalmente.

**Por que foi descartada:** Mesma justificativa de A — projeto-dependente; perde otimalidade em casos comuns.

### Alternativa C — Otimizador heurístico com pesos (estilo `sprinkler-grid-optimizer.ts`)

**Descrição:** Tratar arquitetura como problema de score com múltiplos pesos (`WEIGHT_BOM`, `WEIGHT_FRAGMENTATION`, etc.) e usar mesma estrutura do motor de candidatos de grade.

**Por que foi descartada:** Para a TASK-043 (MVP), a função objetivo é clara — minimizar BOM estimada preliminar. Pesos heurísticos seriam premissa adicional sem dado calibrado. Motor de seleção arquitetural usa critério **direto** (menor BOM válida); evolução futura pode promover a otimizador heurístico se RT solicitar.

### Alternativa D — Rodar solver hidráulico completo por candidato

**Descrição:** Para cada candidato, executar `calculateIrrigationProject()` completo e usar a BOM real.

**Por que foi descartada:**
- Custo computacional alto (N candidatos × solver completo).
- Solver depende de blockers de PDF — interpretar para escolha pode introduzir loops.
- Validação técnica (velocidade, perda) é suficiente para descartar candidatos hidraulicamente inválidos; precisão de BOM diferencial entre candidatos é suficiente para ordenação.
- Linguagem oficial "BOM estimada preliminar" deixa claro que não é número final.

### Alternativa E — Incluir A1 (principal externa) no MVP

**Descrição:** Adicionar A1 (principal contorna o polígono por fora) como candidato no MVP.

**Por que foi descartada:**
- Requer detecção de "lado externo preferencial" — informação não disponível no modelo atual (cerca, estrada, topografia).
- Adutora pode ficar muito mais longa (cruzando perímetro), introduzindo blockers de pressão.
- Lógica não é simples nem segura para entrar no MVP. Fica pós-MVP (TASK-047 reservada).

### Alternativa F — Substituir `buildAutoPipelineCoords` em vez de criar `buildSelectedPipelineCoords`

**Descrição:** Modificar a função atual diretamente sem criar paralela.

**Por que foi descartada:**
- `buildAutoPipelineCoords` precisa permanecer como fallback no motor (`buildSelectedPipelineCoords` chama-o quando `laterais.length === 0`).
- Separação preserva responsabilidades: uma função "A0 puro" + uma função "seleção arquitetural".
- Permite testes isolados de A0 sem invocar todo o motor.

### Alternativa G — Mudar critério L2 (vazão de projeto) para `max(setor_simultâneo)` aqui mesmo

**Descrição:** Aproveitar a task para reduzir vazão de projeto dos ramais e reduzir BOM mais agressivamente.

**Por que foi descartada:**
- Operação real Brasmáquinas (rotativa vs. simultânea) não confirmada pelo RT.
- Reduzir vazão de projeto sem validação operacional pode subdimensionar ramais em produção.
- Diretriz Brasmáquinas (TASK-042R): "não usar `max(setor_simultâneo)` apenas para baratear BOM sem validação operacional". Premissa registrada com `PENDENTE_REVISAO_RT_BRASMAQUINAS` para revisão futura.

---

## Consequências

### Positivas

- **Caminho feliz default agora otimiza BOM automaticamente** — software escolhe arquitetura por projeto sem intervenção do usuário.
- **A0 preservado como fallback seguro** — comportamento atual é mantido quando A0 ganha; reversível via `source = "manual"`.
- **Diagnóstico completo auditável** — `ArchitectureSelectionResult` expõe BOM de cada candidato, motivos de invalidação, warnings, diferença vs. baseline.
- **Sem mudança de catálogo, aspersor, espaçamento, PDF, mapa (exceto chamada de função).**
- **ADRs 010-014 preservadas** — validado por T43-8 (`detectNetworkAngleIssues`) e por construção (motor não toca laterais).
- **Linguagem oficial estabelecida** — "BOM estimada preliminar" / "BOM diferencial" evita confusão com BOM oficial do projeto.
- **Premissas técnicas formalizadas** — `MAX_VELOCITY_RAMAL_MS`, `MAX_HEADLOSS_RAMAL_MCA`, critério de vazão de projeto agora em `12-premissas-...md` com status.
- **Escalável** — adicionar novos candidatos (A1, A4-A8) é mudança contida em `architecture-selector.ts` sem mexer no orquestrador.

### Negativas / trade-offs

- **BOM estimada preliminar pode divergir do solver real** — diferença pode chegar a ~5% por candidato; aceito porque diferenças entre candidatos são dominadas por custo de tubos (item dominante).
- **A3 (central) vencer pode surpreender operacional** — warning sinaliza; decisão final humana via override "manual".
- **Tempo de execução cresce ~3× vs. baseline** — N=3 candidatos × `sizeAllSecondaries` (rápido); estimado < 100ms total.
- **Critério L2 segue conservador** — possível over-spec persistente até RT validar operação real; mitigado pela premissa formalizada com `PENDENTE_REVISAO_RT_BRASMAQUINAS`.
- **Construtibilidade qualitativa não totalmente coberta** — proxies (cruza área? número de junções?) cobrem o essencial; particularidades de cultura/topografia continuam dependendo de RT.

### Neutras

- **Motor de candidatos de grade** (`sprinkler-grid-optimizer.ts`) não afetado — operam em camadas diferentes.
- **TASK-034 (PDF feedback), TASK-035 (BOM curvas 90°)** seguem separadas.
- **`mainPipeline.source = "manual"`** pula o motor (preserva controle do usuário) — sem mudança no fluxo manual.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|-----------------|
| `src/lib/layout/architecture-selector.ts` | **Novo arquivo.** Tipos públicos (`ArchitectureCandidate`, `CandidateEvaluation`, `ArchitectureSelectionResult`, `ArchitectureSelectorInput`); função pública `selectArchitectureByBom()`; constantes exportadas `MAX_VELOCITY_RAMAL_MS = 1.5` e `MAX_HEADLOSS_RAMAL_MCA = 3.0`. |
| `src/lib/layout/principal.ts` | Adicionados parâmetros opcionais `forceSide?: "min" \| "max"` e `centralMode?: boolean` em `generatePrincipalAndAdutora` via novo tipo `GeneratePrincipalOptions`. Default `undefined` preserva comportamento byte-a-byte. |
| `src/lib/layout/layout-use-cases.ts` | Adicionada função `buildSelectedPipelineCoords()` que delega ao motor. `buildAutoPipelineCoords` mantida (compatibilidade + fallback). |
| `src/components/map/ProjectMap.tsx` | 2 trocas mínimas: `buildAutoPipelineCoords` → `buildSelectedPipelineCoords` em ambos os caminhos automáticos (auto-sugestão e `resetToAutoPipeline`); `laterais` adicionada à dep array. |
| `src/lib/layout/__tests__/architecture-selector.test.ts` | **Novo arquivo.** 11 testes (T43-1 a T43-11) cobrindo seleção, validação, invariantes, A3 warning, constantes. |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | **3 entradas novas:** `MAX_VELOCITY_RAMAL_MS = 1,5 m/s`; `MAX_HEADLOSS_RAMAL_MCA = 3,0 mca`; critério atual de vazão de projeto do ramal. Todas com status `PENDENTE_REVISAO_RT_BRASMAQUINAS`. |
| `src/lib/catalog/aspersores.ts` | **Intocado** (verificado por `git diff`). |
| PDF, mapa, otimizer, aspersor padrão, espaçamento 12×12 | **Intocados.** |

**Saldo de testes:** 768 → **779** (+11 novos em `architecture-selector.test.ts`; 36 arquivos).

---

## Classificação

- decisão arquitetural de domínio (motor automático de seleção)
- governança de geração default (caminho feliz vs. fallback)
- complementar à ADR-014 (split por capacidade) — opera **após** sub-colunas serem geradas
- escalável para outros candidatos (A1-A8) sem refatoração estrutural
- preserva todos os ADRs anteriores (010-014)
- texto e critérios `PENDENTE_REVISAO_RT_BRASMAQUINAS` enquanto premissas técnicas (velocidade ramal, perda ramal, vazão de projeto) aguardam validação RT
- ADR-015 documenta o **mecanismo de escolha**, não topologia específica — qualquer topologia adicional entra como novo candidato

---

## Referências

- TASK-040 — Split por capacidade ([ADR-014](ADR-014-split-automatico-capacidade-hidraulica-lateral.md))
- TASK-041 — Revalidação visual baseline (BOM R$ 277.955,01)
- TASK-042 — Diagnóstico das 9 alternativas
- TASK-042R — Diretriz Brasmáquinas + escopo formal da TASK-043
- TASK-043 — Implementação do motor de seleção (esta ADR)
- [ADR-010](ADR-010-regra-construtibilidade-angular-rede-interna-adutora.md) — Rede interna `[0°, 90°]`
- [ADR-011](ADR-011-aspersor-obrigatoriamente-sobre-lateral-fisica.md) — Aspersor sobre lateral física
- [ADR-012](ADR-012-lateral-fisica-polilinha-construtivel-0-90.md) — Polilinha 0°/90°
- [ADR-013](ADR-013-restricao-dn-homologado-aspersor-subset-filtrado.md) — DN50/DN75 em lateral 5022
- [ADR-014](ADR-014-split-automatico-capacidade-hidraulica-lateral.md) — Split por capacidade
- [`src/lib/layout/architecture-selector.ts`](../../src/lib/layout/architecture-selector.ts)
- [`src/lib/layout/principal.ts`](../../src/lib/layout/principal.ts)
- [`src/lib/layout/layout-use-cases.ts`](../../src/lib/layout/layout-use-cases.ts)
- NRCS National Engineering Handbook (Sprinkler Irrigation) — referência técnica para `MAX_VELOCITY_RAMAL_MS`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | ADR-015 criada formalizando a decisão da TASK-042R e implementada pela TASK-043. Registra: seleção automática por menor BOM estimada preliminar; A0/A2/A3 como candidatos MVP; A1/A4-A8 pós-MVP; restrições duras = hidráulica + ADRs 010-014; linguagem oficial "BOM estimada preliminar"; A0 como fallback seguro; motor não substitui revisão RT (warnings + override manual). 7 alternativas descartadas documentadas. |
