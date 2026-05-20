# ADR-002 — Diâmetro interno real nos cálculos hidráulicos

**Data:** 2026-05-19
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

A equação de Hazen-Williams usa o diâmetro hidráulico do tubo. Para tubos PVC, o diâmetro nominal (ex.: DN50, DN75) é o diâmetro externo — o diâmetro interno real é menor, dependendo da espessura da parede, que varia com a classe de pressão (PN40, PN60, PN80).

Antes de HIST-001, o catálogo continha apenas `diametroMm` (nominal). Os cálculos de perda de carga usavam esse valor, subestimando a perda de carga em 8–15% dependendo do DN e da classe de pressão. Isso levava a HMT subestimada e seleção de tubo otimista.

---

## Decisão

Decidimos que todos os cálculos de perda de carga (Hazen-Williams) usam `diametroInternoMm` do catálogo de tubos. O catálogo (`TUBOS_PVC_LF` e `TUBOS_PVC_RIGIDO` em `aspersores.ts`) passou a incluir `diametroInternoMm` como campo obrigatório. Nenhum cálculo hidráulico usa o diâmetro nominal como substituto.

---

## Alternativas consideradas

### Alternativa A — Diâmetro nominal como proxy com fator de correção fixo

**Descrição:** Aplicar fator de redução fixo (ex.: 0,92) sobre o nominal em vez de cadastrar o interno por SKU.

**Por que foi descartada:** O fator varia por DN e por classe de pressão (PN40 vs. PN80 têm paredes diferentes). Um fator fixo seria correto para alguns DNs e errado para outros. A diferença chega a 5+ mm em tubos grandes.

### Alternativa B — Manter diâmetro nominal e documentar como limitação

**Descrição:** Continuar usando nominal e registrar como simplificação aceitável.

**Por que foi descartada:** A subestimação de HMT é diretamente proporcional ao erro no diâmetro (eleva ao quarto da quarta potência na Hazen-Williams). Em projetos com principal longa, o erro pode exceder 3–5 mca — não é uma simplificação aceitável para proposta técnica.

---

## Consequências

### Positivas

- HMT calculada reflete a geometria real do tubo.
- Seleção de tubo (`selectSecondaryPipe`, `selectPrincipalTube`) é conservadora: o tubo escolhido realmente satisfaz os critérios de velocidade e hf com o diâmetro que ele tem na realidade.
- Verificação de PN (ADR-008) usa a mesma fonte de verdade: `pressaoMca` do mesmo registro de catálogo que fornece `diametroInternoMm`.

### Negativas / trade-offs

- Catálogo deve manter `diametroInternoMm` atualizado. Adicionar um novo SKU ao catálogo sem esse campo é um erro silencioso (TypeScript detecta ausência de campo obrigatório).
- Integração com fornecedores que fornecem apenas dimensões nominais requer levantamento manual dos internos.

### Neutras

- `diametroInternoMm` está presente tanto em `TUBOS_PVC_LF` (laterais) quanto em `TUBOS_PVC_RIGIDO` (ramais/principal), com o mesmo semântico.

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/catalog/aspersores.ts` | campo `diametroInternoMm` adicionado a todos os SKUs de tubo |
| `src/lib/layout/hydraulic-sizing.ts` | usa `diametroInternoMm` em todos os cálculos de hf |
| `src/lib/layout/secondary-sizing.ts` | usa `diametroInternoMm` no critério de velocidade |
| `src/lib/layout/laterais.ts` | usa `diametroInternoMm` na seleção de tubo LF |

---

## Classificação

- regra técnica
- decisão de engenharia

---

## Referências

- HIST-001 — Auditar solver hidráulico V2 nos projetos L e P
- `docs/relatorios/2026-05-19-diagnostico-software-atual.md` §1.1
- `docs/relatorios/2026-05-19-prova-cadeia-logica-motor.md` §1

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-011) |
