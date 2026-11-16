# UTN Match: contrato de la API REST

Este documento es el contrato entre el backend (NestJS) y el frontend (Next.js). Está pensado para que ambos se construyan en paralelo y coincidan. Si una implementación necesita apartarse de lo que dice acá, **se corrige este documento en el mismo cambio**.

Los nombres de campos siguen el modelo de datos ([DER.md](../entrega-2/DER.md)), pasados a camelCase.

## 1. Convenciones

- Prefijo `/api`. Cuerpos y respuestas en JSON (UTF-8). Fechas en ISO 8601 con zona horaria. Los puntajes van de `0` a `1` (el frontend los muestra como porcentaje).
- Los identificadores son números (el backend convierte los `BIGINT` de PostgreSQL a `number`).
- Autenticación: `Authorization: Bearer <jwt>`. El JWT (HS256) lleva `sub` (el idUsuario, **como texto**, según el estándar JWT) y `rol`. Vence a las 12 horas. El servidor no confía en el `rol` del token: usa el actual de la base, y un usuario desactivado pierde la sesión de inmediato (401).
- Roles: `estudiante`, `empresa`, `docente`, `administrador`. "Publicador" es `empresa` o `docente`.
- Errores: `{ "statusCode": 400, "error": "Bad Request", "message": "texto para el usuario", "details": [{ "campo": "email", "mensaje": "..." }] }`. Códigos usados: 400 (validación, también un JSON mal formado), 401 (sin sesión o credenciales inválidas), 403 (sin permiso), 404, 409 (conflicto: duplicado o transición inválida), 413 (cuerpo demasiado grande), 422 (regla de negocio) y 429 (demasiados pedidos: `/auth/registro` y `/auth/login` admiten 20 por minuto por IP y por endpoint, configurable). Un error inesperado responde 500 con un mensaje genérico, sin detalles internos. `details` aparece en 400 (un renglón por campo inválido), en 422 (uno por regla violada) y en algunos 409 (el campo que choca).
- Listas paginadas: `?pagina=1&tamano=20` (`pagina` de 1 a 10000, `tamano` de 1 a 100) y respuesta `{ "items": [], "total": 0, "pagina": 1, "tamano": 20 }`. Las demás listas devuelven un arreglo.
- Los mensajes de error están en español y se pueden mostrar tal cual.

## 2. Autenticación y perfiles (M1)

| Método y ruta | Quién | Cuerpo / parámetros | Respuesta |
|---|---|---|---|
| `POST /auth/registro` | público | `{ nombre, apellido, email, contrasena, rol }` con `rol` en `estudiante`, `empresa` o `docente`. La contraseña tiene al menos 8 caracteres, con una letra y un número | 201 `{ token, usuario }`. 409 si el email ya existe (sin distinguir mayúsculas; el email se guarda en minúsculas) |
| `POST /auth/login` | público | `{ email, contrasena }` | 200 `{ token, usuario }`. 401 si las credenciales son inválidas (mismo mensaje exista o no el email), 403 si la contraseña es correcta pero el usuario está desactivado |
| `GET /auth/yo` | autenticado | | `{ usuario, perfil }` (`perfil` es `null` si todavía no lo completó) |
| `GET /perfil` | estudiante, empresa o docente (el admin recibe 403) | | el perfil según el rol (ver abajo) o 404 si no existe |
| `PUT /perfil` | estudiante, empresa o docente (el admin recibe 403) | crea o reemplaza el perfil propio (upsert). El cuerpo se valida según el rol de quien llama | 200 con el perfil guardado. 400 si el formato es inválido, 422 si no cumple las reglas de negocio |
| `GET /estudiantes/:idEstudiante` | publicador o admin | | perfil del estudiante más `nombre` y `apellido`. El `email` solo aparece si el estudiante tiene una postulación o invitación en un proyecto del publicador; el admin siempre lo ve. 404 si no existe (o está desactivado y quien consulta no es admin) |

`usuario`: `{ idUsuario, nombre, apellido, email, rol, activo, perfilCompleto }`. `perfilCompleto` es `true` cuando ya existe el perfil que corresponde al rol; el administrador no tiene perfil y figura siempre como `true`. Un estudiante, una empresa o un docente recién registrado tiene `perfilCompleto: false` hasta su primer `PUT /perfil`.

**Perfil de estudiante** (`GET`/`PUT /perfil` con rol estudiante):

