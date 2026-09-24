# UTN Match: módulos a desarrollar

Trabajo Final Integrador, Tecnicatura Universitaria en Programación (UTN). Entrega 2: Diseño y Módulos.

## 1. Introducción

UTN Match se desarrolla en los mismos cinco módulos definidos en la Entrega 1. Para cada uno se indican su objetivo, sus funcionalidades, los requisitos que cubre, las tablas que usa y sus dependencias. La arquitectura y las dependencias entre módulos están en [ARQUITECTURA.md](./ARQUITECTURA.md) y el modelo de datos en [DER.md](./DER.md).

Como somos tres personas y la entrega final es el 14/11, cada funcionalidad se marca como MVP o Deseable. MVP es lo necesario para demostrar el circuito completo (perfil, proyecto, recomendación, postulación y métricas) y la evaluación del motor. Deseable es lo que se hace si alcanza el tiempo.

## 2. Requisitos

Los requisitos RF-01 a RF-08 y RNF-01 a RNF-07 son los de la Entrega 1 y no cambian. En esta entrega se agregan tres requisitos funcionales, que formalizan funcionalidades que la Entrega 1 ya describía en el texto:

- RF-09 (M1). Perfil académico: el sistema debe permitir al estudiante registrar su carrera, su año de cursada y las materias aprobadas, y usar el año de cursada como parte del contexto del cálculo de compatibilidad.
- RF-10 (M3). Evaluación del motor: el sistema debe permitir registrar un conjunto de matches de referencia marcados a mano y calcular, para cada configuración del motor, la precisión, el recall y la precisión en el top-5, y guardar los resultados para compararlos.
- RF-11 (M5). Dashboard de métricas: el sistema debe mostrar las tecnologías más demandadas y su evolución mensual, el porcentaje de estudiantes con match por carrera y año, el tiempo promedio hasta el primer proyecto y el embudo de postulación, entrevista y proyecto cerrado, registrando la fecha de cada cambio de estado de las postulaciones.

| Requisito | Descripción breve | Módulos |
|-----------|-------------------|---------|
| RF-01 | Registro de usuarios con roles diferenciados | M1 (alta de administradores en M5) |
| RF-02 | Perfil del estudiante: tecnologías, habilidades, disponibilidad y proyectos previos | M1 |
| RF-03 | Publicación de proyectos | M2 |
| RF-04 | Porcentaje de compatibilidad entre estudiante y proyecto | M3 |
| RF-05 | Postulaciones e invitaciones | M3 (seguimiento en M4) |
| RF-06 | Panel de administración y moderación | M5 |
| RF-07 | Reportes estadísticos | M5 |
| RF-08 | Notificaciones automáticas por email | M4 |
| RF-09 | Perfil académico | M1 |
| RF-10 | Evaluación del motor | M3 |
| RF-11 | Dashboard de métricas | M5 |
| RNF-01 | Usabilidad: completar un perfil o publicar un proyecto en menos de 5 minutos | M1, M2 |
| RNF-02 | Rendimiento: 1000 usuarios concurrentes | M3, M5 |
| RNF-03 | Seguridad: contraseñas con bcrypt | M1, M5 |
| RNF-04 | Disponibilidad del 99,5 % | M4 y transversal |
| RNF-05 | Accesibilidad WCAG 2.1 AA | Transversal (frontend) |
| RNF-06 | Escalabilidad | M3 y transversal |
| RNF-07 | Mantenibilidad: documentación, pruebas y estándares | Transversal |

## 3. Módulos

### 3.1 M1: Autenticación y Gestión de Perfiles

Objetivo: gestionar el registro, el inicio de sesión y los perfiles, y armar un perfil del estudiante lo bastante completo para que el motor pueda recomendarle proyectos.

- Registro con elección de rol e inicio de sesión con email y contraseña (bcrypt). MVP, RF-01.
- Control de acceso por rol en cada endpoint. MVP, RF-01.
- Perfil del estudiante: carrera, año, horas semanales, descripción, proyectos previos y enlaces (GitHub, portfolio, CV). MVP, RF-02 y RF-09.
- Carga de tecnologías con nivel, habilidades y materias aprobadas. MVP, RF-02 y RF-09.
- Perfil de empresa y de docente. MVP, RF-01.
- Recuperación de contraseña con un token firmado. Deseable.
- Subida del CV como archivo. Deseable.

RF-01 incluye el rol Administrador, pero el registro público solo permite elegir estudiante, empresa o docente: a los administradores los da de alta otro administrador desde M5, para que nadie pueda registrarse con permisos de administración. La disponibilidad que pide RF-02 se cubre con las horas semanales, que es el dato que usa el motor. Requisitos no funcionales: RNF-01 (perfil en menos de 5 minutos), RNF-03 (bcrypt) y RNF-05. Solo depende de los catálogos de M5.

### 3.2 M2: Gestión de Proyectos

Objetivo: permitir que empresas y docentes publiquen y administren proyectos con los datos que el motor necesita.

- Publicación con título, descripción, objetivos, perfil buscado, duración, horas semanales, año mínimo, cupos, modalidad y retribución. MVP, RF-03.
- Tecnologías requeridas (obligatorias o deseables) y habilidades. MVP, RF-03.
- Borrador, publicación, edición y cambio de estado (en curso, finalizado, cancelado). MVP, RF-03.
- Listado de proyectos propios con filtro por estado. MVP.
- Filtros avanzados y duplicar proyectos. Deseable.

