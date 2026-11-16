-- =============================================================================
-- UTN Match — Datos de ejemplo (dataset simulado)
-- Entrega 2: Diseño y Módulos
--
-- Requiere haber ejecutado antes schema.sql sobre una base vacía.
--
-- Qué contiene:
--   * 3 carreras y sus planes de materias (resumidos).
--   * 43 tecnologías y 8 habilidades.
--   * 1 administrador, 5 empresas/organizaciones, 3 docentes y 20 estudiantes.
--   * 14 proyectos en distintos estados, publicados entre febrero y septiembre de 2026.
--   * 24 postulaciones con su historial de estados completo (alimentan el dashboard).
--   * 5 invitaciones y 2 configuraciones del motor.
--   * Un conjunto de referencia de 48 pares estudiante-proyecto (31 relevantes y 17 no
--     relevantes, 8 de ellos casos límite), propuestos con asistencia de IA. El equipo los
--     revisa y amplía durante la implementación.
--
-- Qué NO contiene (a propósito):
--   * Filas en match ni en evaluacion_motor: las genera el motor de recomendación.
--     Cargar puntajes inventados falsearía la evaluación.
--
-- Notas:
--   * Todos los nombres de personas y organizaciones son ficticios. Los emails usan el
--     dominio reservado .test para que nunca coincidan con cuentas reales.
--   * Contraseña de todos los usuarios de ejemplo: UtnMatch2026!  (hash bcrypt, costo 10).
--   * Las filas se relacionan por claves naturales (email, nombre, título) en lugar de
--     IDs fijos, para que el seed sea legible y no dependa del orden de las IDENTITY.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CATÁLOGOS
-- =============================================================================

INSERT INTO carrera (nombre, duracion_anios) VALUES
    ('Tecnicatura Universitaria en Programación', 2),
    ('Ingeniería en Sistemas de Información',     5),
    ('Ingeniería Electrónica',                    5);

-- Planes resumidos: tomados como referencia de los planes de la UTN; no son exhaustivos.
INSERT INTO materia (id_carrera, nombre, anio_plan, cuatrimestre)
SELECT c.id_carrera, v.nombre, v.anio, v.cuatrimestre
FROM (VALUES
    ('Tecnicatura Universitaria en Programación', 'Programación I',                     1, 1),
    ('Tecnicatura Universitaria en Programación', 'Arquitectura y Sistemas Operativos', 1, 1),
    ('Tecnicatura Universitaria en Programación', 'Matemática',                         1, 1),
    ('Tecnicatura Universitaria en Programación', 'Organización Empresarial',           1, 1),
    ('Tecnicatura Universitaria en Programación', 'Programación II',                    1, 2),
    ('Tecnicatura Universitaria en Programación', 'Probabilidad y Estadística',         1, 2),
    ('Tecnicatura Universitaria en Programación', 'Bases de Datos I',                   1, 2),
    ('Tecnicatura Universitaria en Programación', 'Inglés I',                           1, 2),
    ('Tecnicatura Universitaria en Programación', 'Programación III',                   2, 1),
    ('Tecnicatura Universitaria en Programación', 'Bases de Datos II',                  2, 1),
    ('Tecnicatura Universitaria en Programación', 'Metodología de Sistemas I',          2, 1),
    ('Tecnicatura Universitaria en Programación', 'Inglés II',                          2, 1),
    ('Tecnicatura Universitaria en Programación', 'Programación IV',                    2, 2),
    ('Tecnicatura Universitaria en Programación', 'Metodología de Sistemas II',         2, 2),
    ('Tecnicatura Universitaria en Programación', 'Introducción al Análisis de Datos',  2, 2),
    ('Tecnicatura Universitaria en Programación', 'Legislación',                        2, 2),
    ('Tecnicatura Universitaria en Programación', 'Gestión de Desarrollo de Software',  2, 2),
    ('Ingeniería en Sistemas de Información', 'Algoritmos y Estructuras de Datos',      1, NULL),
    ('Ingeniería en Sistemas de Información', 'Análisis Matemático I',                  1, NULL),
    ('Ingeniería en Sistemas de Información', 'Arquitectura de Computadoras',           1, NULL),
    ('Ingeniería en Sistemas de Información', 'Sistemas y Procesos de Negocio',         1, NULL),
    ('Ingeniería en Sistemas de Información', 'Paradigmas de Programación',             2, NULL),
    ('Ingeniería en Sistemas de Información', 'Sistemas Operativos',                    2, NULL),
    ('Ingeniería en Sistemas de Información', 'Análisis de Sistemas de Información',    2, NULL),
    ('Ingeniería en Sistemas de Información', 'Bases de Datos',                         3, NULL),
    ('Ingeniería en Sistemas de Información', 'Desarrollo de Software',                 3, NULL),
    ('Ingeniería en Sistemas de Información', 'Diseño de Sistemas de Información',      3, NULL),
    ('Ingeniería en Sistemas de Información', 'Ingeniería y Calidad de Software',       4, NULL),
    ('Ingeniería en Sistemas de Información', 'Redes de Datos',                         4, NULL),
    ('Ingeniería en Sistemas de Información', 'Simulación',                             4, NULL),
    ('Ingeniería en Sistemas de Información', 'Inteligencia Artificial',                5, NULL),
    ('Ingeniería en Sistemas de Información', 'Ciencia de Datos',                       5, NULL),
    ('Ingeniería Electrónica', 'Informática I',                                         1, NULL),
    ('Ingeniería Electrónica', 'Informática II',                                        2, NULL),
    ('Ingeniería Electrónica', 'Técnicas Digitales I',                                  3, NULL),
    ('Ingeniería Electrónica', 'Técnicas Digitales II',                                 4, NULL),
    ('Ingeniería Electrónica', 'Sistemas de Control',                                   4, NULL),
    ('Ingeniería Electrónica', 'Técnicas Digitales III',                                5, NULL)
) AS v(carrera, nombre, anio, cuatrimestre)
JOIN carrera c ON c.nombre = v.carrera;

INSERT INTO tecnologia (nombre, categoria) VALUES
    ('JavaScript', 'lenguaje'), ('TypeScript', 'lenguaje'), ('Python', 'lenguaje'),
    ('Java', 'lenguaje'), ('C#', 'lenguaje'), ('PHP', 'lenguaje'), ('C', 'lenguaje'),
    ('Dart', 'lenguaje'), ('SQL', 'lenguaje'),
    ('HTML', 'frontend'), ('CSS', 'frontend'), ('React', 'frontend'), ('Next.js', 'frontend'),
    ('Angular', 'frontend'), ('Vue.js', 'frontend'), ('Tailwind CSS', 'frontend'),
    ('Node.js', 'backend'), ('NestJS', 'backend'), ('Express', 'backend'), ('Spring Boot', 'backend'),
    ('Django', 'backend'), ('FastAPI', 'backend'), ('.NET', 'backend'), ('Laravel', 'backend'),
    ('Firebase', 'backend'),
    ('PostgreSQL', 'base_de_datos'), ('MySQL', 'base_de_datos'), ('MongoDB', 'base_de_datos'),
    ('SQL Server', 'base_de_datos'), ('Redis', 'base_de_datos'),
    ('Git', 'devops'), ('Docker', 'devops'), ('Linux', 'devops'), ('AWS', 'devops'),
    ('Pandas', 'datos'), ('Power BI', 'datos'), ('Scrapy', 'datos'), ('Selenium', 'datos'),
    ('scikit-learn', 'datos'),
    ('React Native', 'mobile'), ('Flutter', 'mobile'),
    ('Arduino', 'hardware'), ('MQTT', 'hardware');

INSERT INTO habilidad (nombre, descripcion) VALUES
    ('Trabajo en equipo',        'Colabora y coordina tareas con otras personas.'),
    ('Comunicación',             'Explica avances y problemas con claridad.'),
    ('Resolución de problemas',  'Descompone problemas y propone soluciones.'),
    ('Autonomía',                'Avanza sin supervisión constante.'),
    ('Inglés técnico',           'Lee documentación técnica en inglés.'),
    ('Documentación técnica',    'Escribe README, guías y comentarios útiles.'),
    ('Metodologías ágiles',      'Trabajó con Scrum o Kanban.'),
    ('Atención al detalle',      'Cuida la calidad y la consistencia del trabajo.');


