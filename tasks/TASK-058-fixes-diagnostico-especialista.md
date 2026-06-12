# TASK-058 — Correções cirúrgicas do diagnóstico especialista (ADR-002 + feedback PDF 422)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — hidráulica (lib pura) + UI (apresentação)
**Área:** hidráulica / ui
**Criado em:** 2026-06-11
**Concluída em:** 2026-06-11 · 953/953 testes vitest (+2 T58) · 0 erros tsc · 37/37 tooling
**Relatório:** `docs/relatorios/2026-06-11-TASK-058.md`
**Predecessor:** diagnóstico `docs/relatorios/2026-06-11-diagnostico-especialista-irrigacao.md` (prioridades #1 e #2)
**Autorização:** delegação explícita do usuário ("vc decide" + "Prossiga") registrada no chat de 2026-06-11

---

## Objetivo

> Corrigir as duas falhas XS de maior impacto do diagnóstico especialista: (1) `selectDiameter` violando ADR-002 (diâmetro nominal em cálculos HW); (2) PDF 422 sem nenhum feedback visível quando todos os blockers são rt-pending.

---

## O que foi feito

### Fix 1 — `src/lib/hydraulics/hazenWilliams.ts` (ADR-002)
`selectDiameter` passou a usar `diametroInternoMm ?? diametroMm` nos 4 pontos de cálculo (hf do loop, velocity do loop, hf do fallback, velocity do fallback). Nominal subestimava hf em ~(Dn/Di)^4,871 (≈47% em DN50 LF interno 46 mm). **Violação latente** — nenhum consumidor de produção hoje (`selectTubo` do catálogo já usava interno; só `laterais.test.ts` consome) — mas API pública exportada que contaminaria qualquer chamador futuro. Testes existentes (comportamentais) preservados sem ajuste.

### Fix 2 — `src/components/map/ProjectMap.tsx` (feedback do gate)
Banner "PDF bloqueado pela governança" renderizado SEMPRE que `pdfError.kind === "blocked"`, independente da partição rt-pending/data-block, posicionado acima dos painéis de blockers; detalhes de segmentos inválidos migrados do painel data-block (onde só apareciam se houvesse blocker vermelho) para o banner. Regressão da reorganização B-05/W-08 (nightly 2026-05-25): com blockers só-azuis, o 422 não produzia nenhum feedback. **Verificado ao vivo via Chrome** no projeto Fazenda do Paulo (2 blockers rt-pending → banner visível após clique no PDF).

## Critérios de aceite

- [x] `selectDiameter` calcula hf/velocidade com Øint quando disponível (T58-1) e faz fallback para nominal (T58-2)
- [x] Banner de PDF bloqueado visível com blockers exclusivamente rt-pending (verificação visual em browser, projeto real)
- [x] `npx tsc --noEmit` → 0 erros · `npx vitest run` → 953/953 · tooling 37/37
- [x] Nenhuma lógica de domínio nova em UI (banner é apresentação de estado existente)
- [x] Catálogo intocado; TECH-053-01 ATIVO; contrato `blockers: string[]` intocado

## Fora do escopo (permanecem no diagnóstico)

- Motor A0/A2/A3 no fluxo de traçado da principal (decisão de produto)
- Módulo agronômico (RT + agrônomo)
- Catálogo: curva 45° PN80, tês PN80, custos, marcas (RT/comercial)
- Setores derivados de lâmina×turno×vazão (RT)
- Labels de setor sobrepostos (P2); auto-save ao visualizar; item 0-barras na BOM

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-06-11 | Claude (Fable 5), delegação "Prossiga" | Task criada, implementada e concluída na mesma sessão do diagnóstico |
