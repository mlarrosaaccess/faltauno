import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { CUPOS, esFormato, tituloDe } from "./formato";

export async function crearPartido(input: {
  organizadorId: number;
  zonaId: number;
  canchaId: number;
  fecha: Date;
  formato: string;
  nivel: string;
  costoJugador: number;
}) {
  if (!esFormato(input.formato)) throw new Error("Elegí un formato: 5v5, 7v7 o 11v11");
  const formato = input.formato;
  if (Number.isNaN(input.fecha.getTime()) || input.fecha.getTime() < Date.now()) {
    throw new Error("Elegí un horario que todavía no pasó");
  }
  if (!Number.isFinite(input.costoJugador) || input.costoJugador < 0) {
    throw new Error("El costo por jugador no es válido");
  }
  const cupo = CUPOS[formato];

  return prisma.$transaction(async (tx) => {
    const jugador = await tx.usuario.findUnique({ where: { id: input.organizadorId } });
    if (!jugador || jugador.suspendido || jugador.rol !== "jugador") {
      throw new Error("No podés publicar un partido");
    }
    const cancha = await tx.cancha.findUnique({ where: { id: input.canchaId } });
    if (!cancha || !cancha.activa) throw new Error("Esa cancha no está disponible");
    if (cancha.zonaId !== input.zonaId) throw new Error("La cancha no pertenece a esa zona");

    const partido = await tx.partido.create({
      data: {
        titulo: tituloDe(formato, cancha.nombre),
        fechaHora: input.fecha,
        formato,
        cupo,
        nivel: input.nivel,
        costoJugador: input.costoJugador,
        estado: "abierto",
        organizadorId: input.organizadorId,
        canchaId: cancha.id,
      },
    });
    const ladoA = await tx.equipo.create({ data: { lado: "A", partidoId: partido.id } });
    await tx.equipo.create({ data: { lado: "B", partidoId: partido.id } });
    await tx.inscripcion.create({
      data: { jugadorId: input.organizadorId, partidoId: partido.id, equipoId: ladoA.id },
    });
    return partido.id;
  });
}

/**
 * Anota al jugador en el lado con menos gente.
 * El SELECT FOR UPDATE evita que dos personas ocupen el último cupo.
 */
export async function unirseAPartido(jugadorId: number, partidoId: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Partido" WHERE id = ${partidoId} FOR UPDATE`;

    const partido = await tx.partido.findUnique({
      where: { id: partidoId },
      include: {
        cancha: true,
        equipos: { include: { inscripciones: true } },
        inscripciones: true,
      },
    });
    if (!partido) throw new Error("Partido no encontrado");
    if (!partido.cancha.activa) throw new Error("La cancha no está disponible");
    if (partido.estado !== "abierto") throw new Error("Este partido no admite más jugadores");
    if (partido.fechaHora.getTime() < Date.now()) throw new Error("Este partido ya pasó");
    if (partido.inscripciones.some((i) => i.jugadorId === jugadorId)) {
      throw new Error("Ya estás anotado en este partido");
    }

    const jugador = await tx.usuario.findUnique({ where: { id: jugadorId } });
    if (!jugador || jugador.suspendido || jugador.rol !== "jugador") {
      throw new Error("No podés anotarte");
    }
    if (partido.inscripciones.length >= partido.cupo) {
      throw new Error("El partido ya está completo");
    }

    const ladoA = partido.equipos.find((e) => e.lado === "A");
    const ladoB = partido.equipos.find((e) => e.lado === "B");
    if (!ladoA || !ladoB) throw new Error("El partido no tiene los dos lados armados");
    const equipo = ladoA.inscripciones.length <= ladoB.inscripciones.length ? ladoA : ladoB;

    await tx.inscripcion.create({
      data: { jugadorId, partidoId, equipoId: equipo.id },
    });

    const ocupados = partido.inscripciones.length + 1;
    if (ocupados >= partido.cupo) {
      await tx.partido.update({ where: { id: partidoId }, data: { estado: "completo" } });
    }
    return { completo: ocupados >= partido.cupo };
  });
}

export async function salirDePartido(jugadorId: number, partidoId: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Partido" WHERE id = ${partidoId} FOR UPDATE`;
    const partido = await tx.partido.findUnique({ where: { id: partidoId } });
    if (!partido) throw new Error("Partido no encontrado");
    if (partido.estado === "cancelado") throw new Error("El partido está cancelado");
    if (partido.fechaHora.getTime() < Date.now()) throw new Error("El partido ya pasó");

    const inscripcion = await tx.inscripcion.findUnique({
      where: { jugadorId_partidoId: { jugadorId, partidoId } },
    });
    if (!inscripcion) throw new Error("No estás anotado");
    await tx.inscripcion.delete({ where: { id: inscripcion.id } });
    if (partido.estado === "completo") {
      await tx.partido.update({ where: { id: partidoId }, data: { estado: "abierto" } });
    }
  });
}

export async function cancelarPartido(actorId: number, partidoId: number, esAdmin: boolean) {
  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) throw new Error("Partido no encontrado");
  if (!esAdmin && partido.organizadorId !== actorId) {
    throw new Error("Solo el organizador puede cancelar el partido");
  }
  if (partido.estado === "cancelado") throw new Error("El partido ya está cancelado");
  await prisma.partido.update({ where: { id: partidoId }, data: { estado: "cancelado" } });
}

export async function calificar(input: {
  emisorId: number;
  evaluadoId: number;
  partidoId: number;
  puntualidad: number;
  fairPlay: number;
}) {
  if (input.emisorId === input.evaluadoId) throw new Error("No podés calificarte a vos mismo");
  if (!notaValida(input.puntualidad) || !notaValida(input.fairPlay)) {
    throw new Error("Las notas van de 1 a 5");
  }

  const partido = await prisma.partido.findUnique({
    where: { id: input.partidoId },
    include: { inscripciones: true },
  });
  if (!partido) throw new Error("Partido no encontrado");
  const cerrado = partido.estado === "completo" || partido.fechaHora.getTime() < Date.now();
  if (!cerrado) throw new Error("Vas a poder calificar cuando el partido se cierre");
  const ids = new Set(partido.inscripciones.map((i) => i.jugadorId));
  if (!ids.has(input.emisorId) || !ids.has(input.evaluadoId)) {
    throw new Error("Solo se califican jugadores de este partido");
  }

  await prisma.calificacion.upsert({
    where: {
      emisorId_evaluadoId_partidoId: {
        emisorId: input.emisorId,
        evaluadoId: input.evaluadoId,
        partidoId: input.partidoId,
      },
    },
    update: { puntualidad: input.puntualidad, fairPlay: input.fairPlay },
    create: input,
  });
}

export async function denunciar(jugadorId: number, partidoId: number, texto: string) {
  const limpio = texto.trim();
  if (limpio.length < 8) throw new Error("Contá un poco más qué pasó");
  const inscripcion = await prisma.inscripcion.findUnique({
    where: { jugadorId_partidoId: { jugadorId, partidoId } },
  });
  if (!inscripcion) throw new Error("Tenés que estar anotado para denunciar");
  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) throw new Error("Partido no encontrado");
  if (partido.denuncia) throw new Error("Este partido ya tiene una denuncia");
  await prisma.partido.update({ where: { id: partidoId }, data: { denuncia: limpio.slice(0, 500) } });
}

function notaValida(n: number) {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export function esErrorConocido(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError;
}