-- =============================================================================
-- 2. USUARIOS
-- =============================================================================

INSERT INTO usuario (nombre, apellido, email, contrasena_hash, rol, fecha_registro)
SELECT v.nombre, v.apellido, v.email,
       '$2b$10$p4H3N5f8H2w9JEcbGjWA5OEk98Eo/.qf7R63ueji5W91Ux8FLaWiq',
       v.rol::rol_usuario, v.fecha::timestamptz
FROM (VALUES
    -- Administración
    ('Laura',     'Quiroga',    'admin@utnmatch.test',                   'administrador', '2026-02-01 09:00-03'),
    -- Empresas y organizaciones (persona de contacto)
    ('Martín',    'Paz',        'martin.paz@andessoftware.test',         'empresa',       '2026-02-05 10:00-03'),
    ('Gabriela',  'Funes',      'gabriela.funes@agrodatoscuyo.test',     'empresa',       '2026-02-08 11:30-03'),
    ('Diego',     'Lucero',     'diego.lucero@logisticadelsur.test',     'empresa',       '2026-02-14 16:00-03'),
    ('Verónica',  'Arias',      'veronica.arias@saludlosalamos.test',    'empresa',       '2026-03-02 09:15-03'),
    ('Pablo',     'Correa',     'pablo.correa@codigoabierto.test',       'empresa',       '2026-03-20 18:40-03'),
    -- Docentes
    ('Silvia',    'Morales',    'silvia.morales@docentes.utnmatch.test', 'docente',       '2026-02-06 08:30-03'),
    ('Ricardo',   'Villegas',   'ricardo.villegas@docentes.utnmatch.test','docente',      '2026-02-18 14:00-03'),
    ('Andrea',    'Suárez',     'andrea.suarez@docentes.utnmatch.test',  'docente',       '2026-03-01 10:45-03'),
    -- Estudiantes
    ('Lucía',     'Fernández',  'lucia.fernandez@alumnos.utnmatch.test',   'estudiante', '2026-02-10 20:10-03'),
    ('Mateo',     'Giménez',    'mateo.gimenez@alumnos.utnmatch.test',     'estudiante', '2026-02-12 19:00-03'),
    ('Valentina', 'Ríos',       'valentina.rios@alumnos.utnmatch.test',    'estudiante', '2026-02-15 21:30-03'),
    ('Tomás',     'Acosta',     'tomas.acosta@alumnos.utnmatch.test',      'estudiante', '2026-03-01 17:20-03'),
    ('Camila',    'Sosa',       'camila.sosa@alumnos.utnmatch.test',       'estudiante', '2026-02-20 22:05-03'),
    ('Joaquín',   'Medina',     'joaquin.medina@alumnos.utnmatch.test',    'estudiante', '2026-03-05 18:00-03'),
    ('Sofía',     'Herrera',    'sofia.herrera@alumnos.utnmatch.test',     'estudiante', '2026-03-10 12:40-03'),
    ('Nicolás',   'Peralta',    'nicolas.peralta@alumnos.utnmatch.test',   'estudiante', '2026-03-12 15:10-03'),
    ('Martina',   'Castro',     'martina.castro@alumnos.utnmatch.test',    'estudiante', '2026-03-15 11:00-03'),
    ('Agustín',   'Romero',     'agustin.romero@alumnos.utnmatch.test',    'estudiante', '2026-03-20 23:15-03'),
    ('Julieta',   'Molina',     'julieta.molina@alumnos.utnmatch.test',    'estudiante', '2026-04-02 19:45-03'),
    ('Franco',    'Domínguez',  'franco.dominguez@alumnos.utnmatch.test',  'estudiante', '2026-04-05 20:00-03'),
    ('Carolina',  'Vega',       'carolina.vega@alumnos.utnmatch.test',     'estudiante', '2026-04-10 09:30-03'),
    ('Ezequiel',  'Ortiz',      'ezequiel.ortiz@alumnos.utnmatch.test',    'estudiante', '2026-04-15 16:25-03'),
    ('Rocío',     'Navarro',    'rocio.navarro@alumnos.utnmatch.test',     'estudiante', '2026-05-02 18:50-03'),
    ('Bruno',     'Silva',      'bruno.silva@alumnos.utnmatch.test',       'estudiante', '2026-05-10 13:35-03'),
    ('Paula',     'Benítez',    'paula.benitez@alumnos.utnmatch.test',     'estudiante', '2026-05-20 21:00-03'),
    ('Ignacio',   'Luna',       'ignacio.luna@alumnos.utnmatch.test',      'estudiante', '2026-06-01 17:05-03'),
    ('Milagros',  'Cabrera',    'milagros.cabrera@alumnos.utnmatch.test',  'estudiante', '2026-06-15 10:20-03'),
    ('Santiago',  'Aguirre',    'santiago.aguirre@alumnos.utnmatch.test',  'estudiante', '2026-07-01 19:55-03')
) AS v(nombre, apellido, email, rol, fecha);


-- =============================================================================
-- 3. PERFILES
-- =============================================================================

INSERT INTO perfil_empresa (id_usuario, nombre_empresa, sector, descripcion, contacto, sitio_web)
SELECT u.id_usuario, v.nombre_empresa, v.sector, v.descripcion, v.email, v.sitio
FROM (VALUES
    ('martin.paz@andessoftware.test', 'Andes Software SRL', 'Privado — Desarrollo de software',
     'Software factory de 25 personas que desarrolla sistemas de gestión para pymes de la región.',
     'https://andessoftware.test'),
    ('gabriela.funes@agrodatoscuyo.test', 'AgroDatos Cuyo', 'Privado — Agrotecnología',
     'Startup que ofrece información de mercado y relevamientos a productores vitivinícolas y hortícolas.',
     'https://agrodatoscuyo.test'),
    ('diego.lucero@logisticadelsur.test', 'Logística del Sur SA', 'Privado — Logística y transporte',
     'Empresa de distribución con flota propia y depósitos refrigerados.',
     'https://logisticadelsur.test'),
    ('veronica.arias@saludlosalamos.test', 'Centro de Salud Los Álamos', 'Privado — Salud',
     'Centro médico con 12 consultorios; hoy gestiona los turnos por teléfono y planilla.',
     NULL),
    ('pablo.correa@codigoabierto.test', 'Fundación Código Abierto', 'Tercer sector — Educación',
     'ONG que dicta talleres de programación gratuitos en barrios populares.',
     'https://codigoabierto.test')
) AS v(email, nombre_empresa, sector, descripcion, sitio)
JOIN usuario u ON u.email = v.email;

INSERT INTO perfil_docente (id_usuario, catedra, area_investigacion, descripcion)
SELECT u.id_usuario, v.catedra, v.area, v.descripcion
FROM (VALUES
    ('silvia.morales@docentes.utnmatch.test', 'Bases de Datos II', 'Enseñanza de SQL y evaluación automática',
     'Titular de la cátedra. Busca automatizar la corrección de trabajos prácticos de SQL.'),
    ('ricardo.villegas@docentes.utnmatch.test', 'Probabilidad y Estadística', 'Análisis de datos educativos',
     'Estudia el rendimiento académico de las cohortes de la tecnicatura.'),
    ('andrea.suarez@docentes.utnmatch.test', 'Laboratorio de Inteligencia Artificial', 'Procesamiento de lenguaje natural',
     'Dirige un proyecto de investigación sobre clasificación automática de textos en español.')
) AS v(email, catedra, area, descripcion)
JOIN usuario u ON u.email = v.email;

INSERT INTO perfil_estudiante
    (id_usuario, id_carrera, anio_cursada, horas_semanales, descripcion, proyectos_previos, github_url, portfolio_url)
