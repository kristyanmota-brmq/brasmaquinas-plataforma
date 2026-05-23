# 13 — Arquitetura de Rede: Principal, Sub-coletores e Laterais

**Versão:** 1.0
**Data:** 2026-05-23
**Status:** Homologado pelo RT (Kristyan Mota) em 2026-05-23
**Escopo:** metodologia profissional de arquitetura de rede para irrigação por aspersão convencional Brasmáquinas

---

## Propósito

Definir como a Brasmáquinas decide a geometria da rede de aspersão convencional — em que ordem laterais, sub-coletores e principal são definidos, qual o critério de escolha da arquitetura e como classificar cada decisão envolvida.

Este documento é a **fonte canônica da diretriz operacional**. Decisões arquiteturais pontuais ficam nas ADRs; histórico de mudanças fica nos relatórios; valores numéricos e parâmetros provisórios ficam em [12-premissas-provisorias-e-revisao-rt.md](12-premissas-provisorias-e-revisao-rt.md). Este documento explica **por que** a metodologia funciona como funciona.

---

## 1. Sequência profissional de design

A arquitetura de rede é definida em **três etapas obrigatórias e nesta ordem**:

| Etapa | Quem determina | Critério |
|---|---|---|
| **1. Laterais** | geometria do polígono + agronomia | retas, repetitivas, aspersor sobre o eixo |
| **2. Sub-coletores / ramais / secundárias** | laterais já posicionadas | alimentar grupos de laterais com geometria construtível |
| **3. Rede principal** | sub-coletores e captação já posicionados | menor BOM válida e operacionalmente executável |

### 1.1 Por que laterais primeiro

As laterais carregam os aspersores físicos. Decidi-las primeiro garante:

- aspersores ficam sobre o eixo da vala (regra técnica — ADR-011, ADR-012);
- traçado reto e repetitivo, sem zigue-zague artificial;
- montagem e marcação simples em campo;
- agronomia preservada (espaçamento 12×12 m).

Qualquer outra ordem subordinaria a geometria das laterais a restrições de tubulação a montante — o que produz layout difícil de montar e propenso a desvios.

### 1.2 Por que sub-coletores em seguida

Os sub-coletores funcionam como **cabeçais alimentadores** de grupos de laterais. São definidos depois das laterais porque:

- cada sub-coletor herda a posição dos inlets das colunas que serve;
- a geometria natural (perpendicular às laterais) emerge da posição das laterais já decididas;
- alinhamento com operação rotativa por setor (1 setor ativo = 1 sub-coletor ativo).

### 1.3 Por que principal por último

A rede principal **não tem orientação fixa universal**. É definida por último porque o ponto ótimo depende de:

- onde já estão a captação e os sub-coletores;
- qual configuração minimiza o custo total da BOM;
- quais restrições construtivas e operacionais a obra impõe.

Decidir a principal antes das laterais força orientação arbitrária que pode aumentar BOM, criar blockers angulares ou inviabilizar a obra.

---

## 2. Princípios fundamentais (12 itens)

A metodologia Brasmáquinas para arquitetura de rede se apoia em **doze princípios homologados pelo RT em 2026-05-23**:

1. **Não existe regra fixa universal** sobre orientação principal × laterais × sub-coletores.
2. A **sequência de design é obrigatória**: laterais → sub-coletores → principal.
3. **Laterais primeiro** porque carregam aspersores e devem ser retas, repetitivas, fáceis de marcar e manter os aspersores sobre o eixo.
4. **Sub-coletores tendem (boa prática) a ser perpendiculares às laterais** — funcionam como cabeçais alimentadores. A perpendicularidade é tendência, não regra absoluta; geometria do polígono ou setorização podem justificar outra disposição executável.
5. **Principal não tem orientação fixa obrigatória** — pode ser paralela ou perpendicular às laterais conforme a comparação de candidatos resultar mais econômica e executável.
6. A **principal é posicionada onde gerar a menor BOM tecnicamente válida e operacionalmente executável**.
7. **Restrições duras** que toda alternativa deve satisfazer: pressão mínima do aspersor, perda de carga máxima por trecho, velocidade máxima, DN homologado, setorização viável, construtibilidade, acesso para manutenção, compatibilidade com operação agrícola, blockers técnicos existentes.
8. **Função objetivo do motor** = minimizar o custo total da BOM.
9. **As restrições duras do motor** = hidráulica + construtibilidade + operação de campo (não apenas hidráulica).
10. **O software compara arquiteturas candidatas** — A0 (baseline), A2 (borda mais favorável), A3 (central) e futuras (A1 externa, A4 espinha, A5 subprincipais, A6 cabeçal único, A7 orientação automática, A8 blocos).
11. **Vencedor** = a menor BOM válida e executável; em empate (< R$ 1,00), prefere A0 (princípio "menor mudança").
12. **Se nenhuma alternativa for válida**: manter baseline OU bloquear com diagnóstico claro — nunca emitir proposta com arquitetura inválida.

---

## 3. Classificação 4-tier das decisões

Toda decisão de arquitetura cai em **uma das quatro categorias**, com severidade decrescente. Essa distinção é metodológica: não promover "boa prática" para "regra técnica" nem rebaixar "regra técnica" para "decisão de engenharia".

### 3.1 Regra técnica (invariante)

Decisões absolutas — violar produz blocker. Não negociáveis:

- **Aspersor deve estar sobre a lateral física** (ADR-011, ADR-012; tolerância `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m`).
- **Hidráulica respeita pressão, perda e velocidade** — Hazen-Williams com diâmetro interno real (ADR-002); classe de pressão validada por trecho (ADR-008).
- **DN homologado por aspersor** — DN100 não pode voltar como lateral 5022 (ADR-013).
- **Rede interna apenas 0° e 90°** — adutora pode usar 45° (ADR-010).
- **Catálogo é read-only** — SKUs existentes não mudam (RB-04 + CLAUDE.md).
- **PDF é bloqueado quando há blockers ativos** — gate HTTP 422 (ADR-003).

### 3.2 Boa prática (tendência)

Orientações fortes que produzem layout limpo, mas admitem exceção justificada:

- **Laterais retas, repetitivas e montáveis** — sem fragmentação artificial.
- **Sub-coletores tendem a ser perpendiculares às laterais** — alinha com operação rotativa; pode variar quando geometria do polígono ou setorização tornam outra disposição mais executável.
- **Principal aproveita bordas, estradas, corredores técnicos ou eixo central** quando isso reduzir custo e facilitar operação — sem regra fixa de "borda" vs. "central".
- **Operação rotativa por setor** (TASK-052 homologada) — 1 setor ativo por vez; sub-coletor dimensionado pelo pior setor isolado.

### 3.3 Decisão de engenharia (comparação)

Escolhas técnicas que dependem do projeto específico e são resolvidas por comparação/cálculo:

- **Orientação da principal** = escolhida por comparação de candidatos (não regra fixa).
- **Arquitetura vencedora** = menor BOM válida e operacionalmente executável (ADR-015).
- **Limites de velocidade e perda em ramal** — valores em [12-premissas](12-premissas-provisorias-e-revisao-rt.md) (`MAX_VELOCITY_RAMAL_MS`, `MAX_HEADLOSS_RAMAL_MCA`).
- **Critério de vazão de projeto do ramal** = `max(setor)` em operação rotativa (TASK-052) — [12-premissas](12-premissas-provisorias-e-revisao-rt.md).
- **Topologia do sub-coletor** = espinha de peixe SEMPRE (TASK-053 v12); 3 entidades por setor (spine + spine_entry + N ribs); decisão de engenharia subordinada às regras técnicas de rede 0°/90° e aspersor sobre lateral.

### 3.4 Decisão comercial

