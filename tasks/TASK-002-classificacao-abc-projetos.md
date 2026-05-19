# TASK-002 — Motor de Governança A/B/C (ProjectClassificationEngine)

**Status:** `pendente`
**Bloqueada por:** TASK-001 concluída + homologação formal de `docs/metodologia/09-classificacao-de-projetos.md` pelo RT
**Prioridade:** P2-importante
**Área:** governança / domínio
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-19

---

## Objetivo

Implementar o `ProjectClassificationEngine` — o Motor de Governança que classifica cada projeto como Classe A, B ou C a partir dos resultados do Motor Técnico, contexto comercial e diagnósticos. O resultado de `calculateIrrigationProject` passa a incluir a classificação no objeto retornado.

---

## Contexto

O Motor Técnico (`calculateIrrigationProject`) já produz `IrrigationProjectResult` com layout, hidráulica, BOM e diagnósticos. O que falta é a camada de governança que interpreta esses resultados e decide:
- Em qual classe o projeto se enquadra (A, B ou C)
- Quais gates foram passados e quais falharam
- Quais aprovações são exigidas antes da emissão de proposta

**A classificação A/B/C pertence ao Motor de Governança — não ao Motor Técnico nem ao Motor Comercial.**

O Motor Técnico informa os fatos (HMT calculada, blockers, violações de ramal, status da bomba). O Motor de Governança interpreta esses fatos contra o envelope técnico-comercial homologado e decide a classe. O Motor Comercial consome a classe para decidir tipo de proposta, alçadas de aprovação e gates de emissão.

Referência de arquitetura: `docs/software/arquitetura-motor-tecnico.md` — seção Motor 2.

---

## Por que esta tarefa está bloqueada

Os critérios numéricos de Classe A/B/C (área máxima, desnível máximo, HMT limite, etc.) estão marcados como `[PENDENTE DE VALIDAÇÃO — RT/agronômico/campo]` em `docs/metodologia/09-classificacao-de-projetos.md`. Implementar o motor antes da homologação geraria código que precisaria ser refatorado a cada ajuste de critério.

Fluxo necessário antes de implementar:
1. **TASK-001:** diagnosticar o estado atual e identificar gaps de governança
2. **Validação de campo:** coletar dados reais (pelo menos Etapas 1–3 de `10-validacao-de-campo.md`)
3. **RT homologa** os critérios numéricos de `09-classificacao-de-projetos.md`
4. **Esta tarefa** implementa o motor com critérios validados e estáveis

---

## Arquivos impactados (preliminar — sujeito a revisão no /planejar)

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/project-classification.ts` | criação | `ProjectClassificationEngine`, tipos, função `classifyProject` |
| `src/lib/layout/irrigation-project.ts` | modificação | incluir resultado de classificação no retorno |
| `src/lib/layout/__tests__/project-classification.test.ts` | criação | ≥ 10 testes |

Nenhum arquivo fora de `src/lib/` será modificado além de arquivos de task e documentação.

---

## Interface esperada do motor (rascunho — não implementar ainda)

```typescript
// src/lib/layout/project-classification.ts

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

// Função pura: mesmo input → mesmo output
export function classifyProject(
  technicalResult: IrrigationProjectResult,
  // commercialContext: CommercialContext  // fase posterior, não implementar agora
): ProjectClassificationResult
```

> ⚠️ Esta interface é rascunho de referência. Os critérios exatos de cada gate e os limiares numéricos serão definidos após homologação de `09-classificacao-de-projetos.md`. Não implementar antes da homologação.

---

## Critérios de aceite (preliminares)

- [ ] `ProjectClassificationEngine` implementado em `src/lib/layout/project-classification.ts`
- [ ] `calculateIrrigationProject` retorna classificação no resultado (via `classifyProject`)
- [ ] Gates de bloqueio automático da Classe implementados com base nos critérios homologados
- [ ] Gates de revisão técnica implementados (geram `requiredApprovals`)
- [ ] Classe A: projeto dentro do envelope homologado, sem blockers
- [ ] Classe B: projeto com características que requerem aprovação técnica registrada
- [ ] Classe C: projeto fora do envelope, requer projeto executivo obrigatório
- [ ] `classifyProject` é função pura (sem efeitos colaterais, sem estado global)
- [ ] ≥ 10 testes em `project-classification.test.ts`
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → sem regressão (contagem ≥ 400)

---

## Testes obrigatórios (preliminares)

> Serão refinados no `/planejar` após homologação dos critérios.

1. **Projeto padrão sem blockers dentro do envelope** → Classe A
2. **Projeto com `diagnostics.blockers` não vazio** → Classe B ou C (conforme critério homologado)
3. **Projeto com `hydraulicSolverStatus === "blocked"`** → blocker de emissão
4. **Projeto com `pumpValidationStatus === "pump_insufficient_head"`** → gate de revisão técnica
5. **Projeto com ramal violando velocidade (warning)** → não bloqueia classe sozinho
6. **Projeto com área acima do limite Classe A** → Classe B (após homologação do limite)
7. **Projeto com desnível acima do limite Classe A** → Classe B (após homologação do limite)
8. **Projeto com gatilho de Classe C** → Classe C com `requiredApprovals` corretos
9. **`classifyProject` é determinística** → mesmo `IrrigationProjectResult` → mesma classificação sempre
10. **Motor Técnico sem sizedSecondaries** → classificação funciona sem erro

> ⚠️ Os testes 6 e 7 só podem ser escritos após os limites numéricos serem homologados pelo RT. Os testes de comportamento (1–5, 8–10) podem ser escritos independentemente dos limites.

---

## Fora do escopo

- Não implementar UI de governança (telas de aprovação, registro de parecer)
- Não implementar Motor Comercial (preços, margens, tipo de proposta)
- Não implementar log de aprovações (fase posterior ao Motor de Governança)
- Não alterar critérios de Classe sem nova aprovação de RT
- Não implementar `CommercialContext` ainda (o motor receberá apenas `IrrigationProjectResult` inicialmente)

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Critérios de Classe mudarem após implementação | alta | alto | Só implementar após homologação formal dos limites |
| Acoplamento indesejado entre Motor de Governança e internals do Motor Técnico | média | médio | Motor de Governança consome apenas a interface pública de `IrrigationProjectResult` |
| Teste com valor numérico que quebra ao ajustar critério | média | médio | Escrever testes de comportamento (A/B/C), não de limite específico que pode mudar |

**Dependências explícitas:**
- **TASK-001:** diagnóstico concluído e gaps identificados
- **RT:** homologação de `docs/metodologia/09-classificacao-de-projetos.md` com limites numéricos definidos
- **Validação de campo:** pelo menos Etapas 1–3 de `10-validacao-de-campo.md` concluídas

---

## Plano de implementação

> A ser preenchido pelo agente ao executar `/planejar TASK-002`, após desbloqueio.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-19 | Claude Sonnet 4.6 | Tarefa criada |
