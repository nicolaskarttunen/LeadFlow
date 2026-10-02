import { requireWorkspace } from "@/lib/workspace";
import prisma from "@/lib/prisma";
import { saveProspectingSettingsAction } from "./actions";

const field = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/40";
const label = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-500";

export default async function ProspectingSettingsPage() {
  const { user, workspace } = await requireWorkspace();
  const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } });
  const fi = currentUser?.locale !== "en";
  const profile = await prisma.idealCustomerProfile.findFirst({ where: { workspaceId: workspace.id, active: true }, orderBy: { createdAt: "asc" } });

  return <div className="mx-auto max-w-5xl">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{fi ? "Asetukset" : "Settings"}</div>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{fi ? "Prospektointiasetukset" : "Prospecting settings"}</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{fi ? "Määritä, millaisia yrityksiä LeadFlow etsii ja priorisoi. Nämä asetukset ohjaavat automaattista prospektointia ja pisteytystä." : "Define the companies LeadFlow should find and prioritize. These settings guide automated prospecting and scoring."}</p>

    <form action={saveProspectingSettingsAction} className="mt-7 space-y-5">
      <section className="surface rounded-3xl p-6">
        <h2 className="font-semibold">{fi ? "Ihanneasiakas" : "Ideal customer"}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label><span className={label}>{fi ? "Profiilin nimi" : "Profile name"}</span><input name="name" defaultValue={profile?.name ?? (fi ? "Pääprofiili" : "Primary profile")} className={field} /></label>
          <label><span className={label}>{fi ? "Yrityksen koko" : "Company size"}</span><input name="companySize" defaultValue={profile?.companySize ?? ""} placeholder={fi ? "esim. 2–50 työntekijää" : "e.g. 2–50 employees"} className={field} /></label>
          <label className="sm:col-span-2"><span className={label}>{fi ? "Millainen on hyvä asiakas?" : "What makes a good customer?"}</span><textarea name="targetCustomer" defaultValue={profile?.targetCustomer ?? ""} rows={3} placeholder={fi ? "Kuvaile ihanneasiakas mahdollisimman käytännöllisesti." : "Describe your ideal customer in practical terms."} className={field} /></label>
          <label><span className={label}>{fi ? "Toimialat" : "Industries"}</span><input name="industries" defaultValue={profile?.industries.join(", ") ?? ""} placeholder={fi ? "Parturit, rakennusyritykset" : "Barbers, construction companies"} className={field} /><span className="mt-1 block text-xs text-slate-600">{fi ? "Erottele pilkulla." : "Separate with commas."}</span></label>
          <label><span className={label}>{fi ? "Alueet" : "Regions"}</span><input name="regions" defaultValue={profile?.regions.join(", ") ?? ""} placeholder="Jyväskylä, Tampere" className={field} /><span className="mt-1 block text-xs text-slate-600">Erottele pilkulla.</span></label>
          <label className="sm:col-span-2"><span className={label}>{fi ? "Halutut tarpeet ja signaalit" : "Desired needs and signals"}</span><input name="keywords" defaultValue={profile?.keywords.join(", ") ?? ""} placeholder={fi ? "verkkosivujen uudistus, SEO, uusi yritys" : "website redesign, SEO, new company"} className={field} /></label>
        </div>
      </section>

      <section className="surface rounded-3xl p-6">
        <h2 className="font-semibold">{fi ? "Rajaukset" : "Exclusions"}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label><span className={label}>{fi ? "Poissuljettavat toimialat" : "Excluded industries"}</span><input name="excludedIndustries" defaultValue={profile?.excludedIndustries.join(", ") ?? ""} className={field} /></label>
          <label><span className={label}>{fi ? "Poissuljettavat yritykset" : "Excluded companies"}</span><input name="excludedCompanies" defaultValue={profile?.excludedCompanies.join(", ") ?? ""} className={field} /></label>
        </div>
      </section>

      <section className="surface rounded-3xl p-6">
        <div className="flex items-start justify-between gap-5">
          <div><h2 className="font-semibold">{fi ? "Automaattinen prospektointi" : "Automated prospecting"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{fi ? "Kun automaatio otetaan käyttöön, LeadFlow käyttää näitä rajoja uusien liidien etsintään. Ajastus kytketään seuraavassa vaiheessa." : "When automation is enabled, LeadFlow uses these limits to discover new leads. Scheduling will be connected in the next phase."}</p></div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="automationEnabled" defaultChecked={profile?.automationEnabled ?? false} className="h-4 w-4 accent-violet-500" /> {fi ? "Käytössä" : "Enabled"}</label>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label><span className={label}>{fi ? "Uusia liidejä / viikko" : "New leads / week"}</span><input type="number" min="1" max="100" name="leadsPerWeek" defaultValue={profile?.leadsPerWeek ?? 25} className={field} /></label>
          <label><span className={label}>{fi ? "Minimipisteet" : "Minimum score"}</span><input type="number" min="0" max="100" name="minimumScore" defaultValue={profile?.minimumScore ?? 60} className={field} /></label>
          <label><span className={label}>{fi ? "Kieli" : "Language"}</span><select name="language" defaultValue={profile?.language ?? "fi"} className={field}><option value="fi">Suomi</option><option value="en">English</option></select></label>
        </div>
      </section>

      <div className="flex justify-end"><button type="submit" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400">{fi ? "Tallenna asetukset" : "Save settings"}</button></div>
    </form>
  </div>;
}
