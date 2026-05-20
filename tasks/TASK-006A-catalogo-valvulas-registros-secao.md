# TASK-006A — Saneamento e homologação do catálogo mínimo de válvulas/registros de seção

**Status:** `pendente`
**Prioridade:** P1-crítico (bloqueia TASK-006)
**Área:** catálogo / governança comercial
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-19

---

## 1. Contexto

A TASK-005 identificou `section_valve` nos pontos de controle e bloqueou a emissão de proposta
final quando não há SKU/preço no catálogo. O blocker foi intencional: nenhum valor pode ser
inventado.

A TASK-006 (BOM automática de válvulas) depende de catálogo real e homologado. Há candidatos
em planilhas da empresa, mas existem itens sem preço, itens com custo maior que preço de venda,
e dúvidas sobre qual família deve ser usada para corte de seção em irrigação convencional.

Esta tarefa é um **pré-requisito** da TASK-006. Nenhuma implementação de BOM será feita aqui.

**Fontes candidatas:**

- `Prod_Irrig_Convenc_SANEADO.xlsx`
- `Produtos utilizados como insumo na industria.xlsx`
- Listagens de projetos antigos com válvulas BERMAD/DOCOL

---

## 2. Objetivo

Extrair, classificar e homologar os candidatos de válvulas/registros que possam ser usados como
`section_valve` na BOM automática. Produzir relatório de catálogo com decisão clara por item.

---

## 3. Escopo

### 3.1 O que fazer

1. Extrair todos os candidatos de válvulas/registros das fontes listadas.
2. Separar por família:
   - registro esfera PVC;
   - registro gaveta;
   - válvula hidráulica plástica BERMAD;
   - válvula básica/metálica;
   - válvula de retenção;
   - ventosa/antivácuo;
   - acessórios de comando (solenoides, pilotos, etc.).
3. Classificar cada item com um dos status abaixo (ver seção 5).
4. Gerar relatório em `docs/relatorios/catalogo-valvulas-candidatas.md`.

### 3.2 O que não fazer

- Não alterar nenhum código.
- Não alterar `src/lib/catalog/aspersores.ts`.
- Não inventar SKU, preço, marca, PN ou diâmetro.
- Não implementar BOM de válvulas (isso é escopo da TASK-006).
- Não marcar item como aprovado sem preço, custo e margem verificados.

---

## 4. Campos mínimos da tabela de catálogo

Cada item deve ter todos os campos abaixo preenchidos ou explicitamente marcados como ausentes:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sku` | string | Código único do item na planilha/ERP |
| `descricao` | string | Descrição completa conforme fonte |
| `marca` | string | Fabricante/marca |
| `tipo` | string | Família (registro esfera, gaveta, hidráulica, etc.) |
| `diametroNominalMm` | number \| ausente | Diâmetro nominal em mm; ausente se não identificável |
| `pressaoPN` | number \| ausente | PN em mca (ex.: 40, 80) ou ausente se não informado |
| `unidade` | string | `un`, `pc`, etc. |
| `custo` | number \| ausente | Custo unitário (R$) conforme planilha; ausente se não informado |
| `precoVenda` | number \| ausente | Preço de venda unitário (R$); ausente se não informado |
| `estoque` | string | Quantidade ou "sem info" |
| `statusPreco` | string | `ok`, `ausente`, `suspeito` |
| `statusCusto` | string | `ok`, `ausente`, `maior_que_preco` |
| `usarNoMotor` | string | `sim`, `não`, `pendente` |
| `motivoBloqueio` | string | Razão se `usarNoMotor != sim` |
| `fonte` | string | Nome do arquivo/planilha e aba/linha |
| `recomendacao` | string | Decisão proposta pelo revisor |
| `pendencia` | string | O que falta para aprovar; vazio se aprovado |

---

## 5. Status de classificação

| Status | Critério |
|--------|----------|
| `aprovado_automatico` | Tem SKU, descrição, marca, diâmetro, PN, custo, preço, margem positiva, uso aprovado em campo |
| `candidato_sem_preco` | Item identificado mas falta preço de venda ou custo |
| `candidato_validacao_tecnica` | Preço existe mas há dúvida sobre diâmetro, PN ou adequação ao uso como section_valve |
| `nao_usar_no_motor` | Item identificado mas descartado para uso automático (ventosa, solenoide, etc.) |

---

## 6. Regras de bloqueio automático

Um item **nunca pode ser marcado como `aprovado_automatico`** se qualquer condição abaixo for verdadeira:

- Preço de venda ausente ou zero.
- Custo ausente ou zero.
- Custo ≥ preço de venda (margem negativa ou nula).
- Diâmetro nominal não identificável.
- Tipo incompatível com corte de seção em irrigação por aspersão convencional.
- Válvula hidráulica BERMAD sem validação técnica e comercial completa.

---

## 7. Critérios de aceite

- [ ] Todos os candidatos extraídos das fontes listadas e classificados.
- [ ] Nenhum item marcado como `aprovado_automatico` com preço, custo ou diâmetro ausentes.
- [ ] Nenhum item com `custo ≥ precoVenda` marcado como `aprovado_automatico`.
- [ ] Válvulas BERMAD classificadas como `candidato_validacao_tecnica` (no mínimo) enquanto sem preço/validação.
- [ ] Registro PVC esfera pode ser `aprovado_automatico` somente se: preço ok, custo ok, margem positiva, diâmetro identificado, PN identificado, uso em campo validado.
- [ ] Relatório indica explicitamente quais SKUs alimentam a TASK-006 e quais ainda bloqueiam.
- [ ] Nenhum arquivo em `src/` foi alterado.

---

## 8. Produto esperado

**`docs/relatorios/catalogo-valvulas-candidatas.md`**

Contendo:

1. **Tabela de candidatos** com todos os campos da seção 4, uma linha por item.
2. **Resumo por família** — quantos aprovados, pendentes e descartados por tipo.
3. **Lista de SKUs prontos para TASK-006** — somente os `aprovado_automatico`.
4. **Lista de pendências** — o que falta para desbloquear cada candidato.
5. **Recomendação de família padrão** — qual tipo de válvula usar como padrão para `section_valve` em irrigation projects da Brasmáquinas.

---

## 9. Dependências

| Tarefa | Relação |
|--------|---------|
| TASK-005 | Predecessor — identificou a lacuna e criou o blocker |
| TASK-006 | Bloqueada por esta tarefa — aguarda lista de SKUs aprovados |

---

## 10. O que não será feito nesta tarefa

- Não implementar BOM de válvulas.
- Não cadastrar nada em `aspersores.ts`.
- Não resolver o blocker da TASK-005 no código.
- Não selecionar válvula por diâmetro automaticamente.
- Não alterar solver, layout, setorização ou geometria.
