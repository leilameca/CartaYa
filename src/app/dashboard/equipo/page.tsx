import { redirect } from "next/navigation";
import { Mail, Trash2, Users } from "lucide-react";
import { inviteTeamMemberAction, removeTeamMemberAction } from "@/app/dashboard/equipo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role, restaurants(name)").eq("id", user.id).single();
  if (!profile) redirect("/completar-registro");
  if (profile.role !== "owner") redirect("/dashboard");
  const { data: members } = await supabase.from("profiles").select("id, full_name, role").eq("restaurant_id", profile.restaurant_id).neq("role", "owner").order("full_name");
  const relation = profile.restaurants as unknown as { name: string } | { name: string }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-green">{restaurant?.name ?? "Restaurante"}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-navy">Mi equipo</h1>
      <p className="mt-2 text-slate-500">Invita meseros y personal de cocina. Cada empleado recibirá un correo para entrar a su panel.</p>
      {params.success ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Operación completada correctamente.</p> : null}
      {params.error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No se pudo completar la operación. Revisa los datos e inténtalo nuevamente.</p> : null}
      <form action={inviteTeamMemberAction} className="mt-8 rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange"><Mail className="size-5" /></span><div><h2 className="font-black text-brand-navy">Invitar empleado</h2><p className="text-sm text-slate-500">Elige qué puede ver y operar.</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold">Nombre<Input name="fullName" className="mt-2" required /></label><label className="text-sm font-bold">Correo<Input name="email" type="email" className="mt-2" required /></label><label className="text-sm font-bold">Rol<select name="role" defaultValue="mesero" className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="mesero">Mesero</option><option value="cocina">Cocina</option></select></label></div>
        <Button type="submit" className="mt-5 rounded-xl bg-brand-orange hover:bg-brand-orange/90">Enviar invitación</Button>
      </form>
      <section className="mt-6 rounded-3xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b px-5 py-5"><Users className="size-5 text-brand-green" /><h2 className="font-black text-brand-navy">Personal activo</h2></div><div className="divide-y">{members?.length ? members.map((member) => <div key={member.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-bold text-brand-navy">{member.full_name}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{member.role === "cocina" ? "Cocina" : "Mesero"}</p></div><form action={removeTeamMemberAction}><input type="hidden" name="memberId" value={member.id} /><Button type="submit" variant="ghost" size="icon" className="text-red-600" aria-label={`Retirar a ${member.full_name}`}><Trash2 className="size-4" /></Button></form></div>) : <p className="px-5 py-10 text-center text-sm text-slate-500">Todavía no tienes empleados agregados.</p>}</div></section>
    </main>
  );
}