# Revisão GPT — TOOL-002

> Gerado automaticamente por `scripts/ai/run-gpt-review.mjs` em 2026-05-22T18:10:07-03:00.
> Modelo: `gpt-5.5`. Schema: `v1.0`.

## Resumo executivo

**Veredito:** `aprovado_com_ajustes`
**Recomendação:** `aprovado_com_ajustes`
**Override permitido (declarado pelo GPT):** `true`

Nenhuma invariante permanente foi violada. Porém, antes da execução, o plano deve corrigir conflitos de escopo (`tasks/backlog.md` fora do permitido), separar fases efetivamente autorizadas das fases posteriores dependentes de decisão humana e ajustar a contagem esperada de testes para refletir o snapshot real.

## Blockers

- **BLK-MET-001 (metodologico):** O plano propõe modificar `tasks/backlog.md`, mas esse arquivo não consta no escopo permitido de `ai/current-task.md` para TOOL-002. É necessário remover essa alteração do plano ou ampliar explicitamente o escopo antes da execução.
- **BLK-MET-002 (metodologico):** Há inconsistência no escopo temporal: o plano declara que a autorização atual vai até a Fase 3, mas também lista como arquivos criados/modificados e critérios de aceite itens de Fase 4 e Fase 5, incluindo decision-log, relatório final, task file e backlog. O plano precisa separar claramente o que está autorizado agora do que será executado apenas após decisão humana.
- **BLK-TEC-001 (tecnico):** O critério `npx vitest run → 826/826` não é sustentado pelo snapshot informado, que registra 817/817 testes de produto e 20/20 testes de tooling em pista separada. A contagem esperada deve ser corrigida para evitar reprovação artificial ou falsa leitura de regressão.

## Análise das invariantes permanentes

- **INV-CATALOGO-SEM-HOMOLOGACAO** — _ok_
  - Não alterar catálogo sem SKU homologado.
  - O plano declara explicitamente que não alterará catálogo, BOM, produto ou `src/**`, e não propõe inclusão ou mudança de item catalogado.
- **INV-NAO-INVENTAR-SKU** — _ok_
  - Não inventar SKU.
  - O escopo é de homologação de fluxo tooling/governança e não propõe criação, referência nova ou alteração de SKU.
- **INV-DN100-LATERAL-5022** — _nao_aplicavel_
  - Não voltar DN100 como lateral 5022.
  - A tarefa não toca seleção hidráulica, layout, laterais, tubos ou regras de DN.
- **INV-BLOCKERS-TECNICOS** — _ok_
  - Não relaxar blockers técnicos.
  - O plano mantém validações estruturais, chamada real à API, decisão humana explícita e não propõe relaxar blockers técnicos existentes. Há ajustes metodológicos/técnicos necessários, mas não uma violação direta desta invariante.
- **INV-MASCARAR-PENDENCIA** — _ok_
  - Não mascarar pendência.
  - A pendência R1 da TOOL-001 é tratada explicitamente, com critérios de aceite, registro de custo, relatório e decisão humana. O plano também reconhece riscos como custo acima do cap e falso positivo de invariante.
- **INV-DOMINIO-FORA-UI** — _nao_aplicavel_
  - Não colocar lógica de domínio na UI.
  - O plano não altera UI, componentes, mapa ou qualquer lógica de domínio.
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — _nao_aplicavel_
  - Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.
  - A tarefa não avança para BOM, proposta comercial, hidráulica, layout ou construtibilidade.

## Metadata

- tokens_prompt: 0
- tokens_completion: 0
- custo_estimado_usd: 0

---

## Bloco estruturado (fonte de verdade do validador)

