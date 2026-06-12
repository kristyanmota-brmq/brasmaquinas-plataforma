# TASK-064 — Seleção de aspersor na UI + malha pelo espaçamento do modelo

**Status:** `concluída` · **Prioridade:** P1 · **Classe:** A — domínio + UI
**Concluída em:** 2026-06-12 · **981/981 testes** (+2 T64) · 0 tsc · 37/37 tooling
**Autorização:** "Prossiga até uma versão profissional do software" (RT delegado)

> O gerador agora reproduz o projeto típico da empresa (5035 SD @ 18×18). **Domínio**: `BOMInput.sprinklers.aspersorSku?` novo; item ASPERSOR da BOM resolvido por `getAspersorBySku` (T64-1 legado 101092/R$32; T64-2 5035 101080547/R$52,60); pressão de serviço do aspersor do projeto usada na seleção de laterais (`irrigation-project`, 2 pontos) e em TODO o solver HMT (`hydraulic-sizing`, 6 pontos — fallback 5022 byte-idêntico). **UI**: seletor "Modelo do aspersor" na seção Aspersores (lista `ASPERSORES` com modelo/bocal/vazão/espaçamento); troca regenera a malha com o espaçamento do modelo e limpa a setorização; 27 referências de `ASPERSOR_PADRAO` → `aspersorAtivo` (raio de cobertura, vazões e display reativos). **Verificado ao vivo**: 5022→5035 regenerou 346→157 aspersores (12×12→18×18), vazão 331,3 m³/h, raio 15,75 m; restaurado em seguida. Kit de subida (luva+tubo+tee 3/4") é idêntico nas propostas reais do 5035 — reuso do kit homologado é defensável; capacidade de lateral usa a vazão real do emissor (já paramétrica).
