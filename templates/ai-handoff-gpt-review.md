# Revisão GPT — TASK-XXX (template)

> Esqueleto canônico de `ai/gpt-review.md`. **Gerado automaticamente** por `node scripts/ai/run-gpt-review.mjs --task TASK-XXX`.
>
> Este template existe para referência humana sobre o formato. Em uso normal, o arquivo é regenerado a cada chamada da API.

## Resumo executivo

**Veredito:** `aprovado | aprovado_com_ajustes | reprovado | blocker_invariante_permanente`
**Recomendação:** `aprovado | aprovado_com_ajustes | reprovado`
**Override permitido (declarado pelo GPT):** `true | false | null`

[Texto narrativo do GPT. Espelha o campo `justificativa_resumida` do JSON.]

## Blockers

- [Lista de blockers do JSON, ou "Nenhum blocker identificado."]

## Análise das invariantes permanentes

- [Lista de invariantes com status e justificativa]

## Metadata

- tokens_prompt: [N]
- tokens_completion: [N]
- custo_estimado_usd: [N]

---

## Bloco estruturado (fonte de verdade do validador)

```json
{
  "task_id": "TASK-XXX",
  "schema_version": "1.0",
  "modelo_gpt": "<configurado em OPENAI_MODEL>",
  "timestamp": "2026-MM-DDTHH:mm:ss-03:00",
  "veredito": "aprovado_com_ajustes",
  "blockers": [],
  "invariantes": [
    {
      "id": "INV-CATALOGO-SEM-HOMOLOGACAO",
      "descricao": "Não alterar catálogo sem SKU homologado",
      "status": "ok",
      "justificativa": "..."
    },
    {
      "id": "INV-NAO-INVENTAR-SKU",
      "descricao": "Não inventar SKU",
      "status": "ok",
      "justificativa": "..."
    },
    {
      "id": "INV-DN100-LATERAL-5022",
      "descricao": "Não voltar DN100 como lateral 5022",
      "status": "ok",
      "justificativa": "..."
    },
    {
      "id": "INV-BLOCKERS-TECNICOS",
      "descricao": "Não relaxar blockers técnicos",
      "status": "ok",
      "justificativa": "..."
    },
    {
      "id": "INV-MASCARAR-PENDENCIA",
      "descricao": "Não mascarar pendência",
      "status": "ok",
      "justificativa": "..."
    },
    {
      "id": "INV-DOMINIO-FORA-UI",
      "descricao": "Não colocar lógica de domínio na UI",
      "status": "ok",
      "justificativa": "..."
    },
    {
      "id": "INV-LAYOUT-INSTAVEL-COMERCIAL",
      "descricao": "Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis",
      "status": "ok",
      "justificativa": "..."
    }
  ],
  "recomendacao": "aprovado_com_ajustes",
  "override_permitido": null,
  "justificativa_resumida": "Texto <= 500 caracteres",
  "metadata": {
    "tokens_prompt": 0,
    "tokens_completion": 0,
    "custo_estimado_usd": 0
  }
}
```
