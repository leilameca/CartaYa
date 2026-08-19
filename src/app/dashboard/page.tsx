import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, restaurants(name)")
    .eq("id", user.id)
    .single();

  if (!profile && !error) redirect("/completar-registro");
  if (error || !profile) throw new Error("No se pudo cargar el restaurante asociado a esta cuenta.");

  const restaurantRelation = profile.restaurants as unknown as { name: string } | { name: string }[] | null;
  const restaurant = Array.isArray(restaurantRelation) ? restaurantRelation[0] : restaurantRelation;

  return (
    <main className="min-h-screen bg-brand-gray">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLogo className="w-28 sm:w-32" priority />
          <form action={logoutAction}>
            <Button type="submit" variant="outline">Cerrar sesión</Button>
          </form>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-green">Panel del restaurante</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
          Bienvenido, {restaurant?.name ?? "tu restaurante"}
        </h1>
      </section>
    </main>
  );
}
