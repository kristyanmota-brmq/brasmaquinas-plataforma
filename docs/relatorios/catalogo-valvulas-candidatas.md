# Catálogo Candidato — Válvulas e Registros de Seção

**Gerado em:** 2026-05-19  
**Atualizado em:** 2026-05-19 (regra PN80 interna Brasmáquinas — TASK-006B rev.2)  
**Tarefa:** TASK-006A / TASK-006B  
**Status:** homologado parcial — 7 SKUs VIQUA soldáveis aprovados para uso manual; válvula automática bloqueada  
**Alimenta:** TASK-006B (BOM de seção manual)

---

## 1. Fontes consultadas

| Fonte | Aba | Itens totais | Candidatos filtrados |
|-------|-----|-------------|---------------------|
| `Prod. Irrig. Convenc.xlsx` | `Base_Motor_Aprovada` | 1 aba completa | 287 |
| `Produtos utilizados como insumo na industria.xlsx` | `Planilha1` | 272 linhas | 12 (overlap com fonte 1) |

Filtro aplicado: palavras-chave `regist`, `válvula`, `valvula`, `ventosa`, `retenção`, `solenoide`, `piloto`, `bermad`, `docol` na descrição ou categoria.

---

## 2. Resumo por família

| Família | Total | Candidatos section_valve | Status geral |
|---------|-------|--------------------------|-------------|
| `registro_esfera_pvc_soldavel` | 18 | **15** | 7 `aprovado_automatico` (VIQUA, regra PN80 interna, uso **manual**); 8 pendentes |
| `registro_esfera_pvc_roscavel` | 12 | 0 | `nao_usar_no_motor` — conexão roscável inadequada para corte de seção |
| `registro_gaveta` | 2 | 0 | `nao_usar_no_motor` — gaveta 25mm, diâmetro muito pequeno |
| `bermad_hidraulica` | 57 | 0 | `nao_usar_no_motor` — peças/acessórios de válvulas, não corpos completos |
| `valvula_hidraulica` | 130+ | 0 | `nao_usar_no_motor` — válvulas de pé, antivácuo, retrolavagem, borboleta |
| `retencao` | 44 | 0 | `nao_usar_no_motor` — válvula de retenção: função unidirecional, não corte |
| `ventosa` | 13 | 0 | `nao_usar_no_motor` — alívio de ar, não corte de seção |
| `solenoide_piloto` | 7 | 0 | `nao_usar_no_motor` — acessório de comando, não válvula de corte |

**Total aprovado_automatico: 7** (uso manual; regra PN80 interna Brasmáquinas aplicada a todos VIQUA soldáveis)  
**Total candidato_validacao_tecnica: 8** (outras marcas sem PN confirmado)  
**Total nao_usar_no_motor: 272+**

> **Regra de homologação interna (2026-05-19):** todos os registros VIQUA presentes na base interna da Brasmáquinas recebem `classePressao: "PN80"`, `pressaoNominalMca: 80`, `fontePressao: "homologacao_interna_brasmaquinas"`.  
> Escopo da regra: marca VIQUA · família registro manual · cadastrado na `Base_Motor_Aprovada`.  
> **Não se aplica a:** válvula automática, válvula hidráulica, solenoide, piloto, ventosa, válvula de retenção, produtos não cadastrados na base interna.  
> Os SKUs aprovados destinam-se a **registro manual de seção** — acionamento por operador em campo.  
> `section_valve` que exigir **controle automático** (solenoide, atuador elétrico/hidráulico) mantém blocker específico: catálogo de válvula automática inexistente.

---

## 3. Tabela de candidatos — Registro PVC Esfera Soldável (section_valve)

> Esta é a única família elegível como `section_valve` em irrigação convencional por aspersão.  
> Todos os itens abaixo têm USAR_NO_MOTOR=SIM na planilha de origem.  
> **Regra interna Brasmáquinas:** todos os registros VIQUA na base interna recebem PN80 automaticamente.  
> ★ = `aprovado_automatico` para **registro manual de seção**. Demais marcas: `candidato_validacao_tecnica` (PN do fabricante não confirmado).

