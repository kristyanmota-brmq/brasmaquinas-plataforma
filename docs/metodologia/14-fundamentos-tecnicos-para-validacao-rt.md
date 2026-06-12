# 14 — Fundamentos Técnicos do Motor de Projetos (dossiê para validação do RT)

**Emitido em:** 2026-06-12 · **Para:** RT da Brasmáquinas · **Status da base:** 1038 testes automatizados, 0 erros de tipo · **Revisões RT nº 1 e nº 2 incorporadas em 2026-06-12**
**Escopo:** TODAS as regras, fórmulas e limites que o software usa para gerar um projeto de irrigação por aspersão convencional — da área desenhada à proposta. Cada item traz valor vigente, fundamento, status de homologação e onde vive no código. O detalhe vivo de cada premissa está no doc 12 (`12-premissas-provisorias-e-revisao-rt.md`); a arquitetura de rede, no doc 13.

> **Como ler o status:** `APROVADO_RT` = homologado (por revisão ou ordem direta em sessão); `CALIBRÁVEL` = valor de praxe adotado, aguardando dado de campo/decisão fina do RT. Nenhum item CALIBRÁVEL bloqueia emissão — mas está listado para auditoria.

---

## 1. Equipamento padrão (ditado pelo RT em 2026-06-12)

| Configuração | Bocal | Vazão | Pressão nominal | Espaçamento | Status |
|---|---|---|---|---|---|
| **NAAN 5022-SD** (padrão) | 3,0 × 1,8 mm | **760 L/h** | **25 mca** | **12 × 12 m** | APROVADO_RT |
| **NAAN 5035-SD** | 5,0 × 2,5 mm | **2.110 L/h** | **30 mca** | **18 × 18 m** | APROVADO_RT |

Entradas adicionais (5035-PC 4,5; 5022 4,0×1,8 preservada) disponíveis por seleção explícita. *(5035 3,5×2,5 REMOVIDO por ordem do RT em 2026-06-12.)* Catálogo é *read-only*: especificação nunca muda sob um SKU existente; projetos salvos resolvem pelo SKU gravado. `src/lib/catalog/aspersores.ts`.

## 2. Agronomia (diagnóstico e setorização derivada)

- **Intensidade de aplicação:** `Ia (mm/h) = 1000 · q (m³/h) / (E1 · E2)` → 5022@12×12: 5,28 mm/h · 5035@18×18: 6,51 mm/h (confere com proposta real do corpus — fidelidade validada em caso histórico de 12,7 ha).
- **Tempo de rega por setor:** `t = lâmina (mm) / Ia` — lâmina é input do projetista (default 10 mm/dia, sempre sinalizado como premissa a confirmar com agrônomo).
- **Setores derivados:** `n = floor(horas disponíveis / t)` — equação extraída das propostas reais da casa. Disponível como modo "agronômico" (toggle); modo legado `setores = jornada` preservado.
- **Status do item 2 INTEIRO: APROVADO_RT** (revisão do RT em 2026-06-12 — "o item 2 pode aprovar tudo"), incluindo a lâmina default de 10 mm/dia como ponto de partida do projetista.
- `src/lib/layout/agronomy.ts`, `sectorization.ts`.

## 3. Malha de aspersores e orientação da grade

Hierarquia de orientação (ordem de precedência):

1. **ALTIMETRIA** *(regra canônica — ditada pelo fundador, 2026-06-12)*: declividade média ≥ **2%** (CALIBRÁVEL) → **laterais EM NÍVEL**, ao longo das curvas de nível (θ = direção do gradiente). Fundamento: variação de pressão na lateral ≤ ~20% da pressão de serviço só é atingível com lateral em nível (Bernardo; Keller & Bliesner; NRCS). Gradiente por ajuste de plano (mín. quadrados) sobre ≥ 8 amostras do terreno. Principal no sentido do declive.
2. **PLANIMETRIA**: terreno plano → grade alinhada ao **azimute dominante da divisa** (arestas ponderadas por comprimento, cluster ±3°, dominância ≥ 30% do perímetro); entre os 2 alinhamentos possíveis, vence o de laterais mais curtas. Fundamento: laterais seguem linhas de plantio, que seguem a divisa.
3. **GEOMETRIA** (fallback): menor bounding box, ângulos 0–179°.

Gate de eixo: todo aspersor a ≤ **0,10 m** do eixo da lateral (APROVADO_RT; blocker). `sprinkler-grid.ts`, `terrain-gradient.ts`.

### 3.1 Explicação detalhada e exemplos (solicitada pelo RT em 2026-06-12)

**Por que a altimetria manda (regra 1).** A pressão num ponto da lateral é a pressão de entrada MENOS a perda por atrito MAIS/MENOS o desnível. O critério clássico de uniformidade (Keller & Bliesner; NRCS; Bernardo) diz que a variação total de pressão ao longo da lateral não deve passar de ~20% da pressão de serviço — senão o primeiro aspersor joga muito mais água que o último e a lâmina fica desuniforme (CU cai).

