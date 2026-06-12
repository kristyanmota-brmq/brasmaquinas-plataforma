# TASK-085 — Catálogo de bombas THEBE/EBARA por catálogo de fabricante

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — catálogo / domínio
**Área:** catálogo
**Criada em:** 2026-06-12
**Autorização:** ordem direta do usuário em sessão ("busque o catálogo das bombas THEBE e EBARA"; escopo reduzido aprovado: "somente THS18, R 20, RL 20B e as bombas normalizadas da Ebara")
**Predecessores:** TASK-065 (catálogo provisório de 2 bombas), TASK-077 (bomba automática), TASK-078 (ajuste automático)

## Objetivo

Expandir `BOMBAS_HOMOLOGADAS` (2 → 99 entradas) com os pontos nominais das
linhas aprovadas pelo usuário, extraídos do catálogo oficial do fabricante
(Ebara/Thebe são o mesmo grupo — EBAS), com `fonte` rastreável página a página.

## Escopo entregue

- **THEBE THS-18** (pág. 11): 14 entradas (3–12,5 cv, rotores 123–179)
- **THEBE R-20** (pág. 13): 4 entradas (7,5–15 cv, rotores 183–197)
- **THEBE RL-20B** (pág. 13): 11 entradas (10–25 cv, rotores 147–200)
- **EBARA normalizadas GS/GSD 3500 rpm** (págs. 60–65): 68 entradas
  (tamanhos 32-125 … 100-160, rotores e potências por linha do catálogo)

## Fonte

`docs/catalogos/bombas/` (PDFs gitignored; URLs no README): **Catálogo de
Produtos de Superfície 60 Hz 2025 rev00 (EBAS)**, download 2026-06-12.
Páginas citadas são as impressas (PDF = impressa + 2).

## Convenções (premissa nova no doc 12, PENDENTE_CONFIRMACAO_RT)

1. **Ponto nominal = ponto MEDIANO** (⌈N/2⌉) dos pontos publicados com H > 0
   na tabela do fabricante — conservador para a validação retangular de
   `validatePump` (à esquerda do ponto a curva real entrega altura ≥ registrada).
2. **Âncora de coluna:** último ponto da linha ancora na maior coluna de
   altura < altura máxima (shut-off) publicada — propriedade física que
   corrigiu o alinhamento em todas as linhas; tabelas Thebe usam a vazão
   máxima da linha como âncora equivalente.
3. **Potência (cv):** rótulo do catálogo por trecho da curva; ambíguo →
   menor cv da linha com η implícita ≤ 0,84 (BEP máx. série GS).
4. **Envelope de aspersão:** registradas apenas linhas com ponto nominal em
   Q 15–200 m³/h e H 15–90 mca. Versões 1750 rpm (H 6–15 m) ficam fora;
   família GSDU não duplicada (hidráulica idêntica à GS/GSD — usada como
   validação cruzada: 50 pontos idênticos em 56 duplicados).
5. Conferência visual em 600 dpi das tabelas das págs. 11, 13, 60–65.

## Critérios de aceite

- [x] ≥ 97 bombas novas com fonte página a página (97 entregues)
- [x] Entradas TASK-065 byte-idênticas (T85-2); catálogo append-only
- [x] η implícita ∈ [0,40, 0,88] em todas (T85-4; range real 0,45–0,84)
- [x] Modelos únicos (T85-1); pontos canônicos do corpus cobertos (T85-5)
- [x] `npx tsc --noEmit` 0 erros; testes da superfície de bombas 186/186

## Fora do escopo

- Curva Q-H multiponto (trilho futuro TASK-065); preço/custo de bombas (E08);
  UI além da lista maior; promoção de status RT; demais linhas Thebe
  (B, TH, THL, P multiestágio…) — segunda leva sob demanda.
