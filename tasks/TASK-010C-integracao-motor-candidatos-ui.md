# TASK-010C — Integração do motor de candidatos de layout à UI em modo experimental

**Status:** `concluída`
**Prioridade:** `P2-importante`
**Área:** `UI / integração`
**Criado em:** 2026-05-20
**Atualizado em:** 2026-05-20

---

## Objetivo

> Conectar `findBestSprinklerLayout()` (TASK-010B) à interface do `ProjectMap` de forma experimental e não-destrutiva, permitindo que o usuário gere e visualize o melhor candidato geométrico sem substituir automaticamente o fluxo padrão de posicionamento.

---

## Contexto

TASK-010B criou `findBestSprinklerLayout()` como motor puro testável. Esta tarefa integra o motor à UI sem alterar o fluxo existente ("Posicionar grade 12×12 m"). O candidato só é aplicado após ação explícita do usuário; o resultado não é homologado como layout técnico final.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/optimizer-integration.ts` | **criação** | `candidateToSprinklers()` — mapeamento puro testável |
| `src/lib/layout/__tests__/optimizer-integration.test.ts` | **criação** | 7 testes para `candidateToSprinklers` |
| `src/app/projetos/[id]/layout-schema.ts` | modificação | `angleMode` estendido com `"optimizer"` |
| `src/components/map/ProjectMap.tsx` | modificação | Estado, callbacks e UI do motor experimental |

---

## Critérios de aceite

- [x] Botão "Gerar candidato geométrico" aparece sempre que `layout.area` está desenhada
- [x] Clicar exibe estado "Calculando…" sem alterar `layout.sprinklers`
- [x] Painel de resultado com 8 métricas e `selectionReason` visível
- [x] Texto "Candidato geométrico preliminar — não homologado tecnicamente." presente no painel
- [x] "Aplicar candidato" aplica e fecha o painel; `angleMode === "optimizer"`
- [x] Badge "Layout gerado por motor geométrico preliminar — não homologado tecnicamente." visível enquanto `angleMode === "optimizer"`
- [x] "Descartar" fecha sem alterar `layout.sprinklers`
- [x] Fluxo "Posicionar grade" continua intacto
- [x] Motor nunca roda automaticamente
- [x] Falha em `findBestSprinklerLayout` mostra erro claro, não altera layout
- [x] `layout.area` mudou → `optimizerState` limpo
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 552/552 (545 anteriores + 7 novos)

---

## Testes implementados

### `optimizer-integration.test.ts` (+7)

1. `candidateToSprinklers` preserva `positions` do candidato
2. Calcula `vazaoProjetoM3PorHora = count × vazaoM3PorHoraPerSprinkler` corretamente
3. Define `angleMode = "optimizer"`
4. Define `gridAngleDegrees = candidate.angleDegrees`
5. Define `espacamentoM = spacingM`
6. Candidato com 0 posições → `count = 0` e `vazão = 0`
7. Resultado não contém campos de solver, BOM ou setorização

---

## Fora do escopo

- Não integra `sectionValveCount`, `fragmentedLateralRatio` (requerem TASK-010D)
- Não calcula `secondaryLengthM`, `hydraulicBlockers` (requerem solver hidráulico)
- Não homologa o candidato como layout técnico final
- Não altera aspersor padrão, espaçamento, catálogo, BOM, solver, setorização
- Não persiste `selectionReason` no banco

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Usuário interpreta candidato como layout definitivo | média | médio | Badge persistente + texto "não homologado tecnicamente" em dois pontos da UI |
| `findBestSprinklerLayout` lento em polígonos grandes | baixa | médio | `setTimeout(..., 0)` libera render antes do cálculo; estado "Calculando…" visível |

**Dependências:** TASK-010B concluída ✅

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Tarefa criada e implementada |
