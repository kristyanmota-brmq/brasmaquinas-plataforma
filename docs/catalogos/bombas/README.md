# Catálogos de bombas — THEBE e EBARA

Catálogos oficiais dos fabricantes para homologação de bombas no projeto
(`BOMBAS_HOMOLOGADAS` em `src/lib/catalog/aspersores.ts`).

**Contexto:** a Thebe Bombas Hidráulicas faz parte do grupo EBARA no Brasil
(EBAS — Ebara Bombas América do Sul). O portal único de downloads é
<https://www.ebara.com.br/downloads>, que cobre as duas marcas.

Os PDFs **não são versionados** (são grandes — ~136 MB no total; ver `.gitignore`).
Para obtê-los novamente, use as URLs abaixo.

## Arquivos baixados (2026-06-12)

| Arquivo local | Conteúdo | Páginas | Fonte oficial |
|---|---|---|---|
| `ebara-catalogo-produtos-superficie-60hz-2025.pdf` | Catálogo de Produtos de Superfície 60 Hz 2025 (rev. 00) — portfólio completo Ebara/Thebe com tabelas vazão (m³/h) × altura manométrica (mca) por modelo/potência | 140 | [ebara.com.br/downloads](https://www.ebara.com.br/download/ZG93bmxvYWQvY2F0YWxvZ28tZGUtcHJvZHV0b3MtZGUtc3VwZXJmaWNpZS0yMDI1LTYwaHotcmV2MDAtMjAyNS13ZWIucGRm) |
| `ebara-thebe-curvas-seriadas-2022.pdf` | Catálogo Geral de Curvas Seriadas 60 Hz 2022 — curvas Q-H das linhas Thebe (B, TH, THS, THB, THL, R 16/18/20, RL, P 11/15/18, PX, CDX…) + tabelas de perda de carga e seleção | 143 | [ebara.com.br/downloads](https://www.ebara.com.br/download/ZG93bmxvYWQvY2F0YWxvZ28tZ2VyYWwtZGUtY3VydmFzLXNlcmlhZGFzLTIwMjItY29tcGxldG8tMi5wZGY) |
| `ebara-catalogo-tecnico-gs-gsd-gsdt-60hz.pdf` | Catálogo Técnico Normalizadas GS/GSD/GSDT 60 Hz 2025 (EN 733) — família do GSD Megabloc já homologado; curvas, rotores, NPSH | 102 | [ebara.com.br/downloads](https://www.ebara.com.br/download/ZG93bmxvYWQvY2F0YWxvZ28tZ3MtZ3NkLWdzZHQtNjAtaHotbm9ybWFsaXphZGFzLnBkZg) |
| `thebe-bombas-agrolink.pdf` | Catálogo de produtos Thebe (distribuidor Agrolink Irriga) — referência cruzada | 68 | [agrolinkirriga.com.br](https://www.agrolinkirriga.com.br/pdf/motobombas/THEBE-Bombas.pdf) |
| `thebe-curvas-agrolink.pdf` | Curvas Thebe (distribuidor Agrolink Irriga) — referência cruzada | 95 | [agrolinkirriga.com.br](https://www.agrolinkirriga.com.br/pdf/motobombas/THEBE-Curvas.pdf) |

## Linhas relevantes para irrigação por aspersão

- **Thebe monoestágio 3500 rpm:** B 10/12/13/15, TH 11/12/16, THS 18, THB 13/18, THL 13/18, R 16/18/20, RL 14/25
- **Thebe multiestágio 3500 rpm:** P 11, P 15, P 15D, PX 15, P 18, RL 16/2, RL 16/3, RL 20/2
- **Ebara normalizadas (EN 733):** GS / GSD (Megabloc) / GSDT — 1750 e 3500 rpm, rotores 125–315 mm

## Como isso alimenta o código

A interface `BombaCatalogo` exige hoje **ponto nominal** apenas:
`modelo`, `marca`, `potenciaCv?`, `vazaoMaxM3h`, `hmtMca`, `fonte`.
O catálogo de produtos 2025 traz exatamente essas tabelas (vazão × HMT por
potência). A curva Q-H multiponto (catálogos de curvas) é trilho futuro da
validação de bomba (`validatePump` em `src/lib/layout/hydraulic-sizing.ts`).

**Regra do projeto:** toda inclusão em `BOMBAS_HOMOLOGADAS` passa por
homologação do RT (`docs/metodologia/12-premissas-provisorias-e-revisao-rt.md`)
e cita a `fonte` (catálogo + página).
