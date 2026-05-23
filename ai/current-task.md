---
task_id: TASK-053
arquivo_task: tasks/TASK-053-sub-coletor-por-setor.md
classe: A
data_abertura: 2026-05-22
status: aguardando_fechamento
ultima_atualizacao: 2026-05-23T15:35:00-03:00
atualizado_por: comando:/implementar
---

# TASK-053 — Espinha de peixe SEMPRE sub-coletor + fieldSideSign via centroid (v12)

## Histórico de versões

| Versão | Geometria/topologia | Resultado |
|---|---|---|
| v1 | Espigão "dente" 3 pontos | Reprovado GPT (deflexão 180°) |
| v2 | Sub-coletor stair-step + alterar `bom.ts` + ADR-016 + `constructability.ts` | Reprovado terminal (INV-LAYOUT-INSTAVEL-COMERCIAL violada) |
| v3 | Sub-coletor stair-step sem BOM | Aprovado_com_ajustes; implementado mas FALHOU VISUALMENTE em grid rotacionado 59° (ordena por LngLat) |
| v4 | Espinha "T deitado" como polilinha única | Reprovado GPT (geometria ambígua, ownership sobreposta, vazão subespecificada) |
| v5 | Espinha 3 entidades lineares no frame rotacionado | Reprovado GPT (sizeAllSecondaries omite kind===undefined; angular não-kind-aware) |
| v6 | Espinha 3 entidades + paths kind-aware no frame rotacionado | Aprovado + IMPLEMENTADO + REPROVADO VISUAL em Projeto A (degenerescência) |
| v7 | Espinha orientada pela direção REAL da principal | Aprovado + IMPLEMENTADO + REPROVADO ARQUITETURAL (topologia invertida; deveria ser ⊥ laterais) |
| v8 | Voltar v6 arch + heurística X-vs-Y | Reprovado GPT (heurística inverte topologia em caso degenerado) |
| v9 | Diagnóstico-only (Caminho 3) | Aprovado_com_ajustes; causa raiz identificada: probe coincide com principal |
| v10 | Cohorts (rentes/afastados) | Reprovado GPT (mediana de gaps com zeros = 0 → fallback indesejado) |
| v11 | Sempre sub-coletor + spineYLocal midpoint formula + MIN_HEADLAND_M | Reprovado GPT (Math.sign(0)===0 colapsa fallback; gate ambíguo) |
| **v12 (corrente)** | **Delta sobre v11**: fieldSideSign via centroid (independente do range dos inlets) + gate explícito throw para operationalSegments sem gridAngleDegrees | Aprovado_com_ajustes via OVERRIDE (Caminho 2); 2 compromissos endereçados nesta implementação |

## Objetivo (v12)

Implementar topologia "**sempre sub-coletor**" — TODA lateral conecta via `rib` → `spine` → `spine_entry` → `principal`. Nenhuma conexão direta lateral→principal quando `operationalSegments` é fornecido. Espinha SEMPRE perpendicular aos laterais (eixo X do frame rotacionado por `gridAngleDegrees`).

**Topologia das 3 entidades:**

1. **1 `kind: "spine"`** — sub-coletor paralelo ao eixo X do frame rotacionado por `gridAngleDegrees` (= perpendicular aos laterais que correm em Y local), posicionado no headland entre principal e fileira de inlets. `physicalColumnIds: []` (estrutural).
2. **1 `kind: "spine_entry"`** — segmento perpendicular conectando principal ao spine. `physicalColumnIds: []` (estrutural).
3. **N `kind: "rib"`** — segmentos perpendiculares ao spine, 1 por coluna física, conectando spine ao inlet da coluna. Direção naturalmente paralela aos laterais (deflexão 0° na junção rib↔lateral = luva). `physicalColumnIds: [colId]`.

## Decisões de engenharia (v12)

