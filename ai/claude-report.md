# claude-report — TASK-053 (v12 — delta sobre v11: fieldSideSign via centroid + gate explícito)

> Gerado por /handoff TASK-053 em 2026-05-23T12:04:00-03:00 (timestamp do plano v12).
> Plano v12 (correção pontual de v11 endereçando 2 blockers triviais do GPT v11: TECH-053-V11-01 — Math.sign(0)===0 colapsa fallback; TECH-053-V11-02 — gate de espinha ambíguo) aprovado pelo usuário via invocação explícita /handoff após /planejar v12. Resto do plano v11 (topologia "sempre sub-coletor", spineYLocal midpoint formula, MIN_HEADLAND_M=3m, section_valve relocation deferida para TASK-053-valves) PRESERVADO sem alterações.
>
> Histórico de versões:
>   - v1 reprovado (2026-05-22T22:49:53) — espigão 180° inválido
>   - v2 reprovado TERMINAL (2026-05-22T23:26:56) — INV-LAYOUT-INSTAVEL-COMERCIAL violada
>   - v3 aprovado_com_ajustes (2026-05-22T23:50:43) — stair-step falhou visualmente
>   - v4 reprovado (2026-05-23T00:42:06) — "T deitado" ambíguo
>   - v5 reprovado (2026-05-23T01:02:00) — paths kind-aware omissos
>   - v6 aprovado + REPROVADO VISUAL (2026-05-23T01:35:00) — degenerescência Projeto A
>   - v7 aprovado + REPROVADO ARQUITETURAL (2026-05-23T11:20:00) — topologia inversa
>   - v8 reprovado (2026-05-23T11:35:00) — heurística X-vs-Y inverte topologia
>   - v9 aprovado_com_ajustes Caminho 3 (2026-05-23T11:45:00) — diagnóstico-only
>   - v10 reprovado (2026-05-23T11:55:00) — cohorts com mediana=0 dispara fallback indesejado
>   - v11 reprovado (2026-05-23T12:02:00) — Math.sign(0)===0 colapsa fallback + gate ambíguo. Hash: 3f59ed67ec28cdb014575b4cfaf0db2fbfd61665cb4057247f2e1f4b208e9fed
>   - **v12 (corrente)**: DELTA mínima sobre v11 — (1) `fieldSideSign` derivado de centroid LngLat→rotated frame (independente do range dos inlets, garante sign ≠ 0); (2) gate explícito `if (operationalSegments && !gridAngleDegrees) throw`. Resto de v11 preservado integralmente.

---

## Entendimento

Correção pontual de v11 endereçando os 2 blockers triviais do GPT v11: (1) TECH-053-V11-01: `Math.sign(0) === 0` colapsa o fallback MIN_HEADLAND_M quando todos inlets coincidem com principal; substituir derivação de `fieldSideSign` por fonte INDEPENDENTE do range dos inlets (via `centroid` LngLat → rotated frame, com fallback hardcode +1); (2) TECH-053-V11-02: ambiguidade do gate de espinha; especificar comportamento EXPLÍCITO (`throw`) quando `operationalSegments` presente mas `gridAngleDegrees` ausente. Resto do plano v11 (topologia sempre sub-coletor, spineYLocal midpoint formula, MIN_HEADLAND_M=3m, defer section_valve para TASK-053-valves) PRESERVADO sem alterações.

**Princípio arquitetural v12 (idêntico a v11):**
- TODA lateral conecta via rib → spine → spine_entry → principal (regra absoluta RT).
- Sem fallback `kind: undefined` quando `operationalSegments` é fornecido (legacy só sem `operationalSegments`).
- Espinha SEMPRE perpendicular aos laterais (eixo X do frame rotacionado por `gridAngleDegrees`).
- Spine Y = `(principalYLocal + farthestInletYLocal) / 2`, com fallback offset mínimo `MIN_HEADLAND_M = 3.0 m` se degenerado.
- Ribs podem ter `lengthM = 0` em casos de borda (tê direto na spine — topologicamente válido).

**Delta v12 sobre v11:**
- `fieldSideSign` deriva de `centroid` (independente do range dos inlets).
- Gate explícito `throw` quando `operationalSegments` sem `gridAngleDegrees`.

**Classe A — motor de layout / construtibilidade.** Escopo restrito a `src/lib/layout/hydraulic-connectivity.ts` + 1 teste + 2 docs. **SEM BOM** (RB-05 + INV-LAYOUT-INSTAVEL-COMERCIAL). **SEM ADR-016** (TASK-054). **SEM ADR-017** (decisão v8 mantida). **SEM tocar `network-angle-diagnostics.ts`** (regra `[0°, 90°]` mantida). **SEM tocar `constructability.ts`** (section_valve relocation deferida).