*Exemplo com o nosso 5022 (Ps = 25 mca → orçamento de variação = 5 mca):*
- Lateral de 19 aspersores (216 m) **em nível**: a única variação é o atrito ≈ 2–3 mca (DN50, F de Christiansen). **Dentro dos 5 mca. ✓**
- A MESMA lateral descendo um talude de **3%**: o desnível sozinho = 216 × 0,03 = **6,5 mca** — já estourou o orçamento ANTES de contar o atrito. Aspersor do pé do morro pulveriza a ~31 mca, o do topo a ~23 mca → bicos com vazões diferentes → faixas sub e super-irrigadas. **Nenhum diâmetro de tubo conserta isso** — só a orientação.
- Por isso: lateral corre AO LONGO da curva de nível (todos os aspersores na mesma cota) e quem sobe o morro é a PRINCIPAL — que aceita a variação porque cada derivação tem seu registro/regulagem.

*Como o software mede o terreno:* amostra ≥ 8 pontos de elevação dentro do talhão (malha 7×7 no terreno do mapa) e ajusta um plano por mínimos quadrados — o plano dá a direção da descida mais forte (gradiente) e a declividade média (%). Declividade ≥ 2% → laterais perpendiculares ao gradiente (= em nível). Abaixo de 2%, o desnível de uma lateral de 216 m é ≤ ~4,3 m×0,02 ≈ inferior ao ruído do atrito — aí vale a regra 2.

**Por que a divisa manda no plano (regra 2).** Em talhão plano, o critério passa a ser operacional: as laterais acompanham as linhas de plantio, e as linhas de plantio acompanham a cerca/divisa dominante. Uma grade 3° fora da divisa significa cada lateral cruzando fileiras de cultivo em diagonal, headlands em cunha e proposta com aparência de erro.

*Exemplo real (Fazenda Três Ilhas, Carinhanha):* a divisa longa do talhão está a 87° de leste (o talhão acompanha a BA-161, ~3° fora do norte). O software mede cada aresta da cerca, pesa pelo comprimento e encontra a direção dominante (87,1°, presente em 36% do perímetro) → grade a 87° — alinhada com a CERCA DE VOCÊS, não com o norte do mapa. Entre alinhar as laterais paralelas ou perpendiculares à divisa, vence a opção de laterais mais curtas (constroem-se e operam-se melhor).

**Quando nada disso existe (regra 3).** Talhão sem direção dominante (área redonda, polígono orgânico): o software cai no critério neutro — a orientação que produz o menor retângulo envolvente. É só desempate; nunca passa por cima das regras 1 e 2.

**O gate de 0,10 m:** depois de orientada a grade, cada aspersor precisa estar a no máximo 10 cm do eixo da sua lateral (tubo reto). Se algum ficar fora, o projeto BLOQUEIA — é a garantia de que o desenho no mapa é montável com tubo reto no campo.

## 4. Linhas laterais — REGRA NOVA (RT, 2026-06-12)

- **Tubo ÚNICO: DN50 PN40 LF** *(correção RT 2026-06-12: família LF, sem menção a engate)* — sem telescopia (revoga a cascata 75→50), sem upgrade de diâmetro. Lateral que não cabe **divide** (encurta, não engorda) — split automático de coluna no menor número necessário.
- **Gates da lateral (sobre diâmetro INTERNO REAL: 48,1 mm** — corrigido pelo RT em 2026-06-12): velocidade ≤ **2,5 m/s**; perda de carga (com fator de Christiansen `F(n)`) ≤ **20% da pressão de serviço**. Capacidade prática 5022 (0,76): **até ~21 aspersores por lateral** pela velocidade (Qmax ≈ 16,3 m³/h); comprimento limitado pela perda.
- Aspersor sempre SOBRE a lateral física (ADR-011/012; blocker).
- `src/lib/layout/laterais.ts` (status: APROVADO_RT — ordem direta).

## 5. Setorização e operação

- **Operação rotativa: 1 setor ativo por vez** (confirmada pelo RT; vazão de projeto de cada trecho usa o setor que o exige ao máximo). APROVADO_RT.
- **Balanceamento por vazão** com divisão de coluna entre setores quando necessário (ponto de corte vira registro de seção VIQUA PN80 na BOM).
- **Regimes oficiais: 12, 15 e 20 h/dia** (RT, 2026-06-12). Projetos legados com outros valores permanecem válidos.
- **Restrições do local (RT, 2026-06-12):** vazão disponível da fonte (m³/h) e potência de energia (cv) → **piso automático de setores**: `n ≥ vazão_total / vazão_disponível` e `n ≥ vazão_total / Q_max(potência)`, com `Q_max (m³/h) = P(cv) · 270 · η / HMT(mca)` (de `P = γQH/75η`), **η = 0,55** (CALIBRÁVEL).
- **Ajuste automático do projetista:** rede fora dos limites ou sem bomba viável → o motor aumenta setores (menor mudança primeiro) com dupla validação (avaliador de candidatos + solver oficial) e preferência por configuração com bomba homologada; sem solução → decisão volta ao humano, gates ativos. `architecture-auto-tune.ts`, `sector-constraints.ts`.

