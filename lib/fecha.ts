const ZONA = "America/Argentina/Buenos_Aires";

/** Interpreta un datetime-local como hora de Argentina (UTC-3, sin horario de verano). */
export function parseFechaAR(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return new Date(NaN);
  const [, ys, ms, ds, hs, mins] = match;
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const h = Number(hs);
  const min = Number(mins);
  return new Date(Date.UTC(y, m - 1, d, h + 3, min, 0));
}

export function fechaAR(daysAhead: number, hour: number, minute: number) {
  const [y, m, d] = arYmd(new Date());
  return new Date(Date.UTC(y, m - 1, d + daysAhead, hour + 3, minute, 0));
}

/** Hoy a esa hora, o mañana si ya pasó. */
export function hoyOAEstaHora(hour: number, minute: number) {
  const hoy = fechaAR(0, hour, minute);
  if (hoy.getTime() < Date.now() + 30 * 60 * 1000) return fechaAR(1, hour, minute);
  return hoy;
}

export function inicioHoyAR() {
  return fechaAR(0, 0, 0);
}

export function esHoyAR(fecha: Date) {
  return arYmd(fecha).join("-") === arYmd(new Date()).join("-");
}

export function toDatetimeLocalAR(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

export function etiquetaCuando(fecha: Date) {
  const hora = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(fecha);
  const dia = arYmd(fecha).join("-");
  const hoy = arYmd(new Date()).join("-");
  const manana = arYmd(new Date(Date.now() + 24 * 60 * 60 * 1000)).join("-");
  if (dia === hoy) return `Hoy ${hora}`;
  if (dia === manana) return `Mañana ${hora}`;
  const wd = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(fecha);
  return `${wd} ${hora}`;
}

export function proximoSabado(hour: number, minute: number) {
  for (let i = 1; i <= 7; i++) {
    const dt = fechaAR(i, hour, minute);
    const wd = new Intl.DateTimeFormat("en-US", {
      timeZone: ZONA,
      weekday: "short",
    }).format(dt);
    if (wd.startsWith("Sat")) return dt;
  }
  return fechaAR(6, hour, minute);
}

function arYmd(date: Date) {
  const text = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return text.split("-").map(Number);
}
