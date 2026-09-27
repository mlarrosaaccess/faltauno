export const FORMATOS = ["5v5", "7v7", "11v11"] as const;
export type Formato = (typeof FORMATOS)[number];

export const CUPOS: Record<Formato, number> = {
  "5v5": 10,
  "7v7": 14,
  "11v11": 22,
};

export const POSICIONES = ["Arquero", "Defensor", "Mediocampista", "Delantero"] as const;
export const NIVELES = ["Principiante", "Mixto", "Competitivo"] as const;
export const SUPERFICIES = ["Sintético", "Techada", "Césped"] as const;

export function esFormato(value: string): value is Formato {
  return (FORMATOS as readonly string[]).includes(value);
}

export function tituloDe(formato: Formato, cancha: string) {
  if (formato === "5v5") return `Fútbol 5 - ${cancha}`;
  if (formato === "7v7") return `Picado 7v7 - ${cancha}`;
  return `11 vs 11 - ${cancha}`;
}

export function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function iniciales(nombre: string) {
  const limpio = nombre
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return limpio.slice(0, 2).toUpperCase();
}

export function ratingDe(puntualidad: number | null | undefined, fairPlay: number | null | undefined) {
  if (puntualidad == null || fairPlay == null) return null;
  return (puntualidad + fairPlay) / 2;
}

export function textoRating(valor: number | null) {
  if (valor == null) return "Sin rating";
  return valor.toFixed(1);
}
