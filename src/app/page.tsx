import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  ChefHat,
  CircleCheck,
  Clock3,
  CookingPot,
  FilePlus2,
  LayoutDashboard,
  Menu,
  Palette,
  QrCode,
  Send,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { CookieNotice } from "@/components/cookie-notice";
import { AnimatedCounter, FoodMarquee, Reveal, SpringNotice, TiltCard } from "@/components/landing/landing-motion";
import { planCatalog, planOrder } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "CartaYa | Menú digital y operación para restaurantes",
  description: "Crea tu menú digital, recibe pedidos por mesa y organiza salón y cocina desde una plataforma sencilla.",
  alternates: { canonical: "/" },
};

const plans = planOrder.map((id) => ({ id, ...planCatalog[id] }));

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white pt-[72px] text-brand-navy">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="CartaYa, inicio" className="flex h-full shrink-0 items-center"><BrandLogo className="h-[58px] w-auto object-contain sm:h-16" priority /></Link>
          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 md:flex" aria-label="Navegación principal">
            <a href="#producto" className="transition hover:text-brand-orange">Producto</a>
            <a href="#operacion" className="transition hover:text-brand-orange">Cómo funciona</a>
            <a href="#planes" className="transition hover:text-brand-orange">Planes</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-extrabold transition hover:bg-slate-100 sm:px-4">Iniciar sesión</Link>
            <Link href="/registro" className="hidden rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-navy/90 sm:inline-flex">Comenzar gratis</Link>
          </div>
        </div>
      </header>

      <section className="relative px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,53,0.13),transparent_52%)]" />
        <Reveal className="relative mx-auto max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-green">CartaYa para restaurantes</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-[2.8rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[4.8rem]">
            Todo tu restaurante,<br className="hidden sm:block" /> en el mismo ritmo.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Un menú que vende, pedidos que llegan al lugar correcto y un equipo que sabe qué hacer. Sin complicar la experiencia del cliente.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/registro" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 font-black text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-brand-orange/90">Crear mi menú gratis <ArrowRight className="size-5" /></Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-black transition hover:border-brand-navy">Entrar a mi cuenta</Link>
          </div>
          <p className="mt-5 text-sm font-semibold text-slate-500">No necesitas tarjeta para comenzar.</p>
        </Reveal>

        <Reveal id="producto" className="relative mx-auto mt-14 max-w-7xl sm:mt-20">
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[linear-gradient(120deg,rgba(255,107,53,0.13),rgba(0,168,107,0.12))] blur-2xl" />
          <TiltCard><ProductPreview /></TiltCard>
        </Reveal>
      </section>

      <section className="border-y border-slate-200 bg-[#fafaf8]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-200 px-4 sm:px-6 md:grid-cols-4 md:divide-y-0 lg:px-8">
          <Capability icon={<QrCode className="size-5" />} label="QR por mesa" />
          <Capability icon={<Smartphone className="size-5" />} label="Sin descargar apps" />
          <Capability icon={<Clock3 className="size-5" />} label="Operación en vivo" />
          <Capability icon={<ShieldCheck className="size-5" />} label="Accesos por rol" />
        </div>
      </section>

      <FoodMarquee />

      <section id="operacion" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-orange">Una sola operación</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Cada persona ve exactamente lo que necesita.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">CartaYa une la experiencia pública y el trabajo interno sin poner toda la complejidad en una misma pantalla.</p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-12">
            <TiltCard className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f7f8f5] lg:col-span-7">
              <div className="p-7 sm:p-9">
                <FeatureLabel icon={<Smartphone className="size-4" />}>Para tus clientes</FeatureLabel>
                <h3 className="mt-5 max-w-lg text-3xl font-black tracking-tight">Un menú que se siente hecho para tu restaurante.</h3>
                <p className="mt-3 max-w-xl leading-7 text-slate-600">Fotos, categorías, colores y pedidos en una experiencia rápida que funciona desde cualquier celular.</p>
                <BenefitNote>Actualiza precios o platos agotados en un clic desde tu celular.</BenefitNote>
              </div>
              <div className="mx-5 rounded-t-[1.75rem] border border-b-0 border-slate-200 bg-white p-4 shadow-xl sm:mx-9 sm:p-6">
                <CustomerMenuPreview />
              </div>
            </TiltCard>

            <TiltCard className="rounded-[2rem] border border-slate-200 bg-brand-navy p-7 text-white sm:p-9 lg:col-span-5">
              <FeatureLabel dark icon={<ChefHat className="size-4" />}>Para cocina</FeatureLabel>
              <h3 className="mt-5 text-3xl font-black tracking-tight">Pedidos claros, incluso en la hora más movida.</h3>
              <p className="mt-3 leading-7 text-slate-300">La cocina recibe cada pedido con mesa, notas y estado. Sin conversaciones perdidas.</p>
              <BenefitNote dark>Pedidos directos a cocina o WhatsApp, sin intermediarios.</BenefitNote>
              <div className="mt-9 space-y-3">
                <KitchenTicket table="Mesa 04" status="Nuevo" items="2 mofongos · 1 limonada de coco" accent="orange" />
                <KitchenTicket table="Mesa 11" status="Preparando" items="1 churrasco 3/4 · yuca frita" accent="green" />
                <KitchenTicket table="Mesa 02" status="Listo" items="2 chimis · 2 jugos de chinola" accent="white" />
              </div>
            </TiltCard>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-9 lg:col-span-5">
              <FeatureLabel icon={<UsersRound className="size-4" />}>Para el equipo</FeatureLabel>
              <h3 className="mt-5 text-3xl font-black tracking-tight">Una mesa, un mesero, una atención más humana.</h3>
              <p className="mt-3 leading-7 text-slate-600">El primer mesero acepta la solicitud y conserva esa mesa durante la visita.</p>
              <SpringNotice className="mt-8 rounded-2xl border border-slate-200 bg-[#fafaf8] p-4">
                <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange"><BellRing className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-black">Mesa 07 solicita asistencia</p><p className="text-sm text-slate-500">Recibido ahora</p></div></div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"><span className="flex items-center gap-2 text-sm font-bold"><CircleCheck className="size-5 text-brand-green" />Asignada a Daniela</span><span className="text-xs font-bold text-slate-400">Activa</span></div>
              </SpringNotice>
            </article>

            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fff7f2] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg lg:col-span-7">
              <div className="grid h-full gap-8 p-7 sm:p-9 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                <div><FeatureLabel icon={<Palette className="size-4" />}>Tu identidad</FeatureLabel><h3 className="mt-5 text-3xl font-black tracking-tight">Tu marca por fuera. Tu forma de trabajar por dentro.</h3><p className="mt-3 leading-7 text-slate-600">Plus personaliza lo que ve el cliente. Pro lleva esa identidad también al panel interno.</p></div>
                <BrandPreview />
              </div>
            </article>
          </div>
        </Reveal>
      </section>

      <section className="bg-[#f7f8f5] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-black uppercase tracking-[0.17em] text-brand-green">Empieza sin fricción</p><h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Del registro al primer QR.</h2><p className="mt-4 text-lg leading-8 text-slate-600">Tres pasos sencillos para poner CartaYa frente a tus clientes.</p></div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-200 md:grid-cols-3">
            <Step number="01" icon={<Menu className="size-6" />} title="Crea tus platos" description="Carga cada plato rápidamente con foto, precio, oferta y disponibilidad." visual={<DishCreationPreview />} />
            <Step number="02" icon={<QrCode className="size-6" />} title="Personaliza tus QR" description="Genera un QR general o uno por mesa, siempre con la identidad de tu local." visual={<QrPreview />} />
            <Step number="03" icon={<CookingPot className="size-6" />} title="Recibe comandas" description="Los pedidos aparecen en tiempo real con mesa, productos y notas para cocina." visual={<OrderFlowPreview />} />
          </div>
        </Reveal>
      </section>

      <section id="planes" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.17em] text-brand-orange">Planes sencillos</p><h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Comienza pequeño. Crece sin mudarte.</h2></div><p className="max-w-lg text-lg leading-8 text-slate-600">Tu plan solo cambia después de que envías una solicitud y la aprobamos. Nunca se activa automáticamente.</p></div>
          <div className="mt-14 overflow-hidden rounded-[2rem] border border-slate-200">
            <div className="grid divide-y divide-slate-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {plans.map((plan) => <Plan key={plan.id} {...plan} featured={plan.id === "pro"} />)}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-brand-navy px-6 py-14 text-center text-white sm:px-10 sm:py-20">
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-brand-orange/25 blur-3xl" /><div className="absolute -bottom-28 -right-16 size-80 rounded-full bg-brand-green/25 blur-3xl" />
          <div className="relative mx-auto max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.17em] text-emerald-400">Tu menú puede estar listo hoy</p><h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Haz que pedir sea la parte fácil.</h2><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-300">Publica tus platos, comparte tu QR y deja que CartaYa mantenga todo conectado.</p><Link href="/registro" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-7 font-black text-white transition hover:-translate-y-0.5 hover:bg-brand-orange/90">Crear mi cuenta <ArrowRight className="size-5" /></Link></div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#fafaf8]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:px-8">
          <div><BrandLogo className="w-32" /><p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">Menús digitales y operación sencilla para restaurantes.</p></div>
          <div><p className="text-sm font-black">Producto</p><div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500"><a href="#producto" className="hover:text-brand-orange">Vista general</a><a href="#operacion" className="hover:text-brand-orange">Operación</a><a href="#planes" className="hover:text-brand-orange">Planes</a></div></div>
          <div><p className="text-sm font-black">Tu cuenta</p><div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500"><Link href="/login" className="hover:text-brand-orange">Iniciar sesión</Link><Link href="/registro" className="hover:text-brand-orange">Crear cuenta</Link></div></div>
          <div><p className="text-sm font-black">Contacto</p><div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500"><a href="mailto:contacto@tucartaya.com" className="hover:text-brand-orange">contacto@tucartaya.com</a><a href="mailto:soporte@tucartaya.com" className="hover:text-brand-orange">soporte@tucartaya.com</a><a href="mailto:seguridad@tucartaya.com" className="hover:text-brand-orange">seguridad@tucartaya.com</a></div></div>
          <div><p className="text-sm font-black">Confianza</p><div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500"><Link href="/privacidad" className="hover:text-brand-orange">Privacidad</Link><Link href="/cookies" className="hover:text-brand-orange">Cookies</Link><Link href="/seguridad" className="hover:text-brand-orange">Seguridad</Link><Link href="/terminos" className="hover:text-brand-orange">Términos</Link></div></div>
        </div>
      </footer>
      <CookieNotice />
    </main>
  );
}

