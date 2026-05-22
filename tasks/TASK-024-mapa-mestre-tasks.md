# TASK-024 — Mapa Mestre de Tasks do Motor de Aspersão Convencional

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Área:** governança / rastreabilidade
**Concluída em:** 2026-05-21 · 731/731 testes · 0 erros tsc

> Organização de todas as tasks concluídas e futuras em épicos estruturados, com critério objetivo de fim de MVP, lista de não-fazer e próximas 5 tasks recomendadas. Nenhum arquivo em `src/` alterado.

---

## 1. Épicos do projeto

| ID  | Nome                                   | Escopo principal                                                  |
|-----|----------------------------------------|-------------------------------------------------------------------|
| E01 | Fundação e Governança                  | CLAUDE.md, metodologia, ADRs, comandos operacionais, diagnóstico  |
| E02 | Motor de Layout — Malha de Aspersores  | Grid de aspersores, motor de candidatos, otimizador geométrico    |
| E03 | Motor Hidráulico                       | Solver HW, ramais individuais, bomba, PN/classe de pressão        |
| E04 | Construtibilidade Física               | Laterais físicas, roteamento angular, alinhamento aspersor-eixo   |
| E05 | BOM e Catálogo                         | Tubos, aspersores, válvulas, conexões físicas, precificação        |
| E06 | Mapa e Workspace                       | Visualização geográfica, workspace, busca de endereço, labels     |
| E07 | Proposta e PDF                         | Gate de emissão, PDF técnico, bloqueio por blockers               |
| E08 | Motor Comercial                        | Classificação A/B/C, integração técnica + comercial, proposta     |
| E09 | Calibração e Validação de Campo        | Revisão RT, premissas provisórias, dados de projetos reais        |

---

## 2. Épicos como blocos de valor verificáveis

> Adicionado em TASK-024E (2026-05-22). Cada épico é descrito como **bloco de valor verificável**: o que entrega, sob quais critérios, com quais decisões, riscos e status. Complementa a Seção 1 (visão geral) e a Seção 3 (índice de execução). Não substitui backlog, auditoria detalhada (Seção 10) nem matriz de validação (Seção 11).

**Como ler cada bloco:**

- **Propósito** — porque o épico existe.
- **Capacidade entregue** — o que o sistema passa a fazer quando o épico está pronto.
- **Escopo / Fora do escopo** — limites explícitos.
- **Critérios de aceite** — condições binárias para o épico ser considerado pronto.
- **Métricas** — indicadores verificáveis.
- **Dependências** — outros épicos ou tasks bloqueantes.
- **Decisões** — subdivididas em 4 categorias:
  - **Regra técnica** — ADR ou invariante do repositório.
  - **Boa prática** — referência externa ou padrão de engenharia.
  - **Decisão de engenharia** — escolha interna documentada.
  - **Decisão comercial** — trade-off comercial/risco assumido por Brasmáquinas.
  - "—" quando não houver decisão relevante na categoria.
- **Riscos** — o que pode falhar ou virar dívida.
- **Status real** — nível único da escala de 7 níveis da TASK-024D (`Implementado` → `Testado em código` → `Validado em simulação sintética` → `Validado em projeto histórico` → `Validado visualmente` → `Validado em piloto interno` → `Homologado Brasmáquinas`). Conservador: a evidência precisa existir.
- **Tasks vinculadas** — apenas IDs, em duas listas (concluídas / pendentes-futuras). O detalhe vive no backlog.

---

### E01 — Fundação e Governança

**Propósito**
- Estabelecer o ambiente operacional, metodológico e de governança em que o motor é construído e auditado.

**Capacidade entregue**
- Fluxo `/iniciar-task → /planejar → /implementar → /fechar-task` operacional.
- Decisões arquiteturais formalizadas via ADR.
- Invariantes do repositório verificáveis (`tsc`, `vitest`).

**Escopo**
- `CLAUDE.md`, `AGENTS.md`, `tasks/`, `templates/`, `docs/metodologia/`, `docs/software/`, `docs/decisoes/`.
- 5 comandos operacionais em `.claude/commands/`.
- Política de ADR e classificação operacional A–E de tasks.

**Fora do escopo**
- Implementação de motor técnico (E02–E07).
- Homologação RT formal (E09).

**Critérios de aceite**
- Fluxo de 5 comandos documentado e executável.
- Política de ADR vigente.
- ≥ 1 task Classe A modelo do fluxo completo (task file + relatório + backlog + ADR se aplicável).

**Métricas**
- ADRs publicadas: 15 (ADR-001..015).
- Tasks formais com relatório em `docs/relatorios/`: 100%.
- Premissas registradas em `docs/metodologia/12-premissas-...md` para todo valor sem dado de campo.

**Dependências**
- Nenhuma. Base de todos os demais épicos.

**Decisões**
- **Regra técnica:** orquestrador único `calculateIrrigationProject()` (ADR-001); gate de PDF (ADR-003); catálogo read-only (`CLAUDE.md`).
- **Boa prática:** política de ADR (TASK-011); separação `docs/metodologia/`, `docs/software/`, `docs/decisoes/`.
- **Decisão de engenharia:** classificação A–E de tasks (Seção 9 / TASK-024B); escala de maturidade de 7 níveis (TASK-024D).
- **Decisão comercial:** —

**Riscos**
- RT nunca homologou formalmente a metodologia.
- Working tree pode acumular modificações fora de tasks formais (estado atual: 25 arquivos pendentes — séries TASK-027→046 e TASK-035).

**Status real**
- **Implementado.** Evidência: `CLAUDE.md`, 11 arquivos em `docs/metodologia/`, ADR-001..015 publicadas, 5 comandos operacionais. Nenhuma task A formalmente certificada pelo RT. Detalhe na Seção 10.

**Tasks vinculadas — concluídas:** TASK-000, TASK-011, TASK-011B, TASK-012, TASK-020, TASK-024, TASK-024B, TASK-024C, TASK-024D, TASK-024E
**Tasks vinculadas — pendentes/futuras:** TASK-001

---

### E02 — Motor de Layout — Malha de Aspersores

**Propósito**
- Gerar uma malha 12×12 m de aspersores dentro de um polígono qualquer, com orientação que respeite a regra "aspersor sobre lateral física" (ADR-011) e ranquear candidatos preliminarmente.

**Capacidade entregue**
- `generateRotatedSprinklerGrid()` em frame métrico local (TASK-046).
- `findOptimalGridAngle()` com gate de desvio aspersor-eixo (≤ 0,10 m) como defesa secundária.
- Motor de candidatos (112 alternativas) com 19 métricas por candidato.
- Validação hidráulica Top-K dos 5 melhores candidatos.

**Escopo**
- `src/lib/layout/sprinkler-grid.ts`, `sprinkler-grid-optimizer.ts`, `optimizer-integration.ts`, `architecture-selector.ts`.
- Métricas geométricas + operacionais + de rede + hidráulicas.
- Integração UI experimental com badge "preliminar — não homologado".

**Fora do escopo**
- Solver hidráulico por candidato substituindo o proxy de comprimento (pós-MVP).
- Multi-source (mais de uma captação).

**Critérios de aceite**
- Caminho feliz default produz layout sem blocker estrutural para área convexa típica.
- `findOptimalGridAngle` escolhe ângulo com `maxDev ≤ TOLERANCIA_ASPERSOR_EIXO_LATERAL`.
- Candidato com blocker real do solver nunca é `best` quando há alternativa válida (ADR-009).

**Métricas**
- Testes do épico: ≥ 570 (subset `sprinkler-grid*`, `layout*`, `architecture-selector`, `grid-orientation`).
- Projeto A: 344/344 aspersores em kit; ângulo 59° escolhido pelo gate (TASK-046).
- 0 blockers no caminho feliz default do Projeto A (TASK-046).

**Dependências**
- E01 (governança). Habilita E03 (hidráulica) via `physicalColumns` + `routeCoords`.

**Decisões**
- **Regra técnica:** grid 12×12 fixo; frame métrico local (TASK-046); gate de desvio aspersor-eixo (ADR-011); seleção arquitetural por menor BOM válida (ADR-015).
- **Boa prática:** rankeamento por 112 candidatos com pesos provisórios documentados em `12-premissas-...md`; motor preliminar com badge na UI (ADR-006).
- **Decisão de engenharia:** Top-K=5 (`TOP_K_HYDRAULIC_CANDIDATES`); `WEIGHT_HYDRAULIC_BLOCKER=0,50`; empate em arquitetura prefere A0 ("menor mudança").
- **Decisão comercial:** layout do optimizer é experimental — nunca usado em proposta sem revisão.

