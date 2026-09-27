import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user?.rol === "admin") redirect("/admin");
  if (user) redirect("/inicio");

  return (
    <div className="phone phone-top">
      <p className="eyebrow">Fútbol amateur</p>
      <div className="grow">
        <h1>FaltaUno</h1>
        <p className="subtitle">Armá el partido. El equipo aparece.</p>
        <p className="lead">No hace falta juntar a los 10 de siempre.</p>
        <p className="lead">Publicá zona y horario: la gente de la app se suma.</p>
      </div>
      <div className="stack">
        <Link className="btn btn-primary" href="/registro">
          Crear cuenta
        </Link>
        <Link className="btn btn-secondary" href="/login">
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  );
}
