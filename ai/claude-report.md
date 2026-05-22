# claude-report — TOOL-002

> Gerado por `/handoff-claude-report TOOL-002` em 2026-05-22.
> Plano detalhado aprovado pelo humano antes da serialização.

---

## Entendimento

Homologar o pipeline real do handoff TOOL-001 executando uma chamada autêntica à Responses API da OpenAI usando a TOOL-002 como task piloto, validando end-to-end: serialização do plano → chamada real → revisão estruturada → validação automática → decisão humana → registro de custo. Sem aprovação automática. Sem alterar produto. Escopo de conteúdo = γ (mínimo — sem RB-09, sem doc metodológico novo).

## Arquivos criados

- `ai/claude-report.md` — este arquivo (sobrescreve o soft-dogfood TOOL-001).
- `ai/gpt-review.md` — será regenerado por `run-gpt-review.mjs` na Fase 2 com bloco JSON canônico válido para TOOL-002.
- `docs/relatorios/2026-05-22-TOOL-002.md` — relatório de fechamento (criado na Fase 5, fora do escopo desta autorização atual que vai até Fase 3).

## Arquivos modificados

- `ai/current-task.md` — transições de status ao longo do ciclo: `em_planejamento → aguardando_revisao_gpt → aguardando_aprovacao_humana → aprovado_para_implementacao → em_implementacao → aguardando_fechamento`. Cada mudança via comando ou edição manual + validador.
- `ai/decision-log.md` — append-only; entries de decisão humana (Fase 4, fora do escopo atual).
- `tasks/TOOL-002-homologar-fluxo-real-gpt-reviewer.md` — atualização de status final, critérios marcados, vínculo ao relatório (Fase 5).
- `tasks/backlog.md` — entrada formal TOOL-002 concluída (Fase 5).

## Arquivos não alterados

- `src/**` — todo o produto (motor de layout, hidráulica, BOM, catálogo, PDF, UI/mapa, server actions).
- `docs/metodologia/01-regras-bloqueantes.md` — promoção a RB-09 fica para task separada (regra TOOL-001 V1).
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — premissas técnicas preservadas.
- `docs/decisoes/ADR-*.md` — sem ADR novo.
- `ai/README.md` — escopo γ permite alteração mínima opcional, avaliação: não há necessidade. README já documenta o fluxo corretamente.
- `ai/project-state.md` — pode ser atualizado opcionalmente pós-fechamento; não obrigatório.
- `scripts/ai/*.mjs` e `scripts/ai/lib/*.mjs` — todos os scripts TOOL-001 preservados.
- `scripts/ai/__tests__/**` — testes TOOL-001 preservados.
- `templates/ai-handoff-*.md` — templates preservados.
- `.env.local` — apenas lido; nunca modificado nem impresso.
- `.env.example` — preservado.
- `package.json`, `prisma/**` — sem mudanças.
- `AGENTS.md`, `HANDOFF.md`, `ARQUITETURA_ATUAL.md`, `CLAUDE.md` — sem mudanças.
- TASK-047, TASK-048, TASK-049, TASK-050 — já em `origin/main`, intocáveis.

## Testes obrigatórios

Esta tarefa **não exige novos testes automatizados** (Classe A — governança/tooling; pista de testes do TOOL-001 já existente cobre os scripts). Validações operacionais em runtime:

1. **V1** — `validate-structure --task TOOL-002` pós-Fase 1: pode falhar legitimamente por `gpt-review.md` ainda referenciar TOOL-001 (esperado).
2. **V2** — Pre-flight de secret no início da Fase 2 passa (`.env.local` não em `git status`).
3. **V3** — HTTP 200 da Responses API.
4. **V4** — JSON canônico extrai sem erro.
5. **V5** — `validate-structure --task TOOL-002` pós-Fase 2 retorna OK.
6. **V6** — `custo_estimado_usd ≤ 0.50` (estimativa operacional V1; referência final = fatura OpenAI).
7. **V7** — Decision-log entry passa todas as validações (Fase 4 — fora do escopo atual).
8. **V8** — `validate-structure --task TOOL-002` pós-Fase 4 retorna OK.
9. **V9** — Hash sha256 do gpt-review bate no decision-log (Fase 4).
10. **V10** — `npx tsc --noEmit` → 0 erros (preservado).
11. **V11** — `npx vitest run` → 826/826 (preservado).

## Critérios de aceite

