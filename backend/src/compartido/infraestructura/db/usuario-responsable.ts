import type { Db } from './db.js';

/**
 * Registra quién hace los cambios de la transacción en curso, para que el trigger
 * `fn_registrar_historial_postulacion` lo guarde en `postulacion_historial`.
 *
 * Equivale a `SET LOCAL utn_match.id_usuario = '<id>'` pero con parámetros (`set_config`
 * con `is_local = true`): el valor vale solo hasta el fin de la transacción. Hay que llamarlo
 * sobre el `tx` de `Db.transaction`, antes del INSERT o UPDATE de la postulación.
 */
export async function fijarUsuarioResponsable(
  tx: Db,
  idUsuario: number,
): Promise<void> {
  await tx.query(`SELECT set_config('utn_match.id_usuario', $1, true)`, [
    String(idUsuario),
  ]);
}
