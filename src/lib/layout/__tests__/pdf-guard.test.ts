import { describe, it, expect } from "vitest";
import {
  pdfEmissionBlockers,
  type IrrigationProjectResult,
} from "@/lib/layout/irrigation-project";

function makeResult(blockers: string[]): IrrigationProjectResult {
  return {
    diagnostics: { blockers } as IrrigationProjectResult["diagnostics"],
  } as unknown as IrrigationProjectResult;
}

describe("pdfEmissionBlockers", () => {
  it("retorna [] quando não há blockers — PDF pode ser gerado", () => {
    expect(pdfEmissionBlockers(makeResult([]))).toEqual([]);
  });

  it("retorna os blockers quando o projeto está bloqueado — PDF deve ser impedido", () => {
    const blockers = ["Bomba insuficiente para HMT calculada", "Corredor não validado"];
    const result = pdfEmissionBlockers(makeResult(blockers));
    expect(result).toHaveLength(2);
    expect(result).toContain("Bomba insuficiente para HMT calculada");
    expect(result).toContain("Corredor não validado");
  });

  it("retorna [] quando diagnostics é null — projeto incompleto não chega a ter blockers ativos", () => {
    const result = { diagnostics: null } as unknown as IrrigationProjectResult;
    expect(pdfEmissionBlockers(result)).toEqual([]);
  });
});
