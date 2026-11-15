import { Inject, Injectable } from '@nestjs/common';
import { ErrorConflicto } from '../../../compartido/dominio/errores.js';
import { DB, type Db } from '../../../compartido/infraestructura/db/db.js';
import { esViolacionUnica } from '../../../compartido/infraestructura/db/errores-db.js';
import type {
  CarreraDto,
  CatalogosRepository,
  DatosTecnologia,
  HabilidadDto,
  MateriaDto,
  TecnologiaDto,
} from '../dominio/catalogo.js';

const COLUMNAS_TECNOLOGIA = 'id_tecnologia, nombre, categoria, descripcion';
const COLUMNAS_HABILIDAD = 'id_habilidad, nombre, descripcion';
const COLUMNAS_MATERIA = 'id_materia, id_carrera, nombre, anio_plan, cuatrimestre';
const RESTRICCION_NOMBRE_TECNOLOGIA = 'uq_tecnologia_nombre';
const MENSAJE_NOMBRE_DUPLICADO = 'Ya existe una tecnología con ese nombre';

/** Repositorio de las tablas `carrera`, `materia`, `tecnologia` y `habilidad` (dueño: M5). */
@Injectable()
export class CatalogosRepositorySql implements CatalogosRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listarCarreras(): Promise<CarreraDto[]> {
    const { rows } = await this.db.query<CarreraDto>(
      'SELECT id_carrera, nombre, duracion_anios FROM carrera ORDER BY id_carrera',
    );
    return rows;
  }

  async obtenerCarrera(idCarrera: number): Promise<CarreraDto | null> {
    const { rows } = await this.db.query<CarreraDto>(
      'SELECT id_carrera, nombre, duracion_anios FROM carrera WHERE id_carrera = $1',
      [idCarrera],
    );
    return rows[0] ?? null;
  }

  async listarMaterias(idCarrera?: number): Promise<MateriaDto[]> {
    const { rows } = await this.db.query<MateriaDto>(
      `SELECT ${COLUMNAS_MATERIA}
         FROM materia
        WHERE ($1::bigint IS NULL OR id_carrera = $1)
        ORDER BY id_carrera, anio_plan, cuatrimestre NULLS LAST, nombre`,
      [idCarrera ?? null],
    );
    return rows;
  }

  async obtenerMaterias(ids: readonly number[]): Promise<MateriaDto[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query<MateriaDto>(
      `SELECT ${COLUMNAS_MATERIA} FROM materia WHERE id_materia = ANY($1::bigint[])`,
      [ids],
    );
    return rows;
  }

  async listarTecnologias(): Promise<TecnologiaDto[]> {
    const { rows } = await this.db.query<TecnologiaDto>(
      `SELECT ${COLUMNAS_TECNOLOGIA} FROM tecnologia ORDER BY categoria, lower(nombre)`,
    );
    return rows;
  }

  async obtenerTecnologias(ids: readonly number[]): Promise<TecnologiaDto[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query<TecnologiaDto>(
      `SELECT ${COLUMNAS_TECNOLOGIA} FROM tecnologia WHERE id_tecnologia = ANY($1::bigint[])`,
      [ids],
    );
    return rows;
  }

  async listarHabilidades(): Promise<HabilidadDto[]> {
    const { rows } = await this.db.query<HabilidadDto>(
      `SELECT ${COLUMNAS_HABILIDAD} FROM habilidad ORDER BY lower(nombre)`,
    );
    return rows;
  }

  async obtenerHabilidades(ids: readonly number[]): Promise<HabilidadDto[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query<HabilidadDto>(
      `SELECT ${COLUMNAS_HABILIDAD} FROM habilidad WHERE id_habilidad = ANY($1::bigint[])`,
      [ids],
    );
    return rows;
  }

  async crearTecnologia(datos: DatosTecnologia): Promise<TecnologiaDto> {
    try {
      const { rows } = await this.db.query<TecnologiaDto>(
        `INSERT INTO tecnologia (nombre, categoria, descripcion)
         VALUES ($1, $2::categoria_tecnologia, $3)
         RETURNING ${COLUMNAS_TECNOLOGIA}`,
        [datos.nombre, datos.categoria, datos.descripcion],
      );
      return rows[0];
    } catch (error) {
      throw this.traducirDuplicado(error);
    }
  }

  async actualizarTecnologia(
    idTecnologia: number,
    datos: DatosTecnologia,
  ): Promise<TecnologiaDto | null> {
    try {
      const { rows } = await this.db.query<TecnologiaDto>(
        `UPDATE tecnologia
            SET nombre = $2, categoria = $3::categoria_tecnologia, descripcion = $4
          WHERE id_tecnologia = $1
        RETURNING ${COLUMNAS_TECNOLOGIA}`,
        [idTecnologia, datos.nombre, datos.categoria, datos.descripcion],
      );
      return rows[0] ?? null;
    } catch (error) {
      throw this.traducirDuplicado(error);
    }
  }

  private traducirDuplicado(error: unknown): unknown {
    return esViolacionUnica(error, RESTRICCION_NOMBRE_TECNOLOGIA)
      ? new ErrorConflicto(MENSAJE_NOMBRE_DUPLICADO, [
          { campo: 'nombre', mensaje: MENSAJE_NOMBRE_DUPLICADO },
        ])
      : error;
  }
}