## Arquivos criados

Nenhum.

## Arquivos modificados

### Núcleo de produção (1 arquivo)

- **`src/lib/layout/hydraulic-connectivity.ts`** — modificações idênticas a v11 + 2 fixes pontuais:

  **Fix TECH-053-V11-01** (substitui o cálculo de `fieldSideSign` em `routeEspinhaDePeixe`):
  ```typescript
  // ANTES (v11 — buggy quando todos inlets coincidem com principal):
  // const fieldSideSign = Math.sign((yMinInlets + yMaxInlets) / 2 - principalYLocal);
  
  // AGORA (v12 — independente do range dos inlets):
  const centroidLocal = toLocal([centroid.lng, centroid.lat]);
  // Garantia construtiva TASK-046: campo está SEMPRE do lado interior da principal
  // → centroidLocal[1] ≠ principalYLocal em projetos válidos
  let fieldSideSign = Math.sign(centroidLocal[1] - principalYLocal);
  
  // Safety: se ainda zero (caso degenerado extremo onde centroid coincide com principal,
  // que viola garantia TASK-046), hardcode +1
  if (fieldSideSign === 0) fieldSideSign = 1;
  ```

  **Fix TECH-053-V11-02** (gate explícito em `generateSecondaries`):
  ```typescript
  // ANTES (v11 — ambíguo): condicional combinada operationalSegments + gridAngleDegrees
  // 
  // AGORA (v12 — gate explícito):
  if (options?.operationalSegments && options.operationalSegments.length > 0) {
    // Regra absoluta v11: operationalSegments ⇒ sempre espinha
    if (options.gridAngleDegrees == null) {
      throw new Error(
        "generateSecondaries: operationalSegments fornecido sem gridAngleDegrees — " +
        "regra arquitetural v11/v12 (TASK-053) exige espinha de peixe (sempre sub-coletor), " +
        "que requer gridAngleDegrees. Forneça gridAngleDegrees ou remova operationalSegments."
      );
    }
    // ... resto do fluxo espinha (idêntico a v11)
  } else {
    // Sem operationalSegments → caminho legacy 1:1 (kind: undefined)
    // ... fluxo legacy retrocompatível inalterado
  }
  ```

  **Resto do refactor de v11 PRESERVADO integralmente:**
  - `routeEspinhaDePeixe` no frame rotacionado por `gridAngleDegrees`
  - spineYLocal via midpoint formula `(principalYLocal + farthestInletY) / 2`
  - fallback `MIN_HEADLAND_M = 3.0m` quando `|spineYLocal - principalYLocal| < MIN_HEADLAND_M`
  - `cols.length === 1` → espinha degenerada topologicamente válida
  - probe deslocado 1000m para evitar colisão com principal
  - todos os demais detalhes técnicos

### Testes (1 arquivo)

- **`src/lib/layout/__tests__/subcoletor-por-setor.test.ts`** — testes de v11 PRESERVADOS + 2 novos:

  **Todos os testes T53-18..T53-28 de v11 PRESERVADOS** (com pequeno ajuste em T53-24 confirmando comportamento correto pós-fix V11-01)

  **Novos testes v12:**
  - **T53-29 (v12 NOVO — endereça TECH-053-V11-01)** — Caso patológico extremo "todos inlets coincidentes com principal":
    - Setor com 3 colunas, TODAS com inlets em Y = principalY (gap = 0 em todos)
    - Após `fieldSideSign` via centroid (não via inlet range), `fieldSideSign = +1` ou `-1` (nunca 0)
    - `spineYLocal = principalY + 1 * MIN_HEADLAND_M = principalY + 3m`
    - Spine NÃO coincide com principal; ribs todos com `lengthM = 3m`
    - Topologia uniforme preservada mesmo no extremo geometricamente patológico
  - **T53-30 (v12 NOVO — endereça TECH-053-V11-02)** — Gate explícito:
    - `generateSecondaries([cols], principal, centroid, 0.5, { operationalSegments: [...] })` SEM `gridAngleDegrees`
    - Espera: `throw new Error` com mensagem clara mencionando `operationalSegments` e `gridAngleDegrees`
    - Asserção: `expect(() => generateSecondaries(...)).toThrow(/operationalSegments.*gridAngleDegrees|gridAngleDegrees.*operationalSegments/)`

  Total esperado: 887 − 10 (T53-15..17 v7 removidos) + 7 (T53-22 reforçado + T53-23..T53-28 de v11) + 2 (T53-29, T53-30 v12) = **886**

