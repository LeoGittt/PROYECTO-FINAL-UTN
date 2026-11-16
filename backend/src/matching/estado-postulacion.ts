/**
 * Máquina de estados de la postulación (docs/api/CONTRATO.md, sección 5.4). Es una función
 * pura: no sabe de HTTP ni de la base, así que se prueba entera con una tabla.
 */

export const ESTADOS_POSTULACION = [
  'pendiente',
  'en_revision',
  'entrevista',
  'aceptada',
  'rechazada',
  'retirada',
] as const;
export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[number];

/** Quién pide el cambio: el estudiante dueño de la postulación o el publicador del proyecto. */
export type ActorPostulacion = 'estudiante' | 'publicador';

const TRANSICIONES: Record<EstadoPostulacion, readonly EstadoPostulacion[]> = {
  pendiente: ['en_revision', 'entrevista', 'rechazada', 'retirada'],
  en_revision: ['entrevista', 'aceptada', 'rechazada', 'retirada'],
  entrevista: ['aceptada', 'rechazada', 'retirada'],
  aceptada: [],
  rechazada: [],
  retirada: [],
};

export type ResultadoTransicion =
  | { ok: true }
  | { ok: false; motivo: 'actor_no_autorizado' | 'transicion_invalida' };

/**
 * Primero se revisa quién pide el cambio (el estudiante solo puede retirar; el publicador
 * puede pasar a cualquier otro estado) y después si la transición existe. El orden importa:
 * quien no tiene permiso recibe 403 aunque la transición tampoco sea válida.
 */
export function evaluarTransicion(cambio: {
  desde: EstadoPostulacion;
  hacia: EstadoPostulacion;
  actor: ActorPostulacion;
}): ResultadoTransicion {
  const { desde, hacia, actor } = cambio;
  const actorPermitido =
    actor === 'estudiante' ? hacia === 'retirada' : hacia !== 'retirada';
  if (!actorPermitido) return { ok: false, motivo: 'actor_no_autorizado' };
  if (!TRANSICIONES[desde].includes(hacia)) {
    return { ok: false, motivo: 'transicion_invalida' };
  }
  return { ok: true };
}
