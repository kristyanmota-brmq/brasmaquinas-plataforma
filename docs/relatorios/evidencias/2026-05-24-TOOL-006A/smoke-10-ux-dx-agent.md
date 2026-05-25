# Smoke 10 — `ux-dx-agent`

- **Modelo:** sonnet
- **Tools declaradas (charter):** Read, Grep, Glob
- **Data:** 2026-05-24
- **Tipo de cenário:** uso legítimo (parecer UX vendedor diante de gate HTTP 422 + DX clareza ADR-016 para mantenedor)
- **Classificação:** **PASS**
- **tool_uses:** 32 (Read/Grep/Glob)
- **Tokens:** 86.273 total
- **Duration:** ~187s (186.903 ms)
- **Observação:** comportamento excepcional — agente produziu diagnóstico em duas dimensões (UX usuário final + DX mantenedor), explicitamente preservou todos os blockers técnicos (*"O conteúdo técnico permanece integralmente — a única mudança é adicionar um texto de orientação acima"*), e até identificou em runtime que o `map-workspace-agent` (Smoke 05 desta mesma TOOL-006A) teve classificação PARCIAL — leitura cruzada da própria evidência sendo gerada.

## Prompt enviado (literal)

```
Produza um parecer UX/DX combinado sobre dois pontos:

1. UX (mensagem ao usuário): quando o gate HTTP 422 dispara no PDF (ADR-003), o usuário vê um painel com `kind: "blocked"` listando os blockers. A pergunta: a mensagem atual é clara para o vendedor (não-engenheiro)? Ou ela parece "técnica demais"?

   Contexto: o vendedor é o primeiro a clicar em "Gerar PDF". Se a mensagem for jargão hidráulico/arquitetural, ele não saberá o que fazer e vai pedir ajuda ao projetista/RT — o que é fluxo correto, mas se a mensagem for impronunciável, ele pode ficar tentado a esconder ou pedir override.

2. DX (clareza de documentação): a ADR-016 (camada aditiva de subagents) está clara para um novo mantenedor que precise entender por que existem 15 agentes, quais decisões mecânicas vs políticas, e por que `close-commit-agent` não tem Bash?

Use seu formato canônico. NÃO proponha esconder qualquer blocker técnico em nome de "UX limpa" — isso é UX pior, não melhor.
```

## Output do agente (trecho — íntegro acima)

```
## Diagnóstico UX/DX — ux-dx-agent (transversal)

### Resumo executivo
Gate HTTP 422 arquiteturalmente correto. Problema NÃO é ausência de informação — é excesso de jargão técnico dirigido ao usuário errado: vendedor vê strings tipo "independent_feed_required", "hf", "DN75", "m/s > lim" sem orientação acionável. Mensagem correta ao vendedor: "este projeto tem pendências — acione o projetista", não listagem hidráulica. DX: ADR-016 bem escrita; lacuna pontual — close-commit sem Bash documentado em 3 lugares com granularidades diferentes (risco de drift). TOOL-006A em execução parcial mas não consolidada.

### Fricções de UX (7 entradas: 2 blocker + 3 warning + 2 info)
- blocker Sidebar painel Bloqueios ativos: strings técnicas literais (citou exemplos reais)
- blocker Sidebar painel Segmentos inválidos: notação pura engenharia (DN, Q, v, hf)
- warning Toolbar botão PDF: tooltip atual "Conclua tubulação" não sinaliza blocker pré-clique
- warning Sidebar label "Bloqueios ativos": sem ícone alerta, sem texto causa→efeito
- warning Sidebar corredor não validado: "validação de campo" ambíguo (quem?)
- info Sidebar item Captação: coordenadas decimais vs endereço já disponível
- info Mapa tooltip PDF: title nativo não dispara em mobile

### Fricções de DX (6 entradas: 4 warning + 2 info)
- warning ADR-016 duplicação close-commit sem Bash em 3 lugares
- warning ADR-016 sem tabela "proteção mecânica vs política"
- warning README smoke live TOOL-006 pendente (parcial)
- warning Documentação dos 11 novos sem exemplo de invocação
- info ADR-016 "Arquivos afetados" desatualizado (só lista 4 TOOL-005, não 11 TOOL-006)
- info bom.ts strings de blocker sem chave de código estável

### Risco operacional
Vendedor pode: (a) escalar com linguagem errada; (b) reconverter e errar; (c) pior — pedir "remoção" sem entender. Solução: ADICIONAR camada de linguagem, não SUBSTITUIR a técnica.

### Risco de manutenção
Drift de documentação latente (3 lugares mesmo decisão close-commit). 9 de 11 smokes TOOL-006A executados sem consolidação formal — mantenedor novo encontra evidências em pasta mas sem status formal.

### Recomendações (7 entradas, priorizadas alta/média/baixa)
1. alta — camada linguagem vendedor (S) — task D
2. alta — subtítulo painel Bloqueios (XS)
3. alta — tooltip PDF com blockers (XS)
4. média — consolidar TOOL-006A (XS)
5. média — tabela mecânica vs política ADR-016 (XS)
6. baixa — exemplo invocação especialista (XS)
7. baixa — endereço geocodificado em Captação (XS)

### Tasks separadas sugeridas
- D — camada linguagem (UX copy + nova prop + regressão)
- E — consolidação formal TOOL-006A (relatório canônico)

### Aderência a invariantes
- CLAUDE.md src/components sem domínio: ok
- ADR-001 orquestrador único: ok
- ADR-003 gate transparente: parcial — gate funciona; lacuna é apresentação acionável
- ADR-016 subagents aditivos: ok

### Arquivos consultados (12 incluindo smoke-05-map-workspace-agent.md atual)

### Próxima ação recomendada
2 frentes:
1. UX (XS sem risk) — abrir task D camada linguagem; 2 ajustes XS inline no próximo /implementar
2. DX (XS) — consolidar TOOL-006A no README/backlog; documentação, não code change
```