```json
{
  "idEstudiante": 1, "idCarrera": 1, "anioCursada": 2, "horasSemanales": 10,
  "descripcion": "texto", "proyectosPrevios": "texto",
  "cvUrl": null, "githubUrl": "https://github.com/x", "portfolioUrl": null,
  "carrera": { "idCarrera": 1, "nombre": "Tecnicatura Universitaria en Programación", "duracionAnios": 2 },
  "tecnologias": [{ "idTecnologia": 3, "nombre": "React", "categoria": "frontend", "nivel": "intermedio" }],
  "habilidades": [{ "idHabilidad": 1, "nombre": "Trabajo en equipo" }],
  "materiasAprobadas": [{ "idMateria": 5, "nombre": "Programación I", "anioPlan": 1 }]
}
```

En el `PUT`, `tecnologias` es `[{ idTecnologia, nivel }]` (`nivel`: `basico`, `intermedio` o `avanzado`), `habilidades` es `[idHabilidad]` y `materiasAprobadas` es `[idMateria]`; las tres listas son opcionales (vacías por defecto) y no admiten repetidos. Obligatorios: `idCarrera`, `anioCursada` (1 a 6) y `horasSemanales` (1 a 60). Los textos opcionales (`descripcion`, `proyectosPrevios`) admiten hasta 2000 caracteres; `cvUrl`, `githubUrl` y `portfolioUrl` solo aceptan enlaces `http` o `https`. Reglas de negocio (422, con un renglón en `details` por regla violada): la carrera existe, `anioCursada` no puede superar `carrera.duracionAnios`, las materias existen y tienen que ser de esa carrera, y las tecnologías y habilidades existen. Cada `PUT` reemplaza las listas completas y conserva el `idEstudiante`.

**Perfil de empresa**: `{ idEmpresa, nombreEmpresa, sector, descripcion, contacto, sitioWeb }`. **Perfil de docente**: `{ idDocente, catedra, areaInvestigacion, descripcion }`.

## 3. Catálogos (M5, lectura pública)

| Método y ruta | Respuesta |
|---|---|
| `GET /catalogos/carreras` | `[{ idCarrera, nombre, duracionAnios }]` |
| `GET /catalogos/materias?idCarrera=` | `[{ idMateria, idCarrera, nombre, anioPlan, cuatrimestre }]` (`cuatrimestre` es `null` en las materias anuales). 400 si `idCarrera` no es un entero positivo |
| `GET /catalogos/tecnologias` | `[{ idTecnologia, nombre, categoria, descripcion }]` |
| `GET /catalogos/habilidades` | `[{ idHabilidad, nombre, descripcion }]` |
| `POST /admin/tecnologias` (admin) | `{ nombre, categoria, descripcion? }` → 201 con la tecnología. `categoria`: `lenguaje`, `frontend`, `backend`, `base_de_datos`, `devops`, `datos`, `mobile` o `hardware`. 409 si el nombre ya existe (sin distinguir mayúsculas) |
| `PUT /admin/tecnologias/:id` (admin) | los mismos campos → 200 con la tecnología. 404 si no existe, 409 si el nombre ya lo usa otra |

## 4. Proyectos (M2)

`ProyectoDto`:

```json
{
  "idProyecto": 1, "titulo": "", "descripcion": "", "objetivos": null, "perfilBuscado": null,
  "duracionSemanas": 8, "horasSemanales": 10, "anioMinimo": 1, "cupos": 1,
  "modalidad": "remoto", "tipoRetribucion": "remunerado", "detalleRetribucion": null,
  "estado": "publicado", "fechaPublicacion": "2026-09-01T12:00:00Z", "fechaCierre": null,
  "publicador": { "tipo": "empresa", "id": 1, "nombre": "Acme SA", "idUsuario": 7 },
  "tecnologias": [{ "idTecnologia": 3, "nombre": "React", "categoria": "frontend", "obligatoria": true }],
  "habilidades": [{ "idHabilidad": 1, "nombre": "Trabajo en equipo" }],
  "cantidadPostulaciones": 3,
  "compatibilidad": 0.82
}
```

