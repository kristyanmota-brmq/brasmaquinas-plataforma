# TASK-021 — Transformar tela de projeto em workspace full-screen com painel lateral

**Status:** `concluída`
**Prioridade:** `P2-importante`
**Área:** `ui / ux / layout`
**Criado em:** 2026-05-20
**Concluída em:** 2026-05-21 · 686/686 testes · 0 erros tsc

---

## Objetivo

Transformar a tela de detalhe do projeto em um workspace técnico maximizando o mapa:
- Mapa ocupando `calc(100vh - 64px)` — toda a área abaixo do header
- Painel lateral direito de 360px fixo com scroll próprio (desktop)
- Blockers e warnings do projeto visíveis no topo do sidebar ao carregar (derivados de `projectResult.diagnostics` — sem precisar clicar PDF)
- Overlay de blocker removido da área do mapa
- Responsivo: sidebar como drawer em telas < 768px
- Info do projeto (breadcrumb, nome, status) movida para o topo do sidebar

---

## Contexto

### Estado atual (pré-TASK-021)

**`src/app/projetos/[id]/page.tsx`** (80 linhas):
- Renderiza `<Header />` (64px, sticky) + breadcrumb + título + status badge + `<ProjectMap />`
- Wrapper: `div.max-w-7xl.mx-auto.px-6.py-8` — desperdiça ~156px de viewport vertical
- O bloco de título (breadcrumb + h1 + status) ocupa ~80px adicionais
- Resultado: o mapa fica restrito a `calc(100vh - 220px)` em vez de `calc(100vh - 64px)`

**`src/components/map/ProjectMap.tsx`** (2867 linhas):
- Container (linha 1000): `grid grid-cols-[1fr_360px] gap-0 h-[calc(100vh-220px)] min-h-[600px] border border-border rounded-md overflow-hidden bg-background`
- `<aside>` (linha 1714): `border-l border-border bg-surface p-6 overflow-y-auto` — sem seção de blockers
- Overlay de blocker (linhas 1548–1603): `absolute bottom-4 left-1/2 -translate-x-1/2` dentro do mapa — só aparece após clicar em "PDF" e receber HTTP 422
- `projectResult.diagnostics.blockers/.warnings` já são calculados reativamente (linha 204) mas **não são exibidos no sidebar**

**`src/components/brand/Header.tsx`**: `h-16` (64px), `sticky top-0 z-40`

---

## Respostas às 10 perguntas pré-implementação

### 1. Arquivo que controla a tela de detalhe

**`src/app/projetos/[id]/page.tsx`** (80 linhas).

Renderiza `<Header />` + `<Link href="/projetos">← Projetos</Link>` + `<h1>{project.name}</h1>` + status badge + `<ProjectMap />` dentro de `div.max-w-7xl.mx-auto.px-6.py-8`. É esse wrapper + bloco de título que forçam o offset de 220px no ProjectMap.

### 2. Componente que renderiza o mapa

**`src/components/map/ProjectMap.tsx`** (2867 linhas).

- **Container** (linha 1000): `grid grid-cols-[1fr_360px] gap-0 h-[calc(100vh-220px)] min-h-[600px] border border-border rounded-md overflow-hidden bg-background`
- **Div do mapa** (linha 1001): `<div className="relative">` → `<Map ref={mapRef}>` com `style={{ width: "100%", height: "100%" }}`
- **Toolbar** (linha 1470): `absolute top-4 left-4` — botões de modo
- **Legenda** (linha 1688): `absolute bottom-4 left-4`
- **NavigationControl** (linha 1027): `position="bottom-right"`

### 3. Componente que renderiza o painel lateral

**Mesmo arquivo:** `<aside>` em linhas 1714–2610 do `ProjectMap.tsx`.

`className="border-l border-border bg-surface p-6 overflow-y-auto"`. Contém: título "Layout do projeto", `SidebarItem` para Área/Captação/Bomba/Aspersores/Setorização/Tubulação/Diagnósticos. Sem seção de blockers — warnings são inline como `text-ink-4`.

