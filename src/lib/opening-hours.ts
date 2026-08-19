import type { Json } from "@/types/database";

const DAY_KEYS = [
  ["sunday", "sun", "domingo", "dom"],
  ["monday", "mon", "lunes", "lun"],
  ["tuesday", "tue", "martes", "mar"],
  ["wednesday", "wed", "miércoles", "miercoles", "mié", "mie"],
  ["thursday", "thu", "jueves", "jue"],
  ["friday", "fri", "viernes", "vie"],
  ["saturday", "sat", "sábado", "sabado", "sáb", "sab"],
] as const;

type TimeRange = { open: string; close: string };

function minutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function rangesForDay(value: Json | undefined): TimeRange[] {
  if (value === false || value == null) return [];
  if (typeof value === "string") {
    const [open, close] = value.split(/\s*[-–—]\s*/);
    return open && close ? [{ open, close }] : [];
  }
  if (Array.isArray(value)) return value.flatMap((entry) => rangesForDay(entry));
  if (typeof value !== "object") return [];

  if (value.closed === true || value.cerrado === true || value.is_open === false) return [];
  const open = value.open ?? value.opens ?? value.abre ?? value.desde;
  const close = value.close ?? value.closes ?? value.cierra ?? value.hasta;
  return typeof open === "string" && typeof close === "string" ? [{ open, close }] : [];
}

function dayValue(hours: Record<string, Json | undefined>, dayIndex: number) {
  for (const key of DAY_KEYS[dayIndex]) {
    if (key in hours) return hours[key];
  }
  return undefined;
}

function rangeContains(range: TimeRange, nowMinutes: number, overnightFromPrevious = false) {
  const open = minutes(range.open);
  const close = minutes(range.close);
  if (open == null || close == null) return false;
  if (open === close) return true;
  if (close > open) return !overnightFromPrevious && nowMinutes >= open && nowMinutes < close;
  return overnightFromPrevious ? nowMinutes < close : nowMinutes >= open;
}

export function isRestaurantOpen(openingHours: Json, now = new Date()) {
  if (!openingHours || Array.isArray(openingHours) || typeof openingHours !== "object") return true;
  const hours = openingHours as Record<string, Json | undefined>;
  const hasSchedule = DAY_KEYS.some((keys) => keys.some((key) => key in hours));
  if (!hasSchedule) return true;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (weekdayIndex < 0 || Number.isNaN(nowMinutes)) return true;

  const today = rangesForDay(dayValue(hours, weekdayIndex));
  if (today.some((range) => rangeContains(range, nowMinutes))) return true;

  const previousDay = (weekdayIndex + 6) % 7;
  return rangesForDay(dayValue(hours, previousDay)).some((range) => rangeContains(range, nowMinutes, true));
}

