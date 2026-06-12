import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/brand/Header";
import {
  buttonClass,
  StatCard,
  StatusBadge,
  EmptyState,
} from "@/components/ui/primitives";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PRELIMINARY: "Preliminar",
  FINAL_PENDING_APPROVAL: "Aguardando aprovação",
  FINAL_RELEASED: "Liberada",
  SENT: "Enviada",
  WON: "Ganha",
  LOST: "Perdida",
};

/** Ponto colorido do status — semântica preservada da versão anterior. */
const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-ink-4",
  PRELIMINARY: "bg-warning",
  FINAL_PENDING_APPROVAL: "bg-warning",
  FINAL_RELEASED: "bg-success",
  SENT: "bg-info",
  WON: "bg-success",
  LOST: "bg-danger",
};

const EM_ANDAMENTO = new Set(["DRAFT", "PRELIMINARY", "FINAL_PENDING_APPROVAL"]);
const EMITIDAS = new Set(["FINAL_RELEASED", "SENT"]);

export default async function ProjetosPage() {
  const { userId } = await auth();
  const projects = await prisma.project.findMany({
    where: { ownerId: userId! },
    orderBy: { updatedAt: "desc" },
  });

  const emAndamento = projects.filter((p) => EM_ANDAMENTO.has(p.status)).length;
  const emitidas = projects.filter((p) => EMITIDAS.has(p.status)).length;
  const ganhas = projects.filter((p) => p.status === "WON").length;

  return (
    <main className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-7xl mx-auto px-5 py-10">
        {/* ── Cabeçalho ── */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">
              Projetos
            </h1>
            <p className="text-sm text-ink-3 mt-0.5">
              Portfólio técnico-comercial de irrigação por aspersão
            </p>
          </div>
          <Link href="/projetos/novo" className={buttonClass("primary", "md")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo projeto
          </Link>
        </div>

        {/* ── Métricas ── */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total" value={projects.length} />
            <StatCard label="Em andamento" value={emAndamento} tone="brand" />
            <StatCard label="Liberadas / enviadas" value={emitidas} tone="warning" />
            <StatCard label="Ganhas" value={ganhas} tone="success" />
          </div>
        )}

        {/* ── Lista ── */}
        {projects.length === 0 ? (
          <EmptyState
            icon={
              <div className="w-16 h-16 rounded-xl bg-brand-50 text-brand flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              </div>
            }
            title="Nenhum projeto ainda"
            description="Crie o primeiro projeto técnico-comercial: da área no mapa à proposta em PDF, com a metodologia Brasmáquinas aplicada de ponta a ponta."
            action={
              <Link href="/projetos/novo" className={buttonClass("primary", "md")}>
                Criar primeiro projeto
              </Link>
            }
          />
        ) : (
          <div className="bg-background border border-border rounded-lg shadow-card overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-border bg-surface">
                <tr>
                  {["Projeto", "Cliente", "Local", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] px-6 py-3"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="text-right text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] px-6 py-3">
                    Atualizado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <Link
                        href={`/projetos/${p.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="w-9 h-9 rounded-md bg-brand-50 border border-brand-100 text-brand text-xs font-semibold flex items-center justify-center shrink-0">
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-medium text-ink group-hover:text-brand transition-colors">
                          {p.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">
                      {p.client ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">
                      {[p.city, p.state].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        label={STATUS_LABEL[p.status] ?? p.status}
                        dotClass={STATUS_DOT[p.status] ?? "bg-ink-4"}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-3 text-right font-mono tabular">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                      }).format(p.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