### 3.1 DN ≥ 32 mm — candidatos para corte de seção

| SKU | Descrição | Marca | DN (mm) | PN (mca) | fonte PN | Custo (R$) | Preço Venda (R$) | Margem | Estoque | usarNoMotor | Observação |
|-----|-----------|-------|---------|----------|---------|-----------|-----------------|--------|---------|-------------|------------|
| ★ **4209000** | **REGISTRO PVC ESF.SOLD. AZUL 32MM - VIQUA** | **VIQUA** | **32** | **80** | **interno** | **10,82** | **18,10** | **40,2%** | **73** | **sim (manual)** | — |
| ★ **1000962** | **REGISTRO PVC ESF.SOLD. PREDIALL 32MM - VIQUA** | **VIQUA** | **32** | **80** | **interno** | **5,33** | **20,10** | **73,5%** | **0** | **sim (manual)** | Linha Prediall — validar uso agrícola antes de usar em campo; sem estoque |
| 1001069 | REGISTRO PVC ESF.SOLD. 32MM - DURIN | DURIN | 32 | ausente | — | 5,59 | 12,70 | 56,0% | 0 | pendente | PN ausente; sem estoque |
| 115 | REGISTRO PVC ESF.SOLD. 32MM - AMANCO | AMANCO | 32 | ausente | — | 5,45 | 5,56 | 2,0% | 0 | não | Margem 2% — inviável comercialmente |
| ★ **4208000** | **REGISTRO PVC ESF.SOLD. AZUL 35MM - VIQUA** | **VIQUA** | **35** | **80** | **interno** | **13,97** | **24,20** | **42,3%** | **107** | **sim (manual)** | DN35 não-padrão em `TUBOS_PVC_LF` — confirmar antes de usar na BOM |
| 1001882 | REGISTRO PVC ESF.SOLD. 35MM - DURIN | DURIN | 35 | ausente | — | 6,70 | 12,70 | 47,3% | 0 | pendente | PN ausente; DN35 não-padrão; sem estoque |
| 1006584 | REGISTRO PVC ESF.SOLD. 35MM - TIGRE | TIGRE | 35 | ausente | — | 6,99 | 15,30 | 54,3% | 0 | pendente | PN ausente; DN35 não-padrão; sem estoque |
| 1924000 | REGISTRO PVC ESF.SOLD. 40MM - TIGRE | TIGRE | 40 | ausente | — | 13,21 | 33,00 | 60,0% | 0 | pendente | PN ausente; DN40 não-padrão; sem estoque |
| ★ **1002326** | **REGISTRO PVC ESF.SOLD. AZUL 50MM - VIQUA** | **VIQUA** | **50** | **80** | **interno** | **14,58** | **24,96** | **41,6%** | **369** | **sim (manual)** | SKU primário DN50 |
| ★ **1003768** | **REGISTRO PVC ESF.SOLD. MARRON 50MM - VIQUA** | **VIQUA** | **50** | **80** | **interno** | **22,83** | **48,50** | **52,9%** | **0** | **sim (manual)** | Alternativa DN50; sem estoque — usar apenas se AZUL indisponível |
| 1001262 | REGISTRO PVC ESF.SOLD. 50MM - DURIN | DURIN | 50 | ausente | — | 6,62 | 12,70 | 47,9% | 0 | pendente | PN ausente; sem estoque |
| 133266 | REGISTRO DE ESFERA SOLD 50MM - TIGRE | TIGRE | 50 | ausente | — | 19,53 | 33,37 | 41,5% | 2 | pendente | PN ausente; estoque mínimo |
| 4204000 | REGISTRO PVC ESF.SOLD. 50MM MARRON LEKAT | LEKAT | 50 | ausente | — | 10,56 | 12,70 | 16,9% | 0 | pendente | PN ausente; margem 16,9%; marca sem histórico |
| ★ **1001994** | **REGISTRO PVC ESF.SOLD. AZUL 75MM - VIQUA** | **VIQUA** | **75** | **80** | **interno** | **84,70** | **135,30** | **37,4%** | **65** | **sim (manual)** | SKU primário DN75 |
| ★ **1002327** | **REGISTRO PVC ESF.SOLD. AZUL 100MM - VIQUA** | **VIQUA** | **100** | **80** | **interno** | **240,51** | **404,50** | **40,5%** | **19** | **sim (manual)** | SKU primário DN100 |

