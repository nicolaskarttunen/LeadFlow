import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

export default async function SettingsPage() {
  const { user, workspace } = await requireWorkspace();
  const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } });
  const fi = currentUser?.locale !== "en";
  const cards = fi ? [
    { href: "/settings/prospecting", title: "Myyntiprofiili", description: "Mitä myyt, kenelle myyt ja millaiset yritykset ovat sinulle hyviä myyntimahdollisuuksia." },
    { href: "/settings/billing", title: "Tilaus ja käyttö", description: "Kokeilu, paketti, varmennettujen liidien kuukausikiintiö ja käytön seuranta." },
    { href: "/settings/general", title: "Yleiset", description: "LeadFlow'n käyttöliittymän kieli ja käyttäjäkohtaiset asetukset." },
  ] : [
    { href: "/settings/prospecting", title: "Sales profile", description: "What you sell, who you sell to and what makes a strong sales opportunity for you." },
    { href: "/settings/billing", title: "Subscription & usage", description: "Trial, plan, monthly verified lead allowance and usage tracking." },
    { href: "/settings/general", title: "General", description: "LeadFlow interface language and user-specific settings." },
  ];

  return <div className="mx-auto max-w-5xl">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">LeadFlow</div>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Asetukset" : "Settings"}</h1>
    <p className="mt-3 text-sm text-slate-400">{fi ? "Hallitse työtilaa, prospektointia, tilausta ja käyttökokemusta yhdestä paikasta." : "Manage your workspace, prospecting, subscription and experience in one place."}</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2">
      {cards.map((card) => <Link key={card.href} href={card.href} className="surface rounded-3xl p-6 transition hover:border-violet-400/25 hover:bg-white/[0.04]"><h2 className="font-semibold text-slate-100">{card.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p><div className="mt-5 text-xs font-semibold text-violet-300">{fi ? "Avaa →" : "Open →"}</div></Link>)}
      <div className="surface rounded-3xl p-6"><h2 className="font-semibold">{fi ? "Työtila" : "Workspace"}</h2><p className="mt-2 text-sm text-slate-400">{workspace.name}</p><p className="mt-4 text-xs text-slate-500">{fi ? "Jäsenet ja sähköpostipalvelun asetukset lisätään myöhemmin tähän kokonaisuuteen." : "Members and email provider settings will be added here later."}</p></div>
      <div className="surface rounded-3xl p-6"><h2 className="font-semibold">{fi ? "Nykyinen kieli" : "Current language"}</h2><p className="mt-2 text-sm text-slate-300">{fi ? "Suomi" : "English"}</p><p className="mt-4 text-xs text-slate-500">{fi ? "Tämä valinta ohjaa LeadFlow'n käyttöliittymän kieltä. Asiakasviestinnän kieli määritetään erikseen." : "This selection controls the LeadFlow interface language. Outreach language is configured separately."}</p></div>
    </div>
  </div>;
}