**Riscos**
- 9 parâmetros do optimizer ainda `PENDENTE_REVISAO_RT_BRASMAQUINAS` / `PENDENTE_CALIBRACAO_RT_CAMPO`.
- Candidato hidraulicamente melhor pode estar na posição 6+ do ranking geométrico e nunca ser avaliado pelo Top-K.

**Status real**
- **Validado visualmente no Projeto A — caso único.** Evidência: relatório TASK-046 (2026-05-22) com screenshots, ângulo 59°, 344/344 aspersores em kit, 0 blockers, PDF HTTP 200. Não é "Validado em projeto histórico" (sem comparação com layout manual do RT) nem homologado.

**Tasks vinculadas — concluídas:** TASK-010A, TASK-010B, TASK-010C, TASK-010D, TASK-010E-A, TASK-010E-B, TASK-010F, TASK-010Z, TASK-040, TASK-042, TASK-042R, TASK-043, TASK-044, TASK-045, TASK-045B, TASK-046
**Tasks vinculadas — pendentes/futuras:** Calibração RT de `OPTIMIZER_PARAMS`; otimização por massa mínima de PVC (TASK-006); solver hidráulico por candidato

---

### E03 — Motor Hidráulico

**Propósito**
- Dimensionar tubulação, calcular HMT, validar bomba e classes de pressão usando Hazen-Williams com diâmetro interno real.

**Capacidade entregue**
- `sizeHydraulics()` com caminho crítico exaustivo.
- `validatePump()` com 4 status (`not_informed`, `ok`, `pump_insufficient_flow`, `pump_insufficient_head`).
- `PressureClassCheck` por trecho.
- Restrição de DN homologado por aspersor (DN50/DN75 para 5022) via subset filtrado (ADR-013).
- Split automático de lateral por capacidade hidráulica (ADR-014).

**Escopo**
- `src/lib/hydraulics/`, `src/lib/layout/hydraulic-*`, `secondary-sizing.ts`, `principal.ts`, `laterais.ts` (capacidade).

**Fora do escopo**
- Pressão real por derivação usando `cumPrincipalHfM` (pendente).
- Desnível geodético por segmento (sem DEM).
- HMT comparada com cálculo manual RT (pendente E09).

**Critérios de aceite**
- HMT total computada e finita para todo projeto completo.
- Bomba validada quando informada; blocker quando insuficiente.
- DN100 ausente em lateral 5022 (ADR-013).
- Velocidade ≤ `MAX_VELOCITY_RAMAL_MS`; perda ≤ `MAX_HEADLOSS_RAMAL_MCA`.

**Métricas**
- Testes do épico: ≥ 430 (subset `hydraulic-*`, `secondary-sizing`, `lateral-capacity`, `pressure-class`, `bom-*`).
- Projeto A: HMT 41,3 mca; DN100 LF = 0 barras; Tubo R Ø100 ramais 297 barras (TASK-046).

**Dependências**
- E02 (physicalColumns + routeCoords). Alimenta E04 (validações construtivas) e E05 (BOM).

**Decisões**
- **Regra técnica:** Hazen-Williams com diâmetro interno (ADR-002); validação PN/classe de pressão (ADR-008); restrição DN homologado por aspersor (ADR-013); split por capacidade (ADR-014).
- **Boa prática:** `MAX_VELOCITY_RAMAL_MS=1,5 m/s` (referência NRCS NEH); `MAX_HEADLOSS_RAMAL_MCA=3,0 mca` (10% pressão de serviço 30 mca).
- **Decisão de engenharia:** critério de vazão de projeto do ramal = `max(setor)` (conservador, `PENDENTE_REVISAO_RT_BRASMAQUINAS`); blocker conservativo via HMT para ramal/lateral até pressão real por derivação ser implementada.
- **Decisão comercial:** seleção arquitetural por menor BOM válida (ADR-015) — função objetivo "custo", restrições duras "hidráulica + construtibilidade".

**Riscos**
- HMT nunca comparada com projeto histórico calculado manualmente pelo RT.
- `max(setor)` pode super-dimensionar ramais; relaxar exige confirmação RT da operação real.
- Pressão real por derivação ausente — warnings PN ainda usam HMT como limite conservativo.

**Status real**
- **Testado em código.** Evidência: ≥ 430 testes; HMT calculada no Projeto A (TASK-046). Sem planilha comparativa motor vs. manual aprovada pelo RT.

**Tasks vinculadas — concluídas:** HIST-001, HIST-002, HIST-003, TASK-004, TASK-009C, TASK-026, TASK-026-A, TASK-026-B, TASK-031, TASK-040
**Tasks vinculadas — pendentes/futuras:** Pressão real por derivação; desnível geodético por segmento; revisão RT de `MAX_VELOCITY_RAMAL_MS`; revisão RT do critério de vazão de projeto

---

### E04 — Construtibilidade Física

**Propósito**
- Garantir que a rede gerada é fisicamente construível: laterais retas, aspersor sobre o eixo da vala, ângulos compatíveis com o catálogo de conexões.

**Capacidade entregue**
- Lateral física como polilinha construtível 0°/90° (ADR-012 + emenda TASK-045B → eixo único via mediana de X).
- `detectAxisDeviations()` com tolerância 0,10 m → blocker.
- `detectNetworkAngleIssues()` com `ALLOWED_DEFLECTIONS_INTERNAL=[0°,90°]` e `ADUTORA=[0°,45°,90°]`.
- Roteamento construtível de ramais em L (90°).

**Escopo**
- `src/lib/layout/laterais.ts`, `network-angle-diagnostics.ts`, `physical-connections.ts`, partes de `principal.ts`.

**Fora do escopo**
- Roteamento automático de dobras manuais na principal.
- BOM de luvas (sem critério de contagem aprovado).
- Topografia/perfil altimétrico.

**Critérios de aceite**
- Aspersor fora do eixo > 0,10 m → blocker.
- Ângulo de rede interna fora de 0°/90° (tolerância ±5°) → blocker.
- Ângulo da adutora fora de 0°/45°/90° → blocker.
- Lateral física sempre reta no caminho feliz default (`routeCoords.length === 2`).

**Métricas**
- Testes do épico: ≥ 66 (subset `axis-deviation`, `network-angle-diagnostics`, `lateral-*`, `constructability`).
- Projeto A: 0 blockers de eixo; 0 blockers angulares; laterais retas (TASK-046).

**Dependências**
- E02 (physicalColumns). Alimenta E05 (BOM de conexões), E07 (gate de PDF).

**Decisões**
- **Regra técnica:** rede interna apenas 0° e 90° (ADR-010); aspersor obrigatoriamente sobre lateral física (ADR-011); lateral física como polilinha construtível (ADR-012, emenda TASK-045B = eixo único via mediana de X).
- **Boa prática:** tolerância angular ±5° absorve variações de montagem; mediana é estatística robusta contra outliers (substitui média).
- **Decisão de engenharia:** `TOLERANCIA_ASPERSOR_EIXO_LATERAL = 0,10 m` (decisão operacional Brasmáquinas; valor pendente revisão para fazendas > 500 m).
- **Decisão comercial:** —

**Riscos**
- `TOLERANCIA_ASPERSOR_EIXO_LATERAL` pode gerar blocker espúrio em fazendas > 500 m por erro flat-earth.
- `TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE = ±5°` pendente revisão RT.
- Projetos com geometria diagonal na principal podem disparar blocker 45° na rede interna.

**Status real**
- **Validado visualmente no Projeto A — caso único.** Evidência: relatório TASK-046 (2026-05-22) — laterais retas, aspersores ≤ 0,10 m do eixo, 0 blockers angulares. Não validado em projeto > 500 m nem em projeto histórico.

**Tasks vinculadas — concluídas:** TASK-013, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019, TASK-028, TASK-045, TASK-045B, TASK-046
**Tasks vinculadas — pendentes/futuras:** Validação de `TOLERANCIA_ASPERSOR_EIXO_LATERAL` em projetos > 500 m; revisão RT da tolerância angular

---

### E05 — BOM e Catálogo

**Propósito**
- Produzir lista precificada de materiais (tubos, aspersores, conexões, registros) coerente com o projeto técnico e auditável contra o catálogo Brasmáquinas.