### 3.2 DN < 32 mm — não adequado para corte de seção em principal/ramal

| SKU | Descrição | Marca | DN (mm) | Custo (R$) | Preço (R$) | Margem | Estoque | usarNoMotor | motivoBloqueio |
|-----|-----------|-------|---------|-----------|-----------|--------|---------|-------------|----------------|
| 1001032 | REGISTRO PVC ESF.SOLD. AZUL 20MM - VIQUA | VIQUA | 20 | 3,94 | 10,30 | 61,7% | 460 | não | DN20 — abaixo do diâmetro mínimo de lateral (32mm) |
| 1001068 | REGISTRO PVC ESF.SOLD. 25MM - DURIN | DURIN | 25 | 5,82 | 10,00 | 41,8% | 0 | não | DN25 — abaixo do diâmetro mínimo de lateral (32mm) |
| 4207000 | REGISTRO PVC ESF.SOLD. AZUL 25MM - VIQUA | VIQUA | 25 | 5,84 | 12,80 | 54,3% | 188 | não | DN25 — abaixo do diâmetro mínimo de lateral (32mm) |

---

## 4. Tabela de candidatos — Registro PVC Esfera Roscável

> Conexão roscável não é adequada para seção de irrigação convencional (tubos PVC soldáveis).  
> Classificados como `nao_usar_no_motor` para uso como `section_valve`.  
> Podem ser usados em outros contextos (conexões de instrumentação, etc.).

| SKU | Descrição | Marca | DN (mm) | Custo (R$) | Preço (R$) | Margem | Estoque | usarNoMotor | motivoBloqueio |
|-----|-----------|-------|---------|-----------|-----------|--------|---------|-------------|----------------|
| 1001647 | REGISTRO PVC ESF.ROSCA 1/2´ - DURIN | DURIN | 15 | 3,55 | 12,70 | 72,0% | 0 | não | Roscável — conexão inadequada para section_valve em PVC soldável |
| 1004317 | REGISTRO PVC ESF.ROSCA 1/2´ - VIQUA | VIQUA | 15 | 5,46 | 12,00 | 54,5% | 130 | não | Roscável — idem |
| 1001648 | REGISTRO PVC ESF.ROSCA 3/4´ - DURIN | DURIN | 20 | 4,12 | 8,20 | 49,7% | 0 | não | Roscável — idem |
| 4201000 | REGISTRO PVC ESF.ROSCA 3/4´ - VIQUA | VIQUA | 20 | 7,39 | 15,90 | 53,5% | 92 | não | Roscável — idem |
| 1001426 | REGISTRO PVC ESF.ROSCA 1´ - DURIN | DURIN | 25 | 5,08 | 12,70 | 60,0% | 0 | não | Roscável — idem |
| 4202000 | REGISTRO PVC ESF.ROSCA 1´ - VIQUA | VIQUA | 25 | 11,93 | 26,80 | 55,5% | 79 | não | Roscável — idem |
| 4206000 | REGISTRO PVC ESF.ROSCA 1.1/4´ - VIQUA | VIQUA | 32 | 16,36 | 35,02 | 53,3% | 38 | não | Roscável — idem |
| 1001263 | REGISTRO PVC ESF.ROSCA 1.1/2´ - DURIN | DURIN | 38 | 5,79 | 12,70 | 54,4% | 0 | não | Roscável — idem |
| 4203000 | REGISTRO PVC ESF.ROSCA 1.1/2´ - VIQUA | VIQUA | 38 | 18,64 | 35,00 | 46,7% | 21 | não | Roscável — idem |
| 4205000 | REGISTRO PVC ESF.ROSCA 2´ - VIQUA | VIQUA | 50 | 28,34 | 62,15 | 54,4% | 44 | não | Roscável — idem |
| 1002465 | REGISTRO PVC ESF.ROSCA 3´ - VIQUA | VIQUA | 75 | 169,76 | 410,00 | 58,6% | 22 | não | Roscável — idem |
| 1002635 | REGISTRO PVC ESF.ROSCA 4´ - VIQUA | VIQUA | 100 | 225,49 | 538,40 | 58,1% | 14 | não | Roscável — idem |

