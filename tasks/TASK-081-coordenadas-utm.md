# TASK-081 — Coordenadas exibidas em UTM (SIRGAS 2000)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — util de domínio + UI (apresentação)
**Área:** layout / ui
**Criado em:** 2026-06-12
**Concluída em:** 2026-06-12 · **1025/1025 testes** (+7 T81) · 0 erros tsc
**Relatório:** `docs/relatorios/2026-06-12-TASK-081.md`
**Autorização:** correção do RT da Brasmáquinas, presente em sessão: "Todas as coordenadas que aparecem para nós devem ser em UTM"

## Racional

Levantamento planialtimétrico, memorial descritivo e ART trabalham em UTM E/N + fuso (SIRGAS 2000) — graus decimais na tela é convenção de software genérico, não de projeto de engenharia brasileiro. UTM vira a camada de APRESENTAÇÃO; armazenamento interno permanece lng/lat (Mapbox).

## Entrega

- `src/lib/layout/utm.ts` — Krüger ordem n⁴ sobre GRS80 (≡ WGS84 < 1 mm): `latLngToUtm`, `utmToLatLng` (para round-trip), `utmZone`, `formatUtm` ("E 499.586 m · N 8.673.413 m · 23S", milhar pt-BR, resolução 1 m)
- UI: captação e casa de bomba em UTM
- T81-1..7: fusos do Brasil; E=500.000 exato no meridiano central; N=10.000.000 no equador sul; k0; round-trip < 1 mm em 5 pontos reais (incl. borda de fuso e Manaus)

## Pendências registradas

- Entrada em UTM na busca do mapa (`parseCoordinate`) — RT poder colar E/N do levantamento
- Coordenadas UTM no memorial do PDF (E07)