SELECT u.id_usuario, c.id_carrera, v.anio, v.horas, v.descripcion, v.previos, v.github, v.portfolio
FROM (VALUES
    ('lucia.fernandez', 'Tecnicatura Universitaria en Programación', 2, 20,
     'Me interesa el desarrollo frontend. Armo interfaces con React y Next.js y cuido la accesibilidad y el diseño responsive.',
     'Landing para un emprendimiento familiar con Next.js y Tailwind. Clon de un tablero Kanban en React.',
     'https://github.com/demo-lfernandez', 'https://demo-lfernandez.test'),
    ('mateo.gimenez', 'Tecnicatura Universitaria en Programación', 2, 15,
     'Backend con Node.js y NestJS. Diseño APIs REST y modelo bases de datos relacionales en PostgreSQL.',
     'API de reservas para un club con NestJS, PostgreSQL y Docker.',
     'https://github.com/demo-mgimenez', NULL),
    ('valentina.rios', 'Ingeniería en Sistemas de Información', 3, 10,
     'Me gusta el análisis de datos: limpieza con Pandas, consultas SQL y tableros en Power BI.',
     'Tablero de indicadores de ventas para un comercio del barrio. Análisis de encuestas de la facultad.',
     'https://github.com/demo-vrios', NULL),
    ('tomas.acosta', 'Tecnicatura Universitaria en Programación', 1, 8,
     'Estoy empezando. Hice páginas estáticas con HTML, CSS y JavaScript y uso Git.',
     'Página personal estática.',
     'https://github.com/demo-tacosta', NULL),
    ('camila.sosa', 'Ingeniería en Sistemas de Información', 4, 20,
     'Desarrollo backend en Java con Spring Boot, bases MySQL y contenedores Docker.',
     'Sistema de inventario para un taller mecánico con Spring Boot y MySQL.',
     'https://github.com/demo-csosa', NULL),
    ('joaquin.medina', 'Ingeniería en Sistemas de Información', 5, 12,
     'Me interesa el aprendizaje automático y el procesamiento de lenguaje natural. Uso Python, scikit-learn y FastAPI.',
     'Clasificador de reseñas de productos con scikit-learn expuesto como API con FastAPI.',
     'https://github.com/demo-jmedina', NULL),
    ('sofia.herrera', 'Tecnicatura Universitaria en Programación', 2, 12,
     'Automatizo tareas repetitivas con Python: scraping con Scrapy y Selenium y carga de datos en PostgreSQL.',
     'Scraper de precios de supermercados que guarda históricos en PostgreSQL.',
     'https://github.com/demo-sherrera', NULL),
    ('nicolas.peralta', 'Ingeniería Electrónica', 4, 12,
     'Sistemas embebidos e IoT: programo microcontroladores en C y Arduino y envío datos por MQTT.',
     'Estación meteorológica con Arduino que publica mediciones por MQTT.',
     'https://github.com/demo-nperalta', NULL),
    ('martina.castro', 'Tecnicatura Universitaria en Programación', 1, 10,
     'Aprendo desarrollo web: maquetado con HTML y CSS, JavaScript y primeros pasos en React.',
     'Sitio de recetas con HTML, CSS y JavaScript.',
     'https://github.com/demo-mcastro', NULL),
    ('agustin.romero', 'Ingeniería en Sistemas de Información', 3, 15,
     'Desarrollo aplicaciones móviles con React Native y Firebase, siempre en TypeScript.',
     'App de lista de compras compartida con React Native y Firebase.',
     'https://github.com/demo-aromero', NULL),
    ('julieta.molina', 'Ingeniería en Sistemas de Información', 2, 8,
     'Me gustan las bases de datos y resolver consultas SQL complejas. Programo en Python.',
     'Ejercicios de SQL resueltos y documentados para compañeros.',
     'https://github.com/demo-jmolina', NULL),
    ('franco.dominguez', 'Tecnicatura Universitaria en Programación', 2, 25,
     'Desarrollador full stack con Next.js, NestJS y PostgreSQL. Despliego con Docker.',
     'Sistema de turnos para una peluquería con Next.js y NestJS. Panel de administración con React.',
     'https://github.com/demo-fdominguez', 'https://demo-fdominguez.test'),
    ('carolina.vega', 'Ingeniería en Sistemas de Información', 5, 8,
     'Trabajo con C# y .NET y bases SQL Server. Me interesa la calidad de software y las pruebas.',
     'API de gestión académica en .NET con pruebas automatizadas.',
     'https://github.com/demo-cvega', NULL),
    ('ezequiel.ortiz', 'Ingeniería Electrónica', 5, 12,
     'Electrónica aplicada y monitoreo remoto de sensores. Programo en C y Python sobre Linux.',
     'Sistema de alarma con sensores de temperatura y notificaciones.',
     'https://github.com/demo-eortiz', NULL),
    ('rocio.navarro', 'Tecnicatura Universitaria en Programación', 1, 12,
     'Estoy aprendiendo Python y SQL y quiero orientarme a datos.',
     NULL,
     NULL, NULL),
    ('bruno.silva', 'Ingeniería en Sistemas de Información', 4, 15,
     'Desarrollo web con PHP y Laravel en el backend y Vue.js en el frontend, con MySQL.',
     'Portal de clasificados con Laravel y Vue.js.',
     'https://github.com/demo-bsilva', NULL),
    ('paula.benitez', 'Tecnicatura Universitaria en Programación', 2, 10,
     'Frontend con Angular y TypeScript; APIs con Node.js y MongoDB.',
     'Gestor de tareas con Angular y una API en Node.js con MongoDB.',
     'https://github.com/demo-pbenitez', NULL),
    ('ignacio.luna', 'Ingeniería en Sistemas de Información', 3, 20,
     'Apps móviles multiplataforma con Flutter y Dart, conectadas a Firebase.',
     'App de seguimiento de hábitos publicada como prueba interna.',
     'https://github.com/demo-iluna', NULL),
    ('milagros.cabrera', 'Tecnicatura Universitaria en Programación', 2, 8,
     'Desarrollo web con Python y Django sobre PostgreSQL. Me interesa la visualización de datos.',
     'Blog con Django y PostgreSQL.',
     'https://github.com/demo-mcabrera', NULL),
    ('santiago.aguirre', 'Ingeniería en Sistemas de Información', 1, 6,
     'Primer año. Programo en Python y en C para la facultad y uso Git.',
     NULL,
     NULL, NULL)
) AS v(usuario, carrera, anio, horas, descripcion, previos, github, portfolio)
JOIN usuario u ON u.email = v.usuario || '@alumnos.utnmatch.test'
JOIN carrera c ON c.nombre = v.carrera;


-- =============================================================================
-- 4. DATOS DEL PERFIL DEL ESTUDIANTE
-- =============================================================================

