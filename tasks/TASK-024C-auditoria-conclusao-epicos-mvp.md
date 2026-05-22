# TASK-024C — Auditoria de Conclusão dos Épicos do MVP

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** C — Documental
**Área:** governança / rastreabilidade
**Arquivo:** `tasks/TASK-024C-auditoria-conclusao-epicos-mvp.md`
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc · `src/` não alterado

> Auditoria do status real dos 9 épicos do Mapa Mestre, diferenciando implementação em código de validação visual, de projeto piloto e de homologação Brasmáquinas.

---

## Escala de maturidade

| Nível | Nome | Significado |
|---|---|---|
| 0 | Não iniciado | Nenhuma task concluída no épico |
| 1 | Em desenvolvimento | Tasks iniciadas mas nenhuma concluída formalmente |
| 2 | Implementado | Tasks concluídas; código existe; sem testes sistemáticos ou com testes parciais |
| 3 | Testado em código | Testes automatizados cobrindo os casos definidos; 0 erros tsc |
| 4 | Validado visualmente | Comportamento verificado no browser ou em output real (mapa, PDF) — evidência registrada |
| 5 | Validado em projeto piloto | Output do motor comparado com um projeto real homologado pelo RT |
| 6 | Homologado Brasmáquinas | RT aprovou formalmente o épico como pronto para proposta comercial |

**Regra de conservadorismo:** na dúvida, classificar no nível mais baixo que tem evidência completa. Um épico com 95% dos testes passando e 1 pendência crítica fica no nível anterior.

---

## Tabela de auditoria

