# TASK-007 — Localizar projeto por endereço ou coordenadas no mapa

**Status:** `pendente`
**Prioridade:** P2-importante
**Área:** mapa / UX operacional
**Criado em:** 2026-05-19
**Atualizado em:** 2026-05-19

---

## 1. Contexto

O software de irrigação por aspersão convencional da Brasmáquinas usa mapa para desenhar área,
posicionar captação e gerar layout.

Hoje, o usuário precisa navegar manualmente no mapa até encontrar a propriedade. Isso cria atrito
operacional para o vendedor, especialmente quando o cliente informa:

- nome da fazenda;
- endereço aproximado;
- comunidade/região;
- cidade/estado;
- coordenadas de captação;
- coordenadas de entrada da área;
- ponto enviado por WhatsApp ou Google Earth.

Esta tarefa deve melhorar a entrada geográfica inicial, permitindo:

1. pesquisar por endereço/local;
2. inserir coordenadas manualmente;
3. centralizar o mapa no ponto encontrado;
4. opcionalmente usar o ponto como referência ou captação.

---

## 2. Objetivo

Adicionar ao mapa uma opção para o usuário localizar rapidamente o projeto por:

- pesquisa de endereço/local;
- inserção de coordenadas em latitude/longitude.

A funcionalidade deve ajudar o vendedor a iniciar o desenho do projeto com menos erro e menos tempo.

---

## 3. Escopo

### Inclui

- Campo de busca por endereço/local no mapa.
- Campo para inserir coordenadas.
- Validação básica de latitude e longitude.
- Centralização do mapa no resultado.
- Marcador temporário de localização encontrada.
- Ação opcional: "usar como captação".
- Mensagens claras de erro quando o endereço não for encontrado ou coordenada for inválida.

### Não inclui

- Importação KMZ/KML.
- Georreferenciamento automático de área.
- Desenho automático do polígono.
- Definição automática da captação sem confirmação do usuário.
- Alteração no solver hidráulico.
- Alteração em BOM.
- Alteração em PDF/proposta.
- Alteração na classificação A/B/C.

---

## 4. Arquivos prováveis

- `src/components/map/ProjectMap.tsx`
- `src/components/map/MapSearchControl.tsx` — novo componente (se fizer sentido separar)
- `src/components/map/CoordinateInputControl.tsx` — novo componente (alternativa ao acima)
- `src/lib/layout/__tests__/` — se houver utilitário puro testável (ex: parseCoordinate)
- `.env.example` — somente se necessário documentar variável de geocoding

---

## 5. Regras metodológicas aplicáveis

Referências:

- `docs/metodologia/04-layout-earth-first.md`
- `docs/metodologia/08-logs-e-auditoria.md`
- `docs/metodologia/11-disciplina-operacional.md`
- `docs/software/arquitetura.md`
- `docs/software/padroes-codigo.md`

| Regra | Classificação |
|-------|--------------|
| Coordenada/endereço ajuda a localizar o projeto, mas não valida tecnicamente a área | boa prática |
| Ponto encontrado não deve virar captação automaticamente sem confirmação | decisão de engenharia |
| Localização por endereço pode ter erro e deve ser conferida visualmente | pendente de validação de campo |
| Cálculos críticos não devem depender de endereço textual | regra técnica validada |
| A entrada geográfica deve ser rastreável quando afetar projeto salvo | decisão de engenharia |

---

## 6. Requisitos funcionais

### RF-01 — Pesquisa por endereço

O usuário deve conseguir digitar um endereço/local, por exemplo:

- "Fazenda Varjota, Varjota CE"
- "Guanambi BA"
- "Luis Eduardo Magalhães BA"
- "Fazenda Santa Maria, Barreiras BA"

O sistema deve:

1. consultar o provedor de geocodificação;
2. listar ou selecionar o melhor resultado;
3. centralizar o mapa no ponto;
4. exibir marcador de localização encontrada;
5. informar quando não houver resultado.

### RF-02 — Inserção de coordenadas

O usuário deve conseguir inserir coordenadas em formato decimal:

```
-14.223344, -42.781234
```

O sistema deve:

1. aceitar entrada com vírgula ou espaço como separador;
2. validar que latitude está em [-90, 90] e longitude em [-180, 180];
3. centralizar o mapa no ponto inserido;
4. exibir marcador temporário de localização;
5. exibir mensagem de erro clara quando o formato for inválido.

### RF-03 — Marcador temporário

- O marcador deve ser visualmente distinto dos aspersores e da captação.
- Deve desaparecer quando o usuário iniciar o desenho ou fechar o painel de busca.
- Não deve ser salvo no layout do projeto.

### RF-04 — Ação opcional "usar como captação"

- Após centralizar o mapa em um ponto (por endereço ou coordenada), exibir botão
  "Usar como captação".
- Ao confirmar, o ponto deve ser tratado como se o usuário tivesse clicado no mapa em
  modo de captação — seguindo o mesmo fluxo existente (sem bypass).
- Não definir a captação silenciosamente.

---

## 7. Critérios de aceite

- [ ] Usuário pode buscar endereço e o mapa centraliza no resultado
- [ ] Usuário pode inserir coordenadas decimais e o mapa centraliza no ponto
- [ ] Coordenada inválida exibe mensagem de erro (não quebra o mapa)
- [ ] Endereço não encontrado exibe mensagem de erro
- [ ] Marcador temporário aparece e desaparece corretamente
- [ ] "Usar como captação" segue o fluxo existente de posicionamento
- [ ] Nenhum dado de endereço é salvo automaticamente no layout
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `npx vitest run` → sem regressão de contagem

---

## 8. Decisões a tomar no `/planejar`

| Decisão | Opções | Impacto |
|---------|--------|---------|
| Provedor de geocodificação | Nominatim (gratuito, OSM) vs. Mapbox Geocoding API vs. Google Places | Custo, cobertura rural, termos de uso |
| Componente separado ou inline | `MapSearchControl.tsx` vs. bloco em `ProjectMap.tsx` | Manutenibilidade vs. simplicidade |
| Utilitário `parseCoordinate` | Puro + testado vs. inline no componente | Testabilidade |
| Posição no mapa | Canto superior esquerdo vs. canto superior direito vs. barra de ferramentas | UX |

---

## 9. Testes obrigatórios

Se `parseCoordinate` for extraído como função pura:

1. **Entrada válida decimal com vírgula** → `{ lat, lng }` correto
2. **Entrada válida decimal com espaço** → `{ lat, lng }` correto
3. **Latitude fora de [-90, 90]** → erro
4. **Longitude fora de [-180, 180]** → erro
5. **Formato inválido (texto livre)** → erro

Se não houver utilitário puro, testes de comportamento via Playwright ou equivalente
(a definir no `/planejar`).

---

## 10. Fora do escopo

- Importação KMZ/KML/GPX
- Georreferenciamento automático da área
- Busca por CEP exclusivamente
- Histórico de buscas
- Sugestões automáticas (autocomplete) — pode ser considerado melhoria futura
- Salvar endereço textual no projeto
- Qualquer alteração em solver, BOM, PDF, classificação A/B/C

---

## 11. Riscos e dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:---:|:---:|---------|
| Nominatim tem cobertura rural limitada no Brasil | média | médio | Testar com fazendas reais antes de definir provedor; deixar provedor configurável |
| Adicionar variável de ambiente de API key sem documentar | baixa | médio | Documentar em `.env.example` se necessário |
| Marcador temporário interferir com camadas do mapa | baixa | baixo | Usar layer dedicado, limpar no unmount |
| "Usar como captação" bypassar validação existente | baixa | alto | Reutilizar exatamente o handler existente de posicionamento de captação |

**Dependências:** nenhuma. Pode ser iniciada independentemente de TASK-004/005.

---

## Plano de implementação

> A ser preenchido pelo agente ao executar `/planejar TASK-007`.

---

## Log de alterações

| Data | Autor | O que mudou |
|------|-------|-------------|
| 2026-05-19 | Claude Sonnet 4.6 | Tarefa criada |
