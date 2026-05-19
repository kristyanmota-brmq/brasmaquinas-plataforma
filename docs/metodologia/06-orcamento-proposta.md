# Orçamento e Proposta

---

## 1. Composição do orçamento

O orçamento é calculado diretamente da BOM:

```
totalGeral = Σ (quantidade × precoUnitario) para cada BOMItem
```

Preços são os valores `precoVenda` do catálogo (`src/lib/catalog/aspersores.ts`). Não há margem ou markup aplicado automaticamente — o preço de venda já está no catálogo.

> **Pendente:** o sistema atual não tem campo de margem de lucro por proposta. Adicionar se necessário.

---

## 2. Exportação da proposta

### 2.1 PDF

Gerado por `src/app/api/projetos/[id]/pdf/route.tsx` via `react-pdf/renderer`.

O PDF inclui:
- Dados do projeto (área, jornada, lâmina)
- Mapa (screenshot do mapa interativo — não implementado; placeholder)
- BOM completa por categoria
- Resumo financeiro
- Diagnósticos e alertas

> **Pendente:** o mapa no PDF ainda não é gerado automaticamente. Inserção manual ou screenshot.

### 2.2 Memorial descritivo (Markdown)

Exportado pelo componente `MemorialPanel.tsx` com:
- Tabela de laterais por setor
- Comprimentos, vazões e diâmetros selecionados

---

## 3. Gates de emissão

A proposta só deve ser emitida quando:

```
[ ] diagnostics.blockers.length === 0
[ ] diagnostics.hydraulicSolverStatus !== "blocked"
[ ] diagnostics.pumpValidationStatus === "ok" (ou "not_informed" com aceite explícito do RT)
[ ] constructabilityStatus !== "blocked"
```

Se `hydraulicSolverStatus = "calculated_pending_review"` (bomba não informada), a proposta pode ser emitida como **orçamento preliminar**, com ressalva explícita.

---

## 4. Campos de exibição (não calculados)

| Campo | Origem | Notas |
|-------|--------|-------|
| `areaHectares` | informado pelo usuário | não calculado geometricamente |
| Nome do cliente | não implementado | — |
| Data da proposta | não implementado | — |
| Responsável técnico | não implementado | — |
| Número da proposta | não implementado | — |

---

## 5. Revisão de preços

Preços no catálogo são `precoVenda` de referência. Para atualizar:

1. Verificar cotação atualizada com o fornecedor
2. Atualizar `precoVenda` no array correspondente em `aspersores.ts`
3. Não alterar `sku`, `diametroMm` ou campos técnicos sem evidência do fabricante
4. Documentar a atualização em ADR se for mudança significativa (troca de fornecedor, mudança de linha)

---

## 6. Limitações atuais

| Limitação | Status |
|-----------|--------|
| Frete não incluído | não implementado |
| Instalação não incluída | não implementado |
| Desconto comercial | não implementado |
| Imposto (ICMS, IPI) sobre materiais | não implementado |
| Múltiplos aspersores por projeto | não implementado |
