import type { Rol } from './seguridad.js';

/**
 * Eventos del dominio. Los servicios de aplicación publican a través de `PublicadorEventos`
 * y no conocen la librería de eventos; la infraestructura implementa el puerto con
 * `@nestjs/event-emitter` y los listeners (también infraestructura) llaman a los casos de uso.
 *
 * Para sumar un evento: agregar su nombre y su payload a `EventosDominio`. Cada módulo
 * declara acá los eventos que emite.
 */

/** M1: un usuario guardó su perfil. `idEstudiante` solo viene cuando el rol es estudiante. */
export interface PerfilActualizadoEvento {
  idUsuario: number;
  rol: Rol;
  idEstudiante: number | null;
}

export interface EventosDominio {
  'perfil.actualizado': PerfilActualizadoEvento;
}

export type NombreEvento = keyof EventosDominio;

export const EVENTO_PERFIL_ACTUALIZADO = 'perfil.actualizado' as const;

export interface PublicadorEventos {
  /**
   * Publica un evento y espera a que sus listeners terminen. Un listener que falla no
   * afecta a quien publica: la infraestructura registra el error y sigue.
   */
  publicar<N extends NombreEvento>(
    nombre: N,
    payload: EventosDominio[N],
  ): Promise<void>;
}

export const PUBLICADOR_EVENTOS = Symbol('PUBLICADOR_EVENTOS');


// ---------------------------------------------------------------------------
// M2 (proyectos) y M3 (postulaciones e invitaciones). Los nombres son los del contrato
// (docs/api/CONTRATO.md, sección 6). `EventosDominio` se completa acá por fusión de interfaces.
// ---------------------------------------------------------------------------

export interface EventosDominio {
  /** M2: un proyecto pasó de `borrador` a `publicado`. M3 calcula sus puntajes. */
  'proyecto.publicado': { idProyecto: number; titulo: string };
  /** M2: se editó un proyecto. M3 recalcula sus puntajes. */
  'proyecto.actualizado': { idProyecto: number };
  /**
   * M2 y M5: cambió el estado de un proyecto por otra vía que la publicación (en curso,
   * finalizado, cancelado, suspendido o reactivado). M3 deja de recomendar los que ya no están
   * publicados y M4 avisa a los estudiantes con postulación activa.
   */
  'proyecto.estado_cambiado': {
    idProyecto: number;
    titulo: string;
    estadoAnterior: string;
    estadoNuevo: string;
  };
  /** M3: un estudiante se postuló, o aceptó una invitación (que crea la postulación). */
  'postulacion.creada': {
    idPostulacion: number;
    idProyecto: number;
    tituloProyecto: string;
    idUsuarioPublicador: number;
    idUsuarioEstudiante: number;
  };
  /** M3: cambió el estado de una postulación. */
  'postulacion.estado_cambiado': {
    idPostulacion: number;
    idProyecto: number;
    tituloProyecto: string;
    idUsuarioEstudiante: number;
    estadoAnterior: string;
    estadoNuevo: string;
  };
  /** M3: un publicador invitó a un estudiante a su proyecto. */
  'invitacion.enviada': {
    idInvitacion: number;
    idProyecto: number;
    tituloProyecto: string;
    idUsuarioEstudiante: number;
  };
  /** M3: un estudiante pasó a tener un proyecto recomendado que antes no alcanzaba el umbral. */
  'match.nuevo': {
    idEstudiante: number;
    idUsuarioEstudiante: number;
    idProyecto: number;
    tituloProyecto: string;
    puntajeTotal: number;
  };
}
