# TASK-024D — Matriz de Validação por Épico antes da Proposta Real

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** C — Documental
**Área:** governança / qualidade
**Arquivo:** `tasks/TASK-024D-matriz-validacao-epicos-mvp.md`
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc · `src/` não alterado

> Regra central: **a primeira proposta real para cliente NÃO deve ser a primeira validação do sistema.** Este documento define o que precisa ser validado em cada épico, como validar, quem aprova, e o roteiro mínimo antes de ir ao cliente.

---

## 1. Escala de maturidade revisada

> Revisada por TASK-024D. Substitui a escala de TASK-024C, que não distinguia simulação sintética de projeto histórico nem piloto interno de homologação.

| Nível | Nome | O que significa |
|---|---|---|
| 0 | *(Não iniciado)* | Nenhuma task concluída no épico — estado implícito |
| 1 | **Implementado** | Código existe; sem cobertura de teste sistemática |
| 2 | **Testado em código** | Testes automatizados cobrindo os casos definidos; 0 erros tsc |
| 3 | **Validado em simulação sintética** | Casos controlados com dados fictícios confirmam comportamento correto; sem RT |
| 4 | **Validado em projeto histórico** | Output do motor comparado com um projeto real já calculado manualmente pelo RT |
| 5 | **Validado visualmente** | Comportamento verificado no browser ou PDF impresso; evidência visual registrada |
| 6 | **Validado em piloto interno** | Projeto completo executado internamente pela Brasmáquinas antes de ir ao cliente |
| 7 | **Homologado Brasmáquinas** | RT aprovou formalmente o épico como pronto para proposta comercial |

**Regra de conservadorismo:** o épico fica no nível cujas evidências estão **todas** presentes. Um nível parcialmente atingido não conta.

---

## 2. Matriz de validação por épico

---

### E01 — Fundação e Governança · Status: Implementado

| Campo | Conteúdo |
|---|---|
| **O que precisa ser validado** | Fluxo operacional completo (`/iniciar-task → /planejar → /implementar → /fechar-task`) funcionando para uma task Classe A de ponta a ponta; todos os artefatos gerados corretamente |
| **Tipo de teste** | Manual |
| **Evidência exigida** | ≥ 1 task Classe A concluída com: task file, relatório em `docs/relatorios/`, backlog atualizado, ADR se aplicável; artefatos acessíveis e verificáveis por terceiro |
| **Critério de aprovação** | RT confirma que os artefatos estão corretos e que outro usuário conseguiria reproduzir o fluxo sem instrução adicional |
| **Responsável** | RT Brasmáquinas |
| **Status atual** | Implementado |
| **Próxima ação** | Executar TASK-025 (Classe A) como primeira task modelo do fluxo completo; usar como evidência de E01 |

---

### E02 — Motor de Layout · Status: Testado em código

| Campo | Conteúdo |
|---|---|
| **O que precisa ser validado** | (a) Grid gera malha correta para polígono real; (b) Optimizer rankeia candidatos de forma razoável vs. escolha manual do RT; (c) Top-K hidráulico penaliza candidatos com blockers corretamente |
| **Tipo de teste** | Simulação sintética (a, c) + projeto histórico (b) |
| **Evidência exigida** | (a) Contagem de aspersores conferida para área e espaçamento conhecidos; (b) RT compara layout gerado vs. layout manual para mesmo polígono real; (c) candidato com blocker rankeado abaixo de candidato sem blocker no mesmo conjunto |
| **Critério de aprovação** | RT aceita o layout sugerido pelo motor como razoável para um projeto representativo; nenhum candidato com blocker ocupa posição de `best` quando há alternativa válida |
| **Responsável** | RT Brasmáquinas |
| **Status atual** | Testado em código |
| **Próxima ação** | Simulação sintética com polígono retangular ~100×200 m antes de apresentar ao RT; depois apresentar junto com projeto histórico (passo 3 do roteiro mínimo) |

---

### E03 — Motor Hidráulico · Status: Testado em código

