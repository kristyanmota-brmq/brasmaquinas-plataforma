# Arquitetura — Os Quatro Motores

> Para o estado atual dos módulos implementados (imports, classificação por arquivo), ver `ARQUITETURA_ATUAL.md`.
> Para o orquestrador único e as camadas de domínio, ver `docs/software/arquitetura.md`.
> Este documento descreve a **visão dos quatro motores** que compõem a plataforma de venda técnica assistida e como eles se relacionam.

---

## Por que quatro motores

O software não é apenas um calculador hidráulico. É uma **esteira de venda técnica assistida**. Para funcionar como tal, ele precisa de quatro capacidades distintas:

1. **Calcular** — produzir layout, hidráulica e BOM corretos
2. **Classificar e governar** — decidir quem pode fazer o quê com esse cálculo
3. **Comercializar** — transformar o cálculo em proposta vendável
4. **Operar** — apresentar resultados de forma adequada para cada papel

Separar essas responsabilidades em módulos distintos é o que permite que o cálculo seja testável, a governança seja auditável, o comercial seja configurável e a interface seja adaptável sem que cada mudança quebre os outros.

**Cálculos críticos não podem ficar espalhados em telas.** Uma função de cálculo dentro de um componente React não é testável, não é auditável e não é reutilizável. Torna-se uma fonte de erro invisível. Todo cálculo crítico vive em `src/lib/`, onde é testável, versionável e auditável independentemente da interface.

---

## Motor 1 — Motor Técnico

**Status:** implementado
**Localização:** `src/lib/layout/`, `src/lib/hydraulics/`, `src/lib/bom.ts`

### Responsabilidade

Produzir, a partir de dados de entrada (`ProjectLayout`), todos os resultados técnicos do projeto:
- Layout físico (colunas físicas, laterais, setores, ramais)
- Dimensionamento hidráulico (HMT, caminho crítico, HF por componente, sizedSecondaries)
- BOM final (quantitativos por SKU)
- Diagnósticos e construtibilidade

### Ponto de entrada único

```
calculateIrrigationProject(layout: ProjectLayout): IrrigationProjectResult
```

Localização: `src/lib/layout/irrigation-project.ts`

Nenhuma outra função calcula o projeto. Nenhuma tela ou rota acessa funções de domínio diretamente.

O motor técnico é **puro**: mesmo input → mesmo output. Sem efeitos colaterais, sem estado global, sem dependências de UI ou de runtime.

### O que o motor técnico produz

```
IrrigationProjectResult {
  layout           — input preservado
  physicalNetwork  — colunas físicas e laterais
  operationalNetwork — setores operacionais
  secondaries      — ramais individuais
  constructability — pontos de controle, status
  bom              — lista de materiais por SKU (com sizedSecondaries)
  hydraulics       — HMT, HF por componente, caminho crítico, sizedSecondaries
  diagnostics      — blockers, warnings, pumpValidationStatus, hydraulicSolverStatus
}
```

### O que o motor técnico NÃO faz

- Não classifica o projeto como A, B ou C — isso é Motor de Governança
- Não decide tipo de proposta ou emite documento — isso é Motor Comercial
- Não registra logs de aprovação ou overrides — isso é Motor de Governança
- Não apresenta resultado ao usuário — isso é Interface Operacional

---

## Motor 2 — Motor de Governança

**Status:** não implementado — referência em `tasks/TASK-002-classificacao-abc-projetos.md`

### Responsabilidade

Receber o resultado do Motor Técnico e decidir:
- Qual é a **classe do projeto** (A, B ou C)
- Quais **gates** foram passados e quais falharam
- Quais **aprovações** são exigidas antes da emissão
- Como **exceções e overrides** são registrados e auditados

### Onde a classificação A/B/C vive

**A classificação A/B/C é responsabilidade do Motor de Governança — não do Motor Técnico nem do Motor Comercial.**

O Motor Técnico informa os fatos (HMT calculada, blockers presentes, violações de ramal, status da bomba). O Motor de Governança interpreta esses fatos contra o envelope técnico-comercial homologado e decide a classe. O Motor Comercial consome a classe para decidir tipo de proposta, alçadas de aprovação e gates de emissão.

Essa separação é intencional: o Motor Técnico não sabe o que é "aceitável" comercialmente; o Motor Comercial não sabe o que é "aceitável" tecnicamente. Apenas o Motor de Governança, com os critérios homologados por RT e agrônomo, pode fazer esse julgamento.

