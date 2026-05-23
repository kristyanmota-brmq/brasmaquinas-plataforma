# Revisão GPT — TASK-052

> Gerado automaticamente por `scripts/ai/run-gpt-review.mjs` em 2026-05-23T00:00:00Z.
> Modelo: `gpt-5.5`. Schema: `v1.0`.

## Resumo executivo

**Veredito:** `aprovado_com_ajustes`
**Recomendação:** `aprovado_com_ajustes`
**Override permitido (declarado pelo GPT):** `true`

Plano respeita as 7 invariantes permanentes e é coerente com uma task Classe C documental. O único ajuste necessário é metodológico: alinhar ou justificar as contagens de testes/verificações citadas, pois divergem do snapshot fornecido. Não há violação terminal de invariante.

## Blockers

- **BLK-MET-001 (metodologico):** As contagens de testes/verificações citadas no plano não estão consistentes com o snapshot fornecido: snapshot informa produto 817/817 e tooling 20/20, enquanto TASK-052/claude-report citam vitest 836/836 e run-all 27/27. Como a task é documental e não altera src/**, isso não viola invariante permanente, mas deve ser ajustado ou justificado antes do fechamento para não registrar evidência de não-regressão ambígua.

## Análise das invariantes permanentes

- **INV-CATALOGO-SEM-HOMOLOGACAO** — _ok_
  - Não alterar catálogo sem SKU homologado.
  - O plano declara escopo estritamente documental e proíbe alterações em src/**, incluindo catálogo. Não há inclusão ou alteração de itens de catálogo.
- **INV-NAO-INVENTAR-SKU** — _ok_
  - Não inventar SKU.
  - O plano não cria, altera ou referencia novos SKUs. A mudança é apenas na documentação de uma premissa hidráulica/operacional.
- **INV-DN100-LATERAL-5022** — _ok_
  - Não voltar DN100 como lateral 5022.
  - Não há alteração de lógica de dimensionamento, catálogo, BOM ou seleção de tubulação. O plano explicitamente preserva src/**.
- **INV-BLOCKERS-TECNICOS** — _ok_
  - Não relaxar blockers técnicos.
  - A promoção de PENDENTE_REVISAO_RT_BRASMAQUINAS para APROVADO_RT é fundamentada na confirmação explícita do RT registrada no plano. O plano não propõe relaxar blockers técnicos nem alterar regras bloqueantes.
- **INV-MASCARAR-PENDENCIA** — _ok_
  - Não mascarar pendência.
  - A task tem como objetivo explicitar uma confirmação RT e corrigir contradição documental entre a premissa escrita e o comportamento real do código. Desde que o relatório registre claramente a fonte/data da confirmação, o plano aumenta transparência em vez de mascarar pendência.
- **INV-DOMINIO-FORA-UI** — _ok_
  - Não colocar lógica de domínio na UI.
  - Não há alteração em UI nem em src/**. A documentação apenas descreve a regra operacional já implementada em domínio existente.
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — _ok_
  - Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.
  - O plano não avança BOM, catálogo, orçamento ou decisão comercial. Apenas documenta a homologação da operação rotativa por setor; TASK-053 topológica permanece separada.

## Metadata

- tokens_prompt: 0
- tokens_completion: 0
- custo_estimado_usd: 0

---

## Bloco estruturado (fonte de verdade do validador)

```json
{
  "task_id": "TASK-052",
  "schema_version": "1.0",
  "modelo_gpt": "gpt-5.5",
  "timestamp": "2026-05-23T00:00:00Z",
  "veredito": "aprovado_com_ajustes",
  "blockers": [
    {
      "id": "BLK-MET-001",
      "categoria": "metodologico",
      "descricao": "As contagens de testes/verificações citadas no plano não estão consistentes com o snapshot fornecido: snapshot informa produto 817/817 e tooling 20/20, enquanto TASK-052/claude-report citam vitest 836/836 e run-all 27/27. Como a task é documental e não altera src/**, isso não viola invariante permanente, mas deve ser ajustado ou justificado antes do fechamento para não registrar evidência de não-regressão ambígua.",
      "invariante_id": null
    }
  ],
  "invariantes": [
    {
      "id": "INV-CATALOGO-SEM-HOMOLOGACAO",
      "descricao": "Não alterar catálogo sem SKU homologado.",
      "status": "ok",
      "justificativa": "O plano declara escopo estritamente documental e proíbe alterações em src/**, incluindo catálogo. Não há inclusão ou alteração de itens de catálogo."
    },
    {
      "id": "INV-NAO-INVENTAR-SKU",
      "descricao": "Não inventar SKU.",
      "status": "ok",
      "justificativa": "O plano não cria, altera ou referencia novos SKUs. A mudança é apenas na documentação de uma premissa hidráulica/operacional."
    },
    {
      "id": "INV-DN100-LATERAL-5022",
      "descricao": "Não voltar DN100 como lateral 5022.",
      "status": "ok",
      "justificativa": "Não há alteração de lógica de dimensionamento, catálogo, BOM ou seleção de tubulação. O plano explicitamente preserva src/**."
    },
    {
      "id": "INV-BLOCKERS-TECNICOS",
      "descricao": "Não relaxar blockers técnicos.",
      "status": "ok",
      "justificativa": "A promoção de PENDENTE_REVISAO_RT_BRASMAQUINAS para APROVADO_RT é fundamentada na confirmação explícita do RT registrada no plano. O plano não propõe relaxar blockers técnicos nem alterar regras bloqueantes."
    },
    {
      "id": "INV-MASCARAR-PENDENCIA",
      "descricao": "Não mascarar pendência.",
      "status": "ok",
      "justificativa": "A task tem como objetivo explicitar uma confirmação RT e corrigir contradição documental entre a premissa escrita e o comportamento real do código. Desde que o relatório registre claramente a fonte/data da confirmação, o plano aumenta transparência em vez de mascarar pendência."
    },
    {
      "id": "INV-DOMINIO-FORA-UI",
      "descricao": "Não colocar lógica de domínio na UI.",
      "status": "ok",
      "justificativa": "Não há alteração em UI nem em src/**. A documentação apenas descreve a regra operacional já implementada em domínio existente."
    },
    {
      "id": "INV-LAYOUT-INSTAVEL-COMERCIAL",
      "descricao": "Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.",
      "status": "ok",
      "justificativa": "O plano não avança BOM, catálogo, orçamento ou decisão comercial. Apenas documenta a homologação da operação rotativa por setor; TASK-053 topológica permanece separada."
    }
  ],
  "recomendacao": "aprovado_com_ajustes",
  "override_permitido": true,
  "justificativa_resumida": "Plano respeita as 7 invariantes permanentes e é coerente com uma task Classe C documental. O único ajuste necessário é metodológico: alinhar ou justificar as contagens de testes/verificações citadas, pois divergem do snapshot fornecido. Não há violação terminal de invariante.",
  "metadata": {
    "tokens_prompt": 0,
    "tokens_completion": 0,
    "custo_estimado_usd": 0
  }
}
```
