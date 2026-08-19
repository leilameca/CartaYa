"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import QRCode from "qrcode";
import { CheckCircle2, Download, FileArchive, LockKeyhole, Pencil, Plus, QrCode as QrCodeIcon, Trash2 } from "lucide-react";
import { createTableAction, deleteTableAction, renameTableAction } from "@/app/dashboard/qr/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasTier, planNames, type SubscriptionTier } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

type RestaurantTable = { id: string; label: string; qr_code_url: string | null };
type Notice = { error?: string; success?: string };

const qrOptions = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  width: 720,
  color: { dark: "#1A2530", light: "#FFFFFFFF" },
};

function safeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "mesa";
}

function triggerDownload(content: string | Blob, filename: string) {
  const url = typeof content === "string" ? content : URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (typeof content !== "string") window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function downloadPng(target: string, filename: string) {
  triggerDownload(await QRCode.toDataURL(target, qrOptions), `${filename}.png`);
}

async function downloadSvg(target: string, filename: string) {
  const svg = await QRCode.toString(target, { ...qrOptions, type: "svg" });
  triggerDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
}

function QrPreview({ target, alt, className }: { target: string; alt: string; className?: string }) {
  const [source, setSource] = useState<string>("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(target, { ...qrOptions, width: 420 }).then((value) => {
      if (active) setSource(value);
    });
    return () => { active = false; };
  }, [target]);
  // A generated data URL cannot be optimized by next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return source ? <img src={source} alt={alt} className={className} /> : <div className={cn("animate-pulse rounded-2xl bg-slate-100", className)} />;
}

function DownloadButtons({ target, filename }: { target: string; filename: string }) {
  const [busy, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => startTransition(() => void downloadPng(target, filename))} className="gap-2 rounded-xl">
        <Download className="size-4" />PNG
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => startTransition(() => void downloadSvg(target, filename))} className="gap-2 rounded-xl">
        <Download className="size-4" />SVG
      </Button>
    </div>
  );
}