---

## 5. Tabela de candidatos — Registro Gaveta

| SKU | Descrição | Marca | DN (mm) | Custo (R$) | Preço (R$) | Margem | Estoque | usarNoMotor | motivoBloqueio |
|-----|-----------|-------|---------|-----------|-----------|--------|---------|-------------|----------------|
| 6912000 | REGISTRO BASETEC 25MM PVC TIPO GAVETA - DOCOL | DOCOL | 25 | 23,98 | 56,50 | 57,6% | 14 | não | Gaveta 25mm — diâmetro insuficiente para seção de principal/ramal |
| 6911000 | REGISTRO BASETEC 25MM PVC CERÂMICO - DOCOL | DOCOL | 25 | 21,74 | 52,00 | 58,2% | 0 | não | Gaveta cerâmica 25mm — idem; uso doméstico, não irrigação convencional |

---

## 6. Famílias descartadas (nao_usar_no_motor)

### 6.1 Válvulas BERMAD — peças e acessórios (57 itens)

Os 57 itens da família BERMAD no catálogo são **peças, acessórios e diafragmas** de válvulas hidráulicas, não corpos completos de válvula de corte. Incluem: diafragmas (série 100, 200, 400), tampas, lacres, solenoides, bases, adaptadores, capas, etc.

Corpos de válvula hidráulica BERMAD completos para corte de seção **não foram encontrados** com preço/custo/SKU nesta planilha. Existem 2 SKUs de válvulas BERMAD hidráulicas completas identificadas:
- SKU 71101742 — VALVULA HIDRAULICA 2´ 205-G — BERMAD (CUSTO=R$219,45 | PRECO=R$336,42 | MG=34,8%) 
- SKU 7958000 — VALVULA HIDRAULICA 1´ MOD 205 C/ROSCA — IAVANT (CUSTO=R$150,00 | PRECO=R$361,70 | MG=58,5%)
- SKU 100895 — VALVULA HIDRÁULICA CORPO 2´ L 105 BSP — RIVULIS (CUSTO=R$228,91 | PRECO=R$433,00 | MG=47,1%)

Todos classificados como `candidato_validacao_tecnica` pendente: PN ausente, diâmetro pequeno (1–2´), e válvulas hidráulicas requerem validação técnica completa antes de uso como section_valve simples.

**Regra:** Válvulas BERMAD hidráulicas nunca são `aprovado_automatico` sem validação técnica e comercial completa (ver regra 6 de bloqueio do TASK-006A).

### 6.2 Válvulas de Retenção (44 itens)

Válvulas de retenção (check valves) têm função unidirecional — bloqueiam refluxo, não cortam seção. Inadequadas como `section_valve`. Classificadas como `nao_usar_no_motor`.

### 6.3 Ventosas (13 itens)

Ventosas (alívio de ar) têm função de purga de bolsões de ar. Não cortam seção. Classificadas como `nao_usar_no_motor`.

### 6.4 Solenoides e Pilotos (7 itens)

Acessórios de comando elétrico/hidráulico. Não são válvulas de corte. Classificadas como `nao_usar_no_motor`.

### 6.5 Válvulas Hidráulicas Diversas (130+ itens)

Inclui: válvulas de pé com crivo (sucção), válvulas antivácuo, válvulas de borboleta, corpos de retrolavagem. Nenhuma adequada como `section_valve` em irrigação convencional por aspersão.

---

## 7. SKUs prontos para TASK-006B

Sete SKUs `aprovado_automatico` pela regra PN80 interna Brasmáquinas. Ordenados por DN, depois por prioridade (AZUL > MARRON > PREDIALL).

