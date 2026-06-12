# Diagnóstico — Crítica de especialista em irrigação sobre o gerador (auditoria visual + metodológica)

**Data:** 2026-06-11
**Classe:** diagnóstico (read-only sobre o produto; nenhuma task formal aberta por este documento)
**Método:** (a) auditoria visual ao vivo via Chrome no ambiente local (`http://localhost:3000`, projeto "Fazenda do Paulo", `cmpn1wlfv0004ulshuyu3armg`, 4,85 ha, 346 aspersores, 14 setores, HMT 33,8 mca, BOM R$ 142.316,10); (b) auditoria metodológica do repositório pelo subagent `irrigation-methodology-agent` (15 achados com arquivo:linha); (c) teste real do gate de PDF.
**Baseline:** main `7edf7b2` · 951/951 vitest · 0 tsc · 37/37 tooling

---

## 1. Veredito executivo

O software cumpre a promessa central de governança — **recusou-se a emitir proposta com pendências** (`POST /api/projetos/.../pdf → 422 em 3,6 s`, confirmado no log do servidor). O memorial descritivo por trecho (41 trechos com vazão/DN/ΔH/ΔH-Ps/velocidade e critérios declarados) é acima do padrão de revenda. Porém, **como projeto de irrigação, o que sai hoje é uma lista de materiais hidraulicamente verificada — não um projeto agronomicamente defensável**. As lacunas que um agrônomo do cliente apontaria primeiro não estão nos blockers que o software conhece, e sim nos parâmetros que ele não mede.

## 2. O que aguenta escrutínio

- Gate de emissão real (422 + rastreabilidade de motivo); sidebar separa "Aguarda decisão RT" (azul) de "Bloqueio do projeto" (vermelho).
- Memorial honesto: HW C=145, Christiansen, critério ΔH/Ps ≤ 20% declarados.
- BOM sem SKU inventado; tês fishbone (TASK-054) precificados por DN exato no projeto real.
- Setorização balanceada (~37,5 m³/h por setor).

## 3. Críticas ranqueadas

### CRÍTICA 1 — Agronomia ausente
Lâmina **10 mm hardcoded como literal de tipo** (`layout-schema.ts` — `laminaMm: 10`; `layout-use-cases.ts` — `LAMINA_MM = 10 as const`). Sem cultura, ETc/Kc, Ea, turno derivado de demanda, infiltração do solo, vento, CU/DU. Arranjo 12×12 + 5022-SD aplica ~10,4 mm/h — nunca confrontado com infiltração básica; sobreposição ~14% (raio 14 m / esp. 12 m) sem cálculo de uniformidade nem campo de vento.

### CRÍTICA 2 — Adutora cruza a área irrigada e o fluxo não usa o otimizador
Console do servidor: `[principal] Captação dentro da faixa Y da malha — adutora cruza a área irrigada` (`principal.ts:123`, dezenas de repetições). Visual: principal traçada à mão cruza o talhão em diagonal → **22 conexões com ângulo não construtível** (1 principal, 14 secondary, 7 lateral). O motor A0/A2/A3 (TASK-056) escolheria principal de borda, mas o fluxo padrão ("COMO USAR" passo 3) manda o usuário traçar a principal manualmente — o otimizador homologado fica em painel experimental. O software valida depois em vez de propor certo antes.

### CRÍTICA 3 — Furos hidráulicos pontuais
- **v = 2,26 m/s em laterais DN50** (S1/C1 13,5 m³/h; S2/C3; S3/C3) — critério de lateral é só ΔH/Ps ≤ 20%; velocidade não trava lateral; risco de golpe de aríete em PN40 com registro manual.
- **Trechos de 0,5 m / 1 aspersor** no memorial (S3/C1, S5/C1) — fragmentos de setorização viram "lateral".
- **BUG (ADR-002):** `selectDiameter` em `src/lib/hydraulics/hazenWilliams.ts` usa `tubo.diametroMm` (nominal) em vez de `diametroInternoMm` no HW — subestima hf em ~47% (DN50: (50/46)^4,87). Path consumido por diagnósticos geométricos.
- Sem verificação de pressão residual no último aspersor; bomba validada por 2 escalares (sem curva Q-H); desnível escalar único (`waterSource_elevation_only`).