### 4. Onde o blocker é renderizado hoje

**Overlay absoluto no mapa** (linhas 1548–1603):

```
absolute bottom-4 left-1/2 -translate-x-1/2
bg-white border border-red-300 rounded-md shadow-lg
p-3 max-w-lg w-max max-h-[70vh] overflow-y-auto
```

Triggered pelo estado `pdfError` — **só aparece após clicar em "PDF"** e receber HTTP 422. Conteúdo: "Projeto bloqueado para emissão" + lista de blockers + até 3 segmentos hidráulicos inválidos. Problema: obstrui a área do mapa e o usuário só vê blockers depois de tentar o PDF.

`projectResult.diagnostics.blockers` e `.warnings` já são calculados reativamente (linha 204) mas não são exibidos.

### 5. Proposta de layout desktop full-screen

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (64px — sticky top-0 z-40)                         │
├───────────────────────────────┬─────────────────────────────┤
│                               │  ← Projetos   [RASCUNHO]  │
│                               │  Nome do projeto           │
│                               │  Cliente · Cidade/UF       │
│                               │  ─────────────────────── │
│         MAPA                  │  ▲ BLOCKERS (red-50/200)   │
│         full-width menos 360px│    · blocker 1             │
│         h = calc(100vh-64px) │    · blocker 2             │
│                               │  △ WARNINGS (amber-50/200) │
│                               │  ─────────────────────── │
│   toolbar ↗ (absolute top-4) │  LAYOUT DO PROJETO         │
│   legenda ↙ (absolute bot-4) │    Área · Captação         │
│   zoom ↘ (NavigationControl) │    Bomba · Aspersores      │
│                               │    [scroll próprio]        │
│                               │                           │
│                               │  [Limpar] [PDF]            │
└───────────────────────────────┴─────────────────────────────┘
  h = calc(100vh - 64px)          w = 360px fixo
```

Mudanças:
- `page.tsx`: remove wrapper + título inline; passa `statusLabel` prop
- Container: `h-[calc(100vh-64px)] grid grid-cols-[1fr_360px]` — sem `border`, sem `rounded-md`, sem `min-h`
- Sidebar: header com projeto info + blocker/warning section + "Layout do projeto" + itens + botões

### 6. Proposta responsiva

```
┌──────────────────────────┐
│ HEADER (64px)            │
├──────────────────────────┤
│                          │
│   MAPA full-width        │   grid-cols-1 em mobile
│                          │
│   toolbar ↗              │
│   [Layout] ←── toggle   │   botão md:hidden, acima da legenda
│   legenda ↙  zoom ↘     │
└──────────────────────────┘
     ← overlay bg-black/30 →
