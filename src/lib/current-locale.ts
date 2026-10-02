import "server-only";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export type AppLocale = "fi" | "en";

export async function getCurrentLocale(): Promise<AppLocale> {
  const { user } = await requireWorkspace();
  const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } });
  return currentUser?.locale === "en" ? "en" : "fi";
}
