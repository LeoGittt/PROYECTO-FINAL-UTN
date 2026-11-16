# UTN Match

Una plataforma para que los estudiantes de la UTN consigan su primera experiencia laboral real.

Proyecto Final, Tecnicatura Universitaria en Programación (UTN).
Estado: MVP terminado y probado; falta el despliegue.

## De qué se trata

Todos los que estudiamos programación conocemos el mismo círculo vicioso: para conseguir
tu primer trabajo te piden experiencia, y para tener experiencia necesitás un primer trabajo.

Mientras tanto, hay empresas que necesitan cosas chicas y concretas (un scraper, un dashboard,
un MVP para validar una idea) y no tienen a quién pedírselas. Y hay cátedras y profesores que
necesitan un mini producto para una investigación y terminan haciéndolo a mano.

UTN Match junta esas dos puntas. Las empresas y los docentes de las cátedras publican proyectos acotados,
los estudiantes arman su perfil, y la plataforma se encarga de sugerir quién encaja con qué.

## Por qué hace falta

Muchas facultades ya tienen convenios con empresas. El problema es cómo se manejan: por mail,
por planillas de Excel, o directamente en el grupo de WhatsApp de la comisión.

Eso trae tres cosas malas. Las oportunidades le llegan a poca gente, casi siempre a los mismos.
La decisión de a quién ofrecerle qué la toma una persona a ojo, con toda la subjetividad que
eso implica. Y sobre todo: nadie mide nada. La facultad no tiene forma de saber qué está
pidiendo el mercado ni cuántos de sus estudiantes están consiguiendo experiencia real.

Nuestra apuesta es que digitalizar el circuito y automatizar las recomendaciones amplía el
alcance y acorta los tiempos. Y que además genera datos que hoy no existen.

## Cómo funciona

El estudiante arma su perfil. Qué carrera hace, en qué año está, qué materias aprobó,
con qué tecnologías se maneja, cuántas horas por semana tiene disponibles y dónde se puede
ver lo que hizo (GitHub, portfolio).

La empresa o el docente de una cátedra publica un proyecto. Qué necesitan, qué tecnologías involucra,
cuánto tiempo estiman, si es remoto o presencial, y qué ofrecen a cambio: puede ser plata,
puede ser una práctica profesional, puede ser un certificado.

La plataforma sugiere. Acá está el corazón del proyecto. En lugar de dejar que el
estudiante scrollee una lista infinita, el sistema calcula qué tan bien encaja cada persona
con cada proyecto y ordena las sugerencias por afinidad.

### Cómo decidimos quién encaja con qué

Esta es la parte que más nos interesa resolver bien, así que la pensamos en capas.

Lo primero es lo obvio: cuánto se parecen las tecnologías que pide el proyecto a las
que maneja el estudiante. Si el proyecto pide React y Node, y vos sabés React y Node, hay
match. Ese cálculo se hace comparando los dos conjuntos de tecnologías.

Pero eso solo no alcanza, porque los perfiles no siempre están bien etiquetados. Alguien
puede haber trabajado con algo y no haberlo cargado como tag. Por eso también comparamos
los textos: la descripción del proyecto contra la descripción del perfil, buscando
coincidencias que los tags se pierden.

Y finalmente sumamos el contexto: la disponibilidad horaria y el año de carrera. De nada
sirve recomendarle un proyecto de 20 horas semanales a alguien que tiene 5, o mandar a un
estudiante de primer año a algo que le va a quedar grande.

Las tres cosas se combinan en un puntaje único, y ese puntaje es el que ordena las sugerencias.

En la plataforma esto quedó como dos configuraciones del motor: v1 usa las tecnologías y el
contexto, y v2 suma la comparación de textos. El administrador elige cuál está activa.

### Y sobre todo: medimos si funciona

Cualquiera puede escribir un algoritmo de recomendación. Lo difícil, y lo interesante para
un proyecto final, es demostrar que anda.

Para eso armamos un conjunto de casos de referencia, donde cada par estudiante-proyecto está
marcado como buen o mal match, y comparamos contra eso. La primera versión la propusimos con
asistencia de IA, y la vamos a revisar y ampliar durante la implementación. Así podemos
responder preguntas concretas:
de las recomendaciones que hace el sistema, ¿cuántas eran buenas? De todos los buenos matches
posibles, ¿cuántos encontró? ¿Las cinco primeras sugerencias son realmente las mejores?

