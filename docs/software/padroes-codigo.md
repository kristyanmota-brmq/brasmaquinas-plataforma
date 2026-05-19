# Padrões de Código

---

## 1. TypeScript

### Strict mode obrigatório

`tsconfig.json` tem `"strict": true`. Nunca desabilitar.

### Sem `any` implícito ou explícito

Se o tipo não é conhecido, usar `unknown` e narrowing explícito. Se `any` for inevitável (e.g., dados de API externa sem tipos), documentar com comentário e criar issue para tipagem futura.

**Proibido:**
```typescript
function process(data: any) { ... }  // ❌
```

**Permitido (com justificativa):**
```typescript
// data vem da API do Clerk sem tipo exportado — tipar quando SDK atualizar
const userData = clerkResponse as unknown as UserData;
```

### Tipos exportados, implementações podem mudar

Interfaces e tipos públicos de um módulo são contratos. Mudar a interface de uma função exportada requer revisão de todos os consumidores e, se a mudança for breaking, um ADR.

### Preferir `interface` para shapes de dados, `type` para unions e aliases

```typescript
interface HydraulicSegment { ... }      // ✅ shape de dados
type SecondaryStatus = "ok" | "..."     // ✅ union
type SelecaoTubo = { tubo: ...; ... }   // ✅ alias (ok se não estende)
```

---

## 2. Funções

### Funções puras no domínio

Todas as funções em `src/lib/` devem ser puras: mesmo input → mesmo output, sem efeitos colaterais, sem acesso a estado global, sem imports de React.

### Nomes descritivos, sem abreviações obscuras

```typescript
function selectSecondaryPipe(...)    // ✅
function selSecPipe(...)             // ❌
function ssP(...)                    // ❌
```

### Funções de domínio não retornam `undefined` opcionalmente — usam `| null` com propósito claro

```typescript
function sizeHydraulics(...): HydraulicSizingReport | null   // ✅ — null tem significado (dados incompletos)
function buildBOM(...): BOMResult | undefined                  // ❌ — undefined sem propósito claro
```

---

## 3. Organização de arquivos

### Um domínio por arquivo

Cada arquivo `src/lib/layout/*.ts` tem responsabilidade única. Não misturar lógica de setorização com lógica hidráulica no mesmo arquivo.

### Tipos exportados no mesmo arquivo que os usa

Não criar arquivos `types.ts` genéricos. O tipo `HydraulicSegment` fica em `hydraulic-sizing.ts` junto com `sizeHydraulics`.

### Sem imports circulares

```
laterais.ts → aspersores.ts         ✅
irrigation-project.ts → laterais.ts ✅
laterais.ts → irrigation-project.ts ❌ (circular)
```

Verificar com: `npx tsc --noEmit` (TypeScript detecta circulares problemáticos).

---

## 4. Comentários

Comentar o **porquê**, nunca o **o quê**.

```typescript
// ✅ — explica invariante não óbvia
// Piso enforced: desnível favorável não pode reduzir HMT abaixo de pressão + perdas locais + margem
const totalHMT = Math.max(rawTotal, hmtFloor);

// ❌ — repete o que o código já diz
// Calcula o máximo entre rawTotal e hmtFloor
const totalHMT = Math.max(rawTotal, hmtFloor);
```

Não usar comentários `// TODO` em produção — criar task no backlog.

---

## 5. Constantes

Constantes com semântica devem ter nome, não ser inline:

```typescript
const MAX_VEL_PRINCIPAL_MS = 1.5;      // ✅
const hf = headLoss(q, l, d, 1.5);    // ❌ — o que é 1.5?
```

Constantes do catálogo (`ASPERSOR_PADRAO.pressaoServicoMca`) são a fonte da verdade — não duplicar como literais.

---

## 6. Testes — padrões específicos

Ver `docs/software/testes.md` para detalhes completos.

Regra geral: todo código novo de domínio tem testes. Pull requests sem testes para lógica de domínio não são aceitos.

---

## 7. Next.js

Ver `AGENTS.md` para regras específicas desta versão do Next.js.

- `"use server"` apenas em Server Actions (`src/app/projetos/[id]/actions.ts`)
- `"use client"` apenas quando necessário (interatividade, hooks)
- Layout schemas (`layout-schema.ts`) sem `"use server"` — são importáveis de qualquer camada
- Server Components não têm estado — uso de `useState` requer `"use client"`

---

## 8. Git

### Mensagens de commit

```
tipo(escopo): descrição concisa

feat(hidráulica): adicionar selectSecondaryPipe com critério de hf
fix(bom): corrigir agrupamento de ramais por SKU próprio (TASK-002)
docs(metodologia): rascunho inicial de 03-hidraulica.md
refactor(layout): extrair sizeAllSecondaries para arquivo próprio
test(secondary-sizing): 12 testes obrigatórios TASK-002
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Granularidade

Um commit por mudança lógica. Não misturar refatoração com feature nova no mesmo commit.
