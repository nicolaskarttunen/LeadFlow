type VerificationEmailInput = {
  to: string;
  name?: string | null;
  verificationUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendLeadFlowVerificationEmail({
  to,
  name,
  verificationUrl,
}: VerificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "Email verification requires RESEND_API_KEY and AUTH_EMAIL_FROM.",
    );
  }

  const safeName = escapeHtml(name?.trim() || "");
  const safeUrl = escapeHtml(verificationUrl);
  const greeting = safeName ? `Hei ${safeName},` : "Hei,";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Vahvista sähköpostisi – LeadFlow",
      text: [
        name?.trim() ? `Hei ${name.trim()},` : "Hei,",
        "",
        "Vahvista sähköpostiosoitteesi, jotta voit ottaa LeadFlow-tilisi käyttöön.",
        verificationUrl,
        "",
        "Vahvistuslinkki vanhenee tunnin kuluttua.",
        "Jos et luonut LeadFlow-tiliä, voit jättää tämän viestin huomiotta.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6">
          <div style="font-size:18px;font-weight:700;margin-bottom:24px">LeadFlow</div>
          <p>${greeting}</p>
          <p>Vahvista sähköpostiosoitteesi, jotta voit ottaa LeadFlow-tilisi käyttöön.</p>
          <p style="margin:28px 0">
            <a href="${safeUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Vahvista sähköposti</a>
          </p>
          <p style="font-size:13px;color:#6b7280">Vahvistuslinkki vanhenee tunnin kuluttua.</p>
          <p style="font-size:13px;color:#6b7280">Jos et luonut LeadFlow-tiliä, voit jättää tämän viestin huomiotta.</p>
        </div>
      `,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const providerMessage = await response.text();
    console.error("Resend verification email failed", {
      status: response.status,
      providerMessage: providerMessage.slice(0, 500),
    });
    throw new Error("Unable to send verification email.");
  }
}
