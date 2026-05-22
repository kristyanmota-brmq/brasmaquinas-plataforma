# claude-report — TASK-001

> Gerado por /handoff-claude-report TASK-001 em 2026-05-22T19:56:21-03:00.
> Plano aprovado com ajustes pelo usuário antes da serialização.

---

## Entendimento

Produzir diagnóstico formal do estado atual do software de aspersão convencional, em forma de relatório único em `docs/relatorios/2026-05-22-TASK-001.md`, reconciliando o arquivo original da TASK-001 (criado 2026-05-19, `pendente`) com o estado real do repositório em 2026-05-22 (826 testes; 0 erros tsc; 27/27 tooling tests; 15 ADRs; 9 épicos do Mapa Mestre TASK-024E; ~14 premissas provisórias; 53 relatórios anteriores; último commit `6debfd4` TOOL-003 em `origin/main`).

O diagnóstico **substitui conceitualmente** o predecessor `docs/relatorios/2026-05-19-diagnostico-software-atual.md` (commit `23609bc`, 400 testes — desatualizado em 7 dias com +426 testes, 7 ADRs novos e MVP técnico atingido para caso base). Predecessor **preservado fisicamente** como registro histórico.

**Classe A — estritamente documental.** Não modifica código de produto. Não cria ADR novo. Não altera regras bloqueantes nem premissas provisórias (inventaria, não modifica).

## Arquivos criados

- `docs/relatorios/2026-05-22-TASK-001.md` — relatório de diagnóstico ~700-900 linhas. Estrutura de 12 seções obrigatórias:
  1. Resumo executivo + escopo + método (versão analisada commit `6debfd4`, 826/826, 0 tsc; arquivos lidos integralmente vs leitura seletiva; diferenças vs diagnóstico 2026-05-19).
  2. Visão geral do software atual (propósito; fluxo end-to-end de uma proposta; estado MVP atingido para caso base por TASK-024 §6).
  3. Arquitetura funcional (4 motores Técnico/Governança/Comercial/Interface Operacional por `arquitetura-motor-tecnico.md`; orquestrador único ADR-001; camadas; regras de import).
  4. Matriz dos 9 épicos (tabela única consolidando E01-E09: propósito · capacidade · status real escala 7 níveis · MVP obrigatório? · tasks concluídas · próxima ação; consome literalmente Mapa Mestre TASK-024E).
  5. Motores existentes (por motor: módulos atuais + decisões ADR-001..015 + débitos conhecidos; diferencia "implementado" de "não iniciado" de "parcial").
  6. Entradas e saídas (`ProjectLayout` → `IrrigationProjectResult` → PDF + mapa interativo; server actions de persistência).
  7. Status por bloco de valor (épico × evidências disponíveis; conservadorismo TASK-024D — sempre o nível mais conservador com evidência documentada).
  8. Evidências disponíveis (53 relatórios; 15 ADRs; suítes de teste por módulo; screenshots TASK-046/048/050; fixtures E06).
  9. Riscos técnicos (Projeto A é único caso e fictício; RT nunca aprovou metodologia; HMT nunca comparada com projeto histórico; 9 pesos optimizer sem calibração; BOM nunca confrontada; curva_45_adutora sem SKU; pressão real por derivação pendente).
  10. Premissas pendentes RT/campo (14 entradas + 6 pesos `WEIGHT_*` ativos sem calibração; matriz "premissa × status × responsável × próxima ação"; cita campo Status literal).
  11. Blockers para E08 — Motor Comercial (5 condições: TASK-001 concluída; RT homologa `09-classificacao-de-projetos.md`; ≥ 9 premissas RT aprovadas; ≥ 1 projeto piloto interno; TASK-002 implementada).
  12. Roadmap recomendado **separado em 5 categorias** (ajuste editorial aprovado): (a) próxima task recomendada; (b) tasks Classe A; (c) tasks Classe E de validação; (d) pendências RT/campo; (e) tasks de tooling futuras (ex: TOOL-004).

## Arquivos modificados

- `tasks/TASK-001-diagnostico-software-atual.md` — atualização do task file:
  - Linha 3: `Status: pendente` → `Status: aguardando_fechamento` (terminal estável; aguarda commit/push).
  - Linha 7: atualizar `Atualizado em: 2026-05-19` → `2026-05-22`.
  - Critérios de aceite (linhas 94-100): marcar cada item `[ ]` → `[x]` com evidência inline; linha 100 atualizar `400/400` → `826/826`.
  - Plano de implementação (linha 134): substituir `> A ser preenchido...` pelo plano executado.
  - Log de alterações (linhas 138-142): adicionar entry `| 2026-05-22 | Claude Opus 4.7 | TASK-001 executada: diagnóstico em 2026-05-22-TASK-001.md; reconcilia diagnóstico anterior (2026-05-19) desatualizado em 7 dias; estado base: 826/826 testes, 15 ADRs, 9 épicos. |`.
  - Adicionar bloco `Relatório:` após linha 7.
