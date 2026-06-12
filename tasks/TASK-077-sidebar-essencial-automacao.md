# TASK-077 — Sidebar essencial + automação (bomba automática)

**Status:** `concluída`
**Prioridade:** P1-crítico
**Classe:** B — UI / apresentação + helper puro de domínio
**Área:** ui / layout
**Criado em:** 2026-06-12
**Concluída em:** 2026-06-12 · **1001/1001 testes vitest** (+4 T77) · 0 erros tsc
**Relatório:** `docs/relatorios/2026-06-12-TASK-077.md`
**Autorização:** ordem direta do usuário (RT): "remova esse monte de informação do lado direito… só o essencial… mínimo de coisas manual… máximo de funções automáticas"

---

## O que mudou

1. **Resumo do projeto (automático)** — único bloco sempre visível no sidebar: Área · Aspersores (qtd + modelo) · Setores · Vazão/setor · HMT · Bomba (automática) · Investimento + margem interna compacta.
2. **CTA única**: botão primário "Gerar proposta (PDF)" (mesmo handler/gate do toolbar — HTTP 422 da governança intacto).
3. **Tudo manual/técnico recolhido** em `<details>` "Configurações e ajustes técnicos" (fechado por padrão): área/captação/remover, bomba manual, traçado/arquitetura A0-A3/candidatos/corredor, otimizador, seletor de aspersor, setorização fina (lâmina/cultura/jornada/critério), BOM detalhada, margem E08, "Como usar".
4. **Avisos** viram contador expansível "Avisos (N) · ver detalhes". **Blockers e RT-pending continuam sempre abertos** — gate de governança não se esconde.
5. **Bomba automática**: novo helper puro `src/lib/layout/pump-auto-select.ts` (`selectBombaAutomatica`) — escolhe do catálogo homologado a bomba de MENOR folga que atende vazão do setor + HMT (evita superdimensionar); `useEffect` aplica quando nenhum conjunto foi escolhido e a hidráulica está calculada. Nenhuma bomba atende → null (decisão volta ao humano; gate T65-3 do solver preservado). Override manual permanece nas Configurações.

## Testes

T77-1 (menor folga, não a maior) · T77-2 (descarta quem falha em 1 requisito) · T77-3 (nenhuma atende → null) · T77-4 (entradas inválidas → null). 997 → 1001.

## Verificação ao vivo (Fazenda do Paulo, browser com sessão)

Sidebar: AVISOS (5) compacto · resumo com 4,85 ha / 346·5022-SD / 14 setores / 37,5 m³/h / HMT 35,8 / **IMBIL INI BLOC 65-160 (automática)** / R$ 110.998,95 / margem 52,3% · CTA PDF · painel avançado abre íntegro com todo o conteúdo anterior.

## Fora do escopo

- Mudar default da setorização (agronômica vs jornada) — mudaria resultados de projetos salvos; toggle continua nas Configurações (decisão RT explícita futura)
- Auto-aplicar traçado do motor sobre traçado manual existente (destrutivo — botão preservado nas Configurações)