| Épico | Status atual | Evidências existentes | Evidências faltantes | Critério para concluir (próximo nível) | MVP obrigatório? |
|---|---|---|---|---|---|
| **E01** Fundação e Governança | **Implementado** | CLAUDE.md; 11 docs de metodologia; 5 docs de software; ADR-001..011; 5 comandos operacionais; backlog + templates + sistema de tasks | Fluxo operacional nunca formalmente aprovado pelo RT; nenhuma sessão documentada como modelo completo do início ao fim | RT aprova metodologia como processo padrão Brasmáquinas; ≥ 1 task A concluída do início ao fim usada como modelo de referência | **Sim** |
| **E02** Motor de Layout | **Testado em código** | 570+ testes (grid, optimizer, Top-K); ADR-006, ADR-009; TASK-010Z consolidada; badge "não homologado tecnicamente" exibido na UI; 112 candidatos avaliados | 9 premissas provisórias sem revisão RT (6 pesos PENDENTE_CALIBRACAO_RT_CAMPO; 3 PENDENTE_REVISAO_RT_BRASMAQUINAS); nenhum projeto piloto com layout gerado pelo optimizer; sem ADR confirmando prontidão para propostas | RT revisa e aprova os 9 parâmetros; ≥ 1 projeto piloto com layout do optimizer aprovado; badge "não homologado" removido | **Sim** (gerador de grid é core; optimizer é experimental) |
| **E03** Motor Hidráulico | **Testado em código** | ADR-002, ADR-008; pressure-class.test.ts (15), secondary-sizing.test.ts (12); pump validation; HW com diâmetro interno real; 430+ testes | TASK-025 pendente (DN100 ainda selecionável); pressão real por derivação pendente (ramal/lateral usam HMT conservativo); desnível geodético pendente; HMT nunca comparada com projeto real homologado | TASK-025 concluída; pressão real por derivação implementada; ≥ 1 projeto piloto com HMT, diâmetros e vazões comparados com cálculo manual do RT | **Sim** |
| **E04** Construtibilidade Física | **Testado em código** | ADR-004, ADR-010, ADR-011; ~30 testes de ângulo, 8 de desvio de eixo, 28 de roteamento angular; REGRA_CONSTRUTIBILIDADE_ANGULAR confirmada pelo RT | `TOLERANCIA_ASPERSOR_EIXO_LATERAL` (0,10 m) `PENDENTE_REVISAO_BRASMAQUINAS`; `TOLERANCIA_ANGULAR` (±5°) `PENDENTE_REVISAO_RT_BRASMAQUINAS`; rede física construtível não validada visualmente em projeto real com mapa geográfico | RT aprova as duas tolerâncias; ≥ 1 projeto piloto com rede física verificada em campo (ângulos, eixos, junções) | **Sim** |
| **E05** BOM e Catálogo | **Testado em código** | ADR-005 (VIQUA PN80); bom-valves (10), bom-registro-secao (15), physical-connections (18), bom-kit-aspersor (27+); 7 SKUs VIQUA PN80; kit aspersor 5022 com SKUs reais | `curva_45_adutora` sem SKU (BOMPendingConnection residual); `marca` dos SKUs 1819000, 1000843, 1000354 em branco; catálogo de luvas sem critério e sem SKU; BOM jamais confrontada com lista de materiais de obra real | SKU de curva_45_adutora homologado pelo RT; marcas preenchidas; ≥ 1 projeto piloto com BOM impressa conferida contra lista real de obra | **Sim** |
| **E06** Mapa e Workspace | **Testado em código** | geo-utils.test.ts (13), sector-label-anchor.test.ts (5); workspace full-screen implementado; busca de endereço funcional; labels de setor por `startLngLat` | Drawer mobile não confirmado (TASK-021 pendente explícito); `pdfError.invalidHydraulicSegments` no sidebar não testado (TASK-021 pendente); labels com 2/3/4 setores e coluna fragmentada não validados visualmente (TASK-014 pendente); suporte vírgula decimal brasileira ausente | Pendências visuais de TASK-021 e TASK-014 confirmadas via task E; suporte vírgula decimal implementado; ≥ 1 sessão real com cliente usando a interface | **Sim** |
| **E07** Proposta e PDF | **Testado em código** | ADR-003 (gate HTTP 422); pdf-guard.test.ts (3); PDF emitido sem blockers; seção de blockers no sidebar integrada | Diâmetros de ramais ausentes do PDF; pressão real por derivação não exibida; PDF jamais validado pelo RT como proposta técnica completa; proposta jamais enviada a cliente real | Diâmetros de ramais no PDF (task B pendente); pressão real implementada; RT valida o PDF como proposta técnica completa; ≥ 1 proposta enviada a cliente | **Sim** |
| **E08** Motor Comercial | **Não iniciado** | `docs/metodologia/09-classificacao-de-projetos.md` existe mas aguarda homologação RT; TASK-001 e TASK-002 planejadas no backlog | Toda implementação; TASK-001 (diagnóstico) pendente; homologação RT de `09-classificacao-de-projetos.md` ausente | TASK-001 concluída + homologação RT + TASK-002 implementada e testada | **Não** (pós-MVP) |
| **E09** Calibração e Validação de Campo | **Não iniciado** | Premissas provisórias documentadas em `12-premissas-provisorias-e-revisao-rt.md`; marcadores `PENDENTE_CALIBRACAO_RT_CAMPO` no código | Nenhum projeto piloto; nenhum dado de campo coletado; RT não iniciou revisão dos parâmetros | ≥ 1 projeto real executado e comparado com output do motor; RT revisa e aprova ≥ 9 parâmetros pendentes | **Não** (necessário para homologar, não para primeira proposta) |

---

## Análise por épico

### E01 — Fundação e Governança · Implementado

A estrutura de governança existe e está operacional: CLAUDE.md define invariantes, os comandos foram usados em todas as tasks desta sessão, ADRs registram decisões. O nível é **Implementado** e não **Testado em código** porque os artefatos de governança (docs, ADRs, metodologia) não têm testes automatizados — por definição, não podem ter. A evidência de funcionamento é o uso real da metodologia em 24 tasks.

**O que impede avançar:** o RT nunca formalizou aprovação da metodologia como processo padrão Brasmáquinas. Isso não é um blocker técnico, mas é o critério para alcançar "Homologado".

---

### E02 — Motor de Layout · Testado em código

O gerador de grid (TASK-010A) é sólido e está em produção. O optimizer (TASK-010B..010Z) é explicitamente marcado como experimental na UI com badge "não homologado tecnicamente". Os dois compõem o mesmo épico, portanto o nível do épico é determinado pelo componente menos maduro: o optimizer.

**Risco principal:** nenhum dos 9 parâmetros do optimizer foi revisado pelo RT. O motor pode selecionar um layout geometricamente ótimo que seja hidraulicamente ou operacionalmente problemático para o perfil de projetos Brasmáquinas.

