"use client";

import { useCallback } from "react";
import { X, FileDown } from "lucide-react";
import type { Lateral } from "@/lib/layout/laterais";

interface Props {
  laterais: Lateral[];
  projectName?: string;
  client?: string;
  city?: string;
  state?: string;
  onClose: () => void;
}

function formatPct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

function buildMarkdown(
  laterais: Lateral[],
  projectName: string,
  client: string,
  city: string,
  state: string,
  date: string,
): string {
  const header = [
    `# Memorial descritivo — ${projectName}`,
    ``,
    `| Campo | Valor |`,
    `|---|---|`,
    `| Cliente | ${client || "—"} |`,
    `| Município / UF | ${[city, state].filter(Boolean).join(" / ") || "—"} |`,
    `| Data | ${date} |`,
    `| Norma | V0.5-RC — Naan 5022, H-W C=145, Christiansen F |`,
    ``,
    `## Trechos de laterais`,
    ``,
    `| Setor | Coluna | Vazão (m³/h) | Comprimento (m) | Ø (mm) | ΔH (m) | ΔH/Ps | v (m/s) |`,
    `|---|---|---|---|---|---|---|---|`,
  ].join("\n");

  const rows = laterais
    .map(
      (l) =>
        `| S${l.sectorId + 1} | C${l.columnIndex + 1} | ${l.vazaoM3h.toFixed(2)} | ${l.comprimentoM.toFixed(1)} | ${l.selecao.tubo.diametroMm} | ${l.selecao.perdaCargaM.toFixed(3)} | ${formatPct(l.selecao.perdaCargaPercentual)} | ${l.selecao.velocidadeMs.toFixed(2)} |`,
    )
    .join("\n");

  const footer = [
    ``,
    `---`,
    `Memorial descritivo gerado pela plataforma Brasmáquinas, conforme V0.5-RC`,
  ].join("\n");

  return [header, rows, footer].join("\n");
}

export function MemorialPanel({
  laterais,
  projectName = "Projeto",
  client = "",
  city = "",
  state = "",
  onClose,
}: Props) {
  const hoje = new Date().toLocaleDateString("pt-BR");

  const exportar = useCallback(() => {
    const md = buildMarkdown(laterais, projectName, client, city, state, hoje);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memorial-${projectName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [laterais, projectName, client, city, state, hoje]);

  return (
    <div className="absolute top-16 left-4 z-20 w-[min(560px,calc(100vw-2rem))] max-h-[calc(100vh-120px)] flex flex-col bg-white/97 backdrop-blur-md border border-border rounded-lg shadow-overlay overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <h2 className="text-[11px] font-semibold text-ink uppercase tracking-[0.12em]">
            Memorial descritivo
          </h2>
          <p className="text-[10px] text-ink-4 mt-0.5 font-mono">
            {laterais.length} {laterais.length === 1 ? "trecho" : "trechos"} · V0.5-RC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportar}
            disabled={laterais.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium bg-ink text-white rounded-sm hover:bg-ink/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-3 h-3" />
            Exportar .md
          </button>
          <button
            onClick={onClose}
            className="p-1 text-ink-4 hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {laterais.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-ink-4">
          Nenhuma lateral calculada. Posicione aspersores e defina a jornada.
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          <table className="w-full text-[11px] font-mono border-collapse">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-border">
                {["Setor", "Col.", "Vazão\nm³/h", "Comp.\nm", "Ø\nmm", "ΔH\nm", "ΔH/Ps", "v\nm/s"].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em] text-right first:text-left whitespace-pre-line leading-tight"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laterais.map((l, i) => (
                <tr
                  key={`${l.sectorId}-${l.columnIndex}`}
                  className={i % 2 === 0 ? "bg-background" : "bg-surface"}
                >
                  <td className="px-2 py-1.5 text-ink-2">S{l.sectorId + 1}</td>
                  <td className="px-2 py-1.5 text-ink-3 text-right">C{l.columnIndex + 1}</td>
                  <td className="px-2 py-1.5 text-ink text-right">{l.vazaoM3h.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-ink text-right">{l.comprimentoM.toFixed(1)}</td>
                  <td className="px-2 py-1.5 text-ink text-right">{l.selecao.tubo.diametroMm}</td>
                  <td className="px-2 py-1.5 text-ink text-right">{l.selecao.perdaCargaM.toFixed(3)}</td>
                  <td
                    className={
                      l.selecao.perdaCargaPercentual > 0.18
                        ? "px-2 py-1.5 text-right text-amber-700"
                        : "px-2 py-1.5 text-right text-ink"
                    }
                  >
                    {formatPct(l.selecao.perdaCargaPercentual)}
                  </td>
                  <td className="px-2 py-1.5 text-ink text-right">{l.selecao.velocidadeMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-2 border-t border-border shrink-0 text-[10px] text-ink-4 italic">
        Hazen-Williams C=145 · Christiansen F (m=1.852) · critério ΔH/Ps ≤ 20%
      </div>
    </div>
  );
}
