# Arquitetura do Software

> Para o estado atual detalhado (módulos, imports, classificação de cada arquivo), ver `ARQUITETURA_ATUAL.md` na raiz do repositório.
> Este documento descreve a **arquitetura-alvo** e os princípios estruturais que guiam as decisões de design.

---

## 1. Princípio central: orquestrador único

```
calculateIrrigationProject(layout: ProjectLayout): IrrigationProjectResult
```

Localização: `src/lib/layout/irrigation-project.ts`

Todo consumidor (mapa, PDF, diagnósticos, testes) passa por esta função. Nenhuma camada de UI ou API chama funções de domínio diretamente.

**Fluxo de dados:**
```
ProjectLayout (input do usuário)
  └─► calculateIrrigationProject()
        ├─► generatePhysicalColumns()    → PhysicalNetwork
        ├─► deriveOperationalSegments()  → OperationalNetwork
        ├─► deriveLateraisFromNetwork()  → DistributionNetwork
        ├─► generateSecondaries()
        │   + validateHydraulicConnectivity()  → HydraulicGraph
        ├─► buildConstructabilityReport()  → ConstructabilityReport
        ├─► buildBOM(BOMInput)            → BOMResult (preliminary)
        ├─► sizeHydraulics()             → HydraulicSizingReport
        ├─► buildBOM(BOMInput + sizedSecondaries)  → BOMResult (final)
        └─► generateProposalDiagnostics()  → ProposalDiagnostics
              └─► IrrigationProjectResult
```

---

## 2. Camadas

### Camada de domínio (`src/lib/`)

Funções puras, testáveis, sem efeitos colaterais, sem imports de React.

| Módulo | Responsabilidade |
|--------|----------------|
| `layout/irrigation-project.ts` | Orquestrador — único ponto de entrada para cálculo |
| `layout/laterais.ts` | Colunas físicas, laterais, seleção de tubo LF |
| `layout/sectorization.ts` | Setorização por fluxo, segmentos operacionais |
| `layout/hydraulic-connectivity.ts` | Ramais, validação de conectividade |
| `layout/hydraulic-sizing.ts` | Solver hidráulico — HMT, caminho crítico |
| `layout/secondary-sizing.ts` | Seleção individual de tubo por ramal |
| `layout/constructability.ts` | Pontos de controle, construtibilidade |
| `hydraulics/hazenWilliams.ts` | Hazen-Williams, velocity, selectDiameter |
| `catalog/aspersores.ts` | Catálogo estático de peças |
| `bom.ts` | buildBOM, generateProposalDiagnostics |

### Camada de apresentação (`src/components/`, `src/app/`)

Sem lógica de cálculo. Consome `IrrigationProjectResult`.

| Componente | Responsabilidade |
|-----------|----------------|
| `components/map/ProjectMap.tsx` | Mapa interativo; lê do result; escreve layout via setLayout |
| `components/map/MemorialPanel.tsx` | Tabela de laterais; exporta memorial em Markdown |
| `app/projetos/[id]/page.tsx` | Server Component; renderiza ProjectMap |
| `app/api/projetos/[id]/pdf/` | POST → PDF via react-pdf |
| `app/projetos/[id]/actions.ts` | Server Actions para persistência |

---

## 3. Regras de import

```
src/lib/       → pode importar de: src/lib/ (mesmo nível ou dependência)
src/components/ → pode importar de: src/lib/, src/components/
src/app/       → pode importar de: src/lib/, src/components/, src/app/
```

**Proibido:**
```
src/lib/ → src/components/   (domínio não depende de UI)
src/lib/ → src/app/          (domínio não depende de rotas)
```

---

## 4. Schema do layout

`ProjectLayout` em `src/app/projetos/[id]/layout-schema.ts`:
- Versiona o formato com `schemaVersion`
- Exporta `migrateLayout()` para migração automática de versões antigas
- Sem `"use server"` — é importável de qualquer camada

---

## 5. Política de ADR (Architectural Decision Record)

ADRs ficam em `docs/decisoes/`. O template canônico é `ADR-000-template.md`.

### ADR obrigatório quando a decisão:

- muda arquitetura ou define fonte de verdade
- define regra técnica relevante (velocidade máxima, PN, modelo hidráulico, fórmula de cálculo)
- altera governança de emissão ou proposta (gate de PDF, blocker, override)
- altera modelo de dados persistido (`ProjectLayout`, `IrrigationProjectResult`)
- cria premissa provisória usada no cálculo (peso de score, constante sem calibração de campo)
- muda regra de bloqueio ou warning
- afeta rastreabilidade futura (SKU aprovado, classificação de PN, tipo de ponto de controle)

### ADR não obrigatório para:

- bug fix local sem impacto em contrato público
- ajuste visual simples (cor, texto, layout de UI)
- teste novo sem mudança de comportamento
- refatoração sem mudança de comportamento externo
- relatório de task
- texto de UI ou mensagem de diagnóstico
- melhoria pequena sem decisão estrutural

### ADRs existentes

| ADR | Título | Status |
|-----|--------|--------|
| [ADR-001](../decisoes/ADR-001-orquestrador-unico-calculate-irrigation-project.md) | Orquestrador único `calculateIrrigationProject` | Aceito |
| [ADR-002](../decisoes/ADR-002-diametro-interno-calculos-hidraulicos.md) | Diâmetro interno real nos cálculos hidráulicos | Aceito |
| [ADR-003](../decisoes/ADR-003-bloqueio-pdf-com-blockers.md) | Bloqueio de PDF quando há blockers ativos | Aceito |
| [ADR-004](../decisoes/ADR-004-lateral-fisica-vs-trecho-operacional.md) | Lateral física vs. trecho operacional | Aceito |
| [ADR-005](../decisoes/ADR-005-registros-manuais-secao-viqua-pn80.md) | Registros manuais de seção VIQUA PN80 | Aceito |
| [ADR-006](../decisoes/ADR-006-motor-layout-candidatos-preliminar.md) | Motor de candidatos de layout como ferramenta preliminar | Provisório |
| [ADR-007](../decisoes/ADR-007-premissas-provisorias-mercado-revisao-brasmaquinas.md) | Premissas provisórias de mercado e revisão Brasmáquinas | Provisório |
| [ADR-008](../decisoes/ADR-008-validacao-pn-classe-pressao-tubos.md) | Validação de PN/classe de pressão dos tubos por segmento | Aceito |

---

## 6. Evolução arquitetural planejada

| Item | Status | Referência |
|------|--------|-----------|
| Validação de PN por trecho | pendente | TASK-004 |
| BOM de válvulas nos pontos de controle | pendente | TASK-005 |
| Otimização por massa de PVC | pendente | TASK-006 |
| Perfil de terreno (cotas intermediárias) | não planejado | ver `docs/metodologia/04-layout-earth-first.md` |
| CUC e eficiência de aplicação | não planejado | ver `docs/metodologia/02-calculo-agronomico.md` |