function ProductPreview() {
  return <div className="overflow-hidden rounded-[1.6rem] border border-slate-300 bg-white shadow-[0_35px_90px_-35px_rgba(15,23,42,0.38)] sm:rounded-[2rem]"><div className="flex h-11 items-center gap-2 border-b bg-[#fafaf8] px-4"><i className="size-2.5 rounded-full bg-red-300" /><i className="size-2.5 rounded-full bg-amber-300" /><i className="size-2.5 rounded-full bg-emerald-300" /><span className="mx-auto rounded-md bg-white px-10 py-1 text-[10px] font-bold text-slate-400 shadow-sm sm:px-20">app.tucartaya.com</span></div><div className="grid min-h-[420px] sm:grid-cols-[190px_1fr]"><aside className="hidden border-r bg-brand-navy p-5 text-white sm:block"><BrandLogo className="w-28 brightness-0 invert" /><div className="mt-9 space-y-2"><PreviewNav active icon={<LayoutDashboard />} label="Resumen" /><PreviewNav icon={<UtensilsCrossed />} label="Menú" /><PreviewNav icon={<QrCode />} label="Mesas y QR" /><PreviewNav icon={<ChefHat />} label="Cocina" /><PreviewNav icon={<UserRoundCheck />} label="Equipo" /></div></aside><div className="relative overflow-hidden bg-[#f7f8f5] p-4 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-brand-green">Panel del restaurante</p><p className="mt-1 text-xl font-black sm:text-2xl">Buenas tardes, Casa Mía</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black shadow-sm">PLAN PRO</span></div><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-800"><CircleCheck className="size-3.5" />Cero comisiones por pedido</div><div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3"><Metric label="Pedidos hoy" value={24} /><Metric label="En cocina" value={6} pad={2} /><Metric label="Mesas activas" value={9} pad={2} /></div><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_210px]"><div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">Actividad reciente</p><span className="text-[10px] font-bold text-brand-green">EN VIVO</span></div><div className="mt-4 space-y-2"><Activity table="Mesa 08" text="Pedido enviado a cocina" time="Ahora" /><Activity table="Mesa 03" text="Pedido listo para entregar" time="2 min" /><Activity table="Mesa 12" text="Mesero asignado" time="4 min" /></div></div><SpringNotice className="rounded-2xl bg-brand-orange p-4 text-white"><BellRing className="size-5" /><p className="mt-8 text-xs font-bold text-orange-100">Nueva solicitud</p><p className="mt-1 text-lg font-black">Mesa 05</p><button className="mt-4 w-full rounded-lg bg-white py-2 text-xs font-black text-brand-orange">Aceptar mesa</button></SpringNotice></div></div></div></div>;
}