**Capacidade entregue**
- `buildBOM()` com tubos LF/rígido, kit aspersor 5022 por DN, registros VIQUA PN80, curvas 90° em ramais e laterais (TASK-035), curvas/derivações da adutora.
- `BOMPendingConnection` para conexões sem SKU homologado.
- Blocker comercial "BOM incompleta" quando `conexoesFisicasSemSkuCount > 0`.

**Escopo**
- `src/lib/bom.ts`, `src/lib/catalog/aspersores.ts`, `src/lib/layout/physical-connections.ts`.
- 7 SKUs VIQUA, kit 5022 com 5 SKUs, tubos LF/R, curvas 90°.

**Fora do escopo**
- BOM de luvas (sem critério de contagem).
- Catálogo de válvulas automáticas de seção.
- SKU `curva_45_adutora` (homologação pendente).
- Conferência item-a-item com lista de obra real (pendente E09).

**Critérios de aceite**
- Caso base (adutora ortogonal): `conexoesFisicasSemSkuCount === 0`.
- Kit 5022 resolvido para 100% das colunas com DN50 ou DN75.
- DN não homologado para kit → blocker "BOM incompleta".
- Curvas 90° de ramais (rígido) e laterais (LF) precificadas com SKU correto.

**Métricas**
- Testes do épico: ≥ 70 (`bom-*`, `physical-connections`, `lateral-bends-90`).
- Projeto A: BOM R$ 213.740,15; 344/344 aspersores em kit; 0 `BOMPendingConnection` no caminho feliz (TASK-046, TASK-035).

**Dependências**
- E02 (physicalColumns + routeCoords), E03 (DNs dimensionados), E04 (conexões geométricas).

**Decisões**
- **Regra técnica:** catálogo read-only (`CLAUDE.md`); registros VIQUA PN80 por homologação interna (ADR-005); curvas 90° de lateral usam apenas `CURVAS_90` LF (nunca rígidas em LF) — TASK-035.
- **Boa prática:** agrupamento de itens por SKU antes de emitir; meta com contadores específicos (`kitAspersorResolvCount`, `valvulasResolvidasCount`, `curvas90LateraisCount`).
- **Decisão de engenharia:** kit aspersor 5022 homologado apenas para DN50/DN75; regra do tubo de subida = 1 unidade por aspersor.
- **Decisão comercial:** blocker comercial "BOM incompleta" bloqueia proposta enquanto houver `BOMPendingConnection` no projeto.

**Riscos**
- `curva_45_adutora` sem SKU → `BOMPendingConnection` permanente em projetos com adutora diagonal.
- `marca` em branco para 3 SKUs do kit 5022 (`1819000`, `1000843`, `1000354`).
- BOM jamais confrontada com lista de obra real.

**Status real**
- **Validado visualmente no Projeto A — caso único.** Evidência: relatório TASK-046 (2026-05-22) — BOM R$ 213.740,15, 344/344 aspersores em kit, DN100 LF = 0, `conexoesFisicasSemSkuCount === 0`. Não validado contra lista de obra real do RT.

**Tasks vinculadas — concluídas:** TASK-005, TASK-006A, TASK-006B, TASK-022, TASK-023, TASK-035
**Tasks vinculadas — pendentes/futuras:** SKU `curva_45_adutora`; preencher `marca` dos 3 SKUs em branco; catálogo de luvas; catálogo de válvulas automáticas

---

### E06 — Mapa e Workspace

**Propósito**
- Apresentar o projeto geograficamente, permitir interação básica (captação, polígono, busca, jornada, setorização) e expor diagnósticos sem lógica de domínio na UI.

**Capacidade entregue**
- Workspace full-screen com painel lateral fixo (desktop) e drawer (mobile).
- Mapbox com camadas de aspersores, setores, principal, adutora, ramais, laterais físicas.
- Busca por endereço e coordenadas decimais.
- Labels de setor ancorados em `PhysicalColumn.startLngLat`.
- Sidebar com blockers (vermelho), warnings (âmbar) e `pdfError`.

**Escopo**
- `src/components/map/ProjectMap.tsx`, `src/app/projetos/[id]/page.tsx`.
- Funções puras auxiliares em `src/lib/layout/sector-label-anchor.ts`, `geo-utils.ts`.

**Fora do escopo**
- Lógica de domínio em componentes (proibida pelo `CLAUDE.md`).
- Edição de polígono offline.
- Histórico de versões de projeto.

**Critérios de aceite**
- Drawer mobile abre/fecha/rola corretamente em viewport ≤ 768 px.
- `pdfError.invalidHydraulicSegments` exibido no sidebar quando PDF é bloqueado.
- Labels corretos com 2, 3 e 4 setores e coluna fragmentada.
- 100dvh sem overflow em Safari mobile.

**Métricas**
- Testes do épico: ≥ 18 (testes puros — UI não testada automaticamente).
- Validação visual no Projeto A: navegação, mapa, sidebar, PDF download (TASK-046).

**Dependências**
- E02–E05 fornecem dados; E07 fornece o gate de PDF.

**Decisões**
- **Regra técnica:** nenhuma lógica de domínio em `src/components/` (`CLAUDE.md`); orquestrador único consome dados (ADR-001).
- **Boa prática:** drawer mobile com áreas clicáveis ≥ 44×44 px; `100dvh` em vez de `100vh` para evitar overflow em Safari.
- **Decisão de engenharia:** workspace sem `max-w-7xl` — mapa ocupa viewport inteiro (TASK-021); labels via `PhysicalColumn.startLngLat` com fallback ao centroide (TASK-014).
- **Decisão comercial:** —

**Riscos**
- Toggle do drawer sem `aria-expanded` (acessibilidade — achado H1 da TASK-048).
- `pdfError.invalidHydraulicSegments` e labels 2/3/4 setores **não validados visualmente** — TASK-048 marcou NÃO EXECUTADO por limitação ambiental (sem fixtures + canvas Mapbox bloqueia automação de desenho).
- Busca por coordenadas brasileiras (vírgula decimal) ainda não suportada.

**Status real**
- **Testado em código.** Evidência: 18 testes puros; navegação no Projeto A confirmada (TASK-046); TASK-048 (2026-05-22) validou Cenário 1 (drawer mobile) e Cenário 6 (coluna fragmentada — 17 splits) como PASS, mas Cenários 2-5 ficaram NÃO EXECUTADOS por limitação ambiental — E06 **não promovido**.

**Tasks vinculadas — concluídas:** TASK-007, TASK-014, TASK-021, TASK-048 (parcial), TASK-049 (fixtures plantados)
**Tasks vinculadas — pendentes/futuras:** TASK-050 — re-execução TASK-048 cenários 2-5 com fixtures E06 (habilita promoção); `aria-expanded` no toggle do drawer (H1); suporte a vírgula decimal brasileira na busca

---

### E07 — Proposta e PDF

**Propósito**
- Emitir PDF técnico da proposta apenas quando o projeto não tem blockers; bloquear com HTTP 422 + diagnóstico quando há.

**Capacidade entregue**
- Gate de emissão na rota de PDF (HTTP 200 ou 422 com `{error, message, blockers}`).
- `pdfEmissionBlockers()` puro e testável em `irrigation-project.ts`.
- PDF com aspersores, setores, dimensionamento hidráulico, BOM precificada.

**Escopo**
- `src/app/projetos/[id]/pdf/route.ts`, `src/components/proposta/PropostaPDF.tsx`, `pdfEmissionBlockers()`.

**Fora do escopo**
- Pressão real por derivação exibida no PDF.
- Validação RT do PDF como proposta completa para cliente.

**Critérios de aceite**
- `diagnostics.blockers.length > 0` → HTTP 422 com JSON estruturado.
- `diagnostics.blockers.length === 0` → PDF emitido.
- Conteúdo técnico mínimo presente: aspersores, setores, HMT, BOM precificada.

**Métricas**
- Testes do épico: ≥ 3 (gate) + cobertura indireta via `bom-*`, `pdf-emission-hmt-gate`.
- Projeto A: PDF HTTP 200 + download automático (TASK-046).

**Dependências**
- E03 (HMT, dimensionamento), E04 (construtibilidade), E05 (BOM).

**Decisões**
- **Regra técnica:** gate HTTP 422 quando há blockers ativos (ADR-003); `pdfEmissionBlockers()` puro em `irrigation-project.ts`.
- **Boa prática:** mensagem de blocker descritiva + ações sugeridas; blockers vermelhos e warnings âmbar separados no sidebar.
- **Decisão de engenharia:** PDF emitido somente após validação completa (hidráulica + construtibilidade + BOM).
- **Decisão comercial:** bloqueio comercial quando `conexoesFisicasSemSkuCount > 0` — proposta com BOM incompleta nunca chega ao cliente.

