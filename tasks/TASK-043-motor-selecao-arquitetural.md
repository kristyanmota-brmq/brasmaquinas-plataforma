# TASK-043 — Motor de seleção arquitetural da principal/ramais por menor BOM válida e operacionalmente executável

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — Crítica
**Área:** layout / domínio / hidráulica / comercial
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 779/779 testes (+11 vs. 768 baseline) · 0 erros tsc · catálogo intocado
**Escopo formal:** [`docs/relatorios/2026-05-21-TASK-042R.md`](../docs/relatorios/2026-05-21-TASK-042R.md) §7
**ADR:** [`docs/decisoes/ADR-015-selecao-arquitetural-menor-bom-valida.md`](../docs/decisoes/ADR-015-selecao-arquitetural-menor-bom-valida.md)
**Dependências:** TASK-040 (split por capacidade); TASK-042 (diagnóstico); TASK-042R (diretriz)

---

## Objetivo

> Implementar motor automático de seleção arquitetural da principal/ramais. Compara candidatos A0/A2/A3 (com A1/A4-A8 reservados pós-MVP), avalia BOM estimada preliminar de cada um, valida restrições hidráulicas + construtibilidade + ADRs 010-014, e escolhe o de menor BOM válida. Em empate, prefere A0. A BOM oficial continua sendo gerada por `buildBOM()` após a arquitetura vencedora ser aplicada.

---

## Contexto

A TASK-041 mediu BOM total R$ 277.955,01 no Projeto A pós-TASK-040, com Ø100mm rígido em ramais dominando 32% do custo. A TASK-042 diagnosticou 3 alavancas ortogonais (L1 posição da principal, L2 vazão de projeto, L3 limite de velocidade) e 9 alternativas. A TASK-042R formalizou a diretriz Brasmáquinas: software seleciona arquitetura automaticamente por menor BOM válida e executável.

Esta TASK-043 implementa o motor (ADR-015).

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `src/lib/layout/architecture-selector.ts` | **criação** | Motor: tipos públicos + `selectArchitectureByBom()` + constantes (`MAX_VELOCITY_RAMAL_MS=1,5`; `MAX_HEADLOSS_RAMAL_MCA=3,0`) |
| `src/lib/layout/principal.ts` | modificação cirúrgica | Parâmetros opcionais `forceSide` e `centralMode` em `generatePrincipalAndAdutora` via `GeneratePrincipalOptions`; default preserva comportamento |
| `src/lib/layout/layout-use-cases.ts` | adição | Função `buildSelectedPipelineCoords()` que delega ao motor; `buildAutoPipelineCoords` preservada (fallback) |
| `src/components/map/ProjectMap.tsx` | troca mínima | 2 trocas `buildAutoPipelineCoords` → `buildSelectedPipelineCoords` (auto-sugestão + `resetToAutoPipeline`); `laterais` na dep array |
| `src/lib/layout/__tests__/architecture-selector.test.ts` | **criação** | 11 testes (T43-1 a T43-11) |
| `docs/decisoes/ADR-015-selecao-arquitetural-menor-bom-valida.md` | **criação** | ADR formal |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | 3 entradas novas | `MAX_VELOCITY_RAMAL_MS`, `MAX_HEADLOSS_RAMAL_MCA`, critério de vazão de projeto — todas `PENDENTE_REVISAO_RT_BRASMAQUINAS` |
| `tasks/backlog.md` | atualização | Status TASK-043 → concluída + resumo |
| `src/lib/catalog/aspersores.ts` | **intocado** | Read-only (verificado por `git diff` vazio) |
| PDF, otimizer de grade, mapa (exceto troca de função), aspersor padrão, espaçamento 12×12 | **intocados** | Regras explícitas |

---

## Critérios de aceite — todos atendidos

