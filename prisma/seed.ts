import { PrismaClient } from "@prisma/client";
import { hoyOAEstaHora, fechaAR, proximoSabado } from "../lib/fecha";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();
const reset = process.argv.includes("--reset");

async function vaciar() {
  await prisma.calificacion.deleteMany();
  await prisma.inscripcion.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.partido.deleteMany();
  await prisma.cancha.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.zona.deleteMany();
}

async function main() {
  if (reset) await vaciar();
  else if ((await prisma.usuario.count()) > 0) {
    console.log("La base ya tiene datos. Para recargarlos: npm run db:reset");
    return;
  }

  const demo = await hashPassword("demo123");
  const adminPass = await hashPassword("admin123");

  const palermo = await prisma.zona.create({ data: { nombre: "Palermo", ciudad: "CABA" } });
  const chacabuco = await prisma.zona.create({ data: { nombre: "Parque Chacabuco", ciudad: "CABA" } });
  const urquiza = await prisma.zona.create({ data: { nombre: "Villa Urquiza", ciudad: "CABA" } });

  const lasHeras = await prisma.cancha.create({
    data: {
      nombre: "Parque Las Heras",
      superficie: "Sintético",
      direccion: "Av. Las Heras 2200",
      precioHora: 28000,
      activa: true,
      zonaId: palermo.id,
    },
  });
  const nicaragua = await prisma.cancha.create({
    data: {
      nombre: "Nicaragua Fútbol 5",
      superficie: "Techada",
      direccion: "Nicaragua 4500",
      precioHora: 36000,
      activa: true,
      zonaId: palermo.id,
    },
  });
  await prisma.cancha.create({
    data: {
      nombre: "Chacabuco 11",
      superficie: "Césped",
      direccion: "Av. Asamblea 1500",
      precioHora: 18000,
      activa: false,
      zonaId: chacabuco.id,
    },
  });
  const farola = await prisma.cancha.create({
    data: {
      nombre: "La Farola",
      superficie: "Sintético",
      direccion: "Triunvirato 4700",
      precioHora: 24000,
      activa: true,
      zonaId: urquiza.id,
    },
  });

  const jugador = (nombre: string, email: string, posicion: string, zonaId: number) =>
    prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash: demo,
        posicion,
        rol: "jugador",
        zonaHabitualId: zonaId,
      },
    });

  await prisma.usuario.create({
    data: { nombre: "Admin Canchas", email: "admin@faltauno.local", passwordHash: adminPass, rol: "admin" },
  });

  const mateo = await jugador("Mateo", "mateo@faltauno.local", "Mediocampista", palermo.id);
  const lucia = await jugador("Lucía", "lucia@faltauno.local", "Defensora", palermo.id);
  const sofia = await jugador("Sofía", "sofia@faltauno.local", "Mediocampista", palermo.id);
  const martin = await jugador("Martín", "martin@faltauno.local", "Delantero", palermo.id);
  const joaquin = await jugador("Joaquín", "joaquin@faltauno.local", "Arquero", palermo.id);
  const nicolas = await jugador("Nicolás", "nicolas@faltauno.local", "Defensor", palermo.id);
  const agustin = await jugador("Agustín", "agustin@faltauno.local", "Mediocampista", palermo.id);
  const felipe = await jugador("Felipe", "felipe@faltauno.local", "Delantero", palermo.id);
  const tomas = await jugador("Tomás", "tomas@faltauno.local", "Mediocampista", palermo.id);
  const camila = await jugador("Camila", "camila@faltauno.local", "Delantera", palermo.id);
  const bruno = await jugador("Bruno", "bruno@faltauno.local", "Defensor", urquiza.id);
  const elena = await jugador("Elena", "elena@faltauno.local", "Mediocampista", urquiza.id);
  const diego = await jugador("Diego", "diego@faltauno.local", "Arquero", urquiza.id);

  await crearPartido({
    titulo: "Picado 7v7 - Parque Las Heras",
    fechaHora: hoyOAEstaHora(19, 30),
    formato: "7v7",
    cupo: 14,
    nivel: "Mixto",
    costoJugador: 4000,
    estado: "abierto",
    canchaId: lasHeras.id,
    organizadorId: lucia.id,
    ladoA: [lucia.id, sofia.id, martin.id, joaquin.id],
    ladoB: [nicolas.id, agustin.id, felipe.id, tomas.id],
  });

  await crearPartido({
    titulo: "Fútbol 5 - Nicaragua",
    fechaHora: hoyOAEstaHora(21, 0),
    formato: "5v5",
    cupo: 10,
    nivel: "Mixto",
    costoJugador: 5500,
    estado: "abierto",
    canchaId: nicaragua.id,
    organizadorId: camila.id,
    ladoA: [camila.id, lucia.id, sofia.id, martin.id, joaquin.id],
    ladoB: [nicolas.id, agustin.id, felipe.id, tomas.id],
  });

  await crearPartido({
    titulo: "11 vs 11 - La Farola",
    fechaHora: proximoSabado(10, 0),
    formato: "11v11",
    cupo: 22,
    nivel: "Principiante",
    costoJugador: 2000,
    estado: "abierto",
    canchaId: farola.id,
    organizadorId: bruno.id,
    ladoA: [bruno.id, elena.id],
    ladoB: [diego.id],
  });

  const cerrado = await crearPartido({
    titulo: "Fútbol 5 - Nicaragua",
    fechaHora: fechaAR(-1, 21, 0),
    formato: "5v5",
    cupo: 10,
    nivel: "Mixto",
    costoJugador: 5500,
    estado: "completo",
    canchaId: nicaragua.id,
    organizadorId: lucia.id,
    ladoA: [mateo.id, lucia.id, sofia.id, martin.id, joaquin.id],
    ladoB: [nicolas.id, camila.id, bruno.id, elena.id, diego.id],
  });

  await prisma.calificacion.createMany({
    data: [
      { emisorId: lucia.id, evaluadoId: mateo.id, partidoId: cerrado.id, puntualidad: 5, fairPlay: 5 },
      { emisorId: sofia.id, evaluadoId: mateo.id, partidoId: cerrado.id, puntualidad: 4, fairPlay: 4 },
      { emisorId: martin.id, evaluadoId: mateo.id, partidoId: cerrado.id, puntualidad: 5, fairPlay: 4 },
      { emisorId: nicolas.id, evaluadoId: mateo.id, partidoId: cerrado.id, puntualidad: 5, fairPlay: 5 },
    ],
  });

  console.log("Demo listo.");
  console.log("Jugador: mateo@faltauno.local / demo123");
  console.log("Admin:   admin@faltauno.local / admin123");
}

async function crearPartido(data: {
  titulo: string;
  fechaHora: Date;
  formato: string;
  cupo: number;
  nivel: string;
  costoJugador: number;
  estado: string;
  canchaId: number;
  organizadorId: number;
  ladoA: number[];
  ladoB: number[];
}) {
  const partido = await prisma.partido.create({
    data: {
      titulo: data.titulo,
      fechaHora: data.fechaHora,
      formato: data.formato,
      cupo: data.cupo,
      nivel: data.nivel,
      costoJugador: data.costoJugador,
      estado: data.estado,
      organizadorId: data.organizadorId,
      canchaId: data.canchaId,
    },
  });
  const ladoA = await prisma.equipo.create({ data: { lado: "A", partidoId: partido.id } });
  const ladoB = await prisma.equipo.create({ data: { lado: "B", partidoId: partido.id } });
  for (const jugadorId of data.ladoA) {
    await prisma.inscripcion.create({ data: { jugadorId, partidoId: partido.id, equipoId: ladoA.id } });
  }
  for (const jugadorId of data.ladoB) {
    await prisma.inscripcion.create({ data: { jugadorId, partidoId: partido.id, equipoId: ladoB.id } });
  }
  return partido;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