| SKU | Descrição | DN (mm) | Prioridade | Custo (R$) | Preço (R$) | Margem | Estoque | Uso BOM |
|-----|-----------|---------|-----------|-----------|-----------|--------|---------|---------|
| **4209000** | REGISTRO PVC ESF.SOLD. AZUL 32MM - VIQUA | 32 | primário | 10,82 | 18,10 | 40,2% | 73 | section_valve DN32 — manual |
| **1000962** | REGISTRO PVC ESF.SOLD. PREDIALL 32MM - VIQUA | 32 | alternativa | 5,33 | 20,10 | 73,5% | 0 | section_valve DN32 — manual (validar uso agrícola) |
| **4208000** | REGISTRO PVC ESF.SOLD. AZUL 35MM - VIQUA | 35 | primário | 13,97 | 24,20 | 42,3% | 107 | section_valve DN35 — manual (confirmar DN35 no catálogo de tubos) |
| **1002326** | REGISTRO PVC ESF.SOLD. AZUL 50MM - VIQUA | 50 | primário | 14,58 | 24,96 | 41,6% | 369 | section_valve DN50 — manual |
| **1003768** | REGISTRO PVC ESF.SOLD. MARRON 50MM - VIQUA | 50 | alternativa | 22,83 | 48,50 | 52,9% | 0 | section_valve DN50 — manual (sem estoque) |
| **1001994** | REGISTRO PVC ESF.SOLD. AZUL 75MM - VIQUA | 75 | primário | 84,70 | 135,30 | 37,4% | 65 | section_valve DN75 — manual |
| **1002327** | REGISTRO PVC ESF.SOLD. AZUL 100MM - VIQUA | 100 | primário | 240,51 | 404,50 | 40,5% | 19 | section_valve DN100 — manual |

**Blocker que permanece ativo:** se `section_valve` exigir controle automático (solenoide, atuador elétrico), nenhum SKU está aprovado — catálogo de válvula automática inexistente.

**Implementação BOM:** para cada DN, usar o SKU primário. Alternativas entram somente se suprimentos confirmar indisponibilidade do primário — essa lógica não é automática.

---

## 8. Pendências remanescentes

### 8.1 VIQUA soldáveis — ressalvas (aprovados com nota)

| SKU | DN | Ressalva | Ação recomendada |
|-----|----|----------|-----------------|
| 1000962 (PREDIALL) | 32mm | Linha Prediall é voltada ao uso predial/doméstico | Confirmar com RT/projetista aceitabilidade em irrigação agrícola antes de usar em campo |
| 4208000 (AZUL 35mm) | 35mm | DN35 pode não existir em `TUBOS_PVC_LF` | Confirmar existência do diâmetro no catálogo de tubos antes de incluir na BOM |
| 1003768 (MARRON 50mm) | 50mm | Sem estoque | Incluir na BOM somente se AZUL 50mm indisponível; confirmar com suprimentos |

### 8.2 Outras marcas — ainda pendentes (candidato_validacao_tecnica)

| SKU | Marca | DN | Pendência |
|-----|-------|----|-----------|
| 1001069 | DURIN | 32mm | PN do fabricante; sem estoque |
| 1001882 | DURIN | 35mm | PN do fabricante; DN35 não-padrão; sem estoque |
| 1006584 | TIGRE | 35mm | PN do fabricante; DN35 não-padrão; sem estoque |
| 1924000 | TIGRE | 40mm | PN do fabricante; DN40 não-padrão; sem estoque |
| 1001262 | DURIN | 50mm | PN do fabricante; sem estoque |
| 133266 | TIGRE | 50mm | PN do fabricante; estoque mínimo (2 un) |
| 4204000 | LEKAT | 50mm | PN ausente; margem 16,9%; marca sem histórico no catálogo |
| 115 | AMANCO | 32mm | Margem 2% — inviável; descartar ou aguardar renegociação |

---

## 9. Recomendação de família padrão para section_valve

**Família recomendada:** `registro_esfera_pvc_soldavel`, linha **VIQUA AZUL**

**Justificativa:**
- Maior estoque em campo (DN50: 369 un; DN75: 65 un; DN100: 19 un)
- Margem aceitável (37–42%)
- Marca consolidada no catálogo e em projetos anteriores da Brasmáquinas
- Conexão soldável — compatível com tubos PVC LF e PVC Rígido do catálogo
- Única marca com cobertura nos três diâmetros principais de principal (50, 75, 100mm)
- USAR_NO_MOTOR = SIM em todos os três SKUs relevantes

