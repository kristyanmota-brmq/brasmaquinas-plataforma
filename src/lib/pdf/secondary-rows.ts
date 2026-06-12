import type { SecondaryStatus, SizedSecondaryPipe } from "@/lib/layout/secondary-sizing";

export type StatusSeverity = "ok" | "warning";

export interface StatusLabel {
  text: string;
  severity: StatusSeverity;
}

export interface SecondaryDisplayRow {
  id: string;
  ramalLabel: string;
  sku: string;
  dnLabel: string;
  lengthLabel: string;
  velocityLabel: string;
  hfLabel: string;
  status: SecondaryStatus;
  statusLabel: StatusLabel;
}

function fmtN(n: number, dec: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function secondaryStatusLabel(status: SecondaryStatus): StatusLabel {
  switch (status) {
    case "ok":
      return { text: "OK", severity: "ok" };
    case "velocity_exceeded":
      return { text: "Velocidade excede limite", severity: "warning" };
    case "headloss_exceeded":
      return { text: "Perda de carga excede limite", severity: "warning" };
    case "both_exceeded":
      return { text: "Velocidade e perda excedem limite", severity: "warning" };
    case "fallback_largest":
      return { text: "Fallback (maior DN disponível)", severity: "warning" };
  }
}

export function mapSizedSecondariesToRows(
  secondaries: readonly SizedSecondaryPipe[],
): SecondaryDisplayRow[] {
  if (secondaries.length === 0) return [];

  // TASK-063: segmentos estruturais de comprimento ~0 (tês de cruzamento da
  // TASK-057 e spines degenerados) não são tubos — não entram no memorial.
  const visiveis = secondaries.filter((s) => s.lengthM >= 0.01);

  const sorted = [...visiveis].sort((a, b) =>
    a.id.localeCompare(b.id, "en", { numeric: true, sensitivity: "base" }),
  );

  return sorted.map((s) => ({
    id: s.id,
    ramalLabel: s.id,
    sku: s.selectedTube.sku,
    dnLabel: `Ø ${s.diametroMm} mm`,
    lengthLabel: `${fmtN(s.lengthM, 1)} m`,
    velocityLabel: `${fmtN(s.velocityMs, 2)} m/s`,
    hfLabel: `${fmtN(s.headLossMca, 2)} mca`,
    status: s.status,
    statusLabel: secondaryStatusLabel(s.status),
  }));
}
