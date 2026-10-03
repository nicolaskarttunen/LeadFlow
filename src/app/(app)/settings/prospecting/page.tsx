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
          <label className="block"><span className={label}>{fi ? "Palvelusi tai tuotteesi" : "Your service or product"}</span><textarea name="offering" defaultValue={company?.offering ?? company?.description ?? ""} rows={3} placeholder={fi ? "Esim. Suunnittelemme yrityksille verkkosivuja ja autamme parantamaan näkyvyyttä Googlessa." : "E.g. We build websites for businesses and help improve their visibility on Google."} className={field} /><span className="mt-1 block text-xs text-slate-600">{fi ? "Kuvaile lyhyesti mitä asiakas voi ostaa sinulta." : "Briefly describe what a customer can buy from you."}</span></label>
        </div>
      </section>

      <section className="surface rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-semibold text-violet-300">2</div><div><h2 className="font-semibold text-slate-100">{fi ? "Kenelle myyt?" : "Who do you sell to?"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{fi ? "Kuvaile yritykset, joille palvelusi tuottaa eniten arvoa." : "Describe the companies that get the most value from your service."}</p></div></div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={label}>{fi ? "Millainen on hyvä asiakas?" : "What makes a good customer?"}</span><textarea name="targetCustomer" defaultValue={profile?.targetCustomer ?? company?.idealCustomer ?? ""} rows={3} placeholder={fi ? "Esim. suomalainen palveluyritys, joka hankkii asiakkaita verkosta ja haluaa kasvaa." : "E.g. a service company that acquires customers online and wants to grow."} className={field} /></label>
          <label><span className={label}>{fi ? "Kohdetoimialat" : "Target industries"}</span><input name="industries" defaultValue={profile?.industries.join(", ") ?? ""} placeholder={fi ? "Esim. tilitoimistot, konsultointi, kiinteistöpalvelut" : "E.g. accounting, consulting, property services"} className={field} /><span className="mt-1 block text-xs text-slate-600">{fi ? "Voit lisätä useita pilkulla eroteltuna." : "Separate multiple values with commas."}</span></label>
          <label><span className={label}>{fi ? "Yrityksen koko" : "Company size"}</span><select name="companySize" defaultValue={profile?.companySize ?? ""} className={field}><option className="bg-slate-950 text-slate-100" value="">{fi ? "Ei rajausta" : "Any size"}</option><option className="bg-slate-950 text-slate-100" value="1-5">1–5</option><option className="bg-slate-950 text-slate-100" value="6-10">6–10</option><option className="bg-slate-950 text-slate-100" value="11-50">11–50</option><option className="bg-slate-950 text-slate-100" value="51-250">51–250</option><option className="bg-slate-950 text-slate-100" value="250+">250+</option></select><span className="mt-1 block text-xs text-slate-600">{fi ? "Työntekijöiden määrä." : "Number of employees."}</span></label>
        </div>
      </section>

      <section className="surface rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-semibold text-violet-300">3</div><div><h2 className="font-semibold text-slate-100">{fi ? "Missä myyt?" : "Where do you sell?"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{fi ? "Rajaa alueet, joilta LeadFlow etsii potentiaalisia asiakkaita." : "Choose the regions where LeadFlow should look for prospects."}</p></div></div>
        <div className="mt-5"><span className={label}>{fi ? "Kohdealue" : "Target region"}</span><div className="mt-2 grid gap-3 sm:grid-cols-2"><label className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-violet-400/30"><div className="flex items-center gap-3"><input type="radio" name="regionMode" value="finland" defaultChecked={profile?.regions.length === 0 || (profile?.regions.length === 1 && profile.regions[0]?.toLowerCase() === "suomi")} className="h-4 w-4 accent-violet-500" /><span className="font-medium text-slate-200">{fi ? "Koko Suomi" : "All Finland"}</span></div><p className="mt-1 pl-7 text-xs text-slate-500">{fi ? "Etsi yrityksiä kaikkialta Suomesta." : "Find companies anywhere in Finland."}</p></label><label className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-violet-400/30"><div className="flex items-center gap-3"><input type="radio" name="regionMode" value="custom" defaultChecked={Boolean(profile?.regions.length && !(profile.regions.length === 1 && profile.regions[0]?.toLowerCase() === "suomi"))} className="h-4 w-4 accent-violet-500" /><span className="font-medium text-slate-200">{fi ? "Valitut alueet" : "Selected regions"}</span></div><p className="mt-1 pl-7 text-xs text-slate-500">{fi ? "Rajaa haku tiettyihin kaupunkeihin tai alueisiin." : "Limit discovery to selected cities or regions."}</p></label></div><label className="mt-4 block"><span className={label}>{fi ? "Kaupungit tai alueet" : "Cities or regions"}</span><input name="regions" defaultValue={profile?.regions.length === 1 && profile.regions[0]?.toLowerCase() === "suomi" ? "" : profile?.regions.join(", ") ?? ""} placeholder={fi ? "Esim. Jyväskylä, Tampere, Helsinki" : "E.g. Helsinki, Tampere"} className={field} /><span className="mt-1 block text-xs text-slate-600">{fi ? "Jätä tyhjäksi, jos valitsit Koko Suomen." : "Leave empty when All Finland is selected."}</span></label></div>
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
