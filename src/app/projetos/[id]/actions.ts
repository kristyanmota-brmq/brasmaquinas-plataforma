"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface ProjectLayout {
  area?: GeoJSON.Polygon;
  areaHectares?: number;
  perimeterMeters?: number;
  centroid?: { lng: number; lat: number };
  waterSource?: { lng: number; lat: number; elevation?: number };
  pumpLocation?: { lng: number; lat: number; elevation?: number } | null;
  pumpSeparate?: boolean;
  areaElevation?: number;
  geodetic?: {
    distanceSourceToAreaMeters?: number;
    elevationDeltaMeters?: number;
  };
  geocoded?: {
    city?: string;
    state?: string;
    fullAddress?: string;
  };
  sprinklers?: {
    aspersorId: string;
    positions: [number, number][];
    count: number;
    vazaoProjetoM3PorHora: number;
    espacamentoM: number;
    gridAngleDegrees: number;
    angleMode: "auto" | "manual";
  };
  sectorization?: {
    jornadaHoras: 9 | 14 | 21;
    laminaMm: 10;
    setoresCount: number;
    tempoPorSetorMinutos: number;
    aspersoresPorSetor: number;
    vazaoPorSetorM3PorHora: number;
    sectorIndices: number[];
  };
  mainPipeline?: {
    coordinates: [number, number][];
    lengthMeters: number;
    segments: number;
    elevationStartM?: number;
    elevationEndM?: number;
    elevationDeltaM?: number;
  };
  center?: { lng: number; lat: number; zoom: number };
}

export async function saveProjectLayout(
  projectId: string,
  layout: ProjectLayout
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.ownerId !== userId) throw new Error("Não autorizado");

  // Sincroniza city/state do projeto se o geocoder reverso retornou
  const updateData: {
    data: object;
    city?: string;
    state?: string;
  } = { data: layout as object };

  if (layout.geocoded?.city && !project.city) {
    updateData.city = layout.geocoded.city;
  }
  if (layout.geocoded?.state && !project.state) {
    updateData.state = layout.geocoded.state;
  }

  await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });

  revalidatePath(`/projetos/${projectId}`);
}

export async function applyDetectedCity(
  projectId: string,
  { city, state }: { city?: string; state?: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.ownerId !== userId) throw new Error("Não autorizado");

  await prisma.project.update({
    where: { id: projectId },
    data: { city: city ?? project.city, state: state ?? project.state },
  });

  revalidatePath(`/projetos/${projectId}`);
}