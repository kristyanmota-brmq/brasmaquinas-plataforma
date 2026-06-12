# TASK-086 — Curva Q-H multiponto (catálogo + validação + seleção)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — catálogo / motor hidráulico
**Área:** catálogo / hidráulica
**Criada em:** 2026-06-12
**Autorização:** ordem direta do usuário ("Vamos para a Curva Q-H multiponto"); plano aprovado ("Prossiga")
**Predecessores:** TASK-065 (trilho futuro registrado), TASK-077 (seleção por menor folga), TASK-085 (97 bombas com ponto nominal)

## Objetivo

Substituir a validação retangular (2 escalares) pela curva Q-H completa do
fabricante: a bomba é julgada pela **altura que realmente entrega na vazão de
projeto** (interpolação linear na tabela), com fallback retangular intacto
para bombas sem curva.

## Entregas

1. **Dados:** `CURVAS_QH_BOMBAS` (aspersores.ts) — 97 curvas, 725 pontos
   `[qM3h, hMca]`, mesma fonte página a página da TASK-085; geração com âncora
   física no shut-off + invariante "ponto nominal contido na curva".
2. **Motor:** `pump-curve.ts` (`pumpHeadAtFlow` — interpolação linear, clamp à
   esquerda como cota inferior segura, `null` acima da faixa) + `validatePump`
   curve-aware (`validationModel`, `availableHeadAtFlowMca` aditivos) +
   warning de bomba insuficiente cita a altura pela curva.
3. **Seleção:** `selectBombaAutomatica` curve-aware (folga com a altura real
   em q); caminho nominal TASK-077 preservado para bombas sem curva.
4. **Correções de dado (efeito do invariante):** 4 entradas TASK-085 com erro
   de ±1 coluna corrigidas por verificação visual 500 dpi — 40-200 r172
   (52→54 mca, 15→20 cv), 50-160 r148 (35→37), 50-125 r134 (25→26, 10→12,5 cv),
   65-160 r165 (41→44). Cauda ilegível da 32-200 r175 truncada (conservador).

## Critérios de aceite

- [x] 97/97 curvas com nominal contido na curva (T86-6)
- [x] Gate nunca relaxado; curva pode reprovar nominal "aprovável" (T86-7)
- [x] Fallback retangular byte-idêntico p/ IMBIL e GSD MEGABLOC (T86-5)
- [x] `npx tsc --noEmit` 0 erros · vitest 1049/1049 (≥ 1038)

## Fora do escopo

Ponto de operação real (interseção curva×sistema); NPSH; rotação variável;
curvas para bombas do corpus (sem dado de fabricante); UI além do warning.
