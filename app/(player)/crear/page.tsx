import { requireUser } from "@/lib/auth";
import { CrearForm } from "@/components/CrearForm";
import { hoyOAEstaHora, toDatetimeLocalAR } from "@/lib/fecha";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Crear partido" };

export default async function CrearPage() {
  const user = await requireUser();
  const zonas = await prisma.zona.findMany({
    orderBy: { nombre: "asc" },
    include: {
      canchas: {
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, superficie: true, precioHora: true },
      },
    },
  });
  const fechaDefault = toDatetimeLocalAR(hoyOAEstaHora(19, 30));

  return (
    <>
      <h1 style={{ fontSize: 32 }}>Crear partido</h1>
      {user.rol !== "jugador" ? (
        <p className="muted">Con esta cuenta se administran las canchas. Para publicar un partido, entrá como jugador.</p>
      ) : (
        <CrearForm zonas={zonas} fechaDefault={fechaDefault} />
      )}
    </>
  );
}
