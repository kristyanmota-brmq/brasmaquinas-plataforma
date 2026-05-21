# TASK-013 — Auditar e corrigir laterais físicas construtíveis

**Status:** concluída
**Concluída em:** 2026-05-20 · 629/629 testes · 0 erros tsc
**Prioridade:** P1-crítico
**Área:** layout / construtibilidade / diagnósticos
**Criada em:** 2026-05-20

---

## Objetivo

Auditar a cadeia `aspersores → PhysicalColumn → lateral física` e garantir que toda
conexão, dobra ou junção da rede usa apenas ângulos construtíveis:

- **180°** — trecho reto / luva
- **90°**  — curva 90° ou tê 90°
- **45°**  — curva 45°

Qualquer ângulo fora do padrão gera **blocker** de construtibilidade que impede a emissão
da proposta técnica. Sem roteamento corretivo nesta task — apenas detectar e bloquear.

---

## Problemas corrigidos

### P1 — startLngLat / endLngLat usavam xRep (X médio)

`generatePhysicalColumns()` construía `startLngLat`/`endLngLat` a partir do X médio da
coluna (`xRep`), não da posição real do primeiro/último aspersor. Offset de até 6 m.

**Correção:** usar `positions[seg[0].origIdx]` e `positions[seg[n-1].origIdx]`.

### P2 — Nenhum diagnóstico de ângulo de junção existia

O sistema não verificava se as conexões entre ramais, laterais, principal e adutora usavam
ângulos construtíveis. Principal manual com dobras não-padrão passava sem alerta.

**Correção:** `detectNetworkAngleIssues()` em `network-angle-diagnostics.ts`.

---

## Escopo desta task

### O que é verificado

| Elemento | O que é checado |
|----------|-----------------|
| Principal | Dobras entre segmentos consecutivos |
| Adutora | ~~Junção adutora → principal~~ — removida: invariante I4 garante conexão de extremidade, não T-junction |
| Ramal/secundária → principal | Ângulo de derivação |
| Ramal/secundária → lateral | Ângulo de chegada na lateral |
| Lateral física | Rota entre primeiro e último aspersor (straight-line — sem micro-variações por ruído geodésico) |

### O que NÃO é verificado nesta task

- `OperationalSegment`: são sub-trechos de laterais retas — avaliados indiretamente pela lateral física.
- `ControlPoint` (section_valve): pontos sobre a lateral reta — ângulo na lateral é 180° por construção.
- Roteamento corretivo automático: fora do escopo — tarefa futura.

---

## Critérios de aceite

- [x] `col.startLngLat === positions[col.sprinklerIndices[0]]` em todos os casos
- [x] `col.endLngLat === positions[col.sprinklerIndices[last]]` em todos os casos
- [x] `detectNetworkAngleIssues` retorna `hasBlockers: false` para rede auto-gerada padrão
- [x] Principal manual com dobra 60° → blocker `elementType: "principal"`
- [x] Ramal com junção não-padrão → blocker `elementType: "secondary"`
- [x] `ProposalDiagnostics.blockers` inclui mensagem de ângulo inválido
- [x] Rota de PDF bloqueada (HTTP 422) quando há blocker ativo (via gate pré-existente)
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → 629/629 ≥ 609 ✓

---

## Regras preservadas

- Catálogo imutável
- Solver hidráulico não alterado
- Setorização não alterada
- BOM de materiais não alterada
- PDF não alterado
- Motor A/B/C não alterado
- Nenhuma mudança de renderização ou CSS

---

## Decisões

| Decisão | Alternativa descartada | Motivo |
|---------|------------------------|--------|
| severity sempre "blocker" | warning | Ângulo não-padrão é constraint físico, não preferência. Confirmado pelo usuário. |
| Lateral verificada como reta entre extremos | Verificar cada aspersor como vértice | Aspersores em coluna são colíneos por construção; micro-variações são ruído geodésico, não dobras reais |
| OperationalSegment não verificado diretamente | Adicionar verificação | São sub-trechos de laterais retas; avaliados indiretamente |
| Tolerância ±5° — PREMISSA_PROVISORIA_ENGENHARIA | ±0° (exato) | Coordenadas geodésicas têm precisão finita; ±5° é conservador |

---

## Arquivos criados

- `src/lib/layout/network-angle-diagnostics.ts`
- `src/lib/layout/__tests__/network-angle-diagnostics.test.ts`
- `src/lib/layout/__tests__/physical-column-audit.test.ts`
- `tasks/TASK-013-laterais-fisicas-construtiveis.md` (este arquivo)

## Arquivos modificados

- `src/lib/layout/laterais.ts` — correção P1
- `src/lib/layout/irrigation-project.ts` — integração do diagnóstico
- `src/lib/bom.ts` — surface blockers angulares em ProposalDiagnostics
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — tolerância angular

## Arquivos não alterados

- `src/lib/catalog/aspersores.ts`
- `src/lib/layout/sectorization.ts`
- `src/lib/layout/hydraulic-sizing.ts`
- `src/lib/layout/sprinkler-grid*.ts`
- `src/app/projetos/` (PDF, route, actions)
- `src/components/map/ProjectMap.tsx`
