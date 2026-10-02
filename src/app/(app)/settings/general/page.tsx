import prisma from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspace";
import { saveGeneralSettingsAction } from "./actions";

export default async function GeneralSettingsPage() {
  const { user } = await requireWorkspace();
  const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } });
  return <div className="mx-auto max-w-3xl">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Asetukset</div>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Yleiset</h1>
    <form action={saveGeneralSettingsAction} className="surface mt-7 rounded-3xl p-6">
      <h2 className="font-semibold">Käyttöliittymän kieli</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Valitse kieli, jolla käytät LeadFlow'ta. Asiakasviestinnän kieli määritetään myöhemmin erikseen kampanjoissa.</p>
      <select name="locale" defaultValue={currentUser?.locale ?? "fi"} className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-slate-100 outline-none focus:border-violet-400/40">
        <option value="fi">Suomi</option><option value="en">English</option>
      </select>
      <div className="mt-5 flex justify-end"><button className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400">Tallenna</button></div>
    </form>
  </div>;
}
