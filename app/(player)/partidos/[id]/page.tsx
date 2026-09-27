import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelar, enviarCalificacion, enviarDenuncia, salir } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { UnirseButton } from "@/components/UnirseButton";
import { etiquetaCuando } from "@/lib/fecha";
import { iniciales, pesos, ratingDe, textoRating } from "@/lib/formato";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Partido" };

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id)) notFound();

  const partido = await prisma.partido.findUnique({
    where: { id },
    include: {
      cancha: { include: { zona: true } },
      organizador: true,
      equipos: {
        orderBy: { lado: "asc" },
        include: {
          inscripciones: {
            include: { jugador: { include: { zonaHabitual: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!partido) notFound();

  const jugadores = partido.equipos.flatMap((e) => e.inscripciones.map((i) => i.jugador));
  const promedios = await prisma.calificacion.groupBy({
    by: ["evaluadoId"],
    where: { evaluadoId: { in: jugadores.map((j) => j.id) } },
    _avg: { puntualidad: true, fairPlay: true },
  });
  const rating = new Map(
    promedios.map((p) => [p.evaluadoId, ratingDe(p._avg.puntualidad, p._avg.fairPlay)]),
  );

  const mio = jugadores.some((j) => j.id === user.id);
  const porLado = partido.cupo / 2;
  const pasado = partido.fechaHora.getTime() < Date.now();
  const puedeCalificar = mio && (partido.estado === "completo" || pasado) && partido.estado !== "cancelado";
  const companeros = jugadores.filter((j) => j.id !== user.id);

  return (
    <>
      <p>
        <Link className="back" href="/inicio">
          ← Partidos cerca
        </Link>
      </p>
      <header className="detail-head">
        <h1 style={{ fontSize: 32 }}>{partido.titulo}</h1>
        <p className="lead">
          {partido.cancha.zona.nombre} · {etiquetaCuando(partido.fechaHora)}
        </p>
      </header>

      <section className="card">
        <p className="eyebrow">Cancha</p>
        <strong>
          {partido.cancha.superficie} · {partido.cancha.direccion}
        </strong>
        <p className="muted">
          Nivel {partido.nivel.toLowerCase()} · {pesos(partido.costoJugador)} por jugador
        </p>
        {!partido.cancha.activa && <p className="msg msg-error">Esta cancha está dada de baja.</p>}
        {partido.estado === "cancelado" && <p className="msg msg-error">Partido cancelado.</p>}
        {partido.estado === "completo" && <p className="msg msg-ok">Partido completo. Los dos lados están armados.</p>}
      </section>

      <div className="lados">
        {partido.equipos.map((equipo) => (
          <section className="lado" key={equipo.id}>
            <h3>Lado {equipo.lado}</h3>
            <div className="slots">
              {equipo.inscripciones.map((ins) => {
                const nota = rating.get(ins.jugador.id) ?? null;
                return (
                  <div className="slot-wrap" key={ins.id}>
                    <div className={ins.jugador.id === user.id ? "slot me" : "slot"}>
                      {iniciales(ins.jugador.nombre)}
                    </div>
                    <span>{ins.jugador.nombre.split(" ")[0]}</span>
                    <small>{textoRating(nota)}</small>
                    {ins.jugador.mostrarZona && ins.jugador.zonaHabitual && (
                      <small>{ins.jugador.zonaHabitual.nombre}</small>
                    )}
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, porLado - equipo.inscripciones.length) }).map((_, i) => (
                <div className="slot-wrap" key={`v-${equipo.lado}-${i}`}>
                  <div className="slot empty">+</div>
                  <span className="muted">hueco</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {partido.estado === "abierto" && !mio && partido.cancha.activa && !pasado && (
        <UnirseButton partidoId={partido.id} full />
      )}

      {mio && partido.estado !== "cancelado" && !pasado && (
        <ActionForm action={salir} className="stack">
          <input type="hidden" name="partidoId" value={partido.id} />
          <SubmitButton className="btn btn-ghost">Salir del partido</SubmitButton>
        </ActionForm>
      )}

      {user.id === partido.organizadorId && partido.estado !== "cancelado" && (
        <ActionForm action={cancelar} className="stack" >
          <input type="hidden" name="partidoId" value={partido.id} />
          <SubmitButton className="btn btn-danger">Cancelar partido</SubmitButton>
        </ActionForm>
      )}

      {puedeCalificar && companeros.length > 0 && (
        <section className="stack" id="calificar" style={{ marginTop: 18 }}>
          <h2>Después del partido</h2>
          <p className="muted">Puntualidad y fair play, de 1 a 5. Es la reputación entre desconocidos.</p>
          <ActionForm action={enviarCalificacion} className="stack">
            <input type="hidden" name="partidoId" value={partido.id} />
            <label>
              Jugador
              <select name="evaluadoId" required>
                {companeros.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Puntualidad
              <select name="puntualidad" defaultValue={5}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fair play
              <select name="fairPlay" defaultValue={5}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton>Enviar calificación</SubmitButton>
          </ActionForm>
        </section>
      )}

      {mio && !partido.denuncia && partido.estado !== "cancelado" && (
        <section className="stack" style={{ marginTop: 18 }}>
          <h2>Denunciar</h2>
          <ActionForm action={enviarDenuncia} className="stack">
            <input type="hidden" name="partidoId" value={partido.id} />
            <label>
              Qué pasó
              <textarea name="texto" placeholder="No se presentó gente, agresión, etc." required />
            </label>
            <SubmitButton className="btn btn-ghost">Enviar denuncia</SubmitButton>
          </ActionForm>
        </section>
      )}
      {partido.denuncia && <p className="muted">Este partido ya fue denunciado y está en moderación.</p>}
    </>
  );
}
