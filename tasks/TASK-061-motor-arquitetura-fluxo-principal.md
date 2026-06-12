# TASK-061 — Transparência e controle da seleção arquitetural no fluxo da principal

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — UI / integração / domínio (wiring)
**Área:** ui / layout
**Criado em:** 2026-06-11
**Concluída em:** 2026-06-11 · **973/973 testes vitest** (+2 T61) · 0 erros tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-11-TASK-061.md`
**Predecessores:** TASK-043/056 (motor A0/A2/A3); decisão RT delegada de 2026-06-11 (TECH-053-01: resolver pela causa)
**Autorização:** delegação "Prossiga" (RT delegado)

## Objetivo

> Completar a integração do motor A0/A2/A3 ao fluxo de traçado da principal: avaliar com a topologia v12 real, dar transparência à seleção (antes silenciosa) e oferecer caminho manual→motor.

## O que foi feito

Descoberta de reconhecimento: o motor JÁ estava no fluxo automático (`buildSelectedPipelineCoords` desde TASK-043) com guarda para traçado manual — os gaps reais eram outros:

1. **Wiring v12 completado**: os 2 call sites em `ProjectMap.tsx` agora passam `projectResult.operational?.operationalSegments` (6º arg da TASK-056 que nunca era usado) — candidatos avaliados com a espinha de peixe real, não com topologia legada.
2. **Transparência**: novo estado `archSelection` + bloco "Arquitetura da rede (motor A0/A2/A3)" na seção Tubulação — vencedor, descrição, score por candidato, motivo, inválidos com razão. Antes, o resultado da seleção era descartado (só as coordenadas eram usadas).
3. **Caminho manual→motor**: botão "Usar traçado do motor" quando `source === "manual"` (reaproveita `resetToAutoPipeline`, agora com deps corrigidas).

## Verificação ao vivo (Fazenda do Paulo, browser real)

Projeto tinha traçado MANUAL diagonal com 22 conexões angulares não-construtíveis. Após "Usar traçado do motor":
- Blocker angular: **22 → 10 conexões** (eliminadas TODAS as junções de principal/secondary; as 10 restantes são em LATERAL = anomalia de dados B-03 → TASK-057, confirmando a decisão RT de 2026-06-11)
- BOM incompleta: 11 → 9 conexões sem SKU
- Painel de transparência revelou: **os 3 candidatos inválidos neste projeto** ("junções com ângulo fora") com A0 como fallback — informação antes invisível; é o sintoma dos dados desalinhados deste projeto
- Trade-off honesto registrado: ramais 539 m → 2.586 m (espinha mais longa); HMT 33,8 → 36,9 mca

## Critérios de aceite

- [x] `operationalSegments` passados nos 2 call sites (T61-1: 3 candidatos avaliados; T61-2: retrocompat sem segments)
- [x] Bloco de transparência renderiza vencedor + 3 avaliações + motivo (verificado em browser)
- [x] Botão manual→motor funcional (verificado: badge MANUAL → AUTO·PENDENTE; rede regenerada)
- [x] tsc 0 · vitest 973/973 · tooling 37/37 · nenhuma lógica de domínio nova em UI (apenas consumo de resultado)

## Fora do escopo

- Corrigir as 10 junções de lateral restantes (anomalia de DADOS — TASK-057)
- Otimização do comprimento da espinha (trade-off do motor — calibração E09)
- Persistir `archSelection` no layout (derivado, recalculável)

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-06-11 | Claude (Fable 5), RT delegado | Criada, implementada, verificada ao vivo e concluída |
