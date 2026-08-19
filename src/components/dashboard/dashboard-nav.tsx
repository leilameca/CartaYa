"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, CreditCard, LayoutDashboard, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/menu", label: "Gestor de menú", icon: UtensilsCrossed },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard/cocina", label: "Cocina (KDS)", icon: ChefHat },
  { href: "/dashboard/plan", label: "Mi plan", icon: CreditCard },
];

export function DashboardNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn(mobile ? "flex gap-1 overflow-x-auto px-4 pb-3" : "space-y-1 px-3")} aria-label="Navegación del panel">
      {links.map((link) => {
        const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link key={link.href} href={link.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", mobile && "shrink-0", active ? "bg-brand-orange text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-brand-navy")}>
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
