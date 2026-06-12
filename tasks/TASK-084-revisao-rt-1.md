# TASK-084 — Revisão RT nº 1 do dossiê de fundamentos (doc 14)

**Status:** `concluída` · 2026-06-12 · **1038/1038** · 0 tsc · 37/37 tooling
**Autorização:** correções ditadas pelo RT em sessão, sobre o doc 14

| # | Correção do RT | Implementação |
|---|---|---|
| 1 | Remover 5035 3,5×2,5 | Entrada removida do catálogo (nota histórica preservada no código) |
| 2 | "Item 2 pode aprovar tudo" | Agronomia APROVADO_RT integral no doc 14 (incl. lâmina default 10) |
| 3 | Explicar item 3 com exemplos | Doc 14 §3.1 nova — didática completa da hierarquia altimetria→planimetria→geometria com exemplos numéricos (5022, talude 3%, Três Ilhas 87°) |
| 4 | Lateral família LF (sem "engate") | Texto corrigido no doc 14 e comentários |
| 5 | Dint DN50 PN40 = 48,1 mm | Catálogo corrigido (esp. parede 0,95); capacidade lateral ~19→21 asp (Qmax 16,3 m³/h); limiares de split recalibrados |
| 6 | Hazen-Williams C = 140 | Todo o catálogo (10 entradas); hf +6,7% vs C=145 |
| 7 | "Ramal" → "SECUNDÁRIA" | Nomenclatura em BOM (descrições), diagnósticos, avaliador e UI |
| 8 | Secundária v ≤ 2,5 m/s | MAX_VELOCITY_RAMAL_MS 1,5 → 2,5 (hf ≤ 3,0 mantido) |
| 9 | Rede secundária+lateral 100% PN40 | secondary-sizing, architecture-selector e BOM passam à família LF (DN50/75/100 PN40); principal/adutora PN80; gate de pressão por derivação protege os 40 mca |

Recalibração de testes: limiares com Dint 48,1 (split em n=12@1,5); contagem de catálogo (3 não-padrão); asserts da constante 2,5; filtros de descrição "(secundárias)". Nenhum invariante enfraquecido.