INSERT INTO estudiante_tecnologia (id_estudiante, id_tecnologia, nivel)
SELECT e.id_estudiante, t.id_tecnologia, v.nivel::nivel_tecnologia
FROM (VALUES
    ('lucia.fernandez', 'React', 'avanzado'), ('lucia.fernandez', 'Next.js', 'intermedio'),
    ('lucia.fernandez', 'TypeScript', 'intermedio'), ('lucia.fernandez', 'Tailwind CSS', 'avanzado'),
    ('lucia.fernandez', 'HTML', 'avanzado'), ('lucia.fernandez', 'CSS', 'avanzado'), ('lucia.fernandez', 'Git', 'intermedio'),
    ('mateo.gimenez', 'Node.js', 'avanzado'), ('mateo.gimenez', 'NestJS', 'intermedio'),
    ('mateo.gimenez', 'TypeScript', 'avanzado'), ('mateo.gimenez', 'PostgreSQL', 'intermedio'),
    ('mateo.gimenez', 'Docker', 'basico'), ('mateo.gimenez', 'Git', 'intermedio'),
    ('valentina.rios', 'Python', 'intermedio'), ('valentina.rios', 'Pandas', 'avanzado'),
    ('valentina.rios', 'SQL', 'avanzado'), ('valentina.rios', 'PostgreSQL', 'intermedio'), ('valentina.rios', 'Power BI', 'intermedio'),
    ('tomas.acosta', 'HTML', 'intermedio'), ('tomas.acosta', 'CSS', 'intermedio'),
    ('tomas.acosta', 'JavaScript', 'basico'), ('tomas.acosta', 'Git', 'basico'),
    ('camila.sosa', 'Java', 'avanzado'), ('camila.sosa', 'Spring Boot', 'intermedio'),
    ('camila.sosa', 'MySQL', 'intermedio'), ('camila.sosa', 'Docker', 'intermedio'), ('camila.sosa', 'Git', 'avanzado'),
    ('joaquin.medina', 'Python', 'avanzado'), ('joaquin.medina', 'scikit-learn', 'intermedio'),
    ('joaquin.medina', 'FastAPI', 'intermedio'), ('joaquin.medina', 'Pandas', 'avanzado'), ('joaquin.medina', 'Docker', 'basico'),
    ('sofia.herrera', 'Python', 'avanzado'), ('sofia.herrera', 'Scrapy', 'intermedio'),
    ('sofia.herrera', 'Selenium', 'intermedio'), ('sofia.herrera', 'PostgreSQL', 'intermedio'), ('sofia.herrera', 'SQL', 'intermedio'),
    ('nicolas.peralta', 'C', 'avanzado'), ('nicolas.peralta', 'Arduino', 'avanzado'),
    ('nicolas.peralta', 'MQTT', 'intermedio'), ('nicolas.peralta', 'Python', 'basico'), ('nicolas.peralta', 'Linux', 'intermedio'),
    ('martina.castro', 'HTML', 'intermedio'), ('martina.castro', 'CSS', 'intermedio'),
    ('martina.castro', 'JavaScript', 'intermedio'), ('martina.castro', 'React', 'basico'),
    ('agustin.romero', 'React Native', 'intermedio'), ('agustin.romero', 'Firebase', 'intermedio'),
    ('agustin.romero', 'TypeScript', 'intermedio'), ('agustin.romero', 'JavaScript', 'avanzado'), ('agustin.romero', 'React', 'intermedio'),
    ('julieta.molina', 'SQL', 'avanzado'), ('julieta.molina', 'PostgreSQL', 'intermedio'),
    ('julieta.molina', 'Python', 'intermedio'), ('julieta.molina', 'Git', 'basico'),
    ('franco.dominguez', 'Next.js', 'avanzado'), ('franco.dominguez', 'React', 'avanzado'),
    ('franco.dominguez', 'NestJS', 'intermedio'), ('franco.dominguez', 'TypeScript', 'avanzado'),
    ('franco.dominguez', 'PostgreSQL', 'intermedio'), ('franco.dominguez', 'Docker', 'intermedio'), ('franco.dominguez', 'Linux', 'basico'),
    ('carolina.vega', 'C#', 'avanzado'), ('carolina.vega', '.NET', 'avanzado'),
    ('carolina.vega', 'SQL Server', 'intermedio'), ('carolina.vega', 'Git', 'intermedio'),
    ('ezequiel.ortiz', 'C', 'avanzado'), ('ezequiel.ortiz', 'Python', 'intermedio'),
    ('ezequiel.ortiz', 'Linux', 'intermedio'), ('ezequiel.ortiz', 'Arduino', 'intermedio'),
    ('rocio.navarro', 'Python', 'basico'), ('rocio.navarro', 'SQL', 'basico'),
    ('bruno.silva', 'PHP', 'avanzado'), ('bruno.silva', 'Laravel', 'intermedio'),
    ('bruno.silva', 'Vue.js', 'intermedio'), ('bruno.silva', 'MySQL', 'intermedio'), ('bruno.silva', 'JavaScript', 'intermedio'),
    ('paula.benitez', 'Angular', 'intermedio'), ('paula.benitez', 'TypeScript', 'intermedio'),
    ('paula.benitez', 'Node.js', 'intermedio'), ('paula.benitez', 'MongoDB', 'basico'),
    ('ignacio.luna', 'Flutter', 'intermedio'), ('ignacio.luna', 'Dart', 'intermedio'), ('ignacio.luna', 'Firebase', 'basico'),
    ('milagros.cabrera', 'Python', 'intermedio'), ('milagros.cabrera', 'Django', 'intermedio'),
    ('milagros.cabrera', 'PostgreSQL', 'basico'), ('milagros.cabrera', 'HTML', 'intermedio'), ('milagros.cabrera', 'CSS', 'basico'),
    ('santiago.aguirre', 'Python', 'basico'), ('santiago.aguirre', 'C', 'basico'), ('santiago.aguirre', 'Git', 'basico')
) AS v(usuario, tecnologia, nivel)
JOIN usuario u           ON u.email = v.usuario || '@alumnos.utnmatch.test'
JOIN perfil_estudiante e ON e.id_usuario = u.id_usuario
JOIN tecnologia t        ON t.nombre = v.tecnologia;

INSERT INTO estudiante_habilidad (id_estudiante, id_habilidad)
SELECT e.id_estudiante, h.id_habilidad
FROM (VALUES
    ('lucia.fernandez', 'Atención al detalle'), ('lucia.fernandez', 'Trabajo en equipo'),
    ('mateo.gimenez', 'Resolución de problemas'), ('mateo.gimenez', 'Documentación técnica'),
    ('valentina.rios', 'Comunicación'), ('valentina.rios', 'Atención al detalle'),
    ('tomas.acosta', 'Trabajo en equipo'),
    ('camila.sosa', 'Metodologías ágiles'), ('camila.sosa', 'Trabajo en equipo'),
    ('joaquin.medina', 'Inglés técnico'), ('joaquin.medina', 'Autonomía'),
    ('sofia.herrera', 'Autonomía'), ('sofia.herrera', 'Resolución de problemas'),
    ('nicolas.peralta', 'Resolución de problemas'),
    ('martina.castro', 'Comunicación'),
    ('agustin.romero', 'Autonomía'),
    ('julieta.molina', 'Documentación técnica'), ('julieta.molina', 'Atención al detalle'),
    ('franco.dominguez', 'Metodologías ágiles'), ('franco.dominguez', 'Autonomía'), ('franco.dominguez', 'Inglés técnico'),
    ('carolina.vega', 'Atención al detalle'), ('carolina.vega', 'Metodologías ágiles'),
    ('ezequiel.ortiz', 'Resolución de problemas'),
    ('bruno.silva', 'Trabajo en equipo'),
    ('paula.benitez', 'Comunicación'),
    ('ignacio.luna', 'Autonomía'),
    ('milagros.cabrera', 'Documentación técnica')
) AS v(usuario, habilidad)
JOIN usuario u           ON u.email = v.usuario || '@alumnos.utnmatch.test'
JOIN perfil_estudiante e ON e.id_usuario = u.id_usuario
JOIN habilidad h         ON h.nombre = v.habilidad;

-- Materias aprobadas generadas por regla, coherentes con el año de cursada:
-- se aprueban las de años anteriores y las del primer cuatrimestre del año actual.
INSERT INTO materia_aprobada (id_estudiante, id_materia)
SELECT e.id_estudiante, m.id_materia
FROM perfil_estudiante e
JOIN materia m ON m.id_carrera = e.id_carrera
WHERE m.anio_plan < e.anio_cursada
   OR (m.anio_plan = e.anio_cursada AND m.cuatrimestre = 1);


-- =============================================================================
-- 5. PROYECTOS
-- =============================================================================

-- publicador: email del usuario empresa o docente que publica.
INSERT INTO proyecto
    (id_empresa, id_docente, titulo, descripcion, objetivos, perfil_buscado, duracion_semanas,
     horas_semanales, anio_minimo, cupos, modalidad, tipo_retribucion, detalle_retribucion,
     estado, fecha_publicacion, fecha_cierre)