`cantidadPostulaciones` solo se informa al publicador dueño y al admin. `compatibilidad` solo aparece cuando quien consulta es un estudiante con perfil completo y el motor ya calculó ese par (ver 5.2).

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /proyectos` | publicador con perfil | Cuerpo: `{ titulo, descripcion, objetivos?, perfilBuscado?, duracionSemanas, horasSemanales, anioMinimo, cupos, modalidad, tipoRetribucion, detalleRetribucion?, tecnologias: [{ idTecnologia, obligatoria }], habilidades?: [idHabilidad], publicar?: boolean }`. 201 con el proyecto en `borrador`, o en `publicado` si `publicar` es `true`. 422 si el publicador no completó su perfil o si alguna tecnología o habilidad no existe |
| `GET /proyectos/mios?estado=` | publicador | Sus proyectos, los más nuevos primero, con `cantidadPostulaciones`. 422 si todavía no completó su perfil |
| `GET /proyectos/:id` | autenticado | Un proyecto publicado lo ve cualquiera. Un borrador o suspendido solo su dueño y el admin (404 para el resto) |
| `PUT /proyectos/:id` | dueño | Edita los mismos campos que el alta (reemplaza tecnologías y habilidades). No se edita si el estado es `finalizado`, `cancelado` o `suspendido` (409). Otro publicador recibe 403 |
| `POST /proyectos/:id/publicar` | dueño | `borrador` → `publicado`. 200 con el proyecto; 409 si no estaba en borrador |
| `PATCH /proyectos/:id/estado` | dueño | `{ estado }`. Transiciones válidas: `publicado` → `en_curso` o `cancelado`; `en_curso` → `finalizado` o `cancelado`. Cualquier otra da 409 (un borrador no se cancela: sigue siendo borrador y solo lo ve su dueño). `finalizado` y `cancelado` fijan `fechaCierre`. 200 con el proyecto |
| `POST /proyectos/:id/duplicar` | dueño | (deseable) crea un borrador copia |
| `GET /proyectos` | autenticado | Búsqueda de proyectos `publicado`. Filtros: `q` (título y descripción), `tecnologias=1,2` (al menos una), `modalidad`, `tipoRetribucion`, `horasMax`, `anioMax` (año mínimo del proyecto menor o igual). Paginada |

## 5. Matching, postulaciones e invitaciones (M3)

### 5.1 Recomendaciones

| Método y ruta | Quién | Respuesta |
|---|---|---|
| `GET /matching/recomendaciones?limite=10` | estudiante con perfil | `RecomendacionProyecto[]` de proyectos `publicado`, ordenadas por puntaje descendente y con puntaje mayor o igual al umbral de la configuración activa. `limite` va de 1 a 50. 422 si el estudiante no completó su perfil |
| `GET /matching/proyectos/:idProyecto/recomendados?limite=10` | dueño | `RecomendacionEstudiante[]` de estudiantes activos, con el mismo orden y umbral. Otro publicador recibe 403 |

```json
// RecomendacionProyecto
{ "proyecto": { "...ProyectoDto..." }, "puntajeTotal": 0.82,
  "puntajes": { "tecnologias": 0.9, "texto": null, "contexto": 0.7 },
  "tecnologiasCoincidentes": ["React"], "tecnologiasFaltantes": ["Docker"],
  "postulacion": null, "invitacionPendiente": null }
// RecomendacionEstudiante
{ "estudiante": { "idEstudiante": 1, "nombre": "Ana", "apellido": "Pérez", "carrera": "TUP", "anioCursada": 2,
                  "horasSemanales": 10, "tecnologias": [{ "nombre": "React", "nivel": "intermedio" }] },
  "puntajeTotal": 0.82, "puntajes": { "tecnologias": 0.9, "texto": null, "contexto": 0.7 },
  "tecnologiasCoincidentes": ["React"], "tecnologiasFaltantes": [],
  "idPostulacion": null, "idInvitacion": null }