Restrições do produto comercial, subordinadas às regras técnicas e às decisões de engenharia:

- **Reduzir BOM é desejável**, mas nunca ao custo de layout difícil, hidráulica inválida ou obra confusa.
- **Não emitir proposta com `conexoesFisicasSemSkuCount > 0`** (E05 / `BOMPendingConnection`).
- **Não emitir proposta enquanto blockers técnicos estiverem ativos** — TECH-053-01 (rib→lateral) ATIVO bloqueia emissão até decisão RT explícita.
- **Fechamento técnico ≠ fechamento comercial** — testes passando e validação visual não habilitam proposta automaticamente; emissão exige decisão RT registrada.

---

## 4. Restrições duras enumeradas

Toda alternativa arquitetural avaliada pelo motor deve satisfazer **simultaneamente** as restrições abaixo. Valores numéricos canônicos vivem em [12-premissas-provisorias-e-revisao-rt.md](12-premissas-provisorias-e-revisao-rt.md); este documento apenas enumera as categorias.

| Restrição | Tier | Origem |
|---|---|---|
| Pressão mínima do aspersor (≥ pressão de serviço) | regra técnica | catálogo + ADR-008 |
| Perda de carga ≤ limite por ramal | decisão de engenharia | `MAX_HEADLOSS_RAMAL_MCA` |
| Velocidade ≤ limite em ramal | decisão de engenharia | `MAX_VELOCITY_RAMAL_MS` |
| DN homologado por aspersor | regra técnica | ADR-013 |
| Setorização viável (jornada agronômica) | boa prática | metodologia agronômica |
| Rede interna 0°/90°; adutora 0°/45°/90° | regra técnica | ADR-010 |
| Aspersor sobre lateral física (≤ tolerância) | regra técnica | ADR-011, ADR-012 |
| Conexão homologada no catálogo | regra técnica | RB-04 |
| Construtibilidade da rota (laterais retas, sem zigue-zague) | regra técnica | ADR-012 |
| Acesso para manutenção e operação agrícola | boa prática | metodologia operacional |
| Blockers técnicos ativos no projeto | regra técnica | RB-08 + ADR-003 |

---

## 5. Catálogo de candidatos arquiteturais

| Candidato | Descrição | Status |
|---|---|---|
| **A0** | Baseline atual — principal entre laterais e captação | ✅ Implementado (motor padrão; ADR-015) |
| **A2** | Principal na borda mais favorável (`forceSide: "min" \| "max"`) | ✅ Implementado (TASK-043) |
| **A3** | Principal central — `principalY = (yMin + yMax) / 2` (warning obrigatório de cruzamento de área irrigada) | ✅ Implementado (TASK-043) |
| **A1** | Principal externa (lado oposto à área irrigada) | ⏳ Reservado pós-MVP |
| **A4** | Espinha — múltiplas principais paralelas | ⏳ Reservado pós-MVP |
| **A5** | Subprincipais paralelas | ⏳ Reservado pós-MVP |
| **A6** | Cabeçal único central com alimentação radial | ⏳ Reservado pós-MVP |
| **A7** | Orientação automática (rotação livre) | ⏳ Reservado pós-MVP |
| **A8** | Blocos independentes | ⏳ Reservado pós-MVP |

Critério de comparação e função objetivo: **ADR-015**. Implementação dos candidatos atuais: **TASK-043** (`architecture-selector.ts`). Expansão para A1/A4–A8: **TASK-056 (futura Classe A)**.

---

## 6. Implementação atual (mapa código ↔ metodologia)

Esta seção indica **onde** no código a metodologia está materializada. Não substitui a leitura dos arquivos — apenas mapeia.

