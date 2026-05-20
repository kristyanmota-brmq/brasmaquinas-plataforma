import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/brand/Header";
import { ProjectMap } from "@/components/map/ProjectMap";
import { migrateLayout } from "./layout-schema";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PRELIMINARY: "Preliminar",
  FINAL_PENDING_APPROVAL: "Aguardando aprovação",
  FINAL_RELEASED: "Liberada",
  SENT: "Enviada",
  WON: "Ganha",
  LOST: "Perdida",
};

export default async function ProjetoDetalhePage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || project.ownerId !== userId) notFound();

  const layout = project.data ? migrateLayout(project.data) : undefined;

  return (
    <main className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link
          href="/projetos"
          className="text-sm text-ink-3 hover:text-ink-2 inline-block mb-4 transition-colors"
        >
          ← Projetos
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink mb-1">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-ink-2">
              {project.client && <span>{project.client}</span>}
              {project.client &&
                (project.city || project.state) && (
                  <span className="text-ink-4">·</span>
                )}
              {(project.city || project.state) && (
                <span>
                  {[project.city, project.state].filter(Boolean).join(" / ")}
                </span>
              )}
            </div>
          </div>
          <span className="inline-block px-2.5 py-1 rounded-sm text-[11px] font-medium border border-border bg-background text-ink-2 uppercase tracking-[0.08em]">
            {STATUS_LABEL[project.status]}
          </span>
        </div>

        <ProjectMap
          projectId={project.id}
          initialLayout={layout}
          projectName={project.name}
          client={project.client ?? undefined}
          city={project.city ?? undefined}
          state={project.state ?? undefined}
        />
      </div>
    </main>
  );
}
