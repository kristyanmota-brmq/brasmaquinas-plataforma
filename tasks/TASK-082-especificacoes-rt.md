# TASK-082 — Especificações oficiais do RT: aspersores, regimes e restrições do local

**Status:** `concluída` · **Concluída em:** 2026-06-12 · **1032/1032 testes** (+7) · 0 tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-12-TASK-082.md`
**Autorização:** RT da Brasmáquinas em sessão: "Utilizamos 5022 12×12 bocal 3,0×1,8, 760 L/h, 25 mca; 5035 18×18 bocal 5,0×2,5, 2.110 L/h, 30 mca. Regimes 12, 15 e 20 h. Inserir disponibilidade de vazão e potência — reajusta automaticamente o número de setores."

## Entregas

1. **Catálogo** — `ASPERSOR_PADRAO` = nova entrada `101092-3018` (5022-SD 3,0×1,8 · 0,76 m³/h · 25 mca · 12×12; custo/preço do corpo 5022). Entrada 4,0×1,8 (`101092`) preservada byte-idêntica como `ASPERSOR_5022_SD_40X18` — catálogo read-only honrado; projetos salvos resolvem por SKU. 5035 5,0×2,5 conferido (2,11 m³/h @ 30 ✓, sem mudança).
2. **Regimes** — UI passa a oferecer 12/15/20 h; `jornadaHoras` vira `number` (legados 9/14/21 continuam válidos em projetos salvos).
3. **Restrições do local** — `sector-constraints.ts` (puro): `minSetoresPorRestricoes(vazaoTotal, {vazaoDisponivelM3h, potenciaDisponivelCv}, hmt)` com física P = γQH/(75η), η = 0,55 (premissa calibrável). UI: 2 inputs na seção Setorização; piso aplicado no `applyJornada` e reaplicado automaticamente ao alterar restrição; nota explicativa quando o piso está ativo ("X cv @ HMT Y → máx Z m³/h → mínimo N setores").

## Testes

T82-1..7 (física da potência; pisos por vazão/potência/combinado; potência ignorada sem HMT; inválidos → 1). 16 testes existentes recalibrados: física pinada na entrada preservada (propósito = gates, não catálogo); catálogo/BOM/agronomia afirmam a nova realidade (intensidade padrão 10,42 → 5,28 mm/h).

## Impactos a observar (RT)

- Projetos NOVOS em 12×12 nascem com 0,76 m³/h/aspersor → vazão de projeto ~metade da anterior; setorizações e bombas menores. Projetos salvos não mudam (SKU antigo preservado).
- η = 0,55 da potência é premissa de praxe — calibrável no doc 12 quando houver dado de campo.
