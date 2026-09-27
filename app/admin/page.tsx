import { altaCancha, logout, suspenderUsuario, toggleCancha, cancelar } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { etiquetaCuando } from "@/lib/fecha";
import { SUPERFICIES, pesos } from "@/lib/formato";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Canchas" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [zonas, canchas, partidos] = await Promise.all([
    prisma.zona.findMany({ orderBy: { nombre: "asc" } }),
    prisma.cancha.findMany({ include: { zona: true }, orderBy: [{ zonaId: "asc" }, { nombre: "asc" }] }),
    prisma.partido.findMany({
      where: { estado: { not: "cancelado" } },
      include: {
        cancha: { include: { zona: true } },
        organizador: true,
        _count: { select: { inscripciones: true } },
      },
      orderBy: { fechaHora: "asc" },
      take: 30,
    }),
  ]);

  return (
    <div className="admin">
      <header className="admin-bar">
        <div>
          <p className="eyebrow">FaltaUno</p>
          <h1>Canchas</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>{admin.nombre}</span>
          <form action={logout}>
            <button type="submit">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="admin-main">
        <h2>Canchas</h2>
        <p>Las canchas apagadas no aparecen cuando alguien arma un partido.</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Cancha</th>
                <th>Zona</th>
                <th>Superficie</th>
                <th>Precio/hora</th>
                <th>Activa</th>
              </tr>
            </thead>
            <tbody>
              {canchas.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.zona.nombre}</td>
                  <td>{c.superficie}</td>
                  <td>{pesos(c.precioHora)}</td>
                  <td>
                    <form action={toggleCancha}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className={c.activa ? "switch on" : "switch"} type="submit">
                        {c.activa ? "ON" : "OFF"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ marginTop: 28 }}>Alta de cancha</h2>
        <ActionForm action={altaCancha} className="admin-form">
          <label>
            Nombre
            <input name="nombre" required />
          </label>
          <label>
            Zona
            <select name="zonaId">
              {zonas.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Superficie
            <select name="superficie">
              {SUPERFICIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Dirección
            <input name="direccion" required />
          </label>
          <label>
            Precio/hora
            <input name="precioHora" type="number" min={0} step={1000} required defaultValue={20000} />
          </label>
          <SubmitButton className="btn btn-primary">Dar de alta</SubmitButton>
        </ActionForm>

        <h2>Partidos a moderar</h2>
        {partidos.map((p) => (
          <article className="panel" key={p.id}>
            <strong>{p.titulo}</strong>
            <p style={{ margin: "4px 0", color: "#3d5248" }}>
              {etiquetaCuando(p.fechaHora)} · {p.cancha.zona.nombre} · {p._count.inscripciones}/{p.cupo} · {p.estado}
              {" · "}
              organiza {p.organizador.nombre}
              {p.organizador.suspendido ? " (suspendido)" : ""}
            </p>
            {p.denuncia && <p style={{ margin: "4px 0" }}>Denuncia: {p.denuncia}</p>}
            <div className="row-actions">
              <ActionForm action={cancelar}>
                <input type="hidden" name="partidoId" value={p.id} />
                <SubmitButton className="btn btn-ghost">Dar de baja el partido</SubmitButton>
              </ActionForm>
              {!p.organizador.suspendido && (
                <form action={suspenderUsuario}>
                  <input type="hidden" name="id" value={p.organizadorId} />
                  <input type="hidden" name="partidoId" value={p.id} />
                  <button className="btn btn-danger" type="submit">
                    Suspender organizador
                  </button>
                </form>
              )}
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
