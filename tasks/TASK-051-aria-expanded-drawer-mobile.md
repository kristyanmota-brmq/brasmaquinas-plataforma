# TASK-051 — Adicionar aria-expanded ao toggle do drawer mobile

**Status:** `concluída`
**Prioridade:** P3-melhoria (acessibilidade)
**Classe:** D — correção pequena / acessibilidade / UI
**Área:** ui / mapa / acessibilidade
**Arquivo:** `tasks/TASK-051-aria-expanded-drawer-mobile.md`
**Concluída em:** 2026-05-22 · 826/826 testes preservados · 0 erros tsc · `src/lib/**` intocado · escopo ≤ 6 linhas em `src/`

> Resolve o **achado H1 da TASK-048**: toggle do drawer mobile sem `aria-expanded`. Correção pura de acessibilidade. Sem lógica de domínio nova. Sem dependências novas.

---

## Causa-raiz

`src/components/map/ProjectMap.tsx` linha 1640-1647: o botão de toggle do drawer mobile expunha apenas `aria-label="Abrir painel de layout do projeto"` (estático), sem comunicar via ARIA o estado aberto/fechado ao leitor de tela. Identificado e documentado como achado H1 na TASK-048.

## Solução aplicada

Edição cirúrgica em `src/components/map/ProjectMap.tsx`:

1. **Botão toggle** (linha 1640-1647) — 3 atributos ARIA adicionados:
   ```tsx
   aria-expanded={sidebarOpen}
   aria-controls="project-layout-drawer"
   aria-label={sidebarOpen ? "Fechar painel de layout do projeto" : "Abrir painel de layout do projeto"}
   ```

2. **`<aside>`** (linha 1687) — `id` estável para `aria-controls` apontar:
   ```tsx
   id="project-layout-drawer"
   ```

Total: ~5 linhas alteradas em `src/`. Estado `sidebarOpen` já existia (linha 161), nenhum estado novo introduzido.

## Validação Playwright (mini sessão, viewport 375×812)

| Verificação | Valor esperado | Valor observado | Status |
|---|---|---|---|
| Botão toggle existe | true | true | ✅ |
| Drawer `#project-layout-drawer` existe no DOM | true (tag `ASIDE`) | true (`ASIDE`) | ✅ |
| `aria-expanded` inicial | `"false"` | `"false"` | ✅ |
| `aria-controls` | `"project-layout-drawer"` | `"project-layout-drawer"` | ✅ |
| `aria-label` inicial | `"Abrir painel de layout do projeto"` | idem | ✅ |
| Pós-click: `aria-expanded` | `"true"` | `"true"` | ✅ |
| Pós-click: `aria-label` | `"Fechar painel de layout do projeto"` | idem | ✅ |
| Pós-click: `aria-controls` | preservado | preservado | ✅ |

Evidências em `docs/relatorios/evidencias/2026-05-22-TASK-051/`:
- `task-051-01-drawer-fechado-aria-expanded-false.png`
- `task-051-02-drawer-aberto-aria-expanded-true.png`

## Critérios de aceite verificados

- [x] `aria-expanded` no toggle alterna entre `"false"` (inicial) e `"true"` (pós-click)
- [x] `aria-controls="project-layout-drawer"` presente
- [x] `id="project-layout-drawer"` no `<aside>`
- [x] `aria-label` dinâmico baseado em `sidebarOpen`
- [x] Validação Playwright completada (V1-V5 + screenshots)
- [x] `npx tsc --noEmit` → **0 erros**
- [x] `npx vitest run` → **826/826 passando** (preservado; sem regressão)
- [x] Nenhuma lógica de domínio adicionada (regra `CLAUDE.md`)
- [x] Nenhum arquivo em `src/lib/**`, catálogo, BOM, PDF, Mapbox/canvas, layers alterado
- [x] Escopo ≤ 20 linhas em `src/` (real: ~5 linhas) — critério Classe D
- [x] Sem dependência npm nova

## Escopo permitido (efetivo)

- `src/components/map/ProjectMap.tsx` — apenas toggle + aside (3 atributos no botão + 1 id no aside).
- `tasks/TASK-051-aria-expanded-drawer-mobile.md` — este arquivo.
- `docs/relatorios/2026-05-22-TASK-051.md` — relatório de fechamento.
- `docs/relatorios/evidencias/2026-05-22-TASK-051/` — 2 PNGs Playwright.
- `tasks/backlog.md` — entrada formal + remoção da bullet de "Próximas tarefas sugeridas".
- `tasks/TASK-024-mapa-mestre-tasks.md` — hunk específico marcando H1 resolvido por TASK-051.

## Escopo proibido (respeitado)

- `src/lib/**` (motor hidráulico, layout, catálogo, BOM, PDF) — **não tocado**.
- `src/app/**`, route handlers — **não tocados**.
- Mapbox / canvas / layers em `ProjectMap.tsx` — **não tocados**.
- Refatoração ampla — **não realizada**.
- Dependências novas — **nenhuma instalada**.
- ADRs, premissas técnicas, `docs/metodologia/01-regras-bloqueantes.md` — **não tocados**.
- `package.json`, `prisma/**` — **não tocados**.
- Histórico H1 da TASK-048 — **preservado** (não apagado).

## Rastreabilidade do H1

- **Origem do H1:** `docs/relatorios/2026-05-22-TASK-048.md` (Achado H1 — toggle sem `aria-expanded`).
- **Resolvido por:** TASK-051 (este arquivo).
- **No Mapa Mestre:** Seção 2 (E06 bloco de valor → Riscos) e Seção 4 (E06 futuras) atualizadas marcando H1 como ✅ resolvido pela TASK-051; **menção a H1 preservada como rastro histórico** (não removida).

## Próximos passos sugeridos (não criados)

- Auditoria geral de a11y do projeto (Classe B/E, fora desta task).
- TASK-001 — Diagnóstico formal do software atual (bloqueante de E08).
- TOOL-003 — Capturar `response.usage` real (sugerido em TOOL-002).
- Comparação com projeto histórico real (habilita promoções acima de "caso único" em vários épicos).