**Riscos**
- PDF jamais validado pelo RT como proposta apresentável.
- Proposta jamais enviada a cliente real.
- Pressão real por derivação ainda não exibida no PDF (pendência).

**Status real**
- **Validado visualmente no Projeto A — caso único.** Evidência: relatório TASK-046 (2026-05-22) — `POST /pdf → 200 OK` + download; relatório TASK-047 (2026-05-22) — diâmetros de ramais agora exibidos no Memorial Hidráulico. Não validado pelo RT como proposta para cliente.

**Tasks vinculadas — concluídas:** TASK-003, TASK-047
**Tasks vinculadas — pendentes/futuras:** validação RT do PDF como proposta completa; pressão real por derivação no PDF

---

### E08 — Motor Comercial

**Propósito**
- Classificar projetos em A/B/C (governança comercial) e decidir tipo de proposta e gate de emissão com base no resultado técnico + contexto comercial.

**Capacidade entregue**
- (Planejada) `ProjectClassificationEngine` retornando `projectClass: "A" | "B" | "C"`.
- (Planejada) Integração da classe ao PDF e proposta.

**Escopo**
- (Pendente) `src/lib/governance/` ou similar.
- Consumidor: orquestrador `calculateIrrigationProject` passa a incluir `projectClass`.

**Fora do escopo**
- Implementação técnica do motor (E02–E07) — entradas, não responsabilidades.
- Diagnóstico do software (TASK-001) — pré-requisito.

**Critérios de aceite**
- TASK-001 (diagnóstico do software) concluída.
- `docs/metodologia/09-classificacao-de-projetos.md` homologado pelo RT.
- TASK-002 implementada com testes.
- A/B/C consumida pelo Motor Comercial (decisão de tipo de proposta).

**Métricas**
- (Pendente) Cobertura de testes a definir na TASK-002.

**Dependências**
- E01 (governança), E02–E07 (motor técnico estável), homologação RT de `09-classificacao-de-projetos.md`.

**Decisões**
- **Regra técnica:** A/B/C é governança — não dimensionamento técnico (decisão registrada na TASK-002 planejada).
- **Boa prática:** separar técnico (motor) de comercial (proposta) para evitar acoplamento.
- **Decisão de engenharia:** `ProjectClassificationEngine` consome resultado técnico + contexto comercial + diagnósticos — pendente.
- **Decisão comercial:** A/B/C define tipo de proposta e gate de emissão — pendente.

**Riscos**
- Sem TASK-001 concluída, premissas de classificação ficam sem base.
- Homologação RT de `09-classificacao-de-projetos.md` ainda não iniciada.

**Status real**
- **Não iniciado.** Evidência: nenhuma task concluída no épico; `docs/metodologia/09-classificacao-de-projetos.md` existe mas sem homologação RT.

**Tasks vinculadas — concluídas:** —
**Tasks vinculadas — pendentes/futuras:** TASK-001, TASK-002, integração A/B/C ao PDF e proposta

---

### E09 — Calibração e Validação de Campo

**Propósito**
- Calibrar parâmetros provisórios com dados de campo reais e validar o motor contra projetos históricos da Brasmáquinas até atingir homologação RT.