export function QrManager({
  restaurantName,
  slug,
  tier,
  tables,
  siteUrl,
}: {
  restaurantName: string;
  slug: string;
  tier: SubscriptionTier;
  tables: RestaurantTable[];
  siteUrl: string;
}) {
  const router = useRouter();
  const perTable = hasTier(tier, "plus");
  const generalTarget = `${siteUrl}/r/${encodeURIComponent(slug)}`;
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(tables[0]?.id ?? null);
  const [notice, setNotice] = useState<Notice>({});
  const [busy, startTransition] = useTransition();

  const selectedTable = useMemo(() => tables.find((table) => table.id === selectedId) ?? tables[0] ?? null, [selectedId, tables]);
  const selectedTarget = selectedTable ? `${siteUrl}/r/${encodeURIComponent(slug)}/mesa/${selectedTable.id}` : generalTarget;
  const selectedLabel = selectedTable ? `Mesa ${selectedTable.label}` : "Menú general";

  function runAction(action: () => Promise<Notice>, clear?: () => void) {
    setNotice({});
    startTransition(() => {
      void action().then((result) => {
        setNotice(result);
        if (!result.error) {
          clear?.();
          router.refresh();
        }
      });
    });
  }

  function createTable() {
    runAction(() => createTableAction(newLabel), () => setNewLabel(""));
  }

  function renameTable(tableId: string) {
    runAction(() => renameTableAction(tableId, editingLabel), () => setEditingId(null));
  }

  function removeTable(table: RestaurantTable) {
    if (!window.confirm(`¿Eliminar la mesa ${table.label}? Los pedidos históricos conservarán sus datos, pero este QR dejará de identificar la mesa.`)) return;
    runAction(() => deleteTableAction(table.id), () => setSelectedId(null));
  }

  function downloadAll() {
    startTransition(() => {
      void (async () => {
        setNotice({});
        const zip = new JSZip();
        const pngFolder = zip.folder("PNG");
        const svgFolder = zip.folder("SVG");
        await Promise.all(tables.map(async (table) => {
          const target = `${siteUrl}/r/${encodeURIComponent(slug)}/mesa/${table.id}`;
          const filename = `cartaya-${safeFilename(table.label)}`;
          const [png, svg] = await Promise.all([
            QRCode.toDataURL(target, qrOptions),
            QRCode.toString(target, { ...qrOptions, type: "svg" }),
          ]);
          pngFolder?.file(`${filename}.png`, png.split(",")[1], { base64: true });
          svgFolder?.file(`${filename}.svg`, svg);
        }));
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        triggerDownload(blob, `cartaya-qr-${safeFilename(restaurantName)}.zip`);
        setNotice({ success: "ZIP generado con todos los QR en PNG y SVG." });
      })().catch(() => setNotice({ error: "No se pudo crear el ZIP. Inténtalo nuevamente." }));
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-green">Códigos QR</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-navy sm:text-4xl">Tus accesos al menú</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Genera códigos permanentes sin servicios externos ni pagos por escaneo.</p>
        </div>
        <span className="w-fit rounded-full bg-brand-navy px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white">Plan {planNames[tier]}</span>
      </div>

      {notice.error ? <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{notice.error}</p> : null}
      {notice.success ? <p role="status" className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" />{notice.success}</p> : null}

      {!perTable ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <QrPreview target={generalTarget} alt="QR general del menú" className="size-52 shrink-0 rounded-2xl border bg-white p-2" />
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green"><QrCodeIcon className="size-4" />QR general</span>
                <h2 className="mt-4 text-2xl font-black text-brand-navy">Un QR para todo el restaurante</h2>
                <p className="mt-2 break-all text-sm text-slate-500">{generalTarget}</p>
                <div className="mt-5"><DownloadButtons target={generalTarget} filename={`cartaya-${safeFilename(restaurantName)}-general`} /></div>
              </div>
            </div>
            <div className="mt-7 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <LockKeyhole className="mt-0.5 size-5 shrink-0" />
              <div><p className="font-bold">QR por mesa disponible desde Plus</p><p className="mt-1">Sube de plan para identificar cada mesa y recibir pedidos automáticos por WhatsApp.</p></div>
            </div>
          </section>
          <TentCard restaurantName={restaurantName} label="Menú general" target={generalTarget} />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div><h2 className="text-xl font-black text-brand-navy">Mesas del restaurante</h2><p className="mt-1 text-sm text-slate-500">Cada mesa obtiene un enlace y un QR únicos.</p></div>
                {tables.length ? <Button type="button" onClick={downloadAll} disabled={busy} className="gap-2 rounded-xl bg-brand-navy hover:bg-brand-navy/90"><FileArchive className="size-4" />Descargar todos</Button> : null}
              </div>
              <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); createTable(); }}>
                <Input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} maxLength={40} placeholder="Ej. 1, Terraza 2 o Barra" className="h-11 rounded-xl" />
                <Button type="submit" disabled={busy || !newLabel.trim()} className="h-11 gap-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90"><Plus className="size-4" /><span className="hidden sm:inline">Crear mesa</span></Button>
              </form>
            </section>

            {tables.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed bg-white px-6 py-14 text-center"><QrCodeIcon className="mx-auto size-10 text-slate-300" /><h2 className="mt-4 text-lg font-bold text-brand-navy">Crea tu primera mesa</h2><p className="mt-1 text-sm text-slate-500">El QR aparecerá aquí listo para descargar.</p></div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tables.map((table) => {
                  const target = `${siteUrl}/r/${encodeURIComponent(slug)}/mesa/${table.id}`;
                  const filename = `cartaya-${safeFilename(table.label)}`;
                  return (
                    <article key={table.id} onClick={() => setSelectedId(table.id)} className={cn("cursor-pointer rounded-3xl border-2 bg-white p-5 shadow-sm transition", selectedTable?.id === table.id ? "border-brand-orange ring-4 ring-brand-orange/10" : "border-transparent hover:border-slate-200")}>
                      <div className="flex gap-4">
                        <QrPreview target={target} alt={`QR de mesa ${table.label}`} className="size-28 shrink-0 rounded-xl border bg-white p-1" />
                        <div className="min-w-0 flex-1">
                          {editingId === table.id ? (
                            <form onSubmit={(event) => { event.preventDefault(); renameTable(table.id); }} className="space-y-2">
                              <Input autoFocus value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} maxLength={40} className="h-9 rounded-lg" />
                              <div className="flex gap-2"><Button size="sm" disabled={busy}>Guardar</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button></div>
                            </form>
                          ) : (
                            <><h3 className="truncate text-lg font-black text-brand-navy">Mesa {table.label}</h3><p className="mt-1 truncate text-xs text-slate-400">{table.id}</p></>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
                        <DownloadButtons target={target} filename={filename} />
                        <div className="flex">
                          <Button type="button" variant="ghost" size="icon" aria-label={`Renombrar mesa ${table.label}`} onClick={(event) => { event.stopPropagation(); setEditingId(table.id); setEditingLabel(table.label); }}><Pencil className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar mesa ${table.label}`} onClick={(event) => { event.stopPropagation(); removeTable(table); }} className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <TentCard restaurantName={restaurantName} label={selectedLabel} target={selectedTarget} />
        </div>
      )}
    </main>
  );
}

function TentCard({ restaurantName, label, target }: { restaurantName: string; label: string; target: string }) {
  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Vista previa · parador de mesa</p>
      <div className="rounded-[2rem] bg-gradient-to-br from-brand-navy via-[#263746] to-[#111a22] p-5 shadow-2xl sm:p-7">
        <div className="rounded-[1.5rem] bg-white px-6 py-7 text-center shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-green">{restaurantName}</p>
          <h2 className="mt-3 text-2xl font-black text-brand-navy">Escanea y ordena</h2>
          <p className="mt-1 text-sm text-slate-500">Mira el menú desde tu celular</p>
          <QrPreview target={target} alt={`Vista previa ${label}`} className="mx-auto mt-5 aspect-square w-full max-w-64 rounded-2xl border bg-white p-2" />
          <span className="mt-5 inline-flex rounded-full bg-brand-orange px-5 py-2 text-sm font-extrabold text-white">{label}</span>
          <p className="mt-4 text-xs font-semibold text-slate-400">Menú digital por CartaYa</p>
        </div>
        <div className="mx-auto h-0 w-[82%] border-x-[34px] border-b-[28px] border-x-transparent border-b-black/25" aria-hidden="true" />
      </div>
    </aside>
  );
}