```

`postulacion` es `{ idPostulacion, estado }` o `null`. `invitacionPendiente` es `{ idInvitacion }` o `null`.

### 5.2 Motor v1 (fórmula)

`puntajeTotal = pesoTecnologias × sT + pesoTexto × sX + pesoContexto × sC`, con los pesos de la configuración activa (`sX` vale 0 si el peso de texto es 0).

El backend guarda en `match` el puntaje de cada estudiante activo con cada proyecto que no es borrador (así una postulación conserva su puntaje aunque el proyecto pase a `en_curso`), pero solo recomienda proyectos `publicado`. Los puntajes se calculan al arrancar si la tabla está vacía y se recalculan solos, limitados a los pares afectados: al guardar un perfil de estudiante y al publicar, editar o reactivar un proyecto. Si al publicar o editar un proyecto un estudiante llega por primera vez al umbral, se emite `match.nuevo`.

- `sT` (tecnologías) es la cobertura ponderada de lo que pide el proyecto: cada tecnología obligatoria pesa 2 y cada deseable pesa 1. Una tecnología que el estudiante sabe aporta su peso multiplicado por el factor de nivel (`basico` 0,6, `intermedio` 0,85, `avanzado` 1); una que no sabe aporta 0. `sT` es la suma de lo aportado dividida por la suma de pesos. Si el proyecto no pide tecnologías, `sT` es 1.
- `sC` (contexto) es `0,6 × horas + 0,4 × anio`. `horas` es 1 si las horas semanales del estudiante cubren las del proyecto, y si no, es el cociente entre ambas. `anio` es 1 si el año de cursada alcanza el año mínimo, y si no, es `max(0, 1 − 0,5 × (anioMinimo − anioCursada))`.
- `sX` (texto, configuración v2) es la similitud del coseno entre vectores TF-IDF de los textos del proyecto (título, descripción, objetivos y perfil buscado) y del estudiante (descripción y proyectos previos), con minúsculas, sin tildes y sin palabras vacías en español.

### 5.3 Motor: administración y evaluación (RF-10)

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /matching/configuraciones` | admin | `[{ idConfiguracion, nombre, descripcion, pesoTecnologias, pesoTexto, pesoContexto, umbralRecomendacion, activa }]` |
| `POST /matching/configuraciones/:id/activar` | admin | Activa la configuración (queda como única activa) y recalcula todos los puntajes con ella. Devuelve `{ pares, milisegundos }`. 404 si no existe |
| `POST /matching/recalcular` | admin | Recalcula todos los pares con la configuración activa → 200 `{ pares, milisegundos }` |
| `GET /matching/referencia` | admin | `[{ idMatchReferencia, idEstudiante, estudiante, idProyecto, proyecto, esRelevante, observacion }]`, el más nuevo primero. `estudiante` es "Nombre Apellido" y `proyecto`, el título |
| `PUT /matching/referencia` | admin | `{ idEstudiante, idProyecto, esRelevante, observacion? }` (upsert: un par se etiqueta una sola vez). 200 con el par. 404 si el estudiante o el proyecto no existen |
| `DELETE /matching/referencia/:id` | admin | 204. 404 si no existe |
| `POST /matching/evaluaciones` | admin | `{ idConfiguracion, k? }` (k de 1 a 50, por defecto 5). Calcula en memoria con esa configuración (aunque no sea la activa), guarda y devuelve la evaluación (201). 404 si la configuración no existe, 422 si el conjunto de referencia está vacío |
| `GET /matching/evaluaciones` | admin | Historial, la más reciente primero |

`Evaluacion`: `{ idEvaluacion, idConfiguracion, configuracion, fechaEjecucion, k, cantidadEstudiantes, precisionGlobal, recallGlobal, precisionTopK, observaciones }`. Las tres métricas se calculan **solo sobre pares etiquetados** en `match_referencia`, como define `schema.sql`. Un proyecto (que no sea borrador) está recomendado a un estudiante si su puntaje alcanza el umbral de la configuración, y el top-k de un estudiante son sus k recomendados de mayor puntaje. `precisionGlobal` = recomendados relevantes / recomendados etiquetados; `recallGlobal` = recomendados relevantes / relevantes etiquetados; `precisionTopK` = promedio, entre los estudiantes con algún par etiquetado en su top-k, de la proporción de relevantes entre esos pares. Una división por cero vale 0; las métricas se redondean a 4 decimales.

### 5.4 Postulaciones

`Postulacion`:

```json
{ "idPostulacion": 1, "estado": "pendiente", "mensajePresentacion": null,
  "fechaPostulacion": "...", "fechaActualizacion": "...",
  "proyecto": { "idProyecto": 1, "titulo": "", "estado": "publicado", "publicador": "Acme SA" },
  "estudiante": { "idEstudiante": 1, "nombre": "", "apellido": "", "email": "solo para el publicador", "carrera": "", "anioCursada": 2, "tecnologias": [] },
  "puntajeTotal": 0.8,
  "historial": [{ "estadoAnterior": null, "estadoNuevo": "pendiente", "fechaCambio": "..." }] }
```

