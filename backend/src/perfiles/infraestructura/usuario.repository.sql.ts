import { Inject, Injectable } from '@nestjs/common';
import { ErrorConflicto } from '../../compartido/dominio/errores.js';
import {
  armarPagina,
  normalizarPaginacion,
  type Pagina,
} from '../../compartido/dominio/paginacion.js';
import { ROLES, type Rol } from '../../compartido/dominio/seguridad.js';
import { DB, type Db } from '../../compartido/infraestructura/db/db.js';
import { esViolacionUnica } from '../../compartido/infraestructura/db/errores-db.js';
import type { UsuarioRepository } from '../dominio/puertos.js';
import type {
  DatosNuevoUsuario,
  FiltroUsuarios,
  UsuarioConCredenciales,
  UsuarioDto,
  UsuarioListadoDto,
} from '../dominio/usuario.js';

/**
 * Columnas del `UsuarioDto`. `perfil_completo` mira solo la tabla de perfil que corresponde
 * al rol del usuario; el administrador no tiene perfil y figura como completo.
 */
const COLUMNAS_USUARIO = `
  u.id_usuario, u.nombre, u.apellido, u.email, u.rol, u.activo,
  CASE u.rol
    WHEN 'estudiante' THEN EXISTS (SELECT 1 FROM perfil_estudiante p WHERE p.id_usuario = u.id_usuario)
    WHEN 'empresa'    THEN EXISTS (SELECT 1 FROM perfil_empresa p WHERE p.id_usuario = u.id_usuario)
    WHEN 'docente'    THEN EXISTS (SELECT 1 FROM perfil_docente p WHERE p.id_usuario = u.id_usuario)
    ELSE true
  END AS perfil_completo`;

const RESTRICCION_EMAIL_UNICO = 'uq_usuario_email';

/** Repositorio de la tabla `usuario` (dueño: M1). */
@Injectable()
export class UsuarioRepositorySql implements UsuarioRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async buscarPorId(idUsuario: number): Promise<UsuarioDto | null> {
    const { rows } = await this.db.query<UsuarioDto>(
      `SELECT ${COLUMNAS_USUARIO} FROM usuario u WHERE u.id_usuario = $1`,
      [idUsuario],
    );
    return rows[0] ?? null;
  }

  async buscarPorIds(idsUsuario: readonly number[]): Promise<UsuarioDto[]> {
    if (idsUsuario.length === 0) return [];
    const { rows } = await this.db.query<UsuarioDto>(
      `SELECT ${COLUMNAS_USUARIO} FROM usuario u
        WHERE u.id_usuario = ANY($1::bigint[]) ORDER BY u.id_usuario`,
      [[...new Set(idsUsuario)]],
    );
    return rows;
  }

  async buscarPorEmail(email: string): Promise<UsuarioConCredenciales | null> {
    const { rows } = await this.db.query<UsuarioConCredenciales>(
      `SELECT ${COLUMNAS_USUARIO}, u.contrasena_hash
         FROM usuario u WHERE lower(u.email) = lower($1)`,
      [email],
    );
    return rows[0] ?? null;
  }

  async crear(datos: DatosNuevoUsuario): Promise<UsuarioDto> {
    try {
      const { rows } = await this.db.query<UsuarioDto>(
        `INSERT INTO usuario (nombre, apellido, email, contrasena_hash, rol)
         VALUES ($1, $2, $3, $4, $5::rol_usuario)
         RETURNING id_usuario, nombre, apellido, email, rol, activo,
                   (rol = 'administrador') AS perfil_completo`,
        [datos.nombre, datos.apellido, datos.email, datos.contrasenaHash, datos.rol],
      );
      return rows[0];
    } catch (error) {
      if (esViolacionUnica(error, RESTRICCION_EMAIL_UNICO)) {
        throw new ErrorConflicto('Ya existe una cuenta registrada con ese email', [
          { campo: 'email', mensaje: 'Ya está registrado' },
        ]);
      }
      throw error;
    }
  }

  async actualizarActivo(idUsuario: number, activo: boolean): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'UPDATE usuario SET activo = $2 WHERE id_usuario = $1',
      [idUsuario, activo],
    );
    return rowCount > 0;
  }

  async actualizarRol(idUsuario: number, rol: Rol): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'UPDATE usuario SET rol = $2::rol_usuario WHERE id_usuario = $1',
      [idUsuario, rol],
    );
    return rowCount > 0;
  }

  async actualizarContrasena(
    idUsuario: number,
    contrasenaHash: string,
  ): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'UPDATE usuario SET contrasena_hash = $2 WHERE id_usuario = $1',
      [idUsuario, contrasenaHash],
    );
    return rowCount > 0;
  }

  async tienePerfil(idUsuario: number): Promise<boolean> {
    const { rows } = await this.db.query<{ existe: boolean }>(
      `SELECT (EXISTS (SELECT 1 FROM perfil_estudiante WHERE id_usuario = $1)
            OR EXISTS (SELECT 1 FROM perfil_empresa WHERE id_usuario = $1)
            OR EXISTS (SELECT 1 FROM perfil_docente WHERE id_usuario = $1)) AS existe`,
      [idUsuario],
    );
    return rows[0]?.existe === true;
  }

  async listar(filtro: FiltroUsuarios): Promise<Pagina<UsuarioListadoDto>> {
    const paginacion = normalizarPaginacion(filtro);
    // Solo se arman placeholders: los valores viajan siempre como parámetros.
    const params: unknown[] = [];
    const condiciones: string[] = [];
    if (filtro.rol) {
      params.push(filtro.rol);
      condiciones.push(`u.rol = $${params.length}::rol_usuario`);
    }
    if (filtro.activo !== undefined) {
      params.push(filtro.activo);
      condiciones.push(`u.activo = $${params.length}`);
    }
    const busqueda = filtro.q?.trim();
    if (busqueda) {
      params.push(`%${busqueda.replace(/[\\%_]/g, '\\$&')}%`);
      const n = params.length;
      condiciones.push(
        `(u.nombre ILIKE $${n} OR u.apellido ILIKE $${n} OR u.email ILIKE $${n})`,
      );
    }
    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const { rows: conteo } = await this.db.query<{ total: number }>(
      `SELECT count(*) AS total FROM usuario u ${where}`,
      params,
    );
    const { rows: items } = await this.db.query<UsuarioListadoDto>(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.rol, u.activo, u.fecha_registro
         FROM usuario u ${where}
        ORDER BY u.fecha_registro DESC, u.id_usuario DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, paginacion.tamano, paginacion.desplazamiento],
    );
    return armarPagina(items, conteo[0]?.total ?? 0, paginacion);
  }

  async contarActivosPorRol(): Promise<Record<Rol, number>> {
    const { rows } = await this.db.query<{ rol: Rol; cantidad: number }>(
      'SELECT rol, count(*) AS cantidad FROM usuario WHERE activo GROUP BY rol',
    );
    const resultado = Object.fromEntries(ROLES.map((rol) => [rol, 0])) as Record<
      Rol,
      number
    >;
    for (const fila of rows) resultado[fila.rol] = fila.cantidad;
    return resultado;
  }
}
