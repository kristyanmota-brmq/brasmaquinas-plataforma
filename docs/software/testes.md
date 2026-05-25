# Testes

---

## 1. Framework e configuração

- **Vitest** (`npx vitest run` para CI, `npx vitest` para watch)
- Configuração: `vitest.config.ts` na raiz
- Path aliases: `@/` → `src/` (igual ao TypeScript)
- Todos os testes em `src/lib/layout/__tests__/`

---

## 2. O que testar (e o que não testar)

### Testar obrigatoriamente

| Camada | O que testar |
|--------|-------------|
| Funções de domínio (`src/lib/`) | Casos normais, edge cases, invariantes críticas |
| Solver hidráulico | HMT, HF por componente, caminho crítico, validação de bomba |
| BOM | Contagem de peças, agrupamento por SKU, totais |
| Seleção de tubo | Velocidade, hf, fallback ao maior, status |
| Integrações de domínio | `calculateIrrigationProject` retorna estrutura correta e completa |

### Não testar diretamente

- Componentes React (ProjectMap, MemorialPanel) — testados via integração visual
- Server Actions — testados via e2e se necessário
- Catálogo estático — valores são a fonte da verdade, não precisam de testes de valor

---

## 3. Estrutura de um teste de domínio

```typescript
import { describe, it, expect } from "vitest";
import { nomeDaFuncao } from "@/lib/layout/nome-do-modulo";

describe("nomeDaFuncao — contexto geral", () => {
  it("descrição específica do comportamento esperado", () => {
    // arrange
    const input = { ... };

    // act
    const result = nomeDaFuncao(input);

    // assert
    expect(result.campo).toBe(valor);
    expect(result.outro).toBeCloseTo(0.123, 4); // precisão adequada para floats
  });
});
```

---

## 4. Fixtures de projeto

Para testes que exigem um projeto realista (com geometria, setorização, hidráulica):

```typescript
import { makeLayoutL, makeLayoutP } from "./fixtures";
import { calculateIrrigationProject } from "@/lib/layout/irrigation-project";

// Projeto L: ~448 aspersores, 14 setores, grade 40×12 com corte em L
const resultL = calculateIrrigationProject(makeLayoutL());

// Projeto P: ~768 aspersores, 14 setores, grade 52×16 trapezoidal
const resultP = calculateIrrigationProject(makeLayoutP());
```

**Números de sanidade das fixtures** (não mudam sem task aprovada):
- Projeto L: HMT ≈ 43,99 mca | 400/400 testes passando como referência
- Projeto P: HMT ≈ 50,83 mca

---

## 5. Testes numéricos

Usar `toBeCloseTo(value, numDigits)` para floats:

```typescript
// ✅ — 4 casas decimais para HMT (precisão de mca)
expect(report.hmt.totalHMT).toBeCloseTo(43.99, 4);

// ✅ — 6 casas para localLossesM (pequenos valores)
expect(report.hmt.localLossesM).toBeCloseTo(distribHf * 0.10, 6);

// ❌ — comparação exata de float
expect(report.hmt.totalHMT).toBe(43.99);
```

---

## 6. Contagem mínima de testes por tarefa

| Tipo de tarefa | Testes novos mínimos |
|---------------|---------------------|
| Feature de domínio (solver, BOM, seleção) | 5 |
| Refatoração interna sem mudança de contrato | 0 (mas verificar regressão) |
| Novo arquivo de domínio | 5 |
| Correção de bug | 1 (reproduz o bug antes do fix) |
| Mudança de UI sem lógica | 0 |

---

## 7. Nomenclatura de arquivos de teste

```
src/lib/layout/__tests__/
  hydraulic-sizing.test.ts      — testes de sizeHydraulics
  secondary-sizing.test.ts      — testes de selectSecondaryPipe e sizeAllSecondaries
  bom.test.ts                   — testes de buildBOM
  laterais.test.ts              — testes de generatePhysicalColumns
  sectorization.test.ts         — testes de buildSectorsByFlowWithColumnSplitting
  integration.test.ts           — testes end-to-end do calculateIrrigationProject
  fixtures.ts                   — makeLayoutL(), makeLayoutP() (não é um arquivo de teste)
```

---

## 8. Invariantes que devem ter teste permanente

Estes testes não podem ser removidos:

```typescript
// 1. sizeHydraulics retorna null para projeto incompleto
// 2. HMT usa D interno (hf com D=66 > hf com D=75 para mesmo flow)
// 3. localLossesM ≈ distribHf × 0,10
// 4. criticalPathModel === "exhaustive"
// 5. criticalPrincipalSubSegments.length ≤ allPrincipalSubSegments.length
// 6. hfPrincipalToDerivationM === sum(criticalPrincipalSubSegments[].headLossM)
// 7. pumpValidation.designFlowM3h === maxSectorFlow
// 8. secondarySizingModel === "individual_velocity_and_headloss_checked"
// 9. sizedSecondaries.length === secondaries.length (quando há ramais)
// 10. Testes de regressão L e P (HMT dentro de ±0.01 mca dos valores de sanidade)
```

---

## 9. Rodar os testes

```bash
# CI — uma vez, resultado binário
npx vitest run

# Desenvolvimento — watch mode com re-run automático
npx vitest

# Arquivo específico
npx vitest run src/lib/layout/__tests__/secondary-sizing.test.ts

# Com cobertura (não obrigatório mas útil para novas features)
npx vitest run --coverage
```

---

## 10. Scripts de diagnóstico (banco local — não fazem parte da bateria)

Scripts em `scripts/diagnose/` que **dependem de banco local** (Prisma + fixture
`fixture-e06-9setores`) e são executados manualmente para inspecionar o estado
do Projeto A real. Não rodam em `vitest run`, `tsc --noEmit` nem em
`scripts/ai/__tests__/run-all.mjs`.

```bash
# (1) Tabela A0 / A2-min / A2-max / A3 com BOM, P1-P4, scoreFinal, vencedor.
node scripts/diagnose/diagnose-architecture-projeto-a.mjs

# (2) Verificação v12 (TASK-053): direção do spine, rib[0], lateral,
#     e deflexão da junção rib→lateral em cada setor do Projeto A.
node scripts/diagnose/verify-v12-projeto-a.mjs

# (3) Diagnóstico de espinha (v9 inline) — preservado para auditoria.
node scripts/diagnose/diagnose-espinha-projeto-a.mjs
```

Pré-requisitos comuns:

- `POSTGRES_PRISMA_URL` definido (ou arquivo `.env` local com `DATABASE_URL`)
- Banco populado com `fixture-e06-9setores`
- `node` 20+ (suporte a `import.meta` e top-level await)

Cobertura equivalente em vitest (não substitui o diagnóstico em banco real, mas
fica como artefato persistente do P1-P4):

- `src/lib/layout/__tests__/architecture-selector.test.ts` → cenário "Projeto
  A-like" (`buildProjetoALikeScenario`) com snapshot em `T56-DIAG-W02`.
- `src/lib/layout/__tests__/network-angle-diagnostics.test.ts` → cobertura de
  dobras de adutora (T-ADUTORA-1..7) e regra `[0°, 90°]` da rede interna.
