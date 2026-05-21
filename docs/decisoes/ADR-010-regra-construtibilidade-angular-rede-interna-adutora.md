# ADR-010 — Regra de construtibilidade angular da rede interna e adutora

**Data:** 2026-05-20
**Status:** `aceita`
**Supersede:** —
**Supersedida por:** —

---

## Contexto

A TASK-013 introduziu `detectNetworkAngleIssues()` para detectar ângulos fora dos padrões construtíveis na rede física. A implementação inicial usava `ALLOWED_DEFLECTIONS = [0, 45, 90]` uniformemente para todos os elementos.

Antes do início da TASK-015, o RT da Brasmáquinas confirmou a **regra oficial** de construtibilidade angular:

> A rede interna (principal, ramais, laterais, trechos operacionais, registros e junções internas) usa **exclusivamente** curvas/tês 90° e luvas (conexões retas). Curvas de 45° são proibidas na rede interna. A adutora pode usar 45° por exigência de roteamento externo à malha.

Essa distinção é necessária porque:
- A rede interna opera em malha ortogonal (aspersores em grade 12×12) — geometria que naturalmente exige apenas 0° e 90°.
- A adutora conecta a captação (posição arbitrária) à boca da rede — pode exigir curvas de 45° para acompanhar topografia ou limites de propriedade.
- Usar curvas de 45° na rede interna aumenta custo de catálogo, reduz intercambialidade em campo e cria junções com pressão diferencial diferente das previstas no dimensionamento padrão.

---

## Decisão

Separamos a regra de construtibilidade angular em dois conjuntos exportados de `network-angle-diagnostics.ts`:

```typescript
// Rede interna: principal, ramais, laterais, trechos operacionais, registros
export const ALLOWED_DEFLECTIONS_INTERNAL = [0, 90] as const;

// Adutora: aceita curva 45° para roteamento externo à malha
export const ALLOWED_DEFLECTIONS_ADUTORA = [0, 45, 90] as const;
```

`isAllowedDeflection(deflectionDeg)` usa `ALLOWED_DEFLECTIONS_INTERNAL` por padrão.

Deflexões não pertencentes ao conjunto permitido (incluindo 45° na rede interna) geram `severity: "blocker"`, impedindo a emissão do PDF via gate HTTP 422 existente (ADR-003).

A tolerância angular de ±5° é mantida como premissa provisória de engenharia (ver `TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE` em `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`).

---

## Alternativas consideradas

### Alternativa A — Manter 45° permitido em toda a rede

**Descrição:** Manter `ALLOWED_DEFLECTIONS = [0, 45, 90]` sem distinção.

**Por que foi descartada:** Contradiz a regra oficial confirmada pelo RT. A rede interna ortogonal não usa 45°. Permitir 45° no código implica que o sistema poderia gerar propostas com conexões que a Brasmáquinas não utiliza e não precifica no catálogo.

### Alternativa B — Um único conjunto expandido `[0, 45, 90]` com flag por elemento

**Descrição:** Manter um único array e adicionar parâmetro `allowAdutora: boolean` em cada verificação.

**Por que foi descartada:** Duplica a lógica de controle sem benefício — a separação em duas constantes nomeadas é mais clara, testável e rastreável. O consumidor de `isAllowedDeflection` pode optar explicitamente entre os dois regimes.

### Alternativa C — Não verificar ângulos da adutora

**Descrição:** Verificar apenas rede interna; ignorar completamente a adutora.

**Por que foi descartada:** Prematura. A adutora pode ter dobras arbitrárias fora de qualquer padrão construtível. Registrar `ALLOWED_DEFLECTIONS_ADUTORA` agora prepara a infraestrutura para verificação futura quando a adutora for modelada como polilinha com pontos intermediários verificáveis (atualmente: por invariante I4 de `generatePrincipalAndAdutora`, a adutora conecta no endpoint da principal — não passa por verificação de junção interna).

---

## Consequências

### Positivas

- Propostas com dobras de 45° na rede interna são bloqueadas antes da emissão do PDF — elimina risco de proposta com material não utilizado pela Brasmáquinas.
- A separação em duas constantes exportadas é rastreável: testes verificam cada conjunto individualmente.
- Mensagens de erro do diagnóstico indicam explicitamente o regime violado: "(rede interna: apenas 90°/180° permitidos)".

### Negativas / trade-offs

- Propostas com geometria diagonal na principal (ex.: polígono inclinado onde o traçado natural seria 45°) agora geram blocker. O usuário precisará ajustar o traçado da principal ou aceitar que o projeto é não construtível por esse critério.
- A verificação da adutora (com 45° permitido) não está implementada nesta versão — `detectNetworkAngleIssues` recebe `adutoraCoords` mas não verifica seus ângulos internos. Essa verificação foi adiada para quando a adutora for modelada com pontos intermediários verificáveis.

### Neutras

- `fromCoord`/`toCoord` de `SecondaryPipe` são preservados para retrocompatibilidade. Código consumidor que não usa `coords` funciona sem alteração.
- O roteamento em L (`routeSecondary`) é infraestrutura disponível mas, para os ramais gerados automaticamente por `generateSecondaries`, a rota reta já é sempre construtível (F é projeção ortogonal de T na principal por construção).

---

## Arquivos afetados

| Arquivo | Tipo de impacto |
|---------|----------------|
| `src/lib/layout/network-angle-diagnostics.ts` | `ALLOWED_DEFLECTIONS_INTERNAL`, `ALLOWED_DEFLECTIONS_ADUTORA`, `isAllowedDeflection` |
| `src/lib/layout/hydraulic-connectivity.ts` | `SecondaryPipe.coords`, `routeSecondary`, `generateSecondaries` |
| `src/components/map/ProjectMap.tsx` | usa `sec.coords` na LineString dos ramais |
| `src/lib/layout/__tests__/secondary-routing.test.ts` | 28 testes novos |
| `src/lib/layout/__tests__/network-angle-diagnostics.test.ts` | atualizado: T10 → blocker, `isAllowedDeflection(45)` → false |

---

## Classificação

- regra técnica de construtibilidade (ângulos físicos de montagem)
- governança de bloqueio/emissão (blocker impede PDF)
- regra confirmada pelo RT (não é premissa provisória)
- tolerância angular ±5° permanece premissa provisória — ver `TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE`

---

## Referências

- TASK-015 — Roteamento construtível de ramais/secundárias com 90°/180°
- TASK-013 — Auditar e corrigir laterais físicas construtíveis
- ADR-003 — Bloqueio de PDF com blockers ativos
- `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md` — `TOLERANCIA_ANGULAR_CONSTRUTIBILIDADE`
- `docs/relatorios/2026-05-20-TASK-015.md`

---

## Log de revisões

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | ADR criada (TASK-015) |
