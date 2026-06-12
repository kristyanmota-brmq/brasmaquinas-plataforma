# Auditoria de prontidão comercial — "O sistema está pronto para fechar negócios?"

**Data:** 2026-06-12 · **Método:** (a) auditoria metodológica completa (subagent especialista, 39 leituras de arquivos); (b) **teste empírico do zero**: projeto novo criado no browser como um vendedor faria ("Auditoria — Teste do Zero", 31,8 ha, perfil 6,5× maior que o caso validado)
**Baseline:** main `9cd7d05` · 985/985 testes · 17 tasks concluídas em 2026-06-11/12

## VEREDITO: NÃO para fechar negócios sozinho. SIM para piloto assistido com supervisão RT.

### O que o teste do zero provou (31,8 ha, fluxo completo em ~9 minutos)

**O fluxo é profissional**: criar projeto → localizar por coordenadas → desenhar área (31,80 ha) → captação 1-clique → adutora automática com label → malha 12×12 → 14 setores bem distribuídos → bomba do catálogo → tudo auto-salvo. Nenhum erro, nenhum crash.

**Os gates funcionaram perfeitamente em área grande** — e este é o ponto central: o sistema CALCULOU certo (setor crítico 243 m³/h; 28 ramais > 1,5 m/s; pressão > PN confirmada) e BLOQUEOU a emissão de uma proposta inviável. Não emite lixo.

**Mas não ofereceu caminho de solução**: para 31,8 ha o vendedor fica preso — o catálogo de bombas (máx. 100 m³/h) não cobre o setor crítico; não há sugestão de "use 5035@18×18 + mais setores + bomba de 250 m³/h"; não há divisão em blocos (A8). O sistema diagnostica como engenheiro sênior e desampara como estagiário.

### Prontidão em 3 níveis

| Nível | Status | Condição |
|---|---|---|
| **(a) Hoje** | ✅ Piloto interno assistido | Projeto < 10 ha, retangular, adutora ortogonal, traçado pelo motor; proposta revisada linha a linha pelo RT e complementada manualmente (bomba/sucção/elétrica) |
| **(b) Primeiro negócio** | ❌ Faltam 3 itens sequenciais | 1. Roteiro §11.2 do Mapa Mestre (comparar com projeto HISTÓRICO real calculado pelo RT — passos 3, 5, 6 nunca executados); 2. PDF com cabeçalho comercial (nº orçamento, projetista, RT, validade, condições) + seções bomba/sucção/elétrica como template; 3. Revisão HUMANA das 9 premissas aprovadas por delegação (a delegação destravou o desenvolvimento; não substitui a assinatura do engenheiro num negócio real) |
| **(c) Escala** | ❌ 3–6 meses | Catálogo completo (caps, tês de redução, PN60, curva 45°, automação hidráulica, bombas grandes com curva Q-H); setorização derivada substituindo setores=jornada; multi-talhão/blocos; E08 (revisões, A/B/C, margem na tela); ≥5 projetos reais validados comparativamente |

### Top 8 gaps ranqueados por impacto no fechamento (consolidado)

1. **BLOCKER — Escopo da proposta**: sem seções de moto-bomba/sucção/elétrica/barrilete (100% das propostas reais têm; representam 30–50% do valor do sistema). O disclaimer atual declara a incompletude ao cliente.
2. **BLOCKER — Identidade comercial do documento**: sem nº de orçamento, consultor, projetista/RT, assinatura, validade, condições de pagamento — juridicamente não é uma proposta.
3. **BLOCKER — Validação de campo zero (E09)**: nenhum projeto histórico comparado; o primeiro cliente seria a primeira validação real do motor.
4. **BLOCKER — Agronomia diagnóstica**: setorização não emerge de lâmina×turno×vazão; para 5035@18×18 o critério atual gera nº de setores ERRADO (14 vs 9 derivados). Sem CU/vento/infiltração, não resiste ao agrônomo do cliente.
5. **CRÍTICO — Generalização não testada**: validado em 1 caso (4,85 ha); 31,8 ha já expõe limites sem rota de solução; côncavo/multi-talhão/captação interna/desnível forte = território desconhecido.
6. **CRÍTICO — BOM estruturalmente subcontada**: sem caps de fim de lateral (216 num projeto real!), tês de redução em cascata, ventosas, anti-vácuo — aditivo de obra ou margem negativa garantidos.
7. **CRÍTICO — Bomba por 2 escalares**: sem curva Q-H, sem NPSH/sucção; catálogo com 2 modelos pequenos.
8. **ALTO — Gate de velocidade em laterais ausente** (2,26 m/s em PN40 passa); custos estimados ±8% (PENDENTE_CONFERENCIA); classes PN sobre-especificadas (PN80 onde PN60 basta).

### Recomendação executiva

Sequência mínima para o primeiro negócio (2–4 semanas): **(1)** pegar UM projeto histórico real já vendido/instalado, reproduzi-lo no sistema e comparar BOM/HMT/setores com o que o RT calculou à mão — toda divergência vira correção ou premissa; **(2)** template comercial completo do PDF; **(3)** sessão formal de revisão humana das premissas delegadas. Em paralelo, NÃO vender com o sistema projetos > 15 ha ou fora do perfil retangular até o item (1) cobrir esses perfis.

*Auditoria completa do subagent (15+ gaps com arquivo:linha, classificação 4-tier) preservada no transcript da sessão; este documento consolida os achados decisórios. Projeto de teste "Auditoria — Teste do Zero" mantido no banco como fixture de área grande.*
