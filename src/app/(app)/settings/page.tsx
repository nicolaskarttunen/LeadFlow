import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";

const cards = [
  { href: "/settings/prospecting", title: "Prospektointi", description: "Ihanneasiakkaat, alueet, toimialat ja automaattisen liidien etsinnän rajat." },
  { href: "/settings/general", title: "Yleiset", description: "LeadFlow'n käyttöliittymän kieli ja käyttäjäkohtaiset asetukset." },
];

export default async function SettingsPage() {
  const { user, workspace } = await requireWorkspace();
  const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } });
  return <div className="mx-auto max-w-5xl">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">LeadFlow</div>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Asetukset</h1>
    <p className="mt-3 text-sm text-slate-400">Hallitse työtilaa, prospektointia ja käyttökokemusta yhdestä paikasta.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2">
      {cards.map((card) => <Link key={card.href} href={card.href} className="surface rounded-3xl p-6 transition hover:border-violet-400/25 hover:bg-white/[0.04]">
        <h2 className="font-semibold text-slate-100">{card.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p><div className="mt-5 text-xs font-semibold text-violet-300">Avaa →</div>
      </Link>)}
      <div className="surface rounded-3xl p-6"><h2 className="font-semibold">Työtila</h2><p className="mt-2 text-sm text-slate-400">{workspace.name}</p><p className="mt-4 text-xs text-slate-500">Lisäämme myöhemmin jäsenet, laskutuksen ja sähköpostipalvelun asetukset tähän kokonaisuuteen.</p></div>
      <div className="surface rounded-3xl p-6"><h2 className="font-semibold">Nykyinen kieli</h2><p className="mt-2 text-sm text-slate-300">{currentUser?.locale === "en" ? "English" : "Suomi"}</p><p className="mt-4 text-xs text-slate-500">Käyttöliittymän varsinainen FI/EN-käännösjärjestelmä rakennetaan tämän asetuksen ympärille.</p></div>
    </div>
  </div>;
}
