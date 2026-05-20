# TASK-006B — BOM automática de registro manual de seção

**Status:** `pendente`
**Prioridade:** P1-crítico (desbloqueia emissão de proposta com section_valve)
**Área:** bom / catálogo
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-19 (regra PN80 interna — 7 SKUs aprovados)
**Predecessor:** TASK-006A (concluída)

---

## 1. Contexto

A TASK-006A identificou candidatos e a Brasmáquinas estabeleceu a seguinte **regra de homologação interna**:

> Todos os registros manuais da marca **VIQUA** presentes na base interna (`Prod. Irrig. Convenc.xlsx` — `Base_Motor_Aprovada`) recebem automaticamente:
> - `classePressao: "PN80"`
> - `pressaoNominalMca: 80`
> - `fontePressao: "homologacao_interna_brasmaquinas"`

**Escopo da regra:** marca VIQUA · família registro manual soldável · cadastrado na base interna.  
**Fora do escopo:** válvula automática, válvula hidráulica, solenoide, piloto, ventosa, válvula de retenção, produtos não cadastrados.

Com essa regra, **7 SKUs VIQUA soldáveis DN≥32mm** satisfazem todos os critérios de aprovação (SKU real, descrição, diâmetro identificável, custo, preço, margem positiva, PN80 por homologação interna):

| SKU | Descrição | DN (mm) | Custo (R$) | Preço (R$) | Margem | Estoque | Prioridade BOM |
|-----|-----------|---------|-----------|-----------|--------|---------|---------------|
| 4209000 | REGISTRO PVC ESF.SOLD. AZUL 32MM - VIQUA | 32 | 10,82 | 18,10 | 40,2% | 73 | primário DN32 |
| 1000962 | REGISTRO PVC ESF.SOLD. PREDIALL 32MM - VIQUA | 32 | 5,33 | 20,10 | 73,5% | 0 | alternativa DN32 ¹ |
| 4208000 | REGISTRO PVC ESF.SOLD. AZUL 35MM - VIQUA | 35 | 13,97 | 24,20 | 42,3% | 107 | primário DN35 ² |
| 1002326 | REGISTRO PVC ESF.SOLD. AZUL 50MM - VIQUA | 50 | 14,58 | 24,96 | 41,6% | 369 | primário DN50 |
| 1003768 | REGISTRO PVC ESF.SOLD. MARRON 50MM - VIQUA | 50 | 22,83 | 48,50 | 52,9% | 0 | alternativa DN50 |
| 1001994 | REGISTRO PVC ESF.SOLD. AZUL 75MM - VIQUA | 75 | 84,70 | 135,30 | 37,4% | 65 | primário DN75 |
| 1002327 | REGISTRO PVC ESF.SOLD. AZUL 100MM - VIQUA | 100 | 240,51 | 404,50 | 40,5% | 19 | primário DN100 |

¹ Linha Prediall — validar aceitabilidade em irrigação agrícola antes de usar em campo.  
² DN35 — confirmar que esse diâmetro existe em `TUBOS_PVC_LF` antes de incluir na BOM.

A TASK-005 já conta `section_valve` em `BOMResult.meta.valvulasCount` e emite blocker enquanto `valvulasSemCatalogoCount > 0`. Esta tarefa resolve esse blocker para os diâmetros cobertos.

**Restrição crítica:** todos os SKUs acima destinam-se a **acionamento manual por operador**. Nenhum deve ser usado como válvula de controle automático. Se um `section_valve` exigir controle automático, um blocker específico deve permanecer ativo.

---

## 2. Objetivo

Incluir os 7 SKUs aprovados no catálogo e na BOM, selecionando o primário correto pelo diâmetro do ramal adjacente ao ponto de controle. Emitir warning de acionamento manual. Manter blocker residual para diâmetros sem SKU aprovado (ex.: DN40).

---

## 3. Escopo

### 3.1 O que fazer

1. **Catálogo** — adicionar `REGISTROS_SECAO_MANUAL` em `src/lib/catalog/aspersores.ts`:
   - Interface `RegistroSecao` com campos: `sku`, `descricao`, `marca`, `diametroNominalMm`, `classePressao`, `pressaoNominalMca`, `fontePressao`, `precoVenda`, `custo`, `unidade`, `tipoAcionamento`, `prioridade`
   - Array com os 7 SKUs aprovados (valores exatos da tabela acima)
   - Função `selectRegistroSecao(diametroMm: number): RegistroSecao | undefined` — retorna **somente o primário** para o DN; ignora alternativas

2. **BOM** — modificar `buildBOM` em `src/lib/bom.ts`:
   - Para cada `section_valve` CP, determinar `diametroMm` do ramal adjacente (ver seção 4)
   - Se `selectRegistroSecao(diametroMm)` retornar item → criar `BOMItem` com `precoUnitario` real, quantidade 1, descrição com sufixo `"(registro manual de seção)"`
   - Se não retornar item → manter na contagem `valvulasSemCatalogoCount`
   - `valvulasSemCatalogoCount` reflete somente válvulas sem SKU resolvido (não as já precificadas)

