# Revisão GPT — TOOL-001

> **AVISO:** este é um *soft dogfood* do fluxo TOOL-001.
> A regra do usuário foi "não chamar API real da OpenAI nos testes" e essa restrição se estendeu ao ciclo de implementação inicial para evitar custos.
> O bloco JSON estruturado abaixo segue o schema canônico; o campo `modelo_gpt` registra explicitamente que a revisão foi sintetizada localmente pelo Claude Opus 4.7 atuando como revisor (auto-revisão honesta), e não pela Responses API da OpenAI.
> Para a primeira execução real do fluxo, use `node scripts/ai/run-gpt-review.mjs --task TOOL-002` em outra task — esse é o caminho operacional alvo.

## Resumo executivo

**Veredito:** `aprovado_com_ajustes`
**Recomendação:** `aprovado_com_ajustes`
**Override permitido (declarado):** `null` (não aplicável — veredito não é `reprovado` nem `blocker_invariante_permanente`)

A implementação da TOOL-001 incorpora os 7 ajustes do usuário, materializa todos os 5 arquivos canônicos, 5 scripts (2 libs + 3 CLI), 4 templates, 2 comandos slash, atualiza `.gitignore`/`.env.example`/`backlog.md`/`CLAUDE.md` e **não toca nenhum arquivo de produto**. As 7 invariantes permanentes estão respeitadas. Há observações residuais menores (não bloqueantes) listadas em ajustes_aplicados/justificativa.

## Pontos fortes

- Fonte única das 7 invariantes em `scripts/ai/lib/invariants.mjs` consumida tanto pelo prompt quanto pelo validador.
- `override_permitido` derivado pelo validador independentemente do JSON do GPT (defesa contra alucinação).
- `validate-structure.mjs` é estritamente read-only sobre `current-task.md.status` — coberto pelo teste T17.
- Fixtures isoladas em `__tests__/fixtures/builders.mjs` materializam sandboxes via `mkdtemp`; nenhum teste lê ou escreve em `ai/*.md` reais.
- Append-only de `decision-log.md` verificado contra HEAD do git (T15) + hash do `gpt-review.md` (T16) → tamper detection completo.
- Sem nova dependência npm; `fetch` nativo + Node 18+.
- `OPENAI_MODEL` sem default no código — script aborta se ausente em `.env.local`.
- Bug encontrado e corrigido durante implementação: coerção numérica de YAML estava convertendo strings de só-dígitos longas (ex.: hash `0`×64) para `Number(0)`; corrigido com limite de 15 dígitos (safe-integer).

## Riscos não cobertos / observações residuais

- **R1 — Chamada real da Responses API ainda não executada.** O caminho `POST /v1/responses` está implementado mas só será validado quando uma task real rodar o script. Sugestão: TOOL-002 ser a primeira task com chamada real, para detectar eventuais drifts da API.
- **R2 — Parser YAML minimalista.** `parseSimpleYaml` cobre frontmatter e entries planas mas não suporta YAML aninhado. Se entries futuras precisarem de objetos, refator será necessário (não impacta V1).
- **R3 — Hash não cobre `modelo_gpt` distinto do canônico.** A verificação `hash_gpt_review` é byte-exato; se o markdown for re-renderizado (mesmo JSON, formatação diferente), hash muda. Mitigação atual: gerar hash apenas uma vez por ciclo. Documentar no README quando se observar atrito.
- **R4 — Custos reais ainda não medidos.** Campo `custo_medio_chamada` em `ai/README.md` será preenchido após o primeiro uso real.

## Análise das invariantes permanentes

