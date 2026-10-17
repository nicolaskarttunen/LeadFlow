import Link from "next/link";
import prisma from "@/lib/prisma";
import { getCurrentLocale } from "@/lib/current-locale";
import {
  googleEmailOAuthConfigured,
  microsoftEmailOAuthConfigured,
} from "@/lib/email/oauth";
import { requireWorkspace } from "@/lib/workspace";
import { disconnectEmailProviderAction } from "./actions";

type PublicEmailConfig = {
  provider?: string;
  email?: string;
  displayName?: string | null;
  connectedAt?: string;
};

function publicConfig(value: unknown): PublicEmailConfig {
  return value && typeof value === "object" ? value as PublicEmailConfig : {};
}

function connectedDate(value: string | undefined, fi: boolean) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(fi ? "fi-FI" : "en-US", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const locale = await getCurrentLocale();
  const fi = locale === "fi";
  const query = await searchParams;

  const connections = await prisma.providerConnection.findMany({
    where: { workspaceId: workspace.id, type: "EMAIL" },
    orderBy: { createdAt: "asc" },
  });

  const google = connections.find((item) => item.providerName === "GOOGLE_GMAIL");
  const microsoft = connections.find((item) => item.providerName === "MICROSOFT_365");
  const googleConfig = publicConfig(google?.publicConfig);
  const microsoftConfig = publicConfig(microsoft?.publicConfig);

  const providers = [
    {
      key: "google",
      providerName: "GOOGLE_GMAIL",
      title: "Google Workspace / Gmail",
      description: fi
        ? "Lähetä hyväksytyt LeadFlow-viestit omasta Gmail- tai Google Workspace -osoitteestasi."
        : "Send approved LeadFlow messages from your own Gmail or Google Workspace address.",
      connection: google,
      config: googleConfig,
      configured: googleEmailOAuthConfigured(),
      startHref: "/api/email-connections/google/start",
      badge: "G",
    },
    {
      key: "microsoft",
      providerName: "MICROSOFT_365",
      title: "Microsoft 365 / Outlook",
      description: fi
        ? "Yhdistä Microsoft 365- tai Outlook-postilaatikko ja käytä sitä LeadFlow'n lähettäjänä."
        : "Connect a Microsoft 365 or Outlook mailbox and use it as a LeadFlow sender.",
      connection: microsoft,
      config: microsoftConfig,
      configured: microsoftEmailOAuthConfigured(),
      startHref: "/api/email-connections/microsoft/start",
      badge: "M",
    },
  ];

  const errorText: Record<string, string> = fi
    ? {
        "google-not-configured": "Google-yhteyden sovellusavaimia ei ole vielä määritetty.",
        "microsoft-not-configured": "Microsoft-yhteyden sovellusavaimia ei ole vielä määritetty.",
        "google-denied": "Google-yhteyden valtuutus peruttiin.",
        "microsoft-denied": "Microsoft-yhteyden valtuutus peruttiin.",
        "oauth-state": "Sähköpostiyhteyden vahvistus vanheni tai ei ollut kelvollinen. Yritä uudelleen.",
        workspace: "Sähköpostiyhteys ei vastannut nykyistä työtilaa.",
        "google-token": "Google-yhteyden viimeistely epäonnistui.",
        "microsoft-token": "Microsoft-yhteyden viimeistely epäonnistui.",
        "google-profile": "Google-tilin sähköpostiosoitetta ei voitu lukea.",
        "microsoft-profile": "Microsoft-tilin sähköpostiosoitetta ei voitu lukea.",
      }
    : {
        "google-not-configured": "Google email app credentials are not configured yet.",
        "microsoft-not-configured": "Microsoft email app credentials are not configured yet.",
        "google-denied": "Google authorization was cancelled.",
        "microsoft-denied": "Microsoft authorization was cancelled.",
        "oauth-state": "The email connection request expired or was invalid. Please try again.",
        workspace: "The email connection did not match the current workspace.",
        "google-token": "Could not complete the Google connection.",
        "microsoft-token": "Could not complete the Microsoft connection.",
        "google-profile": "Could not read the Google account email address.",
        "microsoft-profile": "Could not read the Microsoft account email address.",
      };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/settings" className="text-sm text-slate-400 transition hover:text-white">
        {fi ? "← Takaisin asetuksiin" : "← Back to settings"}
      </Link>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
          {fi ? "Viestintä" : "Messaging"}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {fi ? "Sähköposti" : "Email"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {fi
            ? "Yhdistä yrityksesi oma postilaatikko. LeadFlow ei tarvitse sähköpostisi salasanaa, vaan yhteys tehdään palveluntarjoajan OAuth-valtuutuksella."
            : "Connect your company's own mailbox. LeadFlow never needs your email password; access is granted through the provider's OAuth authorization flow."}
        </p>
      </div>

      {query.connected ? (
        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100">
          ✓ {fi ? "Sähköposti yhdistetty onnistuneesti." : "Email connected successfully."}
        </div>
      ) : null}

      {query.error ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
          {errorText[query.error] ?? (fi ? "Sähköpostiyhteydessä tapahtui virhe." : "There was a problem connecting the mailbox.")}
        </div>
      ) : null}

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => {
          const connected = Boolean(provider.connection?.enabled && provider.config.email);
          const date = connectedDate(provider.config.connectedAt, fi);

          return (
            <section key={provider.key} className="surface rounded-3xl p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-base font-bold text-slate-200">
                  {provider.badge}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-100">{provider.title}</h2>
                    {connected ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                        {fi ? "Yhdistetty" : "Connected"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{provider.description}</p>
                </div>
              </div>

              {connected ? (
                <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/10 p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                    {fi ? "Lähettäjä" : "Sender"}
                  </div>
                  <div className="mt-1.5 break-all text-sm font-medium text-slate-100">{provider.config.email}</div>
                  {provider.config.displayName ? (
                    <div className="mt-1 text-xs text-slate-500">{provider.config.displayName}</div>
                  ) : null}
                  {date ? (
                    <div className="mt-3 text-xs text-slate-600">
                      {fi ? `Yhdistetty ${date}` : `Connected ${date}`}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/10 p-4 text-xs leading-5 text-slate-500">
                  {provider.configured
                    ? (fi ? "Yhteys on valmis valtuutettavaksi. LeadFlow pyytää vain lähettämiseen tarvittavat oikeudet." : "The connection is ready to authorize. LeadFlow requests only the permissions needed for sending.")
                    : (fi ? "OAuth-sovelluksen tunnukset lisätään ennen ensimmäistä oikeaa yhdistämistä." : "OAuth app credentials need to be configured before the first live connection.")}
                </div>
              )}

              <div className="mt-5">
                {connected ? (
                  <form action={disconnectEmailProviderAction.bind(null, provider.providerName)}>
                    <button className="w-full rounded-xl border border-red-400/15 bg-red-400/[0.04] px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-400/[0.08]">
                      {fi ? "Katkaise yhteys" : "Disconnect"}
                    </button>
                  </form>
                ) : provider.configured ? (
                  <Link href={provider.startHref} className="flex w-full items-center justify-center rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">
                    {fi ? `Yhdistä ${provider.title}` : `Connect ${provider.title}`}
                  </Link>
                ) : (
                  <button disabled className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-500">
                    {fi ? "Määritys puuttuu" : "Setup required"}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h2 className="font-semibold text-slate-100">{fi ? "Mitä LeadFlow saa tehdä?" : "What can LeadFlow do?"}</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] p-4">
            <div className="font-medium text-slate-200">✓ {fi ? "Lähettää hyväksytyn viestin" : "Send an approved message"}</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{fi ? "Vasta kun käyttäjä tai sallittu automaatio on hyväksynyt viestin." : "Only after the user or an allowed automation has approved it."}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] p-4">
            <div className="font-medium text-slate-200">✓ {fi ? "Pitää lähetyshistorian" : "Keep sending history"}</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{fi ? "LeadFlow tietää, kehen on jo oltu yhteydessä." : "LeadFlow keeps track of who has already been contacted."}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] p-4">
            <div className="font-medium text-slate-200">— {fi ? "Ei tarvitse salasanaasi" : "Never needs your password"}</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{fi ? "Valtuutus voidaan perua milloin tahansa." : "Authorization can be revoked at any time."}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