### CRÍTICA 4 — Nº de setores = jornada em horas
`layout-use-cases.ts`: 14 h de jornada → 14 setores. Não emerge de lâmina × turno × vazão disponível. Operação: 14 manobras de registro/dia.

### CRÍTICA 5 — BOM cara e com inconsistência de classe
- **R$ 29.343/ha** (sem bomba/filtros/instalação). Motores: 619 barras LF DN75 nas laterais; sub-coletores rígido DN125 **PN80** para HMT 33,8 (catálogo rígido só tem PN80); principal **DN125 vs DN94 calculado**.
- **Tês LF (PN40) sobre sub-coletores PN80** — `TES_DERIVACAO_LATERAL` só tem LF; classe da conexão ≠ classe do tubo.
- Item fantasma na BOM: "Tubo rígido Ø50 PN80 (ramais) — 0 barra × R$62 = R$0,00".
- `custo: 0` em quase todo catálogo (sem análise de margem possível); curva 45° de adutora sem SKU (captação diagonal = bloqueio permanente); 3 SKUs de kit DN50 com `marca: ""`.

### CRÍTICA 6 — UX que mina confiança
- **PDF falha em silêncio**: 422 retornou, mas o painel de "PDF bloqueado" está aninhado dentro do bloco vermelho (data-block) em `ProjectMap.tsx`; quando todos os blockers são rt-pending (azuis), o 422 não produz NENHUM feedback visível (spinner morre e nada acontece). Regressão da reorganização B-05/W-08 (nightly 2026-05-25).
- Labels de setor 7–14 empilhados/sobrepostos na borda do talhão (pendência P2 antiga viva).
- Abrir o projeto dispara `saveProjectLayout` (escrita no banco ao visualizar).
- 29 projetos "x"/"k"/"q" todos `Rascunho` — sem ciclo de status que separe teste de proposta real.
- Console spam (mesma mensagem da adutora dezenas de vezes).
- `prisma:error Error in PostgreSQL connection: Closed` transiente no log.

## 4. Classificação 4-tier (subagent metodológico)

| Categoria | N | Exemplos |
|---|---|---|
| Regra técnica | 1 | ADR-002 violada em `selectDiameter` |
| Boa prática | 7 | perdas locais 10% p/ fishbone; margem 2 mca; C=145 fixo; pressão no último aspersor; curva Q-H |
| Decisão de engenharia | 5 | elevação escalar; 12×12 fixo; setores=jornada; sem vento |
| Decisão comercial | 3 | custo=0; curva 45° sem SKU; marca vazia |

## 5. Prioridades recomendadas

| # | Ação | Esforço | Encaminhamento |
|---|---|---|---|
| 1 | `selectDiameter` nominal→interno | XS | **TASK-058 (esta sessão)** |
| 2 | Feedback do PDF 422 com blockers só rt-pending | XS | **TASK-058 (esta sessão)** |
| 3 | Plugar motor A0/A2/A3 no fluxo de traçado da principal | M | task futura (decisão de produto) |
| 4 | Módulo agronômico mínimo (lâmina input, intensidade vs infiltração, vento/CU) | M-G | requer RT + agrônomo |
| 5 | Catálogo: curva 45° PN80, tês PN80, custos de aquisição, marcas | RT/comercial | homologação |
| 6 | Setores derivados de lâmina×turno×vazão | M | requer RT |

Relatório integral do subagent (15 achados, arquivos consultados) preservado no transcript da sessão de 2026-06-11; achados centrais incorporados acima.
