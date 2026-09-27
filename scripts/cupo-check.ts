import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { unirseAPartido } from "../lib/partidos";

/**
 * Dos jugadores intentan el último lugar al mismo tiempo.
 * Tiene que entrar uno solo y el partido quedar completo.
 */
async function main() {
  const hash = await hashPassword("demo123");
  const marca = Date.now();
  const zona = await prisma.zona.create({ data: { nombre: `Test Cupo ${marca}`, ciudad: "CABA" } });
  const cancha = await prisma.cancha.create({
    data: {
      nombre: "Cancha test",
      superficie: "Sintético",
      direccion: "Test 1",
      precioHora: 1000,
      activa: true,
      zonaId: zona.id,
    },
  });
  const org = await usuario("Org Cupo", `cupo-org-${marca}@test.local`, hash);
  const uno = await usuario("Uno", `cupo-u1-${marca}@test.local`, hash);
  const dos = await usuario("Dos", `cupo-u2-${marca}@test.local`, hash);

  const partido = await prisma.partido.create({
    data: {
      titulo: "Test de cupo",
      fechaHora: new Date(Date.now() + 60 * 60 * 1000),
      formato: "5v5",
      cupo: 2,
      nivel: "Mixto",
      costoJugador: 0,
      estado: "abierto",
      organizadorId: org.id,
      canchaId: cancha.id,
    },
  });
  const ladoA = await prisma.equipo.create({ data: { lado: "A", partidoId: partido.id } });
  await prisma.equipo.create({ data: { lado: "B", partidoId: partido.id } });
  await prisma.inscripcion.create({
    data: { jugadorId: org.id, partidoId: partido.id, equipoId: ladoA.id },
  });

  try {
    const results = await Promise.allSettled([
      unirseAPartido(uno.id, partido.id),
      unirseAPartido(dos.id, partido.id),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const mal = results.filter((r) => r.status === "rejected").length;
    const fresh = await prisma.partido.findUnique({
      where: { id: partido.id },
      include: { inscripciones: true },
    });
    const paso = ok === 1 && mal === 1 && fresh?.inscripciones.length === 2 && fresh.estado === "completo";
    if (!paso) {
      console.error("FALLO: el cupo no se reservó de a uno.");
      console.dir(results, { depth: 5 });
      process.exitCode = 1;
      return;
    }
    console.log("OK: el último cupo lo ocupó un solo jugador y el partido quedó completo.");
  } finally {
    await prisma.inscripcion.deleteMany({ where: { partidoId: partido.id } });
    await prisma.equipo.deleteMany({ where: { partidoId: partido.id } });
    await prisma.partido.delete({ where: { id: partido.id } });
    await prisma.cancha.delete({ where: { id: cancha.id } });
    await prisma.zona.delete({ where: { id: zona.id } });
    await prisma.usuario.deleteMany({ where: { id: { in: [org.id, uno.id, dos.id] } } });
  }
}

function usuario(nombre: string, email: string, passwordHash: string) {
  return prisma.usuario.create({
    data: { nombre, email, passwordHash, rol: "jugador" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
