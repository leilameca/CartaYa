"use client";

import dynamic from "next/dynamic";

const DemoWorkspace = dynamic(
  () => import("@/components/demo/demo-workspace").then((module) => module.DemoWorkspace),
  { ssr: false, loading: () => <div className="min-h-screen animate-pulse bg-brand-gray" aria-label="Cargando demo" /> },
);

export function DemoLoader() {
  return <DemoWorkspace />;
}
