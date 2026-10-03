"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export async function saveGeneralSettingsAction(formData: FormData) {
  const { user } = await requireWorkspace();
  const locale = formData.get("locale") === "en" ? "en" : "fi";

  await prisma.user.update({
    where: { id: user.id },
    data: { locale },
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings/general");
  redirect("/settings/general");
}