```json
{
  "task_id": "TOOL-002",
  "schema_version": "1.0",
  "modelo_gpt": "gpt-5.5",
  "timestamp": "2026-05-22T18:10:07-03:00",
  "veredito": "aprovado_com_ajustes",
  "blockers": [
    {
      "id": "BLK-MET-001",
      "categoria": "metodologico",
      "descricao": "O plano propõe modificar `tasks/backlog.md`, mas esse arquivo não consta no escopo permitido de `ai/current-task.md` para TOOL-002. É necessário remover essa alteração do plano ou ampliar explicitamente o escopo antes da execução.",
      "invariante_id": null
    },
    {
      "id": "BLK-MET-002",
      "categoria": "metodologico",
      "descricao": "Há inconsistência no escopo temporal: o plano declara que a autorização atual vai até a Fase 3, mas também lista como arquivos criados/modificados e critérios de aceite itens de Fase 4 e Fase 5, incluindo decision-log, relatório final, task file e backlog. O plano precisa separar claramente o que está autorizado agora do que será executado apenas após decisão humana.",
      "invariante_id": null
    },
    {
      "id": "BLK-TEC-001",
      "categoria": "tecnico",
      "descricao": "O critério `npx vitest run → 826/826` não é sustentado pelo snapshot informado, que registra 817/817 testes de produto e 20/20 testes de tooling em pista separada. A contagem esperada deve ser corrigida para evitar reprovação artificial ou falsa leitura de regressão.",
      "invariante_id": null
    }
  ],
  "invariantes": [
    {
      "id": "INV-CATALOGO-SEM-HOMOLOGACAO",
      "descricao": "Não alterar catálogo sem SKU homologado.",
      "status": "ok",
      "justificativa": "O plano declara explicitamente que não alterará catálogo, BOM, produto ou `src/**`, e não propõe inclusão ou mudança de item catalogado."
    },
    {
      "id": "INV-NAO-INVENTAR-SKU",
      "descricao": "Não inventar SKU.",
      "status": "ok",
      "justificativa": "O escopo é de homologação de fluxo tooling/governança e não propõe criação, referência nova ou alteração de SKU."
    },
    {
      "id": "INV-DN100-LATERAL-5022",
      "descricao": "Não voltar DN100 como lateral 5022.",
      "status": "nao_aplicavel",
      "justificativa": "A tarefa não toca seleção hidráulica, layout, laterais, tubos ou regras de DN."
    },
    {
      "id": "INV-BLOCKERS-TECNICOS",
      "descricao": "Não relaxar blockers técnicos.",
      "status": "ok",
      "justificativa": "O plano mantém validações estruturais, chamada real à API, decisão humana explícita e não propõe relaxar blockers técnicos existentes. Há ajustes metodológicos/técnicos necessários, mas não uma violação direta desta invariante."
    },
    {
      "id": "INV-MASCARAR-PENDENCIA",
      "descricao": "Não mascarar pendência.",
      "status": "ok",
      "justificativa": "A pendência R1 da TOOL-001 é tratada explicitamente, com critérios de aceite, registro de custo, relatório e decisão humana. O plano também reconhece riscos como custo acima do cap e falso positivo de invariante."
    },
    {
      "id": "INV-DOMINIO-FORA-UI",
      "descricao": "Não colocar lógica de domínio na UI.",
      "status": "nao_aplicavel",
      "justificativa": "O plano não altera UI, componentes, mapa ou qualquer lógica de domínio."
    },
    {
      "id": "INV-LAYOUT-INSTAVEL-COMERCIAL",
      "descricao": "Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.",
      "status": "nao_aplicavel",
      "justificativa": "A tarefa não avança para BOM, proposta comercial, hidráulica, layout ou construtibilidade."
    }
  ],
  "recomendacao": "aprovado_com_ajustes",
  "override_permitido": true,
  "justificativa_resumida": "Nenhuma invariante permanente foi violada. Porém, antes da execução, o plano deve corrigir conflitos de escopo (`tasks/backlog.md` fora do permitido), separar fases efetivamente autorizadas das fases posteriores dependentes de decisão humana e ajustar a contagem esperada de testes para refletir o snapshot real.",
  "metadata": {
    "tokens_prompt": 0,
    "tokens_completion": 0,
    "custo_estimado_usd": 0
  }
}
```