- [x] `src/lib/layout/architecture-selector.ts` criado com tipos públicos e `selectArchitectureByBom()`
- [x] `principal.ts` aceita `forceSide` e `centralMode` opcionais; default preserva comportamento (validado por T43-1)
- [x] `layout-use-cases.ts` ganha `buildSelectedPipelineCoords()`
- [x] `ProjectMap.tsx` chama `buildSelectedPipelineCoords` em ambos os caminhos automáticos (linhas 301 e 555); alteração mínima (troca + propagação de `laterais`)
- [x] 3 premissas novas em `docs/metodologia/12-premissas-...md` com `PENDENTE_REVISAO_RT_BRASMAQUINAS` (sem alterar valores)
- [x] **ADR-015** criada em `docs/decisoes/`
- [x] 11 testes novos em `architecture-selector.test.ts` (T43-1 a T43-11), todos passando
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → **779/779** (768 + 11), sem regressão
- [x] Catálogo `aspersores.ts` intocado
- [x] PDF intocado
- [x] Mapa modificado **apenas** pela troca da função chamada
- [x] ADRs 010-014 preservadas (T43-8 valida `detectNetworkAngleIssues`)
- [x] DN100 não aparece em lateral 5022 (motor não toca laterais — ADR-013 invariante)
- [x] Quando A0 vence → `decision="baseline_preserved"` com `reason` citando A0/A2/A3 e `bomDeltaVsBaseline=0` (T43-7)
- [x] Quando A2/A3 vence → `decision="winner_reduces_bom"` com economia diferencial explícita
- [x] A3 vencedor → warning obrigatório "principal central atravessa área irrigada — validar construtibilidade operacional/RT" (T43-10)

---

## Testes obrigatórios (11 — excede mínimo de 10)

| ID | Cobertura |
|----|-----------|
| T43-1 | A0 do motor coincide (tolerância geométrica) com `generatePrincipalAndAdutora` sem options |
| T43-2 | A2 avalia ambos os lados (min/max) quando captação está dentro da faixa Y |
| T43-3 | A3 central usa `principalY = (yMin + yMax)/2` (validado pela coordenada Y de cada ponto da principal) |
| T43-4 | `bomEstimadaPreliminar = bomPrincipal + bomAdutora + bomSecondaries` para todos os candidatos |
| T43-5 | Candidato com Q extrema (>200 m³/h) é marcado `isValid=false` com `invalidReason` populado |
| T43-6 | Vencedor é o de menor BOM válida; empate (< R$ 1,00) prefere A0 |
| T43-7 | A0 vencedor → `decision="baseline_preserved"`; `reason` cita A0/A2/A3; `bomDeltaVsBaseline=0` |
| T43-8 | Invariantes ADR-010 preservadas (rede 0°/90° via `detectNetworkAngleIssues`) no candidato vencedor |
| T43-9 | Cenário Projeto A-like (16 colunas × 25 aspersores, Q=24 m³/h): motor retorna decision válida e auditoria completa com A0/A2/A3 |
| T43-10 | A3 sempre tem warning de cruzamento; A0/A2 não têm |
| T43-11 | Constantes exportadas `MAX_VELOCITY_RAMAL_MS=1.5` e `MAX_HEADLOSS_RAMAL_MCA=3.0` |

---

## Fora do escopo

- Implementar A1 (principal externa) — pós-MVP (TASK-047 reservada)
- Implementar A4/A5/A6/A7/A8 — pós-MVP
- Alterar critério L2 (vazão de projeto do ramal) — apenas formalizar premissa
- Calibrar L3 (`MAX_VEL_RAMAL`) — apenas formalizar premissa
- Alterar catálogo, aspersor padrão (5022-SD), espaçamento (12×12)
- Alterar PDF
- Rodar solver hidráulico completo por candidato (usar BOM estimada preliminar)
- Modificar `OPTIMIZER_PARAMS`
- Expor diagnóstico do motor na sidebar (task futura B)
- Tocar TASK-034, TASK-035, TASK-029, TASK-030

---

## Riscos e mitigações aplicadas

