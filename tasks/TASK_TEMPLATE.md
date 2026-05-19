# TASK-XXX — [Título da tarefa]

**Status:** `pendente` | `em progresso` | `bloqueada` | `referência histórica`
**Prioridade:** `P1-crítico` | `P2-importante` | `P3-melhoria`
**Área:** `hidráulica` | `layout` | `bom` | `pdf` | `ui` | `infra`
**Criado em:** YYYY-MM-DD
**Atualizado em:** YYYY-MM-DD

---

## Objetivo

> Uma frase clara: o que esta tarefa deve entregar. O que muda no software ao final.

---

## Contexto

> Por que esta tarefa existe agora. Qual problema resolve, qual limitação remove.
> Incluir:
> - Estado atual do código relevante (arquivo:linha se útil)
> - Decisões anteriores que criaram essa necessidade
> - Restrições conhecidas (desempenho, retrocompatibilidade, BOM, etc.)

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|----------------|-------|
| `src/lib/layout/...` | criação / modificação | |
| `src/lib/bom.ts`      | modificação           | |

---

## Critérios de aceite

> Lista binária. Cada item é verificável por inspeção ou teste automatizado.

- [ ] [critério específico e mensurável]
- [ ] [critério específico e mensurável]
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → sem regressão (contagem ≥ atual)
- [ ] Nenhuma lógica de domínio movida para UI
- [ ] Nenhum SKU do catálogo alterado

---

## Testes obrigatórios

> Pelo menos N testes novos (N ≥ 5 para features de domínio, N ≥ 2 para infra/UI).
> Descrever cada teste antes de implementar.

1. **[nome do teste]** — [o que verifica, qual invariante protege]
2. **[nome do teste]** — [...]
3. **[nome do teste]** — [...]

---

## Fora do escopo

> O que explicitamente NÃO será feito nesta tarefa.

- Não alterar [X]
- Não otimizar [Y]
- Não refatorar [Z]

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| [descrever] | baixa/média/alta | baixo/médio/alto | [como evitar] |

**Dependências de outras tarefas:** TASK-XXX deve estar concluída antes desta.

---

## Pendências abertas

> Decisões que ainda precisam ser tomadas antes ou durante a implementação.

- [ ] [pendência com responsável e prazo se houver]

---

## Plano de implementação

> Preenchido pelo Claude após aprovação do plano, antes da implementação.
> Se ausente, usar `/planejar` antes de `/implementar`.

1. [passo 1]
2. [passo 2]
3. ...

---

## Formato de resposta esperado

Ao concluir esta tarefa, o agente deve responder com:

1. **O que foi feito** — lista de arquivos criados/modificados com resumo da mudança
2. **Testes** — contagem antes vs. depois; quais testes novos foram criados
3. **TypeScript** — confirmação de 0 erros
4. **Invariantes verificadas** — checklist dos critérios de aceite
5. **Números de sanidade** — se houver cálculo (HMT, HF, velocidade), os valores de referência
6. **Pendências abertas** — o que ficou fora do escopo ou requer acompanhamento
7. **Próximos passos sugeridos** — qual TASK vem a seguir

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| YYYY-MM-DD | [nome/agente] | Tarefa criada |
