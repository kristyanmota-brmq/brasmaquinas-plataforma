# TASK-023 — Homologar kit de ligação do aspersor 5022 por DN da lateral

**Status:** `em progresso`
**Prioridade:** P1-crítico (desbloqueia blocker comercial de todo projeto com aspersores)
**Área:** bom / catálogo
**Data de início:** 2026-05-21
**Arquivo:** `tasks/TASK-023-homologar-kit-aspersor-5022-por-dn-lateral.md`

---

## Contexto

A TASK-022 introduziu detecção de conexões físicas construtíveis na BOM. A derivação aspersor→lateral ficou sem SKU catalogado, gerando blocker comercial `"BOM incompleta — derivação aspersor-lateral"` em todo projeto com aspersores.

A regra operacional Brasmáquinas é: **laterais somente DN50mm e DN75mm** para o aspersor 5022. Esta TASK homologa o kit real de ligação por DN e remove o blocker para DNs resolvidos.

---

## Escopo

### O que está incluído

- Cadastro de `KIT_ASPERSOR_5022` em `aspersores.ts` com itens reais por DN (DN50: 3 itens; DN75: 4 itens)
- Resolução automática do kit na BOM por `col.selecao.tubo.diametroMm`
- Agrupamento por SKU: luva (`1819000`) e tubo de subida (`1000843`) acumulam qty de DN50 + DN75
- Substituição da lógica de tubo de subida: `ceil(count/2)` → `1 unidade por aspersor`
- Blocker específico para DN não homologado: `"BOM incompleta — DN de lateral não homologado para kit do aspersor 5022"`
- Novos campos em `BOMResult.meta`: `kitAspersorResolvCount`, `kitAspersorDnNaoHomologadoCount`
- Remoção de `tesAspersorLateralCount` do meta (substituído pelos dois campos acima)
- 6 novos testes T23-a a T23-f em `bom-kit-aspersor.test.ts`
- Atualização de T22-n, T22-o, T22-q em `physical-connections.test.ts`
- Atualização das fixtures `makeMinimalBOM` em `bom-valves.test.ts` e `pressure-class.test.ts`

### O que NÃO está incluído

- Seleção hidráulica de laterais (solver, `generatePhysicalColumns`, `TUBOS_PVC_LF`) — ver TASK-025
- Roteamento, PDF, mapa, motor A/B/C
- Custo de aquisição dos SKUs (não informado — `custo: 0`)

---

## Kit homologado

### DN50 (lateral Ø50mm)

| SKU | Descrição | Marca | Unid | Custo | Venda |
|-----|-----------|-------|------|-------|-------|
| `1819000` | Luva PVC BR 3/4" | — ¹ | unid | 0 | R$ 6,00 |
| `1000843` | Tubo de Subida PVC BR 3/4" x 3,0 m | — ¹ | unid | 0 | R$ 30,25 |
| `1000354` | Tee de derivação roscável 50 mm x 3/4" | — ¹ | unid | 0 | R$ 15,00 |

### DN75 (lateral Ø75mm)

| SKU | Descrição | Marca | Unid | Custo | Venda |
|-----|-----------|-------|------|-------|-------|
| `1819000` | Luva PVC BR 3/4" | — ¹ | unid | 0 | R$ 6,00 |
| `1000843` | Tubo de Subida PVC BR 3/4" x 3,0 m | — ¹ | unid | 0 | R$ 30,25 |
| `132789` | TE SOLD IRR PN80 DN75 X 1" - PTI | PTI | unid | 0 | R$ 36,75 |
| `1464000` | BUCHA RED. ROSC. 1" X 3/4" - TIGRE | TIGRE | unid | 0 | R$ 5,70 |

> ¹ **Pendência de dado:** `marca` não informada pelo RT para SKUs `1819000`, `1000843`, `1000354`. Campo registrado como `""`. Não usar para análise de margem enquanto `custo: 0`.

---

## Regras de resolução da BOM

