# TASK-080 — Altimetria comanda as laterais (laterais em nível)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — motor de layout
**Área:** layout
**Criado em:** 2026-06-12
**Concluída em:** 2026-06-12 · **1017/1017 testes vitest** (+7 T80) · 0 erros tsc
**Relatório:** `docs/relatorios/2026-06-12-TASK-080.md`
**Autorização:** correção do fundador em sessão (2026-06-12): "a regra para definir o layout das laterais não é o que você disse" — sequência da TASK-079

---

## A regra correta (a que o fundador cobrou)

A TASK-079 colocou a planimetria (divisa) como critério primário. **Incompleto**: a regra canônica de aspersão convencional (Bernardo, *Manual de Irrigação*; Keller & Bliesner; NRCS Sprinkler Guide) é:

1. **LATERAIS EM NÍVEL** — ao longo das curvas de nível (perpendiculares à maior declividade). É a condição que mantém a **variação de pressão ao longo da lateral ≤ ~20% da pressão de serviço** (regra que nossos gates de capacidade já cobram — sem laterais em nível, o gate vira inatingível em terreno inclinado).
2. **Principal no sentido do declive** (idealmente no espigão, alimentando dos dois lados; descida compensa perda de carga).
3. **Terreno plano** (declividade < limiar): aí sim a planimetria comanda (divisa/linhas de plantio — TASK-079), com vento como desempate (futuro).

## Implementação

- [`terrain-gradient.ts`](../src/lib/layout/terrain-gradient.ts) — `fitTerrainGradient(samples)`: ajuste de plano z = a·x + b·y + c por mínimos quadrados (centrado, com guarda de degenerescência); retorna direção da maior declividade (graus-de-leste, mod 180) e declividade (%). `ALTIMETRIA_MIN_SLOPE_PCT = 2` · `MIN_TERRAIN_SAMPLES = 8`.
- `findOptimalGridAngle(polygon, spacing, opts?)` — nova hierarquia: altimetria (θ = direção do gradiente → colunas ao longo da curva de nível) → planimetria (TASK-079) → geometria (bbox 0–179°).
- UI: amostragem 7×7 do terreno Mapbox dentro da área (com retry para terreno tardio); sem dado → planimetria graciosa. Gradiente alimenta o `optimalAngle`.

## Testes (T80)

Ajuste de plano (direção/magnitude com e sem ruído; degenerados → null) + hierarquia: **T80-5 conflito real** — declive 5% para leste em campo N-S: altimetria θ=0 VENCE a planimetria (que pedia 90°); T80-6 declive 1% (sob o limiar) → planimetria mantém; T80-7 gradiente 30° → θ=30.

## Limitações conhecidas / próximos passos

- Gradiente médio (plano único) — terrenos com duas vertentes (espigão central) pedem segmentação por talhão/bloco (A8) ou análise por setor; registrado.
- Limiar de 2% e malha 7×7 são calibração de campo (E09).
- Vento como desempate em terreno plano — premissa futura (dado não disponível hoje).
- Principal "no espigão" ainda não é candidato do motor A0-A8 (A4/A5 cobrem parcialmente).
