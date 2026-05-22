# TASK-022 — BOM de conexões físicas construtíveis

**Status:** `concluída`
**Prioridade:** `P2-importante`
**Área:** `bom / construtibilidade / domínio`
**Criado em:** 2026-05-21

---

## Objetivo

Adicionar à BOM as conexões físicas construtíveis derivadas da rede calculada, sem alterar geometria, solver, catálogo, PDF ou mapa.

---

## Contexto

Tasks anteriores estabeleceram a rede construtível:
- TASK-013/015: laterais físicas com eixo canônico; ramais com rota em L (90°) ou reta
- TASK-016: correção de falso positivo de 180° na junção ramal→lateral
- TASK-018/019: aspersor sobre lateral física (blocker se fora do eixo)

A BOM atual tem tubos, aspersores, tês de derivação lateral→principal e registros de seção.
**Conexões físicas derivadas da geometria (curvas em ramais em L, curvas na adutora, derivações aspersor→lateral) não existem na BOM.** Esta task as adiciona.

---

## Escopo

### A. Detecção física
- `tee_90_aspersor_lateral`: 1 por aspersor em cada lateral física (DN da lateral)
- `curva_90_ramal_l`: 1 por ramal em L (`sec.coords.length === 3`), por DN do ramal
- `curva_90_adutora`: 1 por dobra ≈ 90° na adutora, por DN da adutora
- `curva_45_adutora`: 1 por dobra ≈ 45° na adutora (sem SKU → pendência)
- Luvas: **fora do escopo** — nenhum critério de contagem definido, nenhum SKU

### B. Resolução de catálogo
- `curva_90_ramal_l` com DN conhecido → `CURVAS_90_RIGIDAS` → item precificado
- `curva_90_adutora` com DN conhecido → `CURVAS_90_RIGIDAS` → item precificado
- `curva_90_ramal_l` com DN indeterminado → `BOMPendingConnection` (motivo: `dn_indeterminado`)
- `tee_90_aspersor_lateral` → `BOMPendingConnection` (motivo: `sku_nao_catalogado`)
- `curva_45_adutora` → `BOMPendingConnection` (motivo: `sku_nao_catalogado`)
- Não inventar SKU; não inventar custo/preço

### C. Diagnóstico
- `conexoesFisicasSemSkuCount > 0` → blocker com prefixo "BOM incompleta"
- Lista os tipos pendentes no texto do blocker
- Diferenciado de blocker hidráulico/técnico

---

## Consequência operacional

**Após a TASK-022, todo projeto com aspersores terá blocker comercial até que o catálogo
de derivação aspersor→lateral seja homologado.** Isso é esperado e correto: a BOM
incompleta não deve gerar proposta final. O blocker será removido quando a TASK futura
homologar o SKU de tê redutor ou sela de tomada para a conexão aspersor→lateral.

Luvas estão fora do escopo por ausência de critério de contagem e nenhum SKU catalogado.
Task futura deve definir critério por tipo de tubo (ponta-bolsa LF, soldável rígido).

---

## Não alterar

- Catálogo (`aspersores.ts`) — read-only
- Solver hidráulico
- Roteamento (`routeSecondary`, `generateSecondaries`)
- Setorização
- PDF / rota `/api/pdf`
- Mapa (`ProjectMap.tsx`)
- Motor A/B/C
- Regras de diagnóstico técnico existentes (hidráulico, angular, eixo)

---

## Arquivos criados

- `src/lib/layout/physical-connections.ts`
- `src/lib/layout/__tests__/physical-connections.test.ts`

## Arquivos modificados

- `src/lib/bom.ts`
- `src/lib/layout/irrigation-project.ts`

---

## Critérios de aceite

- [x] Curva 90° de ramal em L → item precificado na BOM (DN via sizedSecondaries)
- [x] Ramal em L sem sizedSecondaries → `BOMPendingConnection` (motivo: `dn_indeterminado`)
- [x] Curva 90° na adutora → item precificado (SKU de CURVAS_90_RIGIDAS)
- [x] Curva 45° na adutora → `BOMPendingConnection` (motivo: `sku_nao_catalogado`)
- [x] Tê aspersor→lateral → `BOMPendingConnection` por DN lateral (motivo: `sku_nao_catalogado`)
- [x] `conexoesFisicasSemSkuCount` = soma das quantidades pendentes
- [x] Pendências não entram em `itens` nem em `totalGeral`
- [x] `generateProposalDiagnostics` → blocker "BOM incompleta" quando `conexoesFisicasSemSkuCount > 0`
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 704/704 testes passando (≥698 exigidos)

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Sonnet 4.6 | Arquivo formal criado; plano aprovado com ajustes |
| 2026-05-21 | Claude Sonnet 4.6 | Implementação concluída: physical-connections.ts, bom.ts, irrigation-project.ts, optimizer filter, 18 testes. 704/704 testes, 0 erros tsc. |