┌──────────────────────────┐
│  SIDEBAR (drawer, 60vh)  │   fixed bottom-0, z-40
│  blockers / warnings     │
│  Layout itens · scroll   │
└──────────────────────────┘
```

- Estado: `const [sidebarOpen, setSidebarOpen] = useState(false)`
- Container: `grid-cols-1 md:grid-cols-[1fr_360px]`
- `<aside>`: mobile = `fixed bottom-0 left-0 right-0 z-40 h-[60vh]` com `translate-y-full` quando fechado → `translate-y-0` quando aberto; desktop = `md:static md:h-auto md:translate-y-0`
- Overlay: `fixed inset-0 bg-black/30 z-30 md:hidden` quando `sidebarOpen`
- Toggle button: `absolute bottom-16 left-4 z-10 md:hidden`

### 7. Arquivos que serão alterados

| Arquivo | Tipo | O que muda |
|---------|------|-----------|
| `src/app/projetos/[id]/page.tsx` | modificação | Remove wrapper `max-w-7xl`, breadcrumb, título; passa `statusLabel`; `<main>` sem padding |
| `src/components/map/ProjectMap.tsx` | modificação | Container height/grid; props + `statusLabel`; sidebar header projeto; blocker/warning section; remove overlay `pdfError`; mobile drawer |

**Nenhum arquivo novo será criado.** A seção de blockers é inline no sidebar.

**Arquivos NÃO alterados:**
- `src/lib/` — zero alterações de domínio
- `src/app/projetos/[id]/actions.ts` — intocado
- `src/app/api/pdf/` — intocado
- `src/components/map/MemorialPanel.tsx`, `MapSearchControl.tsx` — intocados
- `src/components/brand/Header.tsx` — intocado

### 8. Validação visual obrigatória

**Desktop (≥ 768px):**
- [ ] Mapa ocupa toda a viewport menos 64px do header e 360px do sidebar
- [ ] Sem borda/card ao redor do mapa
- [ ] Sidebar com scroll interno, não reduz o mapa
- [ ] Blocker section visível no topo do sidebar ao carregar com blocker ativo (sem precisar clicar PDF)
- [ ] Warning section (âmbar) quando só warnings
- [ ] Nenhuma seção quando sem blockers/warnings
- [ ] Toolbar (top-left), legenda (bottom-left), zoom (bottom-right) visíveis
- [ ] Breadcrumb "← Projetos" funcional no topo do sidebar
- [ ] Nome + status badge no topo do sidebar

**Mobile (< 768px):**
- [ ] Mapa full-width, sem sidebar fixo
- [ ] Botão "Layout" flutuante visível acima da legenda
- [ ] Drawer abre ao clicar (60vh, de baixo)
- [ ] Overlay semi-translúcido; clique fora fecha
- [ ] Blocker section legível dentro do drawer

**Regressão:**
- [ ] Toolbar funcional (navegar, localizar, área, captação, tubulação, memorial, PDF)
- [ ] Layers do mapa (área, aspersores, laterais, ramais, principal, adutora) corretos
- [ ] Drawing (polygon, pipeline) sem regressão
- [ ] Botão PDF ainda dispara request; `pdfError.invalidHydraulicSegments` aparecem em sidebar

### 9. Riscos

| Risco | Prob | Impacto | Mitigação |
|-------|------|---------|-----------|
| Drawer iOS Safari: `fixed + bottom-0 + h-[60vh]` pode colidir com safe-area da barra de endereços | média | médio | Usar `pb-[env(safe-area-inset-bottom)]` ou padding extra no drawer |
| Z-index conflict: toolbar (z-10) vs overlay drawer (z-30) vs aside (z-40) vs header (z-40) | baixa | médio | Stack explícito definido; header e aside mesma camada mas não se sobrepõem |
| `pdfError.kind === "technical"`: erro inesperado perde overlay visível | baixa | baixo | Mantém toast inline mínimo no sidebar abaixo dos botões |
| `h-[calc(100vh-64px)]`: se Header mudar altura, cálculo quebra | baixa | baixo | Comentar dependência no código; baixo risco a curto prazo |
| Sidebar 360px + mapa em tablet 768px: mapa fica com ~408px — apertado | baixa | baixo | Funcional; alternativa futura: sidebar colapsável |

### 10. O que não será feito

- ✗ Não alterar solver (`calculateIrrigationProject`, `hydraulic-sizing`, etc.)
- ✗ Não alterar BOM (`buildBOM`, `generateProposalDiagnostics`)
- ✗ Não alterar catálogo (`aspersores.ts`)
- ✗ Não alterar regras de blocker (severidade, tolerâncias)
- ✗ Não alterar rota de PDF (`/api/pdf`, gate HTTP 422)
- ✗ Não alterar motor de layout (`sprinkler-grid-optimizer`)
- ✗ Não alterar dados do mapa (GeoJSON layers, Mapbox sources)
- ✗ Não criar testes unitários (task é UX pura, sem business logic nova)
- ✗ Não animações CSS complexas (apenas `transition-transform` no drawer)
- ✗ Não refatorar `ProjectMap.tsx` além do escopo de layout/sidebar

---

## Fora do escopo

- Animação avançada de drawer (spring physics, drag-to-dismiss)
- Dark mode
- Sidebar colapsável/redimensionável
- Analytics/tracking
- Suporte a IE11

---

## Plano de implementação

### Passo 1 — `page.tsx`

Remover wrapper `max-w-7xl mx-auto px-6 py-8` e bloco de título/breadcrumb/status. Passar `statusLabel` como nova prop. `<main>` simplificado sem padding.

### Passo 2 — `ProjectMap.tsx` — Props e estado

Adicionar `statusLabel?: string` à interface `Props`. Adicionar `const [sidebarOpen, setSidebarOpen] = useState(false)`.

### Passo 3 — `ProjectMap.tsx` — Container

Linha 1000:
- De: `grid grid-cols-[1fr_360px] gap-0 h-[calc(100vh-220px)] min-h-[600px] border border-border rounded-md overflow-hidden bg-background`
- Para: `relative grid grid-cols-1 md:grid-cols-[1fr_360px] h-[calc(100vh-64px)] bg-background overflow-hidden`

### Passo 4 — `ProjectMap.tsx` — Remover overlay pdfError do mapa

Remover bloco `{pdfError && <div className="absolute bottom-4 left-1/2 ...">...</div>}` (linhas 1548–1603).

### Passo 5 — `ProjectMap.tsx` — Botão drawer toggle

Adicionar botão flutuante `md:hidden` dentro da div do mapa (acima da legenda):

```jsx
<button
  className="absolute bottom-16 left-4 z-10 md:hidden bg-white/95 backdrop-blur-sm border border-border rounded-md shadow-md px-3 py-1.5 text-xs text-ink flex items-center gap-1.5"
  onClick={() => setSidebarOpen(v => !v)}
