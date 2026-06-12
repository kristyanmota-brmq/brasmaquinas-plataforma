# TASK-060 — Família 5035 SD no catálogo (homologação provisória) + lâmina/cultura como inputs

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — catálogo / domínio / UI
**Área:** catálogo / layout / ui
**Criado em:** 2026-06-11
**Concluída em:** 2026-06-11 · **971/971 testes vitest** (+6 T60) · 0 erros tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-11-TASK-060.md`
**Predecessores:** TASK-059 (motor agronômico); análise corpus propostas reais
**Autorização:** delegação explícita do usuário ("Prossiga. O que precisar de informação busque em nossos arquivos, ou na internet.") em 2026-06-11

---

## Objetivo

> O catálogo passa a conhecer o aspersor mais vendido da empresa (NAAN 5035 SD) e a lâmina/cultura viram inputs do projetista — pré-requisitos para o gerador reproduzir o projeto típico real.

## O que foi feito

1. **Catálogo (aditivo)**: 3 entradas novas em `ASPERSORES` — 5035 SD 5,0×2,5 @3,0 bar (2,11 m³/h, raio 15,75 m, SKU 101080547, custo R$43,86/venda R$52,60), 5035 SD 3,5×2,5 (1,24 m³/h, raio 13,6 m) e 5035 SD PC 4,5 (part-circle de borda). Espaçamento padrão 18×18. `getAspersorBySku()` com fallback para o padrão. **`ASPERSOR_PADRAO` byte-idêntico** (T60-4).
   - Fontes: SKU/custo/preço da lista Rivulis no corpus real (docs/PROJETO/, gitignored); dados técnicos da tabela de performance Acurain 5035 SD do fabricante (jains.com); intensidade 6,51 mm/h @ 18×18 confere com proposta real (T60-2).
2. **Schema**: `sectorization.laminaMm: 10` (literal) → `number`; novo `cultura?: string`. `ProjectInput.laminaMm` idem.
3. **Use-case**: `buildSectorizationForJornada(..., laminaMm = 10, cultura?)` — default preserva legado (T60-5).
4. **UI**: inputs "Lâmina (mm/dia)" e "Cultura" na seção Setorização; lâmina/cultura preservadas ao trocar jornada; leitura agronômica ao vivo na sidebar (Intensidade + Setores agronômico, de `result.agronomy`). **Verificado ao vivo via Chrome**: alterar a lâmina recalcula intensidade/setores em tempo real e auto-salva.

## Critérios de aceite

- [x] `getAspersorBySku` resolve 5035 e cai no padrão (T60-1)
- [x] Intensidade do 5035 5,0×2,5 @18×18 = 6,51 mm/h = proposta real (T60-2)
- [x] Espaçamento ≤ 2×raio e custo<venda nos 3 novos (T60-3)
- [x] `ASPERSOR_PADRAO` intocado (T60-4) — regra "SKUs existentes não mudam" preservada
- [x] Default de lâmina preserva legado (T60-5); lâmina/cultura fluem até `result.agronomy` (T60-6)
- [x] tsc 0 · vitest 971/971 · tooling 37/37 · verificação visual em browser real

## Fora do escopo

- Seleção de aspersor na UI + grade 18×18 (requer `aspersorId` dirigindo espaçamento da malha, kit por modelo e capacidade de lateral por vazão — task própria, a maior pendência para reproduzir o projeto típico)
- Kit de subida para 5035 (tee roscável por DN, equivalente ao kit 5022)
- Substituir critério de setorização (RT)

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-06-11 | Claude (Fable 5), delegação "Prossiga + buscar info" | Criada, implementada e concluída; dados coletados do corpus interno + fabricante (jains.com) |
