/* R2 public URLs are supplied by the restaurant and do not use Next's image optimizer. */
/* eslint-disable @next/next/no-img-element */
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
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role, restaurants(name, slug, phone, address, logo_url, primary_color, secondary_color, menu_style, internal_primary_color, internal_secondary_color, subscription_tier)").eq("id", user.id).single();
  if (!profile) redirect("/completar-registro");
  if (profile.role !== "owner") redirect("/dashboard");
  const relation = profile.restaurants as unknown as { name: string; slug: string; phone: string | null; address: string | null; logo_url: string | null; primary_color: string; secondary_color: string; menu_style: string; internal_primary_color: string; internal_secondary_color: string; subscription_tier: "gratis" | "plus" | "pro" } | { name: string; slug: string; phone: string | null; address: string | null; logo_url: string | null; primary_color: string; secondary_color: string; menu_style: string; internal_primary_color: string; internal_secondary_color: string; subscription_tier: "gratis" | "plus" | "pro" }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!restaurant) redirect("/completar-registro");
  if (restaurant.subscription_tier === "gratis") redirect("/dashboard/plan?required=plus");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-green">Configuración</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-navy">Personaliza tu restaurante</h1>
      <p className="mt-2 text-slate-500">Plus personaliza lo que ven tus clientes. Pro también cambia la apariencia de la plataforma interna.</p>
      {params.success ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Configuración guardada.</p> : null}
      {params.error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No se pudo guardar. Revisa los datos e inténtalo de nuevo.</p> : null}
      <form action={updateRestaurantSettingsAction} encType="multipart/form-data" className="mt-8 space-y-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-brand-navy">Nombre del restaurante<Input name="name" defaultValue={restaurant.name} className="mt-2" required /></label>
          <label className="text-sm font-bold text-brand-navy">Identificador del menú<Input name="slug" defaultValue={restaurant.slug} className="mt-2" required /></label>
          <label className="text-sm font-bold text-brand-navy">Teléfono / WhatsApp<Input name="phone" defaultValue={restaurant.phone ?? ""} className="mt-2" /></label>
          <label className="text-sm font-bold text-brand-navy">Color principal del menú<input name="primaryColor" type="color" defaultValue={restaurant.primary_color} className="mt-2 block h-10 w-full cursor-pointer rounded-md border p-1" /></label>
          <label className="text-sm font-bold text-brand-navy">Color secundario del menú<input name="secondaryColor" type="color" defaultValue={restaurant.secondary_color} className="mt-2 block h-10 w-full cursor-pointer rounded-md border p-1" /></label>
          <label className="text-sm font-bold text-brand-navy">Estilo del menú<select name="menuStyle" defaultValue={restaurant.menu_style} className="mt-2 h-10 w-full rounded-md border bg-white px-3"><option value="moderno">Moderno</option><option value="clasico">Clásico</option><option value="calido">Cálido</option></select></label>
        </div>
        <label className="block text-sm font-bold text-brand-navy">Dirección<Input name="address" defaultValue={restaurant.address ?? ""} className="mt-2" /></label>
        <label className="block text-sm font-bold text-brand-navy">Logo del restaurante<input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-2 block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
        {restaurant.logo_url ? <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-3"><img src={restaurant.logo_url} alt={`Logo actual de ${restaurant.name}`} className="size-14 rounded-lg object-contain" /><p className="text-sm text-slate-600">El logo actual se conservará si no eliges uno nuevo.</p></div> : null}
        {restaurant.subscription_tier === "pro" ? <fieldset className="rounded-2xl border border-brand-green/30 bg-emerald-50/50 p-4"><legend className="px-2 text-sm font-black text-brand-navy">Tema de la plataforma interna · Pro</legend><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Color de acciones<input name="internalPrimaryColor" type="color" defaultValue={restaurant.internal_primary_color} className="mt-2 block h-10 w-full rounded-md border p-1" /></label><label className="text-sm font-bold">Color de acento<input name="internalSecondaryColor" type="color" defaultValue={restaurant.internal_secondary_color} className="mt-2 block h-10 w-full rounded-md border p-1" /></label></div></fieldset> : null}
        <div className="flex items-center gap-3 border-t pt-5"><Button type="submit" className="gap-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90"><Settings className="size-4" />Guardar cambios</Button><span className="text-xs text-slate-500">Puedes elegir una imagen desde tu computadora o celular.</span></div>
      </form>
    </main>
  );
}