| Risco previsto | Mitigação aplicada |
|----------------|--------------------|
| Mudança em `principal.ts` quebrar testes existentes | Default `undefined` preserva comportamento; suite 779/779 (sem regressão) confirma |
| BOM estimada divergir do solver real | Linguagem "BOM estimada preliminar" / "diferencial" usada consistentemente; ADR-015 explícita |
| A3 introduzir blocker angular | T43-8 valida via `detectNetworkAngleIssues` (`hasBlockers=false`) |
| Mudança em `ProjectMap.tsx` violar regra | Apenas troca de função + propagação `laterais` (mudança mínima cirúrgica) |
| Catálogo modificado por engano | `git diff src/lib/catalog/aspersores.ts` vazio |
| Critério L2 mudar sem RT | Mantido `max(setor)` atual; apenas formalizado em premissas |
| A3 vencer surpreender operacional | Warning obrigatório (T43-10) + override via `source="manual"` |
| T43-9 falhar (motor não reduz BOM no Projeto A-like) | Critério aceita `baseline_preserved`; ambos desfechos válidos |

---

## Pendências abertas (reservadas para tasks futuras)

- **TASK-044** — Revalidação visual pós-TASK-043 no Projeto A real (Playwright MCP)
- **TASK-045** — Confirmar com RT critério de vazão de projeto (`max(setor)` vs. `max(setor_simultâneo)`); se RT liberar, motor pode rodar mais agressivo
- **TASK-046** — Calibração de `MAX_VELOCITY_RAMAL_MS` se RT trouxer NBR brasileira específica ou dados de campo
- **TASK-047** — Implementar A1 (principal externa) como candidato adicional, com detecção de "lado externo preferencial"
- **TASK pós-MVP** — A4 (espinha), A5 (subprincipais), A6 (alimentação central), A7 (orientação automática), A8 (blocos)
- **Task B futura** — Expor diagnóstico do motor (`ArchitectureSelectionResult`) na sidebar para auditoria do usuário

---

## Plano de implementação (executado)

1. ✅ Pesquisar usos de `buildAutoPipelineCoords` (Ajuste 3) — encontrados 2 (linhas 301 e 555 de `ProjectMap.tsx`)
2. ✅ Modificar `principal.ts` (parâmetros opcionais `forceSide`/`centralMode`)
3. ✅ Criar `architecture-selector.ts` (tipos + motor)
4. ✅ Adicionar `buildSelectedPipelineCoords` em `layout-use-cases.ts`
5. ✅ Modificar `ProjectMap.tsx` (2 trocas + dep)
6. ✅ Criar 11 testes em `architecture-selector.test.ts`
7. ✅ Criar ADR-015
8. ✅ Formalizar 3 premissas em `12-premissas-...md`
9. ✅ Criar este arquivo formal
10. ✅ Atualizar backlog
11. ✅ Validações finais (tsc 0, vitest 779/779, git diff catálogo vazio)

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | `/iniciar-task` da TASK-043. Verificado: TASK-042R concluída; baseline TASK-041 (R$ 277.955,01); ADRs 010-014 ativas; 5 premissas existentes preservadas. |
| 2026-05-21 | Claude Opus 4.7 | `/planejar` da TASK-043. Plano com 11 respostas (Q1-Q11); estrutura `architecture-selector.ts`; lista de arquivos; 10 testes obrigatórios; decisão sobre A1 (pós-MVP). Aprovado com 11 ajustes obrigatórios. |
| 2026-05-21 | Claude Opus 4.7 | `/implementar` da TASK-043. **Criados:** `architecture-selector.ts` (motor com 4 candidatos avaliados — A0, A2-min, A2-max, A3; vencedor escolhido por menor BOM válida; empate prefere A0), `architecture-selector.test.ts` (11 testes), `ADR-015`, este arquivo. **Modificados:** `principal.ts` (parâmetros opcionais `forceSide`/`centralMode`), `layout-use-cases.ts` (`buildSelectedPipelineCoords` + fallback para A0 quando `laterais.length === 0`), `ProjectMap.tsx` (2 trocas mínimas + `laterais` na dep array), `12-premissas-...md` (3 entradas novas). **768 → 779 testes** (+11 novos). **`npx tsc --noEmit`** → 0 erros. **`git diff src/lib/catalog/aspersores.ts`** → vazio. ADRs 010-014 preservadas (T43-8). DN100 não em lateral 5022. PDF intocado. Linguagem oficial "BOM estimada preliminar" / "diferencial" em todo o motor e ADR-015. |
