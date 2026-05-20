import { describe, it, expect } from "vitest";
import * as turf from "@turf/turf";
import {
  findOptimalGridAngle,
  generateRotatedSprinklerGrid,
} from "@/lib/layout/sprinkler-grid";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SPACING = 12; // m — espaçamento padrão Brasmáquinas

// Referência: coordenada central usada nos outros testes do projeto
const CENTER_LNG = -46.0;
const CENTER_LAT = -12.0;

// Aproximação: 1° lat ≈ 111320 m, 1° lng (lat=-12°) ≈ 108900 m
const DEG_PER_M_LAT = 1 / 111320;
const DEG_PER_M_LNG = 1 / (111320 * Math.cos((CENTER_LAT * Math.PI) / 180));

/** Cria um polígono retangular com largura e altura em metros, centrado em CENTER. */
function rectPolygon(widthM: number, heightM: number): GeoJSON.Polygon {
  const dLng = (widthM / 2) * DEG_PER_M_LNG;
  const dLat = (heightM / 2) * DEG_PER_M_LAT;
  const ring: [number, number][] = [
    [CENTER_LNG - dLng, CENTER_LAT - dLat],
    [CENTER_LNG + dLng, CENTER_LAT - dLat],
    [CENTER_LNG + dLng, CENTER_LAT + dLat],
    [CENTER_LNG - dLng, CENTER_LAT + dLat],
    [CENTER_LNG - dLng, CENTER_LAT - dLat], // fecha o anel
  ];
  return { type: "Polygon", coordinates: [ring] };
}

/** Polígono em L (côncavo): 120m × 120m menos o canto inferior-direito 60m × 60m. */
function lShapePolygon(): GeoJSON.Polygon {
  const s = 120 * DEG_PER_M_LNG;
  const h = 120 * DEG_PER_M_LAT;
  const mx = CENTER_LNG;
  const my = CENTER_LAT;
  const ring: [number, number][] = [
    [mx,       my      ],
    [mx + s,   my      ],
    [mx + s,   my + h/2],
    [mx + s/2, my + h/2],
    [mx + s/2, my + h  ],
    [mx,       my + h  ],
    [mx,       my      ],
  ];
  return { type: "Polygon", coordinates: [ring] };
}

// ─────────────────────────────────────────────────────────────────────────────
// generateRotatedSprinklerGrid
// ─────────────────────────────────────────────────────────────────────────────

describe("generateRotatedSprinklerGrid", () => {
  it("retângulo alinhado (0°) — todos os pontos dentro do polígono", () => {
    const poly = rectPolygon(120, 60);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 0);

    expect(positions.length).toBeGreaterThan(0);

    // Nenhum ponto pode estar fora da área irrigada
    const polyFeature = turf.polygon(poly.coordinates);
    for (const [lng, lat] of positions) {
      const inside = turf.booleanPointInPolygon(turf.point([lng, lat]), polyFeature);
      expect(inside).toBe(true);
    }
  });

  it("retângulo alinhado (0°) — contagem dentro do intervalo esperado", () => {
    // 120m × 60m = 7200 m²; grid 12×12 → área célula 144 m² → ~50 pontos teóricos
    const poly = rectPolygon(120, 60);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 0);

    expect(positions.length).toBeGreaterThan(20);
    expect(positions.length).toBeLessThan(100);
  });

  it("área inclinada (30°) — todos os pontos dentro do polígono original", () => {
    // O polígono de referência é o retângulo original (não rotacionado).
    // Após gerar a grade a 30° e desfazer a rotação, os pontos devem cair dentro
    // do polígono original — valida que a rotação de volta é exata.
    const poly = rectPolygon(120, 60);
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 30);

    expect(positions.length).toBeGreaterThan(0);

    const polyFeature = turf.polygon(poly.coordinates);
    for (const [lng, lat] of positions) {
      const inside = turf.booleanPointInPolygon(turf.point([lng, lat]), polyFeature);
      expect(inside).toBe(true);
    }
  });

  it("polígono em L (côncavo) — nenhum ponto fora da área", () => {
    // Forma côncava verifica que pointsWithinPolygon não extravasa para a região
    // do "canto recortado" do L.
    const poly = lShapePolygon();
    const positions = generateRotatedSprinklerGrid(poly, SPACING, 0);

    expect(positions.length).toBeGreaterThan(0);

    const polyFeature = turf.polygon(poly.coordinates);
    for (const [lng, lat] of positions) {
      const inside = turf.booleanPointInPolygon(turf.point([lng, lat]), polyFeature);
      expect(inside).toBe(true);
    }
  });

  it("determinismo — mesma entrada produz exatamente a mesma saída", () => {
    // A disposição dos aspersores deve ser determinística: polígono + espaçamento +
    // ângulo é tudo que importa.  A captação não entra como parâmetro e, portanto,
    // não pode influenciar o resultado.
    const poly = rectPolygon(120, 60);
    const a = generateRotatedSprinklerGrid(poly, SPACING, 15);
    const b = generateRotatedSprinklerGrid(poly, SPACING, 15);

    expect(a).toEqual(b);
  });

  it("independência da captação — a função não aceita waterSource como parâmetro", () => {
    // Garantia estrutural: a assinatura da função recebe apenas polígono, espaçamento
    // e ângulo.  A captação entra em etapas posteriores (principal, adutora, hidráulica).
    // Este teste documenta a invariante explicitamente — se a assinatura mudar para
    // aceitar waterSource, a função deve ser reprovada em revisão de TASK-010A.
    const poly = rectPolygon(96, 48);
    const result = generateRotatedSprinklerGrid(poly, SPACING, 0);

    // A função retorna posições sem precisar de waterSource — este é o critério.
    expect(Array.isArray(result)).toBe(true);
    expect(result.every(([lng, lat]) => typeof lng === "number" && typeof lat === "number")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// findOptimalGridAngle
// ─────────────────────────────────────────────────────────────────────────────

describe("findOptimalGridAngle", () => {
  it("retorna inteiro no intervalo [0, 89]", () => {
    const poly = rectPolygon(120, 60);
    const angle = findOptimalGridAngle(poly);

    expect(Number.isInteger(angle)).toBe(true);
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThanOrEqual(89);
  });

  it("retângulo horizontal (largura >> altura) retorna ângulo ≤ 10°", () => {
    // Retângulo 300m × 60m alinhado com os eixos: o bbox mínimo já está alinhado,
    // então o ângulo ótimo deve ser 0° ou próximo.
    const poly = rectPolygon(300, 60);
    const angle = findOptimalGridAngle(poly);

    expect(angle).toBeLessThanOrEqual(10);
  });
});
