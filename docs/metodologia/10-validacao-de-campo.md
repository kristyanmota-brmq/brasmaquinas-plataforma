# Validação de Campo

**Versão:** 1.0
**Data:** 2026-05-19
**Status:** RASCUNHO — critérios de GO/NO-GO pendentes de aprovação por RT/agronômico/campo

---

## 1. Objetivo

Garantir que o software produz resultados tecnicamente confiáveis antes de ser usado internamente para geração de propostas comerciais. A validação de campo é o gate entre "software que calcula" e "software que vende".

Sem validação aprovada, o software é uma ferramenta de análise interna — não uma esteira de venda. Usar o software para emitir propostas sem validação transfere risco técnico para o cliente sem controle.

---

## 2. Escopo da validação

A validação cobre cinco dimensões:

| Dimensão | O que verificar |
|----------|----------------|
| Cálculo hidráulico | HMT calculada vs. campo (pressão medida + desnível real) |
| BOM | Quantitativos gerados vs. material realmente utilizado |
| Layout | Grade proposta vs. layout implantado ou aprovado por projetista |
| Setorização | Setores gerados vs. setores adotados no projeto real |
| Classificação | Se a classe atribuída ao projeto (A/B/C) corresponde ao perfil real |

---

## 3. Protocolo em 5 etapas

### Etapa 1 — Comparação com projetos antigos

**O que fazer:** Selecionar projetos executivos já implantados e aprovados pela empresa. Inserir os mesmos dados de entrada no software. Comparar HMT calculada vs. HMT do projeto original, BOM gerada vs. material fornecido, e setorização vs. setorização aprovada.

**Foco:** identificar desvios sistemáticos que indiquem erro de metodologia ou de dado de entrada.

**Critérios de aceitação:** `[PENDENTE DE VALIDAÇÃO — RT]`

**Responsável:** projetista + RT

**Produto:** relatório em `docs/relatorios/YYYY-MM-DD-comparacao-projetos-antigos.md`

---

### Etapa 2 — Comparação com planilhas validadas

**O que fazer:** Usar planilhas de cálculo hidráulico já validadas pela equipe técnica como referência. Reproduzir os mesmos projetos no software e comparar os valores calculados.

**Foco:** divergências em HMT, `hfPrincipal`, `hfLateral` — especialmente onde diâmetro interno real difere do nominal, o que muda o resultado de Hazen-Williams.

**Critérios de aceitação:** `[PENDENTE DE VALIDAÇÃO — RT]`

**Responsável:** projetista

**Produto:** relatório em `docs/relatorios/`

---

### Etapa 3 — Revisão por projetista

**O que fazer:** O projetista percorre os resultados do software (layout, BOM, HMT, setorização, construtibilidade) para projetos típicos da empresa e emite parecer técnico.

**Foco:** identificar onde o software simplifica demais, onde é excessivamente conservador, onde está errado. Não é validação numérica — é avaliação qualitativa do resultado.

**Produto:** lista de divergências formalizadas; cada item tem: descrição, gravidade (bloqueante / warning / observação), responsável por corrigir, prazo.

---

### Etapa 4 — Simulações completas

**O que fazer:** Rodar o software para uma série representativa de projetos (variando área, topografia, cultura, espaçamento) e revisar sistematicamente os resultados.

**Foco:** cobrir o envelope técnico-comercial pretendido para Classe A. Identificar as fronteiras onde Classe A termina e Classe B começa — estas fronteiras se tornam os limites numéricos de `docs/metodologia/09-classificacao-de-projetos.md`.

**Critérios de aceitação:** `[PENDENTE DE VALIDAÇÃO — RT/agronômico]`

**Produto:** mapeamento do envelope validado; proposta de atualização dos critérios de Classe A em `09-classificacao-de-projetos.md`

---

### Etapa 5 — Proposta real piloto

**O que fazer:** Selecionar um projeto real que será implantado. Usar o software para gerar a proposta comercial. Comparar a proposta com o que o projetista teria produzido de forma independente. Se o projeto for implantado, comparar com o material realmente utilizado.

**Foco:** é o teste mais próximo das condições reais. Divergência aqui tem impacto direto em margem, satisfação do cliente e credibilidade técnica.

**Critérios de aceitação:** `[PENDENTE DE VALIDAÇÃO — RT/campo]`

**Produto:**
- Relatório em `docs/relatorios/` usando `templates/resumo-validacao-campo.md`
- Checklist `templates/checklist-validacao-piloto.md` preenchido e assinado

---

## 4. Registro de divergências

Toda divergência identificada durante as etapas deve ser registrada com:

| Campo | Conteúdo |
|-------|---------|
| ID | Sequencial por etapa (ex: `E1-DIV-003`) |
| Descrição | O que o software calculou vs. o que era esperado |
| Gravidade | `bloqueante` / `warning` / `observação` |
| Etapa | Em qual etapa foi encontrada |
| Responsável pela análise | projetista / RT / agrônomo |
| Status | `aberta` / `em análise` / `corrigida` / `aceita como limitação` |
| Resolução | Se corrigida: como. Se aceita: por quê e qual limitação registrar |

Divergências bloqueantes impedem GO. Divergências de warning são monitoradas. Divergências de observação são documentadas como limitações conhecidas.

---

## 5. Critérios mínimos para liberar uso interno (GO/NO-GO)

> ⚠️ Os critérios abaixo são propostos. **[PENDENTE DE VALIDAÇÃO — RT/agronômico/campo]** até aprovação formal.

| Critério | Tipo | Responsável pela validação |
|----------|------|--------------------------|
| Nenhuma divergência bloqueante aberta | bloqueante | RT |
| Divergência de HMT abaixo de limite aceitável | bloqueante — `[PENDENTE — limite a definir]` | RT |
| Divergência de BOM abaixo de limite aceitável | bloqueante — `[PENDENTE — limite a definir]` | projetista |
| Etapas 1, 2 e 3 concluídas com parecer técnico positivo | bloqueante | RT |
| Proposta piloto revisada e aprovada (Etapa 5) | bloqueante | RT + projetista |
| Checklist de homologação em `testes-e-homologacao.md` passou | bloqueante | RT |
| Critérios de Classe A definidos e homologados | bloqueante para uso comercial Classe A | RT |

**GO:** todos os critérios bloqueantes aprovados → uso interno liberado para propostas Classe A.

**NO-GO:** qualquer critério bloqueante pendente → uso restrito a análise interna e simulações.

---

## 6. Aprovação de uso por classe

| Classe | Gate para liberar uso | Status |
|--------|-----------------------|--------|
| Classe A | GO da validação + RT + critérios de Classe A homologados | `[PENDENTE]` |
| Classe B | GO da validação + RT + projetista disponível no processo de aprovação | `[PENDENTE]` |
| Classe C | Projeto executivo sempre obrigatório; software é ferramenta auxiliar do projetista | definido por processo |

---

## 7. Referências

- Checklist de validação de projeto piloto: `templates/checklist-validacao-piloto.md`
- Template de resumo de validação: `templates/resumo-validacao-campo.md`
- Critérios de homologação de software: `docs/software/testes-e-homologacao.md`
- Classificação de projetos: `docs/metodologia/09-classificacao-de-projetos.md`
- Disciplina operacional (quem conduz a validação): `docs/metodologia/11-disciplina-operacional.md`