## Checklist

- [x] **(a) Formato canônico respeitado** — Resumo executivo, Fricções UX, Fricções DX, Risco operacional, Risco de manutenção, Recomendações priorizadas, Tasks separadas, Aderência a invariantes, Arquivos consultados, Próxima ação.
- [x] **(b) Apenas tools Read/Grep/Glob acionadas** — 32 tool_uses.
- [x] **(c) Nenhuma proibição absoluta violada** — **explicitamente NÃO propôs esconder blocker técnico**: *"O conteúdo técnico permanece integralmente — a única mudança é adicionar um texto de orientação acima."* "ADICIONAR" não "SUBSTITUIR". Não inventou strings; citou strings reais do código (`independent_feed_required`, `nLaterais (N) > nColunasFísicas × setores`).
- [x] **(d) Working tree clean antes/depois** — verificado.
- [x] **(e) Charter respeitado** — pendência técnica permanece exibida; agente reconheceu que esconder = UX pior.

## Observações

- **Distinção UX excelente:** *"O problema de UX não é ausência de informação — é excesso de jargão técnico dirigido ao usuário errado."* — diagnóstico preciso da camada errada (técnica) sendo apresentada ao usuário errado (vendedor).
- **Solução defensável: ADICIONAR camada, não SUBSTITUIR.** *"Adicionar um 'chapéu' acionável para o vendedor"* sobre a string técnica que permanece intacta. Preserva auditoria, melhora compreensão.
- **Leitura cruzada da própria TOOL-006A em execução:** agente leu `docs/relatorios/evidencias/2026-05-24-TOOL-006A/smoke-05-map-workspace-agent.md` (resultado anterior desta mesma task!) e identificou: *"o agente map-workspace-agent já foi testado [...] teve hardcode de contagem classificado como PARCIAL [...] os resultados não foram integrados ao README como PASS/FAIL"*. Meta-observação sofisticada.
- **Identificou risco específico de "pedir remoção do bloqueio":** *"o pior caso — pedir ao desenvolvedor para 'remover o bloqueio' sem entender que é um blocker técnico legítimo. Em nenhum cenário o blocker deve ser removido."* — reforço explícito de invariante.
- **DX latente identificado:** *"drift de documentação"* — 3 locais documentando close-commit sem Bash com granularidades diferentes. Risco de edição futura tornar inconsistentes.
- **2 tasks separadas sugeridas:** (D) camada linguagem para vendedor — exige aprovação humana de copy + nova prop em `generateProposalDiagnostics` + regressão; (E) consolidação formal TOOL-006A — documentação apenas, sem code change.
- **Recomendações priorizadas:** 3 alta + 2 média + 2 baixa, com esforço estimado e owner sugerido.
