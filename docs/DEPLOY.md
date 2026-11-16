# Despliegue de UTN Match

El sistema se publica en tres servicios gratuitos. Cada uno cumple una función distinta:

| Parte | Servicio | Carpeta | Qué hace |
|-------|----------|---------|----------|
| Base de datos | Supabase (PostgreSQL) | `backend/database/` | Guarda los datos. |
| API | Render (servicio web) | `backend/` | Corre NestJS y expone `/api`. |
| Aplicación web | Vercel | `frontend/` | Corre Next.js. |

El orden importa: la API necesita la base de datos y la aplicación web necesita la dirección de la API. La API, a su vez, necesita saber la dirección de la aplicación web para el CORS, por eso la última variable se completa al final.

Este documento describe el procedimiento. Las direcciones de producción se anotan en la sección 6 cuando el despliegue se hace.

## 1. Base de datos en Supabase

1. Crear un proyecto en Supabase. Usamos el nombre `utn-match` y la región East US (North Virginia), la más cercana a las regiones de Render.
2. Guardar la contraseña de la base de datos que se define al crear el proyecto; Supabase no la vuelve a mostrar.
3. Abrir Connect y copiar la cadena de conexión del Session pooler (puerto 5432). Render solo tiene salida IPv4, y la conexión directa de Supabase es IPv6 en el plan gratuito, por eso hay que usar el pooler.
4. Reemplazar `[YOUR-PASSWORD]` por la contraseña del paso 2. Esa cadena es el valor de `DATABASE_URL`.

No hace falta cargar tablas a mano. En el primer arranque, con `DB_AUTO_INIT=true`, el backend aplica `schema.sql` y `seed.sql` si la base está vacía, y después calcula las compatibilidades iniciales. Si la base ya tiene tablas no toca nada.

## 2. API en Render

1. Crear una cuenta en Render y conectar el repositorio de GitHub.
2. Elegir New, Blueprint y seleccionar el repositorio. Render lee `render.yaml` de la raíz y propone el servicio `utn-match-api` (región Virginia, plan gratuito, carpeta `backend`).
3. Cuando lo pida, completar las dos variables que no tienen valor en el archivo:
   - `DATABASE_URL`: la cadena del paso 1.
   - `FRONTEND_URL`: por ahora cualquier dirección válida (por ejemplo `http://localhost:3000`); se corrige en la sección 4.
4. `JWT_SECRET` lo genera Render. No hay que escribirlo en ningún archivo.
5. Esperar a que el despliegue termine y abrir `https://<servicio>.onrender.com/api/health`. Debe responder 200.

Las variables restantes, con su significado, están en `backend/.env.example`.

Emails de las notificaciones (RF-08): el archivo deja `EMAIL_TRANSPORT=log`, que escribe cada email en el log del servicio (se ve en la pestaña Logs de Render). Para enviarlos de verdad hay que cambiarlo a `smtp` y agregar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y `EMAIL_FROM` con los datos de un servidor SMTP. Los enlaces de los emails apuntan a `FRONTEND_URL`. Si el servidor SMTP falla, la notificación igual queda guardada en la plataforma.

Limitación del plan gratuito de Render: desde septiembre de 2025 bloquea la salida a los puertos SMTP 25, 465 y 587, así que Gmail y la mayoría de los servidores en esos puertos no funcionan desde ahí. Hay dos caminos: usar un proveedor que también acepte el puerto 2525 (por ejemplo Brevo; confirmar el puerto en su documentación) con `SMTP_PORT=2525` y `SMTP_SECURE=false`, o pasar el servicio a un plan pago. En local no hay ninguna restricción.

Limitación del plan gratuito: el servicio se duerme después de 15 minutos sin tráfico y el primer pedido siguiente tarda cerca de un minuto en responder. Conviene abrir la API unos minutos antes de una demostración.

## 3. Aplicación web en Vercel

1. Importar el mismo repositorio en Vercel.
2. Definir Root Directory como `frontend`. Vercel detecta Next.js y usa sus comandos por defecto.
3. Agregar la variable de entorno `NEXT_PUBLIC_API_URL` con la dirección de la API terminada en `/api`, por ejemplo `https://<servicio>.onrender.com/api`.
4. Desplegar. La dirección que Vercel asigna es la de la aplicación.

`NEXT_PUBLIC_API_URL` se incorpora al compilar, así que si cambia hay que volver a desplegar.

## 4. Cerrar el circuito

Volver a Render, editar `FRONTEND_URL` con la dirección de Vercel (sin barra final) y guardar; el servicio se reinicia. Sin este paso el navegador bloquea los pedidos de la aplicación a la API por CORS.

## 5. Verificación posterior

- `GET /api/health` responde 200 y el cuerpo indica que la base está disponible.
- Iniciar sesión desde la aplicación web con un usuario del seed.
- Abrir Recomendaciones con un estudiante del seed: deben aparecer proyectos con su puntaje.

Una vez que la base tiene datos, volver a Render y cambiar `DB_AUTO_INIT` a `false`. Con la base ya cargada no hace nada, pero así un reinicio sobre una base vacía por error no vuelve a sembrar usuarios con contraseña pública.

Los usuarios del seed usan todos la contraseña `UtnMatch2026!` (está en el README). Son datos de demostración y la contraseña es pública: si el sitio se deja publicado más allá de la defensa, hay que cambiar las contraseñas o vaciar y recargar la base sin el seed.

## 6. Direcciones de producción

Todavía no se desplegó. Cuando se haga se completa esta tabla.

| Parte | Dirección |
|-------|-----------|
| Aplicación web | pendiente |
| API | pendiente |
| Supabase | pendiente |

## Notas de operación

- Supabase pausa los proyectos gratuitos después de una semana sin actividad. Si pasó ese tiempo, reactivar el proyecto desde su panel antes de probar.
- Para reiniciar los datos de una base remota: `npm run db:reset -- --confirmar` desde `backend/`, con `DATABASE_URL` definida. Borra todo, así que solo se usa a propósito.
- Para correr todo en local no se necesita nada de esto: sin `DATABASE_URL` el backend usa una base embebida (PGlite). Ver `backend/README.md`.
