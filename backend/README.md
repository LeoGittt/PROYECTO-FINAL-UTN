# Backend de UTN Match

API REST de UTN Match, hecha con NestJS como **monolito modular**. Las instrucciones generales del proyecto están en el [README principal](../README.md); el contrato de la API, en [docs/api/CONTRATO.md](../docs/api/CONTRATO.md); la arquitectura, en [docs/entrega-2/ARQUITECTURA.md](../docs/entrega-2/ARQUITECTURA.md).

## Puesta en marcha

```bash
npm install
npm run start:dev      # API en http://localhost:3001/api, con recarga
```

No hace falta instalar PostgreSQL ni crear un `.env`: sin `DATABASE_URL` el backend usa **PGlite** (PostgreSQL embebido), guarda los datos en `backend/.data/pglite` y, en el primer arranque, aplica `database/schema.sql` y `database/seed.sql`. Todos los usuarios del seed tienen la contraseña `UtnMatch2026!` (por ejemplo `admin@utnmatch.test`).

Para usar PostgreSQL o Supabase, copiar `.env.example` como `.env` y completar `DATABASE_URL` (y `DATABASE_SSL=true` si el servidor exige SSL). En producción `JWT_SECRET` es obligatorio y `DB_AUTO_INIT` viene apagado: el esquema se carga una vez a mano.

| Comando | Qué hace |
|---|---|
| `npm run start:dev` / `npm run start:prod` | Arranca la API (desarrollo con recarga / compilada en `dist/`) |
| `npm run build` | Compila a `dist/` |
| `npm run db:reset` | Borra los objetos de UTN Match y recarga esquema y seed. Con `DATABASE_URL` pide `-- --confirmar` |
| `npm run lint` / `npm run typecheck` | oxlint / tipos de TypeScript |
| `npm test` | Pruebas unitarias (vitest) |
| `npm run test:e2e` | Pruebas de punta a punta (supertest, base PGlite en memoria con el esquema y el seed reales) |

`GET /api/health` responde `{ "estado": "ok", "baseDeDatos": "ok" }` (503 si la base no contesta).

## Estructura

Cada módulo es una carpeta de `src/` y tiene las mismas capas. Las dependencias van de afuera hacia adentro; **`dominio/` es TypeScript puro** (no importa NestJS ni la base de datos).

```
src/
  compartido/                 errores, paginación, seguridad y eventos (dominio) + configuración,
                              base de datos, filtro de errores, validación y guard (infraestructura)
  administracion/catalogos/   M5: carreras, materias, tecnologías y habilidades
  perfiles/                   M1: cuentas, sesión y perfiles de estudiante, empresa y docente
  app.module.ts               arma los módulos
  configurar-aplicacion.ts    prefijo /api, helmet y CORS (lo usan main.ts y las pruebas)
  <modulo>/
    dominio/                  reglas y puertos (interfaces)
    aplicacion/               servicios: los casos de uso y la API que ven los otros módulos
    infraestructura/          repositorios SQL y adaptadores (bcrypt, JWT...)
    presentacion/             controladores y esquemas de validación
```

Reglas que mantienen el monolito ordenado:

- **Un módulo no lee las tablas de otro.** Se habla con su servicio exportado (`CatalogosService`, `PerfilesService`) o con eventos.
- **Los servicios devuelven DTO**, nunca filas de la base ni el hash de la contraseña.
- **SQL siempre parametrizado** (`$1`, `ANY($1::bigint[])`, `unnest`). Nunca se arma con texto concatenado.
- **`Db`** (`compartido/infraestructura/db`) es la única puerta a la base: `query`, `transaction` y `ejecutarScript`. Devuelve las columnas en camelCase y los `bigint`/`numeric` como `number`, con PGlite y con `pg`. Para que el trigger del historial de postulaciones sepa quién hizo el cambio, usar `fijarUsuarioResponsable(tx, idUsuario)` dentro de la transacción.

### Seguridad

- **Autenticación**: JWT HS256 (`sub` = idUsuario como texto, `rol`; vence a las 12 h). El guard global (`GuardAcceso`) exige sesión en todo endpoint salvo los marcados con `@Public()`, y chequea `@Roles('empresa', ...)`. El rol que vale es el de la base, y un usuario desactivado pierde la sesión al instante. El usuario actual se obtiene con `@UsuarioActual()`.
- **Validación**: cada endpoint valida su entrada con un esquema de zod (`crearDto(esquema)` para cuerpos y consultas, `ParseIdPipe` para ids). Los mensajes salen en español con `details` por campo (400).
- **Errores**: los servicios lanzan `ErrorValidacion`, `ErrorNoEncontrado`, `ErrorConflicto`, `ErrorReglaNegocio`, etc. (`compartido/dominio/errores.ts`); el filtro global los traduce al formato del contrato. Un error inesperado responde 500 genérico y el detalle queda solo en el log.
- Contraseñas con bcrypt (política: 8 caracteres o más, una letra y un número, hasta 72 bytes), `helmet`, CORS limitado a `FRONTEND_URL` y límite de pedidos por IP en `/api/auth/*` (`RATE_LIMIT_AUTH_*`; por endpoint).

### Eventos

Los servicios publican a través del puerto `PublicadorEventos` (`compartido/dominio/eventos.ts`); la implementación usa `@nestjs/event-emitter`. El publicador **espera a los listeners**, y un listener que falla se registra sin afectar a quien publicó. Hoy M1 emite `perfil.actualizado` (`{ idUsuario, rol, idEstudiante }`). Para sumar un evento, agregarlo a `EventosDominio` y escuchar con `@OnEvent('<nombre>')` en la infraestructura del módulo que reacciona.

### Cómo sumar un módulo

1. Crear `src/<carpeta>/` con las cuatro capas y un `<modulo>.module.ts` que importe `DatabaseModule` y exporte el servicio.
2. Registrar el módulo en `app.module.ts`.
3. Depender de otros módulos solo por sus servicios (`PerfilesService`, `CatalogosService`) y declarar los eventos nuevos en `EventosDominio`.
4. M3 (postulaciones) tiene que registrar en `PerfilesService.registrarFuenteVisibilidadContacto(...)` cómo saber si un publicador tiene una postulación o invitación del estudiante: de eso depende que `GET /estudiantes/:id` muestre el email.

## Pruebas

- **Unitarias** (`*.spec.ts`, junto al código): lo puro (reglas de perfil, política de contraseñas, paginación, validación, filtro de errores, guard) y la capa `Db` sobre PGlite con el esquema real.
- **De punta a punta** (`test/*.e2e-spec.ts`): arrancan la aplicación real con `supertest` y PGlite en memoria con `schema.sql` y `seed.sql`; no usan puertos fijos ni dependen de variables de entorno. Cada archivo arranca su propia base, así que son independientes y rápidos. `app-sobre-pg` y `db-pg` ejercitan el adaptador `pg` (el de producción) contra un servidor que habla el protocolo de PostgreSQL (PGlite detrás de un socket); no reemplazan una prueba contra un PostgreSQL real.
- Los ayudantes están en `test/ayudantes/` (`crearAppDePrueba`, `iniciarSesion`, `registrarUsuario`, los usuarios del seed).