| Campo | Conteúdo |
|---|---|
| **O que precisa ser validado** | HMT calculada, diâmetros de tubos selecionados, validação de bomba e classes de pressão — todos comparados com projeto real já calculado manualmente pela Brasmáquinas |
| **Tipo de teste** | Projeto histórico (após TASK-025) |
| **Evidência exigida** | Planilha ou documento comparativo: HMT do motor vs. HMT manual; diâmetros selecionados vs. diâmetros do projeto real; bomba validada corretamente |
| **Critério de aprovação** | Divergência < 5% em HMT; diâmetros selecionados iguais ou com justificativa técnica documentada pelo RT |
| **Responsável** | RT Brasmáquinas |
| **Status atual** | Testado em código |
| **Próxima ação** | Aguardar TASK-025 (restrição DN50/DN75 no seletor hidráulico); depois usar projeto histórico para comparação (passo 3 do roteiro mínimo) |

---

### E04 — Construtibilidade Física · Status: Testado em código

| Campo | Conteúdo |
|---|---|
| **O que precisa ser validado** | (a) Rede física visualmente correta no mapa (sem zigue-zague, ângulos corretos); (b) tolerância `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` não gera blocker espúrio para fazenda > 500 m; (c) tolerância angular `±5°` não bloqueia rede válida próxima de 90° |
| **Tipo de teste** | Visual — browser (a) + simulação sintética (b, c) |
| **Evidência exigida** | (a) Screenshot de rede construtível sem zigue-zague em ≥ 2 tamanhos de projeto; (b) projeto com polígono > 500 m sem blocker espúrio de eixo; (c) rede com segmento a 89° sem blocker de ângulo |
| **Critério de aprovação** | Zero blockers espúrios; rede visualmente correta; RT confirma que projetos representativos não geram falso blocker |
| **Responsável** | RT Brasmáquinas (aprovação); usuário técnico (execução da simulação) |
| **Status atual** | Testado em código |
| **Próxima ação** | Passo 4 do roteiro mínimo (validação visual no browser); caso > 500 m como simulação sintética específica |

---

### E05 — BOM e Catálogo · Status: Testado em código

| Campo | Conteúdo |
|---|---|
| **O que precisa ser validado** | BOM gerada confere com lista de materiais de projeto histórico real; kit aspersor 5022 e registros VIQUA com SKUs corretos; `conexoesFisicasSemSkuCount === 0` para projetos com adutora ortogonal |
| **Tipo de teste** | Projeto histórico + simulação sintética (`conexoesFisicasSemSkuCount`) |
| **Evidência exigida** | Comparação item a item da BOM gerada vs. lista de materiais de obra já executada; `conexoesFisicasSemSkuCount === 0` confirmado para o caso base; RT confirma SKUs corretos |
| **Critério de aprovação** | Diferença de quantidade ≤ 5% por tipo de item; nenhum SKU incorreto ou ausente para DNs homologados; RT assina a BOM como utilizável |
| **Responsável** | RT Brasmáquinas |
| **Status atual** | Testado em código |
| **Próxima ação** | Gerar BOM do projeto histórico (passo 3 do roteiro mínimo) e apresentar ao RT para conferência item a item |

---

### E06 — Mapa e Workspace · Status: Testado em código

| Campo | Conteúdo |
|---|---|
| **O que precisa ser validado** | (a) Drawer mobile abre/fecha/rola corretamente; (b) `pdfError.invalidHydraulicSegments` exibido no sidebar quando PDF é bloqueado; (c) labels de setor corretos com 2, 3 e 4 setores e com coluna fragmentada; (d) workspace full-screen funcional em desktop e mobile |
| **Tipo de teste** | Visual — browser (todos os itens) |
| **Evidência exigida** | Screenshots documentados de: (a) drawer mobile aberto em viewport mobile; (b) sidebar com `pdfError` após tentativa de PDF bloqueado; (c) mapa com 2, 3 e 4 setores com labels posicionados; (d) workspace em viewport desktop e mobile |
| **Critério de aprovação** | Todos os elementos visíveis e corretos; sem layout quebrado em nenhum viewport; drawer funcional sem sobreposição indevida |
| **Responsável** | Usuário técnico (execução e screenshots) + RT Brasmáquinas (aprovação visual) |
| **Status atual** | Testado em código |
| **Próxima ação** | Executar como task E (validação browser TASK-021 e TASK-014 — pendências explícitas já no backlog) |

