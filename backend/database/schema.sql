-- =============================================================================
-- UTN Match — Esquema de base de datos
-- Entrega 2: Diseño y Módulos
--
-- Motor:      PostgreSQL 15 o superior (compatible con Supabase).
-- Ejecución:  sobre una base VACÍA, por ejemplo:
--               psql -d utn_match -f schema.sql
--               psql -d utn_match -f seed.sql
-- Documentación: docs/entrega-2/DER.md y docs/entrega-2/MODULOS.md
--
-- Convenciones:
--   * Tablas en singular y snake_case, siguiendo las entidades de la Entrega 1.
--   * PK con el formato id_<entidad>, generadas con IDENTITY.
--   * Sin tildes ni "ñ" en identificadores (anio_cursada, contrasena_hash).
--   * Fechas con zona horaria (TIMESTAMPTZ); días calendario con DATE.
--   * No depende de ninguna extensión de PostgreSQL.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. TIPOS ENUMERADOS
-- =============================================================================

-- Roles definidos en RF-01.
CREATE TYPE rol_usuario AS ENUM ('estudiante', 'empresa', 'docente', 'administrador');

-- Modalidad de trabajo de un proyecto (Módulo 2).
CREATE TYPE modalidad AS ENUM ('remoto', 'presencial', 'hibrido');

-- Qué ofrece el proyecto a cambio: plata, práctica profesional o certificado.
CREATE TYPE tipo_retribucion AS ENUM ('remunerado', 'practica_profesional', 'certificado');

-- Ciclo de vida del proyecto. "suspendido" lo asigna el administrador al moderar.
CREATE TYPE estado_proyecto AS ENUM
    ('borrador', 'publicado', 'en_curso', 'finalizado', 'cancelado', 'suspendido');

-- Ciclo de vida de la postulación. "aceptada" = proyecto cerrado para el estudiante.
-- Estados finales: aceptada, rechazada, retirada.
CREATE TYPE estado_postulacion AS ENUM
    ('pendiente', 'en_revision', 'entrevista', 'aceptada', 'rechazada', 'retirada');

CREATE TYPE estado_invitacion AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- Eventos que generan notificaciones (RF-08).
CREATE TYPE tipo_notificacion AS ENUM
    ('nuevo_match', 'invitacion', 'cambio_estado_postulacion', 'cambio_estado_proyecto', 'mensaje_nuevo');

CREATE TYPE nivel_tecnologia AS ENUM ('basico', 'intermedio', 'avanzado');

-- Permite agrupar el ranking de tecnologías demandadas en el dashboard.
CREATE TYPE categoria_tecnologia AS ENUM
    ('lenguaje', 'frontend', 'backend', 'base_de_datos', 'devops', 'datos', 'mobile', 'hardware');


-- =============================================================================
-- 2. FUNCIONES DE SOPORTE (usadas por triggers)
-- =============================================================================

-- Actualiza postulacion.fecha_actualizacion en cada UPDATE, salvo que el UPDATE la informe
-- explícitamente (lo necesita el seed para cargar historia con fechas pasadas).
CREATE FUNCTION fn_set_fecha_actualizacion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.fecha_actualizacion IS NOT DISTINCT FROM OLD.fecha_actualizacion THEN
        NEW.fecha_actualizacion := now();
    END IF;
    RETURN NEW;
END;
$$;

-- Garantiza que cada perfil pertenezca a un usuario con el rol correspondiente.
-- Uso: EXECUTE FUNCTION fn_validar_rol_perfil('estudiante').
CREATE FUNCTION fn_validar_rol_perfil() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_rol rol_usuario;
BEGIN
    SELECT rol INTO v_rol FROM usuario WHERE id_usuario = NEW.id_usuario;
    IF v_rol IS DISTINCT FROM TG_ARGV[0]::rol_usuario THEN
        RAISE EXCEPTION 'El usuario % tiene rol %, pero la tabla % exige rol %',
            NEW.id_usuario, v_rol, TG_TABLE_NAME, TG_ARGV[0];
    END IF;
    RETURN NEW;
END;
$$;

-- Registra en postulacion_historial el alta y cada cambio de estado.
-- El usuario responsable se toma de la variable de sesión utn_match.id_usuario,
-- que el backend fija con: SET LOCAL utn_match.id_usuario = '<id>';
CREATE FUNCTION fn_registrar_historial_postulacion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_responsable BIGINT := NULLIF(current_setting('utn_match.id_usuario', true), '')::BIGINT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO postulacion_historial
            (id_postulacion, estado_anterior, estado_nuevo, fecha_cambio, id_usuario_responsable)
        VALUES
            (NEW.id_postulacion, NULL, NEW.estado, NEW.fecha_postulacion, v_responsable);
    ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
        INSERT INTO postulacion_historial
            (id_postulacion, estado_anterior, estado_nuevo, fecha_cambio, id_usuario_responsable)
        VALUES
            (NEW.id_postulacion, OLD.estado, NEW.estado, NEW.fecha_actualizacion, v_responsable);
    END IF;
    RETURN NULL;
