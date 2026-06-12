# TASK-057 — Causa raiz da anomalia B-03: rib em grampo 180° quando o spine cruza a lateral

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — motor de layout / construtibilidade
**Área:** layout / construtibilidade
**Criado em:** 2026-06-11
**Concluída em:** 2026-06-11 · **976/976 testes vitest** (+3 T57; 4 asserções v12 atualizadas) · 0 erros tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-11-TASK-057.md`
**Predecessores:** diagnóstico 2026-05-24 (B-03); nightly 2026-05-25 (fixture provou motor "correto" no caso alinhado); TASK-061 (isolou 10 junções rib→lateral); decisão RT delegada (resolver pela causa)
**Autorização:** delegação "Prossiga" (RT delegado)

## Causa raiz (forense em dados reais — script novo `scripts/diagnose/diagnose-b03-rib-lateral.mjs`)

A anomalia B-03 NÃO era dado desalinhado nem ângulo de grid: **todas as 10 junções tinham deflexão exatamente 180°**. A fórmula do midpoint (TASK-053 v12) colocava o spine DENTRO do vão Y das laterais (Fazenda do Paulo: spine em y=-76 com laterais de -130 a +1,6) e o rib descia do spine ATÉ A PONTA da lateral, correndo por cima dela — um "grampo de cabelo" hidráulico. O comentário do código assumia "junção rib↔lateral em 0° (luva)", válido apenas com spine fora do vão (headland).

## Correção (em `routeEspinhaDePeixe`, hydraulic-connectivity.ts)

Clamp do ponto de conexão do rib ao vão da lateral: `targetY = clamp(spineY, colYMin, colYMax)`.
- Spine no headland (caso projetado): comportamento idêntico ao anterior (conecta no inlet; luva 0°).
- Spine além do vão: conecta no extremo superior (luva 0°).
- **Spine cruza a lateral: rib de comprimento 0 → tê spine→lateral direto no cruzamento** (90° por construção; validação angular pula ribs ~0; BOM TASK-054 já conta 1 tê por rib — o tê do cruzamento).

## Resultados medidos

- Forense no projeto real: **10 → 0 junções rib→lateral anguladas** (30 colunas, grid 58°).
- Browser: o blocker "ângulos da rede fora dos padrões construtíveis" **desapareceu** da sidebar — resta apenas "BOM incompleta (11 conexões sem SKU)" como único blocker do projeto.
- 4 asserções v12 atualizadas: exigiam `rib.lengthM > 0` em cenários onde o spine cruza a lateral — codificavam o grampo em miniatura (rib de 3 m colado na lateral). Invariante novo: rib conecta no ponto mais próximo; comprimento 0 = tê no cruzamento.
- +3 testes T57: reprodução sintética do caso real (vão 130 m, inlets mistos), toCoord dentro do span da lateral, e **zero issues angulares de lateral** via `detectNetworkAngleIssues`.

## Fora do escopo

- Otimizar a posição do spine (midpoint formula preservada — a correção é no ponto de conexão)
- SKUs faltantes do catálogo (único blocker restante — curvas 45°, tês DN fora de 50/75/100, tees de aspersor)

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-06-11 | Claude (Fable 5), RT delegado | Forense em dados reais → causa raiz → fix cirúrgico → 10→0 junções no projeto real |
