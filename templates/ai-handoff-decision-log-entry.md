# Entry de `decision-log.md` — template

> Bloco YAML modelo para acrescentar a `ai/decision-log.md`.
> **NUNCA apagar entries anteriores.** Validador rejeita PR onde o log encolher vs. HEAD.

---

## Caso comum (sem override)

```yaml
timestamp: 2026-MM-DDTHH:mm:ss-03:00
task_id: TASK-XXX
decision_point: pos_planejamento  # ou pos_implementacao_revisao | pos_fechamento
veredito_gpt: aprovado_com_ajustes
decisao_humana: aprovado_com_ajustes  # ou aprovado | reprovado
responsavel: Seu Nome
justificativa: |
  Texto explicando a decisão. Pode ser curto neste caso.
override: false
ajustes_aplicados: ["ajuste 1", "ajuste 2"]
hash_gpt_review: <sha256 hex de ai/gpt-review.md no momento da decisão>
```

## Caso de override (humano contraria GPT em ponto NÃO-invariante)

```yaml
timestamp: 2026-MM-DDTHH:mm:ss-03:00
task_id: TASK-XXX
decision_point: pos_planejamento
veredito_gpt: reprovado
decisao_humana: aprovado
responsavel: Seu Nome
justificativa: |
  Texto >= 80 caracteres explicando POR QUE o humano discorda do GPT. Validador rejeita justificativa curta — força reflexão.
override: true
risco_assumido: "Descrição clara do risco que estou assumindo conscientemente"
hash_gpt_review: <sha256 hex>
```

## Caso de invariante permanente violada

**ATENÇÃO:** override **não libera** violação de invariante permanente.

Se o GPT marcar qualquer invariante `violada`, o validador deriva `override_permitido = false` e a task entra em status `bloqueado_invariante_permanente`. As únicas saídas legítimas são:

1. **Reformular o plano** e voltar ao `/planejar`. A entry desta etapa não precisa de override:
   ```yaml
   timestamp: 2026-MM-DDTHH:mm:ss-03:00
   task_id: TASK-XXX
   decision_point: pos_planejamento
   veredito_gpt: blocker_invariante_permanente
   decisao_humana: reprovado
   responsavel: Seu Nome
   justificativa: |
     GPT apontou violação da invariante INV-XXX. Plano será reformulado.
   override: false
   hash_gpt_review: <sha256 hex>
   ```
2. **Abrir task documental específica** de governança técnica para revisar/refutar a invariante (ex.: promover regra a `RB-XX` em `docs/metodologia/01-regras-bloqueantes.md`). Essa nova task é uma decisão administrativa, não um override.

## Computando hash

```bash
node -e "import('./scripts/ai/lib/parsers.mjs').then(({sha256}) => import('node:fs').then(fs => console.log(sha256(fs.readFileSync('ai/gpt-review.md','utf8')))))"
```
