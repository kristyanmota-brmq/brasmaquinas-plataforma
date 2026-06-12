# TASK-066 — Custos de aquisição no catálogo (relatório de conferência)

**Data:** 2026-06-12 · **Fonte primária:** "Planilha de preço atualizados - fornecedores - preço de custo e venda - 25.08.2025.xlsx" (Downloads do usuário; 34 abas de fornecedores)
**Autorização:** "Dentro do nosso arquivo tem uma lista de produtos com todos os custos. Pode utilizar ela por enquanto."

## Método (auditável)

1. **Fator de markup Tigre observado**: na aba TIGRE TUBOS, `precoVenda ÷ precoCusto = 1,5456` é EXATO e uniforme em todas as linhas (verificado: 61,947648/40,08 = 179,351424/116,04 = 1,5456). É a política de precificação da casa para a linha Tigre.
2. **28 itens com `custo: 0`** no catálogo (tubos LF, curvas, tês, kit do aspersor, adesivo) receberam **custo estimado = precoVenda ÷ 1,5456**, marcado item a item com `/* T066: custo estimado ÷1,5456 — PENDENTE_CONFERENCIA */`.
3. **Não alterados**: tubos rígidos PN80, aspersores, registros VIQUA — já tinham custo real de fornecedor (TASK-006A/060); a aba VIQUA da lista confirma a mesma ordem de grandeza (ex.: registro soldável 75: lista 89,32 vs catálogo 89,32-equivalente).
4. **Nenhum precoVenda alterado** — regra do catálogo preservada.

## Limitações declaradas

- Itens não-Tigre estimados pelo fator Tigre (PTI tee 1", bucha, adesivo PLASTUBOS, kit sem marca): o fator real desses fornecedores pode diferir (VIQUA = 1,67) — margem real pode ser ±8%.
- Tubos LF PN40 não constam na aba TIGRE TUBOS (que lista PN125 PBL/DEFOFO) — estimativa pelo fator é o melhor dado disponível hoje.
- **Manutenção futura**: o usuário definirá processo de atualização (ex.: integração Sankhya via skill analista-sankhya).

## Efeito

`BOMItem.custo` agora é real/estimado em 100% das famílias core (T66-1: custo > 0 e custo < precoVenda em todos) — **análise de margem habilitada** para o E08.