- `tasks/backlog.md` — atualização controlada:
  - Header (linhas 1-4): atualizar lista de tasks/ADRs incluindo TASK-001 concluída.
  - Entrada TASK-001 (linhas 40-48): `Status: pendente` → `concluída`; adicionar `Concluída em:` e `Relatório:`; substituir blockquote com 1-2 parágrafos resumindo achados.
  - Entrada TASK-002 (linhas 51-59): campo `Bloqueada por:` remove "TASK-001" (mantém apenas homologação RT de `09-classificacao-de-projetos.md`).
- `ai/current-task.md` — ciclo de governança via `/handoff-claude-report` (este comando) e posteriormente `/gpt-review`. Status: `em_planejamento` → `aguardando_revisao_gpt` (transição programática deste comando).

## Arquivos não alterados

- `src/**` — todo o produto (motor hidráulico, layout, catálogo, BOM, PDF, UI/mapa). Escopo proibido explícito.
- `tasks/TASK-024-mapa-mestre-tasks.md` — TASK-024E (2026-05-22) acabou de padronizar os 9 épicos como blocos de valor verificáveis; é **fonte** do diagnóstico, não destino. A única atualização cabível seria adicionar `TASK-001` em "Tasks vinculadas — pendentes/futuras" do E01, mas já está listada (linha 98).
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — diagnóstico **inventaria** as 14 premissas; não altera valores nem status (qualquer alteração violaria escopo e tocaria regra de governança RT).
- `docs/metodologia/01-regras-bloqueantes.md` — não criar `RB-09` nem alterar regras.
- Demais arquivos `docs/metodologia/` (00, 02-11) — leitura somente.
- `docs/decisoes/ADR-*.md` — leitura somente; nenhum ADR novo (diagnóstico não decide).
- `docs/software/*.md` — leitura somente (`arquitetura.md`, `arquitetura-motor-tecnico.md`, `testes-e-homologacao.md`, `testes.md`, `padroes-codigo.md`).
- `ARQUITETURA_ATUAL.md`, `AGENTS.md`, `CLAUDE.md` — nunca alterar.
- `scripts/` — sem alteração de scripts (nenhum seed, nenhum tooling novo).
- `ai/decision-log.md` — append-only humano; nunca tocado por este comando.
- `ai/gpt-review.md` — será escrito apenas por `scripts/ai/run-gpt-review.mjs` invocado por `/gpt-review`.
- `.claude/commands/*` — fluxo de comandos preservado.
- `docs/relatorios/2026-05-19-diagnostico-software-atual.md` — preservado intacto como registro histórico (referenciado pelo novo relatório, não substituído fisicamente).

## Testes obrigatórios

**TASK-001 é Classe A documental — não modifica código.** Conforme Mapa Mestre §9.3, tasks documentais não exigem testes novos. **Verificações de não-regressão** continuam obrigatórias:

1. `npx tsc --noEmit` → **0 erros** (não tocamos `src/`, deve permanecer).
2. `npx vitest run` → **826/826 passando** (não tocamos testes, deve permanecer).
3. `node scripts/ai/__tests__/run-all.mjs` → **27/27 passando** (tooling preservado).

Nenhum teste novo. Nenhum teste alterado. Nenhum teste eliminado.

## Critérios de aceite