SELECT pe.id_empresa, pd.id_docente, v.titulo, v.descripcion, v.objetivos, v.perfil, v.semanas,
       v.horas, v.anio, v.cupos, v.modalidad::modalidad, v.retribucion::tipo_retribucion, v.detalle,
       v.estado::estado_proyecto, v.publicacion::timestamptz, v.cierre::timestamptz
FROM (VALUES
    ('gabriela.funes@agrodatoscuyo.test', 'Scraper de precios de insumos agrícolas',
     'Necesitamos un scraper que recorra sitios de proveedores de fertilizantes y agroquímicos, normalice los precios y los guarde en PostgreSQL para armar series históricas.',
     'Tener precios actualizados semanalmente de al menos 5 proveedores.',
     'Estudiante con Python y nociones de scraping y bases de datos.',
     8, 10, 1, 1, 'remoto', 'remunerado', 'ARS 350.000 por el proyecto completo',
     'en_curso', '2026-03-10 09:00-03', NULL),
    ('martin.paz@andessoftware.test', 'Dashboard de ventas para gerencia comercial',
     'Tablero web en React y TypeScript que consume una API en Node.js y muestra indicadores de ventas desde PostgreSQL.',
     'Reemplazar los reportes manuales en planilla por un tablero con filtros por período y vendedor.',
     'Frontend con React y TypeScript; se valora conocer Node.js.',
     10, 15, 2, 2, 'hibrido', 'remunerado', 'Pago mensual acordado según horas',
     'en_curso', '2026-03-18 10:00-03', NULL),
    ('veronica.arias@saludlosalamos.test', 'MVP de gestión de turnos para consultorios',
     'Aplicación web con Next.js y API NestJS sobre PostgreSQL para que los pacientes saquen turno online y los médicos vean su agenda.',
     'Validar con 3 consultorios que los pacientes prefieren el turno online al telefónico.',
     'Perfil full stack con TypeScript.',
     12, 20, 2, 2, 'remoto', 'practica_profesional', 'Válido como Práctica Profesional Supervisada (200 h)',
     'publicado', '2026-04-05 08:30-03', NULL),
    ('diego.lucero@logisticadelsur.test', 'Automatización de reportes de flota',
     'Script en Python con Pandas que consolida las planillas diarias de los choferes y genera un reporte semanal de kilómetros y consumo.',
     'Eliminar 6 horas semanales de trabajo manual administrativo.',
     'Estudiante con Python básico y ganas de aprender Pandas.',
     6, 8, 1, 1, 'remoto', 'remunerado', 'ARS 200.000 por el proyecto completo',
     'finalizado', '2026-03-25 11:00-03', '2026-05-20 17:00-03'),
    ('pablo.correa@codigoabierto.test', 'Sitio web institucional para la fundación',
     'Sitio estático y accesible con HTML, CSS y JavaScript para difundir los talleres de la fundación y recibir inscripciones.',
     'Publicar el sitio antes del inicio de los talleres de invierno.',
     'Primeros años; se valora el cuidado por la accesibilidad.',
     6, 6, 1, 1, 'remoto', 'certificado', 'Certificado de voluntariado emitido por la fundación',
     'en_curso', '2026-04-15 19:00-03', NULL),
    ('diego.lucero@logisticadelsur.test', 'API de trazabilidad de envíos',
     'Servicio REST en Java con Spring Boot y MySQL que registra cada evento de un envío y lo expone a clientes. Despliegue con Docker.',
     'Que los clientes consulten el estado de su envío sin llamar por teléfono.',
     'Backend Java con experiencia en bases relacionales.',
     16, 20, 3, 2, 'presencial', 'remunerado', 'Pasantía rentada de 20 h semanales',
     'publicado', '2026-05-05 09:00-03', NULL),
    ('silvia.morales@docentes.utnmatch.test', 'Corrector automático de ejercicios SQL',
     'Herramienta en Python que ejecuta las consultas SQL entregadas por los alumnos contra una base PostgreSQL en Docker y compara el resultado con la solución.',
     'Reducir el tiempo de corrección de los trabajos prácticos de la cátedra.',
     'Buen manejo de SQL y Python.',
     12, 8, 2, 1, 'remoto', 'certificado', 'Certificado de colaboración con la cátedra',
     'en_curso', '2026-04-20 12:00-03', NULL),
    ('ricardo.villegas@docentes.utnmatch.test', 'Visualizador de rendimiento académico',
     'Procesamiento con Python y Pandas de datos anonimizados de cursada y visualizaciones interactivas del rendimiento por cohorte.',
     'Detectar materias con alta tasa de abandono.',
     'Interés en estadística y análisis de datos.',
     10, 10, 2, 2, 'hibrido', 'practica_profesional', 'Válido como Práctica Profesional Supervisada',
     'publicado', '2026-05-15 10:00-03', NULL),
    ('andrea.suarez@docentes.utnmatch.test', 'Clasificador de consultas de alumnos con NLP',
     'Modelo de clasificación de texto con scikit-learn que etiqueta las consultas que llegan a la secretaría y lo expone como API con FastAPI.',
     'Derivar automáticamente cada consulta al área que corresponde.',
     'Estudiante avanzado con Python y nociones de machine learning.',
     16, 12, 4, 1, 'remoto', 'certificado', 'Participación como colaborador en el proyecto de investigación',
     'en_curso', '2026-06-01 09:00-03', NULL),
    ('gabriela.funes@agrodatoscuyo.test', 'App móvil de relevamiento a campo',
     'Aplicación móvil con React Native y Firebase para que los técnicos carguen relevamientos sin conexión y los sincronicen al volver.',
     'Digitalizar los relevamientos que hoy se hacen en papel.',
     'Desarrollo mobile.',
     12, 15, 3, 1, 'remoto', 'remunerado', 'A definir',
     'borrador', NULL, NULL),
    ('diego.lucero@logisticadelsur.test', 'Monitoreo de temperatura en cámaras de frío',
     'Prototipo con sensores sobre Arduino programado en C que publica la temperatura por MQTT y dispara alertas.',
     'Evitar pérdidas de mercadería por cortes de frío no detectados.',
     'Electrónica o sistemas con experiencia en microcontroladores.',
     10, 12, 3, 2, 'presencial', 'practica_profesional', 'Válido como Práctica Profesional Supervisada',
     'publicado', '2026-06-20 08:00-03', NULL),
    ('martin.paz@andessoftware.test', 'Migración de la landing corporativa a Next.js',
     'Migrar la landing actual en HTML a Next.js con React y Tailwind CSS, mejorando rendimiento y SEO.',
     'Mejorar el puntaje de rendimiento de la landing.',
     'Frontend con React.',
     4, 10, 1, 1, 'remoto', 'remunerado', 'ARS 250.000 por el proyecto completo',
     'finalizado', '2026-02-25 10:00-03', '2026-04-10 18:00-03'),
    ('martin.paz@andessoftware.test', 'Panel de monitoreo de servidores',
     'Panel web en React y TypeScript que muestra el estado de los servidores Linux y los contenedores Docker de los clientes.',
     'Detectar caídas antes de que las reporten los clientes.',
     'Full stack con interés en infraestructura.',
     8, 15, 3, 1, 'hibrido', 'remunerado', 'Pago mensual acordado según horas',
     'publicado', '2026-08-10 09:00-03', NULL),
    ('veronica.arias@saludlosalamos.test', 'Portal de resultados de laboratorio',
     'Portal web en Angular con API en Node.js y MongoDB para que los pacientes descarguen sus resultados de laboratorio.',
     'Reducir las consultas presenciales para retirar resultados.',
     'Frontend Angular y backend Node.js.',
     10, 10, 2, 1, 'remoto', 'practica_profesional', 'Válido como Práctica Profesional Supervisada',
     'publicado', '2026-09-02 10:00-03', NULL)
) AS v(publicador, titulo, descripcion, objetivos, perfil, semanas, horas, anio, cupos, modalidad,
       retribucion, detalle, estado, publicacion, cierre)
JOIN usuario u ON u.email = v.publicador
LEFT JOIN perfil_empresa pe ON pe.id_usuario = u.id_usuario
LEFT JOIN perfil_docente pd ON pd.id_usuario = u.id_usuario;

