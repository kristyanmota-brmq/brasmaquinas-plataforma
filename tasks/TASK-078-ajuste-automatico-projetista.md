# TASK-078 — Ajuste automático do projetista (setorização → arquitetura → bomba)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** A — motor de layout / domínio + UI
**Área:** layout / domínio / ui
**Criado em:** 2026-06-12
**Concluída em:** 2026-06-12 · **1005/1005 testes vitest** (+4 T78) · 0 erros tsc
**Relatório:** `docs/relatorios/2026-06-12-TASK-078.md`
**Autorização:** ordem direta do usuário/RT: "Quero que você ajuste e dando certo. Quero que corrija isso no nosso software." (sequência da análise do PPPP: nenhum candidato A0/A2/A3 validava; A0 era fallback)

---

## O que mudou

Novo módulo puro [`architecture-auto-tune.ts`](../src/lib/layout/architecture-auto-tune.ts) — `tuneSectorizationForValidArchitecture()` reproduz a decisão do projetista profissional quando a rede não fecha:

1. **Gatilhos** (qualquer um): (a) seletor A0/A2/A3 sem candidato válido; (b) solver oficial com secundárias fora de limite; (c) rede OK mas **nenhuma bomba homologada** atende o ponto de operação (e nenhuma escolhida manualmente).
2. **Ação**: aumenta o número de setores (+1..+6, menor mudança operacional primeiro), reconstrói `sectorIndices` (mesmo `buildSectorsByFlowWithColumnSplitting` do produto), re-avalia candidatos pelo motor homologado.
3. **Aceitação dupla**: candidato válido no seletor **E** zero secundárias fora de limite no **solver oficial** com o traçado vencedor aplicado (fonte única de verdade — o avaliador preliminar diverge em casos-limite, comprovado ao vivo no PPPP: 10 setores passavam no avaliador e falhavam no solver).
4. **Critério do projetista**: entre os n válidos, prefere o primeiro que também tem **conjunto moto-bomba homologado** (menor folga); sem nenhum n com bomba, devolve o primeiro válido apenas se a rede estava inválida (não re-setoriza projeto saudável só por falta de bomba → null, humano decide).
5. **UI**: aplica setorização + traçado vencedor + bomba sugerida; banner "Ajuste automático do projetista" com o resumo da decisão; guard contra re-tentativa em loop; nunca sobrepõe traçado manual (efeito já retornava antes).

**Nenhum gate relaxado** — só re-setorização e re-avaliação pelos mesmos critérios (doc 13, ADR-015, NRCS 1,5 m/s).

## Validação ao vivo (PPPP, browser com sessão real)

- Estado inicial: 9 setores · 81 m³/h · nenhum candidato válido · 4 secundárias até 1,77 m/s · sem bomba possível · BOM R$ 364.773.
- 1ª iteração (critério fraco — corrigido): 10 setores; avaliador ok, solver ainda reprovava → motivou a aceitação dupla.
- **Estado final automático: 11 setores · 66 m³/h · arquitetura A2 validada · 0 secundárias fora de limite · bomba EBARA GSD MEGABLOC 30 CV aplicada · BOM R$ 340.445 · banner explicativo · autosave.**
- Pendências legítimas que ficam com o RT (fora do escopo do tune): 4 laterais PN40 com pressão de derivação ~50 mca quando o setor próximo à entrada opera (`violation_confirmed` — decidir entre regulagem no registro de seção / classe maior / TASK-053-valves); rótulo genérico do blocker do solver (diz "velocidade ou perda" quando a causa é PN — Fase 3 "blockers estruturados" do roadmap).

## Testes (T78, fixture campo em rampa 16×8)

T78-1 precondição (1 setor → 192 m³/h → nenhum candidato válido) · T78-2 ajusta para o menor n válido com aceitação OFICIAL (0 fora de limite no `layoutAjustado`) · T78-3 rede saudável → null · T78-4 limite de busca → null. 1001 → 1005.

## Decisões de engenharia registradas

- Critério "menor mudança operacional" (primeiro n que valida), não "menor BOM entre todos os n" — mais setores = jornada maior; refinamento por comparação de BOM fica como trilho futuro se o RT quiser.
- Catálogo de bombas tem só 2 conjuntos (PENDENTE_CONFIRMACAO_RT) — o gatilho (c) ficará mais útil à medida que o catálogo crescer.
