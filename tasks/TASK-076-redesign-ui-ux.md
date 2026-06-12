# TASK-076 — Redesign completo de UI/UX (padrão enterprise)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** B — UI / apresentação (zero domínio)
**Área:** ui
**Criado em:** 2026-06-12
**Atualizado em:** 2026-06-12
**Concluída em:** 2026-06-12 · **997/997 testes vitest** (preservados) · 0 erros tsc · `next build` limpo
**Relatório:** `docs/relatorios/2026-06-12-TASK-076.md`
**Evidências:** `docs/relatorios/evidencias/2026-06-12-TASK-076/` + verificação ao vivo em browser com sessão real
**Autorização:** ordem direta do usuário (2026-06-12): "Refaça toda a UI/UX. Somos a maior empresa de irrigação do Brasil. Quero um software à altura." — sob delegação RT permanente

---

## Objetivo

Elevar a camada de apresentação ao padrão enterprise da marca: design system com a identidade Brasmáquinas (verde-petróleo `#094641` como primária de ação, verde `#05A835` semântico, amarelo `#EFD03A` como acento), shell de navegação, todas as telas redesenhadas e o workspace re-estilizado — **sem nenhuma mudança de lógica de domínio**.

---

## Decisão central de design

A UI anterior usava preto-carbono como cor de ação (visual de template genérico) e reservava o verde institucional apenas ao logo. O redesign inverte: **a marca é a protagonista**. Como toda a UI já referenciava tokens (`brand`, `ink`, `surface`, `border`), a redefinição dos valores em `globals.css` re-tematizou o app inteiro de uma vez; os refinamentos por tela vieram em seguida.

---

## Arquivos impactados

| Arquivo | Mudança |
|---------|---------|
| `src/app/globals.css` | Design system: escala brand 50–950, acento, superfícies esverdeadas, shell escuro, elevações (card/raised/overlay), radii 0.5rem, focus ring, scrollbar técnica `.panel-scroll`, `.tabular` |
| `src/components/ui/primitives.tsx` | **novo** — Button/ButtonLink/Card/SectionLabel/StatCard/StatusBadge/EmptyState (apresentação pura) |
| `src/components/brand/Header.tsx` | Shell petróleo: nav Projetos/Novo, badge versão com ponto amarelo, UserButton |
| `src/components/brand/Logo.tsx` | Variante `dark` para fundos escuros |
| `src/app/page.tsx` | Landing institucional: hero 2 colunas, painel SVG da malha (manifold fishbone), 3 cards de capacidades, rodapé petróleo |
| `src/app/projetos/page.tsx` | Métricas (Total/Em andamento/Liberadas/Ganhas), tabela com avatar-iniciais e badges com ponto, empty state |
| `src/app/projetos/novo/page.tsx` | Form em Card com seção, microcopy, footer de ações |
| `src/app/layout.tsx` | Clerk appearance alinhado aos tokens |
| `src/components/map/ProjectMap.tsx` | **Somente apresentação**: toolbar elevada, botão PDF branded, banners de governança com ícone + borda de acento (mais proeminentes), aside branco com `panel-scroll`, header do projeto com status-pill da marca, ToolButton ativo em brand, SaveStatus pill, legenda elevada |
| `src/components/map/MemorialPanel.tsx`, `MapSearchControl.tsx` | Containers com elevação/radius novos |

---

## Critérios de aceite

- [x] Identidade da marca aplicada em 100% das telas
- [x] Gates de governança visualmente MAIS proeminentes (ícones ShieldAlert/AlertTriangle + borda de acento; semântica e textos intocados)
- [x] Mobile preservado (drawer E06 intocado estruturalmente; alvos ≥ 44px mantidos)
- [x] `npx tsc --noEmit` → 0 erros · `npx vitest run` → 997/997 · `next build` → limpo
- [x] Nenhuma lógica de domínio em UI; nenhum arquivo de `src/lib/**` tocado
- [x] Verificação visual ao vivo: landing + sign-in (Playwright) e lista + workspace Fazenda do Paulo (Chrome com sessão real)

---

## Fora do escopo

- Reescrita estrutural do ProjectMap (estado/handlers/Mapbox intocados)
- Dark mode (task futura), PDF (E07), mudanças de fluxo/rotas