END;
$$;


-- =============================================================================
-- 3. USUARIOS Y PERFILES (Módulo 1)
-- =============================================================================

CREATE TABLE usuario (
    id_usuario          BIGINT GENERATED ALWAYS AS IDENTITY,
    nombre              VARCHAR(80)  NOT NULL,
    apellido            VARCHAR(80)  NOT NULL,
    email               VARCHAR(160) NOT NULL,
    contrasena_hash     VARCHAR(100) NOT NULL,          -- bcrypt (RNF-03), nunca texto plano
    rol                 rol_usuario  NOT NULL,
    fecha_registro      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    activo              BOOLEAN      NOT NULL DEFAULT true,
    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT ck_usuario_email CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT ck_usuario_hash  CHECK (length(contrasena_hash) >= 50)
);
-- Email único sin distinguir mayúsculas.
CREATE UNIQUE INDEX uq_usuario_email ON usuario (lower(email));
CREATE INDEX ix_usuario_rol ON usuario (rol);

COMMENT ON TABLE usuario IS
    'Datos comunes de toda persona que usa la plataforma. El rol determina qué perfil puede tener.';

-- La recuperación de contraseña (Módulo 1) no necesita tabla: usa un token firmado con
-- vencimiento que incluye un fragmento de contrasena_hash. Al cambiar la contraseña, el
-- hash cambia y el token deja de ser válido, por lo que es de un solo uso.

-- Catálogo de carreras: permite agrupar métricas "por carrera" y colgar el plan de materias.
CREATE TABLE carrera (
    id_carrera          BIGINT GENERATED ALWAYS AS IDENTITY,
    nombre              VARCHAR(120) NOT NULL,
    CONSTRAINT pk_carrera PRIMARY KEY (id_carrera),
    CONSTRAINT uq_carrera_nombre UNIQUE (nombre)
);

CREATE TABLE perfil_estudiante (
    id_estudiante       BIGINT GENERATED ALWAYS AS IDENTITY,
    id_usuario          BIGINT       NOT NULL,
    id_carrera          BIGINT       NOT NULL,
    anio_cursada        SMALLINT     NOT NULL,
    horas_semanales     SMALLINT     NOT NULL,          -- horas disponibles por semana (motor: contexto)
    descripcion         TEXT,                           -- motor: similitud de textos
    proyectos_previos   TEXT,                           -- RF-02; también entra en la similitud de textos
    cv_url              VARCHAR(300),
    github_url          VARCHAR(300),
    portfolio_url       VARCHAR(300),
    CONSTRAINT pk_perfil_estudiante PRIMARY KEY (id_estudiante),
    CONSTRAINT uq_perfil_estudiante_usuario UNIQUE (id_usuario),     -- relación 1 : 0..1
    CONSTRAINT fk_perfil_estudiante_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_perfil_estudiante_carrera FOREIGN KEY (id_carrera)
        REFERENCES carrera (id_carrera) ON DELETE RESTRICT,
    CONSTRAINT ck_perfil_estudiante_anio  CHECK (anio_cursada BETWEEN 1 AND 6),
    CONSTRAINT ck_perfil_estudiante_horas CHECK (horas_semanales BETWEEN 1 AND 60)
);
CREATE INDEX ix_perfil_estudiante_carrera_anio ON perfil_estudiante (id_carrera, anio_cursada);

CREATE TRIGGER trg_perfil_estudiante_rol
    BEFORE INSERT OR UPDATE OF id_usuario ON perfil_estudiante
    FOR EACH ROW EXECUTE FUNCTION fn_validar_rol_perfil('estudiante');

