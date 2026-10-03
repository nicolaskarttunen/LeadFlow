import { requireWorkspace } from "@/lib/workspace";
import prisma from "@/lib/prisma";
import { saveProspectingSettingsAction } from "./actions";

const field = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/40";
const label = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-500";

export default async function ProspectingSettingsPage() {
  const { user, workspace } = await requireWorkspace();
  const [currentUser, profile, company] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } }),
    prisma.idealCustomerProfile.findFirst({ where: { workspaceId: workspace.id, active: true }, orderBy: { createdAt: "asc" } }),
    prisma.companyProfile.findUnique({ where: { workspaceId: workspace.id } }),
  ]);
  const fi = currentUser?.locale !== "en";

  return <div className="mx-auto max-w-5xl">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{fi ? "Asetukset" : "Settings"}</div>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Myyntiprofiili" : "Sales profile"}</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{fi ? "Kerro LeadFlow'lle mitä myyt ja millainen yritys on sinulle hyvä asiakas. Tätä profiilia käytetään liidien löytämiseen, tutkimiseen ja pisteyttämiseen." : "Tell LeadFlow what you sell and what a good customer looks like. This profile guides lead discovery, research and scoring."}</p>

    <form action={saveProspectingSettingsAction} className="mt-7 space-y-5">
      <input type="hidden" name="name" value={profile?.name ?? (fi ? "Pääprofiili" : "Primary profile")} />
      <input type="hidden" name="automationEnabled" value={profile?.automationEnabled ? "on" : ""} />
      <input type="hidden" name="leadsPerWeek" value={profile?.leadsPerWeek ?? 25} />
      <input type="hidden" name="minimumScore" value={profile?.minimumScore ?? 60} />
      <input type="hidden" name="language" value={profile?.language ?? "fi"} />

      <section className="surface rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-semibold text-violet-300">1</div><div><h2 className="font-semibold text-slate-100">{fi ? "Mitä myyt?" : "What do you sell?"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{fi ? "LeadFlow käyttää tätä ymmärtääkseen, millaiset yritykset voivat hyötyä palvelustasi." : "LeadFlow uses this to understand which companies may benefit from your offering."}</p></div></div>
        <div className="mt-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-slate-300">{company?.offering || company?.description || (fi ? "Yrityksesi palvelua ei ole vielä kuvattu." : "Your offering has not been described yet.")}</div>
          <p className="mt-2 text-xs text-slate-500">{fi ? "Yrityksen oma palvelukuvaus tulee yritysprofiilista. Seuraavassa vaiheessa teemme myös tämän muokattavaksi samassa näkymässä." : "Your offering comes from the company profile. Next we will make it editable here as well."}</p>
        </div>
      </section>

      <section className="surface rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-semibold text-violet-300">2</div><div><h2 className="font-semibold text-slate-100">{fi ? "Kenelle myyt?" : "Who do you sell to?"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{fi ? "Kuvaile yritykset, joille palvelusi tuottaa eniten arvoa." : "Describe the companies that get the most value from your service."}</p></div></div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={label}>{fi ? "Millainen on hyvä asiakas?" : "What makes a good customer?"}</span><textarea name="targetCustomer" defaultValue={profile?.targetCustomer ?? company?.idealCustomer ?? ""} rows={3} placeholder={fi ? "Esim. suomalainen palveluyritys, joka hankkii asiakkaita verkosta ja haluaa kasvaa." : "E.g. a service company that acquires customers online and wants to grow."} className={field} /></label>
          <label><span className={label}>{fi ? "Kohdetoimialat" : "Target industries"}</span><input name="industries" defaultValue={profile?.industries.join(", ") ?? ""} placeholder={fi ? "Esim. tilitoimistot, konsultointi, kiinteistöpalvelut" : "E.g. accounting, consulting, property services"} className={field} /><span className="mt-1 block text-xs text-slate-600">{fi ? "Voit lisätä useita pilkulla eroteltuna." : "Separate multiple values with commas."}</span></label>
          <label><span className={label}>{fi ? "Yrityksen koko" : "Company size"}</span><input name="companySize" defaultValue={profile?.companySize ?? ""} placeholder={fi ? "Esim. 2–50 työntekijää" : "E.g. 2–50 employees"} className={field} /></label>
        </div>
      </section>

      <section className="surface rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-semibold text-violet-300">3</div><div><h2 className="font-semibold text-slate-100">{fi ? "Missä myyt?" : "Where do you sell?"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{fi ? "Rajaa alueet, joilta LeadFlow etsii potentiaalisia asiakkaita." : "Choose the regions where LeadFlow should look for prospects."}</p></div></div>
        <label className="mt-5 block"><span className={label}>{fi ? "Kohdealueet" : "Target regions"}</span><input name="regions" defaultValue={profile?.regions.join(", ") ?? ""} placeholder={fi ? "Esim. Suomi tai Jyväskylä, Tampere, Helsinki" : "E.g. Finland or Helsinki, Tampere"} className={field} /><span className="mt-1 block text-xs text-slate-600">{fi ? "Voit käyttää koko maata tai tarkempia alueita." : "Use a whole country or specific regions."}</span></label>
      </section>

      <section className="surface rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-semibold text-violet-300">4</div><div><h2 className="font-semibold text-slate-100">{fi ? "Mistä tunnistaa hyvän myyntimahdollisuuden?" : "What signals a good sales opportunity?"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{fi ? "Kerro tarpeet ja ostosignaalit, joita LeadFlow etsii löydetyistä yrityksistä. Näiden pitäisi liittyä siihen, mitä itse myyt." : "Define needs and buying signals LeadFlow should look for. They should relate directly to what you sell."}</p></div></div>
        <label className="mt-5 block"><span className={label}>{fi ? "Tarpeet ja ostosignaalit" : "Needs and buying signals"}</span><input name="keywords" defaultValue={profile?.keywords.join(", ") ?? ""} placeholder={fi ? "Esim. vanhentunut verkkosivu, heikko näkyvyys, uusi yritys" : "E.g. outdated website, weak visibility, new company"} className={field} /><span className="mt-1 block text-xs text-slate-600">{fi ? "LeadFlow käyttää näitä tutkimuksessa ja myöhemmin pisteytyksessä — ei pelkkinä hakusanoina." : "LeadFlow uses these in research and scoring, not merely as search keywords."}</span></label>
      </section>

      <section className="surface rounded-3xl p-6 sm:p-7">
        <h2 className="font-semibold text-slate-100">{fi ? "Ketä ei haluta mukaan?" : "Who should be excluded?"}</h2>
        <p className="mt-1 text-sm text-slate-400">{fi ? "Poista yritykset, joihin myyntiaikaa ei kannata käyttää." : "Exclude companies that should not receive sales attention."}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label><span className={label}>{fi ? "Poissuljettavat toimialat" : "Excluded industries"}</span><input name="excludedIndustries" defaultValue={profile?.excludedIndustries.join(", ") ?? ""} placeholder={fi ? "Esim. yhdistykset" : "E.g. associations"} className={field} /></label>
          <label><span className={label}>{fi ? "Poissuljettavat yritykset" : "Excluded companies"}</span><input name="excludedCompanies" defaultValue={profile?.excludedCompanies.join(", ") ?? ""} className={field} /></label>
        </div>
      </section>

      <div className="flex justify-end"><button type="submit" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400">{fi ? "Tallenna myyntiprofiili" : "Save sales profile"}</button></div>
    </form>
  </div>;
}
