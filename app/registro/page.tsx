import Link from "next/link";
import { redirect } from "next/navigation";
import { registrar } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { POSICIONES } from "@/lib/formato";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Crear cuenta" };

export default async function RegistroPage() {
  const user = await getSessionUser();
  if (user) redirect("/inicio");
  const zonas = await prisma.zona.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div className="phone phone-top">
      <Link className="back" href="/">
        ← FaltaUno
      </Link>
      <h1>Crear cuenta</h1>
      <ActionForm action={registrar} className="stack">
        <label>
          Nombre
          <input name="nombre" required minLength={2} placeholder="Nombre y apellido" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" required minLength={6} autoComplete="new-password" />
        </label>
        <label>
          Posición
          <select name="posicion" defaultValue="Mediocampista">
            {POSICIONES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Zona habitual
          <select name="zonaId" defaultValue={zonas[0]?.id}>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}, {z.ciudad}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton>Crear cuenta</SubmitButton>
      </ActionForm>
    </div>
  );
}
