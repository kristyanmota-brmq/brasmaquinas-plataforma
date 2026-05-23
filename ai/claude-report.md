# claude-report — TASK-004B

> Gerado por /handoff-claude-report TASK-004B em 2026-05-22T20:55:25-03:00.
> Plano aprovado pelo usuário ("APROVADO") antes da serialização.

---

## Entendimento

Substituir o cálculo conservador de pressão em ramais e laterais (que hoje usa HMT como teto único) por **pressão real por derivação**, calculando `pressaoOperacionalMaxMca = HMT − (hfAdutora + cumPrincipalHfM até a derivação)` para cada ramal/lateral. Isso transforma `violation_conservative` em `ok` (quando pressão real ≤ PN) ou em `violation_confirmed` (quando pressão real > PN), aumentando precisão do diagnóstico de PN sem alterar catálogo, BOM, PDF, UI/mapa, motor comercial ou premissas RT.

**Classe A — motor hidráulico.** Follow-up direto da pendência registrada na TASK-004 mãe (concluída 2026-05-19): *"pressão real por derivação para ramal/lateral (requer `cumPrincipalHfM` no segmento)"*. ADR-008 (Alternativa C) reservou explicitamente esta implementação para tarefa futura — TASK-004B entrega essa Alternativa C.

**Achado-chave da leitura prévia:** `cumPrincipalHfM` já existe e está computado em `hydraulic-sizing.ts:474` (campo `EnrichedSeg.cumPrincipalHfM`). Está disponível no escopo do loop que constrói `sSecSegs` (linha 488 destrutura `cumPrincipalHfM`) e `sLatSegs`, mas não é propagado para os objetos `HydraulicSegment` criados. A mudança é cirúrgica.

## Arquivos criados

- `tasks/TASK-004B-pressao-real-derivacao.md` — arquivo da task formal seguindo template; contém objetivo, escopo permitido/proibido, contexto (pendência da TASK-004 mãe), arquivos impactados, critérios de aceite, riscos, log.
- `docs/relatorios/2026-05-22-TASK-004B.md` — relatório de fechamento ~250-350 linhas: resumo, mudanças aplicadas (tabela diff), testes adicionados, antes/depois de classificação em Projeto A, invariantes verificadas (7/7), riscos materializados, próximos passos.

## Arquivos modificados

- `src/lib/layout/hydraulic-sizing.ts` — 5 pontos cirúrgicos:
  1. Interface `HydraulicSegment` (linhas 101-126): adicionar `cumPrincipalHfM?: number` e `adutoraHfM?: number` (opcionais, para ramal/lateral).
  2. Interface `HydraulicModelLimitations` (linhas 69-87): `pressureClassModel` muda de literal `"hmt_conservative_inlet"` para união `"hmt_conservative_inlet" | "exact_per_derivation"`.
  3. Função `annotatePressureClass` (linhas 197-229): para `secondary`/`lateral`, se `cumPrincipalHfM != null && adutoraHfM != null`, calcula `pressaoOperacionalMaxMca = hmtMca - adutoraHfM - cumPrincipalHfM` e classifica como `ok`/`violation_confirmed`. Fallback preservado: sem esses dados, comportamento atual `violation_conservative`.
  4. Construção de `sSecSegs` (linhas 517-532) e `sLatSegs` (linhas 542-558): popular os 2 novos campos com `cumPrincipalHfM` (destruturado linha 488) e `adutoraHfM` (em escopo linha 423).
  5. Montagem de `modelLimitations` (linha 822): lógica condicional — se todos os ramais/laterais em `allSegs` têm `cumPrincipalHfM` definido, `pressureClassModel = "exact_per_derivation"`; senão `"hmt_conservative_inlet"`.

- `src/lib/layout/__tests__/pressure-class.test.ts` — adições sem remoção:
  - Helper `makeSeg` (linha 12-29) ganha parâmetros opcionais `cumPrincipalHfM?: number, adutoraHfM?: number`.
  - 6 testes novos T04B-1..T04B-6: (a) lateral com pressão real ≤ PN → ok; (b) lateral com pressão real > PN → violation_confirmed; (c) ramal com pressão real ≤ PN → ok; (d) ramal sem `cumPrincipalHfM` → fallback `violation_conservative`; (e) sequência adutora+principal+ramal+lateral com valores numéricos; (f) `pressureClassModel` detectado corretamente.
  - **15 testes T01..T15 pré-existentes inalterados.**

- `tasks/backlog.md`:
  - Header (linhas 1-4): atualizar para refletir TASK-004B concluída.
  - Após linha 119 (entrada TASK-004 mãe concluída): adicionar entrada nova **TASK-004B** com status `aguardando_fechamento`, classe A, relatório, e blockquote.
  - Linha 118 (pendências da TASK-004 mãe): atualizar para marcar `cumPrincipalHfM` como **resolvido por TASK-004B**; manter pendência irmã `desnível por segmento` como aberta.

