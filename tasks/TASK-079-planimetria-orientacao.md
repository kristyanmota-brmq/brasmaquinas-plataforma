# TASK-079 — Planimetria comanda a orientação da grade

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — motor de layout
**Área:** layout
**Criado em:** 2026-06-12
**Concluída em:** 2026-06-12 · **1010/1010 testes vitest** (+5 T79) · 0 erros tsc
**Relatório:** `docs/relatorios/2026-06-12-TASK-079.md`
**Autorização:** sessão ao vivo com o fundador da Brasmáquinas (2026-06-12): "você não está considerando a planimetria ao determinar o layout" — campo de teste Fazenda Três Ilhas (Carinhanha/BA, 978 aspersores)

---

## O debate e o diagnóstico

**Tese do fundador:** o layout não considera a planimetria (geometria em planta) do talhão.

**Diagnóstico no código — o fundador tinha razão no princípio:**
1. `findOptimalGridAngle` escolhia o ângulo por **menor bounding box** — critério geométrico abstrato, cego ao azimute da divisa. Em polígonos com vértices imperfeitos, o bbox mínimo cai a 1-3° da divisa por ruído.
2. **Range 0–89°**: como as colunas (laterais) são agrupadas no eixo X do frame rotacionado, laterais exatamente E-W exigiriam 90° — fora do domínio. Campos N-S saíam a 87-89° estruturalmente.
3. Racional profissional ausente: laterais seguem linhas de plantio, que seguem a divisa dominante; esviés de 2-3° cruza fileiras de cultivo, desiguala headlands e mina a credibilidade da proposta.

**Contra-descoberta na verificação:** no talhão de teste, a divisa dominante medida é **87,1° de leste** (dominância 36%) — o talhão está realmente ~3° fora do norte (acompanha a BA-161). Os 87° do motor antigo estavam **alinhados à divisa por coincidência** (bbox de retângulo coincide com alinhamento). O motor novo confirma 87° **pela via certa** — e o T79-5 prova que, com ruído de vértices, o critério antigo desalinharia e o novo não.

## Implementação

- `dominantBoundaryAzimuth(polygon)` — arestas do anel externo ponderadas por comprimento, direções mod 180°, cluster guloso ±3°, média ponderada circular; `dominance` = peso do cluster / perímetro.
- `findOptimalGridAngle` v2 — com divisa dominante (≥ `PLANIMETRIA_MIN_DOMINANCE` = 0,3): avalia só os 2 ângulos alinhados (colunas ⊥ e ∥ à divisa) e escolhe o de **colunas mais curtas** (laterais construtíveis), desempate por bbox e menor ângulo; sem dominância: fallback geométrico anterior (varredura por menor bbox), agora em **0–179°**.
- Range estendido 0–179° no motor, no otimizador de candidatos e no slider da UI.

## Testes (T79)

1. T79-1 — campo alto-estreito N-S → **90° exato** (colunas E-W curtas; antes saía 87-89)
2. T79-2 — campo largo E-W → 0°
3. T79-3 — campo rotacionado 30° → alinhamento mod 90 com a divisa
4. T79-4 — polígono sem direção dominante (≈círculo) → fallback sem erro
5. T79-5 — **anti-87°**: divisa N-S com vértices imperfeitos (ruído 1,5 m) → ainda 90°

## Fora do escopo (registrado para o roadmap)

- Roteamento ciente de exclusões internas (açude/sede no meio do talhão): tubos não deveriam atravessar o recorte — hoje só os aspersores o respeitam
- Adutora seguindo carreadores/estradas (planimetria de acesso) — gate manual "Validar corredor em campo" continua sendo a salvaguarda
- Altimetria por trecho (desnível ao longo da rede; hoje só captação→área)
