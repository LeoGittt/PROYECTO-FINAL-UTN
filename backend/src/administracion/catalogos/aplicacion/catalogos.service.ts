import { Inject, Injectable } from '@nestjs/common';
import { ErrorNoEncontrado } from '../../../compartido/dominio/errores.js';
import {
  CATALOGOS_REPOSITORY,
  type CarreraDto,
  type CatalogosRepository,
  type DatosTecnologia,
  type HabilidadDto,
  type MateriaDto,
  type TecnologiaDto,
} from '../dominio/catalogo.js';

/**
 * API de M5 / catálogos (`CatalogosApi` en ARQUITECTURA.md). Es lo que usan M1 y M2 para
 * listar y validar carreras, materias, tecnologías y habilidades: ningún otro módulo
 * consulta estas tablas.
 *
 * Los métodos `obtener*` por lista de ids devuelven solo los que existen, sin error: quien
 * llama compara contra lo que pidió para saber cuáles faltan.
 */
@Injectable()
export class CatalogosService {
  constructor(
    @Inject(CATALOGOS_REPOSITORY)
    private readonly repositorio: CatalogosRepository,
  ) {}

  listarCarreras(): Promise<CarreraDto[]> {
    return this.repositorio.listarCarreras();
  }

  obtenerCarrera(idCarrera: number): Promise<CarreraDto | null> {
    return this.repositorio.obtenerCarrera(idCarrera);
  }

  listarMaterias(idCarrera?: number): Promise<MateriaDto[]> {
    return this.repositorio.listarMaterias(idCarrera);
  }

  obtenerMaterias(ids: readonly number[]): Promise<MateriaDto[]> {
    return this.repositorio.obtenerMaterias(unicos(ids));
  }

  listarTecnologias(): Promise<TecnologiaDto[]> {
    return this.repositorio.listarTecnologias();
  }

  obtenerTecnologias(ids: readonly number[]): Promise<TecnologiaDto[]> {
    return this.repositorio.obtenerTecnologias(unicos(ids));
  }

  listarHabilidades(): Promise<HabilidadDto[]> {
    return this.repositorio.listarHabilidades();
  }

  obtenerHabilidades(ids: readonly number[]): Promise<HabilidadDto[]> {
    return this.repositorio.obtenerHabilidades(unicos(ids));
  }

  /** Alta de tecnología (administrador). 409 si el nombre ya existe. */
  crearTecnologia(datos: DatosTecnologia): Promise<TecnologiaDto> {
    return this.repositorio.crearTecnologia(datos);
  }

  /** Edición de tecnología (administrador). 404 si no existe, 409 si el nombre ya lo usa otra. */
  async actualizarTecnologia(
    idTecnologia: number,
    datos: DatosTecnologia,
  ): Promise<TecnologiaDto> {
    const tecnologia = await this.repositorio.actualizarTecnologia(
      idTecnologia,
      datos,
    );
    if (!tecnologia) throw new ErrorNoEncontrado('La tecnología no existe');
    return tecnologia;
  }
}

function unicos(ids: readonly number[]): number[] {
  return [...new Set(ids)];
}
