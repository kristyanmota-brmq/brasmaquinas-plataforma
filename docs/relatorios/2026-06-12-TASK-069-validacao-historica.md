# TASK-069 — Primeira validação histórica (E09 §11.2 passo 3) — EXECUTADA

**Data:** 2026-06-12 · **Caso:** proposta REAL de 12,7 ha (capim, Jaíba-MG, NAAN 5035 @ 18×18, corpus) reproduzida pelo motor via `scripts/diagnose/validar-projeto-historico-jaiba.tsx`

## Resultado — convergência dos critérios de operação

| Métrica | Proposta real (projetista humano) | Motor | Fidelidade |
|---|---|---|---|
| Intensidade de aplicação | 6,512 mm/h | 6,512 mm/h | **EXATA** |
| Tempo por setor | 1,5355 h | 1,533 h | 99,8% |
| Nº de setores | 8 (13 h disponíveis) | 9 (14 h — jornada mais próxima oferecida) | mesma equação; delta = input |
| Vazão por setor | ≈100 m³/h | 99,2 m³/h | 99% |
| Bomba IMBIL 65-160 | especificada | validação **ok** | ✓ |
| HMT requerida | 60 mca (ponto da bomba) | 50,8 mca | bomba real com folga ~18% — coerente |
| Aspersores | 392 (talhão irregular) | 420 (retângulo equivalente) | +7% — efeito de borda esperado |

**Conclusão central: o coração agronômico-hidráulico do motor (TASK-059/067) reproduz o projetista da Brasmáquinas.** A setorização agronômica derivada fica VALIDADA contra caso histórico.

## Divergências documentadas (material — gaps já catalogados na auditoria)

1. **Cascata de DN nas laterais**: o real reduz DN75→50→35→25 ao longo da lateral; o motor usa DN75 uniforme → mais PVC (BOM ≈30-40% acima). Gap: dimensionamento telescópico de lateral.
2. **Classes PN**: real PN40/60 por função; motor usa rígido PN80 nos sub-coletores (catálogo) → sobre-preço.
3. **1 blocker do solver** (velocidade/perda em laterais longas de 252 m) — o gate funcionou; o real resolve com a cascata de DN que não modelamos.
4. Jornada como 9/14/21 fixos: real usou 13 h → flexibilizar jornada é melhoria de input.

## Status E09 atualizado

Roteiro §11.2: **passo 3 (projeto histórico comparado) → EXECUTADO** (primeira vez). Passos 5 (RT avalia o PDF) e 6 (reunião "pronto para cliente") permanecem com o humano.
