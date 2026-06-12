# TASK-062 — Fallback de tês DN125/150 na BOM fishbone + primeira emissão por mérito

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — BOM / UI (robustez)
**Área:** bom / ui
**Criado em:** 2026-06-11
**Concluída em:** 2026-06-11 · **978/978 testes vitest** (+2 T62) · 0 erros tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-11-TASK-062.md`
**Evidência:** `docs/relatorios/evidencias/2026-06-11-TASK-062/proposta-fazenda-do-paulo-primeira-emissao.pdf`
**Predecessores:** TASK-054 (BOM fishbone); TASK-057 (blocker angular eliminado); revisão RT delegada
**Autorização:** delegação "Prossiga" (RT delegado)

## O que foi feito

1. **Fallback de família na resolução fishbone** (`bom.ts`): as 11 pendências do projeto real eram um único item — Tê PVC Ø125 (6 principal→entry + 5 junção) — e o catálogo JÁ TINHA o SKU `1000363` (TE PVC SOLD. IRRIG **PN80** 125MM, classe correta para a linha rígida) na família `TES`, que a emissão fishbone não consultava. Resolução agora: `TES_DERIVACAO_LATERAL` (LF 50/75/100, exato) → fallback `TES` (sold. irrig 75/100/125/150, exato) → pendência. **Nenhum SKU novo; nunca aproxima DN.**
2. **Timeout de segurança no export de PDF** (`ProjectMap.tsx`): a captura do mapa esperava o evento `"idle"` do Mapbox sem timeout — quando não disparava, o spinner travava para sempre e o fetch nunca saía. Fallback de 5 s adicionado.
3. **Script de evidência** `scripts/diagnose/emit-pdf-evidencia.tsx` (gera o PDF pelo mesmo caminho do servidor, com banco).

## Resultado histórico

- Pendências do projeto real: 11 → **0** · blockers: 1 → **0** (painel azul vazio na UI)
- **`POST /api/projetos/.../pdf → HTTP 200 em 2,5 s` — primeira proposta emitida pelo gate POR MÉRITO** (zero overrides em toda a cadeia: 22 ângulos → motor → 10 → fix do grampo → 0 → SKU homologado → emissão)
- PDF íntegro (5 páginas): proposta com BOM completa (R$ 145.285,85, tês fishbone incluídos) + memorial hidráulico (HMT 33,7 mca decomposta; dimensionamento de todos os ribs/spines)

## Pendências menores identificadas na emissão (não bloqueiam)

- Keys React duplicadas no PDF (`TIGRE_TE_*_LF` 2× — tê de lateral + tê fishbone com mesmo SKU): warning cosmético, linhas íntegras; corrigir key composta (sku+descricao) em task de E07
- Memorial lista ribs/spines de 0,0 m (tês de cruzamento) com 0,00 m/s — filtrar segmentos estruturais de comprimento 0 em task de E07
- Layout do memorial: coluna HF/STATUS coladas

## Critérios de aceite

- [x] DN125 fishbone precificado via `TES` (T62-1); DN sem match em nenhuma família → pendência (T62-2)
- [x] Projeto real com 0 pendências e 0 blockers (verificado server-side e na UI)
- [x] PDF 200 + documento íntegro (evidência anexada)
- [x] tsc 0 · vitest 978/978 · tooling 37/37 · catálogo intocado (nenhum SKU criado/alterado)

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-06-11 | Claude (Fable 5), RT delegado | Fallback TES + timeout PDF + primeira emissão por mérito documentada |
