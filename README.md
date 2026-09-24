# UTN Match

Una plataforma para que los estudiantes de la UTN consigan su primera experiencia laboral real.

Proyecto Final, Tecnicatura Universitaria en Programación (UTN).
Estado: en desarrollo.

## De qué se trata

Todos los que estudiamos programación conocemos el mismo círculo vicioso: para conseguir
tu primer trabajo te piden experiencia, y para tener experiencia necesitás un primer trabajo.

Mientras tanto, hay empresas que necesitan cosas chicas y concretas (un scraper, un dashboard,
un MVP para validar una idea) y no tienen a quién pedírselas. Y hay cátedras y profesores que
necesitan un mini producto para una investigación y terminan haciéndolo a mano.

UTN Match junta esas dos puntas. Las empresas y las cátedras publican proyectos acotados,
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

La empresa o la cátedra publica un proyecto. Qué necesitan, qué tecnologías involucra,
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

### Y sobre todo: medimos si funciona

Cualquiera puede escribir un algoritmo de recomendación. Lo difícil, y lo interesante para
un proyecto final, es demostrar que anda.

Para eso armamos un conjunto de casos donde nosotros marcamos a mano cuáles serían los
matches correctos, y comparamos contra eso. Así podemos responder preguntas concretas:
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
    src/
  frontend/               aplicación web en Next.js (App Router)
    src/app/
  docs/
    _TRABAJO-INTEGRADOR-FINAL.pdf    Entrega 1
    entrega-2/            Entrega 2: diseño y módulos
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

## Cómo levantarlo

Necesitás Node.js 20 o superior. Cada aplicación se instala y se corre por separado,
en dos terminales distintas.

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

Cada aplicación tiene un archivo `.env.example` con las variables que usa. Para el backend
se copia como `backend/.env` y para el frontend como `frontend/.env.local`.

- `PORT` (backend): puerto de la API. Por defecto, 3001.
- `FRONTEND_URL` (backend): origen permitido por CORS. Por defecto, `http://localhost:3000`.
- `DATABASE_URL` (backend): cadena de conexión a PostgreSQL, local o de Supabase.
- `NEXT_PUBLIC_API_URL` (frontend): URL de la API.

`PORT` y `FRONTEND_URL` ya las usa el backend. `DATABASE_URL` y `NEXT_PUBLIC_API_URL` se van
a usar cuando se conecten la base de datos y la API; en ese momento se agrega también la
carga automática del archivo `.env` en el backend.

### Base de datos

Necesitás PostgreSQL 15 o superior (local o en Supabase). Sobre una base vacía:

```bash
createdb utn_match
psql -d utn_match -f backend/database/schema.sql
psql -d utn_match -f backend/database/seed.sql
```

Todos los usuarios de ejemplo usan la contraseña `UtnMatch2026!`.

## Una honestidad sobre los datos

El punto flojo de una plataforma como esta es que, para mostrarla funcionando, hace falta
gente y proyectos reales. Y no los tenemos todavía.

Lo que vamos a hacer es armar un conjunto de datos simulado pero realista (estudiantes y
proyectos que podrían existir perfectamente) y conseguir algunas búsquedas reales adaptadas
de portales de empleo, para que la demo no se sienta de juguete.

## Hacia dónde vamos

- [x] Modelar la base de datos
- [ ] Perfiles de estudiantes y publicación de proyectos
- [ ] Motor de recomendación
- [ ] Medición y comparación de resultados
- [ ] Panel de métricas
- [ ] Deploy y presentación

## Quiénes lo hacemos

- Leonel Gonzalez. 
- Marco Krivocapich.
- Octavio Guardamagna. 
