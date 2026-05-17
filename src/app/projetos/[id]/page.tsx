import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/brand/Header";

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

  return (
    <main className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/projetos"
          className="text-sm text-ink-3 hover:text-ink-2 inline-block mb-6 transition-colors"
        >
          ← Projetos
        </Link>

        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink mb-1">
              {project.name}
            </h1>
            {project.client && (
              <p className="text-sm text-ink-2">{project.client}</p>
            )}
          </div>
          <span className="inline-block px-2.5 py-1 rounded-sm text-[11px] font-medium border border-border bg-background text-ink-2 uppercase tracking-[0.08em]">
            {STATUS_LABEL[project.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card title="Dados do projeto">
            <Field label="Cliente" value={project.client ?? "—"} />
            <Field
              label="Localização"
              value={[project.city, project.state].filter(Boolean).join(" / ") || "—"}
            />
            <Field
              label="Criado em"
              value={new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(project.createdAt)}
              mono
            />
            <Field label="ID" value={project.id} mono small />
          </Card>

          <Card title="Próximas etapas">
            <p className="text-sm text-ink-2 leading-relaxed">
              Os campos de Entrada de Dados, Cálculo Técnico, Hidráulica e
              Preço da metodologia <span className="font-mono text-xs bg-surface-2 px-1.5 py-0.5 rounded-sm">V0.5-RC</span>{" "}
              entram aqui nos próximos sprints.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background border border-border rounded-md p-6">
      <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.12em] mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-3 mb-1">{label}</dt>
      <dd className={`text-ink ${mono ? "font-mono" : ""} ${small ? "text-xs" : "text-sm"}`}>
        {value}
      </dd>
    </div>
  );
}
