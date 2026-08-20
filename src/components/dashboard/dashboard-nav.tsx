"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, CreditCard, Crown, LayoutDashboard, LockKeyhole, Palette, QrCode, ShoppingBag, Users, UtensilsCrossed } from "lucide-react";
import { hasTier, type SubscriptionTier } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

const links = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["owner", "mesero", "cocina"] },
  { href: "/dashboard/menu", label: "Gestor de menú", icon: UtensilsCrossed, roles: ["owner"] },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag, required: "plus" as const, roles: ["owner", "mesero"] },
  { href: "/dashboard/qr", label: "Códigos QR", icon: QrCode, roles: ["owner"] },
  { href: "/dashboard/cocina", label: "Cocina (KDS)", icon: ChefHat, required: "pro" as const, roles: ["owner", "cocina"] },
  { href: "/dashboard/plan", label: "Mi plan", icon: CreditCard, roles: ["owner"] },
  { href: "/dashboard/equipo", label: "Mi equipo", icon: Users, roles: ["owner"], required: "pro" as const },
  { href: "/dashboard/configuracion", label: "Personalización", icon: Palette, roles: ["owner"], required: "pro" as const },
];

type ProfileRole = Database["public"]["Enums"]["profile_role"];

export function DashboardNav({ mobile = false, role, tier }: { mobile?: boolean; role: ProfileRole; tier: SubscriptionTier }) {
  const pathname = usePathname();

  return (
    <nav className={cn(mobile ? "flex gap-1 overflow-x-auto px-4 pb-3" : "space-y-1 px-3")} aria-label="Navegación del panel">
      {links.filter((link) => link.roles.includes(role)).map((link) => {
        const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        const required = "required" in link ? link.required : undefined;
        const locked = required ? !hasTier(tier, required) : false;
        const href = locked ? `/dashboard/plan?required=${required}` : link.href;
        return (
          <Link key={link.href} href={href} title={locked ? `Requiere plan ${required === "pro" ? "Pro" : "Plus"}` : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", mobile && "shrink-0", active ? "bg-brand-orange text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-brand-navy")}>
            <Icon className="h-4 w-4" />
            {link.label}
            {locked ? <span className="ml-auto flex items-center gap-1 text-[10px] font-extrabold uppercase"><LockKeyhole className="size-3" />{required === "pro" ? <Crown className="size-3 text-amber-500" /> : "Plus"}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
