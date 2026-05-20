# TASK-003 — Bloquear PDF quando há blockers ativos

**Status:** `concluída`
**Prioridade:** P1-crítico
**Área:** pdf / governança
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-19
**Concluída em:** 2026-05-19

---

## Objetivo

Impedir que um projeto com `diagnostics.blockers` ativos gere PDF de proposta final. O usuário deve receber uma mensagem clara indicando quais blockers impedem a emissão.

---

## Contexto

O diagnóstico TASK-001 identificou que `src/app/api/projetos/[id]/pdf/route.tsx` verifica apenas `result.isComplete` e `result.bom`, mas não verifica `result.diagnostics?.blockers`. Isso permite que um projeto tecnicamente bloqueado (bomba insuficiente, solver bloqueado, corredor não validado, etc.) gere e entregue PDF de proposta final ao cliente.

Estado atual de `route.tsx`:
```typescript
if (!result.isComplete || !result.bom) {
  return new NextResponse("Projeto incompleto...", { status: 422 });
}
// → renderiza PDF mesmo se diagnostics.blockers.length > 0
```

Estado atual de `ProjectMap.tsx` (handleExportPDF):
```typescript
if (!res.ok) throw new Error(await res.text());
// ...
} catch (err) {
  console.error("[PDF]", err);  // silencioso para o usuário
}
```

O usuário não vê nenhuma mensagem de erro — o botão simplesmente volta ao estado normal.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Escopo |
|---------|----------------|--------|
| `src/lib/layout/irrigation-project.ts` | modificação | adicionar helper puro `pdfEmissionBlockers()` — testável |
| `src/app/api/projetos/[id]/pdf/route.tsx` | modificação | verificar blockers antes de renderizar PDF |
| `src/components/map/ProjectMap.tsx` | modificação | exibir mensagem de erro para o usuário (não apenas console.error) |
| `src/lib/layout/__tests__/pdf-guard.test.ts` | criação | 2 testes para `pdfEmissionBlockers` |

---

## Critérios de aceite

- [x] Projeto sem blockers (`diagnostics.blockers.length === 0`) continua gerando PDF normalmente
- [x] Projeto com `diagnostics.blockers.length > 0` recebe HTTP 422 e não gera PDF
- [x] A resposta da rota lista claramente os blockers ativos (JSON `{error, message, blockers}`)
- [x] O usuário vê a mensagem de bloqueio na interface (painel flutuante, diferencia bloqueio técnico vs erro inesperado)
- [x] `pdfEmissionBlockers()` é função pura e testável com vitest
- [x] 3 testes em `pdf-guard.test.ts` (sem blockers, com blockers, diagnostics null)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 403/403 (sem regressão, +3 testes)

---

## Testes obrigatórios

1. **`pdfEmissionBlockers` — resultado sem blockers** → retorna `[]`
2. **`pdfEmissionBlockers` — resultado com blockers** → retorna array não vazio com os textos dos blockers

---

## Fora do escopo

- Não alterar solver hidráulico
- Não alterar buildBOM
- Não alterar geometria ou layout
- Não implementar classificação A/B/C
- Não implementar motor comercial
- Não tratar validação de PN/classe de pressão
- Não redesenhar a UI do PDF button — apenas exibir o erro retornado
- Não alterar o que gera blockers (generateProposalDiagnostics) — apenas verificá-los na rota

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| `makeLayoutL()` e `makeLayoutP()` têm blockers ativos (corredor não validado) e os testes de integração passam com PDF bloqueado | baixa | alto | verificar se fixtures têm `corridorValidated: true` antes de escrever os testes |
| Mudança no `ProjectMap.tsx` quebra algum comportamento existente | baixa | médio | alterar apenas o bloco de `catch` — não tocar na lógica de geração de PDF |
| `ProjectMap.tsx` é grande (~1300 linhas) — risco de contexto perdido | baixa | baixo | leitura direta da função `handleExportPDF` apenas |

**Dependências:** nenhuma. Pode ser iniciada imediatamente.

---

## Plano de implementação

> A ser preenchido após `/planejar` aprovado.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-19 | Claude Sonnet 4.6 | Tarefa criada |
| 2026-05-19 | Claude Sonnet 4.6 | Implementação concluída — 4 arquivos alterados/criados, 403/403 testes, 0 erros tsc |
