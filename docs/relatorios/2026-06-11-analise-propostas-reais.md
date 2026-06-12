# Análise — Propostas comerciais reais da Brasmáquinas (`docs/PROJETO/`, não versionado)

**Data:** 2026-06-11
**Fonte:** 479 arquivos (386 MB) de propostas/projetos reais adicionados pelo usuário em `docs/PROJETO/` — **pasta ignorada no git** (PII de clientes, contratos, dados financeiros). Esta análise referencia os projetos genericamente.
**Amostra lida em detalhe:** 3 propostas de aspersão convencional — (A) 32 ha pastagem em GO, 32 setores; (B) 38,9 ha multi-bloco com automação; (C) 12,7 ha capim em MG (Jaíba), 8 setores, automática.
**Objetivo:** extrair o padrão real de proposta Brasmáquinas para calibrar o gerador (E05/E07/E08) e validar/refutar premissas.

---

## 1. Descoberta central — a equação agronômica existe nas propostas reais

A proposta C traz, em "DADOS TÉCNICOS", exatamente o cálculo que o gerador não faz (crítica #1/#4 do diagnóstico especialista confirmada com evidência interna da empresa):

| Campo real da proposta | Valor (proposta C) | Estado no gerador |
|---|---|---|
| Cultura | capim | inexistente |
| Lâmina desejada | **10 mm/dia (INPUT)** | hardcoded `laminaMm: 10` (coincidência — em A é 6,5) |
| Emissor + bocal | NAAN 5035, 3,5×2,5 azul, **2.110 l/h** | só 5022-SD 1,5 m³/h |
| Espaçamento | **18×18 m** | 12×12 fixo |
| **Lâmina do emissor (intensidade)** | **6,51 mm/h** = 2110/(18×18) | nunca calculada |
| Tempo disponível | 13 h | `jornadaHoras` existe |
| **Nº de setores** | **8 (derivado)** · tempo/setor 1,54 h · total 12,28 h | setores = jornada em horas |
| Controle de setores | **Automático** | só registro manual VIQUA |
| Bombeamento | 100 m³/h · HMT 60 mca · **modelo da bomba na proposta** (IMBIL 65-160) | bomba não informada/sem catálogo |

**Implicação:** o fluxo profissional da empresa é `lâmina desejada (mm/dia) ÷ intensidade do emissor (mm/h) = horas de rega/setor → setores = tempo disponível ÷ tempo por setor`. É implementável com os campos que já temos + 3 inputs novos (cultura, lâmina/dia, emissor/bocal).

## 2. Estrutura canônica da proposta Brasmáquinas (consistente nas 3 amostras)

1. **Cabeçalho**: nº orçamento (`NNN/AAAA`), data, cliente, fazenda, município, carta de abertura, assinatura do engenheiro; em C: **consultor de vendas + projetista nomeados**; revisões (`REV04`).
2. **Dados técnicos** (tabela §1 acima).
3. **BOM por seções, nesta ordem** — as 4 primeiras NÃO existem no gerador:
   - **SUCÇÃO** (aço AZ flangeado: válvula de pé, tubos FL, curvas, redução excêntrica, anéis ABF, parafusos/porcas/arruelas)
   - **CONJUNTO MOTO-BOMBA** (bomba nomeada + base; às vezes 2 opções lado a lado)
   - **MATERIAIS ELÉTRICOS** (painel/soft-starter por CV, cabo dimensionado pela distância casa de bomba)
   - **LIGAÇÃO DE PRESSÃO / BARRILETE** (manômetro, registro gaveta FL, curva com escorva, válvula de retenção, válvula de alívio, ventosa, hidrômetro)
   - **TUBOS** (PVC por DN **e por PN**), **EMISSORES** (aspersor + luva + tubo de subida + tee derivação — equivalente ao nosso kit 5022 ✓), **CONEXÕES PVC**, **AUTOMAÇÃO**
4. Subtotal por seção + total; condições comerciais.

## 3. O que as conexões reais revelam (calibração direta da TASK-054/BOM)

- **Tês de REDUÇÃO em cascata** dominam as derivações: `TE RED 100×50`, `100×75`, `75×50`, `50×35` — o gerador só emite tê de DN único. Na proposta C: 42+20+346 tês de redução nos emissores vs ~0 tês simples.
- **Reduções** (`RED 50×35`, `35×25`, `125×100`, `150×125`) entre trechos de DN decrescente — ausentes no gerador.
- **CAP soldável em TODO fim de lateral** — proposta A: 216 caps DN50; C: caps 100/75. O gerador não emite nenhum cap (lateral aberta!).
- **Ventosas** (dupla/tríplice função) e **válvulas anti-vácuo** distribuídas por setor — ausentes.
- **Classes PN por função**: laterais finas PN40; principal/adutora PN60; trechos críticos PN80; **tubo agropecuário PN60 DN25** nas subidas. Confirma a crítica #5 (nosso catálogo rígido só PN80 encarece; e LF DN25 agropecuário não existe no catálogo).
- "Pedaços de tubo" (stubs 0,2 m / 1,5 m) como SKUs próprios.
- **Automação padrão de mercado**: válvula hidráulica plástica 3" (BERMAD S-105 / série 100) + piloto + solenóide 24V + régua + controlador (ESP-TM2/ESP-ME3) + tubo de comando 8 mm + mini contator. Nosso `section_valve` manual é a exceção, não a regra.

## 4. Premissas do gerador refutadas/validadas pelas propostas reais

| Premissa do gerador | Evidência real | Veredito |
|---|---|---|
| Espaçamento 12×12 único | 18×18 nas 3 propostas de aspersão | **REFUTADA** — 18×18 é o padrão de pastagem/capim |
| Aspersor único 5022-SD 1,5 m³/h | NAAN 5035/5035SD (bocais 3,5×2,5; 5,0×2,5; 4,5 PC), 2,11 m³/h | **REFUTADA** — 5035 é o cavalo de batalha |
| Lâmina 10 mm hardcode | 6,5 (A) e 10 (C) mm/dia como input | **REFUTADA** como constante; validada como default |
| Setores = jornada | setores derivados (12,7 ha → 8 setores, 1,54 h/setor) | **REFUTADA** |
| Kit aspersor (luva + subida + tee derivação) | idêntico nas propostas | **VALIDADA** ✓ |
| Registro de seção como ponto de controle | real, mas automação hidráulica é o padrão | **PARCIAL** |
| Tê de derivação de DN único por coluna | tês de REDUÇÃO em cascata | **REFUTADA** na forma atual |

## 5. Encaminhamentos sugeridos (nenhuma task aberta — decisão do usuário/RT)

1. **Catálogo (RT)**: homologar NAAN 5035/5035SD com bocais e espaçamento 18×18; famílias de tê de redução, redução, cap, ventosa, anti-vácuo; PN40/60 além do PN80; tubo agropecuário DN25.
2. **Motor agronômico mínimo (Classe A)**: inputs cultura/lâmina-dia/emissor → intensidade mm/h → tempo por setor → nº de setores derivado (fórmula da proposta C). Substitui crítica #1/#4 por implementação com referência interna.
3. **BOM (sucessora da TASK-054)**: caps de fim de lateral; tês de redução kind-aware (DN maior × DN menor por junção); seções sucção/bomba/elétrica/barrilete como **template parametrizado** (mesmo sem cálculo, a proposta precisa listar).
4. **E07 (proposta/PDF)**: adotar o esqueleto canônico §2 (nº orçamento, consultor+projetista, dados técnicos com intensidade e tempo/setor, BOM por seções com subtotais).
5. **E08 (comercial)**: estrutura de preço P.Unit/P.Total por seção + subtotais; revisões REV-NN; opções lado a lado (bomba Opção 1/Opção 2).

## 6. Governança

- `docs/PROJETO/` adicionada ao `.gitignore` (linha 70) — PII, contratos e dados financeiros de clientes; 386 MB.
- Nenhum dado pessoal de cliente reproduzido neste relatório.
