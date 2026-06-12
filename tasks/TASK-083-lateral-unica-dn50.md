# TASK-083 — Lateral única DN50 PN40 + dossiê de fundamentos técnicos (doc 14)

**Status:** `concluída` · 2026-06-12 · **1032/1032 testes** · 0 tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-12-TASK-083.md`
**Autorização:** RT em sessão: "não teremos mais telescopia nas linhas laterais. Será somente tubo de 50mm PN40" + "escreva todos os fundamentos técnicos para validação do RT"

## Regra implementada

`selectLateralTube` (laterais.ts): candidatos restritos ao **DN50 LF PN40** — sem telescopia (revoga TASK-074), sem upgrade. Lateral acima dos limites → **split de coluna** (encurta, não engorda); gates intactos (v ≤ 2,5 m/s; hf ≤ 20%·Ps; F de Christiansen; Dint 46 mm). BOM sem tê de redução 75×50. Capacidade prática (5022 oficial 0,76 m³/h): ~19 aspersores/lateral.

## Doc 14 (entregável principal)

`docs/metodologia/14-fundamentos-tecnicos-para-validacao-rt.md` — dossiê assinável: 13 seções cobrindo TODAS as regras/fórmulas/limites vigentes, status (APROVADO_RT × CALIBRÁVEL), localização no código e referências (Bernardo; Keller & Bliesner; NRCS; NBR 5647; tabelas NaanDanJain; corpus real).

## Recalibração de testes (23)

- T74 reescrito como guarda da regra NOVA (DN50 em tudo; telescopia ausente; tê 75×50 ausente)
- Gates de velocidade: invariante "split em vez de upsize" (n=10@1,5 → 2 laterais DN50 ok)
- Comportamentais (split operacional/válvulas/agrupamento): vazão sintética de fixture (0,3-0,4) para colunas longas caberem em DN50 — invariantes originais preservados
- Snapshots: P 46→92 colunas físicas (colunas de 16 asp dividem — fisicamente correto); T8-5b migrado para o Projeto L (uniforme)

## Impacto físico esperado (RT ciente)

Mais laterais e mais curtas; mais ribs/tês de derivação; BOM de laterais 100% DN50 PN40. Campos com colunas longas verão mais registros/pontos de derivação — consequência direta da regra ditada.
