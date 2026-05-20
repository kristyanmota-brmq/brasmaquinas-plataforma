# ADR-005 — Registros manuais de seção VIQUA PN80

**Data:** 2026-05-19
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

O motor de construtibilidade identifica pontos de controle do tipo `section_valve` — locais no campo onde uma coluna física é dividida entre dois setores, exigindo um registro de seção para isolar o fluxo. Antes de TASK-006A/006B, esses pontos geravam blocker de proposta (`valvulasSemCatalogoCount > 0`) porque o catálogo não continha nenhum SKU de válvula/registro aprovado.

TASK-006A analisou 287 itens candidatos do banco interno da Brasmáquinas. A análise identificou 7 SKUs VIQUA soldáveis adequados para operação manual de seção (DN32, DN35, DN50, DN75, DN100). O RT interno aplicou a regra: todos os registros VIQUA na base interna recebem `classePressao: "PN80"` e `fontePressao: "homologacao_interna_brasmaquinas"`.

---

## Decisão

Decidimos:

1. Cadastrar os 7 SKUs VIQUA soldáveis em `REGISTROS_SECAO_MANUAL` no catálogo com `classePressao: "PN80"`, `pressaoNominalMca: 80` e `fontePressao: "homologacao_interna_brasmaquinas"`.
2. A função `selectRegistroSecao(diametroMm)` retorna somente o item com `prioridade: "primario"` para o DN solicitado (tolerância ±2 mm); retorna `undefined` se não houver match.
3. A BOM inclui registros manuais de seção quando `section_valve` CPs têm DN coberto pelo catálogo.
4. O controle automático (solenoide, hidráulico, elétrico) está fora do escopo desta decisão — não há catálogo aprovado para esse tipo; um CP que exigir controle automático continua gerando blocker.
5. Um blocker residual permanece para DNs sem SKU primário aprovado.

---

## Alternativas consideradas

### Alternativa A — Classificação genérica de PN por dados do fornecedor

**Descrição:** Usar o PN informado pelo fornecedor no banco de dados sem regra interna.

**Por que foi descartada:** O banco de dados interno da Brasmáquinas continha registros VIQUA sem `classePressao` preenchida. Sem regra interna, esses itens ficariam com PN desconhecido, impedindo a verificação de segurança hidráulica.

### Alternativa B — Incluir válvulas automáticas (solenoide/hidráulica) no mesmo escopo

**Descrição:** Ampliar para qualquer tipo de válvula de seção, incluindo acionamento automático.

**Por que foi descartada:** Válvulas automáticas têm família, DN, PN, tipo de atuador e preço completamente diferentes dos registros manuais. Misturar os dois tipos no mesmo catálogo inicial criaria ambiguidade no seletor e risco de escolha errada. Separar o escopo força uma segunda decisão explícita quando o catálogo automático for criado.

### Alternativa C — Manter blocker e aguardar catálogo completo antes de qualquer inclusão

**Descrição:** Não cadastrar nenhum SKU até que o catálogo de válvulas esteja completo (manual + automático).

**Por que foi descartada:** Blocker ativo impede emissão de qualquer proposta com setorização. Registros manuais VIQUA são adequados para a maioria dos projetos atuais da Brasmáquinas. Desbloquear a emissão para DNs cobertos sem esperar o catálogo completo tem valor imediato.

---

## Consequências

### Positivas

- `section_valve` CPs com DN coberto (32, 35, 50, 75, 100 mm) são resolvidos na BOM com SKU e preço corretos.
- Blocker de proposta é removido para projetos cujos DNs de lateral estão cobertos.
- A regra `fontePressao: "homologacao_interna_brasmaquinas"` torna rastreável a origem da classificação de PN.

### Negativas / trade-offs

- DNs sem SKU primário aprovado (ex.: 40, 60, 125 mm) ainda geram blocker residual. Ampliar o catálogo requer nova aprovação interna da Brasmáquinas.
- `ControlPoint.status` permanece `"pending"` mesmo após resolução na BOM — a distinção entre "sem SKU" e "com SKU, aguarda montagem" não está modelada nesta versão.
- Controle automático permanece inteiramente bloqueado — qualquer projeto que exija abertura/fechamento automatizado de seção não pode ser proposto até que o catálogo de válvulas automáticas seja criado.

### Neutras

- Warning `"Registros manuais de seção incluídos na BOM. Controle automático não contemplado."` é emitido sempre que `valvulasResolvidasCount > 0` — informa o campo sem bloquear a proposta.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/catalog/aspersores.ts` | interface `RegistroSecao`; `REGISTROS_SECAO_MANUAL` com 7 SKUs; `selectRegistroSecao()` |
| `src/lib/bom.ts` | `buildBOM` mapeia `section_valve` CPs → registros; `BOMResult.meta` ganha `valvulasResolvidasCount` e `registrosManuaisSecaoCount` |

---

## Classificação

- decisão comercial (aprovação interna Brasmáquinas)
- regra técnica (PN80 por homologação interna)
- governança de bloqueio/emissão

---

## Referências

- TASK-006A — Saneamento e homologação do catálogo de válvulas/registros de seção
- TASK-006B — BOM automática de registro manual de seção
- `docs/relatorios/2026-05-19-TASK-006B.md`
- `docs/relatorios/catalogo-valvulas-candidatas.md`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
