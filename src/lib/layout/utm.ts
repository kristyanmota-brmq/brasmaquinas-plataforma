/**
 * TASK-081 — Coordenadas UTM (SIRGAS 2000) para exibição.
 *
 * Correção do RT da Brasmáquinas (sessão 2026-06-12): "todas as coordenadas
 * que aparecem para nós devem ser em UTM". Levantamento planialtimétrico,
 * memorial descritivo e ART trabalham em UTM E/N + fuso — não em graus
 * decimais. Armazenamento interno permanece lng/lat (Mapbox); UTM é a
 * camada de apresentação.
 *
 * Projeção Transversa de Mercator pela série de Krüger (ordem n⁴ — erro
 * sub-milimétrico dentro do fuso). Elipsoide GRS80 (SIRGAS 2000; idêntico ao
 * WGS84 para fins práticos: diferença < 1 mm).
 */

const A_GRS80 = 6378137;
const F_GRS80 = 1 / 298.257222101;
const K0 = 0.9996;
const FALSE_EASTING = 500000;
const FALSE_NORTHING_SOUTH = 10000000;

const n = F_GRS80 / (2 - F_GRS80);
const n2 = n * n;
const n3 = n2 * n;
const n4 = n3 * n;
const A_CAP = (A_GRS80 / (1 + n)) * (1 + n2 / 4 + n4 / 64);
const ALPHA = [
  n / 2 - (2 / 3) * n2 + (5 / 16) * n3 + (41 / 180) * n4,
  (13 / 48) * n2 - (3 / 5) * n3 + (557 / 1440) * n4,
  (61 / 240) * n3 - (103 / 140) * n4,
  (49561 / 161280) * n4,
];
const BETA = [
  n / 2 - (2 / 3) * n2 + (37 / 96) * n3 - (1 / 360) * n4,
  (1 / 48) * n2 + (1 / 15) * n3 - (437 / 1440) * n4,
  (17 / 480) * n3 - (37 / 840) * n4,
  (4397 / 161280) * n4,
];
const E_SQRT = (2 * Math.sqrt(n)) / (1 + n);

export interface UtmCoordinate {
  easting: number;
  northing: number;
  /** Fuso UTM (Brasil: 18 a 25). */
  zone: number;
  hemisphere: "N" | "S";
}

/** Fuso UTM a partir da longitude. */
export function utmZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

/** Conversão geográfica (graus) → UTM no fuso natural do ponto. */
export function latLngToUtm(lat: number, lng: number): UtmCoordinate {
  const zone = utmZone(lng);
  const lambda0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;

  const sinPhi = Math.sin(phi);
  const t = Math.sinh(
    Math.atanh(sinPhi) - E_SQRT * Math.atanh(E_SQRT * sinPhi),
  );
  const dl = lambda - lambda0;
  const xiP = Math.atan2(t, Math.cos(dl));
  const etaP = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));

  let xi = xiP;
  let eta = etaP;
  for (let j = 1; j <= 4; j++) {
    xi += ALPHA[j - 1] * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += ALPHA[j - 1] * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }

  const easting = FALSE_EASTING + K0 * A_CAP * eta;
  let northing = K0 * A_CAP * xi;
  const hemisphere: "N" | "S" = lat < 0 ? "S" : "N";
  if (hemisphere === "S") northing += FALSE_NORTHING_SOUTH;

  return { easting, northing, zone, hemisphere };
}

/** Conversão inversa UTM → geográfica (graus) — usada nos testes de ida-e-volta. */
export function utmToLatLng(u: UtmCoordinate): { lat: number; lng: number } {
  const lambda0 = ((u.zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const northing =
    u.hemisphere === "S" ? u.northing - FALSE_NORTHING_SOUTH : u.northing;
  const xi = northing / (K0 * A_CAP);
  const eta = (u.easting - FALSE_EASTING) / (K0 * A_CAP);

  let xiP = xi;
  let etaP = eta;
  for (let j = 1; j <= 4; j++) {
    xiP -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const chi = Math.asin(Math.sin(xiP) / Math.cosh(etaP));
  // Latitude da conforme por ponto fixo: φ = asin(tanh(ψ + e·atanh(e·sinφ))),
  // com ψ = atanh(sin χ). Converge em poucas iterações (sub-mm).
  const psi = Math.atanh(Math.sin(chi));
  let phi = chi;
  for (let i = 0; i < 10; i++) {
    phi = Math.asin(Math.tanh(psi + E_SQRT * Math.atanh(E_SQRT * Math.sin(phi))));
  }
  const lambda = lambda0 + Math.atan2(Math.sinh(etaP), Math.cos(xiP));

  return { lat: (phi * 180) / Math.PI, lng: (lambda * 180) / Math.PI };
}

const fmtBR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/**
 * Formato de exibição brasileiro: "E 512.345 m · N 8.456.789 m · 23S".
 * Resolução de 1 m — adequada para projeto de irrigação (espaçamento 12 m).
 */
export function formatUtm(lat: number, lng: number): string {
  const u = latLngToUtm(lat, lng);
  return `E ${fmtBR.format(Math.round(u.easting))} m · N ${fmtBR.format(Math.round(u.northing))} m · ${u.zone}${u.hemisphere}`;
}
