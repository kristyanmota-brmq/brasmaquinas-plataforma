# decision-log

Log **append-only** de decisões humanas pós-revisão do GPT no fluxo TOOL-001.

Cada bloco YAML separado por `---` é uma entrada permanente. **Nada nunca é apagado.**

Regras:

- Cada entry deve ter os campos obrigatórios: `timestamp`, `task_id`, `decision_point`, `veredito_gpt`, `decisao_humana`, `responsavel`, `justificativa`, `override`.
- Entries com `override: true` exigem `risco_assumido` não-vazio e `justificativa` ≥ 80 caracteres.
- Timestamps devem ser estritamente crescentes.
- `hash_gpt_review` (sha256 hex) deve corresponder ao `ai/gpt-review.md` no momento da decisão.
- Override **não libera** violação de invariante permanente — ver `ai/README.md`.

Validação: `node scripts/ai/validate-structure.mjs --task TOOL-XXX`.

---
timestamp: 2026-05-22T16:45:00-03:00
task_id: TOOL-001
decision_point: pos_implementacao_revisao
veredito_gpt: aprovado_com_ajustes
decisao_humana: aprovado_com_ajustes
responsavel: Kristyan Mota
justificativa: |
  Primeira entry permanente do decision-log. Soft-dogfood do ciclo TOOL-001: implementação respeita os 7 ajustes do usuário, 20/20 testes tooling passando, 0 erros TypeScript, nenhum arquivo de produto tocado, todas as 7 invariantes permanentes verificadas OK. Observações residuais R1-R4 documentadas em ai/gpt-review.md ficam para TOOL-002 (primeira execução real da Responses API) e tasks subsequentes. Esta entry é PERMANENTE conforme regra append-only.
override: false
ajustes_aplicados: ["soft dogfood sem chamada real à API OpenAI", "modelo_gpt = soft-dogfood-claude-opus-4-7 para transparência", "primeira execução real fica para TOOL-002"]
hash_gpt_review: f57518a2df3fae5f71d9cfc4fe95ea8b00c50858401697f061648c930154a21b

---

timestamp: 2026-05-22T18:24:30-03:00
task_id: TOOL-002
decision_point: pos_planejamento
veredito_gpt: aprovado_com_ajustes
decisao_humana: aprovado_com_ajustes
responsavel: Kristyan Mota
justificativa: |
  Pipeline real Claude Code ↔ GPT Reviewer homologado nas Fases 1-3 da TOOL-002. A chamada à Responses API (modelo gpt-5.5) retornou HTTP 200 após ajuste de billing/cota; o JSON canônico foi gerado, extraído e validado pelo validate-structure (resultado OK com 1 WARN não-bloqueante). Nenhuma invariante permanente foi violada (0/7); nenhum arquivo de produto alterado; nenhum secret exposto. O GPT identificou 3 blockers metodológicos/técnicos no próprio plano da TOOL-002, todos aceitos como ajustes obrigatórios pré-fechamento: (a) BLK-MET-001 — alinhar tasks/backlog.md ao escopo permitido em current-task.md (incluir explicitamente ou remover dos artefatos); (b) BLK-MET-002 — separar claramente artefatos das Fases 1-3 (já autorizadas/executadas), Fase 4 (autorizada agora) e Fase 5 (depende de nova autorização humana); (c) BLK-TEC-001 — substituir contagem hardcoded de vitest por critério paramétrico (tsc 0; vitest 100% passando com contagem real; scripts/ai/__tests__/run-all.mjs 20/20). Limitação V1 registrada: tokens_prompt=0, tokens_completion=0 e custo_estimado_usd=0 vieram zerados do JSON do próprio modelo e não constituem custo real — referência de cobrança é exclusivamente o dashboard/fatura OpenAI. WARN do validator (override_permitido declarado=true, derivado=null) é informacional e não-bloqueante, pois nenhuma invariante foi violada. Próxima ação humana autorizada explicitamente: aplicar os 3 ajustes (BLK-MET-001, BLK-MET-002, BLK-TEC-001) na Fase 5 antes do fechamento de TOOL-002.
override: false
ajustes_aplicados: ["BLK-MET-001 — alinhar tasks/backlog.md ao escopo permitido em current-task.md (Fase 5)", "BLK-MET-002 — separar Fases 1-3 / 4 / 5 nos artefatos de TOOL-002 (Fase 5)", "BLK-TEC-001 — substituir contagem hardcoded de vitest por critério paramétrico tsc 0 + vitest 100% real + run-all.mjs 20/20 (Fase 5)", "Limitação V1 documentada: tokens/custo zerados do JSON do modelo não são custo real — fatura OpenAI é a referência", "Sugestão futura: capturar usage real via response.usage quando disponível na Responses API"]
hash_gpt_review: cd4e92f886f39bed9ba969371afd3ba8301fd32194ee14e465aade25c347f55c
