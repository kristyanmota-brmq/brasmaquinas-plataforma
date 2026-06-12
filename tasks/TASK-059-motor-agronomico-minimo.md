# TASK-059 — Motor agronômico mínimo (diagnóstico-only)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — domínio / agronomia
**Área:** layout / domínio / diagnósticos
**Criado em:** 2026-06-11
**Concluída em:** 2026-06-11 · **965/965 testes vitest** (+12 T59) · 0 erros tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-11-TASK-059.md`
**Predecessores:** análise do corpus de propostas reais (`docs/relatorios/2026-06-11-analise-propostas-reais.md`); diagnóstico especialista (crítica #1/#4)
**Autorização:** delegação explícita do usuário ("Prossiga") registrada no chat de 2026-06-11

---

## Objetivo

> Implementar a equação agronômica praticada nas propostas reais da Brasmáquinas (intensidade → tempo/setor → setores derivados) como camada de DIAGNÓSTICO, sem alterar a setorização vigente.

---

## O que foi feito

- **`src/lib/layout/agronomy.ts`** (novo, puro): `computeApplicationIntensityMmH`, `computeSectorTimeH`, `deriveRecommendedSectorCount`, `computeAgronomyReport` → `AgronomyReport` com intensidade (mm/h), tempo/setor (h), setores recomendados, divergência vs setorização atual, jornada insuficiente para a lâmina, e warnings prontos.
- **`irrigation-project.ts`**: `result.agronomy: AgronomyReport | null` (aditivo; calculado quando sprinklers+sectorization existem, inclusive em resultados incompletos); propagado ao 7º arg de `generateProposalDiagnostics`.
- **`bom.ts`**: `generateProposalDiagnostics` aceita `agronomyReport?` e anexa seus warnings (**nunca blockers**).
- Warning permanente: lâmina 10 mm/dia é premissa default não informada pelo cliente.

## Validação contra dados reais

Os testes T59-1 reproduzem os números EXATOS de proposta real (12,7 ha capim, NAAN 5035 2.110 L/h, 18×18, lâmina 10, 13 h): intensidade 6,512 mm/h · 1,5355 h/setor · 8 setores · 12,284 h totais.

**Insight registrado em premissa**: `setores = jornada` (regra legada) coincide com o valor derivado APENAS no arranjo 5022-SD @ 12×12 com lâmina 10 (tempo/setor ≈ 0,96 h ≈ 1 h) — a regra legada é uma calibração implícita desse arranjo único, e diverge para qualquer outro emissor/espaçamento.

## Critérios de aceite

- [x] Helpers puros com guards (entradas inválidas → 0, sem divergência falsa) — T59-5a/5b
- [x] Números da proposta real reproduzidos — T59-1 (4 asserções)
- [x] Divergência e jornada insuficiente detectadas — T59-3
- [x] `result.agronomy` presente em layout completo (fixture L) e null sem sectorization — T59-4
- [x] Warnings propagados a `diagnostics.warnings` — T59-4
- [x] Setorização vigente INTOCADA (`buildSectorizationForJornada` byte-a-byte; 953 testes pré-existentes sem regressão)
- [x] tsc 0 · vitest 965/965 · tooling 37/37 · catálogo intocado · nenhum blocker novo

## Fora do escopo

- Substituir o critério `setores = jornada` (mudança de comportamento de todos os layouts — decisão RT)
- Lâmina/cultura como input do usuário (UI + schema — task sucessora após RT definir campos)
- Homologação NAAN 5035 / espaçamento 18×18 no catálogo (RT)
- Vento, CU/DU, infiltração do solo (módulo agronômico completo — RT + agrônomo)

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-06-11 | Claude (Fable 5), delegação "Prossiga" | Task criada, implementada e concluída; premissa "Equação agronômica de setorização" registrada PENDENTE_REVISAO_RT |