3. **Diagnósticos** — modificar `generateProposalDiagnostics` em `src/lib/bom.ts`:
   - **Warning de acionamento manual** quando ≥ 1 válvula foi resolvida (precificada): `"N registro(s) de seção manual incluídos na BOM. Confirmar acionamento presencial com equipe de campo antes da emissão."`
   - **Blocker de DN sem SKU** quando `valvulasSemCatalogoCount > 0`: `"N registro(s) de seção com diâmetro sem SKU aprovado no catálogo. Incluir manualmente ou aguardar homologação."`
   - O blocker genérico anterior `"N válvula(s) de seção necessárias sem SKU/preço no catálogo"` é removido quando `valvulasSemCatalogoCount = 0`

4. **Testes** — mínimo 8 testes em `src/lib/layout/__tests__/bom-registro-secao.test.ts`:
   - `selectRegistroSecao(32)` retorna SKU 4209000 (primário DN32)
   - `selectRegistroSecao(50)` retorna SKU 1002326 (primário DN50)
   - `selectRegistroSecao(75)` retorna SKU 1001994
   - `selectRegistroSecao(100)` retorna SKU 1002327
   - `selectRegistroSecao(40)` retorna `undefined` (DN40 sem SKU aprovado)
   - `buildBOM` com section_valve DN50 → item precificado + `valvulasSemCatalogoCount = 0`
   - `buildBOM` com section_valve DN40 → sem item precificado + `valvulasSemCatalogoCount = 1`
   - Warning de acionamento manual presente quando ≥ 1 válvula resolvida
   - Blocker de DN ausente quando `valvulasSemCatalogoCount > 0`
   - Sem blocker genérico quando `valvulasSemCatalogoCount = 0`
   - `tipoAcionamento = "manual"` em todos os itens de `REGISTROS_SECAO_MANUAL`
   - `fontePressao = "homologacao_interna_brasmaquinas"` em todos

### 3.2 O que não fazer

- Não usar `precoUnitario: 0` ou qualquer placeholder em item de BOM.
- Não marcar nenhum registro como adequado para controle automático.
- Não incluir alternativas (MARRON, PREDIALL) na lógica de `selectRegistroSecao` — primários apenas.
- Não inventar SKU, preço, custo, PN ou diâmetro além dos 7 homologados.
- Não adicionar SKU de outra marca sem homologação de RT.
- Não alterar solver hidráulico, layout, setorização, geometria ou motor A/B/C.
- Não alterar `ARQUITETURA_ATUAL.md`, `HANDOFF.md`, `AGENTS.md` ou `.claude/settings.local.json`.

---

## 4. Correlação section_valve ↔ diâmetro do tubo

O `ControlPoint` de tipo `section_valve` tem `physicalColumnId`. O diâmetro do ramal nessa coluna pode ser obtido de:

1. `sizedSecondaries` — buscar segmento com `physicalColumnId` correspondente; usar `diametroMm` do resultado.
2. Fallback: `physicalColumns[id].lateralPipeSku` → mapear SKU para diâmetro via catálogo de tubos.
3. Se nenhum dos dois disponível → diâmetro não identificado → manter como `valvulasSemCatalogoCount`.

`selectRegistroSecao` deve tolerar variações mínimas de diâmetro (±2mm) para cobrir imprecisões de cálculo.

---

## 5. Estrutura de dados proposta