`historial` solo viene en el detalle (y en las respuestas de alta y cambio de estado). `estudiante.email` solo lo ve el publicador dueño y el admin. `estudiante.tecnologias` es `[{ nombre, nivel }]`. `puntajeTotal` es el de la configuración activa, o `null` si el par no tiene puntaje.

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /postulaciones` | estudiante con perfil | `{ idProyecto, mensajePresentacion? }`. 201 con la postulación. Solo a proyectos `publicado` (422 si no lo está; 404 si es un borrador o un suspendido). 409 si ya se postuló, o si tiene una invitación pendiente a ese proyecto (se responde la invitación). 422 si no completó su perfil |
| `GET /postulaciones/mias?estado=` | estudiante | Sus postulaciones, las más nuevas primero (vacío si no completó su perfil) |
| `GET /proyectos/:idProyecto/postulaciones?estado=` | dueño o admin | Las postulaciones del proyecto, con el puntaje y el perfil resumido |
| `GET /postulaciones/:id` | estudiante dueño, publicador dueño o admin | Detalle con el historial. 403 para el resto |
| `PATCH /postulaciones/:id/estado` | ver abajo | `{ estado }`. 200 con la postulación (con el historial) |

Máquina de estados: `pendiente` → `en_revision`, `entrevista`, `rechazada` o `retirada`; `en_revision` → `entrevista`, `aceptada`, `rechazada` o `retirada`; `entrevista` → `aceptada`, `rechazada` o `retirada`. `aceptada`, `rechazada` y `retirada` son finales. Solo el estudiante dueño puede pasar a `retirada`, y solo el publicador del proyecto puede pasar a los demás estados (403 en los demás casos, también para el admin). Una transición inválida da 409, y también un cambio simultáneo: el estado se actualiza solo si sigue siendo el que se leyó. El backend fija `utn_match.id_usuario` con `SET LOCAL` en la misma transacción para que el trigger del historial registre al responsable.

### 5.5 Invitaciones

`Invitacion`: `{ idInvitacion, proyecto: { idProyecto, titulo, publicador }, estudiante: { idEstudiante, nombre, apellido }, mensaje, estado, fechaInvitacion, fechaRespuesta }`.

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /invitaciones` | dueño del proyecto | `{ idProyecto, idEstudiante, mensaje? }`. 201 con la invitación. Solo a proyectos `publicado` (422). 404 si el estudiante no existe o está desactivado. 409 si el estudiante ya tiene postulación o invitación en ese proyecto |
| `GET /invitaciones/mias` | estudiante | Sus invitaciones, las más nuevas primero (vacío si no completó su perfil) |
| `GET /proyectos/:idProyecto/invitaciones` | dueño | Las invitaciones del proyecto |
| `POST /invitaciones/:id/responder` | estudiante invitado | `{ aceptar: boolean }`. Si acepta, en la misma transacción se crea la postulación en estado `pendiente`. Devuelve 200 con `{ invitacion, postulacion }` (`postulacion` es `null` si rechazó). 409 si ya fue respondida, 403 si quien responde no es el invitado, 422 si acepta y el proyecto ya no está `publicado` |

## 6. Comunicación (M4)

`Notificacion`: `{ idNotificacion, tipo, mensaje, urlReferencia, fecha, leida }`.

| Método y ruta | Descripción |
|---|---|
| `GET /notificaciones?soloNoLeidas=true&limite=30` | `{ items, noLeidas }`: las del usuario que inició sesión (cualquier rol), la más nueva primero. `limite` de 1 a 100, por defecto 30; `noLeidas` cuenta todas las no leídas |
| `POST /notificaciones/:id/leer` | 204. 404 si no existe o es de otro usuario |
| `POST /notificaciones/leer-todas` | 204 |

`tipo` es `nuevo_match`, `invitacion`, `nueva_postulacion`, `cambio_estado_postulacion` o `cambio_estado_proyecto`, y `urlReferencia` es la pantalla del frontend a la que lleva el aviso.

Se generan a partir de los eventos del dominio: `match.nuevo` (al estudiante), `invitacion.enviada` (al estudiante), `postulacion.creada` (al publicador), `postulacion.estado_cambiado` (al estudiante; si el estudiante la retira, al publicador) y `proyecto.estado_cambiado` (a los estudiantes con una postulación que no está rechazada ni retirada; si la administración lo suspende o lo reactiva, también al publicador, con el motivo de la suspensión). Primero se guarda la notificación y después se intenta el email, sin esperarlo; si el envío falla, la operación principal no se ve afectada y la notificación queda sin marcar como enviada (`enviada_email`). El email sale por SMTP con `EMAIL_TRANSPORT=smtp`; por defecto (`log`) se escribe en la consola de la API.

