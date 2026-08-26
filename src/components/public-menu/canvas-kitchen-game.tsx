"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

export type KitchenGameId = "runner" | "platform" | "delivery";
export type GameSnapshot = { score: number; lives: number; time: number; objective: string };
export type GameResult = GameSnapshot & { won: boolean };

type InputState = { left: boolean; right: boolean; up: boolean; down: boolean; jump: boolean };
type Engine = {
  update: (dt: number, input: InputState) => GameResult | null;
  draw: (ctx: CanvasRenderingContext2D, background: HTMLImageElement | null) => void;
  snapshot: () => GameSnapshot;
};

const WIDTH = 800;
const HEIGHT = 450;
const FLOOR = 382;

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawBackground(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, panel: number, shade = 0.15) {
  if (image?.complete && image.naturalWidth) {
    const third = image.naturalWidth / 3;
    ctx.drawImage(image, panel * third, 0, third, image.naturalHeight, 0, 0, WIDTH, HEIGHT);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#10243a"); gradient.addColorStop(1, "#24170f");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  ctx.fillStyle = `rgba(3, 12, 25, ${shade})`; ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawChef(ctx: CanvasRenderingContext2D, x: number, y: number, alpha = 1, carrying = false) {
  ctx.save(); ctx.globalAlpha = alpha;
  roundedRect(ctx, x + 5, y + 27, 40, 42, 12, "#f8fafc", "#cbd5e1");
  ctx.fillStyle = "#10243a"; ctx.fillRect(x + 20, y + 50, 4, 19); ctx.fillRect(x + 31, y + 50, 4, 19);
  ctx.beginPath(); ctx.arc(x + 25, y + 23, 14, 0, Math.PI * 2); ctx.fillStyle = "#dba477"; ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(x + 14, y + 10, 10, 0, Math.PI * 2); ctx.arc(x + 25, y + 6, 12, 0, Math.PI * 2); ctx.arc(x + 37, y + 10, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x + 11, y + 10, 29, 9);
  if (carrying) { roundedRect(ctx, x + 38, y + 35, 24, 14, 5, "#ff6b35", "#fed7aa"); ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 43, y + 31, 14, 4); }
  ctx.restore();
}

function drawPot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  roundedRect(ctx, x, y + 12, 54, 35, 9, "#cbd5e1", "#475569");
  ctx.fillStyle = "#334155"; ctx.fillRect(x - 9, y + 20, 12, 7); ctx.fillRect(x + 51, y + 20, 12, 7);
  ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(x + 27, y + 8, 7, 0, Math.PI * 2); ctx.fill();
}

