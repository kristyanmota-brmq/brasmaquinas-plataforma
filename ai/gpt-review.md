# Revisão GPT — TASK-004B

> Gerado automaticamente por `scripts/ai/run-gpt-review.mjs` em 2026-05-22T21:00:00-03:00.
> Modelo: `gpt-5.5`. Schema: `v1.0`.

## Resumo executivo

**Veredito:** `aprovado_com_ajustes`
**Recomendação:** `aprovado_com_ajustes`
**Override permitido (declarado pelo GPT):** `true`

Não há violação de invariante permanente. O plano é coerente com a task e mantém catálogo, BOM, UI e premissas fora do escopo. Recomenda-se ajustar a detecção de `pressureClassModel` para exigir também `adutoraHfM` e alinhar o escopo caso testes fora de `pressure-class.test.ts` precisem ser alterados.

## Blockers

- **TEC-004B-001 (tecnico):** A lógica proposta para `pressureClassModel` diz considerar `exact_per_derivation` quando todos os ramais/laterais tiverem `cumPrincipalHfM` definido, mas `annotatePressureClass` só usa o cálculo real quando `cumPrincipalHfM` e `adutoraHfM` estão ambos definidos. Ajuste recomendado: a detecção do modelo deve exigir ambos os campos para os segmentos `secondary`/`lateral`, ou documentar explicitamente que `adutoraHfM` é sempre populado no caminho do solver. Do contrário, o resultado pode declarar modelo exato enquanto alguns segmentos caem no fallback conservador.
- **MET-004B-001 (metodologico):** O plano lista como mitigação auditar/adaptar expectations em `integration.test.ts`, `bom.test.ts` e `pipeline-diagnostics.test.ts`, mas o escopo permitido de testes menciona apenas `src/lib/layout/__tests__/pressure-class.test.ts`. Se alterações nesses testes forem necessárias, o escopo da task deve ser explicitamente ampliado antes da implementação; caso contrário, devem permanecer intocados.

## Análise das invariantes permanentes

- **INV-CATALOGO-SEM-HOMOLOGACAO** — _ok_
  - Não alterar catálogo sem SKU homologado.
  - O plano declara `src/lib/catalog/aspersores.ts` como read-only e não propõe inclusão, remoção ou alteração de itens de catálogo.
- **INV-NAO-INVENTAR-SKU** — _ok_
  - Não inventar SKU.
  - Não há proposta de criar SKU, mapear novo item comercial ou alterar dados de produto; a tarefa atua no pós-processamento hidráulico de classe de pressão.
- **INV-DN100-LATERAL-5022** — _ok_
  - Não voltar DN100 como lateral 5022.
  - O plano não toca seleção de lateral, geometria, catálogo ou regras associadas a DN100/5022; também declara `secondary-sizing.ts`, `laterais.ts` e arquivos de geometria como intocados.
- **INV-BLOCKERS-TECNICOS** — _ok_
  - Não relaxar blockers técnicos.
  - A mudança proposta não remove blockers técnicos; ela substitui falsos positivos conservadores por classificação baseada em pressão calculada por derivação e preserva fallback `violation_conservative` quando dados faltarem. Casos reais acima de PN passam a `violation_confirmed`. Há ajuste técnico recomendado para a consistência de `pressureClassModel`, mas não há violação direta da invariante.
- **INV-MASCARAR-PENDENCIA** — _ok_
  - Não mascarar pendência.
  - O plano explicita que desnível geodético por segmento e perdas locais proporcionais ficam fora do escopo e devem permanecer documentados como limitações/pendências futuras, sem removê-las das pendências.
- **INV-DOMINIO-FORA-UI** — _ok_
  - Não colocar lógica de domínio na UI.
  - A lógica hidráulica permanece em `src/lib/layout/hydraulic-sizing.ts`; UI, API, PDF e componentes são declarados fora do escopo e intocados.
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — _ok_
  - Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.
  - O plano não avança BOM, PDF comercial, motor comercial ou catálogo; a BOM é explicitamente intocada e há critério de não-regressão para manter o valor do Projeto A.

## Metadata

- tokens_prompt: 0
- tokens_completion: 0
- custo_estimado_usd: 0

---

## Bloco estruturado (fonte de verdade do validador)

