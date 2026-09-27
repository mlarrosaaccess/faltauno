"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseFechaAR } from "@/lib/fecha";
import { NIVELES, POSICIONES } from "@/lib/formato";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  calificar,
  cancelarPartido,
  crearPartido,
  denunciar,
  esErrorConocido,
  salirDePartido,
  unirseAPartido,
} from "@/lib/partidos";
import { prisma } from "@/lib/prisma";
import { clearSession, setSession } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | null;

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function mensaje(e: unknown) {
  if (esErrorConocido(e)) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === "P2002") {
      return "Ese dato ya existe";
    }
    return "No se pudo guardar. Probá de nuevo.";
  }
  if (e instanceof Error && e.message && e.message.length < 180 && !e.message.includes("\n")) {
    return e.message;
  }
  return "No se pudo completar la acción";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email o contraseña incorrectos" };
  }
  if (user.suspendido) return { error: "Tu usuario está suspendido" };
  await setSession(user.id);
  redirect(user.rol === "admin" ? "/admin" : "/inicio");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function registrar(_prev: FormState, formData: FormData): Promise<FormState> {
  const nombre = str(formData, "nombre");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const posicion = str(formData, "posicion");
  const zonaId = Number(formData.get("zonaId"));

  if (nombre.length < 2) return { error: "Poné tu nombre" };
  if (!email.includes("@") || !email.includes(".")) return { error: "El email no es válido" };
  if (password.length < 6) return { error: "La contraseña necesita al menos 6 caracteres" };
  if (!(POSICIONES as readonly string[]).includes(posicion)) return { error: "Elegí una posición" };

  try {
    const user = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash: await hashPassword(password),
        posicion,
        rol: "jugador",
        zonaHabitualId: Number.isFinite(zonaId) ? zonaId : null,
      },
    });
    await setSession(user.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ese email ya tiene cuenta" };
    }
    return { error: mensaje(e) };
  }
  redirect("/inicio");
}

export async function unirse(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.rol !== "jugador") return { error: "Esta acción es solo para jugadores" };
  const id = Number(formData.get("partidoId"));
  if (!Number.isFinite(id)) return { error: "Partido inválido" };
  try {
    await unirseAPartido(user.id, id);
  } catch (e) {
    return { error: mensaje(e) };
  }
  revalidatePath("/inicio");
  revalidatePath(`/partidos/${id}`);
  redirect(`/partidos/${id}`);
}

export async function salir(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = Number(formData.get("partidoId"));
  try {
    await salirDePartido(user.id, id);
  } catch (e) {
    return { error: mensaje(e) };
  }
  revalidatePath("/inicio");
  revalidatePath(`/partidos/${id}`);
  redirect(`/partidos/${id}`);
}

export async function publicar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.rol !== "jugador") return { error: "Esta acción es solo para jugadores" };
  const nivel = str(formData, "nivel");
  if (!(NIVELES as readonly string[]).includes(nivel)) return { error: "Elegí un nivel" };
  let id = 0;
  try {
    id = await crearPartido({
      organizadorId: user.id,
      zonaId: Number(formData.get("zonaId")),
      canchaId: Number(formData.get("canchaId")),
      fecha: parseFechaAR(str(formData, "fecha")),
      formato: str(formData, "formato"),
      nivel,
      costoJugador: Number(str(formData, "costo")),
    });
  } catch (e) {
    return { error: mensaje(e) };
  }
  revalidatePath("/inicio");
  redirect(`/partidos/${id}`);
}

export async function enviarCalificacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const partidoId = Number(formData.get("partidoId"));
  try {
    await calificar({
      emisorId: user.id,
      evaluadoId: Number(formData.get("evaluadoId")),
      partidoId,
      puntualidad: Number(formData.get("puntualidad")),
      fairPlay: Number(formData.get("fairPlay")),
    });
  } catch (e) {
    return { error: mensaje(e) };
  }
  revalidatePath(`/partidos/${partidoId}`);
  revalidatePath("/perfil");
  return { ok: "Quedó registrada la calificación." };
}

export async function enviarDenuncia(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const partidoId = Number(formData.get("partidoId"));
  try {
    await denunciar(user.id, partidoId, str(formData, "texto"));
  } catch (e) {
    return { error: mensaje(e) };
  }
  revalidatePath(`/partidos/${partidoId}`);
  revalidatePath("/admin");
  return { ok: "Recibimos la denuncia." };
}

export async function cancelar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = Number(formData.get("partidoId"));
  try {
    await cancelarPartido(user.id, id, user.rol === "admin");
  } catch (e) {
    return { error: mensaje(e) };
  }
  revalidatePath("/inicio");
  revalidatePath("/admin");
  revalidatePath(`/partidos/${id}`);
  redirect(user.rol === "admin" ? "/admin" : `/partidos/${id}`);
}

export async function guardarPerfil(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const posicion = str(formData, "posicion");
  const zonaId = Number(formData.get("zonaId"));
  if (user.rol === "jugador" && !(POSICIONES as readonly string[]).includes(posicion)) {
    return { error: "Elegí una posición" };
  }
  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      posicion: posicion || null,
      zonaHabitualId: Number.isFinite(zonaId) && zonaId > 0 ? zonaId : null,
      avisoFaltaUno: formData.get("avisoFaltaUno") === "on",
      avisoCompleto: formData.get("avisoCompleto") === "on",
      mostrarZona: formData.get("mostrarZona") === "on",
    },
  });
  revalidatePath("/perfil");
  revalidatePath("/inicio");
  return { ok: "Perfil actualizado." };
}

export async function toggleCancha(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const cancha = await prisma.cancha.findUnique({ where: { id } });
  if (!cancha) return;
  await prisma.cancha.update({ where: { id }, data: { activa: !cancha.activa } });
  revalidatePath("/admin");
  revalidatePath("/inicio");
}

export async function altaCancha(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const nombre = str(formData, "nombre");
  const direccion = str(formData, "direccion");
  const superficie = str(formData, "superficie");
  const zonaId = Number(formData.get("zonaId"));
  const precioHora = Number(str(formData, "precioHora"));
  if (nombre.length < 2 || direccion.length < 4) return { error: "Completá nombre y dirección" };
  if (!Number.isFinite(zonaId) || !Number.isFinite(precioHora) || precioHora < 0) {
    return { error: "Revisá zona y precio" };
  }
  try {
    await prisma.cancha.create({
      data: { nombre, direccion, superficie, zonaId, precioHora, activa: true },
    });
  } catch (e) {
    return { error: mensaje(e) };
  }
  revalidatePath("/admin");
  revalidatePath("/crear");
  return { ok: "Cancha dada de alta." };
}

export async function suspenderUsuario(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const partidoId = Number(formData.get("partidoId"));
  await prisma.usuario.update({ where: { id }, data: { suspendido: true } });
  if (Number.isFinite(partidoId)) {
    await prisma.partido.update({ where: { id: partidoId }, data: { estado: "cancelado" } });
  }
  revalidatePath("/admin");
  revalidatePath("/inicio");
}
