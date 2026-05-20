# ADR-006 — Motor de candidatos de layout como ferramenta preliminar não homologada

**Data:** 2026-05-20
**Status:** `provisório`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

As TASKs 010B, 010C, 010D e 010E implementaram um motor geométrico que avalia até 112 candidatos de grade de aspersores (7 ângulos × 4×4 offsets) e pontua cada um por métricas como `fillingRatio`, `shortColumnRatio`, comprimento de laterais, contagem de válvulas de seção e comprimento de rede de distribuição.

O motor é capaz de sugerir automaticamente um layout de aspersores, mas os pesos de pontuação nunca foram calibrados com dados de projetos reais da Brasmáquinas. Um motor não calibrado sugere com confiança candidatos que podem ser operacionalmente inconvenientes ou tecnicamente inferiores.

A decisão de governance era: como disponibilizar a ferramenta sem criar risco de uso inadvertido em propostas comerciais antes da homologação?

---

## Decisão

Decidimos disponibilizar o motor como **ferramenta experimental**, com as seguintes restrições de governança implementadas no código:

1. O motor só executa por **clique explícito** do usuário no painel "Motor geométrico (experimental)".
2. O candidato sugerido só altera `layout.sprinklers` após **confirmação explícita** do usuário.
3. Quando `angleMode === "optimizer"`, um **badge persistente** aparece no mapa com o texto: *"Layout gerado por motor geométrico preliminar — não homologado tecnicamente."*
4. As métricas exibidas ao usuário são rotuladas como "preliminares" — não como resultado técnico definitivo.
5. Todos os pesos de pontuação em `OPTIMIZER_PARAMS` são marcados com `PENDENTE_CALIBRACAO_RT_CAMPO` no código.

---

## Alternativas consideradas

### Alternativa A — Não expor o motor até a homologação

**Descrição:** Manter o motor como código interno; UI não oferece o painel experimental.

**Por que foi descartada:** A homologação requer uso real em projetos. Se o motor nunca for usado, não haverá dados para calibrá-lo. O ciclo de feedback (RT usa → RT avalia → RT calibra) não começa sem exposição controlada.

### Alternativa B — Substituir o fluxo manual por padrão

**Descrição:** Motor geométrico como método de entrada padrão de layout; substituir o posicionamento manual.

**Por que foi descartada:** O motor não foi validado contra projetos reais da Brasmáquinas. Torná-lo padrão antes da homologação criaria risco de sugerir layouts com problemas operacionais que o RT identificaria imediatamente em campo.

### Alternativa C — Motor oculto, acessível apenas por feature flag

**Descrição:** O painel experimental fica visível apenas com parâmetro de URL ou flag de config.

**Por que foi descartada:** Complexidade desnecessária. O badge de aviso e o painel rotulado como "experimental" já comunicam claramente o estado do motor ao usuário. A abordagem de feature flag adiciona infraestrutura sem benefício adicional de governança.

---

## Consequências

### Positivas

- RT pode usar o motor e avaliar candidatos sem comprometer propostas comerciais.
- O badge persistente impede que o usuário esqueça que o layout foi gerado por motor não homologado.
- O ciclo de calibração pode começar imediatamente após as TASKs 010x.

### Negativas / trade-offs

- Um usuário que ignora o badge pode enviar proposta com layout do motor sem aprovação do RT. O controle é de UX/comunicação, não técnico-bloqueante.
- `angleMode === "optimizer"` persiste no `ProjectLayout` salvo. Se o motor for descontinuado, projetos salvos com esse modo precisam de migração de schema.

### Neutras

- `secondaryLengthM` e `hydraulicBlockers` permanecem `null` para candidatos não avaliados pelo solver — o motor geométrico não substitui o solver hidráulico completo.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/sprinkler-grid-optimizer.ts` | motor de candidatos; `OPTIMIZER_PARAMS` com marcadores |
| `src/lib/layout/sprinkler-grid.ts` | geração de grade rotacionada com offset |
| `src/lib/layout/optimizer-integration.ts` | `candidateToSprinklers()` — mapeamento puro testável |
| `src/app/projetos/[id]/layout-schema.ts` | `angleMode` estendido com `"optimizer"` |
| `src/components/map/ProjectMap.tsx` | painel experimental; badge persistente; callbacks de confirmação |

---

## Classificação

- decisão de engenharia
- governança de emissão/proposta (uso em proposta commercial requer homologação RT)
- premissa provisória (pesos PENDENTE_CALIBRACAO_RT_CAMPO)
- pendente de revisão Brasmáquinas

---

## Referências

- TASK-010B — Motor geométrico inicial de candidatos de layout
- TASK-010C — Integração do motor de candidatos de layout à UI em modo experimental
- TASK-010D — Métricas operacionais de setorização no motor de candidatos
- TASK-010E-A — Métricas de comprimento de laterais
- TASK-010E-B — Métricas de rede de distribuição
- `docs/relatorios/2026-05-20-TASK-010C.md`
- ADR-007 (pesos provisionais)

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
