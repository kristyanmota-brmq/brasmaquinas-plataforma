# TASK-010E-B — Métricas de rede de distribuição no motor de candidatos

**Status:** `concluída`
**Prioridade:** `P2-importante`
**Área:** `layout / domínio`
**Criado em:** 2026-05-20
**Atualizado em:** 2026-05-20

---

## Objetivo

> Incluir 7 métricas geométricas da rede de distribuição (principal, adutora, ramais/secundárias) no `LayoutScore`, calculadas quando `waterSource` é fornecido como parâmetro opcional ao motor. Dois pesos provisionais ativos (`WEIGHT_SECONDARY_LENGTH = 0.10`, `WEIGHT_TOTAL_NETWORK_LENGTH = 0.10`) marcados como `PREMISSA_PROVISORIA_MERCADO` e documentados em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`. `hydraulicBlockers` permanece `null` — requer solver hidráulico por candidato → TASK-010F.

---

## Contexto

TASK-010E-A adicionou métricas de laterais. Esta tarefa complementa com métricas de rede de distribuição quando a captação (`waterSource`) está disponível. Retrocompatibilidade total: chamadas sem `waterSource` retornam os mesmos resultados anteriores.

Nova regra de desenvolvimento estabelecida: quando faltar dado de calibração da Brasmáquinas, usar premissa provisória de mercado/engenharia com peso não-zero, marcada para revisão pelo RT em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/sprinkler-grid-optimizer.ts` | modificação | `LayoutScore` +7 campos; 2 novos pesos PREMISSA_PROVISORIA_MERCADO; `computeScore` calcula rede via `generatePrincipalAndAdutora` + `generateSecondaries`; `findBestSprinklerLayout` aceita `waterSource?` |
| `src/lib/layout/__tests__/sprinkler-grid-optimizer.test.ts` | modificação | +11 testes de métricas de rede de distribuição |
| `src/lib/layout/__tests__/optimizer-integration.test.ts` | modificação | Fixture `makeCandidate` +7 campos null |
| `src/components/map/ProjectMap.tsx` | modificação | `runOptimizer` passa `waterSource`; painel exibe métricas de rede ou hint de captação |
| `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` | criação | Registro de 4 premissas provisórias: 2 pesos + normalização + proxy de comprimento |

---

## Critérios de aceite

- [x] `principalLengthM`, `adutoraLengthM`, `secondaryLengthM`, `totalNetworkLengthM`, `avgSecondaryLengthM`, `maxSecondaryLengthM`, `distributionLengthRatio` presentes e positivos quando `waterSource` informado
- [x] Todos os 7 campos permanecem `null` quando `waterSource` não informado
- [x] `WEIGHT_SECONDARY_LENGTH = 0.10` e `WEIGHT_TOTAL_NETWORK_LENGTH = 0.10` ativos, marcados PREMISSA_PROVISORIA_MERCADO
- [x] `hydraulicBlockers` permanece `null`
- [x] Score difere entre candidato com captação próxima vs. captação distante
- [x] Retrocompatibilidade total: `findBestSprinklerLayout(polygon, spacingMeters)` sem `waterSource` funciona igual ao anterior
- [x] UI exibe seção "Rede de distribuição — preliminar" com aviso "Comprimentos geométricos. Não substitui hidráulica, BOM ou validação técnica."
- [x] Premissas documentadas em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 584/584 (573 anteriores + 11 novos)

---

## Testes implementados

### `sprinkler-grid-optimizer.test.ts` (+11)

1. `secondaryLengthM` null sem waterSource
2. `principalLengthM` não-null com waterSource externo
3. `principalLengthM > 0` com captação a ~500 m do polígono
4. `secondaryLengthM > 0` com captação externa
5. `distributionLengthRatio > 0` quando rede presente
6. `totalNetworkLengthM` = totalLateralLengthM + principal + adutora + ramais
7. `avgSecondaryLengthM` e `maxSecondaryLengthM` presentes e positivos
8. Score com captação próxima (centroide) > score com captação distante (~500 m sul)
9. Retrocompatibilidade: `findBestSprinklerLayout(polygon, spacingMeters)` sem `waterSource` retorna métricas null
10. `buildSelectionReason` menciona rede quando `waterSource` presente
11. `WEIGHT_SECONDARY_LENGTH = 0.10` (valor e marcador PREMISSA_PROVISORIA_MERCADO)

---

## Fora do escopo

- `hydraulicBlockers` calculado (requer solver hidráulico → TASK-010F)
- Solver hidráulico, BOM, catálogo, setorização, `layout-schema.ts`
- Motor A/B/C, motor comercial
- `WEIGHT_LATERAL_LENGTH` (calibração pendente de campo)

---

## Dependências

**TASK-010E-A concluída ✅**

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Tarefa criada e implementada |
