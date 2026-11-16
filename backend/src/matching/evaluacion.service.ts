import { Injectable } from '@nestjs/common';
import { ErrorNoEncontrado, ErrorReglaNegocio } from '../compartido/dominio/errores.js';
import type { UsuarioAutenticado } from '../compartido/dominio/seguridad.js';
import { PerfilesService } from '../perfiles/aplicacion/perfiles.service.js';
import { ProyectosService } from '../proyectos/proyectos.service.js';
import { calcularMetricas } from './evaluacion.js';
import {
  EvaluacionRepository,
  type ConfiguracionDto,
  type EvaluacionDto,
} from './evaluacion.repository.js';
import { MatchingService } from './matching.service.js';
import { calcularPares } from './motor.js';

/** docs/api/CONTRATO.md, sección 5.3. `estudiante` es "Nombre Apellido" y `proyecto`, el título. */
export interface ReferenciaDto {
  idMatchReferencia: number;
  idEstudiante: number;
  estudiante: string;
  idProyecto: number;
  proyecto: string;
  esRelevante: boolean;
  observacion: string | null;
}

/** M3, RF-10: configuraciones del motor, conjunto de referencia y evaluaciones (solo el administrador). */
@Injectable()
export class EvaluacionService {
  constructor(
    private readonly repositorio: EvaluacionRepository,
    private readonly matching: MatchingService,
    private readonly perfiles: PerfilesService,
    private readonly proyectos: ProyectosService,
  ) {}

  listarConfiguraciones(): Promise<ConfiguracionDto[]> {
    return this.repositorio.listarConfiguraciones();
  }

  /** Activa la configuración y recalcula todos los puntajes con ella. */
  async activar(idConfiguracion: number): Promise<{ pares: number; milisegundos: number }> {
    await this.obtenerConfiguracion(idConfiguracion);
    await this.repositorio.activarConfiguracion(idConfiguracion);
    return this.matching.recalcularTodo();
  }

  recalcular(): Promise<{ pares: number; milisegundos: number }> {
    return this.matching.recalcularTodo();
  }

  async listarReferencia(): Promise<ReferenciaDto[]> {
    const filas = await this.repositorio.listarReferencia();
    const [estudiantes, proyectos] = await Promise.all([
      this.perfiles.obtenerEstudiantes([...new Set(filas.map((f) => f.idEstudiante))]),
      this.proyectos.obtenerVarios([...new Set(filas.map((f) => f.idProyecto))]),
    ]);
    const nombre = new Map(estudiantes.map((e) => [e.idEstudiante, `${e.nombre} ${e.apellido}`]));
    const titulo = new Map(proyectos.map((p) => [p.idProyecto, p.titulo]));
    return filas.map((f) => ({
      idMatchReferencia: f.idMatchReferencia,
      idEstudiante: f.idEstudiante,
      estudiante: nombre.get(f.idEstudiante) ?? '',
      idProyecto: f.idProyecto,
      proyecto: titulo.get(f.idProyecto) ?? '',
      esRelevante: f.esRelevante,
      observacion: f.observacion,
    }));
  }

  /** Alta o reemplazo de la etiqueta de un par. 404 si el estudiante o el proyecto no existen. */
  async guardarReferencia(
    datos: { idEstudiante: number; idProyecto: number; esRelevante: boolean; observacion: string | null },
    admin: UsuarioAutenticado,
  ): Promise<ReferenciaDto> {
    const [[estudiante], [proyecto]] = await Promise.all([
      this.perfiles.obtenerEstudiantes([datos.idEstudiante]),
      this.proyectos.obtenerVarios([datos.idProyecto]),
    ]);
    if (!estudiante) throw new ErrorNoEncontrado('El estudiante no existe');
    if (!proyecto) throw new ErrorNoEncontrado('El proyecto no existe');
    const idMatchReferencia = await this.repositorio.guardarReferencia(datos, admin.idUsuario);
    return {
      idMatchReferencia,
      ...datos,
      estudiante: `${estudiante.nombre} ${estudiante.apellido}`,
      proyecto: proyecto.titulo,
    };
  }

  async borrarReferencia(idMatchReferencia: number): Promise<void> {
    if (!(await this.repositorio.borrarReferencia(idMatchReferencia))) {
      throw new ErrorNoEncontrado('El par de referencia no existe');
    }
  }

  /**
   * Calcula en memoria los puntajes de los estudiantes etiquetados con la configuración pedida
   * (aunque no sea la activa), mide la precisión, el recall y la precisión en el top-k sobre los
   * pares etiquetados y guarda el resultado.
   */
  async evaluar(idConfiguracion: number, k: number): Promise<EvaluacionDto> {
    const configuracion = await this.obtenerConfiguracion(idConfiguracion);
    const referencia = await this.repositorio.listarReferencia();
    if (referencia.length === 0) {
      throw new ErrorReglaNegocio('Cargue pares de referencia antes de evaluar el motor');
    }
    const [perfiles, proyectos] = await Promise.all([
      this.perfiles.listarPerfilesParaMatching({
        idsEstudiante: [...new Set(referencia.map((r) => r.idEstudiante))],
      }),
      this.proyectos.listarParaMatching(),
    ]);
    const puntajes = calcularPares(perfiles, proyectos, configuracion);
    const metricas = calcularMetricas(puntajes, referencia, configuracion.umbralRecomendacion, k);
    return this.repositorio.guardarEvaluacion(idConfiguracion, k, metricas);
  }

  listarEvaluaciones(): Promise<EvaluacionDto[]> {
    return this.repositorio.listarEvaluaciones();
  }

  /** Para el dashboard de M5: la última evaluación de cada configuración. */
  ultimasEvaluaciones(): Promise<EvaluacionDto[]> {
    return this.repositorio.ultimasEvaluaciones();
  }

  private async obtenerConfiguracion(idConfiguracion: number): Promise<ConfiguracionDto> {
    const configuracion = (await this.repositorio.listarConfiguraciones()).find(
      (c) => c.idConfiguracion === idConfiguracion,
    );
    if (!configuracion) throw new ErrorNoEncontrado('La configuración no existe');
    return configuracion;
  }
}