## 7. Administración y reportes (M5)

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /admin/usuarios?rol=&activo=&q=&pagina=&tamano=` | admin | `{ items: [{ idUsuario, nombre, apellido, email, rol, activo, fechaRegistro }], total, pagina, tamano }` |
| `PATCH /admin/usuarios/:id` | admin | `{ activo?, rol? }` (al menos uno; `rol` es `estudiante`, `empresa` o `docente`) → 200 con el renglón del listado. Un admin no puede desactivarse ni cambiarse el rol a sí mismo (409). El rol solo cambia si el usuario todavía no completó su perfil (409). 404 si no existe. Desactivar corta la sesión del usuario al instante |
| `POST /admin/administradores` | admin | `{ nombre, apellido, email, contrasena }` → 201 con el renglón del listado. 409 si el email ya está registrado |
| `POST /admin/usuarios/:id/restablecer-contrasena` | admin | `{ contrasenaNueva }` (misma política que el registro) → 204. 404 si no existe |
| `GET /admin/proyectos?estado=` | admin | Todos los proyectos, borradores incluidos, los más nuevos primero, con `cantidadPostulaciones` |
| `POST /admin/proyectos/:id/suspender` | admin | `{ motivo }` (1 a 200 caracteres) → 200 con el proyecto. Solo desde `publicado` o `en_curso` (409). Deja de verse para los estudiantes y su dueño no lo puede editar. Se avisa al publicador, con el motivo, y a los estudiantes con postulación activa |
| `POST /admin/proyectos/:id/reactivar` | admin | `suspendido` → `publicado` → 200 con el proyecto (409 desde cualquier otro estado). Se recalculan sus recomendaciones y se avisa al publicador |
| `GET /reportes/resumen` | admin | RF-07: `{ estudiantesActivos, empresasActivas, docentesActivos, proyectosPorEstado: {}, postulacionesPorEstado: {} }` |
| `GET /reportes/dashboard` | admin | RF-11, ver abajo |
| `GET /publico/estadisticas` | público | `{ estudiantes, proyectosPublicados, publicadores, postulaciones }` para la portada |
| `GET /health` | público | `{ estado: "ok", baseDeDatos: "ok" }`. Si la base no contesta: 503 con `{ estado: "error", baseDeDatos: "error" }` |

`GET /reportes/dashboard`:

```json
{
  "tecnologiasDemandadas": {
    "ranking": [{ "idTecnologia": 3, "tecnologia": "React", "categoria": "frontend", "cantidadProyectos": 8, "cantidadObligatoria": 6 }],
    "evolucion": [{ "mes": "2026-09-01", "tecnologia": "React", "cantidadProyectos": 3 }]
  },
  "matchPorCarreraAnio": [{ "carrera": "", "anioCursada": 2, "totalEstudiantes": 10, "conRecomendacion": 8, "conProyecto": 2, "pctConRecomendacion": 80, "pctConProyecto": 20 }],
  "tiempoPrimerProyecto": { "promedioDias": 12.5, "estudiantes": 4 },
  "embudo": [{ "mes": "2026-09-01", "postulaciones": 20, "entrevistas": 8, "proyectosCerrados": 3, "pctPostulacionAEntrevista": 40, "pctEntrevistaACierre": 37.5 }],
  "evaluacionMotor": [{ "configuracion": "v1", "precisionGlobal": 0.93, "recallGlobal": 0.8, "precisionTopK": 0.9, "k": 5 }]
}
```

Los cuatro primeros bloques salen de las vistas `vw_*` de `schema.sql`; `evaluacionMotor` es la última evaluación de cada configuración. El ranking va de la tecnología más pedida a la menos pedida y suma todos los meses; `evolucion` y `embudo` van del mes más viejo al más nuevo. `promedioDias` es `null` cuando ningún estudiante tiene todavía una postulación aceptada, y `pctEntrevistaACierre` es `null` en un mes sin entrevistas.

`proyectosPorEstado` y `postulacionesPorEstado` solo traen los estados que tienen al menos un registro. `GET /publico/estadisticas` cuenta los usuarios activos, los proyectos en estado `publicado` y todas las postulaciones.
