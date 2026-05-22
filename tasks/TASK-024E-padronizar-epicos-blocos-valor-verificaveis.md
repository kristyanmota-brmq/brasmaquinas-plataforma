# TASK-024E — Padronizar épicos como blocos de valor verificáveis

**Status:** `concluída`
**Prioridade:** P1-crítico (governança)
**Classe:** C — Documental
**Área:** governança / rastreabilidade / metodologia
**Arquivo:** `tasks/TASK-024E-padronizar-epicos-blocos-valor-verificaveis.md`
**Concluída em:** 2026-05-22 · 817/817 testes preservados · 0 erros tsc preservado · nenhum arquivo em `src/` alterado

> Atualizado o Mapa Mestre (`tasks/TASK-024-mapa-mestre-tasks.md`) com uma nova **Seção 2 — Épicos como blocos de valor verificáveis**. Cada um dos 9 épicos (E01..E09) passa a ter um bloco estruturado com 11 campos: Propósito, Capacidade entregue, Escopo, Fora do escopo, Critérios de aceite, Métricas, Dependências, Decisões (em 4 sub-categorias: Regra técnica / Boa prática / Decisão de engenharia / Decisão comercial), Riscos, Status real e Tasks vinculadas. Status real conservador, baseado estritamente em relatórios já publicados. Nenhum arquivo em `src/`, catálogo, PDF, mapa UI, ADR ou premissas técnicas alterado.

---

## 1. Motivação

Antes da TASK-024E, o Mapa Mestre descrevia cada épico apenas como agrupamento de tasks. O usuário sabia "quais tasks pertencem ao épico", mas não "o que o épico entrega como bloco de valor", "sob quais critérios", "com quais decisões", "com qual maturidade real" — esses dados ficavam pulverizados entre a auditoria (TASK-024C) e a matriz de validação (TASK-024D), sem visão executiva consolidada.

A TASK-024E consolida essas três visões em um único formato padronizado: o **bloco de valor verificável**, lido como ponto de entrada do Mapa Mestre, complementado por:

- Seção 1 — visão geral (tabela ID/Nome/Escopo principal).
- Seção 3 — tasks concluídas por épico (índice de execução).
- Seção 4 — tasks futuras por épico.
- Seção 10 — auditoria de conclusão dos épicos (TASK-024C; detalhada).
- Seção 11 — matriz de validação (TASK-024D; roteiro mínimo).

---

## 2. Estrutura adicionada

A nova Seção 2 segue um template fixo por épico:

| Campo | Conteúdo | Tamanho típico |
|---|---|---|
| Propósito | 1 frase | 1 bullet |
| Capacidade entregue | O que o sistema passa a fazer | 3–5 bullets |
| Escopo | Limites explícitos | 3–5 bullets |
| Fora do escopo | Limites explícitos | 2–4 bullets |
| Critérios de aceite | Condições binárias | 3–5 bullets |
| Métricas | Indicadores verificáveis | 2–4 bullets |
| Dependências | Outros épicos ou tasks | 1–2 bullets |
| Decisões | 4 sub-categorias (Regra técnica / Boa prática / Decisão de engenharia / Decisão comercial) | 4 bullets fixos; "—" quando vazio |
| Riscos | O que pode falhar | 2–4 bullets |
| Status real | Nível único da escala de 7 níveis da TASK-024D + 1 linha de evidência | 1 bullet |
| Tasks vinculadas | 2 listas de IDs (concluídas / pendentes-futuras) | 2 linhas |

Total por épico: ~45–55 linhas. Total da nova Seção 2: ~490 linhas.

---

## 3. Política de status real

Reaproveitada integralmente a **escala de 7 níveis** da TASK-024D:

```
Implementado → Testado em código → Validado em simulação sintética →
Validado em projeto histórico → Validado visualmente →
Validado em piloto interno → Homologado Brasmáquinas
```

Cada épico declara **um único nível** com 1 linha de evidência apontando para relatório, ADR ou TASK específicos.

