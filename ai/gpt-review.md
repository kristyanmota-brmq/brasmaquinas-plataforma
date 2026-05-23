# Revisão GPT — TASK-053

> Gerado automaticamente por `scripts/ai/run-gpt-review.mjs` em 2026-05-23T12:10:00-03:00.
> Modelo: `gpt-5.5`. Schema: `v1.0`.

## Resumo executivo

**Veredito:** `reprovado`
**Recomendação:** `reprovado`
**Override permitido (declarado pelo GPT):** `true`

Nenhuma invariante permanente foi marcada como violada, portanto não há blocker terminal. Porém o plano deve ser reprovado nesta rodada por inconsistência metodológica entre `current-task.md` v7 e o plano v12, além de risco técnico/metodológico de fechar a task com blocker angular esperado sem critério de aceite suficientemente explícito.

## Blockers

- **MET-053-01 (metodologico):** O snapshot de `ai/current-task.md` ainda descreve a TASK-053 como v7, com objetivo de orientar a espinha pela direção real da principal e ignorar `gridAngleDegrees`; o plano proposto v12 muda materialmente para espinha orientada pelo frame rotacionado por `gridAngleDegrees` e torna esse parâmetro obrigatório quando há `operationalSegments`. Antes de implementação/fechamento, a fonte de verdade da task precisa estar alinhada com o plano corrente para evitar execução contra objetivo geométrico contraditório.
- **TECH-053-01 (tecnico):** O plano aceita explicitamente um blocker angular esperado em `spine_entry→principal` e cita mitigação por override manual via decision-log. Embora não altere `ALLOWED_DEFLECTIONS_INTERNAL`, o critério de aceite não deixa claro que a task pode ser fechada com blocker técnico ativo sem mascarar a pendência construtiva. É necessário explicitar o estado esperado do blocker ao final da task e o gate humano/RT aplicável, sem tratá-lo como sucesso construtivo.

## Análise das invariantes permanentes

- **INV-CATALOGO-SEM-HOMOLOGACAO** — _ok_
  - Não alterar catálogo sem SKU homologado.
  - O plano declara que `src/lib/catalog/*` não será alterado e não propõe inclusão ou alteração de itens de catálogo.
- **INV-NAO-INVENTAR-SKU** — _ok_
  - Não inventar SKU.
  - Não há criação, renomeação ou uso de SKU novo no plano.
- **INV-DN100-LATERAL-5022** — _ok_
  - Não voltar DN100 como lateral 5022.
  - O plano não altera regras de laterais, dimensionamento DN relacionado à 5022, catálogo ou ADR-013.
- **INV-BLOCKERS-TECNICOS** — _ok_
  - Não relaxar blockers técnicos.
  - O plano preserva `ALLOWED_DEFLECTIONS_INTERNAL = [0°, 90°]`, não altera `network-angle-diagnostics.ts` e afirma que blockers não serão tratados como warnings. Há risco técnico não-terminal sobre aceite com blocker angular esperado, registrado em blocker técnico separado, mas sem relaxamento explícito da regra no código.
- **INV-MASCARAR-PENDENCIA** — _ok_
  - Não mascarar pendência.
  - As pendências conhecidas são explicitadas: relocation de `section_valve` é deferida, `MIN_HEADLAND_M` é documentado como premissa, e o blocker angular em `spine_entry→principal` é reconhecido. Recomenda-se apenas clarificar o gate de aceite para não converter blocker ativo em sucesso implícito.
- **INV-DOMINIO-FORA-UI** — _ok_
  - Não colocar lógica de domínio na UI.
  - O escopo fica em `src/lib/layout/hydraulic-connectivity.ts`, testes e documentação; `src/components/` e `src/app/` são declarados fora do escopo.
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — _ok_
  - Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.
  - O plano não altera `src/lib/bom.ts`, catálogo, ADR comercial ou lógica de BOM; declara explicitamente que BOM/comercial ficam congelados enquanto a topologia ainda está em validação.

## Metadata

- tokens_prompt: 0
- tokens_completion: 0
- custo_estimado_usd: 0

---

## Bloco estruturado (fonte de verdade do validador)

