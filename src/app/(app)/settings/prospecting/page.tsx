import { requireWorkspace } from "@/lib/workspace";
import prisma from "@/lib/prisma";
import { saveProspectingSettingsAction } from "./actions";

const field = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/40";
const label = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-500";

export default async function ProspectingSettingsPage() {
  const { workspace } = await requireWorkspace();
  const profile = await prisma.idealCustomerProfile.findFirst({ where: { workspaceId: workspace.id, active: true }, orderBy: { createdAt: "asc" } });

  return <div className="mx-auto max-w-5xl">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Asetukset</div>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Prospektointiasetukset</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Määritä, millaisia yrityksiä LeadFlow etsii ja priorisoi. Nämä asetukset tulevat ohjaamaan automaattista prospektointia ja ICP-pisteytystä.</p>

    <form action={saveProspectingSettingsAction} className="mt-7 space-y-5">
      <section className="surface rounded-3xl p-6">
        <h2 className="font-semibold">Ihanneasiakas</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label><span className={label}>Profiilin nimi</span><input name="name" defaultValue={profile?.name ?? "Pääprofiili"} className={field} /></label>
          <label><span className={label}>Yrityksen koko</span><input name="companySize" defaultValue={profile?.companySize ?? ""} placeholder="esim. 2–50 työntekijää" className={field} /></label>
          <label className="sm:col-span-2"><span className={label}>Millainen on hyvä asiakas?</span><textarea name="targetCustomer" defaultValue={profile?.targetCustomer ?? ""} rows={3} placeholder="Kuvaile ihanneasiakas mahdollisimman käytännöllisesti." className={field} /></label>
          <label><span className={label}>Toimialat</span><input name="industries" defaultValue={profile?.industries.join(", ") ?? ""} placeholder="Parturit, rakennusyritykset" className={field} /><span className="mt-1 block text-xs text-slate-600">Erottele pilkulla.</span></label>
          <label><span className={label}>Alueet</span><input name="regions" defaultValue={profile?.regions.join(", ") ?? ""} placeholder="Jyväskylä, Tampere" className={field} /><span className="mt-1 block text-xs text-slate-600">Erottele pilkulla.</span></label>
          <label className="sm:col-span-2"><span className={label}>Halutut tarpeet ja signaalit</span><input name="keywords" defaultValue={profile?.keywords.join(", ") ?? ""} placeholder="verkkosivujen uudistus, SEO, uusi yritys" className={field} /></label>
        </div>
      </section>

      <section className="surface rounded-3xl p-6">
        <h2 className="font-semibold">Rajaukset</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label><span className={label}>Poissuljettavat toimialat</span><input name="excludedIndustries" defaultValue={profile?.excludedIndustries.join(", ") ?? ""} className={field} /></label>
          <label><span className={label}>Poissuljettavat yritykset</span><input name="excludedCompanies" defaultValue={profile?.excludedCompanies.join(", ") ?? ""} className={field} /></label>
        </div>
      </section>

      <section className="surface rounded-3xl p-6">
        <div className="flex items-start justify-between gap-5">
          <div><h2 className="font-semibold">Automaattinen prospektointi</h2><p className="mt-1 text-sm leading-6 text-slate-400">Kun automaatio otetaan käyttöön, LeadFlow käyttää näitä rajoja uusien liidien etsintään. Ajastus kytketään seuraavassa vaiheessa.</p></div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="automationEnabled" defaultChecked={profile?.automationEnabled ?? false} className="h-4 w-4 accent-violet-500" /> Käytössä</label>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label><span className={label}>Uusia liidejä / viikko</span><input type="number" min="1" max="100" name="leadsPerWeek" defaultValue={profile?.leadsPerWeek ?? 25} className={field} /></label>
          <label><span className={label}>Minimipisteet</span><input type="number" min="0" max="100" name="minimumScore" defaultValue={profile?.minimumScore ?? 60} className={field} /></label>
          <label><span className={label}>Kieli</span><select name="language" defaultValue={profile?.language ?? "fi"} className={field}><option value="fi">Suomi</option><option value="en">English</option></select></label>
        </div>
      </section>

      <div className="flex justify-end"><button type="submit" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400">Tallenna asetukset</button></div>
    </form>
  </div>;
}
