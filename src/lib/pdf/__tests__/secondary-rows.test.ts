import { describe, expect, it } from "vitest";
import {
  mapSizedSecondariesToRows,
  secondaryStatusLabel,
} from "@/lib/pdf/secondary-rows";
import type { SecondaryStatus, SizedSecondaryPipe } from "@/lib/layout/secondary-sizing";
import type { TuboCandidato } from "@/lib/hydraulics/hazenWilliams";

function makeTube(sku: string, diametroMm: number): TuboCandidato {
  return {
    sku,
    diametroMm,
    diametroInternoMm: diametroMm - 5,
    pressaoMca: 80,
    custo: 100,
    precoVenda: 215,
    coefC: 145,
  };
}

function makeSecondary(
  overrides: Partial<SizedSecondaryPipe> & { id: string; status: SecondaryStatus },
): SizedSecondaryPipe {
  const sku = overrides.selectedTube?.sku ?? "TUBO-75";
  const dn = overrides.diametroMm ?? 75;
  return {
    id: overrides.id,
    physicalColumnId: overrides.physicalColumnId ?? `col-${overrides.id}`,
    fromCoord: overrides.fromCoord ?? [-43.0, -12.0],
    toCoord: overrides.toCoord ?? [-43.0, -12.001],
    lengthM: overrides.lengthM ?? 150,
    source: "auto",
    flowM3h: overrides.flowM3h ?? 18,
    selectedTube: overrides.selectedTube ?? makeTube(sku, dn),
    diametroMm: dn,
    diametroInternoMm: overrides.diametroInternoMm ?? dn - 5,
    velocityMs: overrides.velocityMs ?? 1.2,
    headLossMca: overrides.headLossMca ?? 2.4,
    velocityExceeds: overrides.velocityExceeds ?? false,
    headLossExceeds: overrides.headLossExceeds ?? false,
    status: overrides.status,
  };
}

describe("secondary-rows — secondaryStatusLabel (T47-1..T47-5)", () => {
  it("T47-1: status 'ok' retorna severity 'ok' com texto discreto 'OK'", () => {
    const label = secondaryStatusLabel("ok");
    expect(label.severity).toBe("ok");
    expect(label.text).toBe("OK");
  });

  it("T47-2: status 'velocity_exceeded' retorna severity 'warning'", () => {
    const label = secondaryStatusLabel("velocity_exceeded");
    expect(label.severity).toBe("warning");
    expect(label.text).toMatch(/velocidade/i);
  });

  it("T47-3: status 'headloss_exceeded' retorna severity 'warning'", () => {
    const label = secondaryStatusLabel("headloss_exceeded");
    expect(label.severity).toBe("warning");
    expect(label.text).toMatch(/perda/i);
  });

  it("T47-4: status 'both_exceeded' retorna severity 'warning'", () => {
    const label = secondaryStatusLabel("both_exceeded");
    expect(label.severity).toBe("warning");
    expect(label.text).toMatch(/velocidade/i);
    expect(label.text).toMatch(/perda/i);
  });

  it("T47-5: status 'fallback_largest' retorna severity 'warning'", () => {
    const label = secondaryStatusLabel("fallback_largest");
    expect(label.severity).toBe("warning");
    expect(label.text).toMatch(/fallback/i);
  });
});

describe("secondary-rows — mapSizedSecondariesToRows (T47-6..T47-8)", () => {
  it("T47-6: array vazio retorna [] sem erro", () => {
    const rows = mapSizedSecondariesToRows([]);
    expect(rows).toEqual([]);
  });

  it("T47-7: mapeamento completo expõe SKU, DN, comprimento, velocidade, hf e status formatados", () => {
    const tube = makeTube("TUBO-DN75-LF", 75);
    const sec = makeSecondary({
      id: "S01",
      selectedTube: tube,
      diametroMm: 75,
      lengthM: 180.5,
      velocityMs: 1.35,
      headLossMca: 2.84,
      status: "ok",
    });

    const rows = mapSizedSecondariesToRows([sec]);

    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.id).toBe("S01");
    expect(r.ramalLabel).toBe("S01");
    expect(r.sku).toBe("TUBO-DN75-LF");
    expect(r.dnLabel).toBe("Ø 75 mm");
    expect(r.lengthLabel).toBe("180,5 m");
    expect(r.velocityLabel).toBe("1,35 m/s");
    expect(r.hfLabel).toBe("2,84 mca");
    expect(r.status).toBe("ok");
    expect(r.statusLabel.severity).toBe("ok");
  });

  it("T47-8: ordenação determinística por id (numérica/natural)", () => {
    const secs = [
      makeSecondary({ id: "S03", status: "ok" }),
      makeSecondary({ id: "S01", status: "ok" }),
      makeSecondary({ id: "S10", status: "ok" }),
      makeSecondary({ id: "S02", status: "velocity_exceeded" }),
    ];

    const rows = mapSizedSecondariesToRows(secs);

    expect(rows.map((r) => r.id)).toEqual(["S01", "S02", "S03", "S10"]);
  });

  it("T47-9: não muta o array de entrada", () => {
    const original = [
      makeSecondary({ id: "S03", status: "ok" }),
      makeSecondary({ id: "S01", status: "ok" }),
    ];
    const snapshot = original.map((s) => s.id);

    mapSizedSecondariesToRows(original);

    expect(original.map((s) => s.id)).toEqual(snapshot);
  });
});
