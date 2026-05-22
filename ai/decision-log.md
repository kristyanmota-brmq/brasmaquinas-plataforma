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
