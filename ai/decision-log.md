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

---

timestamp: 2026-05-22T20:17:39-03:00
task_id: TASK-001
decision_point: pos_planejamento
veredito_gpt: aprovado
decisao_humana: aprovado
responsavel: Kristyan Mota
justificativa: |
  Aprovação do plano da TASK-001 (Diagnóstico formal do software atual) após revisão do GPT Reviewer via /gpt-review TASK-001. O GPT aprovou o plano sem blockers (0 blockers identificados), todas as 7 invariantes permanentes retornaram status ok com justificativa específica, e o validate-structure retornou OK (exit 0) com transição válida aguardando_revisao_gpt → aguardando_aprovacao_humana. O único WARN reportado foi não-bloqueante e estrutural — override_permitido declarado pelo GPT=true mas derivado pelo validador=null porque não há blockers a serem permitidos/negados (comportamento esperado em plano aprovado limpo; mesmo WARN apareceu em TOOL-002). A TASK-001 é estritamente documental (Classe A): produz docs/relatorios/2026-05-22-TASK-001.md, atualiza tasks/TASK-001-diagnostico-software-atual.md e tasks/backlog.md, e usa ai/current-task.md como ciclo de governança. A implementação permanece proibida em src/** (motor hidráulico, layout, catálogo, BOM, PDF, UI/mapa intocados). As ~14 premissas RT/campo de docs/metodologia/12-primissas-provisorias-e-revisao-rt.md serão apenas INVENTARIADAS no relatório, sem alteração de valores nem de status. Nenhum ADR novo será criado. O Mapa Mestre (tasks/TASK-024-mapa-mestre-tasks.md) é fonte do diagnóstico, não destino — não será modificado. Predecessor docs/relatorios/2026-05-19-diagnostico-software-atual.md (commit 23609bc, 400 testes, desatualizado em 7 dias) preservado fisicamente como registro histórico. A observação editorial fraca do GPT (citar evidência inline ao marcar critérios como concluídos) já está prevista no passo 6 da sequência operacional do /implementar do plano aprovado. Limitação V1 herdada da TOOL-002 mantida: tokens_prompt=0, tokens_completion=0, custo_estimado_usd=0 vieram zerados do JSON do modelo e não constituem custo real — referência de cobrança é o dashboard/fatura OpenAI; TOOL-004 futura captura usage real.
override: false
ajustes_aplicados: ["nenhum — plano aprovado limpo sem ajustes adicionais do GPT", "observação editorial fraca do GPT (citar evidência inline em critérios de aceite) já contemplada no passo 6 da sequência operacional do /implementar"]
hash_gpt_review: 3dc28c985f228b5b62e5bdea8418ac7e392957b208985608198bb3b911cef789

---

timestamp: 2026-05-22T21:02:18-03:00
task_id: TASK-004B
decision_point: pos_planejamento
veredito_gpt: aprovado_com_ajustes
decisao_humana: aprovado_com_ajustes
responsavel: Kristyan Mota
justificativa: |
  Aprovação do plano da TASK-004B (Pressão real por derivação / cumPrincipalHfM) após revisão do GPT Reviewer via /gpt-review TASK-004B. O GPT aprovou o plano com 2 blockers (TEC-004B-001 técnico + MET-004B-001 metodológico), 0/7 invariantes violadas, e validate-structure retornou OK (exit 0) com 1 WARN não-bloqueante estrutural (override_permitido declarado=true vs derivado=null — comportamento esperado quando 0 invariantes violadas). Ambos os blockers do GPT foram aceitos e endereçados via OPÇÃO A em cada um, conforme decisão explícita do usuário ("Aprovado opção A"). Entry registrada pelo agente em nome do usuário sob autorização explícita verbalizada pela mensagem "Aprovado opção A" seguida de /implementar — interpretação: usuário aprovou plano com Opção A para os dois blockers do GPT. Resolução TEC-004B-001 (Opção A): a detecção do campo modelLimitations.pressureClassModel = "exact_per_derivation" deve exigir AMBOS cumPrincipalHfM != null E adutoraHfM != null em todos os ramais/laterais relevantes — implementado via helper pure derivePressureClassModel exportada de hydraulic-sizing.ts e testada isoladamente. Resolução MET-004B-001 (Opção A): escopo de testes AMPLIADO para incluir auditoria/adaptação em integration.test.ts, bom.test.ts e pipeline-diagnostics.test.ts caso classificações de PN mudem. Se houver mudança de classificação correta nesses testes (não relaxamento de blocker), o agente atualiza as expectations citando explicitamente a mudança no relatório de fechamento. Se houver regressão semântica inesperada (não mera reclassificação correta), o agente PARA e REPORTA antes de continuar. A TASK-004B é Classe A motor hidráulico: produz mudança em src/lib/layout/hydraulic-sizing.ts (5 pontos cirúrgicos), 6 testes novos T04B-1..T04B-6 em pressure-class.test.ts, arquivo da task tasks/TASK-004B-pressao-real-derivacao.md, atualização do backlog e relatório docs/relatorios/2026-05-22-TASK-004B.md. Escopo proibido reforçado: src/lib/catalog/aspersores.ts, src/lib/bom.ts, src/lib/pdf/*, src/components/**, src/app/**, src/lib/layout/secondary-sizing.ts, src/lib/layout/laterais.ts e demais arquivos de geometria, docs/metodologia/12-premissas-provisorias-e-revisao-rt.md, docs/metodologia/01-regras-bloqueantes.md, docs/metodologia/03-hidraulica.md, ADR-008, Mapa Mestre. Limitação V1 herdada da TOOL-002 mantida: tokens_prompt=0, tokens_completion=0, custo_estimado_usd=0 vieram zerados do JSON do modelo (não da API); referência de cobrança é o dashboard/fatura OpenAI; TOOL-004 futura captura usage real.
override: false
ajustes_aplicados: ["TEC-004B-001 (Opção A): detecção de pressureClassModel exige AMBOS cumPrincipalHfM E adutoraHfM nos ramais/laterais — implementar via helper derivePressureClassModel pure exportada", "MET-004B-001 (Opção A): escopo de testes ampliado para incluir integration.test.ts, bom.test.ts, pipeline-diagnostics.test.ts se houver mudança correta de classificação; parar e reportar se regressão semântica inesperada", "Entry registrada pelo agente em nome do usuário sob autorização explícita da mensagem 'Aprovado opção A'"]
hash_gpt_review: 35c7ba49c15e9ad477581042833ff964b82eda9619adeb7803c5bb87d9e59efa

---

timestamp: 2026-05-22T21:52:58-03:00
task_id: TASK-052
decision_point: pos_planejamento
veredito_gpt: aprovado_com_ajustes
decisao_humana: aprovado_com_ajustes
responsavel: Kristyan Mota
justificativa: |
  Aprovação do plano da TASK-052 (Homologar premissa de operação rotativa por setor) após revisão do GPT Reviewer via /gpt-review TASK-052. GPT retornou veredito `aprovado_com_ajustes` com 1 blocker (BLK-MET-001 metodológico) e 0/7 invariantes violadas; validate-structure OK (exit 0) com 1 WARN não-bloqueante estrutural (`override_permitido` declarado=true vs derivado=null — comportamento esperado quando 0 invariantes violadas). O usuário (RT Kristyan Mota) concordou explicitamente com a análise do agente de que o blocker BLK-MET-001 é uma observação sobre o SNAPSHOT INTERNO DESATUALIZADO do prompt do GPT, não sobre o plano da TASK-052: o snapshot embutido em scripts/ai/build-review-prompt.mjs (ou similar) cita contagens estáticas defasadas (vitest 817/817 + tooling 20/20) que provavelmente foram escritas durante TOOL-001 quando esses eram os valores reais; as contagens citadas no claude-report.md da TASK-052 (vitest 836/836 + tooling 27/27) são os valores REAIS atuais verificados in-loco nesta sessão pós-TASK-047 (que subiu vitest para 826) e pós-TASK-004B (que subiu para 836). Não é responsabilidade da TASK-052 corrigir o snapshot interno do prompt do GPT Reviewer — esse ajuste fica como pendência de tooling futura (sucessor TOOL-XXX, provavelmente parte da TOOL-001 V2 ou TOOL-004). A TASK-052 prossegue documental: corrige descrição contraditória da premissa "Critério de vazão de projeto do ramal" em docs/metodologia/12-premissas-provisorias-e-revisao-rt.md (que afirmava "todos os aspersores ativos simultaneamente" quando o código fazia max(...)) e promove status PENDENTE_REVISAO_RT_BRASMAQUINAS → APROVADO_RT, refletindo a confirmação operacional do RT de 2026-05-22 de que a operação Brasmáquinas é rotativa por setor (1 setor ativo por vez). O código em secondary-sizing.ts:180-183 já implementava o critério correto desde sua origem — TASK-052 NÃO toca src/**, é estritamente documental. Entry registrada pelo agente em nome do usuário sob autorização explícita da mensagem "EU concordo com você que o GPT está errado nesse caso, precisamos atualizar a informação dele. Então prossiga com a aprovação." Pendência de tooling identificada: atualizar snapshot do prompt do GPT Reviewer com contagens dinâmicas em vez de estáticas (TOOL-XXX futura).
override: false
ajustes_aplicados: ["BLK-MET-001 (justificativa): snapshot estático do prompt do GPT defasado (817/20 — provavelmente baseline TOOL-001) vs valores reais atuais 836/27 verificados in-loco; claude-report cita valores reais corretos", "Sucessor identificado: TOOL-XXX futura para atualizar snapshot do prompt do GPT Reviewer (contagens dinâmicas em vez de estáticas)", "Entry registrada pelo agente em nome do usuário sob autorização explícita 'EU concordo com você que o GPT está errado nesse caso... prossiga com a aprovação'"]
hash_gpt_review: 8d15fb83de55e6e64f36ee3de6becb9d3aa86540e1cb4dcbd1a1dc7ce06938ab
