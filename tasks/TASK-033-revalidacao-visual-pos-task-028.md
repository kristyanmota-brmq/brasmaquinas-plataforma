# TASK-033 — Segunda rodada de validação visual pós-TASK-028

**Status:** `concluída` (aprovada)
**Prioridade:** P2-importante
**Classe:** E — Exploratória
**Área:** validação / governança / ui
**Criado em:** 2026-05-21
**Atualizado em:** 2026-05-21
**Concluída em:** 2026-05-21 · 747/747 testes · 0 erros tsc · `src/` não alterado
**Relatório:** [`docs/relatorios/2026-05-21-TASK-033.md`](../docs/relatorios/2026-05-21-TASK-033.md)

---

## Objetivo

> Revalidar no browser real (via Playwright MCP) o Projeto A da TASK-027 (`cmpfu7e4b0001ulshh0ni8jhd` em Barreiras/BA) após a TASK-028, confirmando empiricamente que a lateral física agora passa pelos aspersores via `routeCoords` e que o blocker *"Aspersor fora do eixo da lateral física"* deixou de disparar. Produto único: relatório de achados em `docs/relatorios/2026-05-21-TASK-033.md`. **Nenhum arquivo em `src/` é alterado.**

---

## Contexto

A TASK-027 identificou o achado **F7** — no Projeto A criado em Barreiras/BA (4.87 ha, 337 aspersores 5022-SD), o sistema gerou **21 laterais com desvio máximo de 7,00 m** contra o eixo canônico, disparando blocker *"Aspersor fora do eixo da lateral física"*.

A TASK-028 corrigiu a causa-raiz: `PhysicalColumn`/`Lateral` ganharam `routeCoords` (polilinha 0°/90° passando pelos aspersores). O cenário sintético equivalente (T28-8 em `lateral-route.test.ts`, S-suave ±0,4 m) deixou de gerar blocker.

A TASK-033 é a **revalidação empírica** dessa correção no mesmo projeto real que originou o achado — não em fixture sintético. Esta é a regra de governança da TASK-024D: validações visuais devem ser registradas formalmente, e correções de blockers críticos precisam de evidência no projeto real, não apenas em teste.

---

## Arquivos impactados

| Arquivo | Tipo de mudança | Notas |
|---------|-----------------|-------|
| `tasks/TASK-033-revalidacao-visual-pos-task-028.md` | criação | este arquivo |
| `docs/relatorios/2026-05-21-TASK-033.md` | criação | relatório de achados |
| `docs/relatorios/evidencias/2026-05-21-TASK-033/` | criação | screenshots e snapshots |
| `tasks/backlog.md` | modificação | escopo TASK-033 cirúrgico + remanejar TASK-014/TASK-007/cenário-limpo |
| `src/**/*` | **inalterado** | regra explícita |
| `package.json`, lockfiles | **inalterados** | regra explícita |

---

## Pontos de validação

1. **Laterais físicas passam pelos aspersores** — visualizar no mapa em zoom alto que cada lateral é polilinha que efetivamente toca cada aspersor.
2. **Blocker "Aspersor fora do eixo da lateral física"** — deve **ter desaparecido** do topo da sidebar. Se persistir: capturar screenshot, mensagem exata, IDs e contagens.
3. **Novos blockers angulares** — verificar se as dobras 90° introduzidas pela rota geraram blockers em `network-angle-diagnostics` (ramal↔lateral).
4. **Render de `routeCoords`** — confirmar via DOM (canvas Mapbox renderiza polilinha) e via inspeção do `physicalColumnsGeoJSON` no estado React.
5. **Status geral do projeto** — sidebar atualizado, BOM consistente, botão PDF e seu comportamento (gate 422 se houver blockers; sucesso caso contrário).

---

## Critérios de aceite

- [ ] Servidor `localhost:3000` confirmado ativo antes da navegação.
- [ ] Projeto `cmpfu7e4b0001ulshh0ni8jhd` confirmado presente no banco antes de qualquer ação no projeto.
- [ ] Se o projeto não existir, **não recriar sem autorização** explícita do usuário.
- [ ] Os 5 pontos de validação foram observados e registrados (com evidência foto/snapshot).
- [ ] Cada achado tem severidade (Crítico / Alto / Médio / Baixo) e ação recomendada.
- [ ] Conclusão geral: blocker resolvido / parcialmente resolvido / não resolvido / regressão.
- [ ] `tasks/backlog.md` atualizado.
- [ ] `npx vitest run` continua **747/747** (validação manual não altera código).
- [ ] `npx tsc --noEmit` continua **0 erros**.
- [ ] Nenhum arquivo em `src/` foi modificado.

---

## Fora do escopo

