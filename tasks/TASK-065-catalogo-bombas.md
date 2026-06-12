# TASK-065 — Catálogo de bombas homologadas + seleção com validação

**Status:** `concluída` · **Prioridade:** P1 · **Classe:** A — catálogo + UI
**Concluída em:** 2026-06-12 · **984/984 testes** (+3 T65) · 0 tsc · 37/37 tooling
**Autorização:** "Prossiga até uma versão profissional do software" (RT delegado)

> Mata o aviso mais alto restante ("Bomba não informada"). `BOMBAS_HOMOLOGADAS` no catálogo com 2 conjuntos NOMEADOS nas propostas reais do corpus (IMBIL INI BLOC 65-160 — 100 m³/h @ 60 mca, ponto declarado na proposta de 12,7 ha; EBARA GSD MEGABLOC 30 CV — 67 m³/h @ 73 mca, derivado da proposta de 32 ha), cada um com campo `fonte` rastreável; **PENDENTE_CONFIRMACAO_RT** (ponto nominal, sem curva Q-H completa — validação por `validatePump` existente). Schema: `pump.modelo?` novo. UI: seletor na seção BOMBA → `layout.pump`; readout Q/HMT/modelo. **Verificado ao vivo**: selecionar IMBIL no projeto real eliminou o aviso (validação ok: 100≥37,5 m³/h; 60≥33,7 mca); T65-3 garante que bomba subdimensionada continua reprovando (gate preservado).

## Fora do escopo
Curvas Q-H multiponto (interpolação de ponto de operação); preço da bomba na BOM (custo não disponível); sucção/elétrica como template.