CREATE TABLE perfil_empresa (
    id_empresa          BIGINT GENERATED ALWAYS AS IDENTITY,
    id_usuario          BIGINT       NOT NULL,
    nombre_empresa      VARCHAR(150) NOT NULL,
    sector              VARCHAR(100) NOT NULL,          -- privado, público o tercer sector + rubro
    descripcion         TEXT,
    contacto            VARCHAR(150) NOT NULL,
    sitio_web           VARCHAR(300),
    CONSTRAINT pk_perfil_empresa PRIMARY KEY (id_empresa),
    CONSTRAINT uq_perfil_empresa_usuario UNIQUE (id_usuario),
    CONSTRAINT fk_perfil_empresa_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

CREATE TRIGGER trg_perfil_empresa_rol
    BEFORE INSERT OR UPDATE OF id_usuario ON perfil_empresa
    FOR EACH ROW EXECUTE FUNCTION fn_validar_rol_perfil('empresa');

CREATE TABLE perfil_docente (
    id_docente          BIGINT GENERATED ALWAYS AS IDENTITY,
    id_usuario          BIGINT       NOT NULL,
    catedra             VARCHAR(150) NOT NULL,
    area_investigacion  VARCHAR(150),
    descripcion         TEXT,
    CONSTRAINT pk_perfil_docente PRIMARY KEY (id_docente),
    CONSTRAINT uq_perfil_docente_usuario UNIQUE (id_usuario),
    CONSTRAINT fk_perfil_docente_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

CREATE TRIGGER trg_perfil_docente_rol
    BEFORE INSERT OR UPDATE OF id_usuario ON perfil_docente
    FOR EACH ROW EXECUTE FUNCTION fn_validar_rol_perfil('docente');


-- =============================================================================
-- 4. CATÁLOGOS: TECNOLOGÍAS, HABILIDADES Y MATERIAS
-- =============================================================================

CREATE TABLE tecnologia (
    id_tecnologia       BIGINT GENERATED ALWAYS AS IDENTITY,
    nombre              VARCHAR(60)          NOT NULL,
    categoria           categoria_tecnologia NOT NULL,
    descripcion         VARCHAR(300),
    CONSTRAINT pk_tecnologia PRIMARY KEY (id_tecnologia)
);
-- Evita duplicados como "React" y "react", que romperían la similitud de tags.
CREATE UNIQUE INDEX uq_tecnologia_nombre ON tecnologia (lower(nombre));

CREATE TABLE habilidad (
    id_habilidad        BIGINT GENERATED ALWAYS AS IDENTITY,
    nombre              VARCHAR(80)  NOT NULL,
    descripcion         VARCHAR(300),
    CONSTRAINT pk_habilidad PRIMARY KEY (id_habilidad)
);
CREATE UNIQUE INDEX uq_habilidad_nombre ON habilidad (lower(nombre));

-- Plan de estudios: materias de cada carrera.
CREATE TABLE materia (
    id_materia          BIGINT GENERATED ALWAYS AS IDENTITY,
    id_carrera          BIGINT       NOT NULL,
    nombre              VARCHAR(120) NOT NULL,
    anio_plan           SMALLINT     NOT NULL,          -- año del plan en que se cursa
    cuatrimestre        SMALLINT,                       -- NULL = materia anual
    CONSTRAINT pk_materia PRIMARY KEY (id_materia),
    CONSTRAINT fk_materia_carrera FOREIGN KEY (id_carrera)
        REFERENCES carrera (id_carrera) ON DELETE CASCADE,
    CONSTRAINT uq_materia_carrera_nombre UNIQUE (id_carrera, nombre),
    CONSTRAINT ck_materia_anio CHECK (anio_plan BETWEEN 1 AND 6),
    CONSTRAINT ck_materia_cuatrimestre CHECK (cuatrimestre IN (1, 2))
);


-- =============================================================================
-- 5. RELACIONES N:M DEL ESTUDIANTE
-- =============================================================================

CREATE TABLE estudiante_tecnologia (
    id_estudiante       BIGINT           NOT NULL,
    id_tecnologia       BIGINT           NOT NULL,
    nivel               nivel_tecnologia NOT NULL DEFAULT 'basico',
    CONSTRAINT pk_estudiante_tecnologia PRIMARY KEY (id_estudiante, id_tecnologia),
    CONSTRAINT fk_est_tec_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES perfil_estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_est_tec_tecnologia FOREIGN KEY (id_tecnologia)
        REFERENCES tecnologia (id_tecnologia) ON DELETE RESTRICT
);
-- Búsqueda inversa: "qué estudiantes conocen la tecnología X".
CREATE INDEX ix_est_tec_tecnologia ON estudiante_tecnologia (id_tecnologia);

CREATE TABLE estudiante_habilidad (
    id_estudiante       BIGINT NOT NULL,
    id_habilidad        BIGINT NOT NULL,
    CONSTRAINT pk_estudiante_habilidad PRIMARY KEY (id_estudiante, id_habilidad),
    CONSTRAINT fk_est_hab_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES perfil_estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_est_hab_habilidad FOREIGN KEY (id_habilidad)
        REFERENCES habilidad (id_habilidad) ON DELETE RESTRICT
);
CREATE INDEX ix_est_hab_habilidad ON estudiante_habilidad (id_habilidad);

CREATE TABLE materia_aprobada (
    id_estudiante       BIGINT   NOT NULL,
    id_materia          BIGINT   NOT NULL,
    CONSTRAINT pk_materia_aprobada PRIMARY KEY (id_estudiante, id_materia),
    CONSTRAINT fk_mat_apr_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES perfil_estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_mat_apr_materia FOREIGN KEY (id_materia)
        REFERENCES materia (id_materia) ON DELETE RESTRICT
);
CREATE INDEX ix_mat_apr_materia ON materia_aprobada (id_materia);


-- =============================================================================
-- 6. PROYECTOS (Módulo 2)
-- =============================================================================

CREATE TABLE proyecto (
    id_proyecto         BIGINT GENERATED ALWAYS AS IDENTITY,
    -- Publicador: exactamente uno de los dos (ver ck_proyecto_un_publicador).
    id_empresa          BIGINT,
    id_docente          BIGINT,
    titulo              VARCHAR(150)     NOT NULL,
    descripcion         TEXT             NOT NULL,      -- motor: similitud de textos
    objetivos           TEXT,
    perfil_buscado      TEXT,                           -- "perfiles necesarios" (RF-03)
    duracion_semanas    SMALLINT         NOT NULL,
    horas_semanales     SMALLINT         NOT NULL,      -- motor: contexto (vs. horas del estudiante)
    anio_minimo         SMALLINT         NOT NULL DEFAULT 1,  -- motor: contexto (vs. año de cursada)
    cupos               SMALLINT         NOT NULL DEFAULT 1,
    modalidad           modalidad        NOT NULL,
    tipo_retribucion    tipo_retribucion NOT NULL,
    detalle_retribucion VARCHAR(300),                   -- monto, horas de PPS, tipo de certificado
    estado              estado_proyecto  NOT NULL DEFAULT 'borrador',
    fecha_publicacion   TIMESTAMPTZ,                    -- base de la métrica de tecnologías demandadas
    fecha_cierre        TIMESTAMPTZ,
    CONSTRAINT pk_proyecto PRIMARY KEY (id_proyecto),
    CONSTRAINT fk_proyecto_empresa FOREIGN KEY (id_empresa)
        REFERENCES perfil_empresa (id_empresa) ON DELETE RESTRICT,
    CONSTRAINT fk_proyecto_docente FOREIGN KEY (id_docente)
        REFERENCES perfil_docente (id_docente) ON DELETE RESTRICT,
    CONSTRAINT ck_proyecto_un_publicador CHECK (num_nonnulls(id_empresa, id_docente) = 1),
    CONSTRAINT ck_proyecto_duracion CHECK (duracion_semanas BETWEEN 1 AND 52),
    CONSTRAINT ck_proyecto_horas    CHECK (horas_semanales BETWEEN 1 AND 40),
    CONSTRAINT ck_proyecto_anio     CHECK (anio_minimo BETWEEN 1 AND 6),
    CONSTRAINT ck_proyecto_cupos    CHECK (cupos BETWEEN 1 AND 20),
    -- Todo proyecto que salió de borrador tiene fecha de publicación.
    CONSTRAINT ck_proyecto_publicacion CHECK (estado = 'borrador' OR fecha_publicacion IS NOT NULL),
    CONSTRAINT ck_proyecto_cierre CHECK (fecha_cierre IS NULL OR fecha_cierre >= fecha_publicacion)
);
-- Índices parciales: cada FK solo indexa las filas donde tiene valor.
CREATE INDEX ix_proyecto_empresa ON proyecto (id_empresa) WHERE id_empresa IS NOT NULL;
CREATE INDEX ix_proyecto_docente ON proyecto (id_docente) WHERE id_docente IS NOT NULL;
CREATE INDEX ix_proyecto_estado ON proyecto (estado);
CREATE INDEX ix_proyecto_fecha_publicacion ON proyecto (fecha_publicacion);

COMMENT ON TABLE proyecto IS
    'Oportunidad publicada por una empresa (id_empresa) o por un docente/cátedra (id_docente), nunca ambos.';

CREATE TABLE proyecto_tecnologia (
    id_proyecto         BIGINT  NOT NULL,
    id_tecnologia       BIGINT  NOT NULL,
    obligatoria         BOOLEAN NOT NULL DEFAULT true,  -- false = deseable
    CONSTRAINT pk_proyecto_tecnologia PRIMARY KEY (id_proyecto, id_tecnologia),
    CONSTRAINT fk_proy_tec_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES proyecto (id_proyecto) ON DELETE CASCADE,
    CONSTRAINT fk_proy_tec_tecnologia FOREIGN KEY (id_tecnologia)
        REFERENCES tecnologia (id_tecnologia) ON DELETE RESTRICT
);
CREATE INDEX ix_proy_tec_tecnologia ON proyecto_tecnologia (id_tecnologia);

CREATE TABLE proyecto_habilidad (
    id_proyecto         BIGINT NOT NULL,
    id_habilidad        BIGINT NOT NULL,
    CONSTRAINT pk_proyecto_habilidad PRIMARY KEY (id_proyecto, id_habilidad),
    CONSTRAINT fk_proy_hab_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES proyecto (id_proyecto) ON DELETE CASCADE,
    CONSTRAINT fk_proy_hab_habilidad FOREIGN KEY (id_habilidad)
        REFERENCES habilidad (id_habilidad) ON DELETE RESTRICT
);
CREATE INDEX ix_proy_hab_habilidad ON proyecto_habilidad (id_habilidad);


-- =============================================================================
-- 7. POSTULACIONES E INVITACIONES (Módulos 3 y 4)
-- =============================================================================

CREATE TABLE invitacion (
    id_invitacion        BIGINT GENERATED ALWAYS AS IDENTITY,
    id_proyecto          BIGINT            NOT NULL,
    id_estudiante        BIGINT            NOT NULL,
    id_usuario_invitador BIGINT            NOT NULL,
    mensaje              TEXT,
    estado               estado_invitacion NOT NULL DEFAULT 'pendiente',
    fecha_invitacion     TIMESTAMPTZ       NOT NULL DEFAULT now(),
    fecha_respuesta      TIMESTAMPTZ,
    CONSTRAINT pk_invitacion PRIMARY KEY (id_invitacion),
    CONSTRAINT fk_invitacion_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES proyecto (id_proyecto) ON DELETE CASCADE,
    CONSTRAINT fk_invitacion_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES perfil_estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_invitacion_invitador FOREIGN KEY (id_usuario_invitador)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
    CONSTRAINT uq_invitacion_proyecto_estudiante UNIQUE (id_proyecto, id_estudiante),
    CONSTRAINT ck_invitacion_respuesta CHECK (
        (estado = 'pendiente' AND fecha_respuesta IS NULL)
        OR (estado <> 'pendiente' AND fecha_respuesta IS NOT NULL AND fecha_respuesta >= fecha_invitacion)
    )
);
CREATE INDEX ix_invitacion_estudiante ON invitacion (id_estudiante, estado);

-- La invitación que originó una postulación se obtiene uniendo por el par
-- (id_estudiante, id_proyecto), que es único en ambas tablas.
CREATE TABLE postulacion (
    id_postulacion       BIGINT GENERATED ALWAYS AS IDENTITY,
    id_estudiante        BIGINT             NOT NULL,
    id_proyecto          BIGINT             NOT NULL,
    mensaje_presentacion TEXT,
    estado               estado_postulacion NOT NULL DEFAULT 'pendiente',
    fecha_postulacion    TIMESTAMPTZ        NOT NULL DEFAULT now(),
    fecha_actualizacion  TIMESTAMPTZ        NOT NULL DEFAULT now(),
    CONSTRAINT pk_postulacion PRIMARY KEY (id_postulacion),
    CONSTRAINT fk_postulacion_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES perfil_estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_postulacion_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES proyecto (id_proyecto) ON DELETE CASCADE,
    -- Un estudiante se postula una sola vez a cada proyecto.
    CONSTRAINT uq_postulacion_estudiante_proyecto UNIQUE (id_estudiante, id_proyecto),
    CONSTRAINT ck_postulacion_fechas CHECK (fecha_actualizacion >= fecha_postulacion)
);
CREATE INDEX ix_postulacion_proyecto_estado ON postulacion (id_proyecto, estado);
CREATE INDEX ix_postulacion_estado ON postulacion (estado);

-- Historial de estados: base del embudo y del "tiempo hasta el primer proyecto".
CREATE TABLE postulacion_historial (
    id_historial           BIGINT GENERATED ALWAYS AS IDENTITY,
    id_postulacion         BIGINT             NOT NULL,
    estado_anterior        estado_postulacion,          -- NULL en el alta
    estado_nuevo           estado_postulacion NOT NULL,
    fecha_cambio           TIMESTAMPTZ        NOT NULL DEFAULT now(),
    id_usuario_responsable BIGINT,
    CONSTRAINT pk_postulacion_historial PRIMARY KEY (id_historial),
    CONSTRAINT fk_historial_postulacion FOREIGN KEY (id_postulacion)
        REFERENCES postulacion (id_postulacion) ON DELETE CASCADE,
    CONSTRAINT fk_historial_responsable FOREIGN KEY (id_usuario_responsable)
        REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    CONSTRAINT ck_historial_cambio CHECK (estado_anterior IS DISTINCT FROM estado_nuevo)
);
CREATE INDEX ix_historial_postulacion ON postulacion_historial (id_postulacion, fecha_cambio);
CREATE INDEX ix_historial_estado_nuevo ON postulacion_historial (estado_nuevo, fecha_cambio);

CREATE TRIGGER trg_postulacion_fecha
    BEFORE UPDATE ON postulacion
    FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion();
CREATE TRIGGER trg_postulacion_historial
    AFTER INSERT OR UPDATE OF estado ON postulacion
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_historial_postulacion();


-- =============================================================================
-- 8. MOTOR DE RECOMENDACIÓN Y SU EVALUACIÓN (Módulo 3)
-- =============================================================================

-- Cada fila es una "forma de calcular la afinidad": pesos de los componentes y umbral.
-- Permite comparar configuraciones con números (RF-10).
CREATE TABLE configuracion_motor (
    id_configuracion     BIGINT GENERATED ALWAYS AS IDENTITY,
    nombre               VARCHAR(60)  NOT NULL,
    descripcion          VARCHAR(500),
    peso_tecnologias     NUMERIC(4,3) NOT NULL,
    peso_texto           NUMERIC(4,3) NOT NULL,
    peso_contexto        NUMERIC(4,3) NOT NULL,
    umbral_recomendacion NUMERIC(4,3) NOT NULL DEFAULT 0.500,  -- puntaje mínimo para recomendar
    activa               BOOLEAN      NOT NULL DEFAULT false,
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_configuracion_motor PRIMARY KEY (id_configuracion),
    CONSTRAINT uq_configuracion_nombre UNIQUE (nombre),
    CONSTRAINT ck_config_pesos_rango CHECK (
        peso_tecnologias BETWEEN 0 AND 1 AND peso_texto BETWEEN 0 AND 1 AND peso_contexto BETWEEN 0 AND 1),
    CONSTRAINT ck_config_pesos_suma CHECK (peso_tecnologias + peso_texto + peso_contexto = 1),
    CONSTRAINT ck_config_umbral CHECK (umbral_recomendacion BETWEEN 0 AND 1)
);
-- Solo puede haber UNA configuración activa (la que ven los usuarios).
CREATE UNIQUE INDEX uq_configuracion_activa ON configuracion_motor (activa) WHERE activa;

-- Entidad "Match" de la Entrega 1: resultado del motor para un par estudiante–proyecto.
CREATE TABLE match (
    id_match             BIGINT GENERATED ALWAYS AS IDENTITY,
    id_estudiante        BIGINT       NOT NULL,
    id_proyecto          BIGINT       NOT NULL,
    id_configuracion     BIGINT       NOT NULL,
    puntaje_total        NUMERIC(5,4) NOT NULL,
    puntaje_tecnologias  NUMERIC(5,4) NOT NULL,
    puntaje_texto        NUMERIC(5,4),                  -- NULL si la configuración no lo calcula
    puntaje_contexto     NUMERIC(5,4) NOT NULL,
    fecha_calculo        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_match PRIMARY KEY (id_match),
    CONSTRAINT fk_match_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES perfil_estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_match_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES proyecto (id_proyecto) ON DELETE CASCADE,
    CONSTRAINT fk_match_configuracion FOREIGN KEY (id_configuracion)
        REFERENCES configuracion_motor (id_configuracion) ON DELETE CASCADE,
    -- Un puntaje por par y configuración: al recalcular se actualiza la fila (UPSERT).
    CONSTRAINT uq_match_par_configuracion UNIQUE (id_estudiante, id_proyecto, id_configuracion),
    CONSTRAINT ck_match_total       CHECK (puntaje_total       BETWEEN 0 AND 1),
    CONSTRAINT ck_match_tecnologias CHECK (puntaje_tecnologias BETWEEN 0 AND 1),
    CONSTRAINT ck_match_texto       CHECK (puntaje_texto       BETWEEN 0 AND 1),
    CONSTRAINT ck_match_contexto    CHECK (puntaje_contexto    BETWEEN 0 AND 1)
);
-- Ranking "proyectos recomendados para un estudiante" y "estudiantes recomendados para un proyecto".
CREATE INDEX ix_match_ranking_estudiante ON match (id_estudiante, id_configuracion, puntaje_total DESC);
CREATE INDEX ix_match_ranking_proyecto   ON match (id_proyecto, id_configuracion, puntaje_total DESC);

COMMENT ON TABLE match IS
    'Puntaje de compatibilidad (0 a 1) por par estudiante–proyecto y configuración. puntaje_total = suma ponderada de los componentes.';
COMMENT ON COLUMN match.puntaje_tecnologias IS 'Similitud entre los tags del estudiante y los del proyecto.';
COMMENT ON COLUMN match.puntaje_texto       IS 'Similitud entre descripción del proyecto y descripción/proyectos previos del estudiante.';
COMMENT ON COLUMN match.puntaje_contexto    IS 'Ajuste por horas disponibles vs. requeridas y año de cursada vs. año mínimo.';

-- Conjunto de referencia (gold set) marcado a mano por el equipo. Se registran de forma
-- explícita los pares relevantes Y los no relevantes: la evaluación usa solo pares
-- etiquetados y nunca asume que un par sin etiquetar es no relevante.
CREATE TABLE match_referencia (
    id_match_referencia    BIGINT GENERATED ALWAYS AS IDENTITY,
    id_estudiante          BIGINT      NOT NULL,
    id_proyecto            BIGINT      NOT NULL,
    es_relevante           BOOLEAN     NOT NULL DEFAULT true,  -- false = "no es un buen match" explícito
    id_usuario_etiquetador BIGINT,
    observacion            VARCHAR(300),
    fecha_etiquetado       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_match_referencia PRIMARY KEY (id_match_referencia),
    CONSTRAINT fk_match_ref_estudiante FOREIGN KEY (id_estudiante)
        REFERENCES perfil_estudiante (id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_match_ref_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES proyecto (id_proyecto) ON DELETE CASCADE,
    CONSTRAINT fk_match_ref_etiquetador FOREIGN KEY (id_usuario_etiquetador)
        REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    CONSTRAINT uq_match_ref_par UNIQUE (id_estudiante, id_proyecto)
);
CREATE INDEX ix_match_ref_proyecto ON match_referencia (id_proyecto);

-- Resultado de cada corrida de evaluación de una configuración contra match_referencia.
CREATE TABLE evaluacion_motor (
    id_evaluacion         BIGINT GENERATED ALWAYS AS IDENTITY,
    id_configuracion      BIGINT       NOT NULL,
    fecha_ejecucion       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    k                     SMALLINT     NOT NULL DEFAULT 5,       -- tamaño del top-k
    cantidad_estudiantes  INTEGER      NOT NULL,                 -- estudiantes evaluados
    -- Las tres métricas se calculan solo sobre pares presentes en match_referencia.
    precision_global      NUMERIC(5,4) NOT NULL,  -- recomendados relevantes / recomendados etiquetados
    recall_global         NUMERIC(5,4) NOT NULL,  -- recomendados relevantes / relevantes etiquetados
    precision_top_k       NUMERIC(5,4) NOT NULL,  -- promedio por estudiante de relevantes entre los etiquetados de su top-k
    observaciones         VARCHAR(500),
    CONSTRAINT pk_evaluacion_motor PRIMARY KEY (id_evaluacion),
    CONSTRAINT fk_evaluacion_configuracion FOREIGN KEY (id_configuracion)
        REFERENCES configuracion_motor (id_configuracion) ON DELETE CASCADE,
    CONSTRAINT ck_evaluacion_k CHECK (k BETWEEN 1 AND 50),
    CONSTRAINT ck_evaluacion_cantidad CHECK (cantidad_estudiantes >= 0),
    CONSTRAINT ck_evaluacion_metricas CHECK (
        precision_global BETWEEN 0 AND 1 AND recall_global BETWEEN 0 AND 1 AND precision_top_k BETWEEN 0 AND 1)
);
CREATE INDEX ix_evaluacion_configuracion ON evaluacion_motor (id_configuracion, fecha_ejecucion DESC);


-- =============================================================================
-- 9. COMUNICACIÓN (Módulo 4)
-- =============================================================================

CREATE TABLE mensaje (
    id_mensaje          BIGINT GENERATED ALWAYS AS IDENTITY,
    id_remitente        BIGINT      NOT NULL,
    id_destinatario     BIGINT      NOT NULL,
    id_proyecto         BIGINT,                         -- proyecto sobre el que se conversa (opcional)
    contenido           TEXT        NOT NULL,
    fecha_envio         TIMESTAMPTZ NOT NULL DEFAULT now(),
    leido               BOOLEAN     NOT NULL DEFAULT false,
    CONSTRAINT pk_mensaje PRIMARY KEY (id_mensaje),
    CONSTRAINT fk_mensaje_remitente FOREIGN KEY (id_remitente)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_mensaje_destinatario FOREIGN KEY (id_destinatario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_mensaje_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES proyecto (id_proyecto) ON DELETE SET NULL,
    CONSTRAINT ck_mensaje_participantes CHECK (id_remitente <> id_destinatario),
    CONSTRAINT ck_mensaje_contenido CHECK (length(trim(contenido)) > 0)
);
CREATE INDEX ix_mensaje_destinatario ON mensaje (id_destinatario, leido, fecha_envio DESC);
CREATE INDEX ix_mensaje_remitente ON mensaje (id_remitente, fecha_envio DESC);

CREATE TABLE notificacion (
    id_notificacion     BIGINT GENERATED ALWAYS AS IDENTITY,
    id_usuario          BIGINT            NOT NULL,
    tipo                tipo_notificacion NOT NULL,
    mensaje             VARCHAR(300)      NOT NULL,
    url_referencia      VARCHAR(300),                   -- a dónde lleva el aviso dentro de la app
    fecha               TIMESTAMPTZ       NOT NULL DEFAULT now(),
    leida               BOOLEAN           NOT NULL DEFAULT false,
    enviada_email       BOOLEAN           NOT NULL DEFAULT false,   -- RF-08
    CONSTRAINT pk_notificacion PRIMARY KEY (id_notificacion),
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
);
CREATE INDEX ix_notificacion_usuario ON notificacion (id_usuario, leida, fecha DESC);
-- Cola de envío de emails pendientes.
CREATE INDEX ix_notificacion_pendiente_email ON notificacion (fecha) WHERE NOT enviada_email;


-- =============================================================================
-- 10. VISTAS DEL DASHBOARD DE MÉTRICAS (Módulo 5, RF-07 y RF-11)
-- =============================================================================

-- Tecnologías más pedidas y su evolución mensual.
CREATE VIEW vw_tecnologias_demandadas AS
SELECT
    date_trunc('month', p.fecha_publicacion)::date AS mes,
    t.id_tecnologia,
    t.nombre                                       AS tecnologia,
    t.categoria,
    count(*)                                       AS cantidad_proyectos,
    count(*) FILTER (WHERE pt.obligatoria)         AS cantidad_obligatoria
FROM proyecto_tecnologia pt
JOIN proyecto   p ON p.id_proyecto   = pt.id_proyecto
JOIN tecnologia t ON t.id_tecnologia = pt.id_tecnologia
WHERE p.fecha_publicacion IS NOT NULL
GROUP BY 1, 2, 3, 4;

-- Porcentaje de estudiantes con match, por carrera y año.
--   con_recomendacion: tiene al menos un match >= umbral en la configuración activa.
--   con_proyecto:      tiene al menos una postulación aceptada.
CREATE VIEW vw_match_por_carrera_anio AS
WITH base AS (
    SELECT
        c.nombre AS carrera,
        e.anio_cursada,
        EXISTS (
            SELECT 1
            FROM match m
            JOIN configuracion_motor cm ON cm.id_configuracion = m.id_configuracion AND cm.activa
            WHERE m.id_estudiante = e.id_estudiante
              AND m.puntaje_total >= cm.umbral_recomendacion
        ) AS con_recomendacion,
        EXISTS (
            SELECT 1 FROM postulacion po
            WHERE po.id_estudiante = e.id_estudiante AND po.estado = 'aceptada'
        ) AS con_proyecto
    FROM perfil_estudiante e
    JOIN usuario u ON u.id_usuario = e.id_usuario AND u.activo
    JOIN carrera c ON c.id_carrera = e.id_carrera
)
SELECT
    carrera,
    anio_cursada,
    count(*)                                                        AS total_estudiantes,
    count(*) FILTER (WHERE con_recomendacion)                       AS con_recomendacion,
    count(*) FILTER (WHERE con_proyecto)                            AS con_proyecto,
    round(100.0 * count(*) FILTER (WHERE con_recomendacion) / count(*), 1) AS pct_con_recomendacion,
    round(100.0 * count(*) FILTER (WHERE con_proyecto) / count(*), 1)      AS pct_con_proyecto
FROM base
GROUP BY carrera, anio_cursada;

-- Tiempo desde el registro hasta el primer proyecto (primera postulación aceptada).
CREATE VIEW vw_tiempo_primer_proyecto AS
SELECT
    e.id_estudiante,
    c.nombre                AS carrera,
    e.anio_cursada,
    u.fecha_registro,
    min(h.fecha_cambio)     AS fecha_primer_proyecto,
    round((extract(epoch FROM min(h.fecha_cambio) - u.fecha_registro) / 86400)::numeric, 1)
                            AS dias_hasta_primer_proyecto
FROM perfil_estudiante e
JOIN usuario u               ON u.id_usuario     = e.id_usuario
JOIN carrera c               ON c.id_carrera     = e.id_carrera
JOIN postulacion p           ON p.id_estudiante  = e.id_estudiante
JOIN postulacion_historial h ON h.id_postulacion = p.id_postulacion AND h.estado_nuevo = 'aceptada'
GROUP BY e.id_estudiante, c.nombre, e.anio_cursada, u.fecha_registro;

-- Embudo postulación -> entrevista -> proyecto cerrado, por mes de postulación.
CREATE VIEW vw_embudo_postulaciones AS
WITH etapas AS (
    SELECT
        p.id_postulacion,
        date_trunc('month', p.fecha_postulacion)::date AS mes,
        bool_or(h.estado_nuevo = 'entrevista')         AS llego_entrevista,
        bool_or(h.estado_nuevo = 'aceptada')           AS cerrada
    FROM postulacion p
    JOIN postulacion_historial h ON h.id_postulacion = p.id_postulacion
    GROUP BY p.id_postulacion, 2
)
SELECT
    mes,
    count(*)                                               AS postulaciones,
    count(*) FILTER (WHERE llego_entrevista)               AS entrevistas,
    count(*) FILTER (WHERE llego_entrevista AND cerrada)   AS proyectos_cerrados,
    round(100.0 * count(*) FILTER (WHERE llego_entrevista) / count(*), 1)
                                                           AS pct_postulacion_a_entrevista,
    round(100.0 * count(*) FILTER (WHERE llego_entrevista AND cerrada)
          / NULLIF(count(*) FILTER (WHERE llego_entrevista), 0), 1)
                                                           AS pct_entrevista_a_cierre
FROM etapas
GROUP BY mes;

COMMIT;