| Componente da metodologia | Implementação |
|---|---|
| Sequência laterais → sub-coletores → principal | `irrigation-project.ts` (orquestrador único — ADR-001) |
| Laterais como polilinha construtível reta | `laterais.ts` (ADR-012; emenda TASK-045B = mediana de X) |
| Sub-coletores (espinha de peixe SEMPRE) | `hydraulic-connectivity.ts` `routeEspinhaDePeixe` (TASK-053 v12) |
| Restrições hidráulicas em ramal | `secondary-sizing.ts` (3 paths kind-aware; TASK-053 v12) |
| Validação angular kind-aware | `network-angle-diagnostics.ts` (TASK-053 v12) |
| Comparação de candidatos arquiteturais | `architecture-selector.ts` `selectArchitectureByBom()` (TASK-043, ADR-015) |
| Função objetivo (BOM estimada preliminar) | `architecture-selector.ts` (BOM diferencial; não substitui `buildBOM()` oficial) |
| Gate de emissão técnica | `pdfEmissionBlockers()` em `irrigation-project.ts` (ADR-003) |

---

## 7. Lacunas conhecidas

| Lacuna | Status | Encaminhamento |
|---|---|---|
| Candidatos A1 e A4–A8 | não implementados | **TASK-056** (futura Classe A) |
| Validação visual da topologia v12 em Projeto A | pendente | gatekeeper de homologação comercial RT |
| Blocker `TECH-053-01` (rib→lateral) | ATIVO ao fechar TASK-053 | TASK-053-valves (relocação `section_valve` para `spine_entry`) ou override técnico RT |
| BOM ajustada para topologia "sempre sub-coletor" | imprecisa (warning textual) | **TASK-054** (sucessora) |
| Calibração RT dos pesos de `OPTIMIZER_PARAMS` | provisória | E09 (validação de campo) |
| `MAX_VELOCITY_RAMAL_MS` sem NBR brasileira específica | provisório (NRCS NEH) | revisão RT — [12-premissas](12-premissas-provisorias-e-revisao-rt.md) |
| Pressão real por derivação no PDF | não exibida | task futura E07 (pós-TASK-004B) |

---

## 8. Referências

- [ADR-015 — Seleção arquitetural por menor BOM válida e operacionalmente executável](../decisoes/ADR-015-selecao-arquitetural-menor-bom-valida.md) — decisão arquitetural base
- [Relatório TASK-042R — Diretriz Brasmáquinas](../relatorios/2026-05-21-TASK-042R.md) — relatório histórico que originou a diretriz
- [TASK-043 — Motor de seleção arquitetural](../../tasks/TASK-043-motor-selecao-arquitetural.md) — implementação A0/A2/A3
- [TASK-053 — Espinha de peixe SEMPRE sub-coletor (v12)](../../tasks/TASK-053-sub-coletor-por-setor.md) — topologia operacional
- [12 — Premissas provisórias e revisão RT](12-premissas-provisorias-e-revisao-rt.md) — valores numéricos e premissas RT
- [Mapa Mestre TASK-024 §E02/E03/E04/E05](../../tasks/TASK-024-mapa-mestre-tasks.md) — épicos impactados
- [01 — Regras bloqueantes](01-regras-bloqueantes.md) — invariantes do projeto
- [04 — Layout earth-first](04-layout-earth-first.md) — metodologia de layout completa

---

## Histórico de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-23 | Claude Opus 4.7 (TASK-055) | Documento criado com 8 seções consolidando a diretriz operacional Brasmáquinas homologada pelo RT em 2026-05-23 durante TASK-053 v12. 12 princípios fundamentais documentados; classificação 4-tier (regra técnica / boa prática / decisão de engenharia / decisão comercial) explícita; restrições duras enumeradas; catálogo A0/A2/A3 implementados + A1/A4–A8 reservados; mapa código↔metodologia indicando arquivos sem reproduzir conteúdo; lacunas conhecidas com encaminhamento (TASK-054, TASK-056, TASK-053-valves). Sem alterar ADR-015 (referenciada como base), sem alterar premissas técnicas em `12-premissas-...md`, sem alterar nada em `src/`. |