| # | Decisão |
|---|---|
| 1 | **Espinha sempre presente** quando `operationalSegments` é fornecido — TODA lateral via rib (regra RT absoluta: "nenhuma lateral conecta diretamente à principal") |
| 2 | **Spine perpendicular aos laterais** = paralelo ao eixo X do frame rotacionado por `gridAngleDegrees` |
| 3 | **`spineYLocal = (principalYLocal + farthestInletYLocal) / 2`** — midpoint entre principal e inlet mais distante; em Projeto A setor 0 (3 rentes + 2 afastados): spineY = (-176.39 + -164.39)/2 = -170.39 → ribs todos com lengthM = 6m |
| 4 | **`fieldSideSign` via centroid** (v12 fix MET-053-V11-01) — `Math.sign(centroidLocal[1] - principalYLocal)`; fallback hardcode `+1` se ainda zero (caso degenerado extremo onde centroid coincide com principal) |
| 5 | **`MIN_HEADLAND_M = 3.0 m`** — fallback offset se `\|spineYLocal − principalYLocal\| < MIN_HEADLAND_M`: força `spineYLocal = principalYLocal + fieldSideSign × MIN_HEADLAND_M` |
| 6 | **Gate explícito throw** (v12 fix TECH-053-V11-02) — `if (operationalSegments && !gridAngleDegrees) throw Error(...)` |
| 7 | **`cols.length === 1`** → espinha degenerada (1 spine com lengthM=0 + 1 spine_entry + 1 rib) — topologicamente válida |
| 8 | **`kind: undefined` legacy** preservado APENAS quando `generateSecondaries` é chamado SEM `operationalSegments` (retrocompatibilidade pura) |
| 9 | **Vazão em 2 passes (preservado de v6)** — Pass 1 ribs com max(coluna); Pass 2 spine + spine_entry com SUM(ribs do sectorId) |
| 10 | **3 paths kind-aware em `sizeAllSecondaries` (preservado de v6)** |
| 11 | **Branch kind-aware em `network-angle-diagnostics.ts` (preservado de v6)** — regra `[0°, 90°]` mantida estrita |
| 12 | **`src/lib/bom.ts` NÃO TOCADO** — TASK-054 |
| 13 | **`docs/decisoes/ADR-016`, `ADR-017`** — NÃO criados |
| 14 | **`constructability.ts` NÃO TOCADO** — section_valve relocation para spine_entry DEFERIDA para TASK-053-valves sucessora |

## Compromissos do override v12 (GPT v12 reprovou; humano fez override Caminho 2)

- **MET-053-01** (commitment): atualização do body de `ai/current-task.md` para v12 **EXECUTADA NESTE DOCUMENTO** como primeiro passo do /implementar
- **TECH-053-01** (commitment): blocker `spine_entry→principal` permanece ATIVO ao fechar TASK-053 (geométrico inevitável com regra `[0°, 90°]` estrita). Fechamento técnico (tsc 0 + vitest passing + validação visual) **NÃO é fechamento comercial**. Emissão de proposta comercial bloqueada por default até decisão RT explícita registrada em decision-log (override técnico OU aguardar TASK-053-valves para mitigar via section_valve no spine_entry)

## Status TOOL-003

```
em_implementacao (concluído)
    ↓
aguardando_fechamento (CORRENTE)
    ↓
[BLOQUEADO: descoberta arquitetural pendente — ver seção abaixo]
```

## ✅ FRAMEWORK ARQUITETURAL HOMOLOGADO PELO RT (2026-05-23)

O RT (Kristyan Mota) homologou framework de motor de otimização de layout que resolve a confusão arquitetural acumulada:

**Princípios fundamentais:**
1. **NÃO existe regra fixa universal** sobre orientação principal × laterais × sub-coletor
2. **Sequência obrigatória de design**: laterais 1º → sub-coletores 2º → principal 3º
3. **Laterais primeiro porque** carregam aspersores, devem ser retas, fáceis de marcar/montar, manter aspersores sobre o eixo
4. **Sub-coletores** normalmente perpendiculares aos laterais (tendência, não regra)
5. **Principal**: orientação é DECISÃO DE ENGENHARIA por comparação, não regra fixa
6. **Critério de posicionamento**: menor BOM tecnicamente válida e operacionalmente executável
7. **Restrições duras**: pressão mínima, perda máxima, velocidade máxima, DN homologado, setorização, construtibilidade, manutenção, operação agrícola, blockers existentes
8. **Função objetivo do motor**: minimizar custo total da BOM
9. **Padrão de comparação**: A0 (baseline) vs A2 (borda favorável) vs A3 (central) vs futuras (externa, bilateral, cabeçal único, subprincipais paralelas)
10. **Vencedor**: menor BOM válida e executável
11. **Fallback**: manter baseline OU bloquear com diagnóstico

**Classificação das decisões (importante para invariantes e revisão GPT):**

| Tipo | Conteúdo |
|---|---|
| **Regra técnica (invariante)** | Aspersores sobre laterais; hidráulica respeita P/HF/V; DN100 não volta como lateral 5022 |
| **Boa prática (tendência)** | Laterais retas/repetitivas; sub-coletores perpendiculares aos laterais; principal aproveita bordas/estradas/corredores |
| **Decisão de engenharia (comparação)** | Orientação da principal por comparação; menor BOM válida + executável |
| **Decisão comercial** | Reduzir BOM SIM, mas nunca ao custo de layout difícil, hidráulica inválida ou obra confusa |

**Documento completo no memory**: [project_motor_optimization_framework.md](../../.claude/projects/-Users-kristyanmota-Code-brasmaquinas-plataforma/memory/project_motor_optimization_framework.md)

## Implicação para TASK-053 v12

**v12 é UM candidato arquitetural válido (A0 baseline)** na taxonomia acima — não está errado, apenas não foi provado como menor BOM.

**Critério de fechamento revisado:**
- ✓ Hidráulica satisfeita (tsc 0 + vitest 870/870)
- ✓ Tooling satisfeito (27/27)
- ✓ Topologia técnica válida + documentada
- ⚠️ Construtibilidade angular: 11 blockers ATIVOS em rib→lateral (compromisso TECH-053-01 do override v12)
- ⚠️ Validação visual RT: pendente (não-bloqueante para fechamento técnico — emissão comercial bloqueada)
- ⚠️ Anomalia setor 1 (rib -37.5°): investigação opcional em sucessora

**v12 PODE FECHAR como A0 baseline técnico.** Emissão comercial permanece bloqueada via TECH-053-01 até decisão RT explícita.

## Próximas tasks sugeridas (sucessoras)

- **TASK-056** — Motor de comparação de arquiteturas (A0 vs A2 vs A3 vs ...) com função objetivo "menor BOM válida"
- **TASK-054** — Ajustar `src/lib/bom.ts` para topologia "sempre sub-coletor" (1 spine + 1 spine_entry + N ribs por setor)
- **TASK-053-valves** — Relocar `section_valve` para spine_entry (ADR-014 → nova arquitetura)
- **TASK-053-setor-1** (opcional) — Investigar rib em -37.5° anômalo no setor 1 do Projeto A

## Artefatos preservados

- [ai/decision-log.md](../ai/decision-log.md) — todas as ~12 entries do ciclo TASK-053 (v1..v12) com hashes
- [ai/claude-report.md](../ai/claude-report.md) — plano v12 completo
- [ai/gpt-review.md](../ai/gpt-review.md) — última revisão GPT (v12 reprovado por 2 blockers metodológicos; override Caminho 2 registrado)
- [scripts/diagnose/diagnose-espinha-projeto-a.mjs](../scripts/diagnose/diagnose-espinha-projeto-a.mjs) — diagnóstico v9 (v6 inline) preservado
- [scripts/diagnose/verify-v12-projeto-a.mjs](../scripts/diagnose/verify-v12-projeto-a.mjs) — verificação v12 production output em Projeto A
- Screenshots Playwright: `v12-validate-zoom.png`, `v12-detail.png`, `v12-projeto-a-final.png` na raiz do repo