Requisitos no funcionales: RNF-01 (publicar en menos de 5 minutos) y RNF-05. Depende de M1, para identificar al publicador, y de los catálogos de M5.

### 3.3 M3: Búsqueda y Recomendación (Matching)

Objetivo: recomendar a cada estudiante los proyectos que mejor encajan con su perfil, gestionar postulaciones e invitaciones y medir si las recomendaciones son buenas.

- Puntaje v1 (similitud de tecnologías y contexto), guardado con sus componentes y recalculado cuando cambia un perfil o un proyecto. MVP, RF-04 y RF-09.
- Proyectos recomendados para el estudiante y estudiantes recomendados para cada proyecto, con el porcentaje de compatibilidad. MVP, RF-04.
- Búsqueda de proyectos con filtros. MVP.
- Postulación, retiro y cambio de estado de las postulaciones por parte del publicador. MVP, RF-05 y RF-11.
- Invitaciones a estudiantes recomendados. MVP, RF-05.
- Conjunto de referencia, evaluación de cada configuración y comparación entre configuraciones. MVP, RF-10.
- Similitud de textos (configuración v2). Deseable, con prioridad sobre los demás deseables.
- Uso de habilidades y materias como señales adicionales, y pantallas para etiquetar y configurar el motor. Deseable.

El análisis de texto no está en el MVP porque la Entrega 1 lo plantea como mejora incremental. Al tener v1 y v2 como configuraciones separadas, la evaluación muestra cuánto aporta. Requisitos no funcionales: RNF-02 (los puntajes se calculan de antemano y se leen con índices), RNF-06 (el recálculo se limita a los pares afectados) y RNF-07 (pruebas unitarias del motor). Depende de M1 y M2.

### 3.4 M4: Comunicación y Seguimiento

Objetivo: avisar a las partes lo que ocurre después del match y permitirles seguir sus postulaciones.

- Notificaciones en la plataforma y por email ante un nuevo match, una invitación o un cambio de estado. MVP, RF-08.
- Seguimiento de cada postulación a partir de su historial. MVP, RF-05.
- Reintento de emails fallidos y preferencias de notificación. Deseable.
- Mensajería interna. Deseable, porque ningún requisito la exige.

Requisitos no funcionales: RNF-04 (el email se envía después de guardar la notificación, así que una falla del correo no afecta la operación principal). Depende de M1 y M3, y ningún módulo depende de M4. El plan de trabajo de la Entrega 1 no le asigna una etapa propia: se construye junto con las etapas de postulaciones y del motor.

### 3.5 M5: Administración y Reportes

Objetivo: gestionar y moderar la plataforma, y mostrar datos que hoy no existen, como qué tecnologías pide el mercado y cuántos estudiantes consiguen experiencia.

- Gestión de usuarios (alta de administradores, activar, desactivar, cambiar rol) y moderación de proyectos y perfiles. MVP, RF-01 y RF-06.
- Catálogo de tecnologías. MVP, RF-06. Las habilidades, carreras y materias se cargan con el seed; su edición es deseable.
- Reportes de estudiantes activos, proyectos por estado y tecnologías demandadas. MVP, RF-07.
- Dashboard con las cuatro métricas de RF-11. MVP.
- Filtro por período y exportación a CSV. Deseable.

Requisitos no funcionales: RNF-02 (métricas calculadas con vistas SQL) y RNF-03 (acceso solo para administradores). Depende de M1, M2 y M3.

## 4. Tablas por módulo

| Tabla | Módulo dueño | Alcance | Otros módulos que la usan (por API) |
|-------|--------------|---------|-------------------------------------|
| `usuario` | M1 | MVP | M3, M4, M5 |
| `perfil_estudiante` | M1 | MVP | M3, M5 |
| `perfil_empresa` | M1 | MVP | M2 |
| `perfil_docente` | M1 | MVP | M2 |
| `estudiante_tecnologia` | M1 | MVP | M3 |
| `estudiante_habilidad` | M1 | MVP | M3 (deseable) |
| `materia_aprobada` | M1 | MVP | M3 |
| `carrera` | M5 | MVP | M1 |
| `materia` | M5 | MVP | M1 |
| `tecnologia` | M5 | MVP | M1, M2 |
| `habilidad` | M5 | MVP | M1, M2 |
| `proyecto` | M2 | MVP | M3, M5 |
| `proyecto_tecnologia` | M2 | MVP | M3 |
| `proyecto_habilidad` | M2 | MVP | M3 (deseable) |
| `postulacion` | M3 | MVP | M4 |
| `postulacion_historial` | M3 | MVP | M4 |
| `invitacion` | M3 | MVP | |
| `match` | M3 | MVP | |
| `configuracion_motor` | M3 | MVP | |
| `match_referencia` | M3 | MVP | |
| `evaluacion_motor` | M3 | MVP | M5 |
| `notificacion` | M4 | MVP | |
| `mensaje` | M4 | Deseable | |

Además, M5 lee directamente las cuatro vistas del dashboard, que combinan tablas de M1, M2 y M3. Es la única excepción a la regla de acceso por API y está justificada en la sección 5.3 de [ARQUITECTURA.md](./ARQUITECTURA.md).
