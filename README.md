# FaltaUno

App para armar partidos de fútbol amateur. Publicás cancha, horario y formato; el resto se suma hasta completar el cupo. El sistema reparte lado A y lado B.

Está hecha con Next.js y PostgreSQL.

## Correrlo

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

| Rol | Email | Contraseña |
| --- | --- | --- |
| Jugador | mateo@faltauno.local | demo123 |
| Canchas | admin@faltauno.local | admin123 |

La primera vez crea la base en `.pgdata`. Los datos quedan ahí.

Para volver a cargar los partidos: `npm run db:reset`

## Qué se puede hacer

- Crear cuenta, ver partidos por zona, formato y día, y sumarse.
- Publicar un partido. El organizador entra en el lado A.
- Ver los lugares del lado A y del lado B. Al llenarse, el partido queda completo.
- Calificar puntualidad y fair play cuando el partido terminó.
- Perfil: posición, zona y avisos.
- Canchas: prender o apagar una cancha, dar de alta, bajar un partido y suspender al organizador si hay una denuncia.

## Deploy en Vercel

1. Creá un proyecto en [Neon](https://neon.tech) y copiá el connection string.
2. Importá este repo en Vercel. El build corre las migraciones y carga los datos la primera vez (`vercel.json`).
3. Variables de entorno:
   - `DATABASE_URL`: el connection string de Neon.
   - `AUTH_SECRET`: un texto aleatorio de 32 caracteres o más.
4. Deploy.