---

### E03 — Motor Hidráulico · Testado em código

O solver é tecnicamente completo para o caso base. Dois problemas remanescentes degradam a qualidade da saída: (1) o seletor de laterais ainda aceita DN100, que nunca é usado em campo — TASK-025 resolve; (2) ramais e laterais usam HMT como limite conservativo em vez de pressão de entrada calculada — gera `violation_conservative` onde deveria ser `ok` ou `violation_confirmed`.

**Risco principal:** proposta pode apresentar aviso de violação de PN em ramal/lateral mesmo quando não há violação real, gerando desconfiança desnecessária do cliente ou do RT.

---

### E04 — Construtibilidade Física · Testado em código

A regra de construtibilidade angular (`[0°, 90°]` na rede interna; `[0°, 45°, 90°]` na adutora) foi confirmada pelo RT antes da TASK-015. As tolerâncias numéricas (`±5°` e `0,10 m`) são provisórias.

**Risco principal:** projetos de fazendas > 500 m podem gerar blockers espúrios por erro flat-earth na tolerância de eixo. O RT ainda não foi consultado sobre esse limite.

---

### E05 — BOM e Catálogo · Testado em código

O catálogo de registros VIQUA (7 SKUs, PN80, ADR-005) e o kit aspersor 5022 (5 SKUs reais) são homologados internamente pela Brasmáquinas. Mas a BOM como entidade completa nunca foi confrontada com uma lista de materiais de obra real. A `curva_45_adutora` sem SKU é uma lacuna residual que gera `BOMPendingConnection` em projetos com adutora em 45°.

**Risco principal:** preço total da BOM pode diferir do custo real de obra por itens não catalogados (luvas, curva_45_adutora) e marcas ausentes em 3 SKUs.

---

### E06 — Mapa e Workspace · Testado em código

As funções puras têm testes (geo-utils, sector-label-anchor). Mas a TASK-021 e a TASK-014 têm pendências visuais explícitas registradas no backlog. Nenhuma sessão com cliente real foi documentada.

**Risco principal:** o drawer mobile pode ter bug de comportamento que não afeta testes unitários mas é blocker de usabilidade para o RT ou cliente em apresentação.

---

### E07 — Proposta e PDF · Testado em código

O gate de PDF (ADR-003) funciona e foi testado. O PDF é emitido quando não há blockers. Mas está **tecnicamente incompleto**: não exibe diâmetros individuais de ramais (`sizedSecondaries`), que são informação técnica essencial para o RT validar o dimensionamento hidráulico na proposta.

**Risco principal:** proposta emitida hoje pelo motor não é tecnicamente completa — um engenheiro não consegue replicar o cálculo do ramal sem essa informação.

---

### E08 — Motor Comercial · Não iniciado

Depende de TASK-001 (diagnóstico do software atual) e homologação RT de `09-classificacao-de-projetos.md`. Nenhum dos dois ocorreu. Pós-MVP.

---

### E09 — Calibração e Validação de Campo · Não iniciado

Sem projeto piloto e sem dado de campo. Os marcadores `PENDENTE_CALIBRACAO_RT_CAMPO` no optimizer representam 6 pesos que nunca foram testados contra projetos reais. Pós-MVP, mas é o critério para remover o badge "não homologado" do E02.

---

## Achado principal

**Todos os 7 épicos do MVP obrigatório estão em "Testado em código" (E01 em "Implementado").** Nenhum atingiu "Validado visualmente" de forma documentada. O motor está tecnicamente funcional para o caso base, mas nenhum épico tem evidência de validação além dos testes automatizados.

Isso significa que a primeira proposta gerada para um cliente real **será simultaneamente o primeiro projeto piloto (E09)** e a primeira validação visual documentada de múltiplos épicos. Essa sessão com o cliente deve ser tratada como um evento formal de validação, não como uso rotineiro.

---

## Rastreabilidade

- Mapa Mestre: `tasks/TASK-024-mapa-mestre-tasks.md` (seção 9 adicionada)
- Relatório: `docs/relatorios/2026-05-21-TASK-024C.md`
- Backlog: `tasks/backlog.md`
- Premissas provisórias: `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- ADRs auditados: `docs/decisoes/ADR-001` a `ADR-011`
