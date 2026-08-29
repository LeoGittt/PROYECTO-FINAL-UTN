# UTN Match

Una plataforma para que los estudiantes de la UTN consigan su primera experiencia laboral real.

**Proyecto Final — Tecnicatura Universitaria en Programación (UTN)**
Estado: en desarrollo 🚧

## De qué se trata

Todos los que estudiamos programación conocemos el mismo círculo vicioso: para conseguir
tu primer trabajo te piden experiencia, y para tener experiencia necesitás un primer trabajo.

Mientras tanto, hay empresas que necesitan cosas chicas y concretas —un scraper, un dashboard,
un MVP para validar una idea— y no tienen a quién pedírselas. Y hay cátedras y profesores que
necesitan un mini producto para una investigación y terminan haciéndolo a mano.

**UTN Match junta esas dos puntas.** Las empresas y las cátedras publican proyectos acotados,
los estudiantes arman su perfil, y la plataforma se encarga de sugerir quién encaja con qué.

## Por qué hace falta

Muchas facultades ya tienen convenios con empresas. El problema es cómo se manejan: por mail,
por planillas de Excel, o directamente en el grupo de WhatsApp de la comisión.

Eso trae tres cosas malas. Las oportunidades le llegan a poca gente, casi siempre a los mismos.
La decisión de a quién ofrecerle qué la toma una persona a ojo, con toda la subjetividad que
eso implica. Y sobre todo: **nadie mide nada**. La facultad no tiene forma de saber qué está
pidiendo el mercado ni cuántos de sus estudiantes están consiguiendo experiencia real.

Nuestra apuesta es que digitalizar el circuito y automatizar las recomendaciones amplía el
alcance y acorta los tiempos. Y que además genera datos que hoy no existen.

## Cómo funciona

**El estudiante arma su perfil.** Qué carrera hace, en qué año está, qué materias aprobó,
con qué tecnologías se maneja, cuántas horas por semana tiene disponibles y dónde se puede
ver lo que hizo (GitHub, portfolio).

**La empresa o la cátedra publica un proyecto.** Qué necesitan, qué tecnologías involucra,
cuánto tiempo estiman, si es remoto o presencial, y qué ofrecen a cambio: puede ser plata,
puede ser una práctica profesional, puede ser un certificado.

**La plataforma sugiere.** Acá está el corazón del proyecto. En lugar de dejar que el
estudiante scrollee una lista infinita, el sistema calcula qué tan bien encaja cada persona
con cada proyecto y ordena las sugerencias por afinidad.

### Cómo decidimos quién encaja con qué

Esta es la parte que más nos interesa resolver bien, así que la pensamos en capas.

Lo primero es lo obvio: **cuánto se parecen las tecnologías** que pide el proyecto a las
que maneja el estudiante. Si el proyecto pide React y Node, y vos sabés React y Node, hay
match. Ese cálculo se hace comparando los dos conjuntos de tecnologías.

Pero eso solo no alcanza, porque los perfiles no siempre están bien etiquetados. Alguien
puede haber trabajado con algo y no haberlo cargado como tag. Por eso también **comparamos
los textos**: la descripción del proyecto contra la descripción del perfil, buscando
coincidencias que los tags se pierden.

Y finalmente sumamos el contexto: **la disponibilidad horaria y el año de carrera**. De nada
sirve recomendarle un proyecto de 20 horas semanales a alguien que tiene 5, o mandar a un
estudiante de primer año a algo que le va a quedar grande.

Las tres cosas se combinan en un puntaje único, y ese puntaje es el que ordena las sugerencias.

### Y sobre todo: medimos si funciona

Cualquiera puede escribir un algoritmo de recomendación. Lo difícil —y lo interesante para
un proyecto final— es demostrar que anda.

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

Todo el proyecto es **TypeScript**, de la base de datos hasta la pantalla. Un solo lenguaje,
un solo ecosistema, sin saltos de contexto.

- **Frontend** — Next.js + React
- **Backend** — NestJS
- **Base de datos** — PostgreSQL
- **Lenguaje** — TypeScript en todo el stack

El motor de recomendación también vive en TypeScript, dentro del backend. No hace falta
sumar otro lenguaje ni otro servicio para esto: los cálculos son sencillos y tenerlos
al lado del resto del código nos ahorra un montón de complejidad innecesaria.

```
PROYECTO-FINAL-UTN/
├── backend/      # API y motor de recomendación
├── frontend/     # La aplicación web
└── README.md
```

## Cómo levantarlo

Todavía no hay código. Esta sección se completa cuando cerremos el setup inicial.

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

## Una honestidad sobre los datos

El punto flojo de una plataforma como esta es que, para mostrarla funcionando, hace falta
gente y proyectos reales. Y no los tenemos todavía.

Lo que vamos a hacer es armar un conjunto de datos simulado pero realista —estudiantes y
proyectos que podrían existir perfectamente— y conseguir algunas búsquedas reales adaptadas
de portales de empleo, para que la demo no se sienta de juguete.

## Hacia dónde vamos

- [ ] Modelar la base de datos
- [ ] Perfiles de estudiantes y publicación de proyectos
- [ ] Motor de recomendación
- [ ] Medición y comparación de resultados
- [ ] Panel de métricas
- [ ] Deploy y presentación

## Quiénes lo hacemos

- Leonel Gonzalez
- *(completar)*