### Componente futuro: `ProjectClassificationEngine`

```typescript
// Rascunho de interface — não implementar até homologação de 09-classificacao-de-projetos.md

export type ProjectClass = "A" | "B" | "C";

export interface ClassificationGate {
  id: string;
  description: string;
  passed: boolean;
  reason?: string;
}

export interface ProjectClassificationResult {
  projectClass: ProjectClass;
  gatesPassed: ClassificationGate[];
  gatesFailed: ClassificationGate[];
  requiredApprovals: string[];
  classificationRationale: string;
}

export function classifyProject(
  technicalResult: IrrigationProjectResult,
): ProjectClassificationResult
```

> ⚠️ Os critérios de classificação (limites numéricos de A/B/C) estão em `[PENDENTE DE VALIDAÇÃO — RT/agronômico/campo]` em `docs/metodologia/09-classificacao-de-projetos.md`. O `ProjectClassificationEngine` só pode ser implementado após homologação formal.

### Logs e auditoria

O Motor de Governança é a única camada que escreve no log de aprovações. Todo override de blocker passa por aqui com registro obrigatório: responsável, justificativa, data/hora. Toda reclassificação manual (B→A, C→B) é auditável e permanente.

---

## Motor 3 — Motor Comercial

**Status:** não implementado
**Dependência:** Motor de Governança (consome a classificação A/B/C)

### Responsabilidade

Transformar o resultado técnico classificado em proposta vendável:
- Selecionar **tipo de documento** (proposta comercial, pré-projeto, projeto executivo) com base na classe fornecida pelo Motor de Governança
- Aplicar **preços do catálogo** aos quantitativos da BOM
- Calcular **margens e totais**
- Aplicar **alçadas de aprovação** por valor comercial
- Verificar **gates de emissão** por classe (Classe B só emite após aprovação registrada no Motor de Governança)
- Gerar **PDF da proposta** com premissas, exclusões e limitações do modelo

### O que o Motor Comercial NÃO faz

- Não decide a classe do projeto — isso é Motor de Governança
- Não calcula hidráulica ou BOM técnica — isso é Motor Técnico
- Não registra aprovações técnicas — isso é Motor de Governança

### Interação entre os motores

```
Motor Técnico
  → IrrigationProjectResult (layout, hidráulica, BOM, diagnósticos)
        ↓
Motor de Governança
  → ProjectClassificationResult (classe A/B/C, gates, aprovações exigidas)
        ↓
Motor Comercial
  → CommercialProposal (tipo de documento, preços, gates de emissão por classe)
        ↓
Interface Operacional
  → visualização por papel (vendedor / projetista / RT)
```

---

## Motor 4 — Interface Operacional

**Status:** parcialmente implementado
**Localização:** `src/components/`, `src/app/`

### Responsabilidade

Apresentar os resultados dos outros motores de forma adequada para cada papel:
- **Vendedor:** visão simplificada, ações disponíveis por classe, gates visíveis, proposta emitível
- **Projetista:** visão técnica completa, detalhes de dimensionamento, botão de aprovação (Classe B)
- **RT:** visão de auditoria, log de aprovações, status de validação de campo

### O que está implementado

| Componente | Status | O que faz |
|-----------|--------|----------|
| `ProjectMap.tsx` | implementado | mapa interativo, lê `IrrigationProjectResult` |
| `MemorialPanel.tsx` | implementado | tabela de laterais, exporta memorial |
| `PropostaPDF.tsx` | implementado | PDF da proposta (sem motor comercial ainda) |
| `app/projetos/[id]/page.tsx` | implementado | Server Component, renderiza mapa |
| `app/api/projetos/[id]/pdf/` | implementado | rota POST → PDF |

### Regra fundamental

A Interface Operacional é **consumidora, não produtora**. Ela lê resultados dos outros motores. Ela não calcula, não classifica e não decide. Se uma tela precisar fazer cálculo para exibir algo, esse cálculo pertence a um dos três motores anteriores — não ao componente React.

---

## Evolução planejada

| Motor | Status atual | Próximo passo |
|-------|-------------|--------------|
| Motor Técnico | implementado | TASK-004 (PN por trecho), TASK-005 (válvulas BOM), TASK-006 (massa PVC) |
| Motor de Governança | não implementado | TASK-002 (após TASK-001 + homologação de `09`) |
| Motor Comercial | não implementado | após Motor de Governança estável |
| Interface Operacional | parcial | após Motor de Governança (papéis e gates de emissão) |
