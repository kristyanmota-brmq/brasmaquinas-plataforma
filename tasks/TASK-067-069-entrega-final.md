# TASK-067/068/069 — Entrega final: setorização agronômica, proposta comercial completa, validação histórica

**Status:** `concluída` · **Prioridade:** P1 · **Classe:** A
**Concluída em:** 2026-06-12 · **987/987 testes** (+2 T67) · 0 tsc · 37/37 tooling
**Autorização:** "Quero o software pronto para rodar. Me entregue." (RT delegado)

## TASK-067 — Setorização agronômica derivada (resolve BLOCKER #4 da auditoria)
`buildSectorizationAgronomica()`: setores = floor(jornada ÷ (lâmina ÷ intensidade)) — a equação das propostas reais agora DIMENSIONA (não só diagnostica). Toggle na UI "Agronômico (derivado) | Por jornada (legado)"; `sectorization.setoresMode` no schema; legado byte-preservado (T67-2). Com 5035@18×18 o sistema agora gera o nº de setores CORRETO (T67-1).

## TASK-068 — Proposta comercialmente completa (resolve BLOCKERs #1 e #2)
PDF ganha: **Orçamento Nº** (ref estável derivada), **Validade 30 dias**, campos Consultor/RT para assinatura; seção **"Conjunto Moto-Bomba e Escopo Complementar"** — bomba selecionada com especificação e validação (ou "a especificar"), sucção/elétrica/barrilete/frete como escopo declarado de projeto executivo (padrão das propostas reais). Evidência: `evidencias/2026-06-12-TASK-068/proposta-comercial-completa.pdf`.

## TASK-069 — PRIMEIRA VALIDAÇÃO HISTÓRICA (resolve BLOCKER #3 — E09 §11.2 passo 3)
Proposta real de 12,7 ha reproduzida pelo motor (`scripts/diagnose/validar-projeto-historico-jaiba.tsx`): **intensidade EXATA (6,512), tempo/setor 99,8%, vazão/setor 99%, bomba validada** — o motor reproduz o projetista humano nos critérios de operação. Divergências documentadas (cascata de DN, classes PN, jornada 13h) em `docs/relatorios/2026-06-12-TASK-069-validacao-historica.md`. Passos 5-6 do roteiro (avaliação RT humana do PDF + reunião formal) permanecem com o humano.
