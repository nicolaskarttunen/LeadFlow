"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { encryptEmailTokenBundle } from "@/lib/email/token-encryption";

export type SmtpConnectionState = { error: string | null; message: string | null };
const schema = z.object({
  email: z.email().max(254),
  host: z.string().min(4).max(253).regex(/^[a-z0-9.-]+$/i),
  port: z.enum(["465", "587"]),
  username: z.string().min(1).max(254),
  password: z.string().min(1).max(1024),
});

export async function saveSmtpConnectionAction(
  _state: SmtpConnectionState,
  formData: FormData,
): Promise<SmtpConnectionState> {
  const { user, workspace } = await requireWorkspace();
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    host: String(formData.get("host") ?? "").trim().toLowerCase(),
    port: String(formData.get("port") ?? "587"),
    username: String(formData.get("username") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "Tarkista sähköpostiosoite, SMTP-palvelin, portti ja kirjautumistiedot.", message: null };
  const data = parsed.data;
  if (data.host === "localhost" || data.host.endsWith(".local") || data.host.endsWith(".internal") || /^\d+\.\d+\.\d+\.\d+$/.test(data.host)) {
    return { error: "Anna julkinen SMTP-palvelimen verkkotunnus, ei IP-osoitetta tai sisäverkon palvelinta.", message: null };
  }
  if (!process.env.EMAIL_TOKEN_ENCRYPTION_KEY) {
    return { error: "Palvelimen salausavain EMAIL_TOKEN_ENCRYPTION_KEY puuttuu.", message: null };
  }

  // Store the credentials encrypted at rest. They are never included in publicConfig.
  const secretReference = encryptEmailTokenBundle({
    accessToken: data.password,
    tokenType: "SMTP_PASSWORD",
  });
  const connection = await prisma.providerConnection.upsert({
    where: { workspaceId_type_providerName: { workspaceId: workspace.id, type: "EMAIL", providerName: "SMTP_CUSTOM" } },
    update: {
      enabled: false, // Not enabled for real sends until SMTP verification is implemented.
      publicConfig: { email: data.email, host: data.host, port: Number(data.port), username: data.username, status: "PENDING_VERIFICATION" },
      secretReference,
    },
    create: {
      workspaceId: workspace.id,
      type: "EMAIL",
      providerName: "SMTP_CUSTOM",
      enabled: false,
      publicConfig: { email: data.email, host: data.host, port: Number(data.port), username: data.username, status: "PENDING_VERIFICATION" },
      secretReference,
    },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "email_connection.smtp_credentials_saved",
      entityType: "provider_connection",
      entityId: connection.id,
      metadata: { providerName: "SMTP_CUSTOM" },
    },
  });
  revalidatePath("/settings/email");
  return { error: null, message: "SMTP-asetukset tallennettu salattuina. Lähetys aktivoidaan vasta yhteyden tarkistuksen valmistuttua." };
}