### Promoções desde TASK-024C (2026-05-21)

Apenas onde TASK-046 (2026-05-22) fechou a série de validação visual no Projeto A:

| Épico | TASK-024C | TASK-024E | Justificativa |
|---|---|---|---|
| E02 Layout | Testado em código | Validado visualmente no Projeto A — caso único | TASK-046: ângulo 59° aplicado, 344/344 aspersores em kit, 0 blockers, screenshots em `docs/relatorios/evidencias/2026-05-22-TASK-046/` |
| E04 Construtibilidade | Testado em código | Validado visualmente no Projeto A — caso único | TASK-046: laterais retas (preservado de TASK-045B), aspersores ≤ 0,10 m do eixo, 0 blockers angulares |
| E05 BOM | Testado em código | Validado visualmente no Projeto A — caso único | TASK-046: BOM R$ 213.740,15, `conexoesFisicasSemSkuCount === 0`, kit 344/344 |
| E07 PDF | Testado em código | Validado visualmente no Projeto A — caso único | TASK-046: `POST /pdf → 200 OK` + download automático |

Nenhum épico foi promovido a "Validado em projeto histórico" (exigiria comparação com cálculo manual do RT), "Validado em piloto interno" ou "Homologado Brasmáquinas". E03, E06, E08 e E09 mantêm o status da TASK-024C.

E09 permanece **Não iniciado formalmente em campo / parcial em validação interna** — a validação visual interna no Projeto A fictício é evidência preparatória, não substitui projeto histórico real, piloto interno nem revisão RT.

---

## 4. Anti-duplicação

Decisões editoriais para evitar que a nova Seção 2 vire backlog duplicado, manual completo ou cópia da Seção 10/11:

| Estratégia | Como |
|---|---|
| Bullets curtos, sem parágrafos | Cada campo cabe em ≤ 5 bullets de uma linha. |
| Referência por ID, não por conteúdo | ADRs e premissas citadas por ID + 1 linha de hook (ex.: "ADR-013 — restrição DN homologado"). |
| Métricas apontam para relatório | Números reais aparecem no relatório (ex.: TASK-046); na Seção 2 ficam só os indicadores comparáveis. |
| Tasks vinculadas = só IDs | Lista plana `TASK-XXX, TASK-YYY` sem título, data, status, resumo. Backlog continua sendo a fonte canônica. |
| Status real cita evidência, não duplica | 1 linha de evidência aponta para relatório/ADR; auditoria detalhada vive na Seção 10. |

---

## 5. Renumeração das seções

Posicionar a nova Seção 2 logo após a visão geral (Seção 1) exigiu renumeração das Seções 2–11 anteriores:

| Antes | Depois | Conteúdo |
|---|---|---|
| 1 | 1 | Épicos do projeto (visão geral) |
| — | **2** | **Épicos como blocos de valor verificáveis** (nova — TASK-024E) |
| 2 | 3 | Tasks concluídas por épico |
| 3 | 4 | Tasks futuras por épico |
| 4 | 5 | Separação MVP |
| 5 | 6 | Critério objetivo de fim do MVP |
| 6 | 7 | Lista "não fazer agora" |
| 7 | 8 | Próximas 5 tasks recomendadas |
| 8 | 9 | Classificação operacional de tasks (TASK-024B) |
| 9 | 10 | Auditoria de conclusão dos épicos (TASK-024C) |
| 10 | 11 | Matriz de validação por épico (TASK-024D) |
| 11 | 12 | Rastreabilidade |

Sub-seções `8.1..8.4` (Classificação) → `9.1..9.4`; sub-seções `10.1..10.2` (Matriz) → `11.1..11.2`. Referências cruzadas internas ao Mapa Mestre atualizadas.

### Referências cruzadas externas

Apenas onde a referência aponta para o Mapa Mestre (não para conteúdo interno de outro documento):

