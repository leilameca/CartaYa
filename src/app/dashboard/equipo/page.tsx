import { redirect } from "next/navigation";
import { KeyRound, Pencil, Trash2, Users } from "lucide-react";
import { createTeamMemberAction, removeTeamMemberAction, updateTeamMemberAction } from "@/app/dashboard/equipo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role, restaurants(name, subscription_tier)").eq("id", user.id).single();
  if (!profile) redirect("/completar-registro");
  if (profile.role !== "owner") redirect("/dashboard");
  const { data: members } = await supabase.from("profiles").select("id, full_name, role, staff_username").eq("restaurant_id", profile.restaurant_id).neq("role", "owner").order("full_name");
  const relation = profile.restaurants as unknown as { name: string; subscription_tier: "gratis" | "plus" | "pro" } | { name: string; subscription_tier: "gratis" | "plus" | "pro" }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (restaurant?.subscription_tier !== "pro") redirect("/dashboard/plan?required=pro");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-green">{restaurant?.name ?? "Restaurante"}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-navy">Mi equipo</h1>
      <p className="mt-2 text-slate-500">Crea accesos sencillos con usuario y clave. Tus empleados no necesitan correo.</p>
      {params.success ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Operación completada correctamente.</p> : null}
      {params.error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No se pudo completar la operación. Revisa los datos e inténtalo nuevamente.</p> : null}
      <form action={createTeamMemberAction} className="mt-8 rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange"><KeyRound className="size-5" /></span><div><h2 className="font-black text-brand-navy">Crear acceso de empleado</h2><p className="text-sm text-slate-500">Usará el identificador del restaurante, este usuario y su clave.</p></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4"><label className="text-sm font-bold">Nombre<Input name="fullName" className="mt-2" required /></label><label className="text-sm font-bold">Usuario<Input name="username" minLength={3} placeholder="ej. ana.m" className="mt-2" required /></label><label className="text-sm font-bold">Clave<Input name="password" type="password" minLength={6} className="mt-2" required /></label><label className="text-sm font-bold">Rol<select name="role" defaultValue="mesero" className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="mesero">Mesero</option><option value="cocina">Cocina</option></select></label></div>
        <Button type="submit" className="mt-5 rounded-xl bg-brand-orange hover:bg-brand-orange/90">Crear acceso</Button>
      </form>
      <section className="mt-6 rounded-3xl border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-5"><Users className="size-5 text-brand-green" /><h2 className="font-black text-brand-navy">Personal activo</h2></div>
        <div className="divide-y">{members?.length ? members.map((member) => (
          <div key={member.id} className="space-y-3 px-5 py-4">
            <div className="flex items-center justify-between gap-4"><div><p className="font-bold text-brand-navy">{member.full_name}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">@{member.staff_username ?? "sin-usuario"} · {member.role === "cocina" ? "Cocina" : "Mesero"}</p></div><form action={removeTeamMemberAction}><input type="hidden" name="memberId" value={member.id} /><Button type="submit" variant="ghost" size="icon" className="text-red-600" aria-label={`Eliminar a ${member.full_name}`}><Trash2 className="size-4" /></Button></form></div>
            <form action={updateTeamMemberAction} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_150px_1fr_auto] sm:items-end"><input type="hidden" name="memberId" value={member.id} /><label className="text-xs font-bold">Nombre<Input name="fullName" defaultValue={member.full_name} className="mt-1 bg-white" required /></label><label className="text-xs font-bold">Usuario<Input name="username" defaultValue={member.staff_username ?? ""} minLength={3} className="mt-1 bg-white" required /></label><label className="text-xs font-bold">Rol<select name="role" defaultValue={member.role === "cocina" ? "cocina" : "mesero"} className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="mesero">Mesero</option><option value="cocina">Cocina</option></select></label><label className="text-xs font-bold">Nueva clave<Input name="password" type="password" minLength={6} placeholder="Opcional" className="mt-1 bg-white" /></label><Button type="submit" className="gap-2 rounded-xl bg-brand-navy"><Pencil className="size-4" />Guardar</Button></form>
          </div>
        )) : <p className="px-5 py-10 text-center text-sm text-slate-500">Todavía no tienes empleados agregados.</p>}</div>
      </section>
    </main>
  );
}