- [ ] `/handoff-claude-report TOOL-002` executado; `ai/claude-report.md` gerado no formato canônico.
- [ ] `current-task.md.status` transitou `em_planejamento → aguardando_revisao_gpt` (transição válida).
- [ ] `run-gpt-review.mjs --task TOOL-002` executado com **HTTP 200** na chamada real.
- [ ] `ai/gpt-review.md` regenerado com bloco JSON canônico válido.
- [ ] `task_id === "TOOL-002"` no JSON.
- [ ] `custo_estimado_usd` registrado e **≤ US$ 0,50** (estimativa V1).
- [ ] `validate-structure --task TOOL-002` retorna OK após cada fase relevante.
- [ ] Decisão humana registrada em `ai/decision-log.md` (append-only; Fase 4).
- [ ] Hash sha256 de `gpt-review.md` correto no entry do decision-log.
- [ ] `current-task.md.status` final = `aguardando_fechamento`.
- [ ] `docs/relatorios/2026-05-22-TOOL-002.md` criado com sumário + custo + lições.
- [ ] `tasks/backlog.md` atualizado.
- [ ] `npx tsc --noEmit` → 0 erros (preservado).
- [ ] `npx vitest run` → 826/826 (preservado).
- [ ] **Nenhum arquivo** em `src/**`, catálogo, BOM, PDF, layout, UI, mapa, `docs/decisoes/`, `docs/metodologia/01-regras-bloqueantes.md`, `package.json`, `prisma/**` alterado.
- [ ] **Nenhuma aprovação automática** — toda transição é decisão humana explícita.
- [ ] **Nenhum push** ao remoto sem aprovação humana adicional.

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| `custo_estimado_usd > 0,50` (acima do cap acordado verbal) | Média | Médio | Registrar como FALHA-A no relatório; reportar para decidir se aceita ou abre task de cap automático. |
| GPT marca invariante como `violada` indevidamente (falso positivo) | Baixa | Alto — task bloqueada terminalmente | Override NÃO libera (regra terminal). Saída: reformular plano e voltar a `/planejar`. |
| HTTP 401/403/429 da Responses API | Média | Alto | Script aborta com mensagem clara. Verificar `OPENAI_API_KEY`, modelo válido, rate limit. Sem retry automática. |
| JSON estruturado malformado retornado pela API | Baixa | Alto | Script aborta. `text.format: strict` minimiza isso (validação server-side OpenAI). |
| Pre-flight de secret detecta `.env.local` em `git status` | Baixa | Crítico | Script aborta. Verificar `.gitignore` (`.env*.local` já presente). |
| Network timeout | Baixa | Médio | Abort com erro de rede. Re-executar quando rede estável. |
| `tokens_prompt + tokens_completion` muito alto (custo inflado) | Baixa | Médio | Monitorar nos logs; limitar tamanho de inputs já está em níveis razoáveis. |
| Modelo escolhido não suporta `text.format: json_schema strict` | Baixa | Alto | gpt-5, gpt-4.1, gpt-4o suportam. Se falhar: abort com mensagem clara. |
| `custo_estimado_usd` divergir da fatura OpenAI | Média | Baixo | Limitação V1 aceita; comparar com dashboard OpenAI pós-execução. |
| Validator rejeitar gpt-review por hash divergente após edição manual | Baixa | Baixo | Não editar `gpt-review.md` manualmente — apenas via script. |
| Decision-log encolhe acidentalmente | Muito baixa | Crítico | Append-only; nunca deletar entries; backup do HEAD. |
| Transição inválida de `current-task.md.status` | Baixa | Médio | Grafo verificado em `validate-structure.mjs`; rodar validator após cada transição. |

## O que NÃO será feito

- Não alterar `src/**`, catálogo, BOM, PDF, layout, UI/mapa, motor hidráulico.
- Não alterar `docs/metodologia/01-regras-bloqueantes.md`.
- Não criar RB-09 — task documental separada.
- Não criar ADR novo.
- Não alterar premissas técnicas.
- Não fazer `git add`, `git commit`, `git push` sem aprovação humana adicional.
- Não chamar a Responses API mais de 1 vez (sem retry automática).
- Não editar `ai/gpt-review.md` manualmente — sempre via script.
- Não automatizar a decisão humana — sempre edição manual em `ai/decision-log.md`.
- Não imprimir `OPENAI_API_KEY` ou valores de `.env.local`.

## Invariantes verificadas

- **INV-CATALOGO-SEM-HOMOLOGACAO** — ok (TOOL-002 não toca catálogo).
- **INV-NAO-INVENTAR-SKU** — ok (TOOL-002 não toca SKUs).
- **INV-DN100-LATERAL-5022** — nao_aplicavel (TOOL-002 não toca seleção hidráulica).
- **INV-BLOCKERS-TECNICOS** — ok (TOOL-002 não relaxa nenhum blocker).
- **INV-MASCARAR-PENDENCIA** — ok (TOOL-002 endereça explicitamente a pendência R1 da TOOL-001 com transparência).
- **INV-DOMINIO-FORA-UI** — nao_aplicavel (TOOL-002 não toca UI/componentes).
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — nao_aplicavel (TOOL-002 não toca layout, hidráulica, BOM ou comercial).
