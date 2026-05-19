/**
 * Utilitários geográficos puros — parsing e validação de coordenadas.
 *
 * Formato suportado: graus decimais com ponto como separador decimal.
 *   "-14.223344, -42.781234"  — vírgula como separador de coordenadas
 *   "-14.223344 -42.781234"   — espaço como separador de coordenadas
 *
 * Pendência: suporte a vírgula decimal brasileira ("-14,223344; -42,781234")
 * requer detecção de contexto (vírgula = decimal vs. separador) e será
 * implementado em tarefa futura após validação de campo.
 */

export type ParseCoordinateResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string };

/**
 * Tenta interpretar `input` como um par de coordenadas lat/lng decimais.
 * Retorna `{ ok: true, lat, lng }` quando válido, ou `{ ok: false, error }`.
 *
 * Aceita:
 *   "-14.223344, -42.781234"
 *   "-14.223344 -42.781234"
 *   "  -14.223344 ,  -42.781234  " (espaços extras tolerados)
 *
 * Rejeita:
 *   texto livre sem números
 *   apenas um número
 *   lat fora de [-90, 90]
 *   lng fora de [-180, 180]
 */
export function parseCoordinate(input: string): ParseCoordinateResult {
  const trimmed = input.trim();

  // Captura exatamente dois números decimais separados por vírgula e/ou espaços.
  // O sinal negativo é permitido. Ponto como único separador decimal.
  const match = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/,
  );

  if (!match) {
    return {
      ok: false,
      error:
        'Formato não reconhecido. Use graus decimais: -14.223344, -42.781234',
    };
  }

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (lat < -90 || lat > 90) {
    return {
      ok: false,
      error: `Latitude ${lat.toFixed(6)} fora do intervalo válido [-90, 90].`,
    };
  }
  if (lng < -180 || lng > 180) {
    return {
      ok: false,
      error: `Longitude ${lng.toFixed(6)} fora do intervalo válido [-180, 180].`,
    };
  }

  return { ok: true, lat, lng };
}
