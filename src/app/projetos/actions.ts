"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createProject(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");

  const name = (formData.get("name") as string)?.trim();
  const client = (formData.get("client") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;

  if (!name) {
    throw new Error("Nome do projeto é obrigatório");
  }

  const project = await prisma.project.create({
    data: {
      name,
      client,
      city,
      state,
      ownerId: userId,
    },
  });

  revalidatePath("/projetos");
  redirect(`/projetos/${project.id}`);
}
