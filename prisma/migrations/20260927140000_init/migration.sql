-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Zona" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,

    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cancha" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "superficie" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "precioHora" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "zonaId" INTEGER NOT NULL,

    CONSTRAINT "Cancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'jugador',
    "posicion" TEXT,
    "avisoFaltaUno" BOOLEAN NOT NULL DEFAULT true,
    "avisoCompleto" BOOLEAN NOT NULL DEFAULT true,
    "mostrarZona" BOOLEAN NOT NULL DEFAULT true,
    "suspendido" BOOLEAN NOT NULL DEFAULT false,
    "zonaHabitualId" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partido" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "formato" TEXT NOT NULL,
    "cupo" INTEGER NOT NULL,
    "nivel" TEXT NOT NULL,
    "costoJugador" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "denuncia" TEXT,
    "organizadorId" INTEGER NOT NULL,
    "canchaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipo" (
    "id" SERIAL NOT NULL,
    "lado" TEXT NOT NULL,
    "partidoId" INTEGER NOT NULL,

    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" SERIAL NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "partidoId" INTEGER NOT NULL,
    "equipoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id" SERIAL NOT NULL,
    "puntualidad" INTEGER NOT NULL,
    "fairPlay" INTEGER NOT NULL,
    "emisorId" INTEGER NOT NULL,
    "evaluadoId" INTEGER NOT NULL,
    "partidoId" INTEGER NOT NULL,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Partido_fechaHora_idx" ON "Partido"("fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "Equipo_partidoId_lado_key" ON "Equipo"("partidoId", "lado");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_jugadorId_partidoId_key" ON "Inscripcion"("jugadorId", "partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Calificacion_emisorId_evaluadoId_partidoId_key" ON "Calificacion"("emisorId", "evaluadoId", "partidoId");

-- AddForeignKey
ALTER TABLE "Cancha" ADD CONSTRAINT "Cancha_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_zonaHabitualId_fkey" FOREIGN KEY ("zonaHabitualId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_organizadorId_fkey" FOREIGN KEY ("organizadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_canchaId_fkey" FOREIGN KEY ("canchaId") REFERENCES "Cancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_evaluadoId_fkey" FOREIGN KEY ("evaluadoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