**Capacidade entregue**
- (Parcial) Premissas documentadas em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`.
- (Parcial) Validação visual interna no Projeto A fictício (TASK-027→046).
- (Pendente) Comparação com projeto histórico real.
- (Pendente) Homologação RT formal dos parâmetros.

**Escopo**
- Revisão RT dos parâmetros `PENDENTE_REVISAO_RT_BRASMAQUINAS` (≥ 9).
- Revisão RT dos pesos `PENDENTE_CALIBRACAO_RT_CAMPO`.
- Roteiro mínimo de 6 passos antes da primeira proposta real (TASK-024D, Seção 11.2).

**Fora do escopo**
- Alteração de qualquer valor calibrável sem aprovação RT (regra de premissas provisórias).
- Substituição da metodologia interna por dado externo não homologado.

**Critérios de aceite**
- ≥ 1 projeto histórico real comparado com output do motor (HMT, diâmetros, BOM).
- RT aprova ≥ 9 parâmetros pendentes.
- Roteiro mínimo de 6 passos executado integralmente.
- Piloto interno executado pela Brasmáquinas antes da primeira proposta real.

**Métricas**
- Parâmetros aprovados pelo RT: 0/9.
- Projetos históricos comparados: 0.
- Passos do roteiro mínimo executados: passos 1–2 e 4 viáveis hoje; 3, 5, 6 bloqueados por pendências (Seção 11).

**Dependências**
- E01–E07 estáveis (atingido para caminho feliz default — TASK-046 + TASK-047).
- TASK-025 absorvida pela TASK-031 (concluída).

**Decisões**
- **Regra técnica:** premissas com status `PENDENTE_REVISAO_RT_BRASMAQUINAS` não podem ser usadas em proposta sem revisão; nenhum parâmetro homologado RT até hoje.
- **Boa prática:** toda decisão sem dado de campo registrada em `docs/metodologia/12-premissas-...md` com motivo, risco, responsável.
- **Decisão de engenharia:** pesos `PENDENTE_CALIBRACAO_RT_CAMPO` mantidos ativos com valores conservadores até calibração.
- **Decisão comercial:** primeira proposta real para cliente NÃO deve ser a primeira validação do sistema (regra central — TASK-024D).

**Riscos**
- Validação visual interna do Projeto A (TASK-027→046) é caso único fictício — não substitui projeto histórico real nem piloto interno.
- Sem projeto piloto, custos e prazos do motor permanecem não calibrados.
- Premissas podem se acumular sem revisão e gerar dívida técnica.

**Status real**
- **Não iniciado formalmente em campo / parcial em validação interna.** Evidência: ≥ 12 premissas em `12-premissas-...md` com status pendente; série TASK-027→046 fechou caminho feliz visual interno no Projeto A fictício; nenhum projeto histórico real comparado; RT não iniciou revisão.

**Tasks vinculadas — concluídas:** — (validação interna parcial via TASK-027, TASK-033, TASK-039, TASK-041, TASK-044, TASK-046 conta como evidência preparatória, não como conclusão do épico)
**Tasks vinculadas — pendentes/futuras:** Revisão RT dos 9 parâmetros pendentes; comparação com projeto histórico real; piloto interno; passos 3, 5 e 6 do roteiro mínimo

---

> **Origem do status real** — cada nível declarado nesta seção corresponde estritamente à evidência documentada em relatórios já publicados em `docs/relatorios/` e/ou ADRs em `docs/decisoes/`. Promoções de nível desde a auditoria da TASK-024C (2026-05-21) foram aplicadas apenas para os épicos onde TASK-046 (2026-05-22) fechou a série de validação visual no Projeto A. Comparação com projeto histórico real, piloto interno e homologação RT permanecem pendentes em todos os épicos do MVP obrigatório.

---

## 3. Tasks concluídas por épico

### E01 — Fundação e Governança

| Task          | Título                                                   | Data        |
|---------------|----------------------------------------------------------|-------------|
| TASK-000      | Fundação operacional do repositório                      | 2026-05-19  |
| TASK-011      | Política de ADR e ADRs retroativos (ADR-001..008)        | 2026-05-20  |
| TASK-011B     | ADR-009 — Validação hidráulica Top-K                     | 2026-05-20  |
| TASK-012      | Saneamento de working tree e separação de commits        | 2026-05-20  |
| TASK-020      | ADR-011 — Aspersor obrigatoriamente sobre lateral física  | 2026-05-20  |

> ADRs gerados neste épico: ADR-001 a ADR-011 (todos em `docs/decisoes/`).

---

### E02 — Motor de Layout — Malha de Aspersores

| Task          | Título                                                          | Data        |
|---------------|-----------------------------------------------------------------|-------------|
| TASK-010A     | Extrair motor puro de geração da malha de aspersores            | 2026-05-20  |
| TASK-010B     | Motor geométrico inicial de candidatos de layout 12×12          | 2026-05-20  |
| TASK-010C     | Integração do motor de candidatos à UI em modo experimental     | 2026-05-20  |
| TASK-010D     | Métricas operacionais de setorização no motor de candidatos     | 2026-05-20  |
| TASK-010E-A   | Métricas de comprimento de laterais no motor de candidatos      | 2026-05-20  |
| TASK-010E-B   | Métricas de rede de distribuição no motor de candidatos         | 2026-05-20  |
| TASK-010F     | Validação hidráulica Top-K dos candidatos de layout             | 2026-05-20  |
| TASK-010Z     | Consolidação e documentação do motor de layout 12×12            | 2026-05-20  |

---

### E03 — Motor Hidráulico

| Task          | Título                                                        | Data        |
|---------------|---------------------------------------------------------------|-------------|
| HIST-001      | Auditar solver hidráulico V2 — diâmetro interno, caminho crítico | histórico |
| HIST-002      | Dimensionar ramais/secundárias individualmente                 | histórico   |
| HIST-003      | Validar bomba informada contra HMT e vazão                    | histórico   |
| TASK-004      | Validar PN/classe de pressão por trecho                       | 2026-05-19  |
| TASK-009C     | Extrair função única de ponto de entrada da lateral           | 2026-05-20  |

---

### E04 — Construtibilidade Física

| Task          | Título                                                          | Data        |
|---------------|-----------------------------------------------------------------|-------------|
| TASK-013      | Auditar e corrigir laterais físicas construtíveis               | 2026-05-20  |
| TASK-015      | Roteamento construtível de ramais/secundárias com 90°/180°      | 2026-05-20  |
| TASK-016      | Corrigir falso positivo 180° na junção ramal-lateral            | 2026-05-20  |
| TASK-017      | Corrigir lateral física para rota reta/construtível (renderização) | 2026-05-20 |
| TASK-018      | Corrigir eixo canônico das laterais físicas                     | 2026-05-20  |
| TASK-019      | Integrar desvio aspersor-eixo da lateral em diagnostics         | 2026-05-20  |

---

### E05 — BOM e Catálogo

| Task          | Título                                                          | Data        |
|---------------|-----------------------------------------------------------------|-------------|
| TASK-005      | Modelar BOM dos pontos de controle e válvulas                   | 2026-05-19  |
| TASK-006A     | Saneamento e homologação do catálogo de válvulas/registros      | 2026-05-19  |
| TASK-006B     | BOM automática de registro manual de seção (VIQUA)              | 2026-05-19  |
| TASK-022      | BOM de conexões físicas construtíveis                           | 2026-05-21  |
| TASK-023      | Homologar kit de ligação do aspersor 5022 por DN da lateral     | 2026-05-21  |

---

### E06 — Mapa e Workspace

| Task          | Título                                                          | Data        |
|---------------|-----------------------------------------------------------------|-------------|
| TASK-007      | Localizar projeto por endereço ou coordenadas no mapa           | 2026-05-19  |
| TASK-014      | Labels de setor no mapa usando PhysicalColumn.startLngLat       | 2026-05-20  |
| TASK-021      | Workspace full-screen com painel lateral                        | 2026-05-21  |

---

### E07 — Proposta e PDF

| Task          | Título                                                          | Data        |
|---------------|-----------------------------------------------------------------|-------------|
| TASK-003      | Bloquear PDF quando há blockers ativos (gate HTTP 422)          | 2026-05-19  |
| TASK-047      | Diâmetros individuais de ramais no PDF (Memorial Hidráulico)    | 2026-05-22  |

---

### E08 — Motor Comercial

*Nenhuma task concluída ainda. Ver tasks futuras.*

---

### E09 — Calibração e Validação de Campo

*Nenhuma task concluída ainda. Ver tasks futuras.*

---

## 4. Tasks futuras por épico

### E01 — Fundação e Governança

| Prioridade | Título                                                   | Bloqueante para          |
|------------|----------------------------------------------------------|--------------------------|
| P1         | **TASK-001** — Diagnóstico formal do software atual      | TASK-002                 |
| P2         | **TASK-002** — Motor de Governança A/B/C (ProjectClassificationEngine) | E08 inteiro |

### E02 — Motor de Layout

| Prioridade | Título                                                              | Bloqueante para        |
|------------|---------------------------------------------------------------------|------------------------|
| P3         | Calibração de pesos do motor de candidatos (OPTIMIZER_PARAMS)       | E09                    |
| P3         | Otimização de layout por massa mínima de PVC (**TASK-006**)         | —                      |

### E03 — Motor Hidráulico

| Prioridade | Título                                                              | Bloqueante para        |
|------------|---------------------------------------------------------------------|------------------------|
| P2         | **TASK-025** — Restringir seleção hidráulica de laterais a DN50/DN75 | BOM mais precisa      |
| P2         | Pressão real por derivação (ramal/lateral) usando `cumPrincipalHfM` | TASK-004 pendência     |
| P2         | Desnível geodético por segmento (elevações pontuais disponíveis)    | TASK-004 pendência     |

### E04 — Construtibilidade Física

| Prioridade | Título                                                              | Bloqueante para        |
|------------|---------------------------------------------------------------------|------------------------|
| P2         | Validar TOLERANCIA_ASPERSOR_EIXO_LATERAL para projetos > 500 m     | TASK-019 pendência     |

### E05 — BOM e Catálogo

| Prioridade | Título                                                               | Bloqueante para          |
|------------|----------------------------------------------------------------------|--------------------------|
| P2         | Catálogo curva 45° adutora                                           | BOMPendingConnection em projetos com adutora diagonal |
| P2         | Catálogo de válvulas automáticas de seção                            | Controle automático de setor                       |
| P2         | Catálogo de luvas por tipo de tubo (critério de contagem a definir)  | BOM completa             |

### E06 — Mapa e Workspace

| Prioridade | Título                                                              | Bloqueante para        |
|------------|---------------------------------------------------------------------|------------------------|
| ✅ concluída | Seed de fixtures via `scripts/seed-e06-fixtures.ts` (TASK-049)    | Habilita TASK-050 (cobertura 9/14/21 em vez de 2/3/4 — restrição de schema) |
| P2         | TASK-050 — Re-execução TASK-048 cenários 2-5 com fixtures E06       | Promoção de E06        |
| P3         | `aria-expanded` no toggle do drawer mobile (H1 da TASK-048)         | Acessibilidade         |
| P3         | Suporte a vírgula decimal brasileira na busca de coordenadas        | TASK-007 pendência     |

### E07 — Proposta e PDF

| Prioridade | Título                                                              | Bloqueante para        |
|------------|---------------------------------------------------------------------|------------------------|
| P2         | Suporte a vírgula decimal brasileira na busca de coordenadas       | TASK-007 pendência     |
| P2         | Pressão real por derivação exibida no PDF                          | Proposta técnica completa |

### E08 — Motor Comercial

| Prioridade | Título                                                              | Bloqueante para        |
|------------|---------------------------------------------------------------------|------------------------|
| P2         | **TASK-002** — Motor A/B/C (depende de TASK-001)                   | Proposta comercial     |
| P2         | Integração da classificação A/B/C ao PDF e proposta                | Pós-MVP                |

### E09 — Calibração e Validação de Campo

| Prioridade | Título                                                              | Bloqueante para        |
|------------|---------------------------------------------------------------------|------------------------|
| P2         | Revisão RT dos pesos PENDENTE_CALIBRACAO_RT_CAMPO                  | Optimizer homologado   |
| P2         | Revisão RT das premissas PENDENTE_REVISAO_RT_BRASMAQUINAS           | Propostas sem ressalva |

---

## 5. Separação MVP

### MVP Obrigatório — sem isso o motor não gera proposta válida

| # | Entregável                                                         | Status           |
|---|--------------------------------------------------------------------|------------------|
| 1 | Malha de aspersores dentro do polígono                             | ✅ concluído     |
| 2 | Setorização por vazão com splitting de colunas                     | ✅ concluído     |
| 3 | Dimensionamento hidráulico completo (principal + ramais)           | ✅ concluído     |
| 4 | Validação de bomba (HMT + vazão)                                   | ✅ concluído     |
| 5 | Validação de PN/classe de pressão por trecho                       | ✅ concluído     |
| 6 | Laterais físicas construtíveis (eixo canônico, alinhamento)        | ✅ concluído     |
| 7 | Roteamento angular construtível (ramais em L, adutora)             | ✅ concluído     |
| 8 | BOM de tubos, aspersores, registros manuais de seção               | ✅ concluído     |
| 9 | BOM de conexões físicas — curvas 90° de ramal                      | ✅ concluído     |
| 10 | Kit de ligação aspersor 5022 por DN lateral (blocker em 100% dos projetos) | ✅ concluído (TASK-023) |
| 11 | Catálogo curva 45° adutora (BOMPendingConnection em projetos com adutora diagonal) | ⚠️ pendente (escopo futuro) |
| 12 | Gate de PDF funcionando (HTTP 422 com blockers)                    | ✅ concluído     |
| 13 | BOM precificada sem `BOMPendingConnection` remanescente            | ⚠️ parcial — curva_45_adutora residual |

### MVP Desejável — gera proposta usável mas com lacunas conhecidas

| # | Entregável                                                         | Status           |
|---|--------------------------------------------------------------------|------------------|
| 1 | Diâmetros de ramais no PDF                                         | ✅ concluído (TASK-047) |
| 2 | Pressão real por derivação (ramal/lateral)                         | pendente         |
| 3 | Validação browser drawer mobile e pdfError no sidebar              | pendente         |
| 4 | Suporte a vírgula decimal brasileira na busca de coordenadas       | pendente         |
| 5 | Tolerância TOLERANCIA_ASPERSOR_EIXO_LATERAL revisada para > 500 m  | pendente         |

### Pós-MVP — valor real, mas não bloqueia a primeira proposta

| # | Entregável                                                         | Épico |
|---|--------------------------------------------------------------------|-------|
| 1 | Motor de Governança A/B/C (TASK-002)                               | E08   |
| 2 | Diagnóstico formal do software atual (TASK-001)                    | E01   |
| 3 | Calibração RT dos OPTIMIZER_PARAMS com dados de campo              | E09   |
| 4 | Otimização por massa mínima de PVC (TASK-006)                      | E02   |
| 5 | Catálogo de válvulas automáticas de seção                          | E05   |
| 6 | Catálogo de luvas por tipo de tubo                                 | E05   |
| 7 | Solver hidráulico por candidato (substitui proxy de comprimento)   | E03   |
| 8 | Integração proposta técnica + comercial (Motor Comercial)          | E08   |

---

## 6. Critério objetivo de fim do MVP

O MVP está concluído quando **todas** as condições abaixo forem simultaneamente verdadeiras:

```
1. npx tsc --noEmit → 0 erros
2. npx vitest run   → 100% passando, contagem ≥ atual
3. Para qualquer projeto bem-formado:
   diagnostics.blockers.length === 0  →  PDF emitido sem HTTP 422
