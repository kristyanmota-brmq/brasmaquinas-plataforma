# project-state — snapshot resumido (TOOL-001)

> Atualizado manualmente. Não é gerado por script. Serve como contexto para o GPT Reviewer.

**Última atualização:** 2026-05-22

---

## Métricas

- **Testes (produto):** 817/817 passando (baseline pós-TASK-035)
- **TypeScript:** 0 erros (`npx tsc --noEmit`)
- **Testes (tooling TOOL-001):** 20/20 passando (`node scripts/ai/__tests__/run-all.mjs`) — pista separada
- **Working tree:** modificado (TASK-027→046 + ADRs 012-emenda/013/014/015 + TOOL-001)
- **Branch:** main
- **Série visual TASK-027 → TASK-046:** FECHADA com sucesso

---

## Última task concluída

**TASK-035 — BOM de curvas 90° em sub-laterais com `routeCoords`** (2026-05-22)

- +8 testes (T35-a..T35-h)
- 0 erros TypeScript
- Catálogo intocado
- Projeto A: BOM permanece R$ 213.740,15 no caminho feliz (todas as colunas com `routeCoords.length === 2`)

---

## Pendências abertas

- **TASK-034** (Classe A) — Feedback visual no clique do PDF com blockers ativos (sugerida como próxima de produto)
- **TASK-024E** — em planejamento (paralela e independente)
- **TOOL-002** (sugerida) — primeira task real não-autorreferente a passar pelo fluxo TOOL-001
- **TASK-XXX documental** (sugerida) — promover regra "violação de invariante permanente é terminal" a RB-09 em `01-regras-bloqueantes.md`
- **Homologação RT pendente:** SKU curva 90° LF DN50 (`docs/relatorios/2026-05-22-TASK-035.md`)
- **Calibração RT pendente:** valor 0,10 m de tolerância em fazendas > 500 m
- **Calibração RT pendente:** `OPTIMIZER_PARAMS` premissas provisórias (ver `docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`)

---

## Invariantes permanentes

(Fonte única: [`scripts/ai/lib/invariants.mjs`](../scripts/ai/lib/invariants.mjs); descrição abaixo é literal.)

1. **INV-CATALOGO-SEM-HOMOLOGACAO** — Não alterar catálogo sem SKU homologado.
2. **INV-NAO-INVENTAR-SKU** — Não inventar SKU.
3. **INV-DN100-LATERAL-5022** — Não voltar DN100 como lateral 5022.
4. **INV-BLOCKERS-TECNICOS** — Não relaxar blockers técnicos.
5. **INV-MASCARAR-PENDENCIA** — Não mascarar pendência.
6. **INV-DOMINIO-FORA-UI** — Não colocar lógica de domínio na UI.
7. **INV-LAYOUT-INSTAVEL-COMERCIAL** — Não avançar para BOM/comercial se layout/hidráulica/construtibilidade estiverem instáveis.

**Regra terminal:** se o GPT marcar qualquer invariante `violada`, `override_permitido` derivado pelo validador = `false`. Override humano **não libera**. Saídas legítimas: reformular plano + voltar ao `/planejar`, ou abrir task documental específica.

---

## Comandos úteis

```bash
# Rodar revisão do GPT na task ativa
node scripts/ai/run-gpt-review.mjs --task TOOL-XXX

# Validar estrutura (read-only)
node scripts/ai/validate-structure.mjs --task TOOL-XXX

# Rodar testes do tooling
node scripts/ai/__tests__/run-all.mjs
```