**SKUs recomendados para validação prioritária:**

| SKU | Descrição | DN | Uso no projeto | Pendência |
|-----|-----------|-----|---------------|-----------|
| 1002326 | REGISTRO PVC ESF.SOLD. AZUL 50MM - VIQUA | 50mm | Principal DN50 / ramal DN50 | PN fabricante |
| 1001994 | REGISTRO PVC ESF.SOLD. AZUL 75MM - VIQUA | 75mm | Principal DN75 | PN fabricante |
| 1002327 | REGISTRO PVC ESF.SOLD. AZUL 100MM - VIQUA | 100mm | Principal DN100 / adutora DN100 | PN fabricante |

**Regra interna Brasmáquinas (2026-05-19):** todos os registros VIQUA na base interna recebem PN80. Sete SKUs soldáveis DN≥32mm estão `aprovado_automatico` para registro manual de seção.

**SKUs primários recomendados por DN:**

| DN | SKU primário | Estoque | Alternativa |
|----|-------------|---------|-------------|
| 32mm | 4209000 (AZUL) | 73 un | 1000962 (PREDIALL, validar) |
| 35mm | 4208000 (AZUL) | 107 un | — (confirmar DN35 em tubos) |
| 50mm | 1002326 (AZUL) | 369 un | 1003768 (MARRON, sem estoque) |
| 75mm | 1001994 (AZUL) | 65 un | — |
| 100mm | 1002327 (AZUL) | 19 un | — |

**Limitação permanente:** uso restrito a acionamento manual por operador. Não usar como válvula de controle automático.

---

## 10. Critérios de aceite verificados (TASK-006A)

| Critério | Status |
|----------|--------|
| Todos os candidatos extraídos das fontes e classificados | ✅ 287 candidatos analisados |
| Nenhum item marcado como `aprovado_automatico` com PN ausente | ✅ 0 itens `aprovado_automatico` |
| Nenhum item com `custo ≥ precoVenda` marcado como aprovado | ✅ Nenhum caso de custo ≥ preço entre candidatos |
| Válvulas BERMAD classificadas como `candidato_validacao_tecnica` no mínimo | ✅ BERMAD completas → `candidato_validacao_tecnica`; peças → `nao_usar_no_motor` |
| Registro PVC esfera: somente `aprovado_automatico` se todos os critérios OK | ✅ Todos em `candidato_validacao_tecnica` (PN ausente) |
| Relatório indica quais SKUs alimentam TASK-006 e quais bloqueiam | ✅ 0 prontos; 15 candidatos identificados com pendência única (PN) |
| Nenhum arquivo em `src/` alterado | ✅ Confirmado |

---

## 11. Próximos passos

1. ~~**Ação RT/suprimentos:** Obter PN da linha VIQUA AZUL soldável~~ — **concluído** em 2026-05-19 (PN80).
2. ~~**Após PN confirmado:** Promover SKUs 1002326 / 1001994 / 1002327 para `aprovado_automatico`~~ — **concluído**.
3. **TASK-006B:** Implementar BOM de registro manual de seção — 7 SKUs VIQUA, seleção por DN do trecho adjacente, prioridade AZUL, warning de acionamento manual, blocker separado para controle automático.
4. **DN35/DN40:** Confirmar se estão no catálogo de tubos `TUBOS_PVC_LF` antes de incluir registros de seção para esses diâmetros.
5. **AMANCO 32mm (SKU 115):** Margem 2% — descartar definitivamente ou aguardar revisão comercial.
6. **Válvula automática:** Se projeto futuro exigir controle remoto/automático de seção, iniciar tarefa separada de homologação de válvula hidráulica com atuador.

---

*Fonte dos dados: planilha `Base_Motor_Aprovada` em `Prod. Irrig. Convenc.xlsx`, conforme entregue pela área comercial/suprimentos. Nenhum SKU, preço, PN ou diâmetro foi inventado neste relatório.*