- [ ] Relatório criado em `docs/relatorios/2026-05-22-TASK-001.md` com versão analisada (commit `6debfd4`) e data (`2026-05-22`).
- [ ] Diagnóstico cobre as 12 seções obrigatórias.
- [ ] Matriz dos 9 épicos (Seção 4) consome literalmente o Mapa Mestre TASK-024E (sem reescrever a fonte).
- [ ] Cada gap identificado tem: descrição, impacto (bloqueante/importante/melhoria), referência (`arquivo:§seção` ou `ADR-XXX`), sugestão de próximo passo.
- [ ] Checklist de homologação de `testes-e-homologacao.md` §2 e §3 preenchido contra o estado atual (826 testes, 15 ADRs, MVP obrigatório atingido p/ caso base).
- [ ] Inventário completo de premissas em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` (14 entradas + 6 pesos).
- [ ] Lista de prioridades (Seção 12) reconcilia com Mapa Mestre Seção 8 e marca alterações pós-TASK-047.
- [ ] Lista canônica de blockers para E08 (Seção 11) explicita as 5 condições.
- [ ] Roadmap (Seção 12) separado em 5 categorias: próxima task; Classe A; Classe E validação; pendências RT/campo; tooling futuro.
- [ ] `tasks/TASK-001-diagnostico-software-atual.md` atualizada: status `aguardando_fechamento`, critérios marcados, plano executado, log.
- [ ] `tasks/backlog.md` atualizado com entrada TASK-001 `concluída` + ajuste de bloqueio de TASK-002.
- [ ] **Mapa Mestre não alterado** (justificado).
- [ ] Premissas vivas **inventariadas mas não alteradas**.
- [ ] `npx tsc --noEmit` → 0 erros (preservado).
- [ ] `npx vitest run` → 826/826 passando (preservado).
- [ ] `node scripts/ai/__tests__/run-all.mjs` → 27/27 passando (preservado).
- [ ] Nenhum arquivo em `src/**` modificado.
- [ ] Nenhuma regra bloqueante alterada.
- [ ] Nenhum ADR novo criado.
- [ ] Fluxo TOOL-003 (`/handoff-claude-report` + `/gpt-review`) executado **antes** da implementação (não depois).
- [ ] Sem commit, sem push, sem feature, sem refatoração, sem seed.

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Diagnóstico reproduzir literalmente o Mapa Mestre (TASK-024E) sem agregar análise transversal | Média | Médio | TASK-024E é fonte; TASK-001 é **análise transversal e priorização**: identifica gaps, conflitos entre épicos, propõe roadmap. Mapa Mestre é insumo, não cópia. |
| Recomendações conflitarem com Mapa Mestre Seção 8 ("Próximas 5 tasks") sem reconciliar pós-TASK-047 | Média | Médio | Reconciliar explicitamente na Seção 12; quando houver divergência, justificar com mudança de estado pós-TASK-024 (ex.: TASK-047 concluiu "Diâmetros de ramais no PDF" da Seção 8). |
| Diagnóstico fazer julgamento sobre código sem ter lido o arquivo | Baixa | Alto | Toda afirmação técnica referencia `arquivo:linha` ou `arquivo:§seção`. Leitura de `irrigation-project.ts`, `bom.ts`, `hydraulic-sizing.ts`, `secondary-sizing.ts`, `pipeline-diagnostics.ts`, `constructability.ts`, `aspersores.ts` é obrigatória durante `/implementar`. |
| Recomendar mudança em premissa RT (escopo proibido) | Baixa | Alto | Diagnóstico **inventaria** premissas — nunca propõe valor novo. Toda recomendação sobre premissa é "aguardar revisão RT" ou "abrir task documental para registro". |
| Esquecer de marcar diferenças vs diagnóstico 2026-05-19 | Média | Baixo | Seção 1 inclui tabela explícita "Diferenças vs predecessor"; cada seção subsequente marca achados novos com "**Diferença vs 2026-05-19**". |
| Status real otimista demais (ex.: marcar épico como "Validado em projeto histórico" sem evidência) | Baixa | Alto | Regra conservadora TASK-024D: sempre o nível mais conservador com evidência documentada. Quando apenas o Projeto A (fictício) suportar, marcar "Validado visualmente — caso único". |
| `/gpt-review` apontar blocker que exige reformular o diagnóstico antes de implementar | Média | Médio | Fluxo TOOL-003 é exatamente o canal certo: humano decide override ou reformulação via `decision-log.md` append-only. Custo humano/manual ≤ US$ 0,50. |

## O que NÃO será feito

- Não alterar nenhum arquivo em `src/**`.
- Não alterar motor hidráulico, layout, catálogo, BOM, PDF, UI/mapa.
- Não alterar `docs/metodologia/01-regras-bloqueantes.md` (nem criar `RB-09`).
- Não criar ADR novo (diagnóstico inventaria decisões; não decide novas).
- Não alterar valores de premissas em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`.
- Não alterar o Mapa Mestre `tasks/TASK-024-mapa-mestre-tasks.md` (consumir, não rescrever).
- Não criar nova feature, não refatorar, não executar seed, não alterar dados.
- Não automatizar aprovação humana, não editar `ai/decision-log.md` automaticamente.
- Não criar commit, não fazer push, não apagar branch backup.
- Não executar `git gc`, `git reflog expire`, `git add .`.
- Não incluir `.env.local` em nenhuma operação.
- Não imprimir `OPENAI_API_KEY` nem conteúdo de `.env.local`.
- Não iniciar TASK-002 (Motor de Governança A/B/C) — esta task remove apenas o bloqueio TASK-001; TASK-002 segue bloqueada por homologação RT.
- Não substituir fisicamente `docs/relatorios/2026-05-19-diagnostico-software-atual.md` — preservado como registro histórico.
- Não tocar `scripts/`, `ai/` (exceto governança `current-task.md` via comandos TOOL-001/003), `.claude/commands/`.
- Não instalar dependências npm novas.

## Invariantes verificadas

- **INV-CATALOGO-SEM-HOMOLOGACAO** — ok (catálogo `src/lib/catalog/aspersores.ts` intocado).
- **INV-NAO-INVENTAR-SKU** — ok (diagnóstico não cria SKU; apenas inventaria gaps como `curva_45_adutora` faltando).
- **INV-DN100-LATERAL-5022** — ok (regra preservada; ADR-013 inventariado, não modificado).
- **INV-BLOCKERS-TECNICOS** — ok (diagnóstico não relaxa nenhum blocker; lista gaps que poderiam virar blockers futuros).
- **INV-MASCARAR-PENDENCIA** — ok (objetivo central do diagnóstico é **explicitar** pendências, não mascarar; 14 premissas + 6 pesos + 5 blockers para E08 + 7 riscos técnicos listados).
- **INV-DOMINIO-FORA-UI** — ok (apenas `docs/` e `tasks/` afetados; sem `src/`).
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — ok (não avança para BOM/comercial; diagnóstico identifica que E08 Motor Comercial está bloqueado por 5 condições não atendidas).
