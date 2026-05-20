# TASK-010A — Extrair motor puro de geração da malha de aspersores

**Status:** `em progresso`
**Prioridade:** `P2-importante`
**Área:** `layout / domínio`
**Criado em:** 2026-05-20
**Atualizado em:** 2026-05-20

---

## Objetivo

> Extrair `generateRotatedSprinklerGrid()` e `findOptimalGridAngle()` de `ProjectMap.tsx` para o módulo puro `src/lib/layout/sprinkler-grid.ts`, mantendo comportamento idêntico e cobrindo com testes.

---

## Contexto

A geração da malha de aspersores hoje vive dentro do componente de UI `ProjectMap.tsx` (linhas 124–174) como funções locais não exportadas. Isso impede testes unitários diretos e viola a invariante do projeto: nenhuma lógica de domínio em `src/components/`.

O relatório TASK-010A-relatório (sessão 2026-05-20) mapeou o fluxo completo:

- `findOptimalGridAngle(polygon)` → itera 0°–89°, minimiza área do bbox do polígono rotacionado
- `generateRotatedSprinklerGrid(polygon, spacingMeters, angleDegrees)` → rotaciona polígono, gera grade, filtra por ponto-no-polígono, rotaciona pontos de volta

Ambas as funções são **puras**: sem estado, sem efeitos colaterais, sem dependências de React. A captação (`waterSource`) não é parâmetro de nenhuma das duas — entra só após a malha estar gerada.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/sprinkler-grid.ts` | **criação** | Módulo puro com as duas funções exportadas |
| `src/lib/layout/__tests__/sprinkler-grid.test.ts` | **criação** | ≥ 6 testes novos |
| `src/components/map/ProjectMap.tsx` | **modificação** | Remove corpos das funções; adiciona import |

---

## Critérios de aceite

- [ ] `generateRotatedSprinklerGrid()` está em `src/lib/layout/sprinkler-grid.ts`, exportada
- [ ] `findOptimalGridAngle()` está em `src/lib/layout/sprinkler-grid.ts`, exportada
- [ ] `ProjectMap.tsx` não contém os corpos das funções — apenas re-usa via import
- [ ] A malha gerada antes e depois da extração é equivalente (mesma lógica, mesmos parâmetros)
- [ ] `waterSource` não é parâmetro de nenhuma função do novo módulo
- [ ] Testes cobrem: retângulo 0°, área a 30°, polígono irregular
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → ≥ 528 testes passando (522 atuais + 6 novos)

---

## Testes obrigatórios

1. **retângulo 0° — contagem de aspersores dentro do esperado**
   Polígono retangular 120m × 60m em 0°. `generateRotatedSprinklerGrid` deve retornar entre 30 e 70 pontos. Verifica que a grade não está vazia e não explodiu.

2. **retângulo 0° — nenhum ponto fora do polígono**
   Todos os pontos retornados devem passar num `turf.booleanPointInPolygon` contra o polígono original. Garante que o filtro de `pointsWithinPolygon` funciona.

3. **área inclinada 30° — posições voltam ao espaço geográfico correto**
   Polígono rotacionado 30° em torno de um centroide. Após `generateRotatedSprinklerGrid(..., 30)`, todos os pontos devem estar dentro do polígono original (não rotacionado). Valida que a rotação de volta é exata.

4. **polígono irregular — todos os pontos dentro**
   Polígono não-convexo (forma de L ou triângulo). Todos os pontos retornados passam em `turf.booleanPointInPolygon`. Protege contra falso negativo do filtro em formas côncavas.

5. **findOptimalGridAngle — retorna entre 0 e 89**
   Polígono qualquer. Resultado deve ser inteiro no intervalo [0, 89].

6. **findOptimalGridAngle — polígono horizontal tem ângulo próximo de 0°**
   Retângulo com largura >> altura, alinhado com os eixos. Ângulo ótimo deve ser ≤ 10°. Verifica que a heurística de mínimo bbox funciona para o caso trivial.

---

## Fora do escopo

- Não alterar o algoritmo de geração (turf.pointGrid, transformRotate, pointsWithinPolygon)
- Não alterar `ASPERSOR_PADRAO` nem espaçamento 12 × 12
- Não alterar hidráulica, BOM, setorização, motor A/B/C
- Não implementar motor de múltiplos candidatos (espaçamentos alternativos)
- Não alterar comportamento esperado da malha atual

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `@turf/turf` não funcionar em vitest sem mock | baixa | médio | `laterais.test.ts` já importa turf diretamente sem problema |
| Tipo `GeoJSON.Polygon` não disponível em `src/lib/` | baixa | baixo | `@types/geojson` é dep transitiva de `@turf/turf` — já presente |
| Bundler tratar `src/lib/` como server-only e rejeitar turf | baixa | alto | Turf já funciona no servidor (rota de PDF usa funções do layout); confirmar após `tsc` |

**Dependências de outras tarefas:** nenhuma.

---

## Pendências abertas

Nenhuma.

---

## Plano de implementação

1. **Criar `src/lib/layout/sprinkler-grid.ts`**
   - Copiar `findOptimalGridAngle()` e `generateRotatedSprinklerGrid()` de `ProjectMap.tsx`
   - Exportar ambas
   - Adicionar import `import * as turf from "@turf/turf"`
   - Nenhuma outra dependência

2. **Criar `src/lib/layout/__tests__/sprinkler-grid.test.ts`**
   - 6 testes descritos acima
   - Usar fixtures de polígono simples (coordenadas próximas de `-46.0, -12.0` como nos outros testes)

3. **Modificar `ProjectMap.tsx`**
   - Remover corpos das funções (linhas 124–174)
   - Adicionar `import { findOptimalGridAngle, generateRotatedSprinklerGrid } from "@/lib/layout/sprinkler-grid"`
   - Manter todas as chamadas existentes sem alteração

4. **Verificar**
   - `npx tsc --noEmit` → 0 erros
   - `npx vitest run` → ≥ 528 passando

---

## Formato de resposta esperado

Ao concluir esta tarefa, o agente deve responder com:

1. **O que foi feito** — lista de arquivos criados/modificados com resumo da mudança
2. **Testes** — contagem antes vs. depois; quais testes novos foram criados
3. **TypeScript** — confirmação de 0 erros
4. **Invariantes verificadas** — checklist dos critérios de aceite
5. **Pendências abertas** — o que ficou fora do escopo ou requer acompanhamento
6. **Próximos passos sugeridos** — qual TASK vem a seguir

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-20 | Claude Sonnet 4.6 | Tarefa criada; plano aprovado |