```json
{
  "task_id": "TASK-004B",
  "schema_version": "1.0",
  "modelo_gpt": "gpt-5.5",
  "timestamp": "2026-05-22T21:00:00-03:00",
  "veredito": "aprovado_com_ajustes",
  "blockers": [
    {
      "id": "TEC-004B-001",
      "categoria": "tecnico",
      "descricao": "A lógica proposta para `pressureClassModel` diz considerar `exact_per_derivation` quando todos os ramais/laterais tiverem `cumPrincipalHfM` definido, mas `annotatePressureClass` só usa o cálculo real quando `cumPrincipalHfM` e `adutoraHfM` estão ambos definidos. Ajuste recomendado: a detecção do modelo deve exigir ambos os campos para os segmentos `secondary`/`lateral`, ou documentar explicitamente que `adutoraHfM` é sempre populado no caminho do solver. Do contrário, o resultado pode declarar modelo exato enquanto alguns segmentos caem no fallback conservador.",
      "invariante_id": null
    },
    {
      "id": "MET-004B-001",
      "categoria": "metodologico",
      "descricao": "O plano lista como mitigação auditar/adaptar expectations em `integration.test.ts`, `bom.test.ts` e `pipeline-diagnostics.test.ts`, mas o escopo permitido de testes menciona apenas `src/lib/layout/__tests__/pressure-class.test.ts`. Se alterações nesses testes forem necessárias, o escopo da task deve ser explicitamente ampliado antes da implementação; caso contrário, devem permanecer intocados.",
      "invariante_id": null
    }
  ],
  "invariantes": [
    {
      "id": "INV-CATALOGO-SEM-HOMOLOGACAO",
      "descricao": "Não alterar catálogo sem SKU homologado.",
      "status": "ok",
      "justificativa": "O plano declara `src/lib/catalog/aspersores.ts` como read-only e não propõe inclusão, remoção ou alteração de itens de catálogo."
    },
    {
      "id": "INV-NAO-INVENTAR-SKU",
      "descricao": "Não inventar SKU.",
      "status": "ok",
      "justificativa": "Não há proposta de criar SKU, mapear novo item comercial ou alterar dados de produto; a tarefa atua no pós-processamento hidráulico de classe de pressão."
    },
    {
      "id": "INV-DN100-LATERAL-5022",
      "descricao": "Não voltar DN100 como lateral 5022.",
      "status": "ok",
      "justificativa": "O plano não toca seleção de lateral, geometria, catálogo ou regras associadas a DN100/5022; também declara `secondary-sizing.ts`, `laterais.ts` e arquivos de geometria como intocados."
    },
    {
      "id": "INV-BLOCKERS-TECNICOS",
      "descricao": "Não relaxar blockers técnicos.",
      "status": "ok",
      "justificativa": "A mudança proposta não remove blockers técnicos; ela substitui falsos positivos conservadores por classificação baseada em pressão calculada por derivação e preserva fallback `violation_conservative` quando dados faltarem. Casos reais acima de PN passam a `violation_confirmed`. Há ajuste técnico recomendado para a consistência de `pressureClassModel`, mas não há violação direta da invariante."
    },
    {
      "id": "INV-MASCARAR-PENDENCIA",
      "descricao": "Não mascarar pendência.",
      "status": "ok",
      "justificativa": "O plano explicita que desnível geodético por segmento e perdas locais proporcionais ficam fora do escopo e devem permanecer documentados como limitações/pendências futuras, sem removê-las das pendências."
    },
    {
      "id": "INV-DOMINIO-FORA-UI",
      "descricao": "Não colocar lógica de domínio na UI.",
      "status": "ok",
      "justificativa": "A lógica hidráulica permanece em `src/lib/layout/hydraulic-sizing.ts`; UI, API, PDF e componentes são declarados fora do escopo e intocados."
    },
    {
      "id": "INV-LAYOUT-INSTAVEL-COMERCIAL",
      "descricao": "Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.",
      "status": "ok",
      "justificativa": "O plano não avança BOM, PDF comercial, motor comercial ou catálogo; a BOM é explicitamente intocada e há critério de não-regressão para manter o valor do Projeto A."
    }
  ],
  "recomendacao": "aprovado_com_ajustes",
  "override_permitido": true,
  "justificativa_resumida": "Não há violação de invariante permanente. O plano é coerente com a task e mantém catálogo, BOM, UI e premissas fora do escopo. Recomenda-se ajustar a detecção de `pressureClassModel` para exigir também `adutoraHfM` e alinhar o escopo caso testes fora de `pressure-class.test.ts` precisem ser alterados.",
  "metadata": {
    "tokens_prompt": 0,
    "tokens_completion": 0,
    "custo_estimado_usd": 0
  }
}
```