INSERT INTO proyecto_tecnologia (id_proyecto, id_tecnologia, obligatoria)
SELECT p.id_proyecto, t.id_tecnologia, v.obligatoria
FROM (VALUES
    ('Scraper de precios de insumos agrícolas', 'Python', true),
    ('Scraper de precios de insumos agrícolas', 'Scrapy', true),
    ('Scraper de precios de insumos agrícolas', 'PostgreSQL', true),
    ('Scraper de precios de insumos agrícolas', 'Selenium', false),
    ('Dashboard de ventas para gerencia comercial', 'React', true),
    ('Dashboard de ventas para gerencia comercial', 'TypeScript', true),
    ('Dashboard de ventas para gerencia comercial', 'Node.js', true),
    ('Dashboard de ventas para gerencia comercial', 'PostgreSQL', true),
    ('Dashboard de ventas para gerencia comercial', 'Power BI', false),
    ('MVP de gestión de turnos para consultorios', 'Next.js', true),
    ('MVP de gestión de turnos para consultorios', 'NestJS', true),
    ('MVP de gestión de turnos para consultorios', 'TypeScript', true),
    ('MVP de gestión de turnos para consultorios', 'PostgreSQL', true),
    ('MVP de gestión de turnos para consultorios', 'Docker', false),
    ('Automatización de reportes de flota', 'Python', true),
    ('Automatización de reportes de flota', 'Pandas', true),
    ('Automatización de reportes de flota', 'SQL', false),
    ('Sitio web institucional para la fundación', 'HTML', true),
    ('Sitio web institucional para la fundación', 'CSS', true),
    ('Sitio web institucional para la fundación', 'JavaScript', true),
    ('Sitio web institucional para la fundación', 'React', false),
    ('API de trazabilidad de envíos', 'Java', true),
    ('API de trazabilidad de envíos', 'Spring Boot', true),
    ('API de trazabilidad de envíos', 'MySQL', true),
    ('API de trazabilidad de envíos', 'Docker', false),
    ('Corrector automático de ejercicios SQL', 'Python', true),
    ('Corrector automático de ejercicios SQL', 'SQL', true),
    ('Corrector automático de ejercicios SQL', 'PostgreSQL', true),
    ('Corrector automático de ejercicios SQL', 'Docker', false),
    ('Visualizador de rendimiento académico', 'Python', true),
    ('Visualizador de rendimiento académico', 'Pandas', true),
    ('Visualizador de rendimiento académico', 'React', false),
    ('Visualizador de rendimiento académico', 'Power BI', false),
    ('Clasificador de consultas de alumnos con NLP', 'Python', true),
    ('Clasificador de consultas de alumnos con NLP', 'scikit-learn', true),
    ('Clasificador de consultas de alumnos con NLP', 'FastAPI', true),
    ('App móvil de relevamiento a campo', 'React Native', true),
    ('App móvil de relevamiento a campo', 'Firebase', true),
    ('App móvil de relevamiento a campo', 'TypeScript', false),
    ('Monitoreo de temperatura en cámaras de frío', 'C', true),
    ('Monitoreo de temperatura en cámaras de frío', 'Arduino', true),
    ('Monitoreo de temperatura en cámaras de frío', 'MQTT', true),
    ('Monitoreo de temperatura en cámaras de frío', 'Python', false),
    ('Migración de la landing corporativa a Next.js', 'Next.js', true),
    ('Migración de la landing corporativa a Next.js', 'React', true),
    ('Migración de la landing corporativa a Next.js', 'Tailwind CSS', true),
    ('Panel de monitoreo de servidores', 'React', true),
    ('Panel de monitoreo de servidores', 'TypeScript', true),
    ('Panel de monitoreo de servidores', 'Docker', true),
    ('Panel de monitoreo de servidores', 'Linux', true),
    ('Portal de resultados de laboratorio', 'Angular', true),
    ('Portal de resultados de laboratorio', 'Node.js', true),
    ('Portal de resultados de laboratorio', 'MongoDB', true),
    ('Portal de resultados de laboratorio', 'TypeScript', false)
) AS v(proyecto, tecnologia, obligatoria)
JOIN proyecto p   ON p.titulo = v.proyecto
JOIN tecnologia t ON t.nombre = v.tecnologia;

INSERT INTO proyecto_habilidad (id_proyecto, id_habilidad)
SELECT p.id_proyecto, h.id_habilidad
FROM (VALUES
    ('Scraper de precios de insumos agrícolas', 'Autonomía'),
    ('Scraper de precios de insumos agrícolas', 'Documentación técnica'),
    ('Dashboard de ventas para gerencia comercial', 'Comunicación'),
    ('Dashboard de ventas para gerencia comercial', 'Trabajo en equipo'),
    ('MVP de gestión de turnos para consultorios', 'Metodologías ágiles'),
    ('MVP de gestión de turnos para consultorios', 'Comunicación'),
    ('Sitio web institucional para la fundación', 'Atención al detalle'),
    ('API de trazabilidad de envíos', 'Trabajo en equipo'),
    ('Corrector automático de ejercicios SQL', 'Documentación técnica'),
    ('Visualizador de rendimiento académico', 'Comunicación'),
    ('Clasificador de consultas de alumnos con NLP', 'Inglés técnico'),
    ('Monitoreo de temperatura en cámaras de frío', 'Resolución de problemas')
) AS v(proyecto, habilidad)
JOIN proyecto p  ON p.titulo = v.proyecto
JOIN habilidad h ON h.nombre = v.habilidad;


-- =============================================================================
-- 6. INVITACIONES Y POSTULACIONES
-- =============================================================================

INSERT INTO invitacion
    (id_proyecto, id_estudiante, id_usuario_invitador, mensaje, estado, fecha_invitacion, fecha_respuesta)
SELECT p.id_proyecto, e.id_estudiante, ui.id_usuario, v.mensaje, v.estado::estado_invitacion,
       v.fecha::timestamptz, v.respuesta::timestamptz
FROM (VALUES
    ('Clasificador de consultas de alumnos con NLP', 'joaquin.medina', 'andrea.suarez@docentes.utnmatch.test',
     'Vimos tu clasificador de reseñas y creemos que encajás muy bien.', 'aceptada', '2026-06-02 10:00-03', '2026-06-04 18:00-03'),
    ('Monitoreo de temperatura en cámaras de frío', 'ezequiel.ortiz', 'diego.lucero@logisticadelsur.test',
     'Tu experiencia con sensores es justo lo que buscamos.', 'aceptada', '2026-06-26 09:00-03', '2026-06-27 20:00-03'),
    ('Visualizador de rendimiento académico', 'julieta.molina', 'ricardo.villegas@docentes.utnmatch.test',
     '¿Te interesaría sumarte al análisis de datos de la cátedra?', 'rechazada', '2026-05-18 11:00-03', '2026-05-19 21:00-03'),
    ('Portal de resultados de laboratorio', 'paula.benitez', 'veronica.arias@saludlosalamos.test',
     'Buscamos a alguien con Angular y Node.js como vos.', 'aceptada', '2026-09-03 10:00-03', '2026-09-04 19:30-03'),
    ('Panel de monitoreo de servidores', 'ignacio.luna', 'martin.paz@andessoftware.test',
     'Nos gustaría conocerte para este proyecto.', 'pendiente', '2026-08-20 15:00-03', NULL)
) AS v(proyecto, usuario, invitador, mensaje, estado, fecha, respuesta)
JOIN proyecto p          ON p.titulo = v.proyecto
JOIN usuario u           ON u.email = v.usuario || '@alumnos.utnmatch.test'
JOIN perfil_estudiante e ON e.id_usuario = u.id_usuario
JOIN usuario ui          ON ui.email = v.invitador;