function PreviewNav({ icon, label, active = false }: { icon: React.ReactElement<{ className?: string }>; label: string; active?: boolean }) {
  return <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold ${active ? "bg-white text-brand-navy" : "text-slate-300"}`}>{icon && <span className="[&>svg]:size-4">{icon}</span>}{label}</div>;
}
function Metric({ label, value, pad = 0 }: { label: string; value: number; pad?: number }) { return <div className="rounded-xl border bg-white p-3 sm:p-4"><p className="text-[9px] font-bold uppercase text-slate-400 sm:text-[10px]">{label}</p><p className="mt-1 text-xl font-black sm:text-2xl"><AnimatedCounter value={value} pad={pad} /></p></div>; }
function Activity({ table, text, time }: { table: string; text: string; time: string }) { return <div className="flex items-center gap-3 rounded-xl bg-[#f7f8f5] p-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-brand-green"><CircleCheck className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-black">{table}</p><p className="truncate text-[10px] text-slate-500">{text}</p></div><span className="text-[9px] font-bold text-slate-400">{time}</span></div>; }
function Capability({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex items-center justify-center gap-3 px-3 py-6 text-sm font-black sm:px-6">{icon}<span>{label}</span></div>; }
function FeatureLabel({ icon, children, dark = false }: { icon: React.ReactNode; children: React.ReactNode; dark?: boolean }) { return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${dark ? "bg-white/10 text-emerald-300" : "bg-slate-100 text-slate-700"}`}>{icon}{children}</span>; }
function BenefitNote({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) { return <div className={`mt-5 flex max-w-xl items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold leading-5 ${dark ? "border-white/10 bg-white/[0.07] text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><CircleCheck className="mt-0.5 size-4 shrink-0" />{children}</div>; }

function CustomerMenuPreview() {
  return <div><div className="flex items-center justify-between border-b pb-4"><div><p className="font-black">Casa Mía</p><p className="text-xs text-slate-500">Mesa 08 · Santiago</p></div><span className="flex size-9 items-center justify-center rounded-full bg-brand-orange text-white"><Menu className="size-4" /></span></div><div className="mt-4 flex gap-2 overflow-hidden text-xs font-bold"><span className="rounded-full bg-brand-navy px-4 py-2 text-white">Más vendidos</span><span className="rounded-full bg-slate-100 px-4 py-2">Ofertas</span><span className="rounded-full bg-slate-100 px-4 py-2">Platos fuertes</span></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><MenuDish name="Churrasco 12 oz" price="RD$ 895" image="/landing/churrasco-yuca.webp" tag="Más vendido" variant="Término: 3/4" /><MenuDish name="Mofongo de camarones" price="RD$ 625" image="/landing/mofongo-camarones.webp" tag="Más vendido" /><div className="hidden sm:block"><MenuDish name="Chimi artesanal" price="RD$ 385" image="/landing/chimi-artesanal.webp" tag="Oferta" /></div></div></div>;
}
function MenuDish({ name, price, image, tag, variant }: { name: string; price: string; image: string; tag: string; variant?: string }) { return <div className="overflow-hidden rounded-xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="relative h-24"><Image src={image} alt={name} fill sizes="(max-width: 640px) 45vw, 180px" className="object-cover" /><span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[8px] font-black uppercase text-white ${tag === "Oferta" ? "bg-red-600" : "bg-brand-orange"}`}>{tag}</span></div><div className="p-3"><p className="text-xs font-black leading-4">{name}</p>{variant ? <p className="mt-1 text-[9px] font-semibold text-slate-500">{variant}</p> : null}<p className="mt-1.5 text-[10px] font-black text-brand-orange">{price}</p></div></div>; }
function KitchenTicket({ table, status, items, accent }: { table: string; status: string; items: string; accent: "orange" | "green" | "white" }) { const color = accent === "orange" ? "bg-brand-orange" : accent === "green" ? "bg-brand-green" : "bg-white"; return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3"><span className={`h-10 w-1 rounded-full ${color}`} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="text-sm font-black">{table}</p><p className="text-[10px] font-black uppercase tracking-wider text-slate-300">{status}</p></div><p className="mt-1 truncate text-xs text-slate-400">{items}</p></div></div>; }
function BrandPreview() { return <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-xl shadow-orange-900/5"><div className="flex items-center gap-3 border-b pb-3"><span className="flex size-9 items-center justify-center rounded-xl bg-brand-orange text-sm font-black text-white">CM</span><div><p className="text-xs font-black">Casa Mía</p><p className="text-[10px] text-slate-400">Panel interno</p></div></div><div className="mt-4 grid grid-cols-[70px_1fr] gap-3"><div className="space-y-2 rounded-xl bg-brand-navy p-2"><i className="block h-5 rounded bg-white/90" /><i className="block h-5 rounded bg-white/10" /><i className="block h-5 rounded bg-white/10" /></div><div className="space-y-2"><i className="block h-10 rounded-xl bg-orange-100" /><div className="grid grid-cols-2 gap-2"><i className="block h-14 rounded-xl bg-emerald-100" /><i className="block h-14 rounded-xl bg-slate-100" /></div></div></div></div>; }
function DishCreationPreview() { return <div className="rounded-2xl border bg-[#fafaf8] p-3"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-white text-brand-orange shadow-sm"><FilePlus2 className="size-4" /></span><div><p className="text-[10px] font-black">Nuevo plato</p><p className="text-[9px] text-slate-400">Creación rápida</p></div></div><div className="mt-3 grid grid-cols-[1fr_72px] gap-2"><div className="space-y-2"><i className="block h-7 rounded-lg border bg-white" /><i className="block h-7 rounded-lg border bg-white" /></div><div className="relative overflow-hidden rounded-lg"><Image src="/landing/mofongo-camarones.webp" alt="Vista previa del plato" fill sizes="72px" className="object-cover" /></div></div></div>; }
function QrPreview() { return <div className="flex items-center justify-between rounded-2xl border bg-[#fafaf8] p-3"><div><p className="text-[10px] font-black">QR · Mesa 08</p><p className="mt-1 text-[9px] text-slate-400">Logo y enlace permanente</p><span className="mt-3 inline-flex rounded-md bg-brand-orange px-2 py-1 text-[9px] font-black text-white">Casa Mía</span></div><span className="relative flex size-20 items-center justify-center rounded-xl border bg-white shadow-sm"><QrCode className="size-14" /><i className="absolute flex size-6 items-center justify-center rounded-md bg-brand-orange text-[7px] font-black text-white">CM</i></span></div>; }
function OrderFlowPreview() { return <div className="rounded-2xl border bg-brand-navy p-3 text-white"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black">Mesa 08</p><p className="text-[9px] text-slate-400">Mofongo · Churrasco 3/4</p></div><span className="rounded-full bg-brand-orange px-2 py-1 text-[8px] font-black uppercase">Nuevo</span></div><div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 p-2 text-[9px] font-bold text-emerald-300"><Send className="size-3.5" />Comanda recibida en tiempo real</div></div>; }
function Step({ number, icon, title, description, visual }: { number: string; icon: React.ReactNode; title: string; description: string; visual: React.ReactNode }) { return <article className="bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-9"><div className="flex items-center justify-between"><span className="flex size-12 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">{icon}</span><span className="text-sm font-black text-slate-300">{number}</span></div><div className="mt-6">{visual}</div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>; }
function Plan({ name, price, description, featuredBenefits, featured }: { name: string; price: number; description: string; featuredBenefits: string[]; featured: boolean }) { return <article className={`relative p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-9 ${featured ? "bg-brand-navy text-white" : "bg-white"}`}>{featured ? <span className="absolute right-6 top-6 rounded-full bg-brand-green px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Operación completa</span> : null}<p className={`text-sm font-black uppercase tracking-[0.14em] ${featured ? "text-emerald-400" : "text-brand-green"}`}>{name}</p><p className="mt-5 text-4xl font-black tracking-tight">RD$ {price.toLocaleString("es-DO")}<span className={`text-sm font-semibold ${featured ? "text-slate-400" : "text-slate-500"}`}> / mes</span></p><p className={`mt-2 min-h-10 text-sm ${featured ? "text-slate-300" : "text-slate-500"}`}>{description}</p><ul className="mt-7 space-y-3">{featuredBenefits.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm font-bold"><Check className={`mt-0.5 size-4 shrink-0 ${featured ? "text-emerald-400" : "text-brand-green"}`} />{feature}</li>)}</ul><Link href="/registro" className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-black transition ${featured ? "bg-brand-orange text-white hover:bg-brand-orange/90" : "border border-slate-300 hover:border-brand-navy"}`}>Comenzar con {name}</Link></article>; }