Con esas respuestas comparamos las distintas formas de calcular la afinidad y elegimos la
que mejor funcione, con números y no con intuición.

## El panel de métricas

Todo lo que pasa en la plataforma genera información que hoy no existe en ningún lado.
El dashboard la muestra:

- Qué tecnologías están pidiendo más las empresas, y cómo eso cambia con el tiempo
- Qué porcentaje de estudiantes consigue match, abierto por carrera y por año
- Cuánto tarda en promedio alguien desde que se registra hasta su primer proyecto
- Cuántas postulaciones terminan en entrevista, y cuántas entrevistas en proyecto cerrado

Para la facultad esto es información valiosa. Para nosotros, es la parte estadística que
sostiene el proyecto.

## Con qué está hecho

Todo el proyecto es TypeScript, de la base de datos hasta la pantalla. Un solo lenguaje,
un solo ecosistema, sin saltos de contexto.

- Frontend: Next.js y React
- Backend: NestJS
- Base de datos: PostgreSQL, alojada en Supabase
- Lenguaje: TypeScript en todo el stack
- Despliegue previsto: Vercel para el frontend y Render para el backend

El motor de recomendación también vive en TypeScript, dentro del backend. No hace falta
sumar otro lenguaje ni otro servicio para esto: los cálculos son sencillos y tenerlos
al lado del resto del código nos ahorra un montón de complejidad innecesaria.

```
PROYECTO-FINAL-UTN/
  backend/                API NestJS y motor de recomendación
    database/
      schema.sql          esquema de la base de datos
      seed.sql            datos de ejemplo
    src/                  un módulo por carpeta (perfiles, proyectos, matching,
                          comunicacion, administracion)
    test/                 pruebas de punta a punta de la API
  frontend/               aplicación web en Next.js (App Router)
    src/app/              rutas
    src/features/         pantallas de cada parte del sistema
  docs/
    _TRABAJO-INTEGRADOR-FINAL.pdf    Entrega 1
    entrega-2/            Entrega 2: diseño y módulos
    api/CONTRATO.md       contrato de la API REST
    DEPLOY.md             guía de despliegue
  render.yaml             configuración del servicio de la API en Render
  README.md
```

## Documentación

La Entrega 1 (problema, actores, stack, requisitos y plan de trabajo) está en
[docs/_TRABAJO-INTEGRADOR-FINAL.pdf](docs/_TRABAJO-INTEGRADOR-FINAL.pdf).

La Entrega 2 (Diseño y Módulos) está en `docs/entrega-2/`:

- [DER.md](docs/entrega-2/DER.md): modelo de datos, diagramas entidad-relación, diccionario de datos y decisiones de diseño.
- [MODULOS.md](docs/entrega-2/MODULOS.md): los cinco módulos, con sus funcionalidades, requisitos, tablas y dependencias.
- [ARQUITECTURA.md](docs/entrega-2/ARQUITECTURA.md): arquitectura en capas, contratos entre módulos y diagrama de paquetes.
- [PROCESO-IA.md](docs/entrega-2/PROCESO-IA.md): cómo usamos la IA en el modelado y qué decidimos nosotros.

El esquema de la base está en [backend/database/schema.sql](backend/database/schema.sql) y los datos de ejemplo en [backend/database/seed.sql](backend/database/seed.sql).

Para la implementación:

- [docs/api/CONTRATO.md](docs/api/CONTRATO.md): cada endpoint de la API, con sus datos de entrada, respuestas y errores.
- [docs/DEPLOY.md](docs/DEPLOY.md): cómo publicar la base en Supabase, la API en Render y la web en Vercel.

## Cómo levantarlo

Necesitás Node.js 20.9 o superior (lo exige Next.js 16). Primero se clona el repositorio:

```bash
git clone https://github.com/LeoGittt/PROYECTO-FINAL-UTN.git
cd PROYECTO-FINAL-UTN
```

Cada aplicación se instala y se corre por separado, en dos terminales distintas. No hace
falta instalar PostgreSQL ni crear archivos `.env`: si no hay `DATABASE_URL`, la API usa
PGlite (PostgreSQL embebido) y en el primer arranque carga el esquema, los datos de ejemplo
y calcula las compatibilidades. Los datos quedan en `backend/.data/pglite`.

