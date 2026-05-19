# Logs e Auditoria

---

## 1. ADRs — Architecture Decision Records

Toda decisão arquitetural significativa é registrada em `docs/decisoes/`.

### Quando criar um ADR

- Adição ou remoção de uma dependência de biblioteca
- Mudança no contrato de uma API pública de domínio (tipos exportados, assinaturas de função)
- Mudança na fórmula ou critério hidráulico
- Escolha entre duas abordagens técnicas alternativas com trade-offs
- Decisão que vai contra o padrão estabelecido
- Mudança de fornecedor ou SKU no catálogo com impacto em projetos existentes

### Quando NÃO criar um ADR

- Refatoração interna sem mudança de contrato
- Correção de bug com solução óbvia
- Adição de novos testes
- Atualização de preços no catálogo

### Nomenclatura

```
ADR-001-titulo-kebab-case.md
ADR-002-titulo-kebab-case.md
```

Usar `docs/decisoes/ADR-000-template.md` como ponto de partida.

---

## 2. Handoffs de sessão

Sessões longas de desenvolvimento geram um documento de handoff em `HANDOFF.md` na raiz do repositório.

O handoff deve conter:
- Data e contagem de testes no momento do handoff
- O que foi feito (resumo por tarefa)
- Estado atual de cada arquivo modificado
- Decisões tomadas durante a sessão
- Pendências e próximos passos
- Números de sanidade (HMT, HF, etc. se aplicável)

`HANDOFF.md` é **sobrescrito** a cada sessão (não é um log cumulativo). O histórico está no git.

---

## 3. Relatórios de auditoria

Relatórios técnicos gerados durante auditorias (e.g., before/after de cálculo hidráulico) ficam em `docs/relatorios/`.

Nomenclatura sugerida:
```
docs/relatorios/YYYY-MM-DD-auditoria-hidraulica-v2.md
docs/relatorios/YYYY-MM-DD-before-after-hmt-L-P.md
```

Estes arquivos são **permanentes** — não são sobrescritos. Se a análise for atualizada, criar novo arquivo com nova data.

---

## 4. Log de alterações no catálogo

Toda alteração em `src/lib/catalog/aspersores.ts` deve ser registrada:

| Campo alterado | O que exige |
|---------------|-------------|
| `precoVenda` | Comentário no commit com fonte da cotação |
| `diametroInternoMm`, `espessuraParedeMm` | ADR com referência ABNT ou catálogo do fabricante |
| Novo item (novo SKU) | Comentário no commit + task de BOM se alterar seleção de tubo |
| Remoção de item | ADR + migração de projetos que o referenciam |

---

## 5. Rastreabilidade de tarefas

Cada tarefa no backlog deve ser rastreável ao código:

```
tasks/backlog.md → tasks/TASK-00X.md → commits git (mensagem referencia TASK-00X)
```

Commits que implementam uma tarefa devem mencionar o número da tarefa:
```
feat(hidráulica): dimensionamento individual de ramais (TASK-002)
fix(bom): agrupar ramais por SKU próprio — remove herança do tubo da principal (TASK-002)
```

---

## 6. Números de sanidade registrados

Manter atualizado neste documento (ou em `docs/relatorios/`) os números de referência para os projetos de teste:

**Projeto L** (~448 asp, 14 setores) — 2026-05-19:
```
HMT = 43,99 mca
hfAdutora = 0,69 mca | hfPrincipal = 6,98 mca | hfRamal = 0,09 mca
hfLateral = 3,14 mca | localLosses = 1,09 mca | margem = 2,00 mca
setor crítico: setor 13
```

**Projeto P** (~768 asp, 14 setores) — 2026-05-19:
```
HMT = 50,83 mca
hfAdutora = 0,78 mca | hfPrincipal = 8,45 mca | hfRamal = 0,17 mca
hfLateral = 7,72 mca | localLosses = 1,71 mca | margem = 2,00 mca
```

Se uma tarefa alterar o solver e esses números mudarem, o novo valor deve ser registrado aqui com data.

---

## 7. Checklist de auditoria técnica

Para auditorias periódicas do solver hidráulico:

```
[ ] Verificar HMT dos projetos L e P contra os números de sanidade acima
[ ] Verificar que diâmetro interno é usado em todos os cálculos de hf
[ ] Verificar que Christiansen F é aplicado nas laterais
[ ] Verificar que caminho crítico é exaustivo
[ ] Verificar que pumpValidation.designFlowM3h = maxSectorFlow
[ ] Verificar que sizedSecondaries agrupa por SKU próprio na BOM
[ ] Confirmar: npx tsc --noEmit → 0 erros
[ ] Confirmar: npx vitest run → todos passando
```
