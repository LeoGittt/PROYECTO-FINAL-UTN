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