```bash
# Terminal 1: la API
cd backend
npm install
npm run start:dev     # queda escuchando en http://localhost:3001

# Terminal 2: la web
cd frontend
npm install
npm run dev           # queda escuchando en http://localhost:3000
```

La API usa el puerto 3001 y la web el 3000, para que puedan convivir sin pisarse.
El backend ya viene con CORS habilitado hacia el frontend.

### Variables de entorno

Cada aplicación tiene un archivo `.env.example` con todas las variables que usa, explicadas.
Para el backend se copia como `backend/.env` y para el frontend como `frontend/.env.local`.
En desarrollo todas son opcionales. Las principales:

- `PORT` (backend): puerto de la API. Por defecto, 3001.
- `FRONTEND_URL` (backend): origen permitido por CORS y base de los enlaces de los emails. Por defecto, `http://localhost:3000`.
- `DATABASE_URL` (backend): cadena de conexión a PostgreSQL, local o de Supabase. Vacía, se usa PGlite.
- `JWT_SECRET` (backend): secreto para firmar las sesiones. Obligatorio en producción; en desarrollo, si falta, se genera uno en cada arranque y las sesiones se pierden al reiniciar la API.
- `EMAIL_TRANSPORT` (backend): `log` escribe los emails en la consola de la API; `smtp` los envía con las variables `SMTP_*`.
- `NEXT_PUBLIC_API_URL` (frontend): URL de la API, con el prefijo `/api`. Por defecto, `http://localhost:3001/api`.

### Base de datos

Para volver la base local a los datos de ejemplo (borra todo lo que se haya cargado):

```bash
cd backend
npm run db:reset
```

Para usar un PostgreSQL real (15 o superior, local o en Supabase) se define `DATABASE_URL`.
Con `DB_AUTO_INIT=true` la API carga el esquema y los datos si la base está vacía. También se
pueden cargar a mano, primero el esquema y después los datos de ejemplo. Con PostgreSQL local:

```bash
createdb utn_match
psql -d utn_match -f backend/database/schema.sql
psql -d utn_match -f backend/database/seed.sql
```

En Supabase no se usa `createdb`: se pasa la cadena de conexión del proyecto (la misma de
`DATABASE_URL`) a `psql`, o se pega el contenido de cada archivo en el editor SQL del panel.

```bash
psql "$DATABASE_URL" -f backend/database/schema.sql
psql "$DATABASE_URL" -f backend/database/seed.sql
```

### Usuarios de prueba

Todos los usuarios de ejemplo usan la contraseña `UtnMatch2026!`. Uno por rol:

- Estudiante: `lucia.fernandez@alumnos.utnmatch.test`
- Empresa: `martin.paz@andessoftware.test`
- Docente: `silvia.morales@docentes.utnmatch.test`
- Administrador: `admin@utnmatch.test`

### Pruebas

```bash
cd backend
npm test              # pruebas unitarias
npm run test:e2e      # pruebas de la API contra una base PGlite en memoria
npm run lint

cd ../frontend
npm test              # pruebas de componentes y pantallas, con una revisión de accesibilidad (axe)
npm run lint
npm run build
```

## Una honestidad sobre los datos

El punto flojo de una plataforma como esta es que, para mostrarla funcionando, hace falta
gente y proyectos reales. Y no los tenemos todavía.

Por eso la demo usa un conjunto de datos simulado pero realista, en `backend/database/seed.sql`:
20 estudiantes, 5 empresas, 3 docentes, 14 proyectos con postulaciones en distintos estados,
y 48 pares estudiante-proyecto etiquetados como buen o mal match para medir el motor. Los
resultados de esa medición dicen cómo se comporta el motor con estos datos, no con usuarios
reales.

## Hacia dónde vamos

- [x] Modelar la base de datos
- [x] Perfiles de estudiantes y publicación de proyectos
- [x] Motor de recomendación
- [x] Medición y comparación de resultados
- [x] Panel de métricas
- [x] Notificaciones en la plataforma y por email
- [ ] Deploy y presentación

## Quiénes lo hacemos

- Leonel Gonzalez. 
- Marco Krivocapich.
- Octavio Guardamagna. 