## 6. Sub-coletores (espinha de peixe / manifold)

- Regra RT absoluta: **nenhuma lateral conecta direto à principal** — toda lateral via `rib → spine → spine_entry → principal` (1 espinha por setor).
- **Spine na MEDIANA dos inlets** (minimiza a soma dos ribs); com inlets uniformes degenera no **manifold clássico**: spine na linha dos inlets, conexão por tê (rib 0 m) — padrão das propostas reais. Casos rentes à principal: recuo construtivo mínimo de 3 m.
- Vazão: rib = máx. da coluna; spine/entry = soma do setor. Ângulos de junção válidos: 0°/90° (±5°); 45° apenas em adutora. APROVADO_RT. `hydraulic-connectivity.ts`.

## 7. Principal e adutora (seleção de arquitetura)

- Candidatos avaliados: **A0** (borda próxima à captação), **A2** (borda oposta), **A3** (eixo central). Vencedor = **menor custo estimado + penalidades operacionais**, sujeito às restrições duras (doc 13; ADR-015). Candidato com **rede de distribuição vazia é inválido** (não se ganha por não ter tubo).
- Sem candidato válido → baseline A0 com diagnóstico transparente (scores e motivos exibidos); ajuste automático de setores tenta viabilizar (item 5).
- Adutora: corredor sujeito a **validação de campo** (gate manual). A4–A8 (duas principais, espigão, blocos) reservados — recomendados para áreas > ~700 m³/h.

## 8. Hidráulica (solver)

- **Hazen-Williams**, **C = 140** (PVC — corrigido pelo RT em 2026-06-12), sempre com **diâmetro interno real** de catálogo: `hf = 10,67 · L · (Q/C)^1,852 / D^4,87`.
- Laterais: F de Christiansen; caminho crítico **exaustivo** (todos os setores × todos os trechos).
- **Limites (corrigidos pelo RT em 2026-06-12):** **secundária** (nomenclatura oficial — não mais "ramal") v ≤ **2,5 m/s** e hf ≤ **3,0 mca**; lateral v ≤ 2,5 m/s e hf ≤ 20%·Ps; classe de pressão (PN) conferida POR TRECHO com pressão real por derivação (`HMT − hf acumulado`) — violação confirmada é blocker.
- **Perdas localizadas: 5 mca FIXOS** (RT rev.2 — já INCLUEM a margem de segurança; não existe parcela de margem separada). **HMT = pressão de serviço + Σ perdas distribuídas + 5 mca + desnível geodético**.
- **Classes (RT rev.2): laterais LF PN40 DN50 (único); secundárias LF PN40 (DN50/75/100); principal/adutora com CLASSE CALCULADA** — a menor classe que cobre a HMT do projeto, escolhida por custo entre as que cobrem (hoje, com os preços de lista, o PN80 segue vencedor nos DN 100–150; a infraestrutura escolhe automaticamente quando classes menores ficarem mais baratas/catalogadas). O gate de pressão por derivação garante que nenhum trecho veja pressão acima da classe. `hydraulic-sizing.ts`, `hazenWilliams.ts`.

## 9. Conjunto moto-bomba

- Validação por **ponto nominal** (vazão do setor crítico + HMT ≤ dados da bomba); curva Q-H multiponto é trilho futuro. *(Confirmado pelo RT na rev.2.)*
- **Seleção automática: menor folga** que atende o ponto (não superdimensiona); catálogo homologado (IMBIL/EBARA do corpus — PENDENTE confirmação fina de placa). Sem bomba que atenda → campo fica vazio e o gate avisa; nunca inventa.

## 10. Coordenadas e apresentação

- **Toda coordenada exibida em UTM (SIRGAS 2000)** — "E … m · N … m · fuso" (RT, 2026-06-12). Conversão Transversa de Mercator (Krüger), ida-e-volta < 1 mm. Interno em lng/lat (mapa). `utm.ts`.

## 11. Governança de emissão — política "RESOLVER, NÃO BLOQUEAR" (RT rev.2)

Diretriz do RT (2026-06-12): *"não quero que você bloqueie o que estiver errado — quero que você resolva."* O bloqueio passa a ser o ÚLTIMO recurso, nunca a primeira resposta:

1. **O motor resolve sozinho tudo que tem solução determinística** (já ativo): vazão de setor acima do limite → re-setoriza; nenhum candidato de principal válido → re-avalia com mais setores; lateral que não cabe → divide a coluna; bomba ausente → seleciona do catálogo pela menor folga; classe da principal → calculada pela HMT; rede vazia → candidato descartado na origem.
2. **Fila de resolvedores em construção** (próximos): ângulo de junção fora de 0/90 → re-traçado automático pelo motor; conexão sem SKU → sugestão de homologação com item equivalente; pressão acima da classe na lateral → modelagem da regulagem no registro de seção (TASK-053-valves).
3. **Só bloqueia o que não tem solução determinística** — e quando bloquear, diz exatamente o que falta e de quem é a decisão (projetista × RT). Override humano registrado em log permanente (`ai/decision-log.md`).

## 12. Itens CALIBRÁVEIS aguardando o RT (não bloqueiam)

| Item | Valor vigente | Status (rev.2) |
|---|---|---|
| η do conjunto moto-bomba | **0,70** | DEFINIDO pelo RT ("maior rendimento possível") |
| Limiar de declividade (altimetria comanda) | 2% | CALIBRÁVEL — ver explicação na §12.1 |
| Perdas localizadas | **5 mca fixos** | DEFINIDO pelo RT (inclui a margem) |
| Margem de segurança da HMT | **removida** (inclusa nos 5 mca) | DEFINIDO pelo RT |
| Lâmina default | **8 mm/dia** | DEFINIDO pelo RT |
| Pesos do otimizador de candidatos | exploratórios | CALIBRÁVEL — ver explicação na §12.2 |

### 12.1 O que é o "limiar de declividade" (explicação solicitada)

É o ponto de corte que decide QUEM manda na orientação da grade: o morro ou a cerca. O software mede a declividade média do talhão (ajuste de plano sobre as cotas do terreno). Se ela for **maior ou igual ao limiar (hoje 2%)**, o terreno é considerado "inclinado de verdade" e a **altimetria assume o comando** — laterais em nível. Se for menor, o talhão é tratado como plano e a **planimetria decide** (divisa).

*Por que 2%?* É o ponto onde o desnível de uma lateral típica começa a competir com o atrito: lateral de 216 m a 2% = 4,3 m de desnível ≈ orçamento inteiro dos 20% (5 mca no 5022). Abaixo disso, o desnível é menor que o próprio ruído do atrito e girar a grade por causa dele só atrapalharia a operação. *O que significa calibrar:* se a prática da casa preferir proteger mais a uniformidade (ex.: culturas sensíveis), baixa-se para 1,5%; se a operação tolerar mais variação, sobe-se para 3%. É um número só, trocado em um lugar só — a decisão é de vocês, com dado de campo.

### 12.2 O que são os "pesos do otimizador de candidatos" (explicação solicitada)

Quando o software compara os traçados possíveis da principal (A0 borda próxima · A2 borda oposta · A3 central), cada candidato recebe uma **nota = custo de material estimado + penalidades operacionais**. As penalidades convertem incômodos de CAMPO em R$ para a comparação ser justa:

- **P2 — desconexão**: metros de sub-coletor "viajando" longe das laterais (hoje R$ 35/m) — rede espalhada custa vala, manutenção e tempo de montagem;
- **P3 — quebras de rota**: cada cotovelo/desvio do traçado (hoje R$ 100/un) — cada quebra é conexão, perda localizada e ponto de vazamento;
- **P1/P4** (cruzamentos da principal; dispersão de válvulas): medidos e exibidos, mas com peso ZERO por decisão metodológica — ativá-los sem dado de campo transformaria boa prática em regra absoluta.

*Por que "exploratórios"?* Os R$ 35/m e R$ 100/un são ordens de grandeza razoáveis, não medições da SUA operação. **Calibrar via E09** significa: nos primeiros projetos montados, cronometrar/custear o que uma quebra de rota e um metro de vala extra realmente custam para a equipe da Brasmáquinas e substituir os números. Importante: os pesos NUNCA aprovam rede que viole limite técnico — eles só desempatam entre redes VÁLIDAS.

## 13. Referências

Bernardo, S. — *Manual de Irrigação*; Keller & Bliesner — *Sprinkle and Trickle Irrigation*; USDA-NRCS National Engineering Handbook (Sprinkler); NBR 5647 (PVC); tabelas NaanDanJain 5022/5035; corpus de propostas reais Brasmáquinas (validação histórica: caso 12,7 ha reproduzido com fidelidade ≥ 99% nos critérios de operação).

---

**Assinatura de validação do RT:** ____________________ · Data: ____/____/______
Itens reprovados/ajustados devem ser anotados no doc 12 com a correção ditada — o motor é recalibrado no mesmo dia.
