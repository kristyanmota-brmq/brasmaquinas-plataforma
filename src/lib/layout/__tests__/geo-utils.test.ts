import { describe, it, expect } from "vitest";
import { parseCoordinate } from "@/lib/layout/geo-utils";

describe("parseCoordinate", () => {
  // ── Formatos válidos ──────────────────────────────────────────────────────

  it("aceita graus decimais separados por vírgula", () => {
    const result = parseCoordinate("-14.223344, -42.781234");
    expect(result).toEqual({ ok: true, lat: -14.223344, lng: -42.781234 });
  });

  it("aceita graus decimais separados por espaço", () => {
    const result = parseCoordinate("-14.223344 -42.781234");
    expect(result).toEqual({ ok: true, lat: -14.223344, lng: -42.781234 });
  });

  it("aceita espaços extras ao redor dos separadores", () => {
    const result = parseCoordinate("  -14.223344 ,  -42.781234  ");
    expect(result).toEqual({ ok: true, lat: -14.223344, lng: -42.781234 });
  });

  it("aceita coordenadas inteiras sem casas decimais", () => {
    const result = parseCoordinate("-14, -42");
    expect(result).toEqual({ ok: true, lat: -14, lng: -42 });
  });

  it("aceita coordenadas positivas (hemisfério norte/leste)", () => {
    const result = parseCoordinate("48.8566, 2.3522");
    expect(result).toEqual({ ok: true, lat: 48.8566, lng: 2.3522 });
  });

  // ── Latitude inválida ─────────────────────────────────────────────────────

  it("rejeita latitude acima de 90", () => {
    const result = parseCoordinate("91, -42");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/latitude/i);
  });

  it("rejeita latitude abaixo de -90", () => {
    const result = parseCoordinate("-91, -42");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/latitude/i);
  });

  // ── Longitude inválida ────────────────────────────────────────────────────

  it("rejeita longitude acima de 180", () => {
    const result = parseCoordinate("-14, 181");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/longitude/i);
  });

  it("rejeita longitude abaixo de -180", () => {
    const result = parseCoordinate("-14, -181");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/longitude/i);
  });

  // ── Texto livre rejeitado ─────────────────────────────────────────────────

  it("rejeita texto livre sem números", () => {
    const result = parseCoordinate("fazenda santa maria");
    expect(result.ok).toBe(false);
  });

  it("rejeita entrada com apenas um número", () => {
    const result = parseCoordinate("-14.22");
    expect(result.ok).toBe(false);
  });

  it("rejeita entrada vazia", () => {
    const result = parseCoordinate("   ");
    expect(result.ok).toBe(false);
  });

  // ── Pendência documentada ─────────────────────────────────────────────────
  // Vírgula decimal brasileira ("-14,223344; -42,781234") NÃO é suportada
  // nesta versão. Implementar em tarefa futura após validação de campo.
  it("rejeita vírgula decimal brasileira com ponto-e-vírgula (pendência futura)", () => {
    const result = parseCoordinate("-14,223344; -42,781234");
    // Comportamento atual: rejeita. Quando implementado, este teste deve ser atualizado.
    expect(result.ok).toBe(false);
  });
});
