# TASK-055 — Formalizar lógica profissional da arquitetura principal/sub-coletores/laterais

**Status:** `concluída` (aguarda commit/push autorizado pelo humano)
**Prioridade:** P2-importante
**Classe:** C — Documental
**Área:** metodologia / governança
**Criado em:** 2026-05-23
**Concluída em:** 2026-05-23 · 870/870 testes vitest (preservado) · 0 erros tsc (preservado) · 27/27 testes tooling (preservado) · `src/**` intocado
**Predecessor:** TASK-053 v12 (publicada em `origin/main` commit `bd74234`); TASK-042R (diretriz); TASK-043 (motor); ADR-015 (decisão base)

---

## Objetivo

Formalizar no repositório (metodologia + Mapa Mestre) a lógica profissional da arquitetura de rede principal/sub-coletores/laterais homologada pelo RT em 2026-05-23 durante TASK-053 v12. Consolidar a diretriz operacional Brasmáquinas hoje dispersa entre `ai/current-task.md`, memory e ADR-015 numa fonte canônica metodológica (`docs/metodologia/13-...`), com referências cruzadas no Mapa Mestre.

## Natureza

**Classe C — Documental.** Sem alteração de `src/`. Sem ADR nova. Sem alteração de valores em premissas técnicas. Pode escalar para Classe A apenas se houver proposta de alteração em código (não é o caso).

## Diretriz consolidada (12 princípios homologados em 2026-05-23)

1. Não existe regra fixa universal de orientação principal × laterais × sub-coletores.
2. Sequência obrigatória: laterais → sub-coletores → principal.
3. Laterais primeiro: carregam aspersores, retas, repetitivas, eixo respeitado.
4. Sub-coletores tendem (boa prática) a ser perpendiculares às laterais.
5. Principal não tem orientação fixa obrigatória.
6. Principal é posicionada onde gerar menor BOM válida e executável.
7. Restrições duras: pressão, perda, velocidade, DN, setorização, construtibilidade, manutenção, operação, blockers.
8. Função objetivo do motor = minimizar custo total da BOM.
9. Restrições duras do motor = hidráulica + construtibilidade + operação.
10. Candidatos: A0 (baseline), A2 (borda), A3 (central); futuros A1/A4-A8.
11. Vencedor = menor BOM válida; empate prefere A0.
12. Sem alternativa válida = manter baseline OU bloquear com diagnóstico.

Detalhes completos: [docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md](../docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md).

## Escopo permitido (executado)

- `docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md` — documento canônico criado (8 seções)
- `docs/metodologia/00-visao-geral.md` — tabela "Documentos da metodologia" estendida com entradas 09–13 (que existiam mas não estavam catalogadas)
- `tasks/TASK-024-mapa-mestre-tasks.md` — 4 referências cruzadas em E02/E03/E04/E05 (apenas nas seções "Decisões"; sem alterar critérios/métricas/tasks vinculadas)
- `tasks/backlog.md` — header atualizado + entrada TASK-055 + entrada TASK-056 (futura Classe A)
- `tasks/TASK-055-arquitetura-rede-principal-subcoletores-laterais.md` (este arquivo)

## Escopo proibido (respeitado)

- **`src/**`** — não tocado (Classe C documental)
- **`src/lib/catalog/aspersores.ts`** — não tocado (RB-04)
- **`src/lib/pdf/*`** — não tocado
- **`src/components/**`, `src/app/**`** — não tocado (RB-06)
- **`src/lib/layout/irrigation-project.ts`** (orquestrador) — não tocado (ADR-001)
- **`docs/decisoes/ADR-*.md`** — sem ADR nova; ADR-015 apenas referenciada
- **`docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`** — valores e premissas técnicas não alteradas; doc 13 referencia (referência unidirecional 13 → 12)
- **`docs/metodologia/01-regras-bloqueantes.md`** — sem RB nova
- **Demais arquivos em `docs/metodologia/`** — não alterados (exceto 00-visao-geral.md tabela)
- **Blockers ativos** — TECH-053-01 (rib→lateral) preservado ATIVO; emissão comercial bloqueada por default
- **`AGENTS.md`, `CLAUDE.md`, `ARQUITETURA_ATUAL.md`** — nunca alterar

## Critérios de aceite

- [x] `docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md` criado com 8 seções
- [x] 12 princípios fundamentais homologados documentados explicitamente
- [x] Classificação 4-tier (regra técnica / boa prática / decisão de engenharia / decisão comercial) com **≥ 3 itens em cada categoria**
- [x] Restrições duras enumeradas em tabela (11 entradas com tier de classificação)
- [x] Catálogo arquitetural: A0/A2/A3 implementados + A1/A4/A5/A6/A7/A8 reservados
- [x] Referência explícita à ADR-015 (sem duplicar conteúdo)
- [x] Referência explícita ao motor `architecture-selector.ts` (TASK-043)
- [x] Referência explícita à topologia espinha de peixe (TASK-053 v12) como implementação do princípio nº 4
- [x] Referência às premissas em `12-premissas-...md` (MAX_VELOCITY_RAMAL_MS, MAX_HEADLOSS_RAMAL_MCA, critério vazão, topologia v12) — sem alterar valores
- [x] Mapa Mestre E02/E03/E04/E05 citam o doc 13 nas seções **Decisões** (4 cross-refs)
- [x] `00-visao-geral.md` tabela inclui entradas 09–13
- [x] `tasks/backlog.md` header atualizado: TASK-053 publicada em `origin/main` commit `bd74234`
- [x] `tasks/backlog.md` entrada TASK-055 (Classe C, concluída)
- [x] `tasks/backlog.md` entrada TASK-056 (Classe A, pendente — motor comparação A0/A2/A3+ por menor BOM válida)
- [x] **`src/**`, catálogo, PDF, mapa, premissas técnicas (valores), ADRs, blockers ativos NÃO modificados**
- [x] `npx tsc --noEmit` → **0 erros** (preservado — não havia mudança em código)
- [x] `npx vitest run` → **870/870** (preservado)
- [x] `node scripts/ai/__tests__/run-all.mjs` → **27/27** (preservado)