```typescript
// src/lib/catalog/aspersores.ts

export interface RegistroSecao {
  sku: string;
  descricao: string;
  marca: string;
  diametroNominalMm: number;
  classePressao: "PN80";
  pressaoNominalMca: 80;
  fontePressao: "homologacao_interna_brasmaquinas";
  precoVenda: number;   // R$
  custo: number;        // R$
  unidade: "un";
  tipoAcionamento: "manual";
  prioridade: "primario" | "alternativa";
}

export const REGISTROS_SECAO_MANUAL: RegistroSecao[] = [
  // DN32 — primário
  {
    sku: "4209000",
    descricao: "REGISTRO PVC ESF.SOLD. AZUL 32MM - VIQUA",
    marca: "VIQUA",
    diametroNominalMm: 32,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    fontePressao: "homologacao_interna_brasmaquinas",
    precoVenda: 18.10,
    custo: 10.816,
    unidade: "un",
    tipoAcionamento: "manual",
    prioridade: "primario",
  },
  // DN32 — alternativa (Prediall; validar uso agrícola antes de aplicar em campo)
  {
    sku: "1000962",
    descricao: "REGISTRO PVC ESF.SOLD. PREDIALL 32MM - VIQUA",
    marca: "VIQUA",
    diametroNominalMm: 32,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    fontePressao: "homologacao_interna_brasmaquinas",
    precoVenda: 20.10,
    custo: 5.33,
    unidade: "un",
    tipoAcionamento: "manual",
    prioridade: "alternativa",
  },
  // DN35 — primário (confirmar existência de DN35 em TUBOS_PVC_LF antes de usar)
  {
    sku: "4208000",
    descricao: "REGISTRO PVC ESF.SOLD. AZUL 35MM - VIQUA",
    marca: "VIQUA",
    diametroNominalMm: 35,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    fontePressao: "homologacao_interna_brasmaquinas",
    precoVenda: 24.20,
    custo: 13.9748,
    unidade: "un",
    tipoAcionamento: "manual",
    prioridade: "primario",
  },
  // DN50 — primário
  {
    sku: "1002326",
    descricao: "REGISTRO PVC ESF.SOLD. AZUL 50MM - VIQUA",
    marca: "VIQUA",
    diametroNominalMm: 50,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    fontePressao: "homologacao_interna_brasmaquinas",
    precoVenda: 24.96,
    custo: 14.575,
    unidade: "un",
    tipoAcionamento: "manual",
    prioridade: "primario",
  },
  // DN50 — alternativa (sem estoque; usar apenas se AZUL indisponível)
  {
    sku: "1003768",
    descricao: "REGISTRO PVC ESF.SOLD. MARRON 50MM - VIQUA",
    marca: "VIQUA",
    diametroNominalMm: 50,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    fontePressao: "homologacao_interna_brasmaquinas",
    precoVenda: 48.50,
    custo: 22.83,
    unidade: "un",
    tipoAcionamento: "manual",
    prioridade: "alternativa",
  },
  // DN75 — primário
  {
    sku: "1001994",
    descricao: "REGISTRO PVC ESF.SOLD. AZUL 75MM - VIQUA",
    marca: "VIQUA",
    diametroNominalMm: 75,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    fontePressao: "homologacao_interna_brasmaquinas",
    precoVenda: 135.30,
    custo: 84.7046,
    unidade: "un",
    tipoAcionamento: "manual",
    prioridade: "primario",
  },
  // DN100 — primário
  {
    sku: "1002327",
    descricao: "REGISTRO PVC ESF.SOLD. AZUL 100MM - VIQUA",
    marca: "VIQUA",
    diametroNominalMm: 100,
    classePressao: "PN80",
    pressaoNominalMca: 80,
    fontePressao: "homologacao_interna_brasmaquinas",
    precoVenda: 404.50,
    custo: 240.514,
    unidade: "un",
    tipoAcionamento: "manual",
    prioridade: "primario",
  },
];

// Retorna somente o primário para o DN dado. Alternativas não entram na BOM automática.
export function selectRegistroSecao(diametroMm: number): RegistroSecao | undefined {
  return REGISTROS_SECAO_MANUAL.find(
    (r) => r.prioridade === "primario" && Math.abs(r.diametroNominalMm - diametroMm) <= 2,
  );
}
```

---

## 6. Critérios de aceite

- [ ] `REGISTROS_SECAO_MANUAL` com 7 entradas em `aspersores.ts` — SKUs, preços e custos exatamente conforme tabela da seção 1.
- [ ] `classePressao: "PN80"`, `pressaoNominalMca: 80`, `fontePressao: "homologacao_interna_brasmaquinas"` em todos os 7.
- [ ] `tipoAcionamento: "manual"` em todos os 7.
- [ ] `selectRegistroSecao(32)` → SKU 4209000 (primário, não PREDIALL).
- [ ] `selectRegistroSecao(50)` → SKU 1002326 (primário, não MARRON).
- [ ] `selectRegistroSecao(75)` → SKU 1001994.
- [ ] `selectRegistroSecao(100)` → SKU 1002327.
- [ ] `selectRegistroSecao(40)` → `undefined`.
- [ ] `buildBOM` com section_valve DN50 → item precificado na BOM, `valvulasSemCatalogoCount = 0`.
- [ ] `buildBOM` com section_valve DN40 → sem item precificado, `valvulasSemCatalogoCount = 1`.
- [ ] Warning de acionamento manual presente quando ≥ 1 válvula foi resolvida.
- [ ] Blocker residual presente quando `valvulasSemCatalogoCount > 0`.
- [ ] Sem blocker genérico de catálogo quando `valvulasSemCatalogoCount = 0`.
- [ ] Nenhum item com `precoUnitario: 0` ou valor inventado.
- [ ] `npx tsc --noEmit` → 0 erros.
- [ ] `npx vitest run` → 100% passando, contagem ≥ 449 (441 + ≥ 8 novos).
- [ ] Somente `src/lib/catalog/aspersores.ts`, `src/lib/bom.ts` e o novo arquivo de testes foram alterados.

---

## 7. Dependências

| Tarefa | Relação |
|--------|---------|
| TASK-005 | Predecessor — estruturou `valvulasCount` e `valvulasSemCatalogoCount` |
| TASK-006A | Predecessor — catalogou candidatos e estabeleceu regra PN80 interna |
| TASK-003 | Gate de PDF — esta tarefa remove o blocker de válvulas para DN aprovados |

---

## 8. O que não será feito nesta tarefa

- Não implementar controle automático (solenoide/atuador).
- Não incluir alternativas (MARRON, PREDIALL) na seleção automática da BOM.
- Não homologar marcas além de VIQUA sem decisão RT.
- Não alterar solver, layout, setorização, geometria ou motor A/B/C.
- Não resolver pendências de outras famílias (BERMAD, retençao, ventosa).
- Não confirmar DN35 em `TUBOS_PVC_LF` — isso é pré-requisito de campo, não de código.