---

### E07 — Proposta e PDF · Status: Testado em código

| Campo | Conteúdo |
|---|---|
| **O que precisa ser validado** | (a) PDF gerado contém todas as informações técnicas necessárias para uma proposta; (b) gate HTTP 422 bloqueia corretamente com blocker ativo; (c) RT avalia o PDF como utilizável para apresentação a cliente |
| **Tipo de teste** | Visual + projeto histórico (a, c) + simulação sintética (b) |
| **Evidência exigida** | (a, c) PDF impresso do projeto histórico avaliado pelo RT; (b) tentativa de geração com blocker ativo retornando HTTP 422 com mensagem clara; RT assina que o PDF é proposta técnica completa |
| **Critério de aprovação** | RT confirma que o PDF pode ser apresentado a cliente sem ressalva técnica; gate funciona; todas as seções técnicas presentes (aspersores, setores, hidráulica, BOM precificada, diâmetros de ramais) |
| **Responsável** | RT Brasmáquinas |
| **Status atual** | Testado em código |
| **Próxima ação** | Implementar diâmetros de ramais no PDF (task B pendente, Classe B) antes da validação com RT; depois passo 5 do roteiro mínimo |

---

### E08 — Motor Comercial · Fora do escopo pré-proposta

| Campo | Conteúdo |
|---|---|
| **Status atual** | Não iniciado |
| **Próxima ação** | Aguardar TASK-001 (diagnóstico) + homologação RT de `09-classificacao-de-projetos.md`; não está no roteiro mínimo pré-proposta |

---

### E09 — Calibração e Validação de Campo · É o destino do roteiro

| Campo | Conteúdo |
|---|---|
| **Status atual** | Não iniciado |
| **Próxima ação** | O roteiro mínimo (passos 1–6) é a preparação para E09; o piloto interno (passo 6) inicia formalmente E09 |

---

## 3. Roteiro mínimo antes da primeira proposta real

> Este roteiro deve ser concluído **antes** de qualquer proposta enviada a cliente. É a garantia de que o motor foi validado em condições controladas antes de ser exposto a um projeto real com implicações comerciais.

---

### Passo 1 — Projeto fictício simples

**O que fazer:** criar um projeto com polígono retangular ~5 ha, captação centralizada, adutora ortogonal, bomba com dados plausíveis mas fictícios.

**Objetivo:** verificar o fluxo completo de ponta a ponta sem blocker.

**Resultado esperado:**
- PDF gerado (sem HTTP 422)
- `diagnostics.blockers.length === 0`
- `buildBOM(result).meta.conexoesFisicasSemSkuCount === 0`
- Sidebar exibe warnings esperados (se houver) mas nenhum blocker vermelho

**Executa:** usuário técnico

**Evidência:** screenshot do sidebar sem blockers + link para o PDF gerado

---

### Passo 2 — Projeto fictício com blocker

**O que fazer:** usar o mesmo polígono do passo 1, mas induzir deliberadamente um blocker conhecido (ex: definir bomba com HMT insuficiente, ou usar configuração que gera ângulo proibido na rede interna).

**Objetivo:** verificar que o gate HTTP 422 funciona e que o sidebar exibe o blocker corretamente.

**Resultado esperado:**
- PDF bloqueado (HTTP 422)
- Sidebar exibe seção vermelha de blockers com mensagem clara e identificável
- Nenhuma mensagem genérica de erro inesperado

**Executa:** usuário técnico

**Evidência:** screenshot do sidebar com blocker vermelho + confirmação de que a tentativa de PDF foi bloqueada

---

### Passo 3 — Projeto histórico já orçado

**O que fazer:** inserir no motor os dados de um projeto que a Brasmáquinas já calculou manualmente — polígono real, captação real, bomba escolhida pelo RT, espaçamento real.

**Objetivo:** comparar HMT, diâmetros, layout e BOM com o cálculo manual já validado em campo.

