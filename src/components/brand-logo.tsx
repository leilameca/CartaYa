import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "../../logo.png";

export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={logo}
      alt="CartaYa — Menús digitales rápidos"
      className={cn("h-auto w-52", className)}
      priority={priority}
    />
  );
}