## Respostas às 10 perguntas do briefing original

1. **Onde a diretriz deve ficar documentada?** → `docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md` (criado). Mapa Mestre E02/E03/E04/E05 referenciam o doc 13.
2. **Precisa de ADR?** → Não. ADR-015 já cobre seleção arquitetural por menor BOM válida; doc 13 referencia ADR-015 como base.
3. **Qual épico é mais impactado?** → **E02 Motor de Layout** (sequência + comparação de candidatos). E03/E04/E05 são alimentados/alimentam o motor (restrições duras e função objetivo).
4. **Quais regras atuais do motor já seguem essa diretriz?** → (a) `architecture-selector.ts` (TASK-043) avalia A0/A2/A3 e escolhe menor BOM válida; (b) `routeEspinhaDePeixe` (TASK-053 v12) implementa sub-coletor perpendicular às laterais; (c) gate angular 0°/90° (ADR-010); (d) aspersor sobre lateral (ADR-011/012); (e) DN homologado (ADR-013); (f) split por capacidade (ADR-014); (g) sequência laterais → sub-coletores → principal materializada no orquestrador `irrigation-project.ts`.
5. **Quais regras atuais ainda não seguem?** → Candidatos A1/A4–A8 não implementados; pesos do optimizer pendentes calibração RT; pressão real por derivação não exibida no PDF.
6. **TASK-043 já cobre parte disso?** → Sim — TASK-043 implementou A0/A2/A3 e o motor `selectArchitectureByBom()`. Doc 13 documenta o framework metodológico que motivou TASK-043.
7. **Quais lacunas ainda existem?** → A1/A4–A8 candidatos; validação visual v12 no Projeto A; BOM ajustada para topologia "sempre sub-coletor" (TASK-054); blocker TECH-053-01 (TASK-053-valves); calibração RT pesos.
8. **Qual futura task de código seria necessária?** → **TASK-056** (Classe A) — Motor de comparação de arquiteturas A0/A2/A3+ expandido para A1 e família pós-MVP (A4–A8). Registrada como pendente no backlog.
9. **Quais riscos técnicos?** → (1) doc 13 divergir de ADR-015 se evoluírem separadamente — mitigado por referência cruzada; (2) Mapa Mestre não citar doc 13 — mitigado por 4 cross-refs em E02/E03/E04/E05; (3) confundir tier "regra técnica" com "boa prática" — mitigado pela classificação explícita e exemplos por categoria.
10. **O que NÃO será feito agora?** → Nenhuma mudança em `src/`; nenhuma ADR nova; nenhuma alteração de valores em premissas; nenhum relaxamento de blockers; nenhuma implementação de A1/A4–A8 (fica para TASK-056); TECH-053-01 preservado ATIVO.

## Pendências abertas (sucessores)

- **TASK-056 (Classe A futura)** — Motor de comparação de arquiteturas A0/A2/A3+ por menor BOM válida e operacionalmente executável. Expandir `architecture-selector.ts` para incluir A1 (principal externa) e família pós-MVP (A4 espinha, A5 subprincipais, A6 cabeçal único, A7 orientação automática, A8 blocos). Inclui validação visual no Projeto A.
- **TASK-054 (Classe A)** — Ajustar BOM para topologia "sempre sub-coletor" (sucessora de TASK-053).
- **TASK-053-valves** — Relocar `section_valve` para `spine_entry` (mitiga TECH-053-01).
- **Calibração RT dos pesos de `OPTIMIZER_PARAMS`** — dentro do épico E09 (validação de campo).

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-23 | Claude Opus 4.7 | `/iniciar-task` da TASK-055. Detectado que diretriz já estava parcialmente documentada (ADR-015, TASK-042R, ai/current-task.md, memory). Confirmadas 3 decisões com usuário: ID TASK-055; doc novo `13-...`; sem ADR nova. |
| 2026-05-23 | Claude Opus 4.7 | `/planejar` da TASK-055. Plano aprovado com 9 ajustes obrigatórios reforçando classe documental, distinção 4-tier, referência (não duplicação) de ADR-015/TASK-042R/TASK-053. |
| 2026-05-23 | Claude Opus 4.7 | `/implementar` da TASK-055. **Criados:** `docs/metodologia/13-arquitetura-de-rede-principal-subcoletores-laterais.md` (8 seções), este arquivo. **Modificados:** `tasks/TASK-024-mapa-mestre-tasks.md` (4 cross-refs E02/E03/E04/E05), `docs/metodologia/00-visao-geral.md` (tabela 09–13), `tasks/backlog.md` (header + entradas TASK-055 e TASK-056). **Validações:** `npx tsc --noEmit` → 0 erros (preservado); `npx vitest run` → 870/870 (preservado); `git diff -- src/` → vazio. Nenhuma ADR criada. Nenhum valor de premissa alterado. Blocker TECH-053-01 preservado ATIVO. |