- Corrigir bugs encontrados durante a validação.
- Alterar `src/`, catálogo, motor A/B/C, PDF, schemas Prisma, rotas de API.
- Recriar o projeto fictício sem autorização.
- Validação completa de TASK-014 (labels 2/3/4 setores) — remanejada para task futura.
- Validação de TASK-007 (busca por endereço) — remanejada para task futura.
- Cenário 1 limpo / caminho feliz — remanejada para task futura.
- Implementação de TASK-035 (BOM de curvas 90°).

---

## Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Banco resetado entre sessões — projeto não existe | média | alto | Verificar `/projetos` antes; abortar e pedir autorização para recriar |
| Servidor dev derrubado | baixa | médio | Verificar HTTP 200 antes; subir `npm run dev` se necessário (não-bloqueante) |
| Sessão Clerk no profile do Playwright expirada | média | baixo | Pedir login manual na janela do Chromium (mesmo fluxo da TASK-027) |
| Blocker persistir mesmo após TASK-028 (causa-raiz incompleta) | média | alto | Registrar como achado; recomendar nova task Classe A com causa provável |
| Surgirem novos blockers angulares por dobras 90° na lateral | média | médio | Esperado se houver dobras; registrar e propor TASK-035 ampliada |
| BOM não contar dobras 90° (já conhecido) | confirmada | baixo | Registrar como evidência da pendência aberta TASK-035 |

**Dependências:** TASK-028 concluída (sim). Servidor dev rodando. Banco com Projeto A persistido.

---

## Plano de execução

1. **Pré-condições**
   - `curl localhost:3000` → 200 (confirmado: ✓)
   - Verificar Playwright MCP disponível (confirmado: ✓)
   - Criar diretório de evidências (confirmado: ✓)

2. **Navegação inicial**
   - Abrir `/projetos`; verificar autenticação Clerk.
   - Buscar o card do Projeto A; se ausente → abortar e pedir autorização.

3. **Captura do estado**
   - Abrir o projeto; capturar snapshot completo da sidebar (blockers + avisos).
   - Comparar lista atual de blockers com a da TASK-027 (que tinha 2).

4. **Validação visual da rota**
   - Zoom no mapa; screenshot mostrando se laterais são retas (regressão) ou polilinhas (TASK-028 ok).
   - Inspecionar via `browser_evaluate` o `physicalColumnsGeoJSON` da página para confirmar `coordinates` com ≥ 2 pontos.

5. **Validação do PDF**
   - Verificar se botão está habilitado/desabilitado e qual a resposta ao clique (com ou sem blockers ativos).

6. **Console e network**
   - Capturar warnings/errors do console.
   - Capturar respostas de network relevantes.

7. **Compilação**
   - Compilar achados, severidades e ações recomendadas no relatório.
   - Atualizar backlog.

---

## Pendências abertas

- [ ] Confirmação do estado do banco (Projeto A presente?)
- [ ] Decisão sobre TASK-035 — se BOM não contabilizar dobras 90° (esperado), reforçar a recomendação.

---

## Formato de resposta esperado

Ao concluir, esta task responderá com:

1. **O que foi feito** — navegação, capturas, inspeção DOM.
2. **Pontos validados** — 5 pontos cobertos ou justificativa de não-cobertura.
3. **Achados** — tabela severidade + ação recomendada.
4. **Estado da suíte** — `tsc` e `vitest` reconfirmados ao final.
5. **Conclusão** — blocker resolvido / parcial / não resolvido / regressão.
6. **Próximas tasks** — TASK-035 e quaisquer novas Classe A se erros persistirem.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-21 | Claude Opus 4.7 | Tarefa criada após `/iniciar-task`. Escopo cirúrgico: revalidação pós-TASK-028. TASK-014 / TASK-007 / cenário-limpo remanejados para tasks futuras. |
| 2026-05-21 | Claude Opus 4.7 | Execução: navegação Playwright MCP ao Projeto A real (`cmpfu7e4b0001ulshh0ni8jhd`); 4 screenshots + 14 snapshots/logs em `evidencias/`; sidebar comparada com TASK-027 (1 blocker vs. 2; +1 aviso PN/HMT; BOM +R$ 49.136). **Blocker "Aspersor fora do eixo da lateral física" eliminado**. Sem blockers angulares novos. Gate PDF 422 funciona; UI sem feedback (F1 da TASK-027 persiste — já reservado em TASK-034). 8 achados (G1–G8) classificados; G2/G3 endereçados por TASK-031, G5 por TASK-035, G6 por TASK-034. **Conclusão: aprovado**. 747/747 testes · 0 erros tsc · `src/` intacto. Relatório: `docs/relatorios/2026-05-21-TASK-033.md`. |
