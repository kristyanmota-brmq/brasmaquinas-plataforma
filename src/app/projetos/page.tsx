import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/brand/Header";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PRELIMINARY: "Preliminar",
  FINAL_PENDING_APPROVAL: "Aguardando aprovação",
  FINAL_RELEASED: "Liberada",
  SENT: "Enviada",
  WON: "Ganha",
  LOST: "Perdida",
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-surface-2 text-ink-2 border-border",
  PRELIMINARY: "bg-warning-soft text-warning border-warning/20",
  FINAL_PENDING_APPROVAL: "bg-warning-soft text-warning border-warning/20",
  FINAL_RELEASED: "bg-success-soft text-success border-success/20",
  SENT: "bg-surface-2 text-ink-2 border-border",
  WON: "bg-success-soft text-success border-success/20",
  LOST: "bg-danger-soft text-danger border-danger/20",
};

export default async function ProjetosPage() {
  const { userId } = await auth();
  const projects = await prisma.project.findMany({
    where: { ownerId: userId! },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Projetos
            </h1>
            <p className="text-sm text-ink-3 mt-1">
              {projects.length === 0
                ? "Nenhum projeto ainda."
                : `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`}
            </p>
          </div>
          <Link
            href="/projetos/novo"
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-md font-medium text-sm transition-colors"
          >
            + Novo projeto
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="bg-background border border-border rounded-md p-16 text-center">
            <p className="text-ink-2 mb-2">Você ainda não tem projetos.</p>
            <p className="text-sm text-ink-3 mb-6">
              Comece criando seu primeiro projeto técnico-comercial.
            </p>
            <Link
              href="/projetos/novo"
              className="inline-flex px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-md font-medium text-sm transition-colors"
            >
              Criar projeto
            </Link>
          </div>
        ) : (
          <div className="bg-background border border-border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-surface">
                <tr>
                  <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] px-6 py-3">
                    Projeto
                  </th>
                  <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] px-6 py-3">
                    Cliente
                  </th>
                  <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] px-6 py-3">
                    Local
                  </th>
                  <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] px-6 py-3">
                    Atualizado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-surface transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/projetos/${p.id}`}
                        className="font-medium text-ink group-hover:text-brand transition-colors"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">
                      {p.client ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-2">
                      {[p.city, p.state].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-[11px] font-medium border ${STATUS_STYLE[p.status]}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-3 text-right font-mono">
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