-- Cada postulación se inserta en estado 'pendiente' y luego recorre sus estados con
-- fechas explícitas. El trigger trg_postulacion_historial registra cada paso, así el
-- historial queda igual al que generaría la aplicación real.
--   estados[i] se alcanza dias[i] días después de la fecha de postulación.
-- Cuando un estudiante acepta una invitación, el backend crea la postulación en estado
-- pendiente en ese mismo momento: por eso esas postulaciones tienen la fecha de respuesta.
DO $$
DECLARE
    r        RECORD;
    v_est    BIGINT;
    v_proy   BIGINT;
    v_post   BIGINT;
    i        INT;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('lucia.fernandez',  'Migración de la landing corporativa a Next.js', '2026-02-27 21:00-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[1,4,7]),
            ('mateo.gimenez',    'Dashboard de ventas para gerencia comercial',   '2026-03-20 20:30-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[2,6,12]),
            ('lucia.fernandez',  'Dashboard de ventas para gerencia comercial',   '2026-03-21 22:00-03',
             ARRAY['en_revision','entrevista','rechazada'], ARRAY[2,6,12]),
            ('agustin.romero',   'Dashboard de ventas para gerencia comercial',   '2026-03-25 23:40-03',
             ARRAY['en_revision','rechazada'], ARRAY[3,8]),
            ('sofia.herrera',    'Scraper de precios de insumos agrícolas',       '2026-03-20 13:00-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[2,6,10]),
            ('valentina.rios',   'Automatización de reportes de flota',           '2026-03-28 19:00-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[1,4,8]),
            ('lucia.fernandez',  'MVP de gestión de turnos para consultorios',    '2026-04-08 18:00-03',
             ARRAY['en_revision','rechazada'], ARRAY[3,9]),
            ('franco.dominguez', 'MVP de gestión de turnos para consultorios',    '2026-04-10 21:15-03',
             ARRAY['en_revision','entrevista'], ARRAY[1,2]),
            ('mateo.gimenez',    'MVP de gestión de turnos para consultorios',    '2026-04-12 20:00-03',
             ARRAY['en_revision'], ARRAY[4]),
            ('martina.castro',   'Sitio web institucional para la fundación',     '2026-04-20 17:30-03',
             ARRAY['en_revision','aceptada'], ARRAY[3,9]),
            ('tomas.acosta',     'Sitio web institucional para la fundación',     '2026-04-22 22:10-03',
             ARRAY['retirada'], ARRAY[5]),
            ('julieta.molina',   'Corrector automático de ejercicios SQL',        '2026-04-25 19:20-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[2,7,14]),
            ('sofia.herrera',    'Corrector automático de ejercicios SQL',        '2026-04-28 12:00-03',
             ARRAY['retirada'], ARRAY[3]),
            ('camila.sosa',      'API de trazabilidad de envíos',                 '2026-05-08 20:45-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[2,8,15]),
            ('bruno.silva',      'API de trazabilidad de envíos',                 '2026-05-12 18:00-03',
             ARRAY['en_revision','rechazada'], ARRAY[4,10]),
            ('valentina.rios',   'Visualizador de rendimiento académico',         '2026-05-20 20:00-03',
             ARRAY['en_revision','entrevista'], ARRAY[3,10]),
            ('rocio.navarro',    'Visualizador de rendimiento académico',         '2026-05-22 19:00-03',
             ARRAY['en_revision','rechazada'], ARRAY[4,7]),
            ('joaquin.medina',   'Clasificador de consultas de alumnos con NLP',  '2026-06-04 18:00-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[1,5,12]),
            ('milagros.cabrera', 'Visualizador de rendimiento académico',         '2026-06-20 16:00-03',
             ARRAY[]::text[], ARRAY[]::int[]),
            ('nicolas.peralta',  'Monitoreo de temperatura en cámaras de frío',   '2026-06-25 15:00-03',
             ARRAY['en_revision','entrevista','aceptada'], ARRAY[2,6,10]),
            ('ezequiel.ortiz',   'Monitoreo de temperatura en cámaras de frío',   '2026-06-27 20:00-03',
             ARRAY['en_revision','entrevista'], ARRAY[3,8]),
            ('franco.dominguez', 'Panel de monitoreo de servidores',              '2026-08-12 21:00-03',
             ARRAY['en_revision','entrevista'], ARRAY[2,7]),
            ('carolina.vega',    'Panel de monitoreo de servidores',              '2026-08-15 09:40-03',
             ARRAY['en_revision'], ARRAY[5]),
            ('paula.benitez',    'Portal de resultados de laboratorio',           '2026-09-04 19:30-03',
             ARRAY[]::text[], ARRAY[]::int[])
        ) AS t(usuario, proyecto, fecha, estados, dias)
    LOOP
        SELECT e.id_estudiante INTO STRICT v_est
        FROM perfil_estudiante e
        JOIN usuario u ON u.id_usuario = e.id_usuario
        WHERE u.email = r.usuario || '@alumnos.utnmatch.test';

        SELECT id_proyecto INTO STRICT v_proy FROM proyecto WHERE titulo = r.proyecto;

        INSERT INTO postulacion (id_estudiante, id_proyecto, estado, fecha_postulacion, fecha_actualizacion)
        VALUES (v_est, v_proy, 'pendiente', r.fecha::timestamptz, r.fecha::timestamptz)
        RETURNING id_postulacion INTO v_post;

        FOR i IN 1 .. coalesce(array_length(r.estados, 1), 0) LOOP
            UPDATE postulacion
               SET estado = r.estados[i]::estado_postulacion,
                   fecha_actualizacion = r.fecha::timestamptz + make_interval(days => r.dias[i])
             WHERE id_postulacion = v_post;
        END LOOP;
    END LOOP;
END;
$$;


-- =============================================================================
-- 7. MOTOR: CONFIGURACIONES Y CONJUNTO DE REFERENCIA
-- =============================================================================

INSERT INTO configuracion_motor
    (nombre, descripcion, peso_tecnologias, peso_texto, peso_contexto, umbral_recomendacion, activa)
VALUES
    ('v1-tags-contexto',
     'Primera versión simple (plan de viabilidad de la Entrega 1): similitud de tecnologías + contexto, sin análisis de texto.',
     0.700, 0.000, 0.300, 0.500, true),
    ('v2-tags-texto-contexto',
     'Versión completa: suma la similitud de textos entre la descripción del proyecto y el perfil.',
     0.500, 0.300, 0.200, 0.500, false);

-- Conjunto de referencia: 31 pares relevantes y 17 no relevantes, propuestos con asistencia
-- de IA; el equipo los revisa y amplía durante la implementación. Los últimos 8 no relevantes
-- son casos límite: comparten parte del stack, pero no alcanzan por año o les faltan
-- tecnologías obligatorias. Algunos obtienen un puntaje alto, así que ponen a prueba al motor.
-- La evaluación usa solo estos pares; un par sin etiquetar no cuenta ni como acierto ni
-- como error.
INSERT INTO match_referencia (id_estudiante, id_proyecto, es_relevante, id_usuario_etiquetador, observacion, fecha_etiquetado)
SELECT e.id_estudiante, p.id_proyecto, v.relevante, adm.id_usuario, v.obs, '2026-09-15 18:00-03'::timestamptz
FROM (VALUES
    ('lucia.fernandez',  'Migración de la landing corporativa a Next.js', true,  'Coincidencia total de stack frontend'),
    ('lucia.fernandez',  'MVP de gestión de turnos para consultorios',    true,  'Next.js y TypeScript; le falta backend'),
    ('lucia.fernandez',  'Dashboard de ventas para gerencia comercial',   true,  'React y TypeScript'),
    ('lucia.fernandez',  'Sitio web institucional para la fundación',     true,  'Frontend y accesibilidad'),
    ('lucia.fernandez',  'API de trazabilidad de envíos',                 false, 'Stack Java, sin relación'),
    ('lucia.fernandez',  'Monitoreo de temperatura en cámaras de frío',   false, 'Hardware, sin relación'),
    ('mateo.gimenez',    'MVP de gestión de turnos para consultorios',    true,  'NestJS y PostgreSQL'),
    ('mateo.gimenez',    'Dashboard de ventas para gerencia comercial',   true,  'Node.js y PostgreSQL'),
    ('mateo.gimenez',    'Corrector automático de ejercicios SQL',        true,  'Fuerte en bases de datos'),
    ('mateo.gimenez',    'Visualizador de rendimiento académico',         false, 'No trabaja con datos'),
    ('valentina.rios',   'Automatización de reportes de flota',           true,  'Pandas avanzado'),
    ('valentina.rios',   'Visualizador de rendimiento académico',         true,  'Análisis y visualización de datos'),
    ('valentina.rios',   'Scraper de precios de insumos agrícolas',       true,  'Python y PostgreSQL'),
    ('valentina.rios',   'Sitio web institucional para la fundación',     false, 'Perfil de datos, no web'),
    ('sofia.herrera',    'Scraper de precios de insumos agrícolas',       true,  'Scrapy y Selenium'),
    ('sofia.herrera',    'Automatización de reportes de flota',           true,  'Automatización con Python'),
    ('sofia.herrera',    'Corrector automático de ejercicios SQL',        true,  'Python y SQL'),
    ('tomas.acosta',     'Sitio web institucional para la fundación',     true,  'Nivel inicial acorde'),
    ('tomas.acosta',     'Clasificador de consultas de alumnos con NLP',  false, 'Requiere 4.º año'),
    ('tomas.acosta',     'API de trazabilidad de envíos',                 false, 'Requiere 3.er año y 20 h'),
    ('camila.sosa',      'API de trazabilidad de envíos',                 true,  'Java y Spring Boot'),
    ('camila.sosa',      'Sitio web institucional para la fundación',     false, 'Sobrecalificada, otro stack'),
    ('joaquin.medina',   'Clasificador de consultas de alumnos con NLP',  true,  'Machine learning y FastAPI'),
    ('joaquin.medina',   'Visualizador de rendimiento académico',         true,  'Pandas avanzado'),
    ('joaquin.medina',   'Corrector automático de ejercicios SQL',        true,  'Python'),
    ('nicolas.peralta',  'Monitoreo de temperatura en cámaras de frío',   true,  'Arduino, C y MQTT'),
    ('nicolas.peralta',  'MVP de gestión de turnos para consultorios',    false, 'Sin experiencia web'),
    ('franco.dominguez', 'MVP de gestión de turnos para consultorios',    true,  'Stack idéntico'),
    ('franco.dominguez', 'Panel de monitoreo de servidores',              true,  'React, Docker y Linux'),
    ('franco.dominguez', 'Dashboard de ventas para gerencia comercial',   true,  'React y TypeScript'),
    ('franco.dominguez', 'Migración de la landing corporativa a Next.js', true,  'Next.js avanzado'),
    ('julieta.molina',   'Corrector automático de ejercicios SQL',        true,  'SQL avanzado'),
    ('julieta.molina',   'Automatización de reportes de flota',           true,  'Python y horas justas'),
    ('agustin.romero',   'Dashboard de ventas para gerencia comercial',   true,  'React y TypeScript'),
    ('agustin.romero',   'Sitio web institucional para la fundación',     true,  'JavaScript avanzado'),
    ('ezequiel.ortiz',   'Monitoreo de temperatura en cámaras de frío',   true,  'Sensores y C'),
    ('paula.benitez',    'Portal de resultados de laboratorio',           true,  'Angular, Node.js y MongoDB'),
    ('paula.benitez',    'Dashboard de ventas para gerencia comercial',   true,  'TypeScript y Node.js'),
    ('carolina.vega',    'Panel de monitoreo de servidores',              false, 'Stack .NET, sin React ni Docker'),
    ('rocio.navarro',    'Automatización de reportes de flota',           true,  'Python básico, año mínimo 1'),
    ('mateo.gimenez',    'Panel de monitoreo de servidores',              false, 'Comparte TypeScript y Docker, pero no sabe React y está por debajo del año mínimo'),
    ('lucia.fernandez',  'Portal de resultados de laboratorio',           false, 'Frontend y TypeScript, pero el proyecto pide Angular y MongoDB'),
    ('sofia.herrera',    'Clasificador de consultas de alumnos con NLP',  false, 'Python avanzado, pero sin machine learning y por debajo del año mínimo'),
    ('camila.sosa',      'Panel de monitoreo de servidores',              false, 'Tiene Docker y las horas, pero no conoce el stack web'),
    ('franco.dominguez', 'Portal de resultados de laboratorio',           false, 'TypeScript avanzado, pero el proyecto pide Angular, Node.js y MongoDB'),
    ('ezequiel.ortiz',   'Scraper de precios de insumos agrícolas',       false, 'Python intermedio, pero sin scraping ni bases de datos'),
    ('rocio.navarro',    'Corrector automático de ejercicios SQL',        false, 'Python y SQL básicos en primer año; el proyecto pide segundo año y PostgreSQL'),
    ('agustin.romero',   'Panel de monitoreo de servidores',              false, 'React y TypeScript, pero le faltan Docker y Linux, que el proyecto exige')
) AS v(usuario, proyecto, relevante, obs)
JOIN usuario u           ON u.email = v.usuario || '@alumnos.utnmatch.test'
JOIN perfil_estudiante e ON e.id_usuario = u.id_usuario
JOIN proyecto p          ON p.titulo = v.proyecto
CROSS JOIN (SELECT id_usuario FROM usuario WHERE email = 'admin@utnmatch.test') AS adm;


-- =============================================================================
-- 8. COMUNICACIÓN
-- =============================================================================

INSERT INTO mensaje (id_remitente, id_destinatario, id_proyecto, contenido, fecha_envio, leido)
SELECT r.id_usuario, d.id_usuario, p.id_proyecto, v.contenido, v.fecha::timestamptz, v.leido
FROM (VALUES
    ('veronica.arias@saludlosalamos.test', 'franco.dominguez@alumnos.utnmatch.test',
     'MVP de gestión de turnos para consultorios',
     'Hola Franco, ¿podés el jueves 16 a las 10 para una entrevista por videollamada?', '2026-04-13 09:00-03', true),
    ('franco.dominguez@alumnos.utnmatch.test', 'veronica.arias@saludlosalamos.test',
     'MVP de gestión de turnos para consultorios',
     '¡Hola Verónica! Sí, el jueves a las 10 me queda perfecto.', '2026-04-13 12:30-03', true),
    ('martin.paz@andessoftware.test', 'ignacio.luna@alumnos.utnmatch.test',
     'Panel de monitoreo de servidores',
     'Hola Ignacio, te dejamos una invitación para el panel de monitoreo. ¡Avisanos cualquier duda!', '2026-08-20 15:05-03', false)
) AS v(remitente, destinatario, proyecto, contenido, fecha, leido)
JOIN usuario r  ON r.email = v.remitente
JOIN usuario d  ON d.email = v.destinatario
JOIN proyecto p ON p.titulo = v.proyecto;

INSERT INTO notificacion (id_usuario, tipo, mensaje, url_referencia, fecha, leida, enviada_email)
SELECT u.id_usuario, v.tipo::tipo_notificacion, v.mensaje, v.url, v.fecha::timestamptz, v.leida, v.email
FROM (VALUES
    ('ignacio.luna@alumnos.utnmatch.test', 'invitacion',
     'Andes Software SRL te invitó al proyecto «Panel de monitoreo de servidores».', '/invitaciones',
     '2026-08-20 15:00-03', false, true),
    ('franco.dominguez@alumnos.utnmatch.test', 'cambio_estado_postulacion',
     'Tu postulación a «Panel de monitoreo de servidores» pasó a «entrevista».', '/postulaciones',
     '2026-08-19 21:00-03', true, true),
    ('martin.paz@andessoftware.test', 'nueva_postulacion',
     'Carolina Vega se postuló a «Panel de monitoreo de servidores».', '/mis-proyectos/1',
     '2026-08-15 09:40-03', true, true)
) AS v(usuario, tipo, mensaje, url, fecha, leida, email)
JOIN usuario u ON u.email = v.usuario;

COMMIT;
