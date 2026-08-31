import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: accountProfile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (accountProfile?.role === "superadmin") redirect("/admin");

  const { data: profile, error } = await supabase.from("profiles").select("restaurants(name)").eq("id", user.id).single();
  if (error || !profile) throw new Error("No se pudo cargar el restaurante asociado a esta cuenta.");

  const { data: roleProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (roleProfile?.role === "cocina") redirect("/dashboard/cocina");
  if (roleProfile?.role === "mesero") redirect("/dashboard/salon");

  const relation = profile.restaurants as unknown as { name: string } | { name: string }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border bg-white px-6 py-12 shadow-sm sm:px-10">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-green">Panel del restaurante</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">Bienvenido, {restaurant?.name ?? "tu restaurante"}</h1>
        <p className="mt-4 max-w-2xl text-slate-600">Administra tu menú digital, disponibilidad y plan desde un solo lugar.</p>
      </section>
    </main>
  );
}