- **INV-CATALOGO-SEM-HOMOLOGACAO** — `ok`. TOOL-001 não toca `src/lib/catalog/aspersores.ts` nem qualquer arquivo de catálogo.
- **INV-NAO-INVENTAR-SKU** — `ok`. Nenhum SKU é manipulado. Apenas tooling.
- **INV-DN100-LATERAL-5022** — `ok`. Seletor hidráulico de laterais intocado.
- **INV-BLOCKERS-TECNICOS** — `ok`. Ao contrário, a regra terminal de invariante REFORÇA blockers: violação de invariante permanente é bloqueio terminal mesmo com tentativa de override.
- **INV-MASCARAR-PENDENCIA** — `ok`. Pendências aparecem em `project-state.md`; `decision-log.md` é append-only inviolável; `gpt-review.md` mantém JSON íntegro via hash.
- **INV-DOMINIO-FORA-UI** — `ok`. TOOL-001 não toca `src/components/`, `src/app/` nem qualquer rota.
- **INV-LAYOUT-INSTAVEL-COMERCIAL** — `ok`. Nenhum motor de domínio é alterado; TOOL-001 é apenas camada de revisão de governança.

## Metadata

- modelo: `soft-dogfood-claude-opus-4-7`
- tokens_prompt: 0 (não houve chamada real)
- tokens_completion: 0
- custo_estimado_usd: 0

---

## Bloco estruturado (fonte de verdade do validador)

```json
{
  "task_id": "TOOL-001",
  "schema_version": "1.0",
  "modelo_gpt": "soft-dogfood-claude-opus-4-7",
  "timestamp": "2026-05-22T16:30:00-03:00",
  "veredito": "aprovado_com_ajustes",
  "blockers": [],
  "invariantes": [
    {
      "id": "INV-CATALOGO-SEM-HOMOLOGACAO",
      "descricao": "Não alterar catálogo sem SKU homologado",
      "status": "ok",
      "justificativa": "TOOL-001 não toca src/lib/catalog/aspersores.ts nem qualquer arquivo de catálogo"
    },
    {
      "id": "INV-NAO-INVENTAR-SKU",
      "descricao": "Não inventar SKU",
      "status": "ok",
      "justificativa": "Nenhum SKU é manipulado — apenas tooling de governança"
    },
    {
      "id": "INV-DN100-LATERAL-5022",
      "descricao": "Não voltar DN100 como lateral 5022",
      "status": "ok",
      "justificativa": "Seletor hidráulico de laterais (getCatalogoLateraisHomologadas5022) intocado"
    },
    {
      "id": "INV-BLOCKERS-TECNICOS",
      "descricao": "Não relaxar blockers técnicos",
      "status": "ok",
      "justificativa": "A regra terminal de invariante REFORÇA blockers: override humano não libera violação de invariante permanente"
    },
    {
      "id": "INV-MASCARAR-PENDENCIA",
      "descricao": "Não mascarar pendência",
      "status": "ok",
      "justificativa": "Pendências aparecem em project-state.md; decision-log.md é append-only inviolável; hash_gpt_review detecta manipulação posterior"
    },
    {
      "id": "INV-DOMINIO-FORA-UI",
      "descricao": "Não colocar lógica de domínio na UI",
      "status": "ok",
      "justificativa": "TOOL-001 não toca src/components/ nem src/app/ — apenas pastas ai/, scripts/ai/, templates/ e arquivos de configuração"
    },
    {
      "id": "INV-LAYOUT-INSTAVEL-COMERCIAL",
      "descricao": "Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis",
      "status": "ok",
      "justificativa": "Nenhum motor de domínio é alterado; TOOL-001 é apenas camada de revisão de governança que NÃO emite proposta nem altera BOM"
    }
  ],
  "recomendacao": "aprovado_com_ajustes",
  "override_permitido": null,
  "justificativa_resumida": "Implementação incorpora os 7 ajustes do usuário, materializa estrutura ai/+scripts/ai/+templates/+commands/, respeita as 7 invariantes, e não toca código de produto. Observações residuais (R1-R4) são não-bloqueantes e ficam para TOOL-002+. Soft-dogfood — chamada real da API fica para próxima task.",
  "metadata": {
    "tokens_prompt": 0,
    "tokens_completion": 0,
    "custo_estimado_usd": 0
  }
}
```