4. buildBOM(result).meta.conexoesFisicasSemSkuCount === 0
   (nenhuma BOMPendingConnection — tê aspersor-lateral e curva 45° resolvidos)
5. PDF contém: aspersores, setores, dimensionamento hidráulico, BOM completa precificada
6. Proposta apresentável a cliente sem ressalva técnica de blocker ativo
```

> **MVP tecnicamente atingido para o caso base** após TASK-023 (731/731 testes · 0 erros tsc). Projetos com adutora ortogonal satisfazem as 6 condições. Pendência residual: `curva_45_adutora` sem SKU — afeta somente projetos onde a adutora tem dobra em 45°; tratado como `BOMPendingConnection` até homologação futura.

---

## 7. Lista "não fazer agora"

Os itens abaixo foram identificados como possíveis, mas fora do escopo do sprint atual. Não criar tasks para eles sem aprovação explícita do RT.

| Item                                                                 | Motivo para não fazer agora                                        |
|----------------------------------------------------------------------|--------------------------------------------------------------------|
| Solver hidráulico por candidato no optimizer (substitui proxy)       | Custo computacional alto; proxy atual suficiente para ranking      |
| Topografia/perfil altimétrico por segmento (DEM real)                | Infra externa; sem dado de campo calibrado                         |
| Catálogo de luvas                                                    | Critério de contagem não definido; sem SKU aprovado pelo RT        |
| Válvulas automáticas de setor                                        | Catálogo não homologado; registro manual VIQUA é o caminho atual   |
| Motor Comercial A/B/C (TASK-002)                                     | Depende de TASK-001 (diagnóstico) e homologação de `09-classificacao-de-projetos.md` pelo RT |
| Relatório de validação de campo (TASK-001)                           | Sem projeto-piloto definido                                        |
| Otimização por massa mínima de PVC (TASK-006)                        | Melhoria de qualidade; não desbloqueia nada crítico               |
| Calibração RT dos OPTIMIZER_PARAMS                                   | Depende de projetos reais homologados; sem dado de campo ainda     |
| Suporte multi-source (mais de uma captação)                          | Arquitetura não preparada; caso de uso não confirmado pelo RT      |
| Irrigação por gotejamento / microaspersão                            | Motor diferente; fora do escopo do convencional 12×12              |
| Integração ERP / exportação de BOM para sistema externo              | Infra de integração fora do escopo da plataforma atual             |
| Histórico de versões de projeto (revisão/revisão 2/etc.)             | Persistência complexa; sem requisito definido                      |

---

## 8. Próximas 5 tasks recomendadas (em ordem)

### #1 — TASK-025: Restringir seleção hidráulica de laterais a DN50/DN75 `[Classe A]`

**Por quê primeiro:** Com o MVP tecnicamente completo (TASK-023 concluída), a próxima melhoria de maior impacto no solver é restringir o catálogo de seleção de laterais aos diâmetros efetivamente usados em campo (DN50 e DN75). Isso torna a BOM mais precisa, elimina seleções de tubo inviáveis e prepara o terreno para calibração RT.

**Escopo:**
- Identificar quais DNs de lateral são aceitos pelo RT Brasmáquinas para irrigação convencional 12×12
- Filtrar `selectSecondaryPipe` (ou equivalente de lateral) para restringir ao conjunto DN50/DN75
- `buildBOM` passa a listar somente SKUs do conjunto aprovado
- Testes: ≥ 3 (projeto que forçaria DN menor → seleciona DN50; DN75 quando necesário; regressão)

---

### #2 — Validação browser das pendências das TASKs 021 e 022 `[Classe E]` — ⚠ parcialmente concluída em TASK-048 (2026-05-22)

**Resultado parcial:** TASK-048 cobriu Cenário 1 (drawer mobile — PASS) e Cenário 6 (coluna fragmentada — PASS). Cenários 2 (`pdfError`), 3-5 (labels 2/3/4 setores) ficaram NÃO EXECUTADOS por limitação ambiental (Projeto A em 0 blockers + canvas Mapbox WebGL bloqueia criação de projeto fictício via Playwright). E06 **não promovido**. Achados H1..H4 documentados. Follow-up: seed de fixtures (≤ 80 linhas) desbloqueia Cenários 2-5 e habilita re-execução.

---

### #3 — Diâmetros de ramais no PDF `[Classe B]` — ✅ concluída em TASK-047 (2026-05-22)

**Resultado:** Memorial Hidráulico (Página 3) ganhou seção "Dimensionamento dos ramais" com 7 colunas (Ramal, SKU, DN, Comprimento, Velocidade, Hf, Status) consumindo `result.hydraulics.sizedSecondaries`. Helper puro `mapSizedSecondariesToRows` em `src/lib/pdf/secondary-rows.ts`. 9 testes T47-1..T47-9; suíte 817 → 826. Catálogo, solver, orquestrador e gate intocados.

---

### #4 — Pressão real por derivação (ramal/lateral) `[Classe A]`

**Por quê quarto:** A TASK-004 marcou como pendência o cálculo de pressão real nos ramais e laterais usando `cumPrincipalHfM`. Hoje ramais/laterais usam HMT como limite conservativo, gerando `violation_conservative` em vez de `violation_confirmed`. Isso torna os warnings de PN menos precisos.

**Escopo:**
- Propagar `cumPrincipalHfM` até o ponto de entrada de cada ramal
- Recalcular `PressureClassCheck` para `violation_confirmed` ou `ok` real em ramais
- Testes: ≥ 3 (incluindo caso confirmado de violação real vs. conservativo)

---

### #5 — Revisão RT: TOLERANCIA_ASPERSOR_EIXO_LATERAL para projetos > 500 m `[Classe E → D se aprovada]`

**Por quê quinto:** A tolerância atual de 0,10 m pode gerar blockers espúrios em fazendas maiores por erro flat-earth. A TASK-019 documentou o risco. Esta task formaliza a revisão com o RT e, se aprovada, ajusta a constante para 0,20 m com teste de regressão.

**Escopo:**
- Consulta RT Brasmáquinas sobre projetos > 500 m
- Se aprovado: atualizar `TOLERANCIA_ASPERSOR_EIXO_LATERAL` de 0,10 → 0,20 m em `laterais.ts`
- Atualizar premissa em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- Testes: verificar que T19-a..h passam com novo limiar; adicionar caso > 500 m

---

---

## 9. Classificação operacional de tasks

> Adicionado em TASK-024B (2026-05-21). Objetivo: evitar que todas as tasks sigam o mesmo fluxo pesado. Cada classe tem critério objetivo, fluxo recomendado e obrigações de teste.

### 9.1 — Definição das classes

| Classe | Nome           | Perfil                                                                                       |
|--------|----------------|----------------------------------------------------------------------------------------------|
| **A**  | Crítica        | Nova lógica de domínio; toca motor, orquestrador, catálogo ou blockers de PDF               |
| **B**  | Importante     | Feature visível (UI, PDF, BOM) sem alterar invariantes do orquestrador ou catálogo          |
| **C**  | Documental     | Não altera `src/`; produto é ADR, relatório, auditoria ou mapa                              |
| **D**  | Correção rápida| Bug com causa raiz identificada; escopo cirúrgico (< 20 linhas); sem novos módulos           |
| **E**  | Exploratória   | Investigação ou validação; produto é relatório ou decisão — não código comprometido          |

---

### 9.2 — Critério objetivo de classificação

Uma task recebe a **classe mais restritiva** que se aplica (A > B > D > C > E).

**Classe A** — qualquer critério verdadeiro:
- Altera `src/lib/layout/`, `src/lib/hydraulics/`, `src/lib/bom.ts` ou `src/lib/catalog/` com nova lógica
- Cria ou modifica um `blocker` em `generateProposalDiagnostics`
- Modifica contrato de `calculateIrrigationProject()` (novos campos em `IrrigationProjectResult`)
- Requer ≥ 5 novos testes de domínio

**Classe B** — todos os critérios verdadeiros:
- Altera `src/` mas não toca orquestrador nem catálogo de modo a mudar invariantes
- Adiciona feature visível com ≥ 3 novos testes (ou validação manual documentada)
- Não cria blocker novo (pode adicionar warning)

**Classe C** — todos os critérios verdadeiros:
- Não altera nenhum arquivo em `src/`
- Produto é exclusivamente documentação, auditoria ou registro
- `tsc` e `vitest` não precisam ser verificados (nenhum código mudou)

**Classe D** — todos os critérios verdadeiros:
- Bug com causa raiz já identificada antes do início
- Escopo ≤ 20 linhas alteradas em `src/`
- Requer ≥ 1 novo teste de regressão cobrindo o bug
- Não cria novos tipos, interfaces ou módulos

**Classe E** — qualquer critério verdadeiro:
- Objetivo declarado é investigar, validar ou explorar — não implementar
- Produto é relatório, decisão documentada ou checklist de validação
- Pode gerar uma task de classe A/B/D como follow-up, mas não compromete código agora

---

### 9.3 — Fluxo recomendado por classe

| Classe | Fluxo                                                                                                          | Checklist obrigatório                                     |
|--------|----------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **A**  | `/iniciar-task` → `/planejar` (detalhado, com riscos) → aprovação explícita → `/implementar` → tsc + vitest → `/fechar-task` | ≥ 5 testes; 0 erros tsc; nenhum test eliminado  |
| **B**  | `/iniciar-task` → `/planejar` (objetivo + critérios de aceite) → aprovação → `/implementar` → tsc + vitest → `/fechar-task`  | ≥ 3 testes; 0 erros tsc; nenhum test eliminado  |
| **C**  | `/iniciar-task` → plano inline (sem `/planejar` formal) → produzir documento → `/fechar-task`                 | Nenhum arquivo em `src/` alterado; relatório criado        |
| **D**  | `/iniciar-task` → escopo descrito inline (< 5 linhas de plano) → `/implementar` → tsc + vitest → `/fechar-task` | ≥ 1 teste de regressão; escopo ≤ 20 linhas             |
| **E**  | `/iniciar-task` → investigar / validar → relatório de achados → `/fechar-task`                                 | Relatório com achados; possível abertura de nova task A/B/D |

> **Regra de escalada:** se durante a execução de uma task D ou E o escopo ultrapassar os critérios da classe, a task deve ser pausada e reclassificada antes de continuar.

---

### 9.4 — Classificação das próximas tasks do backlog

| Task / Escopo                                              | Classe            | Justificativa                                                                                          |
|------------------------------------------------------------|-------------------|--------------------------------------------------------------------------------------------------------|
| TASK-025 — Restringir laterais a DN50/DN75                 | **A — Crítica**   | Altera seletor hidráulico em `src/lib/`; toca invariante de dimensionamento; ≥ 5 testes esperados     |
| Validação browser TASK-021/022                             | **E — Exploratória** | Objetivo é confirmar comportamento visual; produto é relatório; sem código comprometido              |
| Diâmetros individuais de ramais no PDF                     | **B — Importante** | Altera `PropostaPDF.tsx`; lê `sizedSecondaries` já disponível; não toca solver nem orquestrador       |
| Pressão real por derivação (ramal/lateral)                 | **A — Crítica**   | Propaga `cumPrincipalHfM`; recalcula `PressureClassCheck`; pode criar blockers confirmados novos      |
| Revisão RT — `TOLERANCIA_ASPERSOR_EIXO_LATERAL` > 500 m   | **E → D**         | Classe E enquanto é consulta ao RT; reclassifica para D se RT aprovar ajuste da constante             |

---

---

## 10. Auditoria de conclusão dos épicos

> Adicionado em TASK-024C (2026-05-21). Classifica o status real de cada épico diferenciando implementação em código de validação visual, de projeto piloto e de homologação Brasmáquinas.

### Escala de maturidade (revisada por TASK-024D)

`Implementado` → `Testado em código` → `Validado em simulação sintética` → `Validado em projeto histórico` → `Validado visualmente` → `Validado em piloto interno` → `Homologado Brasmáquinas`

> *Não iniciado* e *Em desenvolvimento* são estados implícitos abaixo de *Implementado*.

### Tabela de status real

| Épico | Status atual | Evidências existentes | Evidências faltantes | Critério para avançar | MVP obrigatório? |
|---|---|---|---|---|---|
| **E01** Fundação e Governança | **Implementado** | CLAUDE.md; 11 docs metodologia; ADR-001..011; 5 comandos; backlog + templates | RT nunca aprovou formalmente a metodologia; nenhuma sessão documentada como modelo completo | RT aprova metodologia; ≥ 1 task A usada como modelo de referência | Sim |
| **E02** Motor de Layout | **Testado em código** | 570+ testes; ADR-006, ADR-009; 112 candidatos; badge "não homologado" na UI | 9 premissas sem revisão RT; nenhum projeto piloto com layout do optimizer | RT aprova 9 parâmetros; ≥ 1 projeto piloto com layout aprovado | Sim (grid = core; optimizer = experimental) |
| **E03** Motor Hidráulico | **Testado em código** | ADR-002, ADR-008; 430+ testes; HW com diâmetro interno; pump validation; PN class | TASK-025 pendente (DN100 selecionável); pressão real por derivação pendente; HMT jamais comparada com projeto real | TASK-025 concluída; pressão real implementada; ≥ 1 projeto piloto com dimensionamento validado pelo RT | Sim |
| **E04** Construtibilidade Física | **Testado em código** | ADR-004, ADR-010, ADR-011; ~66 testes (ângulo + eixo + roteamento); regra angular confirmada pelo RT | `TOLERANCIA_ASPERSOR_EIXO_LATERAL` (0,10 m) pendente revisão RT; `TOLERANCIA_ANGULAR` (±5°) pendente revisão RT | RT aprova as duas tolerâncias; ≥ 1 projeto piloto com rede física verificada em campo | Sim |
| **E05** BOM e Catálogo | **Testado em código** | ADR-005; 70+ testes BOM; 7 SKUs VIQUA PN80; kit aspersor 5022 com SKUs reais | `curva_45_adutora` sem SKU; `marca` de 3 SKUs em branco; luvas sem critério; BOM jamais confrontada com lista de obra real | SKU `curva_45_adutora` homologado; marcas preenchidas; ≥ 1 projeto piloto com BOM conferida contra lista real | Sim |
| **E06** Mapa e Workspace | **Testado em código** | 18 testes puros; workspace full-screen; busca de endereço; labels de setor | Drawer mobile pendente (TASK-021); `pdfError` no sidebar pendente (TASK-021); labels com 2/3/4 setores não validados visualmente (TASK-014); vírgula decimal pendente | Pendências TASK-021 e TASK-014 confirmadas via task E; ≥ 1 sessão real com cliente | Sim |
| **E07** Proposta e PDF | **Testado em código** | ADR-003; 3 testes de gate; PDF emitido sem blockers; seção de blockers no sidebar | Diâmetros de ramais ausentes do PDF; pressão real não exibida; PDF jamais validado pelo RT como proposta completa; proposta jamais enviada a cliente | Diâmetros de ramais no PDF; pressão real implementada; RT valida o PDF como proposta técnica completa | Sim |
| **E08** Motor Comercial | **Não iniciado** | `09-classificacao-de-projetos.md` existe; TASK-001 e TASK-002 planejadas | Toda implementação; TASK-001 pendente; homologação RT de `09-classificacao-de-projetos.md` ausente | TASK-001 concluída + homologação RT + TASK-002 implementada | Não (pós-MVP) |
| **E09** Calibração e Validação de Campo | **Não iniciado** | Premissas documentadas em `12-premissas-provisorias-e-revisao-rt.md`; marcadores no código | Nenhum projeto piloto; nenhum dado de campo; RT não iniciou revisão dos parâmetros | ≥ 1 projeto real comparado com output do motor; RT aprova ≥ 9 parâmetros pendentes | Não (necessário para homologar, não para primeira proposta) |

### Achado principal

**Todos os 7 épicos do MVP obrigatório estão em "Testado em código" (E01 em "Implementado"). Nenhum atingiu "Validado visualmente" de forma documentada.** A primeira proposta enviada a cliente real será simultaneamente o primeiro projeto piloto (E09) e a primeira validação visual documentada de múltiplos épicos. Essa sessão deve ser tratada como evento formal de validação.

> Auditoria detalhada por épico: `tasks/TASK-024C-auditoria-conclusao-epicos-mvp.md`

---

## 11. Matriz de validação por épico

> Adicionado em TASK-024D (2026-05-21). **Regra central: a primeira proposta real para cliente NÃO deve ser a primeira validação do sistema.**

### 11.1 — Matriz por épico

| Épico | O que validar | Tipo de teste | Evidência exigida | Critério de aprovação | Responsável | Status atual | Próxima ação |
|---|---|---|---|---|---|---|---|
| **E01** Fundação | Fluxo `/iniciar-task → /fechar-task` completo para task Classe A | Manual | ≥ 1 task A com task file + relatório + backlog + ADR (se aplicável) | RT confirma artefatos corretos e fluxo reproduzível | RT Brasmáquinas | Implementado | Usar TASK-025 como task modelo |
| **E02** Layout | Grid correto para área conhecida; optimizer rankeia candidatos razoavelmente; Top-K penaliza blockers | Simulação sintética + projeto histórico | Contagem de aspersores conferida; RT compara layout gerado vs. manual; candidato com blocker abaixo de candidato válido | RT aceita layout sugerido; nenhum candidato com blocker como `best` quando há alternativa | RT Brasmáquinas | Testado em código | Simulação sintética 100×200 m antes de apresentar ao RT |
| **E03** Hidráulica | HMT, diâmetros e bomba vs. projeto real já calculado manualmente | Projeto histórico (após TASK-025) | Planilha comparativa HMT e diâmetros motor vs. manual | Divergência < 5% em HMT ou justificativa do RT | RT Brasmáquinas | Testado em código | Aguardar TASK-025; depois projeto histórico |
| **E04** Construtibilidade | Rede física sem zigue-zague; tolerâncias sem blockers espúrios; ângulos corretos | Visual (browser) + simulação sintética | Screenshot de rede correta; projeto > 500 m sem blocker espúrio; rede a 89° sem blocker | Zero blockers espúrios; rede visualmente construtível | RT Brasmáquinas | Testado em código | Passo 4 do roteiro (validação visual) |
| **E05** BOM | BOM confere com lista de materiais de obra real; SKUs corretos; sem `BOMPendingConnection` no caso base | Projeto histórico + simulação sintética | Comparação item a item da BOM vs. lista de obra; `conexoesFisicasSemSkuCount === 0` confirmado | Diferença ≤ 5% por tipo de item; RT assina a BOM | RT Brasmáquinas | Testado em código | BOM do projeto histórico apresentada ao RT (passo 3) |
| **E06** Mapa/UI | Drawer mobile; `pdfError` no sidebar; labels de setor 2/3/4 setores; workspace full-screen | Visual (browser) | Screenshots de cada cenário documentados | Todos os elementos corretos; sem layout quebrado em nenhum viewport | Usuário técnico + RT | Testado em código | Task E (validação TASK-021 e TASK-014 pendentes) |
| **E07** PDF | PDF com todas as informações técnicas; gate HTTP 422 correto; RT avalia como proposta completa | Visual + projeto histórico + simulação sintética | PDF do projeto histórico avaliado pelo RT; HTTP 422 com blocker ativo | RT confirma PDF utilizável para cliente; diâmetros de ramais presentes | RT Brasmáquinas | Testado em código | Implementar diâmetros de ramais (task B) antes de validar com RT |
| **E08** Motor Comercial | — | — | — | — | — | Não iniciado | Aguardar TASK-001 + homologação RT |
| **E09** Calibração | — | — | — | — | — | Não iniciado | O roteiro mínimo (passos 1–6) é a preparação para E09 |

### 11.2 — Roteiro mínimo antes da primeira proposta real

| Passo | O que fazer | Bloqueador atual | Responsável |
|---|---|---|---|
| **1** Projeto fictício simples | Polígono ~5 ha, adutora ortogonal, sem blocker; verificar PDF gerado e BOM sem `BOMPendingConnection` | Nenhum | Usuário técnico |
| **2** Projeto fictício com blocker | Mesmo polígono com blocker induzido; verificar HTTP 422 e exibição no sidebar | Nenhum | Usuário técnico |
| **3** Projeto histórico já orçado | Dados de projeto real Brasmáquinas; comparar HMT, diâmetros e BOM com cálculo manual do RT | TASK-025 absorvida pela TASK-031 (concluída); diâmetros de ramais no PDF concluídos (TASK-047) | Usuário técnico + RT |
| **4** Validação visual no browser | Browser real: workspace, drawer mobile, labels de setor, sidebar de blockers | Nenhum | Usuário técnico |
| **5** PDF simulado | Gerar e imprimir PDF do projeto histórico; RT avalia formato e conteúdo | Nenhum bloqueador técnico (diâmetros de ramais no PDF concluídos — TASK-047); aguarda projeto histórico do passo 3 | Usuário técnico + RT |
| **6** Revisão interna e decisão formal | Reunião com RT; documentar achados 1–5; decisão: "pronto para cliente" ou "lista de pendências" | Depende dos passos 3 e 5 | RT Brasmáquinas + equipe |

> Detalhes de cada passo: `tasks/TASK-024D-matriz-validacao-epicos-mvp.md`

---

## 12. Rastreabilidade

- Backlog: `tasks/backlog.md`
- ADRs: `docs/decisoes/`
- Premissas provisórias: `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- Relatório TASK-024: `docs/relatorios/2026-05-21-TASK-024.md`
- Relatório TASK-024B: `docs/relatorios/2026-05-21-TASK-024B.md`
- Relatório TASK-024C: `docs/relatorios/2026-05-21-TASK-024C.md`
- Relatório TASK-024D: `docs/relatorios/2026-05-21-TASK-024D.md`
- Relatório TASK-024E: `docs/relatorios/2026-05-22-TASK-024E.md`
- Task TASK-024E: `tasks/TASK-024E-padronizar-epicos-blocos-valor-verificaveis.md`
- Relatório TASK-047: `docs/relatorios/2026-05-22-TASK-047.md`
- Task TASK-047: `tasks/TASK-047-diametros-ramais-pdf.md`
- Relatório TASK-048: `docs/relatorios/2026-05-22-TASK-048.md`
- Task TASK-048: `tasks/TASK-048-validacao-browser-task-021-014.md`
- Evidências TASK-048: `docs/relatorios/evidencias/2026-05-22-TASK-048/` (6 PNGs)
- Relatório TASK-049: `docs/relatorios/2026-05-22-TASK-049.md`
- Task TASK-049: `tasks/TASK-049-fixtures-validacao-visual-e06.md`
- Script seed E06: `scripts/seed-e06-fixtures.ts`
- Documentação scripts: `scripts/README.md`
