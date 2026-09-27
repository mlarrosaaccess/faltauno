import Link from "next/link";
import { guardarPerfil, logout } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { etiquetaCuando } from "@/lib/fecha";
import { POSICIONES, iniciales, ratingDe, textoRating } from "@/lib/formato";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const user = await requireUser();
  const [zonas, agg, total, partidos] = await Promise.all([
    prisma.zona.findMany({ orderBy: { nombre: "asc" } }),
    prisma.calificacion.aggregate({
      where: { evaluadoId: user.id },
      _avg: { puntualidad: true, fairPlay: true },
      _count: true,
    }),
    prisma.inscripcion.count({ where: { jugadorId: user.id } }),
    prisma.inscripcion.findMany({
      where: { jugadorId: user.id },
      include: { partido: { include: { cancha: true } } },
      orderBy: { partido: { fechaHora: "desc" } },
      take: 8,
    }),
  ]);
  const nota = ratingDe(agg._avg.puntualidad, agg._avg.fairPlay);

  return (
    <>
      <header className="top">
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 20 }}>
          {iniciales(user.nombre)}
        </div>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>{user.nombre}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {user.posicion ?? "Jugador"} · rating {textoRating(nota)} · {total}{" "}
            {total === 1 ? "partido" : "partidos"}
          </p>
        </div>
      </header>

      <ActionForm action={guardarPerfil} className="stack">
        {user.rol === "jugador" && (
          <label>
            Posición preferida
            <select name="posicion" defaultValue={user.posicion ?? "Mediocampista"}>
              {POSICIONES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Zona habitual
          <select name="zonaId" defaultValue={user.zonaHabitualId ?? ""}>
            <option value="">Sin zona</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}, {z.ciudad}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" name="avisoFaltaUno" defaultChecked={user.avisoFaltaUno} />
          Avisos si falta uno
        </label>
        <label className="check">
          <input type="checkbox" name="avisoCompleto" defaultChecked={user.avisoCompleto} />
          Partido completo
        </label>
        <label className="check">
          <input type="checkbox" name="mostrarZona" defaultChecked={user.mostrarZona} />
          Mostrar mi zona habitual
        </label>
        <p className="note">Si apagás la zona, tu barrio no aparece junto a tu nombre en el partido.</p>
        <SubmitButton>Guardar</SubmitButton>
      </ActionForm>

      <h2 style={{ marginTop: 22 }}>Mis partidos</h2>
      <div className="list">
        {partidos.length === 0 && <p className="muted">Todavía no te sumaste a ninguno.</p>}
        {partidos.map((ins) => (
          <Link key={ins.id} className="card" href={`/partidos/${ins.partido.id}`}>
            <strong>{ins.partido.titulo}</strong>
            <span className="muted">
              {etiquetaCuando(ins.partido.fechaHora)} · {ins.partido.estado}
              {ins.partido.estado === "completo" ? " · calificar" : ""}
            </span>
          </Link>
        ))}
      </div>

      <form action={logout} style={{ marginTop: 18 }}>
        <button className="btn btn-ghost" type="submit">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
