import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import {
  calculateIrrigationProject,
  pdfEmissionBlockers,
  generateInvalidHydraulicSegmentsReport,
} from "@/lib/layout/irrigation-project";
import { PropostaPDF } from "@/lib/pdf/PropostaPDF";
import { migrateLayout } from "@/app/projetos/[id]/layout-schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Não autenticado", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== userId) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const layout = migrateLayout(project.data ?? {});
  const result = calculateIrrigationProject(layout);
  if (!result.isComplete || !result.bom) {
    return new NextResponse(
      "Projeto incompleto — conclua a tubulação antes de exportar.",
      { status: 422 },
    );
  }

  const blockers = pdfEmissionBlockers(result);
  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error: "PDF_BLOCKED",
        message: "Projeto bloqueado para emissão final.",
        blockers,
        invalidHydraulicSegments: generateInvalidHydraulicSegmentsReport(result),
      },
      { status: 422 },
    );
  }

  const { mapImage }: { mapImage?: string | null } = await req.json();

  const geradoEm = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const doc = (
    <PropostaPDF
      projectName={project.name}
      client={project.client ?? undefined}
      city={project.city ?? undefined}
      state={project.state ?? undefined}
      result={result}
      geradoEm={geradoEm}
      mapImage={mapImage}
    />
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;

  const buffer = await renderToBuffer(doc);

  const slug = project.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposta-${slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