```json
{
  "task_id": "TASK-053",
  "schema_version": "1.0",
  "modelo_gpt": "gpt-5.5",
  "timestamp": "2026-05-23T12:10:00-03:00",
  "veredito": "reprovado",
  "blockers": [
    {
      "id": "MET-053-01",
      "categoria": "metodologico",
      "descricao": "O snapshot de `ai/current-task.md` ainda descreve a TASK-053 como v7, com objetivo de orientar a espinha pela direção real da principal e ignorar `gridAngleDegrees`; o plano proposto v12 muda materialmente para espinha orientada pelo frame rotacionado por `gridAngleDegrees` e torna esse parâmetro obrigatório quando há `operationalSegments`. Antes de implementação/fechamento, a fonte de verdade da task precisa estar alinhada com o plano corrente para evitar execução contra objetivo geométrico contraditório.",
      "invariante_id": null
    },
    {
      "id": "TECH-053-01",
      "categoria": "tecnico",
      "descricao": "O plano aceita explicitamente um blocker angular esperado em `spine_entry→principal` e cita mitigação por override manual via decision-log. Embora não altere `ALLOWED_DEFLECTIONS_INTERNAL`, o critério de aceite não deixa claro que a task pode ser fechada com blocker técnico ativo sem mascarar a pendência construtiva. É necessário explicitar o estado esperado do blocker ao final da task e o gate humano/RT aplicável, sem tratá-lo como sucesso construtivo.",
      "invariante_id": null
    }
  ],
  "invariantes": [
    {
      "id": "INV-CATALOGO-SEM-HOMOLOGACAO",
      "descricao": "Não alterar catálogo sem SKU homologado.",
      "status": "ok",
      "justificativa": "O plano declara que `src/lib/catalog/*` não será alterado e não propõe inclusão ou alteração de itens de catálogo."
    },
    {
      "id": "INV-NAO-INVENTAR-SKU",
      "descricao": "Não inventar SKU.",
      "status": "ok",
      "justificativa": "Não há criação, renomeação ou uso de SKU novo no plano."
    },
    {
      "id": "INV-DN100-LATERAL-5022",
      "descricao": "Não voltar DN100 como lateral 5022.",
      "status": "ok",
      "justificativa": "O plano não altera regras de laterais, dimensionamento DN relacionado à 5022, catálogo ou ADR-013."
    },
    {
      "id": "INV-BLOCKERS-TECNICOS",
      "descricao": "Não relaxar blockers técnicos.",
      "status": "ok",
      "justificativa": "O plano preserva `ALLOWED_DEFLECTIONS_INTERNAL = [0°, 90°]`, não altera `network-angle-diagnostics.ts` e afirma que blockers não serão tratados como warnings. Há risco técnico não-terminal sobre aceite com blocker angular esperado, registrado em blocker técnico separado, mas sem relaxamento explícito da regra no código."
    },
    {
      "id": "INV-MASCARAR-PENDENCIA",
      "descricao": "Não mascarar pendência.",
      "status": "ok",
      "justificativa": "As pendências conhecidas são explicitadas: relocation de `section_valve` é deferida, `MIN_HEADLAND_M` é documentado como premissa, e o blocker angular em `spine_entry→principal` é reconhecido. Recomenda-se apenas clarificar o gate de aceite para não converter blocker ativo em sucesso implícito."
    },
    {
      "id": "INV-DOMINIO-FORA-UI",
      "descricao": "Não colocar lógica de domínio na UI.",
      "status": "ok",
      "justificativa": "O escopo fica em `src/lib/layout/hydraulic-connectivity.ts`, testes e documentação; `src/components/` e `src/app/` são declarados fora do escopo."
    },
    {
      "id": "INV-LAYOUT-INSTAVEL-COMERCIAL",
      "descricao": "Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.",
      "status": "ok",
      "justificativa": "O plano não altera `src/lib/bom.ts`, catálogo, ADR comercial ou lógica de BOM; declara explicitamente que BOM/comercial ficam congelados enquanto a topologia ainda está em validação."
    }
  ],
  "recomendacao": "reprovado",
  "override_permitido": true,
  "justificativa_resumida": "Nenhuma invariante permanente foi marcada como violada, portanto não há blocker terminal. Porém o plano deve ser reprovado nesta rodada por inconsistência metodológica entre `current-task.md` v7 e o plano v12, além de risco técnico/metodológico de fechar a task com blocker angular esperado sem critério de aceite suficientemente explícito.",
  "metadata": {
    "tokens_prompt": 0,
    "tokens_completion": 0,
    "custo_estimado_usd": 0
  }
}
```
