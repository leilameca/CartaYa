"use client";

import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ReactNode, useEffect, useRef, useState } from "react";

const dishes = [
  { name: "Mofongo de camarones", price: "RD$ 625", image: "/landing/mofongo-camarones.webp" },
  { name: "Churrasco 12 oz", price: "RD$ 895", image: "/landing/churrasco-yuca.webp" },
  { name: "Chimi artesanal", price: "RD$ 385", image: "/landing/chimi-artesanal.webp" },
  { name: "Pasta de pollo", price: "RD$ 495", image: "/landing/pasta-pollo.webp" },
];

export function Reveal({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      id={id}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      className={`${className} transition-shadow duration-300 hover:shadow-lg`}
      style={{ transformPerspective: 1200 }}
      whileHover={reduceMotion ? undefined : { scale: 1.02, rotateX: 2, rotateY: -2, y: -4 }}
      transition={{ type: "spring", stiffness: 240, damping: 22, mass: 0.7 }}
    >
      {children}
    </motion.article>
  );
}

export function SpringNotice({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ type: "spring", stiffness: 210, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCounter({ value, pad = 0 }: { value: number; pad?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.7 });
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) return;
    const startedAt = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, value, visible]);

  const displayedValue = reduceMotion ? value : current;
  return <span ref={ref}>{String(displayedValue).padStart(pad, "0")}</span>;
}

export function FoodMarquee() {
  const reduceMotion = useReducedMotion();
  const loop = [...dishes, ...dishes];
  return (
    <section className="overflow-hidden border-y border-slate-200 bg-brand-navy py-5 text-white" aria-label="Platos de ejemplo">
      <div className="mb-4 flex items-center justify-between px-4 sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Menús que abren el apetito</p>
        <p className="hidden text-xs font-semibold text-slate-400 sm:block">Fotografías, precios y etiquetas listas para vender</p>
      </div>
      <motion.div
        className="flex w-max gap-4 px-2"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 34, ease: "linear", repeat: Infinity }}
      >
        {loop.map((dish, index) => (
          <article key={`${dish.name}-${index}`} className="group relative h-44 w-72 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 sm:h-52 sm:w-80">
            <Image src={dish.image} alt={dish.name} fill sizes="(max-width: 640px) 288px, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-12">
              <p className="font-black">{dish.name}</p>
              <p className="mt-1 text-sm font-bold text-orange-300">{dish.price}</p>
            </div>
          </article>
        ))}
      </motion.div>
    </section>
  );
}
