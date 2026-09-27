import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { UnirseButton } from "@/components/UnirseButton";
import { inicioHoyAR, esHoyAR, etiquetaCuando } from "@/lib/fecha";
import { iniciales, pesos } from "@/lib/formato";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Partidos cerca" };

type Busqueda = {
  q?: string;
  formato?: string;
  cuando?: string;
  cerca?: string;
  focus?: string;
};

export default async function InicioPage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const formatos = ["5v5", "7v7", "11v11"];
  const formato = formatos.includes(sp.formato ?? "") ? sp.formato : undefined;

  const partidos = await prisma.partido.findMany({
    where: {
      estado: { in: ["abierto", "completo"] },
      fechaHora: { gte: inicioHoyAR() },
      cancha: {
        activa: true,
        ...(sp.cerca === "1" && user.zonaHabitualId ? { zonaId: user.zonaHabitualId } : {}),
      },
      ...(formato ? { formato } : {}),
      ...(sp.cuando === "hoy" ? { fechaHora: { gte: inicioHoyAR() } } : {}),
      ...(q
        ? {
            OR: [
              { titulo: { contains: q, mode: "insensitive" } },
              { cancha: { nombre: { contains: q, mode: "insensitive" } } },
              { cancha: { zona: { nombre: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: {
      cancha: { include: { zona: true } },
      inscripciones: { where: { jugadorId: user.id }, select: { id: true } },
      _count: { select: { inscripciones: true } },
    },
    orderBy: { fechaHora: "asc" },
  });

  const hoy = partidos.filter((p) => (sp.cuando === "hoy" ? esHoyAR(p.fechaHora) : true));

  const mios = await prisma.inscripcion.findMany({
    where: {
      jugadorId: user.id,
      partido: { fechaHora: { gte: inicioHoyAR() }, estado: { in: ["abierto", "completo"] }, cancha: { activa: true } },
    },
    include: { partido: { include: { _count: { select: { inscripciones: true } } } } },
  });

  const zona = user.mostrarZona && user.zonaHabitual ? `${user.zonaHabitual.nombre}, ${user.zonaHabitual.ciudad}` : "Tu zona";

  return (
    <>
      <header className="top">
        <div>
          <p className="eyebrow">Zona</p>
          <Link className="zone" href={href(sp, { cerca: sp.cerca === "1" ? undefined : "1" })}>
            {zona}
          </Link>
        </div>
        <Link className="avatar" href="/perfil" aria-label="Perfil">
          {iniciales(user.nombre)}
        </Link>
      </header>

      <form className="search" action="/inicio">
        {formato && <input type="hidden" name="formato" value={formato} />}
        {sp.cuando && <input type="hidden" name="cuando" value={sp.cuando} />}
        {sp.cerca && <input type="hidden" name="cerca" value={sp.cerca} />}
        <input
          id="buscar"
          name="q"
          defaultValue={q}
          placeholder="Buscar partido cerca"
          autoFocus={sp.focus === "buscar"}
        />
      </form>

      <div className="chips">
        <Chip sp={sp} k="cuando" v="hoy" label="Hoy" />
        <Chip sp={sp} k="formato" v="5v5" label="5v5" />
        <Chip sp={sp} k="formato" v="7v7" label="7v7" />
        <Chip sp={sp} k="formato" v="11v11" label="11v11" />
        <Chip sp={sp} k="cerca" v="1" label="Cerca" />
      </div>

      {user.avisoFaltaUno &&
        mios
          .filter((m) => m.partido.estado === "abierto" && m.partido.cupo - m.partido._count.inscripciones === 1)
          .map((m) => (
            <p className="banner urgent" key={m.id}>
              Falta uno en {m.partido.titulo}. <Link href={`/partidos/${m.partido.id}`}>Ver partido</Link>
            </p>
          ))}
      {user.avisoCompleto &&
        mios
          .filter((m) => m.partido.estado === "completo")
          .map((m) => (
            <p className="banner" key={`c-${m.id}`}>
              {m.partido.titulo} está completo. <Link href={`/partidos/${m.partido.id}`}>Ver lados</Link>
            </p>
          ))}

      <div className="list">
        {hoy.length === 0 && <p className="muted">No hay partidos con esos filtros.</p>}
        {hoy.map((p) => {
          const ocupados = p._count.inscripciones;
          const faltan = p.cupo - ocupados;
          const pct = Math.min(100, Math.round((ocupados / p.cupo) * 100));
          const anotado = p.inscripciones.length > 0;
          return (
            <article className="card" key={p.id}>
              <Link className="card-main" href={`/partidos/${p.id}`}>
                <div className="card-top">
                  <h2>{p.titulo}</h2>
                  {p.estado === "completo" ? (
                    <span className="chip">Completo</span>
                  ) : faltan === 1 ? (
                    <span className="chip chip-urgent">Falta 1</span>
                  ) : null}
                </div>
                <p className="muted">
                  {etiquetaCuando(p.fechaHora)} · {p.cancha.superficie} · {pesos(p.costoJugador)}
                </p>
                <div className={faltan === 1 ? "bar urgent" : "bar"}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <p className="muted">
                  {ocupados}/{p.cupo} jugadores
                  {faltan > 1 ? ` · Faltan ${faltan}` : ""}
                </p>
              </Link>
              {anotado ? (
                <Link className="btn btn-small" href={`/partidos/${p.id}`} style={{ background: "transparent", color: "var(--lime)", border: "1px solid var(--lime)" }}>
                  Anotado
                </Link>
              ) : p.estado === "completo" ? (
                <span className="btn btn-small is-disabled">Completo</span>
              ) : (
                <UnirseButton partidoId={p.id} />
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function Chip({ sp, k, v, label }: { sp: Busqueda; k: keyof Busqueda; v: string; label: string }) {
  const on = sp[k] === v;
  return (
    <Link className={on ? "chip on" : "chip"} href={href(sp, { [k]: on ? undefined : v })}>
      {label}
    </Link>
  );
}

function href(sp: Busqueda, patch: Partial<Busqueda>) {
  const next = { ...sp, focus: undefined, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/inicio?${qs}` : "/inicio";
}
