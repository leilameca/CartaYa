import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { updateRestaurantSettingsAction } from "@/app/dashboard/configuracion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role, restaurants(name, slug, phone, address, logo_url, primary_color)").eq("id", user.id).single();
  if (!profile) redirect("/completar-registro");
  if (profile.role !== "owner") redirect("/dashboard");
  const relation = profile.restaurants as unknown as { name: string; slug: string; phone: string | null; address: string | null; logo_url: string | null; primary_color: string } | { name: string; slug: string; phone: string | null; address: string | null; logo_url: string | null; primary_color: string }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!restaurant) redirect("/completar-registro");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-green">Configuración</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-navy">Personaliza tu restaurante</h1>
      <p className="mt-2 text-slate-500">Estos datos se muestran en tu menú público y en la experiencia de tus clientes.</p>
      {params.success ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Configuración guardada.</p> : null}
      {params.error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No se pudo guardar. Revisa los datos e inténtalo de nuevo.</p> : null}
      <form action={updateRestaurantSettingsAction} className="mt-8 space-y-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-brand-navy">Nombre del restaurante<Input name="name" defaultValue={restaurant.name} className="mt-2" required /></label>
          <label className="text-sm font-bold text-brand-navy">Identificador del menú<Input name="slug" defaultValue={restaurant.slug} className="mt-2" required /></label>
          <label className="text-sm font-bold text-brand-navy">Teléfono / WhatsApp<Input name="phone" defaultValue={restaurant.phone ?? ""} className="mt-2" /></label>
          <label className="text-sm font-bold text-brand-navy">Color principal<input name="primaryColor" type="color" defaultValue={restaurant.primary_color} className="mt-2 block h-10 w-full cursor-pointer rounded-md border p-1" /></label>
        </div>
        <label className="block text-sm font-bold text-brand-navy">Dirección<Input name="address" defaultValue={restaurant.address ?? ""} className="mt-2" /></label>
        <label className="block text-sm font-bold text-brand-navy">URL del logo<Input name="logoUrl" type="url" defaultValue={restaurant.logo_url ?? ""} placeholder="https://..." className="mt-2" /></label>
        <div className="flex items-center gap-3 border-t pt-5"><Button type="submit" className="gap-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90"><Settings className="size-4" />Guardar cambios</Button><span className="text-xs text-slate-500">El logo se puede alojar en Cloudflare R2 o en una URL pública.</span></div>
      </form>
    </main>
  );
}