1. Para cada coluna física (`physicalColumns`), obter `col.selecao.tubo.diametroMm`.
2. Se DN50 ou DN75: adicionar `col.sprinklerCount` unidades de cada item do kit ao acumulador por SKU.
3. Se outro DN: incrementar `kitAspersorDnNaoHomologadoCount`.
4. Emitir um `BOMItem` por SKU do acumulador (agrupamento automático por SKU compartilhado).
5. `generateProposalDiagnostics` emite blocker `"BOM incompleta — DN de lateral não homologado para kit do aspersor 5022"` quando `kitAspersorDnNaoHomologadoCount > 0`.

---

## Trava de segurança vs. solução definitiva

A restrição DN50/DN75 implementada nesta task é uma **trava de segurança na BOM**. O seletor hidráulico de laterais (`generatePhysicalColumns` + `TUBOS_PVC_LF`) ainda pode selecionar DN100 em projetos com muitos aspersores por coluna. Quando isso ocorre, o projeto fica bloqueado na BOM, mas o bloqueio é correto.

**A solução definitiva está em TASK-025**, que restringirá o seletor hidráulico para não escolher DN100 em projetos 5022.

---

## Critérios de aceite

- [x] `KIT_ASPERSOR_5022` em `aspersores.ts`: DN50 (3 itens) e DN75 (4 itens), `custo: 0`
- [x] `selectKitAspersor5022(dnMm)` retorna `null` para DN != 50 e != 75
- [x] BOM com lateral DN50: `1819000`, `1000843`, `1000354` com qty = aspersores nessa lateral
- [x] BOM com lateral DN75: `1819000`, `1000843`, `132789`, `1464000` com qty = aspersores nessa lateral
- [x] SKUs compartilhados (`1819000`, `1000843`) agrupados: qty = total DN50 + DN75
- [x] `1000843` quantidade = 1 por aspersor (não `ceil(count/2)`)
- [x] Lateral DN100 → blocker `"BOM incompleta — DN de lateral não homologado para kit do aspersor 5022"`
- [x] Lateral DN50/75 → sem blocker `"BOM incompleta"` de kit
- [x] `tesAspersorLateralCount` removido; `kitAspersorResolvCount` e `kitAspersorDnNaoHomologadoCount` no meta
- [x] T22-n, T22-o, T22-q atualizados
- [x] Fixtures `makeMinimalBOM` atualizadas
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npx vitest run` → ≥ 710 testes

---

## Pendências abertas

- **`marca` dos SKUs `1819000`, `1000843`, `1000354`** — não informada pelo RT. Registrado como `""` no catálogo. Não impacta cálculo de BOM.
- **TASK-025 — Restringir seleção hidráulica de laterais a DN50/DN75** — o seletor hidráulico ainda aceita DN100.
- **`curva_45_adutora`** — ainda sem SKU; `BOMPendingConnection` permanente (fora do escopo desta task).
- **Luvas (couplings)** — fora do escopo; sem critério de contagem e sem SKU.

---

## Arquivos modificados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/lib/catalog/aspersores.ts` | Criação: `KitAspersor5022Item`, `KIT_ASPERSOR_5022`, `selectKitAspersor5022` |
| `src/lib/bom.ts` | Remove bloco TUBO_SUBIDA; substitui seção C; atualiza meta; adiciona blocker em `generateProposalDiagnostics` |
| `src/lib/layout/__tests__/bom-kit-aspersor.test.ts` | Criação: T23-a a T23-f |
| `src/lib/layout/__tests__/physical-connections.test.ts` | Atualiza T22-n, T22-o, T22-q |
| `src/lib/layout/__tests__/bom-valves.test.ts` | Atualiza fixture `makeMinimalBOM` |
| `src/lib/layout/__tests__/pressure-class.test.ts` | Atualiza fixture `makeMinimalBOM` |
| `tasks/backlog.md` | Adiciona TASK-025 |

---

## Rastreabilidade

- **Origem:** TASK-022 — blocker `tee_90_aspersor_lateral` pendente
- **Próxima:** TASK-024 — Mapa Mestre de Épicos e Critério de Fim do MVP
- **Futura:** TASK-025 — Restringir seleção hidráulica de laterais a DN50/DN75