**Resultado esperado:**
- Divergência < 5% em HMT
- Diâmetros de tubos iguais ou com justificativa técnica documentada
- BOM com mesmos SKUs (ou diferença documentada e aceita pelo RT)
- Layout razoável na visão do RT

**Executa:** usuário técnico (inserção dos dados) + RT Brasmáquinas (comparação e aprovação)

**Evidência:** planilha ou documento comparativo motor vs. cálculo manual, assinado pelo RT

---

### Passo 4 — Validação visual no browser

**O que fazer:** executar os projetos dos passos 1 e 3 no browser real; verificar workspace, mapa, labels de setor, drawer mobile (DevTools mobile ou device físico), sidebar com blockers/warnings, comportamento de PDF bloqueado vs. liberado.

**Objetivo:** confirmar que a UI está funcional e sem bugs visuais em condições reais de uso.

**Resultado esperado:**
- Workspace full-screen sem overflow ou elemento cortado
- Labels de setor posicionados corretamente
- Drawer mobile abre/fecha sem sobreposição indevida
- Sidebar com `pdfError` exibido após tentativa bloqueada

**Executa:** usuário técnico

**Evidência:** screenshots de cada cenário documentados e arquivados

---

### Passo 5 — Geração e avaliação do PDF simulado

**O que fazer:** gerar e salvar (ou imprimir) o PDF do projeto histórico (passo 3); apresentar ao RT para avaliação de formato e conteúdo.

**Objetivo:** RT avalia se o PDF está pronto para ser enviado a um cliente real.

**Resultado esperado:**
- RT confirma que o PDF atende o padrão técnico Brasmáquinas
- Ou: RT lista divergências específicas a corrigir antes de ir ao cliente

**Executa:** usuário técnico (geração) + RT Brasmáquinas (avaliação)

**Evidência:** PDF salvo + documento de aprovação ou lista de divergências assinada pelo RT

---

### Passo 6 — Revisão interna e decisão formal

**O que fazer:** reunião com RT para revisar todos os achados dos passos 1–5; documentar divergências encontradas; tomar decisão formal: "sistema pronto para proposta real" ou "lista de pendências antes de ir ao cliente".

**Objetivo:** garantir que nenhuma lacuna conhecida chegue ao cliente sem decisão consciente do RT.

**Resultado esperado:**
- Documento de decisão formal com: lista de itens aprovados, lista de pendências aceitas (com justificativa), decisão de prosseguir ou aguardar
- Se prosseguir: primeira proposta a cliente é precedida por validação completa

**Executa:** RT Brasmáquinas + equipe técnica

**Evidência:** ata ou documento de decisão formal

---

## 4. Status de prontidão para cada passo do roteiro

| Passo | Pode ser feito agora? | Bloqueador |
|---|---|---|
| 1 — Projeto fictício simples | **Sim** | Nenhum |
| 2 — Projeto fictício com blocker | **Sim** | Nenhum |
| 3 — Projeto histórico | **Parcial** | TASK-025 pendente (DN100 selecionável gera resultado incorreto); diâmetros de ramais ausentes do PDF |
| 4 — Validação visual | **Sim** | Nenhum (executar como task E referente a TASK-021 e TASK-014) |
| 5 — PDF simulado | **Parcial** | Diâmetros de ramais no PDF pendentes (task B); sem isso o PDF está incompleto |
| 6 — Revisão interna | **Não** | Depende dos passos 3 e 5 |

**Sequência recomendada:**
1. Executar passos 1 e 2 agora (sem bloqueador)
2. Executar passo 4 como task E (validação browser das pendências de TASK-021/014)
3. Concluir TASK-025 (Classe A) + diâmetros de ramais no PDF (Classe B)
4. Executar passos 3 e 5 com RT
5. Executar passo 6 e tomar a decisão formal

---

## Rastreabilidade

- Mapa Mestre: `tasks/TASK-024-mapa-mestre-tasks.md` (seção 11 — renumerada de 10 → 11 após TASK-024E)
- Auditoria de épicos: `tasks/TASK-024C-auditoria-conclusao-epicos-mvp.md`
- Relatório: `docs/relatorios/2026-05-21-TASK-024D.md`
- Backlog: `tasks/backlog.md`
- Premissas provisórias: `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
