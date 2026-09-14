import type { Metadata } from "next";
import { DemoLoader } from "@/components/demo/demo-loader";

export const metadata: Metadata = {
  title: "Demo gratis | CartaYa",
  description: "Prueba el editor de menús de CartaYa sin crear una cuenta ni usar una tarjeta.",
  robots: { index: true, follow: true },
};

export default function DemoPage() {
  return <DemoLoader />;
}
