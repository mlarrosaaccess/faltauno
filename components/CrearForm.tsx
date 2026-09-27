"use client";

import { useMemo, useState } from "react";
import { publicar } from "@/app/actions";
import { CUPOS, FORMATOS, NIVELES, type Formato } from "@/lib/formato";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

type Cancha = { id: number; nombre: string; superficie: string; precioHora: number };
type Zona = { id: number; nombre: string; ciudad: string; canchas: Cancha[] };

export function CrearForm({ zonas, fechaDefault }: { zonas: Zona[]; fechaDefault: string }) {
  const [zonaId, setZonaId] = useState(zonas[0]?.id ?? 0);
  const [formato, setFormato] = useState<Formato>("7v7");
  const canchas = useMemo(
    () => zonas.find((z) => z.id === zonaId)?.canchas ?? [],
    [zonas, zonaId],
  );
  const [canchaId, setCanchaId] = useState(canchas[0]?.id ?? 0);
  const canchaActiva = canchas.find((c) => c.id === canchaId) ?? canchas[0];
  const cupo = CUPOS[formato];
  const costoSugerido = canchaActiva ? Math.max(0, Math.round(canchaActiva.precioHora / cupo)) : 0;

  function onZona(id: number) {
    setZonaId(id);
    const siguientes = zonas.find((z) => z.id === id)?.canchas ?? [];
    setCanchaId(siguientes[0]?.id ?? 0);
  }

  return (
    <ActionForm action={publicar} className="stack">
      <p className="lead">Publicarlo no reserva el cupo de amigos: abre la convocatoria.</p>

      <label>
        Zona
        <select name="zonaId" value={zonaId} onChange={(e) => onZona(Number(e.target.value))}>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}, {z.ciudad}
            </option>
          ))}
        </select>
      </label>

      <label>
        Cancha
        <select
          name="canchaId"
          value={canchaActiva?.id ?? ""}
          onChange={(e) => setCanchaId(Number(e.target.value))}
        >
          {canchas.length === 0 && <option value="">No hay canchas activas</option>}
          {canchas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · {c.superficie}
            </option>
          ))}
        </select>
      </label>

      <label>
        Fecha y hora
        <input type="datetime-local" name="fecha" required defaultValue={fechaDefault} />
      </label>

      <fieldset className="formats">
        <legend>Formato</legend>
        <div className="format-row">
          {FORMATOS.map((f) => (
            <label key={f} className={formato === f ? "format on" : "format"}>
              <input
                type="radio"
                name="formato"
                value={f}
                checked={formato === f}
                onChange={() => setFormato(f)}
              />
              {f}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="muted">Cupo total: {cupo} jugadores, repartidos en lado A y lado B.</p>

      <label>
        Nivel
        <select name="nivel" defaultValue="Mixto">
          {NIVELES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>

      <label>
        Costo por jugador
        <input
          key={`${canchaActiva?.id ?? 0}-${formato}`}
          name="costo"
          type="number"
          min={0}
          step={100}
          defaultValue={costoSugerido}
          required
        />
      </label>

      <SubmitButton>Publicar partido</SubmitButton>
    </ActionForm>
  );
}