>
  <Spline className="w-3.5 h-3.5" />
  Layout
</button>
```

### Passo 6 — `ProjectMap.tsx` — Aside (sidebar)

Atualizar `<aside>` className para mobile drawer + desktop estático. Adicionar antes do h3 "Layout do projeto":

1. **Projeto header**: breadcrumb `← Projetos` (Link), nome do projeto (`projectName`), `statusLabel` badge, cliente/cidade
2. **Blocker section**: `{projectResult.diagnostics?.blockers.length ? <div className="bg-red-50 border border-red-200 ...">` com lista + pdfError.invalidHydraulicSegments se existente
3. **Warning section**: `{projectResult.diagnostics?.warnings.length ? <div className="bg-amber-50 ...">` com lista

### Passo 7 — `ProjectMap.tsx` — Mobile overlay

Adicionar antes de `</aside>` (na verdade, fora do aside mas dentro do container):

```jsx
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-30 md:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
```

### Passo 8 — Verificação

```bash
npx tsc --noEmit   # → 0 erros
npx vitest run     # → 686/686
```

Então validação visual no browser (item 8).

---

## Critérios de aceite

- [ ] Mapa ocupa `calc(100vh - 64px)` sem card/border ao redor
- [ ] Sidebar fixo 360px com scroll próprio, não comprime o mapa
- [ ] Blockers de `projectResult.diagnostics` visíveis no sidebar ao carregar (sem precisar clicar PDF)
- [ ] Overlay de blocker removido da área do mapa
- [ ] Breadcrumb + nome do projeto + status badge no topo do sidebar
- [ ] Drawer funcional em mobile (< 768px) com overlay e botão toggle
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → 686/686

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Haiku 4.5 | Versão inicial — exploração e respostas às 10 perguntas |
| 2026-05-20 | Claude Sonnet 4.6 | Reescrita completa — leitura direta do código-fonte, plano de 8 passos, riscos, critérios de aceite |
| 2026-05-21 | Claude Sonnet 4.6 | Implementação concluída — `page.tsx` + `ProjectMap.tsx`; 0 erros tsc; 686/686 testes; validação visual confirmada |