- `tasks/backlog.md` — entrada da TASK-024B atualizada de "seção 8" para "seção 9".
- `tasks/TASK-024D-matriz-validacao-epicos-mvp.md` — rastreabilidade atualizada de "seção 10" para "seção 11".

**Não atualizados** (conteúdo histórico, por regra do briefing):

- `docs/relatorios/2026-05-21-TASK-024B.md` — descreve estado no momento da TASK-024B (seção 8 era correta então).
- `docs/relatorios/2026-05-21-TASK-024C.md` — idem (seção 9 era correta).
- `docs/relatorios/2026-05-21-TASK-024D.md` — idem (seção 10 era correta).

---

## 6. Arquivos alterados

| Arquivo | Tipo | O que mudou |
|---|---|---|
| `tasks/TASK-024-mapa-mestre-tasks.md` | modificado | Nova Seção 2 (~490 linhas) + renumeração das Seções 2..11 → 3..12 + sub-seções 8.x → 9.x e 10.x → 11.x; Seção 12 ganhou referência ao relatório TASK-024E |
| `tasks/TASK-024E-padronizar-epicos-blocos-valor-verificaveis.md` | criado | Este arquivo |
| `docs/relatorios/2026-05-22-TASK-024E.md` | criado | Relatório de fechamento |
| `tasks/backlog.md` | modificado | Entrada TASK-024E concluída + ajuste de ref "seção 8 → 9" na entrada da TASK-024B |
| `tasks/TASK-024D-matriz-validacao-epicos-mvp.md` | modificado | Ajuste de ref "seção 10 → 11" na rastreabilidade |

---

## 7. Critérios de aceite verificados

- [x] Nova Seção 2 do Mapa Mestre com 9 sub-seções (E01..E09), cada uma contendo os 11 campos exigidos
- [x] Cada bloco "Decisões" subdivide-se em 4 categorias nomeadas (Regra técnica / Boa prática / Decisão de engenharia / Decisão comercial), com "—" onde não há decisão
- [x] Status real de cada épico cita exatamente um nível da escala de 7 níveis da TASK-024D + 1 linha de evidência
- [x] Nenhuma promoção de status sem base em relatório existente (TASK-046 é a única base de promoção, e apenas para E02/E04/E05/E07 como "Validado visualmente no Projeto A — caso único")
- [x] E09 permanece "Não iniciado formalmente em campo / parcial em validação interna"
- [x] "Tasks vinculadas" usa apenas IDs em duas listas; nenhum título/data/resumo repetido
- [x] Renumeração interna do Mapa Mestre íntegra (Seções 1..12 contínuas)
- [x] Referências cruzadas externas ajustadas onde apontam para o Mapa Mestre (`backlog.md`, `TASK-024D-...md`)
- [x] Relatórios históricos preservados (`2026-05-21-TASK-024B/C/D.md`)
- [x] Nenhum arquivo em `src/`, catálogo, PDF, mapa UI alterado
- [x] Nenhum ADR criado; nenhuma premissa técnica alterada
- [x] `tasks/backlog.md` ganha entrada TASK-024E sem alterar nenhuma outra entrada
- [x] `docs/relatorios/2026-05-22-TASK-024E.md` criado
- [x] Estado preservado: 817/817 testes (informado pelo usuário) · 0 erros tsc (informado pelo usuário) · `src/` intacto

---

## 8. Rastreabilidade

- Mapa Mestre: `tasks/TASK-024-mapa-mestre-tasks.md` (Seção 2 — nova)
- Relatório: `docs/relatorios/2026-05-22-TASK-024E.md`
- Backlog: `tasks/backlog.md`
- Auditoria predecessora: `tasks/TASK-024C-auditoria-conclusao-epicos-mvp.md`
- Matriz predecessora: `tasks/TASK-024D-matriz-validacao-epicos-mvp.md`
- Premissas (referenciadas, não alteradas): `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`
- ADRs (referenciadas, não alteradas): `docs/decisoes/ADR-001..015`
- Evidência principal de promoções de status: `docs/relatorios/2026-05-22-TASK-046.md`
