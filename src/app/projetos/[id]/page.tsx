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
    <main className="bg-surface">
      <Header />
      <ProjectMap
        projectId={project.id}
        initialLayout={layout}
        projectName={project.name}
        statusLabel={STATUS_LABEL[project.status] ?? project.status}
        client={project.client ?? undefined}
        city={project.city ?? undefined}
        state={project.state ?? undefined}
      />
    </main>
  );
}
