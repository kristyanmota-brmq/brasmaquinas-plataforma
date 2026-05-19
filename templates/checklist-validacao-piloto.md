# Checklist de Validação — Projeto Piloto

Preencher para cada projeto real usado na validação de campo.
Referência: `docs/metodologia/10-validacao-de-campo.md` — Etapa 5.

---

## Identificação

- **ID da validação:** VAL-YYYY-MM-DD-001
- **Projeto:** [nome ou código interno]
- **Área (ha):**
- **Cultura:**
- **Município/UF:**
- **Data de geração da proposta pelo software:**
- **Versão do software:**
- **Projetista responsável:**
- **RT responsável:**

---

## Dados de entrada utilizados

- [ ] Área confirmada com o cliente
- [ ] Topografia informada (desnível, cotas disponíveis)
- [ ] Tipo de solo informado
- [ ] Aspersor selecionado e justificado
- [ ] Pressão de serviço definida
- [ ] Bomba informada — ou proposta marcada como preliminar (sem bomba)
- [ ] Jornada diária e número de turnos definidos
- [ ] Espaçamento entre laterais e entre aspersores definido

---

## Referência de comparação

Qual referência foi usada para comparar com o resultado do software:

- [ ] Projeto executivo antigo da empresa para a mesma tipologia
- [ ] Planilha de cálculo hidráulico validada pelo projetista
- [ ] Cálculo manual do projetista (feito de forma independente antes de ver o resultado do software)

**Referência:** [descrever — arquivo, data, autor, origem]

---

## Comparação de HMT

| Componente | Software (mca) | Referência (mca) | Divergência (mca) | Divergência (%) | Aceitável? |
|-----------|:--------------:|:----------------:|:-----------------:|:---------------:|:----------:|
| hfAdutora | | | | | |
| hfPrincipal | | | | | |
| hfRamal | | | | | |
| hfLateral | | | | | |
| localLosses | | | | | |
| desnível geodético | | | | | |
| margem | | | | | |
| **HMT total** | | | | | |

**Critério de aceitação de HMT:** `[PENDENTE DE VALIDAÇÃO — RT]`

---

## Comparação de BOM (principais itens)

| SKU / Descrição | Qtd software | Qtd referência | Divergência | Divergência (%) | Aceitável? |
|----------------|:------------:|:--------------:|:-----------:|:---------------:|:----------:|
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

**Critério de aceitação de BOM:** `[PENDENTE DE VALIDAÇÃO — RT]`

---

## Comparação de setorização

- **Nº de setores gerado pelo software:**
- **Nº de setores da referência:**
- **Diferença:** aceitável / não aceitável / sem referência disponível

---

## Classificação de projeto

- **Classe atribuída pelo software (quando implementado):** A / B / C / não implementado
- **Classe que o projetista atribuiria manualmente:**
- **Concordância:** sim / não

---

## Divergências registradas

| ID | Descrição | Gravidade | Status | Responsável pela análise |
|----|-----------|:---------:|--------|--------------------------|
| | | bloqueante / warning / obs | aberta / corrigida / aceita como limitação | |
| | | | | |
| | | | | |

---

## Resultado

- [ ] **GO** — proposta aprovada para uso interno; divergências dentro do limite aceitável
- [ ] **GO COM RESTRIÇÕES** — proposta aprovada com limitações documentadas abaixo
- [ ] **NO-GO** — divergências bloqueantes pendentes; uso comercial não liberado

**Justificativa e limitações aceitas:**

---

## Próximos passos

- [ ] Registrar resultado em `docs/relatorios/` usando `templates/resumo-validacao-campo.md`
- [ ] Atualizar critérios de Classe A/B em `09-classificacao-de-projetos.md` se novos limites forem identificados
- [ ] Atualizar `docs/software/testes-e-homologacao.md` com status das divergências resolvidas
- [ ] Comunicar resultado ao RT e gestão comercial

---

## Assinaturas

| Papel | Nome | Data | Resultado |
|-------|------|------|-----------|
| Projetista responsável | | | aprovado / reprovado |
| RT | | | aprovado / reprovado |
| Agrônomo (se aplicável) | | | aprovado / reprovado / não aplicável |