function drawIngredient(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  const colors = ["#f97316", "#ef4444", "#38bdf8"];
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 10;
  ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.beginPath(); ctx.arc(x + 23, y + 23, 23, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = colors[kind];
  if (kind === 0) { ctx.beginPath(); ctx.moveTo(x + 18, y + 12); ctx.lineTo(x + 34, y + 18); ctx.lineTo(x + 19, y + 37); ctx.closePath(); ctx.fill(); }
  if (kind === 1) { ctx.beginPath(); ctx.arc(x + 23, y + 25, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#16a34a"; ctx.fillRect(x + 22, y + 8, 4, 9); }
  if (kind === 2) { ctx.beginPath(); ctx.ellipse(x + 22, y + 24, 14, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 7, y + 24); ctx.lineTo(x, y + 15); ctx.lineTo(x, y + 33); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

function createRunnerEngine(): Engine {
  let score = 0, lives = 3, time = 50, collected = 0, playerY = FLOOR - 70, velocityY = 0, invulnerable = 0;
  let objectX = 860, objectY = FLOOR - 48, objectKind: "ingredient" | "hazard" = "ingredient", ingredient = 0;
  function respawn() {
    objectX = 820 + Math.random() * 180;
    objectKind = Math.random() < 0.62 ? "ingredient" : "hazard";
    ingredient = Math.floor(Math.random() * 3);
    objectY = objectKind === "ingredient" && Math.random() < 0.35 ? FLOOR - 125 : FLOOR - 48;
  }
  return {
    update(dt, input) {
      time -= dt; invulnerable = Math.max(0, invulnerable - dt);
      if (input.jump && playerY >= FLOOR - 71) velocityY = -650;
      input.jump = false;
      velocityY += 1750 * dt; playerY = Math.min(FLOOR - 70, playerY + velocityY * dt);
      if (playerY >= FLOOR - 70) velocityY = 0;
      objectX -= (300 + Math.min(170, score * 0.35)) * dt;
      const player = { x: 116, y: playerY, w: 50, h: 70 };
      const object = { x: objectX, y: objectY, w: objectKind === "hazard" ? 54 : 46, h: 48 };
      if (intersects(player, object)) {
        if (objectKind === "ingredient") { collected += 1; score += 120; respawn(); }
        else if (invulnerable <= 0) { lives -= 1; invulnerable = 1.2; respawn(); }
      } else if (objectX < -70) respawn();
      if (collected >= 8) return { ...this.snapshot(), won: true };
      if (lives <= 0 || time <= 0) return { ...this.snapshot(), won: false };
      return null;
    },
    draw(ctx, background) {
      drawBackground(ctx, background, 0, 0.12);
      ctx.fillStyle = "rgba(255,107,53,.85)"; ctx.fillRect(0, FLOOR, WIDTH, 6);
      drawChef(ctx, 112, playerY, invulnerable > 0 && Math.floor(invulnerable * 10) % 2 ? 0.3 : 1);
      if (objectKind === "hazard") drawPot(ctx, objectX, objectY); else drawIngredient(ctx, objectX, objectY, ingredient);
      roundedRect(ctx, 22, 22, 226, 58, 16, "rgba(3,12,25,.78)");
      ctx.fillStyle = "#ffffff"; ctx.font = "700 14px system-ui"; ctx.fillText("INGREDIENTES DEL PLATO", 40, 45);
      ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(40, 57, 186, 9); ctx.fillStyle = "#34d399"; ctx.fillRect(40, 57, 186 * (collected / 8), 9);
    },
    snapshot: () => ({ score, lives, time: Math.max(0, Math.ceil(time)), objective: `Ingredientes ${collected}/8` }),
  };
}

function createPlatformEngine(): Engine {
  const platforms = [{ x: 0, y: 398, w: 800, h: 52 }, { x: 155, y: 305, w: 160, h: 22 }, { x: 380, y: 225, w: 155, h: 22 }, { x: 600, y: 305, w: 145, h: 22 }];
  const ingredients = [{ x: 218, y: 252, kind: 0 }, { x: 435, y: 172, kind: 1 }, { x: 655, y: 252, kind: 2 }];
  const hazards = [{ x: 335, y: 370, w: 66, h: 28 }, { x: 545, y: 370, w: 58, h: 28 }];
  let x = 48, y = 328, vx = 0, vy = 0, score = 0, lives = 3, time = 70, invulnerable = 0;
  const found = [false, false, false];
  return {
    update(dt, input) {
      time -= dt; invulnerable = Math.max(0, invulnerable - dt);
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      vx += direction * 1250 * dt; vx *= Math.pow(0.0008, dt); vx = clamp(vx, -245, 245);
      if (input.jump) {
        const feet = y + 70;
        const grounded = platforms.some((p) => Math.abs(feet - p.y) < 3 && x + 44 > p.x && x < p.x + p.w);
        if (grounded) vy = -650;
      }
      input.jump = false;
      const oldBottom = y + 70; x = clamp(x + vx * dt, 0, WIDTH - 48); vy += 1750 * dt; let nextY = y + vy * dt;
      if (vy >= 0) {
        let landing = Number.POSITIVE_INFINITY;
        for (const p of platforms) if (x + 42 > p.x && x + 6 < p.x + p.w && oldBottom <= p.y + 4 && nextY + 70 >= p.y) landing = Math.min(landing, p.y - 70);
        if (Number.isFinite(landing)) { nextY = landing; vy = 0; }
      }
      y = nextY;
      ingredients.forEach((item, index) => {
        if (!found[index] && intersects({ x, y, w: 48, h: 70 }, { x: item.x, y: item.y, w: 46, h: 46 })) { found[index] = true; score += 250; }
      });
      if (invulnerable <= 0 && hazards.some((hazard) => intersects({ x, y, w: 48, h: 70 }, hazard))) { lives -= 1; invulnerable = 1.2; x = 48; y = 328; vx = 0; vy = 0; }
      if (found.every(Boolean) && intersects({ x, y, w: 48, h: 70 }, { x: 742, y: 330, w: 58, h: 68 })) { score += 250; return { ...this.snapshot(), score, won: true }; }
      if (lives <= 0 || time <= 0) return { ...this.snapshot(), won: false };
      return null;
    },
    draw(ctx, background) {
      drawBackground(ctx, background, 1, 0.12);
      platforms.slice(1).forEach((p) => roundedRect(ctx, p.x, p.y, p.w, p.h, 8, "#e7b978", "#fff1d6"));
      hazards.forEach((h) => { ctx.fillStyle = "rgba(56,189,248,.75)"; ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, h.h / 2, 0, 0, Math.PI * 2); ctx.fill(); });
      ingredients.forEach((item, index) => { if (!found[index]) drawIngredient(ctx, item.x, item.y, item.kind); });
      drawChef(ctx, x, y, invulnerable > 0 && Math.floor(invulnerable * 10) % 2 ? 0.3 : 1);
      roundedRect(ctx, 742, 330, 54, 68, 12, "#f97316", "#fed7aa"); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(769, 349, 12, 0, Math.PI * 2); ctx.fill();
      roundedRect(ctx, 20, 20, 215, 48, 15, "rgba(3,12,25,.78)"); ctx.fillStyle = "#fff"; ctx.font = "700 15px system-ui"; ctx.fillText(`Estación: ${found.filter(Boolean).length}/3 ingredientes`, 38, 50);
    },
    snapshot: () => ({ score, lives, time: Math.max(0, Math.ceil(time)), objective: `Ingredientes ${found.filter(Boolean).length}/3` }),
  };
}

function createDeliveryEngine(): Engine {
  const tables = [{ x: 115, y: 40, w: 130, h: 78 }, { x: 335, y: 40, w: 130, h: 78 }, { x: 555, y: 40, w: 130, h: 78 }];
  let spills = [{ x: 210, y: 210, r: 34 }, { x: 395, y: 265, r: 38 }, { x: 570, y: 200, r: 34 }];
  let x = 376, y = 340, score = 0, lives = 3, time = 65, carrying = false, target = Math.floor(Math.random() * 3), deliveries = 0, invulnerable = 0;
  const kitchen = { x: 326, y: 360, w: 150, h: 72 };
  function newRound() {
    carrying = false; x = 376; y = 320; target = Math.floor(Math.random() * 3);
    spills = spills.map((_, index) => ({ x: 175 + index * 210 + Math.random() * 55, y: 185 + Math.random() * 125, r: 30 + Math.random() * 10 }));
  }
  return {
    update(dt, input) {
      time -= dt; invulnerable = Math.max(0, invulnerable - dt);
      let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0), dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length;
      x = clamp(x + dx * 235 * dt, 8, WIDTH - 56); y = clamp(y + dy * 235 * dt, 72, HEIGHT - 76);
      const player = { x, y, w: 52, h: 70 };
      if (!carrying && intersects(player, kitchen)) carrying = true;
      if (carrying && intersects(player, tables[target])) { deliveries += 1; score += 350; if (deliveries >= 3) return { ...this.snapshot(), score, won: true }; newRound(); }
      if (invulnerable <= 0 && spills.some((spill) => Math.hypot(x + 26 - spill.x, y + 55 - spill.y) < spill.r + 18)) { lives -= 1; invulnerable = 1.2; x = 376; y = 320; }
      if (lives <= 0 || time <= 0) return { ...this.snapshot(), won: false };
      return null;
    },
    draw(ctx, background) {
      drawBackground(ctx, background, 2, 0.08);
      tables.forEach((table, index) => {
        roundedRect(ctx, table.x, table.y, table.w, table.h, 18, index === target ? "rgba(16,185,129,.82)" : "rgba(15,23,42,.72)", index === target ? "#a7f3d0" : "rgba(255,255,255,.35)");
        ctx.fillStyle = "#fff"; ctx.font = "800 16px system-ui"; ctx.textAlign = "center"; ctx.fillText(`MESA ${index + 1}`, table.x + table.w / 2, table.y + 46);
      });
      spills.forEach((spill) => { ctx.fillStyle = "rgba(56,189,248,.68)"; ctx.beginPath(); ctx.ellipse(spill.x, spill.y, spill.r, spill.r * .48, -.18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(224,242,254,.9)"; ctx.lineWidth = 3; ctx.stroke(); });
      roundedRect(ctx, kitchen.x, kitchen.y, kitchen.w, kitchen.h, 18, "rgba(249,115,22,.88)", "#fed7aa"); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "800 15px system-ui"; ctx.fillText(carrying ? "PEDIDO RECOGIDO" : "RECOGER PEDIDO", kitchen.x + kitchen.w / 2, kitchen.y + 42);
      drawChef(ctx, x, y, invulnerable > 0 && Math.floor(invulnerable * 10) % 2 ? 0.3 : 1, carrying);
      roundedRect(ctx, 20, 20, 230, 45, 14, "rgba(3,12,25,.78)"); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.font = "700 15px system-ui"; ctx.fillText(carrying ? `Entrega en mesa ${target + 1}` : "Regresa a cocina por el plato", 38, 49);
    },
    snapshot: () => ({ score, lives, time: Math.max(0, Math.ceil(time)), objective: `Entregas ${deliveries}/3` }),
  };
}

function createEngine(game: KitchenGameId) { return game === "runner" ? createRunnerEngine() : game === "platform" ? createPlatformEngine() : createDeliveryEngine(); }

export function CanvasKitchenGame({ game, session, onUpdate, onFinish }: { game: KitchenGameId; session: number; onUpdate: (snapshot: GameSnapshot) => void; onFinish: (result: GameResult) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, up: false, down: false, jump: false });
  const updateRef = useRef(onUpdate); const finishRef = useRef(onFinish);
  useEffect(() => { updateRef.current = onUpdate; finishRef.current = onFinish; }, [onFinish, onUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1); canvas.width = WIDTH * ratio; canvas.height = HEIGHT * ratio;
    const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const background = new Image(); background.src = "/game-assets/chef-arcade-worlds.png";
    const engine = createEngine(game); let previous = performance.now(), frame = 0, lastSnapshot = "", finished = false;
    const render = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - previous) / 1000)); previous = now;
      const result = engine.update(dt, inputRef.current); engine.draw(ctx, background);
      const snapshot = engine.snapshot(), serialized = JSON.stringify(snapshot);
      if (serialized !== lastSnapshot) { lastSnapshot = serialized; updateRef.current(snapshot); }
      if (result && !finished) { finished = true; finishRef.current(result); return; }
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);
    const keyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
      if (event.code === "ArrowLeft") inputRef.current.left = true;
      if (event.code === "ArrowRight") inputRef.current.right = true;
      if (event.code === "ArrowUp") inputRef.current.up = true;
      if (event.code === "ArrowDown") inputRef.current.down = true;
      if (["Space", "ArrowUp"].includes(event.code)) inputRef.current.jump = true;
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft") inputRef.current.left = false;
      if (event.code === "ArrowRight") inputRef.current.right = false;
      if (event.code === "ArrowUp") inputRef.current.up = false;
      if (event.code === "ArrowDown") inputRef.current.down = false;
    };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); inputRef.current = { left: false, right: false, up: false, down: false, jump: false }; };
  }, [game, session]);

  function hold(key: keyof InputState, value: boolean, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault(); if (value) event.currentTarget.setPointerCapture(event.pointerId); inputRef.current[key] = value;
  }
  function jump(event: ReactPointerEvent<HTMLButtonElement>) { event.preventDefault(); inputRef.current.jump = true; }

  return <div className="flex min-h-0 flex-1 flex-col bg-slate-950">
    <canvas ref={canvasRef} className="aspect-video w-full bg-slate-900 object-contain touch-none" aria-label="Área del juego" />
    <div className="flex min-h-20 items-center justify-center gap-3 border-t border-white/10 bg-brand-navy px-4 py-3 text-white touch-none">
      {game === "runner" ? <button type="button" onPointerDown={jump} className="flex min-h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-black shadow-lg active:scale-95"><ArrowUp className="size-5" />Saltar</button> : <>
        <button type="button" onPointerDown={(event) => hold("left", true, event)} onPointerUp={(event) => hold("left", false, event)} onPointerCancel={(event) => hold("left", false, event)} className="flex size-14 items-center justify-center rounded-2xl bg-white/10 active:bg-white/25" aria-label="Mover a la izquierda"><ArrowLeft /></button>
        {game === "platform" ? <button type="button" onPointerDown={jump} className="flex min-h-14 min-w-32 items-center justify-center gap-2 rounded-2xl bg-brand-orange px-5 font-black active:scale-95"><ArrowUp />Saltar</button> : <div className="grid grid-cols-1 gap-1"><button type="button" onPointerDown={(event) => hold("up", true, event)} onPointerUp={(event) => hold("up", false, event)} onPointerCancel={(event) => hold("up", false, event)} className="flex size-9 items-center justify-center rounded-xl bg-white/10" aria-label="Avanzar"><ArrowUp className="size-4" /></button><button type="button" onPointerDown={(event) => hold("down", true, event)} onPointerUp={(event) => hold("down", false, event)} onPointerCancel={(event) => hold("down", false, event)} className="flex size-9 items-center justify-center rounded-xl bg-white/10" aria-label="Retroceder"><ArrowDown className="size-4" /></button></div>}
        <button type="button" onPointerDown={(event) => hold("right", true, event)} onPointerUp={(event) => hold("right", false, event)} onPointerCancel={(event) => hold("right", false, event)} className="flex size-14 items-center justify-center rounded-2xl bg-white/10 active:bg-white/25" aria-label="Mover a la derecha"><ArrowRight /></button>
      </>}
    </div>
  </div>;
}