- `ai/current-task.md` — ciclo de governança TOOL-003: `em_planejamento` → `aguardando_revisao_gpt` (este comando) → `aprovado_para_implementacao` (decisão humana) → `em_implementacao` → `aguardando_fechamento`.

## Arquivos não alterados

- `src/lib/catalog/aspersores.ts` — catálogo read-only (RB-04)
- `src/lib/bom.ts` — BOM intocada; `generateProposalDiagnostics` já consome `hasPressureClassViolations`/`hasConservativePressureClassWarnings` corretamente
- `src/lib/pdf/PropostaPDF.tsx`, `src/lib/pdf/secondary-rows.ts` — escopo proibido
- `src/components/map/ProjectMap.tsx`, `src/components/map/MemorialPanel.tsx` — UI; escopo proibido (RB-06)
- `src/app/api/projetos/[id]/pdf/route.tsx`, `src/app/projetos/[id]/page.tsx`, `actions.ts` — escopo proibido
- `src/lib/layout/secondary-sizing.ts` — não cuida de PN no segmento (somente seleção de tubo); intocado
- `src/lib/layout/laterais.ts`, `sectorization.ts`, `constructability.ts`, `network-angle-diagnostics.ts`, `sprinkler-grid.ts`, `irrigation-project.ts` — geometria; RB-08
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — premissas inventariadas, não alteradas
- `docs/metodologia/01-regras-bloqueantes.md` — não criar `RB-09`
- `docs/metodologia/03-hidraulica.md` — não atualizar nesta task
- `docs/decisoes/ADR-008-validacao-pn-classe-pressao-tubos.md` — não criar emenda; sem ADR-016
- `tasks/TASK-024-mapa-mestre-tasks.md` — Mapa Mestre não alterado (fonte)
- `ARQUITETURA_ATUAL.md`, `AGENTS.md`, `CLAUDE.md` — nunca alterar
- `scripts/` — sem alteração
- `ai/decision-log.md` — apenas pelo humano (append-only)
- `.claude/commands/*` — fluxo preservado

## Testes obrigatórios

≥ 6 testes novos em `pressure-class.test.ts` (Classe A exige ≥ 5):

1. **T04B-1** — lateral PN40 com `cumPrincipalHfM=10`, `adutoraHfM=5`, `hmtMca=45`: pressão real = 45−5−10 = **30 mca** ≤ 40 ⇒ `ok` (vs antigo `violation_conservative`)
2. **T04B-2** — lateral PN40 com `cumPrincipalHfM=2`, `adutoraHfM=1`, `hmtMca=45`: pressão real = 45−1−2 = **42 mca** > 40 ⇒ `violation_confirmed` (vs antigo `violation_conservative`)
3. **T04B-3** — ramal PN80 com `cumPrincipalHfM=5`, `adutoraHfM=3`, `hmtMca=80`: pressão real = 80−3−5 = **72 mca** ≤ 80 ⇒ `ok`
4. **T04B-4** — ramal sem `cumPrincipalHfM`: fallback ao comportamento atual; `hmtMca=85 > PN=80` ⇒ `violation_conservative` (regressão)
5. **T04B-5** — sequência adutora(PN80, hf=10) → principal(PN80, hf=5) → ramal(PN80, cum=5, adu=10) → lateral(PN40, cum=5, adu=10): verificar `pressaoOperacionalMaxMca` em cada um; lateral PN40 vira `violation_confirmed` (45>40), ramal PN80 vira `ok`
6. **T04B-6** — `pressureClassModel` no resultado: ramais com `cumPrincipalHfM` → `"exact_per_derivation"`; sem → `"hmt_conservative_inlet"`

## Critérios de aceite

- [ ] Arquivo `tasks/TASK-004B-pressao-real-derivacao.md` criado
- [ ] `HydraulicSegment` ganha campos opcionais `cumPrincipalHfM?` e `adutoraHfM?`
- [ ] Construção de `sSecSegs` e `sLatSegs` em `hydraulic-sizing.ts` popula esses campos
- [ ] `annotatePressureClass` calcula pressão real para ramal/lateral quando dados disponíveis; classifica `ok`/`violation_confirmed`/`unknown`
- [ ] Fallback preservado: sem `cumPrincipalHfM` → `violation_conservative` (comportamento atual)
- [ ] `pressureClassModel` aceita 2 valores; detectado automaticamente
- [ ] ≥ 6 testes novos T04B-1..T04B-6 passando
- [ ] 15 testes T01..T15 pré-existentes em `pressure-class.test.ts` continuam passando sem alteração
- [ ] `tasks/backlog.md` atualizado (header + entrada TASK-004B + ajuste pendência TASK-004 mãe)
- [ ] `docs/relatorios/2026-05-22-TASK-004B.md` criado
- [ ] **Mapa Mestre NÃO alterado**
- [ ] **Premissas RT/campo NÃO alteradas**
- [ ] **ADR-008 NÃO alterada** (sem emenda; sem ADR-016)
- [ ] **`01-regras-bloqueantes.md` NÃO alterado** (sem RB-09)
- [ ] **`03-hidraulica.md` NÃO alterado**
- [ ] **Catálogo NÃO alterado**
- [ ] **`src/lib/bom.ts` NÃO alterado**
- [ ] **`src/lib/pdf/*` NÃO alterado**
- [ ] **`src/components/**` NÃO alterado**
- [ ] **`src/app/**` NÃO alterado**
- [ ] **`src/lib/layout/secondary-sizing.ts` NÃO alterado**
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → ≥ 832 passando (826 + 6 novos T04B)
- [ ] `node scripts/ai/__tests__/run-all.mjs` → 27/27 passando
- [ ] HMT do Projeto A permanece 41,3 mca
- [ ] BOM do Projeto A permanece R$ 213.740,15
- [ ] Sem commit, sem push até autorização explícita

## Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|:---:|:---:|---|
| 1 | Reordenação de blocker/warning quebra integration tests existentes | Média | Alto | Auditar `integration.test.ts`, `bom.test.ts`, `pipeline-diagnostics.test.ts` por uso de `hasConservativePressureClassWarnings`. Adaptar expectations apenas onde a classificação correta mudar (não relaxar). |
| 2 | Lateral PN40 + HMT 41 que era `violation_conservative` agora vira `ok` — pode ser percebido como "perda de proteção" | Média | Médio | Documentar no relatório que isso é comportamento correto (eliminação de falso positivo). Blocker `violation_confirmed` ativo nos casos genuínos. |
| 3 | Fórmula sem perdas locais subestima redução de pressão | Baixa | Médio | Fórmula é ligeiramente conservativa (omite redução por perdas locais ~10%), preserva INV-BLOCKERS-TECNICOS. Documentar como limitação para task futura. |
| 4 | Mudança em `pressureClassModel` quebra leitor externo | Baixíssima | Médio | Apenas 2 ocorrências em todo `src/`, ambas em `hydraulic-sizing.ts`. PDF e UI não consomem. União é compatível. |
| 5 | GPT Reviewer pode apontar não-inclusão de desnível por segmento | Média | Baixo | Resposta pronta: escopo explicitamente excluído pelo usuário; task futura separada. |
| 6 | HMT do Projeto A muda inadvertidamente | Baixíssima | Alto | Solver não é tocado. Apenas `annotatePressureClass` (pós-processamento) e propagação de campos opcionais. |

## O que NÃO será feito

- Não implementar **desnível geodético por segmento** (escopo explicitamente excluído pelo usuário; pendência irmã da TASK-004 mãe; task futura separada)
- Não incluir **perdas locais proporcionais** no cálculo de pressão real (fórmula nível médio descartada para V1)
- Não alterar **`MAX_VELOCITY_RAMAL_MS`**, **`MAX_HEADLOSS_RAMAL_MCA`**, **`DEFAULT_SAFETY_MARGIN_MCA`**, **`DEFAULT_LOCAL_LOSS_FACTOR_PERCENT`**
- Não alterar o **solver hidráulico em si** (caminho crítico, HMT, validação de bomba); apenas o pós-processamento `annotatePressureClass`
- Não tocar **`secondary-sizing.ts`**
- Não criar **ADR novo** nem emenda à ADR-008
- Não alterar **metodologia hidráulica** em `docs/metodologia/03-hidraulica.md`
- Não promover o status do épico **E03** no Mapa Mestre (decisão de governança separada)
- Não alterar **PDF** (Memorial Hidráulico pode opcionalmente exibir `pressureClassModel` em task futura — fora deste escopo)
- Não alterar **UI/mapa**
- Não alterar **catálogo** nem **BOM**
- Não criar commit ou push sem autorização explícita
- Não automatizar decisão humana ou edição de `ai/decision-log.md`
- Não instalar dependências npm novas

## Invariantes verificadas

- **INV-CATALOGO-SEM-HOMOLOGACAO** — ok (catálogo intocado)
- **INV-NAO-INVENTAR-SKU** — ok (sem SKU novo)
- **INV-DN100-LATERAL-5022** — ok (ADR-013 preservada)
- **INV-BLOCKERS-TECNICOS** — ok (TASK-004B não relaxa blockers; transforma `violation_conservative` em `ok` quando pressão real ≤ PN (correção de falso positivo) OU em `violation_confirmed` (endurecimento, blocker novo) quando pressão real > PN. Casos sem dados de derivação preservam fallback `violation_conservative`.)
- **INV-MASCARAR-PENDENCIA** — ok (relatório documenta limitação remanescente: perdas locais e desnível por segmento — task futura)
- **INV-DOMINIO-FORA-UI** — ok (apenas `src/lib/layout/hydraulic-sizing.ts` e seus testes; sem UI)
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — ok (não avança comercial; melhora precisão técnica)