### Documentação (2 arquivos)

- **`docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`** — atualizar premissa "Topologia de ramais" refletindo v12: nota técnica que `fieldSideSign` deriva do centroid (não do range dos inlets); gate explícito para `operationalSegments` sem `gridAngleDegrees` lança erro programático; resto da premissa idêntico ao v11 (sempre sub-coletor, midpoint formula, MIN_HEADLAND_M=3m).
- **`ai/current-task.md`** — body para v12.

## Arquivos não alterados

- `src/lib/layout/network-angle-diagnostics.ts` — **regra `[0°, 90°]` intacta**; kind-aware branching v6 preservado
- `src/lib/layout/secondary-sizing.ts` — 3 paths kind-aware v6 corretos
- `src/lib/layout/irrigation-project.ts` — call site v6 já passa `gridAngleDegrees`
- `src/lib/layout/map-consistency.ts` — já correto
- **`src/lib/layout/constructability.ts`** — `generateControlPoints` INALTERADA; `section_valve` continua intra-lateral (ADR-014). Relocation para `spine_entry` DEFERIDA para TASK-053-valves sucessora
- `src/lib/bom.ts` — RB-05 / INV-LAYOUT-INSTAVEL-COMERCIAL (TASK-054)
- `docs/decisoes/ADR-016`, `docs/decisoes/ADR-017` — NÃO criados (decisão v8 mantida)
- `src/components/`, `src/app/` — INV-DOMINIO-FORA-UI
- `src/lib/catalog/*` — INV-CATALOGO-SEM-HOMOLOGACAO
- `src/lib/hydraulics/*` — fora do escopo
- `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md` — nunca alterar
- `docs/metodologia/01-regras-bloqueantes.md` — nunca alterar
- `.claude/settings.local.json` — nunca alterar
- `ai/decision-log.md` — append-only / human-only
- `scripts/ai/**`, `scripts/diagnose/diagnose-espinha-projeto-a.mjs` — preservados

## Testes obrigatórios

11 testes (T53-22 reforçado + T53-23..T53-30, com T53-15..T53-17 v7 removidos).

1. **T53-18** — Grid cardinal: spine ⊥ laterais
2. **T53-19** — Grid 59°: spine paralelo ao eixo X rotacionado
3. **T53-20** — Rib→lateral em 0° (luva)
4. **T53-22 (reforçado)** — Inlets mistos: ribs > 0.5m + perpendicularidade
5. **T53-23** — Setor 0 Projeto A: 7 SecondaryPipes (espinha uniforme), nenhum rib zero
6. **T53-24** — Todos rentes (gap=0): fallback MIN_HEADLAND_M dispara CORRETAMENTE (após fix v12)
7. **T53-25** — Todos afastados: formula natural sem fallback
8. **T53-26** — 1 coluna isolada: espinha degenerada topologicamente válida
9. **T53-27** — Retrocompatibilidade legacy (sem operationalSegments)
10. **T53-28** — Blocker angular esperado em spine_entry→principal
11. **T53-29 (v12)** — Patológico extremo todos-na-principal: fieldSideSign via centroid não colapsa em 0
12. **T53-30 (v12)** — Gate explícito: operationalSegments sem gridAngleDegrees lança erro

## Critérios de aceite

- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → ≥886/886 passando
- [ ] T53-23 confirma espinha uniforme no setor 0 Projeto A
- [ ] **T53-24 confirma fallback CORRETO** (após fix V11-01): `spineYLocal = principalY + 3m`, NÃO `spineYLocal = principalY`
- [ ] **T53-29 confirma `fieldSideSign` não colapsa em zero** em caso patológico extremo
- [ ] **T53-30 confirma gate explícito**: error lançado quando operationalSegments sem gridAngleDegrees
- [ ] Diagnóstico (`scripts/diagnose/diagnose-espinha-projeto-a.mjs`) re-rodado contra Projeto A: 0 ribs com `lengthM = 0` em qualquer setor
- [ ] Validação visual em Projeto A via Playwright: TODAS laterais via sub-coletor; NENHUMA conexão direta lateral→principal
- [ ] `node scripts/ai/__tests__/run-all.mjs` → 27/27
- [ ] `node scripts/ai/validate-structure.mjs --task TASK-053` → OK
- [ ] Nenhum arquivo em `src/components/`, `src/app/`, `src/lib/bom.ts`, `src/lib/catalog/`, `constructability.ts`, `network-angle-diagnostics.ts`, `secondary-sizing.ts`, `docs/decisoes/ADR-016`, `docs/decisoes/ADR-017` modificado/criado
- [ ] Nenhuma mudança em `ALLOWED_DEFLECTIONS_INTERNAL` (continua `[0°, 90°]`)
- [ ] Nenhum termo "warning" para se referir a blockers angulares

## Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | Probe deslocado 1000m fora do range de principalCoords | Baixa | Médio | `projectOnPolyline` clamps `t` em `[0,1]` |
| R2 | `fieldSideSign` via centroid coincide com principalYLocal (centroid LngLat → rotated y == principalY) | Muito Baixa | Baixo | Fallback hardcode `+1`; garantia construtiva TASK-046 (campo SEMPRE de um lado da principal) |
| R3 | MIN_HEADLAND_M = 3m arbitrário | Média | Baixo | Constante ajustável; T53-24/T53-29 documentam |
| R4 | T53-27 (retrocompatibilidade) quebra testes legados | Média | Alto | Apenas remove `kind: undefined` no fluxo com operationalSegments; fluxo SEM operationalSegments inalterado |
| R5 | Junção spine_entry→principal em ângulo não-construtível | Alta | Baixo | DOCUMENTADO em T53-28; geométrico esperado; override manual via decision-log |
| R6 (NOVO v12) | Gate `throw` em vez de fallback pode quebrar chamadores externos que passam `operationalSegments` sem `gridAngleDegrees` | Baixa | Médio | `irrigation-project.ts` (único call site de produção) já passa AMBOS desde v6; testes legados passam SEM `operationalSegments` e não são afetados; gate explícito é PREFERÍVEL a fallback silencioso. Mensagem do erro orienta o usuário |
| R7 | GPT v12 critica algum aspecto novo | Baixa | Baixo | Override permitido_derivado é null/true (sem invariante violada); plano endereça os 2 blockers v11 com correções mínimas |

## O que NÃO será feito

- Não alterar `src/lib/bom.ts` (RB-05 / INV-LAYOUT-INSTAVEL-COMERCIAL — TASK-054)
- Não criar `docs/decisoes/ADR-016` (TASK-054) nem `docs/decisoes/ADR-017` (decisão v8 mantida)
- Não tocar `constructability.ts`, `secondary-sizing.ts`, `network-angle-diagnostics.ts`, `irrigation-project.ts`, `map-consistency.ts`
- **Não usar abordagem de cohorts** — invalidada pela regra RT "sempre sub-coletor"
- **Não relocar `section_valve` para `spine_entry`** — DEFERIDO para TASK-053-valves sucessora
- **Não modificar `generateControlPoints`** — section_valve intra-lateral (ADR-014) permanece inalterado
- **Não usar heurística X-vs-Y axis** — spine SEMPRE perpendicular aos laterais
- **Não usar termo "warning" para blockers angulares** — blockers são blockers
- Não automatizar override de blockers
- Não otimizar bundle, performance, ou logging

## Invariantes verificadas

| # | Invariante | Status | Justificativa |
|---|-----------|--------|---------------|
| 1 | **INV-CATALOGO-SEM-HOMOLOGACAO** | ✓ ok | Catálogo não tocado; nenhum SKU novo |
| 2 | **INV-NAO-INVENTAR-SKU** | ✓ ok | Nenhum SKU criado/renomeado |
| 3 | **INV-DN100-LATERAL-5022** | ✓ ok | Laterais e regras DN não alteradas; ADR-013 preservado |
| 4 | **INV-BLOCKERS-TECNICOS** | ✓ ok | Regra `ALLOWED_DEFLECTIONS_INTERNAL = [0°, 90°]` mantida estrita; nenhuma flexibilização |
| 5 | **INV-MASCARAR-PENDENCIA** | ✓ ok | Bug matemático V11-01 explicitamente identificado pelo GPT e corrigido (não escondido). Gate ambíguo V11-02 substituído por `throw` explícito. Section_valve relocation EXPLICITAMENTE deferida. Blockers angulares em spine_entry→principal documentados via T53-28 |
| 6 | **INV-DOMINIO-FORA-UI** | ✓ ok | Escopo restrito a `src/lib/layout/hydraulic-connectivity.ts` + testes + docs |
| 7 | **INV-LAYOUT-INSTAVEL-COMERCIAL** | ✓ ok | `src/lib/bom.ts` não tocado; comercial congelado; layout em 12ª iteração |
